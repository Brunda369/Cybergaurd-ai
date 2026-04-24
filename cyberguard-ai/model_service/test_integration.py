"""
Integration test: validate the model service endpoints and training pipeline.
Run this after starting the service and uploading training samples.
"""
import json
import requests
from pathlib import Path
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"


def test_health():
    """Check service health and model availability."""
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200
    data = r.json()
    print(f"✓ Health: {data}")
    return data


def test_predict_benign():
    """Test prediction on a benign-like event."""
    event = {
        "id": "benign-1",
        "ip": "192.168.1.100",
        "port": 443,
        "username": "admin",
        "password": "normal_password",
        "created_at": datetime.utcnow().isoformat(),
        "payload": {
            "method": "GET",
            "path": "/api/health",
            "user_agent": "Mozilla/5.0",
        },
    }
    r = requests.post(f"{BASE_URL}/predict", json={"event": event})
    assert r.status_code == 200
    data = r.json()
    print(f"✓ Predict (benign): score={data['score']}, severity={data['severity']}")
    assert data["severity"] in ["LOW", "MED", "HIGH"]
    return data


def test_predict_malicious():
    """Test prediction on a malicious-like event."""
    event = {
        "id": "malicious-1",
        "ip": "203.0.113.42",
        "port": 22,
        "username": "root",
        "password": "exploit_password",
        "created_at": datetime.utcnow().isoformat(),
        "payload": {
            "method": "SSH",
            "cmd": "rm -rf /",
            "sql_injection": "1' OR '1'='1",
            "attempts": 50,
            "user_agent": "curl/7.64.1",
        },
    }
    r = requests.post(f"{BASE_URL}/predict", json={"event": event})
    assert r.status_code == 200
    data = r.json()
    print(f"✓ Predict (malicious): score={data['score']}, severity={data['severity']}")
    assert data["severity"] in ["LOW", "MED", "HIGH"]
    return data


def test_train_sample():
    """Submit a training sample."""
    sample = {
        "event": {
            "ip": "10.0.0.1",
            "port": 80,
            "username": "user",
            "payload": {"method": "POST", "endpoint": "/login"},
            "created_at": datetime.utcnow().isoformat(),
        },
        "label": "benign",
        "score": 0.1,
        "created_at": datetime.utcnow().isoformat(),
    }
    r = requests.post(f"{BASE_URL}/train_sample", json=sample)
    assert r.status_code == 200
    data = r.json()
    print(f"✓ Train sample submitted: {data}")
    return data


def main():
    print("Running integration tests on Model Service...\n")

    # Check availability
    try:
        health = test_health()
    except Exception as e:
        print(f"✗ Service not reachable at {BASE_URL}: {e}")
        print("  Start the service with: uvicorn main:app --reload --port 8000")
        return

    # Test predictions
    test_predict_benign()
    test_predict_malicious()

    # Test sample submission
    test_train_sample()

    print("\n✓ All integration tests passed!")


if __name__ == "__main__":
    main()
