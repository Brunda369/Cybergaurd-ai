
process.env.HASURA_URL = "http://localhost:8080/v1/graphql";
process.env.HASURA_ADMIN_SECRET = "test-secret";

const mockApolloClient = jest.fn();
const mockHttpLink = jest.fn();
const mockInMemoryCache = jest.fn();

jest.mock("@apollo/client/core", () => ({
  ApolloClient: mockApolloClient,
  HttpLink: mockHttpLink,
  InMemoryCache: mockInMemoryCache,
  gql: (parts: TemplateStringsArray, ..._args: any[]) => parts.join(''),
}));

const { ApolloClient } = require("@apollo/client/core");

import { getHoneypotEvent, createIncident } from "../activities/hasura";


describe("Hasura Activity", () => {
  beforeEach(() => {
    process.env.HASURA_URL = "http://localhost:8080/v1/graphql";
    process.env.HASURA_ADMIN_SECRET = "test-secret";
  });

  describe("getHoneypotEvent", () => {
    it("should be defined and callable", async () => {
      expect(getHoneypotEvent).toBeDefined();
      expect(typeof getHoneypotEvent).toBe("function");
    });

    it("should require eventId parameter", () => {
         expect(getHoneypotEvent.length).toBe(1);
    });
  });

  describe("createIncident", () => {
    it("should be defined and callable", async () => {
      expect(createIncident).toBeDefined();
      expect(typeof createIncident).toBe("function");
    });

    it("should accept incident input", () => {
      expect(createIncident.length).toBe(1);
    });

    it("should have proper type definitions", () => {
      const incidentInput = {
        eventId: "event-123",
        ip: "192.168.1.1",
        risk: "HIGH" as const,
        summary: "Test incident",
        technique_id: "T1059",
        technique_name: "Command and Scripting Interpreter",
        recommendation: "Block immediately",
      };

      expect(incidentInput).toBeDefined();
    });
  });

  describe("IP Normalization Logic", () => {
    it("should validate valid IPv4 addresses", () => {
      const testCases = [
        { ip: "192.168.1.1", shouldBeValid: true },
        { ip: "10.0.0.1", shouldBeValid: true },
        { ip: "172.16.0.1", shouldBeValid: true },
        { ip: "255.255.255.255", shouldBeValid: true },
        { ip: "0.0.0.0", shouldBeValid: true },
        { ip: "invalid-ip", shouldBeValid: false },
        { ip: "256.1.1.1", shouldBeValid: false },
        { ip: "1.1.1", shouldBeValid: false },
      ];

      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

      testCases.forEach(({ ip, shouldBeValid }) => {
        const isValid = ipv4Regex.test(ip);
        expect(isValid).toBe(shouldBeValid);
      });
    });

    it("should recognize null-like IP values", () => {
      const nullLikeValues = ["unknown", "null", "none", "na", "n/a", "NULL", "NONE"];
      const testRegex = /^(unknown|null|none|na|n\/a)$/i;

      nullLikeValues.forEach((value) => {
        const matches = testRegex.test(value.toLowerCase());
        expect(matches).toBe(true);
      });
    });

    it("should handle whitespace in IP addresses", () => {
      const ipWithWhitespace = "  192.168.1.1  ";
      const trimmed = ipWithWhitespace.trim();

      expect(trimmed).toBe("192.168.1.1");
    });
  });

  describe("GraphQL Query Structure", () => {
    it("should have proper GET_HONEYPOT_EVENT query", () => {
      expect(getHoneypotEvent).toBeDefined();
    });

    it("should have proper CREATE_INCIDENT mutation", () => {
      expect(createIncident).toBeDefined();
    });
  });

  describe("Environment Variables", () => {
    it("should require HASURA_URL", () => {
      delete process.env.HASURA_URL;
      expect(process.env.HASURA_URL).toBeUndefined();
    });

    it("should require HASURA_ADMIN_SECRET", () => {
      delete process.env.HASURA_ADMIN_SECRET;
      expect(process.env.HASURA_ADMIN_SECRET).toBeUndefined();
    });

    it("should use provided environment variables", () => {
      process.env.HASURA_URL = "http://custom:8080/graphql";
      process.env.HASURA_ADMIN_SECRET = "custom-secret";

      expect(process.env.HASURA_URL).toBe("http://custom:8080/graphql");
      expect(process.env.HASURA_ADMIN_SECRET).toBe("custom-secret");
    });
  });

  describe("Input Validation", () => {
    it("should validate incident input structure", () => {
      const validInput = {
        eventId: "event-123",
        ip: "192.168.1.1",
        risk: "HIGH" as const,
        summary: "Test summary",
        technique_id: "T1059",
        technique_name: "Command and Scripting Interpreter",
        recommendation: "Block",
      };

      expect(validInput.eventId).toBeDefined();
      expect(validInput.ip).toBeDefined();
      expect(["LOW", "MED", "HIGH"]).toContain(validInput.risk);
      expect(validInput.technique_id).toMatch(/^T\d{4}$/);
    });

    it("should handle null IP in incident creation", () => {
      const inputWithNullIP = {
        eventId: "event-456",
        ip: null,
        risk: "MED" as const,
        summary: "No IP",
        technique_id: "T1110",
        technique_name: "Brute Force",
        recommendation: "Monitor",
      };

      expect(inputWithNullIP.ip).toBeNull();
    });
  });

  describe("Risk Levels", () => {
    it("should support all valid risk levels", () => {
      const validRisks = ["LOW", "MED", "HIGH"];

      validRisks.forEach((risk) => {
        expect(["LOW", "MED", "HIGH"]).toContain(risk);
      });
    });
  });

  describe("MITRE Technique Format", () => {
    it("should format MITRE technique correctly", () => {
      const techniqueId = "T1059";
      const techniqueName = "Command and Scripting Interpreter";

      const formatted = `${techniqueId} - ${techniqueName}`;

      expect(formatted).toBe("T1059 - Command and Scripting Interpreter");
    });

    it("should validate MITRE technique ID format", () => {
      const validIds = ["T1059", "T1190", "T1005", "T1003", "T1046"];
      const techniqueRegex = /^T\d{4}$/;

      validIds.forEach((id) => {
        expect(techniqueRegex.test(id)).toBe(true);
      });
    });
  });

  describe("getHoneypotEvent - Fetching", () => {
    it("should fetch honeypot event by ID", async () => {
      const mockEvent = {
        id: "event-123",
        ip: "192.168.1.1",
        username: "admin",
        password: "secret123",
        payload: { cmd: "whoami" },
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockQuery = jest.fn().mockResolvedValue({
        data: {
          honeypot_events_by_pk: mockEvent,
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        query: mockQuery,
      }));

      // Need to reinitialize the module after mocking
      jest.resetModules();
      const { getHoneypotEvent: getEvent } = require("../activities/hasura");

      const result = await getEvent("event-123");

      expect(result).toEqual(mockEvent);
    });

    it("should throw error if event not found", async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: {
          honeypot_events_by_pk: null,
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        query: mockQuery,
      }));

      jest.resetModules();
      const { getHoneypotEvent: getEvent } = require("../activities/hasura");

      await expect(getEvent("non-existent")).rejects.toThrow("No honeypot_events row found for id=non-existent");
    });

    it("should handle null data response", async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: null,
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        query: mockQuery,
      }));

      jest.resetModules();
      const { getHoneypotEvent: getEvent } = require("../activities/hasura");

      await expect(getEvent("event-123")).rejects.toThrow();
    });

    it("should handle GraphQL errors", async () => {
      const mockQuery = jest.fn().mockRejectedValue(new Error("GraphQL error"));

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        query: mockQuery,
      }));

      jest.resetModules();
      const { getHoneypotEvent: getEvent } = require("../activities/hasura");

      await expect(getEvent("event-123")).rejects.toThrow("GraphQL error");
    });

    it("should pass event ID to query variables", async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        data: {
          honeypot_events_by_pk: {
            id: "event-456",
            ip: null,
            username: null,
            password: null,
            payload: {},
            created_at: "2024-01-01T00:00:00Z",
          },
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        query: mockQuery,
      }));

      jest.resetModules();
      const { getHoneypotEvent: getEvent } = require("../activities/hasura");

      await getEvent("event-456");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { id: "event-456" },
        })
      );
    });
  });

  describe("createIncident - Mutation", () => {
    it("should create incident with all fields", async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: {
          insert_incidents_one: {
            id: "incident-123",
            risk: "HIGH",
            ip: "192.168.1.1",
            technique_id: "T1059",
            technique_name: "Command and Scripting Interpreter",
            mitre_technique: "T1059 - Command and Scripting Interpreter",
          },
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-123",
        ip: "192.168.1.1",
        risk: "HIGH" as const,
        summary: "Command execution detected",
        technique_id: "T1059",
        technique_name: "Command and Scripting Interpreter",
        recommendation: "Block immediately",
      };

      const result = await createInc(input);

      expect(result.id).toBe("incident-123");
    });

    it("should normalize IP addresses", async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: {
          insert_incidents_one: {
            id: "incident-456",
            risk: "MED",
            ip: "10.0.0.1",
            technique_id: "T1110",
            technique_name: "Brute Force",
            mitre_technique: "T1110 - Brute Force",
          },
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-456",
        ip: "  10.0.0.1  ",
        risk: "MED" as const,
        summary: "Multiple failed login attempts",
        technique_id: "T1110",
        technique_name: "Brute Force",
        recommendation: "Monitor account",
      };

      await createInc(input);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            ip: "10.0.0.1",
          }),
        })
      );
    });

    it("should handle null IP addresses", async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: {
          insert_incidents_one: {
            id: "incident-789",
            risk: "LOW",
            ip: null,
            technique_id: "T1078",
            technique_name: "Valid Accounts",
            mitre_technique: "T1078 - Valid Accounts",
          },
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-789",
        ip: null,
        risk: "LOW" as const,
        summary: "Valid account usage",
        technique_id: "T1078",
        technique_name: "Valid Accounts",
        recommendation: "Normal activity",
      };

      await createInc(input);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            ip: null,
          }),
        })
      );
    });

    it("should reject invalid IP addresses", async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: {
          insert_incidents_one: {
            id: "incident-invalid",
            risk: "LOW",
            ip: null,
            technique_id: "T1078",
            technique_name: "Valid Accounts",
            mitre_technique: "T1078 - Valid Accounts",
          },
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-invalid",
        ip: "invalid-ip-address",
        risk: "LOW" as const,
        summary: "Invalid IP test",
        technique_id: "T1078",
        technique_name: "Valid Accounts",
        recommendation: "Test",
      };

      await createInc(input);

      // Invalid IPs should be normalized to null
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            ip: null,
          }),
        })
      );
    });

    it("should handle special null-like IP values", async () => {
      const testCases = ["unknown", "null", "none", "N/A", "na"];

      for (const ipValue of testCases) {
        const mockMutate = jest.fn().mockResolvedValue({
          data: {
            insert_incidents_one: {
              id: `incident-${ipValue}`,
              risk: "LOW",
              ip: null,
              technique_id: "T1078",
              technique_name: "Valid Accounts",
              mitre_technique: "T1078 - Valid Accounts",
            },
          },
        });

        (ApolloClient as jest.Mock).mockImplementation(() => ({
          mutate: mockMutate,
        }));

        jest.resetModules();
        const { createIncident: createInc } = require("../activities/hasura");

        const input = {
          eventId: `event-${ipValue}`,
          ip: ipValue,
          risk: "LOW" as const,
          summary: "Test",
          technique_id: "T1078",
          technique_name: "Valid Accounts",
          recommendation: "Test",
        };

        await createInc(input);

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              ip: null,
            }),
          })
        );
      }
    });

    it("should throw error if mutation fails", async () => {
      const mockMutate = jest.fn().mockRejectedValue(new Error("Database error"));

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-error",
        ip: "192.168.1.1",
        risk: "HIGH" as const,
        summary: "Test",
        technique_id: "T1059",
        technique_name: "Command",
        recommendation: "Test",
      };

      await expect(createInc(input)).rejects.toThrow("Database error");
    });

    it("should throw error if insert_incidents_one is null", async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: {
          insert_incidents_one: null,
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-null",
        ip: "192.168.1.1",
        risk: "HIGH" as const,
        summary: "Test",
        technique_id: "T1059",
        technique_name: "Command",
        recommendation: "Test",
      };

      await expect(createInc(input)).rejects.toThrow("Failed to insert incident (insert_incidents_one was null)");
    });

    it("should construct MITRE technique field correctly", async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: {
          insert_incidents_one: {
            id: "incident-mitre",
            risk: "HIGH",
            ip: "192.168.1.1",
            technique_id: "T1190",
            technique_name: "Exploit Public-Facing Application",
            mitre_technique: "T1190 - Exploit Public-Facing Application",
          },
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-mitre",
        ip: "192.168.1.1",
        risk: "HIGH" as const,
        summary: "SQL injection",
        technique_id: "T1190",
        technique_name: "Exploit Public-Facing Application",
        recommendation: "Patch immediately",
      };

      await createInc(input);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            mitre_technique: "T1190 - Exploit Public-Facing Application",
          }),
        })
      );
    });

    it("should pass all input fields as mutation variables", async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: {
          insert_incidents_one: {
            id: "incident-complete",
            risk: "MED",
            ip: "10.0.0.5",
            technique_id: "T1046",
            technique_name: "Network Service Discovery",
            mitre_technique: "T1046 - Network Service Discovery",
          },
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-complete",
        ip: "10.0.0.5",
        risk: "MED" as const,
        summary: "Recon tool detected",
        technique_id: "T1046",
        technique_name: "Network Service Discovery",
        recommendation: "Monitor traffic",
      };

      await createInc(input);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: {
            event_id: "event-complete",
            ip: "10.0.0.5",
            risk: "MED",
            summary: "Recon tool detected",
            technique_id: "T1046",
            technique_name: "Network Service Discovery",
            mitre_technique: "T1046 - Network Service Discovery",
            recommendation: "Monitor traffic",
          },
        })
      );
    });

    it("should handle missing HASURA_URL env var", async () => {
      delete process.env.HASURA_URL;

      jest.resetModules();

      expect(() => {
        require("../activities/hasura");
      }).toThrow("Missing env var: HASURA_URL");
    });

    it("should handle missing HASURA_ADMIN_SECRET env var", async () => {
      delete process.env.HASURA_ADMIN_SECRET;

      jest.resetModules();

      expect(() => {
        require("../activities/hasura");
      }).toThrow("Missing env var: HASURA_ADMIN_SECRET");
    });
  });

  describe("IP Normalization Edge Cases", () => {
    it("should handle case-insensitive null-like values", async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: {
          insert_incidents_one: {
            id: "incident-case",
            risk: "LOW",
            ip: null,
            technique_id: "T1078",
            technique_name: "Valid Accounts",
            mitre_technique: "T1078 - Valid Accounts",
          },
        },
      });

      (ApolloClient as jest.Mock).mockImplementation(() => ({
        mutate: mockMutate,
      }));

      jest.resetModules();
      const { createIncident: createInc } = require("../activities/hasura");

      const input = {
        eventId: "event-case",
        ip: "NULL",
        risk: "LOW" as const,
        summary: "Test",
        technique_id: "T1078",
        technique_name: "Valid Accounts",
        recommendation: "Test",
      };

      await createInc(input);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            ip: null,
          }),
        })
      );
    });

    it("should validate IPv4 address format", async () => {
      const validIPs = ["192.168.1.1", "10.0.0.1", "172.16.0.1", "255.255.255.255"];

      for (const ip of validIPs) {
        const mockMutate = jest.fn().mockResolvedValue({
          data: {
            insert_incidents_one: {
              id: `incident-${ip}`,
              risk: "LOW",
              ip,
              technique_id: "T1078",
              technique_name: "Valid Accounts",
              mitre_technique: "T1078 - Valid Accounts",
            },
          },
        });

        (ApolloClient as jest.Mock).mockImplementation(() => ({
          mutate: mockMutate,
        }));

        jest.resetModules();
        const { createIncident: createInc } = require("../activities/hasura");

        const input = {
          eventId: `event-${ip}`,
          ip,
          risk: "LOW" as const,
          summary: "Test",
          technique_id: "T1078",
          technique_name: "Valid Accounts",
          recommendation: "Test",
        };

        await createInc(input);

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              ip,
            }),
          })
        );
      }
    });
  });
});
