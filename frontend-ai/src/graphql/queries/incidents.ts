import { gql } from '@apollo/client';

export const GET_INCIDENTS = gql`
  query GetIncidents($limit: Int, $offset: Int) {
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
      mitre_technique
      recommendation
      technique_id
      technique_name
      created_at
    }
  }
`;

export const GET_INCIDENT_BY_ID = gql`
  query GetIncidentById($id: uuid!) {
    incidents_by_pk(id: $id) {
      id
      event_id
      ip
      risk
      summary
      mitre_technique
      recommendation
      technique_id
      technique_name
      created_at
    }
  }
`;

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


export const GET_DASHBOARD_STATS = gql`
  query DashboardStats($startOfDay: timestamptz!) {
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

    blocked: ip_blocks_aggregate {
      aggregate {
        count
      }
    }

    today_events: login_events_aggregate(
      where: { created_at: { _gte: $startOfDay } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_BLOCKED_IPS = gql`
  query GetBlockedIps($limit: Int = 10) {
    ip_blocks(limit: $limit, order_by: { created_at: desc }) {
      id
      ip
      reason
      created_at
    }
  }
`;