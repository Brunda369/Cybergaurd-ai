import { gql } from '@apollo/client';

export const INSERT_LOGIN_EVENT = gql`
  mutation InsertLoginEvent($username: String!, $ip: String!, $success: Boolean!, $payload: jsonb) {
    insert_login_events_one(
      object: {
        username: $username
        ip: $ip
        success: $success
        payload: $payload
      }
    ) {
      id
      username
      ip
      success
      payload
      created_at
    }
  }
`;

export const INSERT_IP_BLOCK = gql`
  mutation InsertIpBlock($ip: String!, $reason: String!) {
    insert_ip_blocks_one(
      object: {
        ip: $ip
        reason: $reason
      }
    ) {
      id
      ip
      reason
      created_at
    }
  }
`;