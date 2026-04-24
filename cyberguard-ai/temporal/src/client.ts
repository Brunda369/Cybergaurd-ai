import {Client,Connection} from "@temporalio/client";
import {threatPipeline} from "./workflows/threatPipeline";
import { modelRetrainWorkflow } from "./workflows/modelRetrainWorkflow";

async function main(){
    const connection = await Connection.connect({address: "temporal:7233"});
    const client = new Client({connection});

    const workflowType = process.argv[2] || "threat";
    
    if (workflowType === "retrain" || workflowType === "train") {
      // Start modelRetrainWorkflow
      const intervalMinutes = parseInt(process.argv[3] || "60", 10);
      const minSamples = parseInt(process.argv[4] || "20", 10);

      console.log(`Starting modelRetrainWorkflow with:
        - Interval: ${intervalMinutes} minutes
        - Min samples: ${minSamples}`);

      const handle = await client.workflow.start(modelRetrainWorkflow, {
        args: [{ intervalMinutes, minSamples }],
        taskQueue: "cyberguard",
        workflowId: `model-retrain-${Date.now()}`,
      });

      console.log(`✓ Retrain workflow started. ID: ${handle.workflowId}`);
    } else {
      // Start threatPipeline (default)
      const eventId = process.argv[3] || "evt-123";

      console.log(`Starting threatPipeline for event: ${eventId}`);

      const handle = await client.workflow.start(threatPipeline, {
        args: [eventId],
        taskQueue: "cyberguard",
        workflowId: `threatPipeline-${eventId}`,
      });

      console.log(`✓ Threat pipeline started. RunId: ${handle.firstExecutionRunId}`);
    }

    await connection.close();
}

main().catch(console.error);