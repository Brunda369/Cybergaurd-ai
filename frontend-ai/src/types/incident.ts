import { gql } from "@apollo/client";

/**
 * Main incidents list
 */
export const GET_INCIDENTS = gql`
  query GetIncidents($limit: Int!, $offset: Int!) {
    incidents(
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id
      event_id
      ip
      risk
      summary
      recommendation
      technique_id
      technique_name
      mitre_technique
      created_at
    }
  }
`;

/**
 * Single incident (modal / deep view)
 */
export const GET_INCIDENT_BY_ID = gql`
  query GetIncidentById($id: uuid!) {
    incidents_by_pk(id: $id) {
      id
      event_id
      ip
      risk
      summary
      recommendation
      technique_id
      technique_name
      mitre_technique
      created_at
    }
  }
`;

/**
 * Recent honeypot / login events
 */
export const GET_RECENT_EVENTS = gql`
  query GetRecentEvents($limit: Int = 10) {
    login_events(
      limit: $limit
      order_by: { created_at: desc }
    ) {
      id
      username
      ip
      success
      created_at
    }
  }
`;

/**
 * Dashboard stats
 */
export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    total: incidents_aggregate {
      aggregate {
        count
      }
    }

    high_risk: incidents_aggregate(
      where: { risk: { _in: ["HIGH", "CRITICAL"] } }
    ) {
      aggregate {
        count
      }
    }

    ip_blocks_aggregate {
      aggregate {
        count
      }
    }

    login_events_aggregate(
      where: { created_at: { _gte: "now() - interval '1 day'" } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Blocked IPs
 */
export const GET_BLOCKED_IPS = gql`
  query GetBlockedIps {
    ip_blocks(order_by: { created_at: desc }) {
      id
      ip
      reason
      created_at
    }
  }
`;
