import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { Connection, Client } from "@temporalio/client";

type HasuraInsertPayload = {
  event?: {
    data?: {
      new?: {
        id?: string;
      };
    };
  };
};

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const body: HasuraInsertPayload = event.body ? JSON.parse(event.body) : {};
    const eventId = body?.event?.data?.new?.id;

    if (!eventId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          error: "Missing event.data.new.id in Hasura payload",
          received: body,
        }),
      };
    }

    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
    });

    const client = new Client({ connection });

    const workflowId = `threat-${eventId}`;

    await client.workflow.start("threatPipeline", {
      taskQueue: "cyberguard",
      workflowId,
      args: [eventId],
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, workflowId, eventId }),
    };
  } catch (err: any) {
    console.error("Lambda error:", err);

    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: err?.message || String(err),
      }),
    };
  }
}
