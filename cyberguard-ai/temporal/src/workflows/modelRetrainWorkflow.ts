
import { proxyActivities, sleep } from "@temporalio/workflow";
import { ActivityFailure, ApplicationFailure } from "@temporalio/workflow";
import type { TrainingResult } from "../activities/modelTraining";

const { runModelTraining, checkTrainingSamples } = proxyActivities<{
  runModelTraining(): Promise<TrainingResult>;
  checkTrainingSamples(): Promise<{ count: number; exists: boolean }>;
}>({
  startToCloseTimeout: "15 minutes",
  retry: {
    initialInterval: "2 seconds",
    maximumInterval: "30 seconds",
    backoffCoefficient: 2,
    maximumAttempts: 2,
  },
});

export interface ModelRetrainInput {
  intervalMinutes?: number; // Retraining interval in minutes (default: 60)
  minSamples?: number; // Minimum samples needed to trigger retrain (default: 20)
}

function explainActivityError(err: unknown): string {
  if (err instanceof ActivityFailure) {
    const cause = err.cause;
    if (cause instanceof ApplicationFailure) {
      return `ActivityFailure -> ApplicationFailure: message="${cause.message}" type="${cause.type}"`;
    }
    return `ActivityFailure: message="${err.message}" cause="${cause ? String(cause) : "none"}"`;
  }
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

/**
 * Main retrain workflow that runs periodically.
 * Can be started with `startWorkflow("modelRetrainWorkflow", {...})` or scheduled.
 */
export async function modelRetrainWorkflow(input?: ModelRetrainInput): Promise<void> {
  const intervalMinutes = input?.intervalMinutes ?? 60;
  const minSamples = input?.minSamples ?? 20;

  let iteration = 0;

  while (true) {
    iteration++;
    console.log(
      `[ModelRetrain] Iteration ${iteration}: Checking for training samples (threshold: ${minSamples})...`
    );

    // Check if we have enough samples
    let sampleCount = 0;
    try {
      const result = await checkTrainingSamples();
      sampleCount = result.count;
      console.log(`[ModelRetrain] Found ${sampleCount} training samples`);

      if (sampleCount < minSamples) {
        console.log(
          `[ModelRetrain] Skipping training: insufficient samples (${sampleCount} < ${minSamples})`
        );
      } else {
        // Run training
        console.log(`[ModelRetrain] Starting model training...`);
        try {
          const trainResult = await runModelTraining();
          console.log(
            `[ModelRetrain] Training ${trainResult.success ? "succeeded" : "failed"}: ${trainResult.message}`
          );
        } catch (err) {
          const explanation = explainActivityError(err);
          console.warn(`[ModelRetrain] Training failed (continuing): ${explanation}`);
        }
      }
    } catch (err) {
      const explanation = explainActivityError(err);
      console.warn(`[ModelRetrain] Sample check failed (continuing): ${explanation}`);
    }

    // Sleep until next iteration
    const sleepMillis = intervalMinutes * 60 * 1000;
    console.log(
      `[ModelRetrain] Sleeping for ${intervalMinutes} mins before next check (${new Date().toISOString()})...`
    );
    await sleep(sleepMillis);
  }
}
