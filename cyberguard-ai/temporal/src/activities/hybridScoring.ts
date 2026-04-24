/**
 * Hybrid Scoring Activity (Autoencoder + LSTM)
 *
 * This module provides a lightweight, testable stub that combines an
 * Autoencoder-style reconstruction score with an LSTM-style temporal score.
 * In production these would call real ML models; here we provide deterministic
 * logic and diagnostics suitable for integration and testing.
 */

import type { HoneypotEvent } from "../shared/types";
import fetch from "node-fetch";

export type HybridScore = {
  score: number; // 0-1 combined anomaly score
  aeScore: number; // reconstruction / feature deviation score
  lstmScore: number; // temporal/sequence anomaly score
  severity: "LOW" | "MED" | "HIGH";
  reasons: string[];
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function computeAeScore(event: HoneypotEvent): number {
  // Heuristic: larger payloads, many suspicious fields => higher AE reconstruction error
  const payload = event.payload || {};
  const s = JSON.stringify(payload).length / 2000; // normalized
  const suspiciousKeys = Object.keys(payload || {}).filter((k) => /cmd|exec|sql|pass|payload|data|input/i.test(k)).length;
  const score = clamp01(0.1 + s * 0.4 + (suspiciousKeys * 0.15));
  return score;
}

function computeLstmScore(event: HoneypotEvent): number {
  // Heuristic temporal signal: attempts, off-hours, repeated patterns
  const p: any = event.payload || {};
  let score = 0.05;
  const attempts = Number(p.attempts || p.login_attempts || 0);
  if (attempts >= 5) score += Math.min(0.5, attempts * 0.05);

  const created = new Date(event.created_at || Date.now());
  const hour = created.getUTCHours();
  if (hour >= 22 || hour <= 6) score += 0.15;

  // user-agent or payload repetition indicator
  if (String(p.user_agent || "").toLowerCase().includes("curl")) score += 0.08;

  return clamp01(score);
}

export async function computeHybridScore(event: HoneypotEvent): Promise<HybridScore> {
  // Try calling the local model service; fall back to internal heuristic on failure
  const url = process.env.MODEL_SERVICE_URL || "http://127.0.0.1:8000/predict";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
      signal: controller.signal as any,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return {
        score: Number(data.score ?? 0),
        aeScore: Number(data.ae_score ?? data.aeScore ?? 0),
        lstmScore: Number(data.lstm_score ?? data.lstmScore ?? 0),
        severity: (data.severity as HybridScore["severity"]) ?? (data.severity ?? "LOW"),
        reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 6) : [String(data.reasons || "")],
      } as HybridScore;
    }
  } catch (err) {
    // ignore and fall back to heuristic
  }

  // Fallback: local heuristic
  const ae = computeAeScore(event);
  const lstm = computeLstmScore(event);

  const combined = clamp01(ae * 0.6 + lstm * 0.4);
  const reasons: string[] = [];
  if (ae > 0.4) reasons.push("Feature reconstruction error elevated (AE)");
  if (lstm > 0.35) reasons.push("Temporal anomaly detected (LSTM)");
  if (!reasons.length) reasons.push("No strong anomaly signals detected");
  const severity = combined > 0.7 ? "HIGH" : combined > 0.45 ? "MED" : "LOW";
  return {
    score: parseFloat(combined.toFixed(3)),
    aeScore: parseFloat(ae.toFixed(3)),
    lstmScore: parseFloat(lstm.toFixed(3)),
    severity,
    reasons,
  };
}

/**
 * Lightweight helper to combine an array of HybridScore results
 */
export function aggregateHybridScores(scores: HybridScore[]): HybridScore {
  if (!scores.length) {
    return { score: 0, aeScore: 0, lstmScore: 0, severity: "LOW", reasons: ["no data"] };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const ae = avg(scores.map((s) => s.aeScore));
  const lstm = avg(scores.map((s) => s.lstmScore));
  const score = clamp01(ae * 0.6 + lstm * 0.4);

  const severity = score > 0.7 ? "HIGH" : score > 0.45 ? "MED" : "LOW";

  const reasons = Array.from(new Set(scores.flatMap((s) => s.reasons))).slice(0, 6);

  return { score: parseFloat(score.toFixed(3)), aeScore: parseFloat(ae.toFixed(3)), lstmScore: parseFloat(lstm.toFixed(3)), severity, reasons };
}
