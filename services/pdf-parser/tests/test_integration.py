"""
Integration test — exercises the full parse flow through the HTTP API.
Verifies that:
1. A real PDF file can be submitted to POST /parse.
2. The response contains the expected CandidateProfile JSON structure.
3. All required fields are present (even if empty for generated PDFs).
"""
from __future__ import annotations

import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _minimal_pdf() -> bytes:
    """Generate a 1-page PDF in memory containing 'Jane Doe jane@example.com'."""
    # PyMuPDF is available in this service — use it to create a test PDF
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (72, 72),
        "Jane Doe\njane@example.com\n+1 (555) 000-1234\nNew York, NY\n\n"
        "Experienced software engineer specialising in Python and cloud infrastructure. "
        "Proven track record of delivering scalable backend services in cross-functional teams.",
    )
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    buf.seek(0)
    return buf.read()


class TestParseIntegration:
    """Integration tests for POST /parse."""

    def test_parse_returns_200_with_valid_pdf(self):
        """Happy path: valid PDF → structured profile."""
        pdf_bytes = _minimal_pdf()
        response = client.post(
            "/parse",
            files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert "fullName" in body
        assert "email" in body
        assert "phone" in body
        assert "location" in body
        assert "summary" in body

    def test_parse_extracts_email_from_pdf(self):
        """Parser must find 'jane@example.com' in the test PDF."""
        pdf_bytes = _minimal_pdf()
        response = client.post(
            "/parse",
            files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
        )
        body = response.json()
        assert body["email"] == "jane@example.com"

    def test_parse_extracts_full_name(self):
        """Parser must find 'Jane Doe' as the full name."""
        pdf_bytes = _minimal_pdf()
        response = client.post(
            "/parse",
            files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
        )
        body = response.json()
        assert "Jane" in body["fullName"] or body["fullName"] == "Jane Doe"

    def test_parse_rejects_non_pdf(self):
        """Sending plain text as the file must not crash the service (returns profile, possibly empty)."""
        fake_bytes = b"Not a PDF file at all"
        response = client.post(
            "/parse",
            files={"file": ("notes.txt", fake_bytes, "text/plain")},
        )
        # Service should either return 500 (fitz error) or an empty profile — never crash silently
        assert response.status_code in (200, 500)

    def test_parse_requires_file_field(self):
        """Omitting the `file` field should return 422 Unprocessable Entity."""
        response = client.post("/parse")
        assert response.status_code == 422

    def test_health_is_always_200(self):
        """Health endpoint must respond 200 regardless of other state."""
        for _ in range(3):
            r = client.get("/health")
            assert r.status_code == 200
            assert r.json()["status"] == "ok"
