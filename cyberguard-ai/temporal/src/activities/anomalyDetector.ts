/**
 * Anomaly Detection Activity
 * 
 * Uses statistical analysis similar to LSTM/Autoencoder for detecting anomalies
 * in security event patterns. In production, this could be replaced with:
 * - TensorFlow.js LSTM models
 * - Python ml-service via API calls
 * - PyTorch-based anomaly detection
 */

import type { HoneypotEvent } from "../shared/types";

export interface AnomalyScore {
  isAnomaly: boolean;
  score: number; // 0-1, higher = more anomalous
  reasons: string[];
  pattern: string;
  severity: "LOW" | "MED" | "HIGH";
}

/**
 * Calculate basic statistical features from event
 */
function extractFeatures(event: HoneypotEvent): Record<string, number> {
  const payload = event.payload || {};
  const username = (event.username || "").length;
  const password = (event.password || "").length;
  
  return {
    payloadSize: JSON.stringify(payload).length,
    usernameLength: username,
    passwordLength: password,
    payloadDepth: calculatePayloadDepth(payload),
    hasMultipleAttempts: (payload.attempts as number) || 0,
    suspiciousFieldCount: countSuspiciousFields(payload),
  };
}

/**
 * Calculate payload nesting depth
 */
function calculatePayloadDepth(obj: any, maxDepth = 0, currentDepth = 0): number {
  if (currentDepth > 10) return 10; // Prevent infinite recursion
  if (obj === null || typeof obj !== "object") return maxDepth;
  
  let max = maxDepth;
  for (const value of Object.values(obj)) {
    max = Math.max(max, calculatePayloadDepth(value, currentDepth + 1));
  }
  return max;
}

/**
 * Count potentially suspicious fields in payload
 */
function countSuspiciousFields(payload: any): number {
  if (!payload || typeof payload !== "object") return 0;
  
  const suspiciousPatterns = [
    "cmd", "command", "exec", "shell",
    "sql", "query", "injection",
    "password", "secret", "token", "auth",
    "payload", "data", "input",
  ];
  
  let count = 0;
  for (const key of Object.keys(payload)) {
    const lower = key.toLowerCase();
    if (suspiciousPatterns.some(p => lower.includes(p))) {
      count++;
    }
  }
  return count;
}

/**
 * Detect behavioral anomalies in temporal patterns
 */
function detectBehavioralAnomalies(event: HoneypotEvent): string[] {
  const anomalies: string[] = [];
  const payload = event.payload || {};
  
  // Check for suspicious timestamps
  const createdTime = new Date(event.created_at);
  const hour = createdTime.getUTCHours();
  
  if (hour >= 22 || hour <= 6) {
    anomalies.push("Off-hours activity detected (22:00-06:00 UTC)");
  }
  
  // Check for rapid sequential requests (would need historical context in real scenario)
  if (payload.attempts && payload.attempts > 10) {
    anomalies.push("High number of rapid attempts (possible brute force)");
  }
  
  // Check payload entropy (randomness)
  if (typeof payload === "object") {
    const payloadStr = JSON.stringify(payload);
    const entropy = calculateEntropy(payloadStr);
    if (entropy > 5.5) {
      anomalies.push("High payload entropy detected (possible encoding/obfuscation)");
    }
  }
  
  return anomalies;
}

/**
 * Shannon entropy calculation for detecting obfuscation
 */
function calculateEntropy(str: string): number {
  const len = str.length;
  const frequencies: Record<string, number> = {};
  
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  
  let entropy = 0;
  for (const freq of Object.values(frequencies)) {
    const p = freq / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

/**
 * Stateful anomaly detection combining multiple signals
 */
export async function detectAnomalies(event: HoneypotEvent): Promise<AnomalyScore> {
  const reasons: string[] = [];
  let anomalyScore = 0;
  
  // Feature extraction
  const features = extractFeatures(event);
  
  // Signal 1: Payload size anomaly (>5KB is unusual for typical attacks)
  if ((features.payloadSize ?? 0) > 5000) {
    anomalyScore += 0.15;
    reasons.push("Unusually large payload detected");
  }
  
  // Signal 2: Username/password pattern anomaly
  if ((features.usernameLength ?? 0) > 100 || (features.passwordLength ?? 0) > 254) {
    anomalyScore += 0.2;
    reasons.push("Abnormally long credentials detected");
  }
  
  // Signal 3: Payload depth anomaly (deeply nested = unusual)
  if ((features.payloadDepth ?? 0) > 5) {
    anomalyScore += 0.1;
    reasons.push("Deeply nested payload structure detected");
  }
  
  // Signal 4: Multiple failed attempts
  if ((features.hasMultipleAttempts ?? 0) >= 5) {
    anomalyScore += 0.25;
    reasons.push("Pattern matches distributed brute force (LSTM signal)");
  }
  
  // Signal 5: Suspicious field count
  if ((features.suspiciousFieldCount ?? 0) >= 3) {
    anomalyScore += 0.2;
    reasons.push("Multiple suspicious payload fields detected");
  }
  
  // Signal 6: Behavioral anomalies
  const behavioralAnomalies = detectBehavioralAnomalies(event);
  if (behavioralAnomalies.length > 0) {
    anomalyScore += 0.15 * Math.min(behavioralAnomalies.length, 2);
    reasons.push(...behavioralAnomalies);
  }
  
  // Normalize score to 0-1 range
  anomalyScore = Math.min(1, anomalyScore);
  
  // Determine if anomaly
  const isAnomaly = anomalyScore > 0.35;
  
  // Determine severity based on score
  let severity: "LOW" | "MED" | "HIGH";
  if (anomalyScore > 0.7) {
    severity = "HIGH";
  } else if (anomalyScore > 0.5) {
    severity = "MED";
  } else {
    severity = "LOW";
  }
  
  // Determine pattern type
  const pattern = determinePattern(event, features);
  
  return {
    isAnomaly,
    score: parseFloat(anomalyScore.toFixed(3)),
    reasons: reasons.length > 0 ? reasons : ["No anomalies detected"],
    pattern,
    severity,
  };
}

/**
 * Classify the type of attack/pattern
 */
function determinePattern(event: HoneypotEvent, features: Record<string, number>): string {
  if ((features.hasMultipleAttempts ?? 0) >= 5) {
    return "BRUTE_FORCE";
  }
  
  const payload = event.payload || {};
  const payloadStr = JSON.stringify(payload).toLowerCase();
  
  if (payloadStr.includes("select") || payloadStr.includes("union")) {
    return "SQL_INJECTION";
  }
  if (payloadStr.includes("../") || payloadStr.includes("..\\")) {
    return "PATH_TRAVERSAL";
  }
  if (payloadStr.includes("cmd") || payloadStr.includes("exec")) {
    return "COMMAND_INJECTION";
  }
  if ((features.payloadSize ?? 0) > 10000) {
    return "BUFFER_OVERFLOW";
  }
  
  return "UNKNOWN";
}

/**
 * Batch anomaly detection for multiple events
 * Useful for detecting coordinated attacks
 */
export async function detectBatchAnomalies(
  events: HoneypotEvent[]
): Promise<Array<AnomalyScore & { eventId: string }>> {
  const scores = await Promise.all(
    events.map(async (event) => ({
      eventId: event.id,
      ...(await detectAnomalies(event)),
    }))
  );
  
  return scores;
}

/**
 * Calculate correlation scores between events
 * Detects coordinated attacks from multiple sources
 */
export async function detectCoordinatedAttacks(
  events: HoneypotEvent[]
): Promise<{
  coordinated: boolean;
  score: number;
  eventIds: string[];
  pattern: string;
}> {
  if (events.length < 2) {
    return {
      coordinated: false,
      score: 0,
      eventIds: events.map(e => e.id),
      pattern: "NONE",
    };
  }
  
  // Check for similar patterns across events
  const patterns = events.map(e => {
    const detections = detectBehavioralAnomalies(e);
    return detections.join("|");
  });
  
  // Simple correlation: count matching patterns
  const patternCounts: Record<string, number> = {};
  for (const pattern of patterns) {
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }
  
  const maxCount = Math.max(...Object.values(patternCounts));
  const coordinatedScore = maxCount / events.length;
  
  const mostCommonPattern = Object.entries(patternCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || "UNKNOWN";
  
  return {
    coordinated: coordinatedScore > 0.6,
    score: parseFloat(coordinatedScore.toFixed(3)),
    eventIds: events.map(e => e.id),
    pattern: mostCommonPattern,
  };
}
