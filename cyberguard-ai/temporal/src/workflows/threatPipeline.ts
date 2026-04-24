import { proxyActivities } from "@temporalio/workflow";
import { ActivityFailure, ApplicationFailure } from "@temporalio/workflow";
import type { Enrichment, HoneypotEvent, MitreCandidate } from "../shared/types";
import { classifyMitre } from "../scoring/mitreAttackClassifier";
import type { AnomalyScore } from "../activities/anomalyDetector";
import type { IncidentResponse } from "../activities/responseActions";
import type { HoneypotRedirect } from "../activities/honeypotRedirection";
import type { HybridScore } from "../activities/hybridScoring";

const {
  getHoneypotEvent,
  createIncident,
  enrichWithGroq,
  detectAnomalies,
  computeHybridScore,
  redirectToHoneypot,
  executeResponseActions,
  persistTrainingSample,
} = proxyActivities<{
  getHoneypotEvent(eventId: string): Promise<HoneypotEvent>;

  enrichWithGroq(input: {
    event: HoneypotEvent;
    candidates: MitreCandidate[];
  }): Promise<Enrichment>;

  createIncident(input: {
    eventId: string;
    ip: string | null;
    risk: "LOW" | "MED" | "HIGH";
    summary: string;
    technique_id: string;
    technique_name: string;
    recommendation: string;
  }): Promise<{ id: string }>;

  detectAnomalies(event: HoneypotEvent): Promise<AnomalyScore>;
  computeHybridScore(event: HoneypotEvent): Promise<HybridScore>;

  redirectToHoneypot(event: HoneypotEvent): Promise<HoneypotRedirect>;

  persistTrainingSample(sample: {
    event: HoneypotEvent;
    label?: "benign" | "malicious" | "unknown";
    score?: number;
    created_at: string;
  }): Promise<void>;

  executeResponseActions(
    event: HoneypotEvent,
    riskLevel: "LOW" | "MED" | "HIGH",
    techniqueId: string,
    username: string | null
  ): Promise<IncidentResponse>;
}>({
  startToCloseTimeout: "2 minutes",
  retry: {
    initialInterval: "2 seconds",
    maximumInterval: "30 seconds",
    backoffCoefficient: 2,
    maximumAttempts: 5,
  },
});

function buildCandidates(evt: HoneypotEvent): MitreCandidate[] {
  const u = (evt.username || "").toLowerCase();
  const hasPassword = !!(evt.password && evt.password.length > 0);

  const c: MitreCandidate[] = [];

  if (u === "root") c.push({ technique_id: "T1110", technique_name: "Brute Force" });
  if (hasPassword) c.push({ technique_id: "T1110", technique_name: "Brute Force" });
  c.push({ technique_id: "T1059", technique_name: "Command and Scripting Interpreter" });
  c.push({ technique_id: "T1190", technique_name: "Exploit Public-Facing Application" });
  c.push({ technique_id: "T1005", technique_name: "Data from Local System" });
  c.push({ technique_id: "T1046", technique_name: "Network Service Discovery" });
  c.push({ technique_id: "T1078", technique_name: "Valid Accounts" });


  const seen = new Set<string>();
  return c.filter((x) => (seen.has(x.technique_id) ? false : (seen.add(x.technique_id), true)));
}

function explainActivityError(err: unknown): string {
  if (err instanceof ActivityFailure) {
    const cause = err.cause;
    if (cause instanceof ApplicationFailure) {
      const details = cause.details ? JSON.stringify(cause.details) : "";
      return `ActivityFailure -> ApplicationFailure: message="${cause.message}" type="${cause.type}" nonRetryable=${cause.nonRetryable} details=${details}`;
    }
    return `ActivityFailure: message="${err.message}" cause="${cause ? String(cause) : "none"}"`;
  }
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

export async function threatPipeline(eventId: string): Promise<void> {
  const evt = await getHoneypotEvent(eventId);

  // 1. MITRE ATT&CK Classification
  const verdict = classifyMitre(evt);

  // 2. Anomaly Detection (LSTM-like behavioral analysis)
  let anomalyScore: AnomalyScore | null = null;
  try {
    anomalyScore = await detectAnomalies(evt);
    console.log(`[Anomaly] Score: ${anomalyScore.score}, IsAnomaly: ${anomalyScore.isAnomaly}`);
  } catch (err) {
    const explanation = explainActivityError(err);
    console.warn(`[Anomaly] Detection failed (continuing): ${explanation}`);
  }

  // Hybrid AE+LSTM scoring (combines feature + temporal signals)
  let hybridScore: HybridScore | null = null;
  try {
    hybridScore = await computeHybridScore(evt);
    if (hybridScore) {
      console.log(`[Hybrid] combined=${hybridScore.score} ae=${hybridScore.aeScore} lstm=${hybridScore.lstmScore} severity=${hybridScore.severity}`);
    }
  } catch (err) {
    const explanation = explainActivityError(err);
    console.warn(`[Hybrid] computeHybridScore failed (continuing): ${explanation}`);
  }

  // 3. Build MITRE candidates
  const candidates = buildCandidates(evt);

  // 4. AI Enrichment (LLM summary generation)
  let aiSummary = "";
  let aiRecommendation = "";
  try {
    const ai = await enrichWithGroq({ event: evt, candidates });
    aiSummary = ai.summary ?? "";
    aiRecommendation = ai.recommendation ?? "";
  } catch (err) {
    const explanation = explainActivityError(err);
    console.warn(`[AI] enrichWithGroq failed (continuing): ${explanation}`);
  }

  // 5. Active Deception - Redirect to Honeypot
  let honeypotRedirect: HoneypotRedirect | null = null;
  if (
    verdict.risk === "HIGH" ||
    (anomalyScore?.severity === "HIGH") ||
    hybridScore?.severity === "HIGH" ||
    (hybridScore && hybridScore.score > 0.85)
  ) {
    try {
      honeypotRedirect = await redirectToHoneypot(evt);
      if (honeypotRedirect.success) {
        console.log(
          `[Honeypot] Redirected to ${honeypotRedirect.honeypotId}, capture type: ${honeypotRedirect.captureType}`
        );
      }
    } catch (err) {
      const explanation = explainActivityError(err);
      console.warn(`[Honeypot] Redirection failed (continuing): ${explanation}`);
    }
  }

  // 6. Generate Incident Summary
  const summary =
    aiSummary.trim() ||
    verdict.reasons.join(". ") ||
    (anomalyScore
      ? `Anomaly detected (score: ${anomalyScore.score}). ${anomalyScore.reasons.join(". ")}`
      : "Suspicious activity detected.");

  const recommendation =
    aiRecommendation.trim() ||
    (verdict.risk === "HIGH"
      ? "Immediate investigation recommended. Consider blocking the source IP. Honeypot engagement active."
      : "Monitor activity for recurrence. Enable MFA if not already enforced.");

  // 7. Create incident in database
  await createIncident({
    eventId,
    ip: evt.ip ?? null,
    risk: verdict.risk,
    summary,
    technique_id: verdict.technique_id,
    technique_name: verdict.technique_name,
    recommendation,
  });

  // 8. Execute Automated Response Actions
  let responseActions: IncidentResponse | null = null;
  try {
    responseActions = await executeResponseActions(
      evt,
      verdict.risk,
      verdict.technique_id,
      evt.username
    );

    if (responseActions.actions.length > 0) {
      console.log(
        `[Response] Executed ${responseActions.actions.length} actions. Escalation level: ${responseActions.escalationLevel}`
      );

      // Log completed actions
      for (const action of responseActions.actions) {
        if (action.status === "COMPLETED") {
          console.log(`  ✓ ${action.action}: ${action.result}`);
        } else if (action.status === "FAILED") {
          console.log(`  ✗ ${action.action}: ${action.result}`);
        }
      }
    }
  } catch (err) {
    const explanation = explainActivityError(err);
    console.warn(`[Response] Actions execution failed (continuing): ${explanation}`);
  }

  // Persist a training sample for continual learning (label best-effort)
  try {
    const label: "benign" | "malicious" | "unknown" =
      verdict.risk === "HIGH" || hybridScore?.severity === "HIGH" ? "malicious" : "benign";

    await persistTrainingSample({
      event: evt,
      label,
      score: hybridScore?.score ?? anomalyScore?.score ?? 0,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    const explanation = explainActivityError(err);
    console.warn(`[Learning] persistTrainingSample failed (continuing): ${explanation}`);
  }

  // Log threat pipeline completion
  console.log(`
[ThreatPipeline] Completed for event: ${eventId}
  • MITRE: ${verdict.technique_id} (${verdict.technique_name}) - Risk: ${verdict.risk}
  • Anomaly: ${anomalyScore ? `Detected (${anomalyScore.severity})` : "Not anomalous"}
  • Deception: ${honeypotRedirect?.success ? `Active (${honeypotRedirect.captureType})` : "Inactive"}
  • Response: ${responseActions ? `${responseActions.actions.length} actions` : "None"}
  `);
}
