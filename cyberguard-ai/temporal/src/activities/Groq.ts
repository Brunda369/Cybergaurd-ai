import fetch from "cross-fetch";
import AbortController from "abort-controller";
import type { Enrichment, MitreCandidate, HoneypotEvent } from "../shared/types";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function candId(c: any): string {
  return String(c?.technique_id ?? c?.techniqueId ?? c?.id ?? c?.technique ?? "");
}
function candName(c: any): string {
  return String(c?.technique_name ?? c?.techniqueName ?? c?.name ?? "");
}

function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

function normalizeEnrichment(obj: any): Enrichment {
  return {
    risk: obj?.risk === "LOW" || obj?.risk === "MED" || obj?.risk === "HIGH" ? obj.risk : "MED",
    technique_id: String(obj?.technique_id || ""),
    technique_name: String(obj?.technique_name || ""),
    summary: String(obj?.summary || ""),
    recommendation: String(obj?.recommendation || ""),
    confidence: typeof obj?.confidence === "number" ? obj.confidence : 0.25,
  };
}

function fallbackEnrichment(candidates: MitreCandidate[], reason: string): Enrichment {
  const first = candidates?.[0];
  return {
    risk: "MED",
    technique_id: candId(first) || "T0000",
    technique_name: candName(first) || "",
    summary: `AI enrichment fallback: ${reason}`,
    recommendation: "Manual review recommended. Validate technique mapping and enrich with more telemetry.",
    confidence: 0.2,
  };
}

function formatFetchError(err: any, timeoutMs: number): string {
  const name = err?.name || "";
  const code = err?.code || err?.errno || "";
  const msg = (err?.message || "").trim();

  if (name === "AbortError") return `timeout after ${timeoutMs}ms`;
  if (code) return `network error (${code})${msg ? `: ${msg}` : ""}`;
  if (msg) return msg;
  if (name) return name;

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

type GroqChatArgs = {
  apiKey: string;
  model: string;
  prompt: string;
  timeoutMs: number;
};

async function callGroqChat({ apiKey, model, prompt, timeoutMs }: GroqChatArgs): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        // Helps reduce socket hang up in some networks
        connection: "close",
      },
      signal: controller.signal as any,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          
         {
  role: "system",
  content: `
You are a senior SOC analyst.

Write the analysis in EXACTLY TWO PARAGRAPHS:
- Paragraph 1: What is happening and why this indicates an attack
- Paragraph 2: Impact and concrete prevention steps

Each paragraph must be 2–3 sentences.
Do NOT write more or fewer paragraphs.
Do NOT use bullet points.
Output ONLY valid JSON.
`.trim(),
}

          ,
          { role: "user", content: prompt },
        ],
      }),
    });

    const serverText = await r.text();

    if (!r.ok) {
      throw new Error(`[Groq] HTTP ${r.status}: ${serverText.slice(0, 1200)}`);
    }

    if (!serverText.trim()) return "";

    const data = JSON.parse(serverText);
    return String(data?.choices?.[0]?.message?.content ?? "").trim();
  } catch (err: any) {
    console.error("[Groq] fetch failed", {
      name: err?.name,
      code: err?.code,
      message: err?.message,
      cause: err?.cause,
    });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function isModelDecommissionedError(msg: string): boolean {
  return msg.includes("model_decommissioned") || msg.includes("has been decommissioned");
}

function buildSlimEvent(event: HoneypotEvent) {
  const p: any = (event as any).payload || {};

  const maybe = {
    id: (event as any).id,
    ip: (event as any).ip,
    username: (event as any).username ?? p.username,
    password_present: !!((event as any).password?.length || p.password?.length),

    service: (event as any).service ?? p.service ?? p.protocol ?? p.proto,
    transport: p.transport ?? p.transport_protocol,
    src_port: p.src_port ?? p.source_port ?? p.sport,
    dst_port: p.dst_port ?? p.destination_port ?? p.dport,
    method: p.method ?? p.http_method,
    path: p.path ?? p.uri ?? p.url_path,

    auth_success: p.auth_success ?? p.success,
    attempts: p.attempts ?? p.login_attempts ?? p.count,

  
    payload_keys: p && typeof p === "object" ? Object.keys(p).slice(0, 20) : [],
    payload_preview:
      typeof p === "string"
        ? p.slice(0, 180)
        : p?.command
          ? String(p.command).slice(0, 180)
          : p?.data
            ? String(p.data).slice(0, 180)
            : "",

    created_at: (event as any).created_at,
  };


  return Object.fromEntries(
    Object.entries(maybe).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );
}

export async function enrichWithGroq(input: {
  event: HoneypotEvent;
  candidates: MitreCandidate[];
}): Promise<Enrichment> {
  const apiKey = mustEnv("GROQ_API_KEY");

  const preferredModel = (process.env.GROQ_MODEL || "mixtral-8x7b-32768").trim();
  const fallbackModel = (process.env.GROQ_MODEL_FALLBACK || "mixtral-8x7b-32768").trim();
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || "60000");

  const candidates = input.candidates || [];
  const allowedIds = new Set(candidates.map((c) => candId(c)).filter(Boolean));
  const firstId = candId(candidates?.[0]) || "T0000";

  const slimEvent = buildSlimEvent(input.event);

  const prompt = `
Choose EXACTLY ONE technique_id from the candidate list.

Candidate techniques:
${JSON.stringify(candidates.map((c) => ({ technique_id: candId(c), technique_name: candName(c) })))}

Observed event (partial telemetry):
${JSON.stringify(slimEvent)}

Return ONLY valid JSON with EXACT keys:
{"risk":"LOW|MED|HIGH","technique_id":"Txxxx","technique_name":"","summary":"","recommendation":"","confidence":0.0}

Rules:
- technique_id MUST be one from the candidate list.
- summary must include a short reasoning based on the event.
- confidence: 0.25 to 0.9 depending on strength of evidence (never 0).
`.trim();

  try {
    const tryOnce = async (model: string) => {
      let raw = await callGroqChat({ apiKey, model, prompt, timeoutMs });

      if (!raw) {
        const simpler = `Return JSON only. Pick technique_id from: ${JSON.stringify(
          [...allowedIds]
        )}. Event=${JSON.stringify(slimEvent)}. Same JSON keys.`;
        raw = await callGroqChat({ apiKey, model, prompt: simpler, timeoutMs });
      }

      return raw;
    };

    let raw: string;

    try {
      raw = await tryOnce(preferredModel);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (preferredModel !== fallbackModel && isModelDecommissionedError(msg)) {
        console.warn(`[Groq] Model "${preferredModel}" decommissioned. Retrying with "${fallbackModel}".`);
        raw = await tryOnce(fallbackModel);
      } else {
        throw e;
      }
    }

    if (!raw) return fallbackEnrichment(candidates, "empty model output");

    const jsonStr = extractFirstJsonObject(raw) ?? raw;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return fallbackEnrichment(candidates, `invalid JSON: ${raw.slice(0, 160)}`);
    }

    const enrichment = normalizeEnrichment(parsed);

    // Enforce candidate technique_id
    if (!enrichment.technique_id || !allowedIds.has(enrichment.technique_id)) {
      enrichment.technique_id = firstId;
      enrichment.confidence = Math.min(enrichment.confidence || 0.25, 0.35);
      enrichment.summary = enrichment.summary || "Technique not in candidates; defaulted to first candidate.";
    }

    // Fill name if missing
    if (!enrichment.technique_name) {
      const match = candidates.find((c) => candId(c) === enrichment.technique_id);
      enrichment.technique_name = match ? candName(match) : "";
    }

    if (!enrichment.summary) enrichment.summary = "AI enrichment completed with minimal detail.";
    if (!enrichment.recommendation) enrichment.recommendation = "Review event and respond per playbook.";

    // Keep confidence in reasonable range
    if (!Number.isFinite(enrichment.confidence)) enrichment.confidence = 0.25;
    enrichment.confidence = Math.max(0.25, Math.min(0.9, enrichment.confidence));

    return enrichment;
  } catch (e: any) {
    const reason = formatFetchError(e, timeoutMs);
    return fallbackEnrichment(
      candidates,
      `request to https://api.groq.com/openai/v1/chat/completions failed: ${reason}`
    );
  }
}
