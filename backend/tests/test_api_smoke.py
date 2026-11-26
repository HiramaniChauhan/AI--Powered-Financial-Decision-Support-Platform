from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["health"] == "/api/v1/health"


def test_validation_rejects_invalid_trade():
    response = client.post(
        "/api/v1/portfolio/trade",
        json={"ticker": "AAPL", "action": "INVALID", "quantity": 1, "price": 100},
    )
    assert response.status_code == 422


def test_validation_rejects_zero_quantity():
    response = client.post(
        "/api/v1/portfolio/trade",
        json={"ticker": "AAPL", "action": "BUY", "quantity": 0, "price": 100},
    )
    assert response.status_code == 422
