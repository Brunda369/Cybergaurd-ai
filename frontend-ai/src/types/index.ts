export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface LoginEvent {
  id: string;
  username: string;
  ip: string;
  success: boolean;
  created_at: string;
}

export interface Incident {
  id: string;
  event_id: string;
  ip: string;
  risk: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
  summary: string;
  mitre_technique: string;
  technique_id?: string;
  technique_name?: string;
  recommendation?: string;
  created_at: string;
}

export interface IpBlock {
  id: string;
  ip: string;
  reason: string;
  created_at: string;
}

export interface HoneypotEvent {
  id: string;
  ip: string;
  username?: string;
  password?: string;
  payload: any;
  created_at: string;
}

export interface DashboardStats {
  totalIncidents: number;
  activeThreats: number;
  blockedIps: number;
  eventsToday: number;
}