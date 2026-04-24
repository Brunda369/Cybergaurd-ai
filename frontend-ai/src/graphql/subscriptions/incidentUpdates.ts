import { gql } from '@apollo/client';

export const SUBSCRIBE_TO_INCIDENTS = gql`
  subscription SubscribeToIncidents {
    incidents(
      order_by: { created_at: desc }
      limit: 50
    ) {
      id
      ip
      risk
      summary
      mitre_technique
      created_at
      resolved
      event_id
    }
  }
`;

export const SUBSCRIBE_TO_NEW_EVENTS = gql`
  subscription SubscribeToNewEvents {
    login_events(
      order_by: { created_at: desc }
      limit: 20
    ) {
      id
      username
      ip
      success
      created_at
    }
  }
`;