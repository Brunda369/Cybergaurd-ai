// temporal/src/activities/hasura.ts

import { ApolloClient, InMemoryCache, HttpLink, gql } from "@apollo/client/core";
import fetch from "cross-fetch";

export type Risk = "LOW" | "MED" | "HIGH";

export type HoneypotEvent = {
  id: string;
  ip: string | null;
  username: string | null;
  password: string | null;
  payload: any;
  created_at: string;
};

type CreateIncidentInput = {
  eventId: string;
  ip: string | null;
  risk: Risk;
  summary: string;
  technique_id: string;
  technique_name: string;
  recommendation: string;
};

type CreateIncidentMutationData = {
  insert_incidents_one: {
    id: string;
    risk: string;
    ip: string | null;
    technique_id: string | null;
    technique_name: string | null;
    mitre_technique: string | null;
  } | null;
};

type BlockIpMutationData = {
  insert_ip_blocks_one: {
    id: string;
    ip: string;
    reason: string;
    created_at: string;
  } | null;
};


function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}


const client = new ApolloClient({
  link: new HttpLink({
    uri: mustEnv("HASURA_URL"),
    fetch,
    headers: {
      "x-hasura-admin-secret": mustEnv("HASURA_ADMIN_SECRET"),
    },
  }),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: { fetchPolicy: "no-cache" },
    mutate: { fetchPolicy: "no-cache" },
  },
});


const GET_HONEYPOT_EVENT = gql`
  query GetHoneypotEvent($id: uuid!) {
    honeypot_events_by_pk(id: $id) {
      id
      ip
      username
      password
      payload
      created_at
    }
  }
`;

const CREATE_INCIDENT = gql`
  mutation CreateIncident(
    $event_id: uuid!
    $ip: String
    $risk: String!
    $summary: String!
    $mitre_technique: String!
    $technique_id: String
    $technique_name: String
    $recommendation: String!
  ) {
    insert_incidents_one(
      object: {
        event_id: $event_id
        ip: $ip
        risk: $risk
        summary: $summary
        mitre_technique: $mitre_technique
        technique_id: $technique_id
        technique_name: $technique_name
        recommendation: $recommendation
      }
    ) {
      id
      risk
      ip
      technique_id
      technique_name
      mitre_technique
    }
  }
`;


function normalizeIp(ip?: string | null): string | null {
  if (!ip) return null;
  const s = ip.trim().toLowerCase();
  if (!s) return null;

  if (["unknown", "null", "none", "na", "n/a"].includes(s)) return null;

  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

  return ipv4.test(s) ? s : null;
}

/* Activities */

export async function getHoneypotEvent(eventId: string): Promise<HoneypotEvent> {
  const { data } = await client.query<{ honeypot_events_by_pk: HoneypotEvent | null }>({
    query: GET_HONEYPOT_EVENT,
    variables: { id: eventId },
  });

  if (!data?.honeypot_events_by_pk) {
    throw new Error(`No honeypot_events row found for id=${eventId}`);
  }

  return data.honeypot_events_by_pk;
}

export async function createIncident(input: CreateIncidentInput): Promise<{ id: string }> {
  const ip = normalizeIp(input.ip);

  const variables = {
    event_id: input.eventId,
    ip,
    risk: input.risk,
    summary: input.summary,
    technique_id: input.technique_id,
    technique_name: input.technique_name,
    mitre_technique: `${input.technique_id} - ${input.technique_name}`,
    recommendation: input.recommendation,
  };

  const result = await client.mutate<CreateIncidentMutationData>({
    mutation: CREATE_INCIDENT,
    variables,
  });

  const row = result.data?.insert_incidents_one;
  if (!row) {
    throw new Error("Failed to insert incident (insert_incidents_one was null)");
  }

  return { id: row.id };
}

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

export async function blockIp(ip: string, reason: string): Promise<{ id: string }> {
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp) {
    throw new Error(`Invalid IP address: ${ip}`);
  }

  const result = await client.mutate<BlockIpMutationData>({
    mutation: BLOCK_IP,
    variables: { ip: normalizedIp, reason },
  });

  const row = result.data?.insert_ip_blocks_one;
  if (!row) {
    throw new Error("Failed to block IP (insert_ip_blocks_one was null)");
  }

  return { id: row.id };
}
