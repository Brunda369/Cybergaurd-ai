/**
 * Security Log Ingestion Activity
 * 
 * Parses and normalizes security logs from multiple sources:
 * - Firewall logs (firewalld, iptables, Palo Alto, Fortinet, etc.)
 * - Authentication logs (syslog, Windows Event Log, SSH logs)
 * - SIEM logs (Splunk, ELK, ArcSight)
 * - Application logs
 * 
 * Converts diverse log formats into standardized HoneypotEvent structure
 */

import type { HoneypotEvent } from "../shared/types";

export interface RawLogEntry {
  source: "firewall" | "auth" | "siem" | "application" | "custom";
  format: string; // e.g., "syslog", "nginx", "windows-eventlog", "splunk-json"
  raw: string | Record<string, any>;
  timestamp: string;
}

export interface NormalizedLogEntry extends Partial<HoneypotEvent> {
  originalFormat: string;
  confidenceScore: number; // 0-1, how confident are we about this normalization
  parsingNotes: string[];
}

/**
 * Main log ingestion and normalization function
 */
export async function ingestSecurityLog(
  logEntry: RawLogEntry
): Promise<NormalizedLogEntry> {
  const parsingNotes: string[] = [];
  
  try {
    let normalized: Partial<HoneypotEvent>;
    
    switch (logEntry.source) {
      case "firewall":
        normalized = parseFirewallLog(logEntry, parsingNotes);
        break;
      
      case "auth":
        normalized = parseAuthLog(logEntry, parsingNotes);
        break;
      
      case "siem":
        normalized = parseSiemLog(logEntry, parsingNotes);
        break;
      
      case "application":
        normalized = parseApplicationLog(logEntry, parsingNotes);
        break;
      
      default:
        normalized = parseCustomLog(logEntry, parsingNotes);
    }
    
    // Generate event ID if missing
    if (!normalized.id) {
      normalized.id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      parsingNotes.push("Generated synthetic event ID");
    }
    
    // Ensure created_at timestamp
    if (!normalized.created_at) {
      normalized.created_at = logEntry.timestamp || new Date().toISOString();
    }
    
    // Default payload if missing
    if (!normalized.payload) {
      normalized.payload = {};
      parsingNotes.push("Generated empty payload");
    }
    
    return {
      ...normalized,
      originalFormat: logEntry.format,
      confidenceScore: calculateConfidenceScore(normalized, parsingNotes),
      parsingNotes,
    };
  } catch (error) {
    console.error("[LogIngestion] Parsing failed:", error);
    
    return {
      id: `event-error-${Date.now()}`,
      ip: "unknown",
      username: null,
      password: null,
      payload: { rawLog: logEntry.raw },
      created_at: logEntry.timestamp,
      originalFormat: logEntry.format,
      confidenceScore: 0.1,
      parsingNotes: [`Parsing error: ${error}`, "Created minimal event from raw log"],
    };
  }
}

/**
 * Parse firewall logs
 * Supports: firewalld, iptables, Palo Alto, Fortinet FortiGate, Cisco, Checkpoint
 */
function parseFirewallLog(
  logEntry: RawLogEntry,
  notes: string[]
): Partial<HoneypotEvent> {
  const raw = typeof logEntry.raw === "string" ? logEntry.raw : JSON.stringify(logEntry.raw);
  
  // Palo Alto Networks format
  if (raw.includes("pan")) {
    const ipMatch = raw.match(/src=([0-9.]+)/);
    const dstMatch = raw.match(/dst=([0-9.]+)/);
    const appMatch = raw.match(/app=([a-z-]+)/);
    
    return {
      ip: ipMatch ? ipMatch[1] : (undefined as any),
      payload: {
        firewall: "palo-alto",
        destinationIp: dstMatch ? dstMatch[1] : null,
        application: appMatch ? appMatch[1] : null,
        rawLog: raw,
      },
    } as Partial<HoneypotEvent>;
  }
  
  // Fortinet FortiGate format
  if (raw.includes("FortiGate") || raw.includes("srcip")) {
    const srcMatch = raw.match(/srcip=([0-9.]+)/);
    const dstMatch = raw.match(/dstip=([0-9.]+)/);
    const protoMatch = raw.match(/proto=(\w+)/);
    
    return {
      ip: srcMatch ? srcMatch[1] : (undefined as any),
      payload: {
        firewall: "fortigate",
        destinationIp: dstMatch ? dstMatch[1] : null,
        protocol: protoMatch ? protoMatch[1] : null,
        rawLog: raw,
      },
    } as Partial<HoneypotEvent>;
  }
  
  // Generic firewall format (firewalld, iptables)
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
  const ipMatch = raw.match(ipRegex);
  
  notes.push("Using generic firewall parsing");
  
  return {
    ip: ipMatch ? ipMatch[0] : (undefined as any),
    payload: {
      firewall: "generic",
      rawLog: raw,
    },
  } as Partial<HoneypotEvent>;
}

/**
 * Parse authentication logs
 * Supports: syslog, SSH, Windows Event Log, FTP, HTTP auth
 */
function parseAuthLog(
  logEntry: RawLogEntry,
  notes: string[]
): Partial<HoneypotEvent> {
  const raw = typeof logEntry.raw === "string" ? logEntry.raw : JSON.stringify(logEntry.raw);
  
  // SSH log format
  if (raw.includes("sshd") || raw.includes("Invalid user")) {
    const userMatch = raw.match(/user[=\s]([^\/\s]+)/i);
    const ipMatch = raw.match(/(?:from|for) ([0-9.]+)/);
    
    return {
      ip: ipMatch ? ipMatch[1] : (undefined as any),
      username: userMatch ? userMatch[1] : null,
      payload: {
        service: "ssh",
        success: raw.includes("Accepted") || raw.includes("succeeded"),
        rawLog: raw,
      },
    } as Partial<HoneypotEvent>;
  }
  
  // FTP log format
  if (raw.includes("FTP") || raw.includes("USER ")) {
    const userMatch = raw.match(/USER\s+([^\s]+)/i) || raw.match(/user[=:\s]([^\s]+)/i);
    const ipMatch = raw.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
    
    return {
      ip: ipMatch ? ipMatch[0] : (undefined as any),
      username: userMatch ? userMatch[1] : null,
      payload: {
        service: "ftp",
        rawLog: raw,
      },
    } as Partial<HoneypotEvent>;
  }
  
  // Windows Event Log format (JSON or syslog-formatted)
  if (raw.includes("EventID") || raw.includes("TargetUserName")) {
    let parsed: any = raw;
    
    if (typeof logEntry.raw === "object") {
      parsed = logEntry.raw;
    } else {
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Not JSON, parse manually
      }
    }
    
    return {
      ip: parsed.SourceIP || parsed.ComputerName || null,
      username: parsed.TargetUserName || parsed.User || null,
      payload: {
        service: "windows-auth",
        eventId: parsed.EventID,
        computerName: parsed.ComputerName,
        rawLog: raw,
      },
    };
  }
  
  // Generic syslog format
  const userMatch = raw.match(/user[=:\s]([^\s]+)/i);
  const ipMatch = raw.match(/(?:from|ip)[=:\s]([0-9.]+)/i);
  
  notes.push("Using generic authentication log parsing");
  
  return {
    ip: ipMatch ? ipMatch[1] : (undefined as any),
    username: userMatch ? userMatch[1] : null,
    payload: {
      service: "generic-auth",
      rawLog: raw,
    },
  } as Partial<HoneypotEvent>;
}

/**
 * Parse SIEM logs (Splunk, ELK, ArcSight format)
 */
function parseSiemLog(
  logEntry: RawLogEntry,
  notes: string[]
): Partial<HoneypotEvent> {
  let parsed: any;
  
  // Try JSON first (Splunk, ELK)
  if (typeof logEntry.raw === "object") {
    parsed = logEntry.raw;
  } else {
    try {
      parsed = JSON.parse(logEntry.raw as string);
    } catch {
      // Fall back to string parsing
      return parseCustomLog(logEntry, notes);
    }
  }
  
  // Normalize common SIEM field names
  const fieldMappings: Record<string, string[]> = {
    ip: ["src", "source_ip", "src_ip", "sourceIP", "SourceIP", "host"],
    username: ["user", "src_user", "source_user", "username", "User"],
    password: ["password", "pwd", "pass"],
  };
  
  const result: Partial<HoneypotEvent> = {
    payload: {
      siem_source: logEntry.format,
      ...parsed,
    },
  };
  
  // Map SIEM fields
  for (const [target, sources] of Object.entries(fieldMappings)) {
    for (const source of sources) {
      if (parsed[source]) {
        if (target === "ip") {
          result.ip = parsed[source];
        } else if (target === "username") {
          result.username = parsed[source];
        } else if (target === "password") {
          result.password = parsed[source];
        }
        break;
      }
    }
  }
  
  notes.push(`SIEM log from ${logEntry.format}`);
  
  return result;
}

/**
 * Parse application logs (web server, database, custom apps)
 */
function parseApplicationLog(
  logEntry: RawLogEntry,
  notes: string[]
): Partial<HoneypotEvent> {
  const raw = typeof logEntry.raw === "string" ? logEntry.raw : JSON.stringify(logEntry.raw);
  
  // HTTP server logs (nginx, Apache)
  if (raw.includes("HTTP") || logEntry.format.includes("nginx") || logEntry.format.includes("apache")) {
    const ipMatch = raw.match(/^([0-9.]+)\s/);
    const userMatch = raw.match(/\suser[=\[\s]([^\s\]]+)/i);
    const methodMatch = raw.match(/(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/);
    
    return {
      ip: ipMatch ? ipMatch[1] : (undefined as any),
      username: userMatch ? userMatch[1] : null,
      payload: {
        service: "http",
        method: methodMatch ? methodMatch[1] : null,
        path: methodMatch ? methodMatch[2] : null,
        rawLog: raw,
      },
    } as Partial<HoneypotEvent>;
  }
  
  // Database logs
  if (
    raw.includes("SQL") ||
    raw.includes("query") ||
    logEntry.format.includes("mysql") ||
    logEntry.format.includes("postgres")
  ) {
    const userMatch = raw.match(/user[=:\s]([^\s]+)/i);
    const queryMatch = raw.match(/(SELECT|INSERT|UPDATE|DELETE)\s+.+/i);
    
    return {
      username: userMatch ? userMatch[1] : (undefined as any),
      payload: {
        service: "database",
        query: queryMatch ? queryMatch[0] : null,
        rawLog: raw,
      },
    } as Partial<HoneypotEvent>;
  }
  
  notes.push("Using generic application log parsing");
  
  return {
    payload: {
      service: "application",
      rawLog: raw,
    },
  };
}

/**
 * Parse custom/unknown log formats
 */
function parseCustomLog(
  logEntry: RawLogEntry,
  notes: string[]
): Partial<HoneypotEvent> {
  const raw = typeof logEntry.raw === "string" ? logEntry.raw : JSON.stringify(logEntry.raw);
  
  // Extract any IP addresses
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
  const ipMatch = raw.match(ipRegex);
  
  // Extract any usernames (common patterns)
  const userRegex = /(?:user|username|account)[=:\s]([^\s;,]+)/i;
  const userMatch = raw.match(userRegex);
  
  notes.push("Using generic custom log parsing - low confidence");
  
  return {
    ip: ipMatch ? ipMatch[0] : (undefined as any),
    username: userMatch ? userMatch[1] : null,
    payload: {
      format: logEntry.format,
      rawLog: raw,
    },
  } as Partial<HoneypotEvent>;
}

/**
 * Calculate confidence score for the parsed event
 */
function calculateConfidenceScore(
  event: Partial<HoneypotEvent>,
  notes: string[]
): number {
  let score = 0.5; // Base score
  
  if (event.ip && event.ip !== "unknown") score += 0.25;
  if (event.username) score += 0.15;
  if (event.password) score += 0.1;
  if (event.payload && Object.keys(event.payload).length > 1) score += 0.1;
  
  // Reduce confidence if notes indicate parsing issues
  if (notes.some(n => n.includes("generic"))) score -= 0.2;
  if (notes.some(n => n.includes("error"))) score -= 0.4;
  if (notes.some(n => n.includes("synthetic"))) score -= 0.1;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Batch ingest multiple log entries
 */
export async function ingestLogBatch(
  logs: RawLogEntry[]
): Promise<NormalizedLogEntry[]> {
  return Promise.all(
    logs.map(log => ingestSecurityLog(log))
  );
}

/**
 * Validate normalized log entry
 */
export function validateLogEntry(entry: NormalizedLogEntry): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!entry.id) {
    errors.push("Missing event ID");
  }
  
  if (!entry.ip && !entry.payload?.rawLog) {
    errors.push("No IP address and no raw log data");
  }
  
  if (entry.confidenceScore < 0.2) {
    errors.push("Confidence score too low (< 0.2)");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
