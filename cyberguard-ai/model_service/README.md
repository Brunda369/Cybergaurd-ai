# AE+LSTM Hybrid Model Service (CPU-only)

A FastAPI microservice that serves a hybrid autoencoder + LSTM model for real-time
anomaly scoring. The service includes training (Autoencoder on benign, LSTM on labeled
sequences) and inference endpoints.

## Quick Start

### Local (virtualenv)

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Start the service (loads models if present in ./models/)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Docker (CPU)

```bash
docker build -t cyberguard-model-service:latest .
docker run -p 8000:8000 cyberguard-model-service:latest
```

## Training Models

Collect samples via the `/train_sample` endpoint (called by Temporal threads),
then run the training script:

```bash
# Train AE and LSTM models (requires >= 10 samples)
python train.py
```

Models are saved to `./models/autoencoder.h5` and `./models/lstm.h5`.

## API Endpoints

- **POST `/predict`** — Score an event
  - Input: `{ "event": { "ip": "...", "payload": {...}, ... } }`
  - Output: `{ "score": 0.7, "ae_score": 0.65, "lstm_score": 0.75, "severity": "HIGH", "reasons": [...] }`

- **POST `/train_sample`** — Persist a training sample
  - Input: `{ "event": {...}, "label": "malicious"|"benign"|"unknown", "score": 0.8, "created_at": "2026-02-12T..." }`
  - Output: `{ "ok": true }`

- **GET `/health`** — Check service status (model availability, TF loaded, etc.)

## Notes

- With TensorFlow installed, models automatically load and are used for inference.
- Without TensorFlow or without trained models, the service falls back to heuristic scoring.
- Feature extraction is identical in train.py and main.py (20 features per event).
- Training uses benign samples for AE (unsupervised), and labeled sequences for LSTM.

