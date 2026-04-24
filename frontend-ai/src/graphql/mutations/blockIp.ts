import { gql } from "@apollo/client";

export const BLOCK_IP = gql`
  mutation BlockIp($ip: String!, $reason: String!) {
    insert_ip_blocks_one(
      object: { ip: $ip, reason: $reason }
      on_conflict: { constraint: ip_blocks_ip_key, update_columns: [reason] }
    ) {
      id
      ip
      reason
      created_at
    }
  }
`;
