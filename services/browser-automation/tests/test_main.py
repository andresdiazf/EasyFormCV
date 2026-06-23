import pytest
from fastapi.testclient import TestClient
from app.main import app, FIXTURE_PATH

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_detect_fixture():
    # If the sample fixture is missing, skip the test
    if not FIXTURE_PATH.exists():
        pytest.skip("sample_form.html fixture not found")

    response = client.post("/detect", json={"fixture": True})
    assert response.status_code == 200
    fields = response.json()
    assert isinstance(fields, list)
    assert len(fields) > 0

    # Verify we detect common inputs in sample_form.html
    labels = [f["label"].lower() for f in fields]
    assert any("name" in label or "nombre" in label for label in labels)
