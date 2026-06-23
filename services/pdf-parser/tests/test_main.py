import pytest
from fastapi.testclient import TestClient
from app.main import app, parse_profile

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_parse_profile_heuristics():
    sample_text = """
    John Doe
    Software Engineer
    john.doe@example.com
    +1 (555) 019-2834
    San Francisco, CA
    
    Experienced software engineer with a track record of building reliable web applications.
    Focused on React, Node.js and cloud infrastructure.
    """
    
    profile = parse_profile(sample_text)
    assert profile.fullName == "John Doe"
    assert profile.email == "john.doe@example.com"
    assert profile.phone == "+1 (555) 019-2834"
    assert profile.location == "San Francisco, CA"
    assert "Experienced software engineer" in profile.summary


def test_parse_missing_file():
    # Sending a post without a file should return 422 Unprocessable Entity
    response = client.post("/parse")
    assert response.status_code == 422
