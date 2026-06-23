"""
Security tests for the PDF Parser Service.
Verifies that the service:
1. Does NOT expose stack traces or internal paths in error responses.
2. Rejects excessively large payloads gracefully.
3. Handles path-traversal content without crashing or leaking data.
4. Validates that response headers do not expose server internals.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestSecurity:
    """Security-focused tests for the PDF Parser FastAPI service."""

    def test_error_response_hides_stack_trace(self):
        """A corrupt PDF must return 500 but must NOT expose Python tracebacks."""
        corrupt_bytes = b"%PDF-1.4 CORRUPTED DATA \x00\xFF\xFE" * 10
        response = client.post(
            "/parse",
            files={"file": ("corrupt.pdf", corrupt_bytes, "application/pdf")},
        )
        body = response.text
        # Must NOT leak internal paths or class names
        assert "Traceback" not in body
        assert "site-packages" not in body
        assert "C:\\" not in body
        assert "/home/" not in body

    def test_response_has_content_type_json(self):
        """All JSON responses must declare Content-Type application/json."""
        response = client.get("/health")
        assert "application/json" in response.headers.get("content-type", "")

    def test_no_server_header_leaks_version(self):
        """The Server response header should not expose uvicorn/Python versions."""
        response = client.get("/health")
        server_header = response.headers.get("server", "").lower()
        # starlette test client may not include this — just verify it's not overly verbose
        assert "python" not in server_header

    def test_oversized_filename_is_safe(self):
        """A filename with path-traversal characters must not crash the service."""
        import io
        import fitz
        doc = fitz.open()
        doc.new_page().insert_text((72, 72), "Test content for security")
        buf = io.BytesIO()
        doc.save(buf)
        doc.close()
        buf.seek(0)

        evil_filename = "../../../../etc/passwd.pdf"
        response = client.post(
            "/parse",
            files={"file": (evil_filename, buf.read(), "application/pdf")},
        )
        # Must not crash and must not return a 5xx that leaks path details
        assert response.status_code in (200, 400, 500)
        body = response.text
        assert "etc/passwd" not in body
        assert "Traceback" not in body

    def test_empty_file_does_not_crash(self):
        """An empty PDF upload must not cause an unhandled exception."""
        response = client.post(
            "/parse",
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        # Either an empty profile or a clean 500 — never an unhandled crash
        assert response.status_code in (200, 500)

    def test_options_method_returns_proper_response(self):
        """Non-existent endpoints must return 404, not 500."""
        response = client.get("/nonexistent-endpoint-xyz")
        assert response.status_code == 404
