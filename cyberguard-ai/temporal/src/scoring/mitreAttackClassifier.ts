import type { HoneypotEvent } from "../shared/types";

export type MitreVerdict = {
  technique_id: string;
  technique_name: string;
  risk: "LOW" | "MED" | "HIGH";
  reasons: string[];
};


function str(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function hasAny(hay: string, needles: string[]) {
  const s = hay.toLowerCase();
  return needles.some((n) => s.includes(n.toLowerCase()));
}

function pick(...vals: any[]) {
  for (const v of vals) {
    const x = str(v).trim();
    if (x) return x;
  }
  return "";
}


export function classifyMitre(event: HoneypotEvent): MitreVerdict {
  const reasons: string[] = [];

  const username = (event.username ?? "").trim();
  const password = (event.password ?? "").trim();

  const payloadText = str(event.payload);

  const endpoint = pick(event.payload?.endpoint, event.payload?.path, event.payload?.url);
  const method = pick(event.payload?.method, event.payload?.http_method);
  const ua = pick(event.payload?.user_agent, event.payload?.ua, event.payload?.headers?.["user-agent"]);

  const attemptsRaw = event.payload?.attempts ?? event.payload?.failed_attempts ?? event.payload?.tries ?? 0;
  const attempts = Number(attemptsRaw || 0);

  const cmdLike = [
    event.payload?.cmd,
    event.payload?.command,
    event.payload?.action,
    event.payload?.params,
    event.payload?.body,
    event.payload?.data,
    event.payload?.input,
    payloadText,
  ]
    .map(str)
    .join(" ");

  if (
    hasAny(cmdLike, [
      "cat /etc/passwd",
      "whoami",
      "uname -a",
      "id",
      "curl ",
      "wget ",
      "nc ",
      "netcat",
      "bash -c",
      "sh -c",
      "powershell",
      "cmd.exe",
      "rm -rf",
      "chmod ",
      "chown ",
      ";",
      "&&",
      "|",
      "`",
      "$(",
    ])
  ) {
    reasons.push("Command execution / shell operator patterns detected in payload");
    if (endpoint) reasons.push(`endpoint=${endpoint}`);
    if (method) reasons.push(`method=${method}`);

    return {
      technique_id: "T1059",
      technique_name: "Command and Scripting Interpreter",
      risk: "HIGH",
      reasons,
    };
  }

  const queryLike = [
    event.payload?.query,
    event.payload?.sql,
    event.payload?.search,
    event.payload?.filter,
    payloadText,
  ]
    .map(str)
    .join(" ");

  if (
    hasAny(queryLike, [
      "' or '1'='1",
      "\" or \"1\"=\"1",
      "union select",
      "information_schema",
      "sleep(",
      "benchmark(",
      "drop table",
      "--",
      "/*",
      "*/",
    ])
  ) {
    reasons.push("SQL injection patterns detected in payload/query");
    if (endpoint) reasons.push(`endpoint=${endpoint}`);

    return {
      technique_id: "T1190",
      technique_name: "Exploit Public-Facing Application",
      risk: "HIGH",
      reasons,
    };
  }

  if (
    hasAny(payloadText, [
      "../",
      "..\\",
      "/etc/passwd",
      "/proc/self/environ",
      "boot.ini",
      "windows\\system32",
      "win.ini",
      "/var/www",
    ])
  ) {
    reasons.push("Path traversal / sensitive file access indicators found");
    if (endpoint) reasons.push(`endpoint=${endpoint}`);

    return {
      technique_id: "T1005",
      technique_name: "Data from Local System",
      risk: "HIGH",
      reasons,
    };
  }


  if (
    hasAny(payloadText, [
      "mimikatz",
      "sekurlsa",
      "lsass",
      "procdump",
      "sam dump",
      "ntds.dit",
      "shadow copy",
      "reg save hk",
      "/etc/shadow",
      "passwd -s",
    ])
  ) {
    reasons.push("Credential dumping / password store access indicators detected");
    return {
      technique_id: "T1003",
      technique_name: "OS Credential Dumping",
      risk: "HIGH",
      reasons,
    };
  }


  const reconLike = `${payloadText} ${ua}`;
  if (
    hasAny(reconLike, [
      "nmap",
      "masscan",
      "zmap",
      "dirbuster",
      "gobuster",
      "ffuf",
      "nikto",
      "wpscan",
      "sqlmap",
      "python-requests",
      "curl/",
      "acunetix",
      "burpsuite",
    ])
  ) {
    reasons.push("Recon / scanning tool fingerprints detected (payload/user-agent)");
    if (ua) reasons.push(`ua=${ua}`);

    return {
      technique_id: "T1046",
      technique_name: "Network Service Discovery",
      risk: "MED",
      reasons,
    };
  }


  if (attempts >= 5) {
    reasons.push(`Multiple failed attempts detected: attempts=${attempts}`);
    if (username) reasons.push(`username=${username}`);

    return {
      technique_id: "T1110",
      technique_name: "Brute Force",
      risk: "HIGH",
      reasons,
    };
  }

  if (password.length > 0) {
    reasons.push("Password supplied during authentication attempt");
    if (username) reasons.push(`username=${username}`);

    return {
      technique_id: "T1110",
      technique_name: "Brute Force",
      risk: "MED",
      reasons,
    };
  }


  if (username && !password) {
    reasons.push("Authentication attempt with username but no password (token/session style)");
    if (endpoint) reasons.push(`endpoint=${endpoint}`);
    if (method) reasons.push(`method=${method}`);

    return {
      technique_id: "T1078",
      technique_name: "Valid Accounts",
      risk: "LOW",
      reasons,
    };
  }


  reasons.push("Insufficient indicators; defaulting to low-risk auth-related activity");
  return {
    technique_id: "Unable to identify",
    technique_name: "Unable to identify",
    risk: "LOW",
    reasons,
  };
}
