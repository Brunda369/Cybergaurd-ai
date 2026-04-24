/**
 * Test utilities and helpers for Jest test suites
 */

import type { HoneypotEvent, MitreCandidate, Enrichment } from "../../temporal/src/shared/types";

/**
 * Factory function to create a minimal HoneypotEvent for testing
 */
export function createMockEvent(overrides?: Partial<HoneypotEvent>): HoneypotEvent {
  return {
    id: "test-id-" + Math.random().toString(36).substring(7),
    ip: "192.168.1.1",
    username: null,
    password: null,
    payload: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory function to create a MITRE candidate for testing
 */
export function createMockCandidate(overrides?: Partial<MitreCandidate>): MitreCandidate {
  return {
    technique_id: "T0000",
    technique_name: "Unknown Technique",
    ...overrides,
  };
}

/**
 * Factory function to create a mock Enrichment response
 */
export function createMockEnrichment(overrides?: Partial<Enrichment>): Enrichment {
  return {
    risk: "MED",
    technique_id: "T1078",
    technique_name: "Valid Accounts",
    summary: "Test enrichment",
    recommendation: "Monitor",
    confidence: 0.5,
    ...overrides,
  };
}

/**
 * Create a mock GraphQL response for Apollo Client
 */
export function createMockGraphQLResponse<T>(data: T) {
  return {
    data,
    loading: false,
    networkStatus: 7,
  };
}

/**
 * Create a mock API response for Groq
 */
export function createMockGroqResponse(content: any) {
  return {
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        choices: [
          {
            message: {
              content: typeof content === "string" ? content : JSON.stringify(content),
            },
          },
        ],
      }),
  };
}

/**
 * Compare two risk levels (LOW < MED < HIGH)
 */
export function compareRiskLevels(risk1: string, risk2: string): -1 | 0 | 1 {
  const order = { LOW: 0, MED: 1, HIGH: 2 };
  const level1 = order[risk1 as keyof typeof order] ?? -1;
  const level2 = order[risk2 as keyof typeof order] ?? -1;

  if (level1 < level2) return -1;
  if (level1 > level2) return 1;
  return 0;
}

/**
 * Validate if a risk level is valid
 */
export function isValidRiskLevel(risk: any): risk is "LOW" | "MED" | "HIGH" {
  return ["LOW", "MED", "HIGH"].includes(risk);
}

/**
 * Validate if a MITRE technique ID format is valid (T#### or similar)
 */
export function isValidTechniqueId(id: string): boolean {
  return /^T\d{4}$/.test(id) || id === "Unable to identify";
}

/**
 * Validate IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  return ipv4Regex.test(ip);
}

/**
 * Mock environment variables
 */
export function setupMockEnv() {
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_MODEL = "mixtral-8x7b-32768";
  process.env.GROQ_TIMEOUT_MS = "60000";
  process.env.HASURA_URL = "http://localhost:8080/v1/graphql";
  process.env.HASURA_ADMIN_SECRET = "test-secret";
}

/**
 * Clear mock environment variables
 */
export function clearMockEnv() {
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
  delete process.env.GROQ_TIMEOUT_MS;
  delete process.env.HASURA_URL;
  delete process.env.HASURA_ADMIN_SECRET;
}

/**
 * Wait for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a batch of test events for stress testing
 */
export function createEventBatch(count: number, template?: Partial<HoneypotEvent>): HoneypotEvent[] {
  return Array.from({ length: count }, (_, i) =>
    createMockEvent({
      id: `event-${i}`,
      ...template,
    })
  );
}

/**
 * Test data fixtures for common scenarios
 */
export const TEST_FIXTURES = {
  COMMAND_EXECUTION: {
    event: createMockEvent({
      payload: { cmd: "whoami" },
    }),
    expectedTechniqueId: "T1059",
    expectedRisk: "HIGH",
  },

  SQL_INJECTION: {
    event: createMockEvent({
      payload: { query: "' or '1'='1" },
    }),
    expectedTechniqueId: "T1190",
    expectedRisk: "HIGH",
  },

  PATH_TRAVERSAL: {
    event: createMockEvent({
      payload: { path: "../../etc/passwd" },
    }),
    expectedTechniqueId: "T1005",
    expectedRisk: "HIGH",
  },

  BRUTE_FORCE: {
    event: createMockEvent({
      username: "admin",
      payload: { attempts: 5 },
    }),
    expectedTechniqueId: "T1110",
    expectedRisk: "HIGH",
  },

  RECON_TOOL: {
    event: createMockEvent({
      payload: { user_agent: "nmap/7.92" },
    }),
    expectedTechniqueId: "T1046",
    expectedRisk: "MED",
  },

  VALID_ACCOUNTS: {
    event: createMockEvent({
      username: "john.doe",
      password: null,
    }),
    expectedTechniqueId: "T1078",
    expectedRisk: "LOW",
  },

  BENIGN_EVENT: {
    event: createMockEvent(),
    expectedTechniqueId: "Unable to identify",
    expectedRisk: "LOW",
  },
};

/**
 * Assert that a result matches expected MITRE classification
 */
export function assertMitreClassification(
  actual: any,
  expected: { technique_id: string; risk: string; reasonsCount?: number }
) {
  expect(actual.technique_id).toBe(expected.technique_id);
  expect(actual.risk).toBe(expected.risk);
  if (expected.reasonsCount !== undefined) {
    expect(actual.reasons.length).toBeGreaterThanOrEqual(expected.reasonsCount);
  }
}

/**
 * Assert that a result is a valid Enrichment object
 */
export function assertValidEnrichment(enrichment: any) {
  expect(enrichment).toHaveProperty("risk");
  expect(enrichment).toHaveProperty("technique_id");
  expect(enrichment).toHaveProperty("technique_name");
  expect(enrichment).toHaveProperty("summary");
  expect(enrichment).toHaveProperty("recommendation");
  expect(enrichment).toHaveProperty("confidence");

  expect(isValidRiskLevel(enrichment.risk)).toBe(true);
  expect(isValidTechniqueId(enrichment.technique_id)).toBe(true);
  expect(typeof enrichment.confidence).toBe("number");
  expect(enrichment.confidence).toBeGreaterThanOrEqual(0);
  expect(enrichment.confidence).toBeLessThanOrEqual(1);
}
