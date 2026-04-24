import "dotenv/config";
import { Worker, NativeConnection } from "@temporalio/worker";
import { threatPipeline } from "./workflows/threatPipeline";
import { modelRetrainWorkflow } from "./workflows/modelRetrainWorkflow";
import * as activities from "./activities";

async function connectWithRetry() {
  const address = process.env.TEMPORAL_ADDRESS || "temporal:7233";

  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      const conn = await NativeConnection.connect({ address });
      console.log(`✅ Connected to Temporal at ${address}`);
      return conn;
    } catch (err) {
      console.log(`⏳ Temporal not ready (attempt ${attempt}/30). Retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("❌ Temporal server not reachable after retries");
}

async function run() {
  const connection = await connectWithRetry();

  const worker = await Worker.create({
    connection,
    namespace: "default",
    workflowsPath: require.resolve("./workflows"),
    activities,
    taskQueue: "cyberguard",
  });

  console.log(" Temporal Worker running on task queue: cyberguard");
  console.log("Registered workflows: threatPipeline, modelRetrainWorkflow (loaded from workflowsPath)");
  await worker.run();
}

run().catch((err) => {
  console.error("worker failed", err);
  process.exit(1);
});
