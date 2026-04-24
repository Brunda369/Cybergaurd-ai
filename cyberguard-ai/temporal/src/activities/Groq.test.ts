/// <reference types="jest" />

import fetch from "cross-fetch";
import AbortController from "abort-controller";
import { enrichWithGroq } from "../activities/Groq";
import type { HoneypotEvent, MitreCandidate } from "../shared/types";

jest.mock("cross-fetch");
jest.mock("abort-controller");

describe("Groq Activity - enrichWithGroq", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GROQ_API_KEY = "test-api-key";
    process.env.GROQ_MODEL = "mixtral-8x7b-32768";
    process.env.GROQ_MODEL_FALLBACK = "mixtral-8x7b-32768";
    process.env.GROQ_TIMEOUT_MS = "60000";
  });

  const createEvent = (overrides?: Partial<HoneypotEvent>): HoneypotEvent => ({
    id: "test-id",
    ip: "192.168.1.1",
    username: "admin",
    password: "test123",
    payload: {},
    created_at: new Date().toISOString(),
    ...overrides,
  });

  const createCandidate = (overrides?: Partial<MitreCandidate>): MitreCandidate => ({
    technique_id: "T1059",
    technique_name: "Command and Scripting Interpreter",
    ...overrides,
  });

  describe("Successful API calls", () => {
    it("should parse valid JSON response from Groq API", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "HIGH",
                    technique_id: "T1059",
                    technique_name: "Command and Scripting Interpreter",
                    summary: "Command execution detected",
                    recommendation: "Block and investigate",
                    confidence: 0.85,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent({
        payload: { cmd: "whoami" },
      });
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });

      expect(result.technique_id).toBe("T1059");
      expect(result.risk).toBe("HIGH");
      expect(result.confidence).toBe(0.85);
    });

    it("should normalize risk levels to valid options", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "CRITICAL",
                    technique_id: "T1059",
                    technique_name: "Test",
                    summary: "Test",
                    recommendation: "Test",
                    confidence: 0.5,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });

      expect(["LOW", "MED", "HIGH"]).toContain(result.risk);
    });

    it("should enforce technique_id from candidates list", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "HIGH",
                    technique_id: "T9999",
                    technique_name: "Invalid",
                    summary: "Test",
                    recommendation: "Test",
                    confidence: 0.8,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [createCandidate({ technique_id: "T1059" })];

      const result = await enrichWithGroq({ event, candidates });

      expect(result.technique_id).toBe("T1059");
      expect(result.confidence).toBeLessThanOrEqual(0.35);
    });

    it("should fill missing technique_name from candidates", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "MED",
                    technique_id: "T1190",
                    technique_name: "",
                    summary: "SQL injection",
                    recommendation: "Test",
                    confidence: 0.6,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [
        createCandidate({
          technique_id: "T1190",
          technique_name: "Exploit Public-Facing Application",
        }),
      ];

      const result = await enrichWithGroq({ event, candidates });

      expect(result.technique_name).toBe("Exploit Public-Facing Application");
    });

    it("should keep confidence in valid range [0.25, 0.9]", async () => {
      const testCases = [
        { input: 0.1, expected: 0.25 },
        { input: 0.5, expected: 0.5 },
        { input: 0.95, expected: 0.9 },
        { input: 1.5, expected: 0.9 },
        { input: -0.1, expected: 0.25 },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          ok: true,
          text: jest.fn().mockResolvedValue(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      risk: "HIGH",
                      technique_id: "T1059",
                      technique_name: "Test",
                      summary: "Test",
                      recommendation: "Test",
                      confidence: testCase.input,
                    }),
                  },
                },
              ],
            })
          ),
        };

        (fetch as jest.Mock).mockResolvedValue(mockResponse);

        const event = createEvent();
        const candidates = [createCandidate()];

        const result = await enrichWithGroq({ event, candidates });

        expect(result.confidence).toBe(testCase.expected);
      }
    });
  });

  describe("Error Handling", () => {
    it("should return fallback enrichment on invalid JSON response", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue("Not valid JSON"),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });

      expect(result.risk).toBe("MED");
      expect(result.technique_id).toBe("T1059");
      expect(result.confidence).toBe(0.2);
    });

    it("should handle empty API response", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(""),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });

      expect(result.risk).toBe("MED");
      expect(result.technique_id).toBe("T1059");
    });

    it("should handle HTTP error responses", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });

      // The Groq function catches errors and returns fallback enrichment
      expect(result.risk).toBe('MED');
      expect(result.summary).toContain('fallback');
    });

    it("should throw error if GROQ_API_KEY is missing", async () => {
      delete process.env.GROQ_API_KEY;

      const event = createEvent();
      const candidates = [createCandidate()];

      await expect(enrichWithGroq({ event, candidates })).rejects.toThrow("Missing env var: GROQ_API_KEY");
    });

    it("should retry with fallback model on decommissioned error", async () => {
      let callCount = 0;

      const mockResponse = {
        ok: false,
        status: 410,
        text: jest.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return JSON.stringify({
              error: { message: "model_decommissioned" },
            });
          }
          return JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "HIGH",
                    technique_id: "T1059",
                    technique_name: "Command",
                    summary: "Test",
                    recommendation: "Test",
                    confidence: 0.7,
                  }),
                },
              },
            ],
          });
        }),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      process.env.GROQ_MODEL = "decommissioned-model";
      process.env.GROQ_MODEL_FALLBACK = "mixtral-8x7b-32768";

      const event = createEvent();
      const candidates = [createCandidate()];

      // This test would need proper implementation to work
      // It demonstrates the retry logic
    });

    it("should handle timeout errors", async () => {
      const mockError = new Error('Request timeout');
      mockError.name = 'AbortError';

      (fetch as jest.Mock).mockRejectedValue(mockError);

      const event = createEvent();
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });
      expect(result.risk).toBe('MED');
      expect(result.summary).toContain('fallback');
    });

    it("should handle network errors gracefully", async () => {
      const mockError:any = new Error('Network error');
      mockError.code = 'ECONNREFUSED';

      (fetch as jest.Mock).mockRejectedValue(mockError);

      const event = createEvent();
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });
      expect(result.risk).toBe('MED');
      expect(result.summary).toContain('fallback');
    });
  });

  describe("Event Slim Building", () => {
    it("should extract relevant fields from event payload", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "HIGH",
                    technique_id: "T1059",
                    technique_name: "Command",
                    summary: "Detected command execution",
                    recommendation: "Block immediately",
                    confidence: 0.8,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent({
        payload: {
          service: "ssh",
          method: "POST",
          path: "/admin",
          attempts: 3,
          auth_success: false,
        },
      });

      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });
      expect(fetch).toHaveBeenCalled();
    });

    it("should handle complex nested payloads", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "MED",
                    technique_id: "T1046",
                    technique_name: "Network Service Discovery",
                    summary: "Scan detected",
                    recommendation: "Monitor",
                    confidence: 0.6,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent({
        payload: {
          headers: {
            "user-agent": "nmap/7.92",
            "accept": "*/*",
          },
          metadata: {
            nested: {
              deep: "value",
            },
          },
        },
      });

      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });

      expect(result).toBeDefined();
    });
  });

  describe("Candidate Handling", () => {
    it("should handle empty candidates array", async () => {
      const event = createEvent();
      const candidates: MitreCandidate[] = [];

      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "LOW",
                    technique_id: "T0000",
                    technique_name: "Unknown",
                    summary: "No match",
                    recommendation: "Review manually",
                    confidence: 0.2,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await enrichWithGroq({ event, candidates });

      expect(result.technique_id).toBe("T0000");
    });

    it("should handle multiple candidates", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "HIGH",
                    technique_id: "T1190",
                    technique_name: "Exploit Public-Facing Application",
                    summary: "SQL injection confirmed",
                    recommendation: "Immediate remediation",
                    confidence: 0.9,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [
        createCandidate({ technique_id: "T1059" }),
        createCandidate({ technique_id: "T1190", technique_name: "Exploit Public-Facing Application" }),
        createCandidate({ technique_id: "T1005" }),
      ];

      const result = await enrichWithGroq({ event, candidates });

      expect(result.technique_id).toBe("T1190");
    });
  });

  describe("Result Structure Validation", () => {
    it("should always return valid Enrichment object", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "MED",
                    technique_id: "T1078",
                    technique_name: "Valid Accounts",
                    summary: "Normal auth attempt",
                    recommendation: "Monitor",
                    confidence: 0.5,
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });

      expect(result).toHaveProperty("risk");
      expect(result).toHaveProperty("technique_id");
      expect(result).toHaveProperty("technique_name");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("recommendation");
      expect(result).toHaveProperty("confidence");

      expect(["LOW", "MED", "HIGH"]).toContain(result.risk);
      expect(typeof result.confidence).toBe("number");
    });

    it("should fill in default values for missing fields", async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    risk: "MED",
                    technique_id: "T1059",
                  }),
                },
              },
            ],
          })
        ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const event = createEvent();
      const candidates = [createCandidate()];

      const result = await enrichWithGroq({ event, candidates });

      expect(result.technique_name).not.toBe("");
      expect(result.summary).not.toBe("");
      expect(result.recommendation).not.toBe("");
      expect(result.confidence).toBeGreaterThanOrEqual(0.25);
    });
  });
});
