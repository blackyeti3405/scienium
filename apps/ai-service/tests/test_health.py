from fastapi.testclient import TestClient
from unittest.mock import patch

# Patch settings before importing app
with patch.dict("os.environ", {
    "ANTHROPIC_API_KEY": "test",
    "VOYAGE_API_KEY": "test",
    "DATABASE_URL": "postgresql://localhost/test",
}):
    from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
