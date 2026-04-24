"""
TensorFlow AE+LSTM Hybrid Training Pipeline

This script trains an autoencoder for feature reconstruction scoring and
an LSTM for temporal anomaly detection. Models are saved to ./models/ dir.
"""
import json
import numpy as np
from pathlib import Path
from typing import Tuple, List, Dict, Any
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


SAMPLES_FILE = Path.cwd() / "model_samples.jsonl"
MODELS_DIR = Path.cwd() / "models"
MODELS_DIR.mkdir(exist_ok=True)


def load_samples() -> List[Dict[str, Any]]:
    """Load training samples from JSONL file."""
    samples = []
    if not SAMPLES_FILE.exists():
        return samples
    with SAMPLES_FILE.open(encoding="utf8") as fh:
        for line in fh:
            try:
                samples.append(json.loads(line))
            except Exception:
                pass
    return samples


def extract_features(event: Dict[str, Any]) -> np.ndarray:
    """
    Extract a fixed-size feature vector from a honeypot event.
    Returns a 1D array of shape (20,).
    """
    payload = event.get("payload") or {}
    source_ip = event.get("ip") or ""
    port = event.get("port") or 0
    username = event.get("username") or ""
    password = event.get("password") or ""

    features = []

    # IP address numerical encoding (first octet)
    try:
        first_octet = float(source_ip.split(".")[0]) if source_ip else 0.0
        features.append(first_octet / 255.0)
    except Exception:
        features.append(0.0)

    # Port
    features.append(float(port) / 65535.0 if port else 0.0)

    # Payload size (normalized to kb)
    payload_size = len(json.dumps(payload)) / 1024.0
    features.append(min(1.0, payload_size / 10.0))

    # Username length
    features.append(min(1.0, len(username) / 50.0))

    # Password length
    features.append(min(1.0, len(password) / 50.0))

    # Suspicious keyword count in payload
    suspicious = sum(
        1
        for k in payload.keys()
        if any(t in k.lower() for t in ["cmd", "exec", "sql", "pass", "data"])
    )
    features.append(float(suspicious) / 10.0)

    # Login attempts
    attempts = int(payload.get("attempts") or payload.get("login_attempts") or 0)
    features.append(float(min(attempts, 100)) / 100.0)

    # Off-hours indicator
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

    # Repeat for payload_dict entropy (simple count of keys)
    features.append(float(len(payload)) / 20.0)

    # User agent presence
    ua = str(payload.get("user_agent") or "").lower()
    features.append(1.0 if ua else 0.0)

    # Curl-like patterns
    features.append(1.0 if "curl" in ua else 0.0)

    # SQL pattern
    features.append(1.0 if any("sql" in str(v).lower() for v in payload.values()) else 0.0)

    # Command injection pattern
    features.append(1.0 if any("cmd" in str(v).lower() for v in payload.values()) else 0.0)

    # Pad to fixed size (20 features)
    while len(features) < 20:
        features.append(0.0)

    return np.array(features[:20], dtype=np.float32)


def build_autoencoder(input_dim: int = 20) -> keras.Model:
    """Build a simple autoencoder for feature reconstruction."""
    inputs = keras.Input(shape=(input_dim,))
    encoded = layers.Dense(12, activation="relu")(inputs)
    encoded = layers.Dense(8, activation="relu")(encoded)
    decoded = layers.Dense(12, activation="relu")(encoded)
    outputs = layers.Dense(input_dim, activation="sigmoid")(decoded)
    model = keras.Model(inputs, outputs, name="autoencoder")
    return model


def build_lstm(sequence_len: int = 10, input_dim: int = 20) -> keras.Model:
    """Build LSTM for temporal sequence anomaly detection."""
    inputs = keras.Input(shape=(sequence_len, input_dim))
    lstm_out = layers.LSTM(16, activation="relu")(inputs)
    dense = layers.Dense(8, activation="relu")(lstm_out)
    outputs = layers.Dense(1, activation="sigmoid")(dense)
    model = keras.Model(inputs, outputs, name="lstm")
    return model


def train_autoencoder(
    X_train: np.ndarray, epochs: int = 50, batch_size: int = 32
) -> Tuple[keras.Model, Dict[str, Any]]:
    """Train autoencoder on normal (benign) samples."""
    ae = build_autoencoder(input_dim=X_train.shape[1])
    ae.compile(optimizer="adam", loss="mse")

    print(f"[AE] Training on {X_train.shape[0]} samples...")
    history = ae.fit(
        X_train,
        X_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.1,
        verbose=1,
    )

    ae.save(str(MODELS_DIR / "autoencoder.h5"))
    print(f"[AE] Model saved to {MODELS_DIR / 'autoencoder.h5'}")

    return ae, history.history


def train_lstm(
    X_sequences: np.ndarray, y_labels: np.ndarray, epochs: int = 50, batch_size: int = 32
) -> Tuple[keras.Model, Dict[str, Any]]:
    """Train LSTM on labeled sequences."""
    if len(X_sequences) == 0:
        print("[LSTM] No sequences to train; skipping.")
        return None, {}

    lstm = build_lstm(sequence_len=X_sequences.shape[1], input_dim=X_sequences.shape[2])
    lstm.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])

    print(f"[LSTM] Training on {X_sequences.shape[0]} sequences...")
    history = lstm.fit(
        X_sequences,
        y_labels,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.1,
        verbose=1,
    )

    lstm.save(str(MODELS_DIR / "lstm.h5"))
    print(f"[LSTM] Model saved to {MODELS_DIR / 'lstm.h5'}")

    return lstm, history.history


def main():
    samples = load_samples()
    print(f"Loaded {len(samples)} training samples.")

    if len(samples) < 10:
        print(
            "Insufficient samples (<10). Use the model service's /train_sample endpoint to collect data. Exiting."
        )
        return

    # Extract features and labels
    features_list = []
    labels = []
    for sample in samples:
        try:
            event = sample.get("event") or {}
            label = sample.get("label", "unknown")
            features = extract_features(event)
            features_list.append(features)
            labels.append(1.0 if label == "malicious" else 0.0)
        except Exception as e:
            print(f"[Warn] Skipped sample: {e}")
            continue

    if len(features_list) < 10:
        print("Insufficient valid samples after extraction. Exiting.")
        return

    X = np.array(features_list, dtype=np.float32)
    y = np.array(labels, dtype=np.float32)

    print(f"\nDataset shape: {X.shape}, Labels shape: {y.shape}")
    print(f"Benign samples: {(y == 0).sum()}, Malicious samples: {(y == 1).sum()}")

    # Train Autoencoder on benign samples (unsupervised)
    benign_mask = y == 0
    if benign_mask.sum() > 5:
        X_benign = X[benign_mask]
        ae, ae_hist = train_autoencoder(X_benign, epochs=50, batch_size=16)
    else:
        print("[AE] Not enough benign samples; training on all data.")
        ae, ae_hist = train_autoencoder(X, epochs=50, batch_size=16)

    # Build sequences for LSTM (windows of 10 consecutive samples)
    sequence_length = 10
    sequences = []
    sequence_labels = []
    for i in range(len(X) - sequence_length):
        sequences.append(X[i : i + sequence_length])
        # Label sequence as malicious if any sample in it is malicious
        sequence_labels.append(1.0 if y[i : i + sequence_length].max() > 0.5 else 0.0)

    if len(sequences) > 5:
        X_seq = np.array(sequences, dtype=np.float32)
        y_seq = np.array(sequence_labels, dtype=np.float32)
        lstm, lstm_hist = train_lstm(X_seq, y_seq, epochs=50, batch_size=16)
    else:
        print("[LSTM] Not enough sequences; skipping LSTM training.")

    print("\n[Training] Complete! Models saved to", MODELS_DIR)


if __name__ == "__main__":
    main()
