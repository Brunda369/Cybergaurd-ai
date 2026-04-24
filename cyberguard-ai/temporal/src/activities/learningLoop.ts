import fs from "fs";
import path from "path";
import { promisify } from "util";
import type { HoneypotEvent } from "../shared/types";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);

export type TrainingSample = {
  event: HoneypotEvent;
  label?: "benign" | "malicious" | "unknown";
  score?: number;
  created_at: string;
};

const DATA_DIR = path.resolve(process.cwd(), "temporal_data");
const SAMPLES_FILE = path.join(DATA_DIR, "training_samples.jsonl");

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

export async function persistTrainingSample(sample: TrainingSample): Promise<void> {
  await ensureDataDir();
  const line = JSON.stringify(sample) + "\n";
  await appendFile(SAMPLES_FILE, line, { encoding: "utf8" });
}

export async function retrainModel(options?: { epochs?: number; force?: boolean }): Promise<{ ok: boolean; message: string }> {
  // Placeholder retrain: in production this would trigger a training job
  await ensureDataDir();
  const exists = fs.existsSync(SAMPLES_FILE);
  if (!exists) {
    return { ok: false, message: "no training samples available" };
  }
  // For now, read sample count and return a fake training result
  const content = fs.readFileSync(SAMPLES_FILE, "utf8").trim();
  const count = content ? content.split("\n").length : 0;

  // Simulate training time briefly (non-blocking)
  // In real implementation, dispatch to a Python/TF training service or spawn a job
  return { ok: true, message: `trained on ${count} samples (simulated)` };
}
