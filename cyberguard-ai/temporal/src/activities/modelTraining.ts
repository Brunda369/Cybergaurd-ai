/**
 * Model Training Activity
 *
 * This activity executes the model training pipeline (train.py) in the model_service
 * directory. It's designed to be called periodically by the modelRetrainWorkflow.
 */
import { spawn, ChildProcess } from "child_process";
import { resolve } from "path";

export interface TrainingResult {
  success: boolean;
  message: string;
  duration_ms: number;
  timestamp: string;
}

/**
 * Execute the TensorFlow training script asynchronously.
 * Expects train.py to be in MODEL_SERVICE_DIR.
 */
export async function runModelTraining(): Promise<TrainingResult> {
  const startTime = Date.now();
  const modelServiceDir = process.env.MODEL_SERVICE_DIR || "/app/model_service";
  const scriptPath = resolve(modelServiceDir, "train.py");

  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    const globalProcess = global.process;

    const child: ChildProcess = spawn("python", [scriptPath], {
      cwd: modelServiceDir,
      env: { ...globalProcess.env, PYTHONUNBUFFERED: "1" } as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code: number | null) => {
      const duration = Date.now() - startTime;
      const success = code === 0;

      const message =
        code === 0
          ? `Training completed successfully in ${duration}ms. Output: ${stdout.slice(0, 200)}`
          : `Training failed with exit code ${code}. Error: ${stderr.slice(0, 200)}`;

      console.log(
        `[ModelTraining] ${message} (full stdout: ${stdout.length} bytes, stderr: ${stderr.length} bytes)`
      );

      resolvePromise({
        success,
        message,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      });
    });

    child.on("error", (err: Error) => {
      const duration = Date.now() - startTime;
      console.error(`[ModelTraining] Error spawning train.py:`, err);
      resolvePromise({
        success: false,
        message: `Error spawning process: ${err.message}`,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      });
    });

    // Set a timeout (e.g., 10 minutes) to prevent hanging
    setTimeout(() => {
      console.warn("[ModelTraining] Training timeout (10 min); killing process");
      child.kill();
      resolvePromise({
        success: false,
        message: "Training timed out after 10 minutes",
        duration_ms: 600000,
        timestamp: new Date().toISOString(),
      });
    }, 10 * 60 * 1000);
  });
}

/**
 * Helper: Check if training samples exist and return count.
 */
export async function checkTrainingSamples(): Promise<{ count: number; exists: boolean }> {
  try {
    const fs = await import("fs").then((m) => m.promises);
    const path = require("path");
    const modelServiceDir = process.env.MODEL_SERVICE_DIR || "/app/model_service";
    const samplesFile = path.join(modelServiceDir, "model_samples.jsonl");

    try {
      const content = await fs.readFile(samplesFile, "utf-8");
      const count = content.trim().split("\n").filter((l: string) => l.length > 0).length;
      return { count, exists: true };
    } catch {
      return { count: 0, exists: false };
    }
  } catch {
    return { count: 0, exists: false };
  }
}
