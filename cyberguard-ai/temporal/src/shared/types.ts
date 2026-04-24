export type Risk = "LOW" | "MED" | "HIGH";

export type MitreCandidate = {
  technique_id: string;
  technique_name: string;
 
};


export type Enrichment = {
  risk: Risk;
  technique_id: string;
  technique_name: string;
  summary: string;
  recommendation: string;
  confidence: number;
};

export type HoneypotEvent = {
  id: string;
  ip: string;
  username: string | null;
  password: string | null;
  payload: any | null;
  created_at: string;
};

