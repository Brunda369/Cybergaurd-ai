from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import numpy as np
import json
import os
from pathlib import Path

# Try to import TensorFlow; if not available, use heuristics
try:
    import tensorflow as tf
    from tensorflow import keras
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

app = FastAPI(title="AE+LSTM Hybrid Scoring Service (CPU-only)")

MODELS_DIR = Path(__file__).parent / "models"
AE_MODEL = None
LSTM_MODEL = None


def load_models():
    """Load saved TensorFlow models if available."""
    global AE_MODEL, LSTM_MODEL
    if not TF_AVAILABLE:
        return
    ae_path = MODELS_DIR / "autoencoder.h5"
    lstm_path = MODELS_DIR / "lstm.h5"
    try:
        if ae_path.exists():
            AE_MODEL = keras.models.load_model(str(ae_path))
            print(f"Loaded autoencoder from {ae_path}")
    except Exception as e:
        print(f"Could not load AE model: {e}")
    try:
        if lstm_path.exists():
            LSTM_MODEL = keras.models.load_model(str(lstm_path))
            print(f"Loaded LSTM from {lstm_path}")
    except Exception as e:
        print(f"Could not load LSTM model: {e}")


class HoneypotEventModel(BaseModel):
    event: Dict[str, Any]


def clamp01(v: float) -> float:
    return float(max(0.0, min(1.0, v)))


def extract_features(event: Dict[str, Any]) -> np.ndarray:
    """Extract 20-dimensional feature vector from event (matches train.py)."""
    payload = event.get("payload") or {}
    source_ip = event.get("ip") or ""
    port = event.get("port") or 0
    username = event.get("username") or ""
    password = event.get("password") or ""

    features = []
    try:
        first_octet = float(source_ip.split(".")[0]) if source_ip else 0.0
        features.append(first_octet / 255.0)
    except Exception:
        features.append(0.0)

    features.append(float(port) / 65535.0 if port else 0.0)
    payload_size = len(json.dumps(payload)) / 1024.0
    features.append(min(1.0, payload_size / 10.0))
    features.append(min(1.0, len(username) / 50.0))
    features.append(min(1.0, len(password) / 50.0))

    suspicious = sum(
        1
        for k in payload.keys()
        if any(t in k.lower() for t in ["cmd", "exec", "sql", "pass", "data"])
    )
    features.append(float(suspicious) / 10.0)

    attempts = int(payload.get("attempts") or payload.get("login_attempts") or 0)
    features.append(float(min(attempts, 100)) / 100.0)

    try:
        from datetime import datetime

        created = event.get("created_at")
        if created:
            dt = datetime.fromisoformat(created)
            hour = dt.hour
        else:
            hour = datetime.utcnow().hour
        off_hours = 1.0 if (hour >= 22 or hour <= 6) else 0.0
        features.append(off_hours)
    except Exception:
        features.append(0.0)

    features.append(float(len(payload)) / 20.0)
    ua = str(payload.get("user_agent") or "").lower()
    features.append(1.0 if ua else 0.0)
    features.append(1.0 if "curl" in ua else 0.0)
    features.append(1.0 if any("sql" in str(v).lower() for v in payload.values()) else 0.0)
    features.append(1.0 if any("cmd" in str(v).lower() for v in payload.values()) else 0.0)

    while len(features) < 20:
        features.append(0.0)

    return np.array(features[:20], dtype=np.float32)


def compute_ae_score_nn(features: np.ndarray) -> float:
    """Compute AE reconstruction error using TensorFlow model."""
    global AE_MODEL
    if AE_MODEL is None:
        return compute_ae_score_heuristic(features)
    try:
        X = np.expand_dims(features, axis=0)
        reconstruction = AE_MODEL.predict(X, verbose=0)
        mse = np.mean((X - reconstruction) ** 2)
        return float(clamp01(mse))
    except Exception:
        return compute_ae_score_heuristic(features)


def compute_lstm_score_nn(features: np.ndarray, history: List[np.ndarray] = None) -> float:
    """Compute LSTM temporal score using TensorFlow model."""
    global LSTM_MODEL
    if LSTM_MODEL is None or history is None or len(history) < 10:
        return compute_lstm_score_heuristic(features)
    try:
        X_seq = np.array(history[-10:], dtype=np.float32)
        X_seq = np.expand_dims(X_seq, axis=0)
        score = LSTM_MODEL.predict(X_seq, verbose=0)[0][0]
        return float(clamp01(score))
    except Exception:
        return compute_lstm_score_heuristic(features)


def compute_ae_score_heuristic(features: np.ndarray) -> float:
    """Fallback heuristic when no AE model is available."""
    # Large payloads, suspicious keywords -> higher error
    if features is None or len(features) == 0:
        return 0.1
    payload_size_norm = features[2] if len(features) > 2 else 0.0
    suspicious_count = features[5] if len(features) > 5 else 0.0
    score = clamp01(0.1 + payload_size_norm * 0.4 + suspicious_count * 0.15)
    return score


def compute_lstm_score_heuristic(features: np.ndarray) -> float:
    """Fallback heuristic when no LSTM model is available."""
    if features is None or len(features) == 0:
        return 0.05
    attempts = features[7] if len(features) > 7 else 0.0
    off_hours = features[8] if len(features) > 8 else 0.0
    curl_like = features[10] if len(features) > 10 else 0.0
    score = clamp01(0.05 + attempts * 0.3 + off_hours * 0.15 + curl_like * 0.08)
    return score


@app.on_event("startup")
async def startup_event():
    load_models()


@app.post("/predict")
async def predict(body: HoneypotEventModel):
    event = body.event
    try:
        features = extract_features(event)
        ae = compute_ae_score_nn(features)
        lstm = compute_lstm_score_nn(features)
        combined = clamp01(ae * 0.6 + lstm * 0.4)

        reasons: List[str] = []
        if ae > 0.4:
            reasons.append("Feature reconstruction elevated (AE)")
        if lstm > 0.35:
            reasons.append("Temporal anomaly (LSTM)")
        if not reasons:
            reasons.append("No strong anomaly signals detected")

        severity = "HIGH" if combined > 0.7 else ("MED" if combined > 0.45 else "LOW")

        return {
            "score": round(combined, 3),
            "ae_score": round(ae, 3),
            "lstm_score": round(lstm, 3),
            "severity": severity,
            "reasons": reasons,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


SAMPLES_FILE = os.path.join(os.getcwd(), "model_samples.jsonl")


@app.post("/train_sample")
async def train_sample(body: Dict[str, Any]):
    # Accept a training sample and append to local file for later training
    try:
        with open(SAMPLES_FILE, "a", encoding="utf8") as fh:
            fh.write(json.dumps(body) + "\n")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "has_ae_model": AE_MODEL is not None,
        "has_lstm_model": LSTM_MODEL is not None,
        "tf_available": TF_AVAILABLE,
    }
