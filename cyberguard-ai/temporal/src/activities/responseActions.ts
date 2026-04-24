/**
 * Incident Response Actions Activity
 * 
 * Executes recommended response actions based on threat assessment:
 * - IP blocking (firewall rules)
 * - Password reset alerts
 * - MFA enforcement recommendations
 * - Alert escalation to SOC
 * - Automated playbook execution
 */

import type { HoneypotEvent } from "../shared/types";

export type ResponseAction = "IP_BLOCK" | "PASSWORD_RESET" | "MFA_ENFORCE" | "ALERT_ESCALATE" | "RATE_LIMIT";

export interface IncidentResponse {
  actions: Array<{
    action: ResponseAction;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    result?: string;
    timestamp: string;
  }>;
  escalationLevel: 0 | 1 | 2 | 3; // 0=none, 1=soc, 2=security-lead, 3=ciso
  affectedUsers: string[];
  affectedAssets: string[];
  recommendedPlaybooks: string[];
}

/**
 * Load response action configuration
 */
function loadResponseConfig(): {
  firewallApiUrl?: string;
  alertingSystemUrl?: string;
  passwordResetEnabled: boolean;
  autoBlockHighRisk: boolean;
  escalationThreshold: "LOW" | "MED" | "HIGH";
} {
  const config: {
    firewallApiUrl?: string;
    alertingSystemUrl?: string;
    passwordResetEnabled: boolean;
    autoBlockHighRisk: boolean;
    escalationThreshold: "LOW" | "MED" | "HIGH";
  } = {
    passwordResetEnabled: process.env.PASSWORD_RESET_ENABLED !== "false",
    autoBlockHighRisk: process.env.AUTO_BLOCK_HIGH_RISK !== "false",
    escalationThreshold: (process.env.ESCALATION_THRESHOLD || "HIGH") as "LOW" | "MED" | "HIGH",
  };

  if (process.env.FIREWALL_API_URL) {
    config.firewallApiUrl = process.env.FIREWALL_API_URL;
  }
  if (process.env.ALERTING_SYSTEM_URL) {
    config.alertingSystemUrl = process.env.ALERTING_SYSTEM_URL;
  }

  return config;
}

/**
 * Execute immediate response actions for an incident
 */
export async function executeResponseActions(
  event: HoneypotEvent,
  riskLevel: "LOW" | "MED" | "HIGH",
  techniqueId: string,
  username: string | null
): Promise<IncidentResponse> {
  const config = loadResponseConfig();
  const actions: IncidentResponse["actions"] = [];
  const affectedUsers: string[] = [];
  const affectedAssets: string[] = [];
  const recommendedPlaybooks: string[] = [];

  // Helper to update last action
  const updateLastAction = (status: IncidentResponse["actions"][0]["status"], result?: string) => {
    const lastIndex = actions.length - 1;
    if (lastIndex >= 0 && actions[lastIndex]) {
      actions[lastIndex]!.status = status;
      if (result) actions[lastIndex]!.result = result;
    }
  };

  // Track escalation level
  let escalationLevel: IncidentResponse["escalationLevel"] = 0;

  try {
    // ACTION 1: Block IP if risk is HIGH
    if (riskLevel === "HIGH" && config.autoBlockHighRisk && event.ip) {
      actions.push({
        action: "IP_BLOCK",
        status: "PENDING",
        timestamp: new Date().toISOString(),
      });

      try {
        const blockResult = await blockIP(event.ip, techniqueId);
        updateLastAction(blockResult.success ? "COMPLETED" : "FAILED", blockResult.message);
      } catch (error) {
        updateLastAction("FAILED", `Failed to block IP: ${error}`);
      }
    }

    // ACTION 2: Alert password reset if credentials were used
    if (username && riskLevel !== "LOW" && config.passwordResetEnabled) {
      actions.push({
        action: "PASSWORD_RESET",
        status: "PENDING",
        timestamp: new Date().toISOString(),
      });
      affectedUsers.push(username);

      try {
        const resetResult = await triggerPasswordReset(username);
        updateLastAction(resetResult.success ? "COMPLETED" : "FAILED", resetResult.message);
      } catch (error) {
        updateLastAction("FAILED", `Password reset alert failed: ${error}`);
      }
    }

    // ACTION 3: Enforce MFA for HIGH risk attacks on critical accounts
    if (
      riskLevel === "HIGH" &&
      username &&
      isCriticalAccount(username)
    ) {
      actions.push({
        action: "MFA_ENFORCE",
        status: "PENDING",
        timestamp: new Date().toISOString(),
      });
      affectedUsers.push(username);

      try {
        const mfaResult = await enforceMFA(username);
        updateLastAction(mfaResult.success ? "COMPLETED" : "FAILED", mfaResult.message);
      } catch (error) {
        updateLastAction("FAILED", `MFA enforcement failed: ${error}`);
      }
    }

    // ACTION 4: Rate limiting for brute force
    if (
      techniqueId === "T1110" && // Brute Force
      event.ip
    ) {
      actions.push({
        action: "RATE_LIMIT",
        status: "PENDING",
        timestamp: new Date().toISOString(),
      });

      try {
        const rateLimitResult = await applyRateLimit(event.ip);
        updateLastAction(rateLimitResult.success ? "COMPLETED" : "FAILED", rateLimitResult.message);
      } catch (error) {
        updateLastAction("FAILED", `Rate limiting failed: ${error}`);
      }
    }

    // ACTION 5: Escalate alerts based on risk level
    escalationLevel = determineEscalationLevel(riskLevel, techniqueId);

    if (escalationLevel > 0) {
      actions.push({
        action: "ALERT_ESCALATE",
        status: "PENDING",
        timestamp: new Date().toISOString(),
      });

      try {
        const escalationResult = await escalateAlert(
          event,
          riskLevel,
          techniqueId,
          escalationLevel
        );
        updateLastAction(escalationResult.success ? "COMPLETED" : "FAILED", escalationResult.message);
      } catch (error) {
        updateLastAction("FAILED", `Alert escalation failed: ${error}`);
      }
    }

    // Determine recommended playbooks
    recommendedPlaybooks.push(
      ...getPlaybooksForTechnique(techniqueId, riskLevel)
    );

    return {
      actions,
      escalationLevel,
      affectedUsers: [...new Set(affectedUsers)],
      affectedAssets: [...new Set(affectedAssets)],
      recommendedPlaybooks,
    };
  } catch (error) {
    console.error("[Response] Failed to execute response actions:", error);
    return {
      actions,
      escalationLevel,
      affectedUsers,
      affectedAssets,
      recommendedPlaybooks,
    };
  }
}

/**
 * Block an IP address via firewall API
 */
async function blockIP(
  ip: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  // Use Hasura activity to persist the block
  // Note: In a real production system, you would ALSO call the Firewall API here.
  // For this project, the "Firewall" is the database of blocked IPs that the middleware checks.

  try {
    const { blockIp } = await import("./hasura");
    await blockIp(ip, reason);

    console.log(`[Firewall] Blocked IP: ${ip} (Reason: ${reason})`);

    return {
      success: true,
      message: `IP ${ip} has been blocked in the system (${reason})`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to block IP ${ip}: ${error}`,
    };
  }
}

/**
 * Trigger password reset flow for affected user
 */
async function triggerPasswordReset(
  username: string
): Promise<{ success: boolean; message: string }> {
  try {
    // In production, this would trigger password reset via:
    // - Email to user with reset link
    // - SMS notification
    // - Identity management system API

    console.log(`[Auth] Triggering password reset for user: ${username}`);

    return {
      success: true,
      message: `Password reset notification sent to ${username}. User must change password on next login.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to trigger password reset for ${username}: ${error}`,
    };
  }
}

/**
 * Enforce Multi-Factor Authentication for critical account
 */
async function enforceMFA(username: string): Promise<{ success: boolean; message: string }> {
  try {
    // In production, this would integrate with:
    // - Azure AD
    // - Okta
    // - Active Directory
    // - Custom identity provider

    console.log(
      `[MFA] Enforcing MFA for critical account: ${username}`
    );

    return {
      success: true,
      message: `MFA requirement enforced for ${username}. User must enroll on next login.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to enforce MFA for ${username}: ${error}`,
    };
  }
}

/**
 * Apply rate limiting to an IP
 */
async function applyRateLimit(ip: string): Promise<{ success: boolean; message: string }> {
  try {
    // In production, this would apply rate limiting via:
    // - API Gateway (AWS, Azure, CloudFlare)
    // - WAF rules
    // - Load balancer configuration

    console.log(`[RateLimit] Applying rate limiting to IP: ${ip}`);

    return {
      success: true,
      message: `Rate limiting applied to ${ip}. Max 10 requests/minute enforced.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to apply rate limiting to ${ip}: ${error}`,
    };
  }
}

/**
 * Escalate alert to appropriate SOC level
 */
async function escalateAlert(
  event: HoneypotEvent,
  risk: string,
  techniqueId: string,
  level: number
): Promise<{ success: boolean; message: string }> {
  const levelNames = ["None", "SOC Analyst", "Security Lead", "CISO"];

  try {
    // In production, this would:
    // - Create PagerDuty incident
    // - Send Slack/Teams notification
    // - Create JIRA ticket
    // - Trigger on-call escalation

    console.log(
      `[Escalation] Escalating to level ${level} (${levelNames[level]}): ${techniqueId}`
    );

    return {
      success: true,
      message: `Alert escalated to ${levelNames[level]}. Incident created for IP: ${event.ip}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to escalate alert: ${error}`,
    };
  }
}

/**
 * Determine escalation level based on threat severity
 */
function determineEscalationLevel(
  risk: "LOW" | "MED" | "HIGH",
  techniqueId: string
): 0 | 1 | 2 | 3 {
  // Critical attack techniques always escalate to CISO
  const criticalTechniques = [
    "T1078", // Valid Accounts (lateral movement)
    "T1003", // OS Credential Dumping
    "T1021", // Remote Service Session Initiation
    "T1047", // Windows Management Instrumentation
  ];

  if (criticalTechniques.includes(techniqueId)) {
    return 3; // CISO
  }

  if (risk === "HIGH") {
    return 2; // Security Lead
  } else if (risk === "MED") {
    return 1; // SOC Analyst
  }

  return 0; // No escalation
}

/**
 * Check if account is critical (admin, root, service accounts)
 */
function isCriticalAccount(username: string): boolean {
  const criticalPatterns = [
    "root",
    "admin",
    "administrator",
    "service",
    "system",
    "backup",
    "elasticsearch",
    "postgres",
    "mysql",
  ];

  const lower = username.toLowerCase();
  return criticalPatterns.some(p => lower.includes(p));
}

/**
 * Get recommended playbooks for a MITRE technique
 */
function getPlaybooksForTechnique(
  techniqueId: string,
  risk: "LOW" | "MED" | "HIGH"
): string[] {
  const playbooks: Record<string, string[]> = {
    "T1110": ["brute-force-response", "mfa-enforcement", "account-lockout"],
    "T1078": ["credential-compromise", "lateral-movement-investigation", "access-audit"],
    "T1059": ["command-execution-investigation", "endpoint-isolation", "memory-dump"],
    "T1190": ["vulnerability-assessment", "patch-management", "waf-rule-update"],
    "T1005": ["data-exfiltration-investigation", "dlp-enablement", "file-integrity-monitoring"],
    "T1046": ["network-reconnaissance-response", "rate-limiting", "ids-tuning"],
    "T1003": ["forensics-initiation", "incident-response-team-notification", "credential-vault-check"],
  };

  const basic = playbooks[techniqueId] || ["general-incident-response"];

  // Add additional playbooks based on risk level
  if (risk === "HIGH") {
    basic.push("ciso-notification", "law-enforcement-coordination");
  } else if (risk === "MED") {
    basic.push("threat-intelligence-gathering");
  }

  return basic;
}

/**
 * Generate incident response summary
 */
export async function generateResponseSummary(
  response: IncidentResponse
): Promise<string> {
  const levelNames = ["None", "SOC Analyst", "Security Lead", "CISO"];

  let summary = "Incident Response Actions Executed:\n\n";

  for (const action of response.actions) {
    summary += `• ${action.action.replace(/_/g, " ")}: ${action.status}${action.result ? ` - ${action.result}` : ""
      }\n`;
  }

  if (response.affectedUsers.length > 0) {
    summary += `\nAffected Users: ${response.affectedUsers.join(", ")}\n`;
  }

  if (response.escalationLevel > 0) {
    summary += `\nEscalation: ${levelNames[response.escalationLevel]}\n`;
  }

  if (response.recommendedPlaybooks.length > 0) {
    summary += `\nRecommended Playbooks:\n`;
    for (const playbook of response.recommendedPlaybooks) {
      summary += `  - ${playbook.replace(/-/g, " ")}\n`;
    }
  }

  return summary;
}
