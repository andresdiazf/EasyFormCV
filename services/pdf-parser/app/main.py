"""
PDF Parser Service
POST /parse  — extracts candidate profile fields from a PDF file upload
"""
from __future__ import annotations

import re

import fitz  # PyMuPDF
import structlog
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel

log = structlog.get_logger()

app = FastAPI(title="EasyFormCV PDF Parser", version="0.1.0")


# ── Pydantic models ──────────────────────────────────────────────────────────

class CandidateProfile(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    summary: str = ""


# ── Helpers ──────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", re.IGNORECASE)
_PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}"
)


def parse_profile(text: str) -> CandidateProfile:
    """
    Heuristic extraction — good-enough stub for a skeleton implementation.
    Lines that look like names, emails, phones and location are detected with
    simple regex rules.  The first paragraph-ish block becomes the summary.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    email = ""
    phone = ""
    full_name = ""
    location = ""
    summary_lines: list[str] = []

    for i, line in enumerate(lines):
        # Email
        if not email:
            m = _EMAIL_RE.search(line)
            if m:
                email = m.group(0)

        # Phone
        if not phone:
            m = _PHONE_RE.search(line)
            if m:
                phone = m.group(0).strip()

        # Full name heuristic: first line that has 2-4 words and no digits
        if not full_name and i < 5:
            words = line.split()
            if 2 <= len(words) <= 4 and not any(ch.isdigit() for ch in line):
                full_name = line

        # Location heuristic: line containing a comma and city-like tokens
        if not location and "," in line and not _EMAIL_RE.search(line):
            if len(line) < 80:
                location = line

        # Collect summary: longer lines after the header section
        if i > 3 and len(line) > 60:
            summary_lines.append(line)

    summary = " ".join(summary_lines[:3])  # first ~3 descriptive sentences

    return CandidateProfile(
        fullName=full_name,
        email=email,
        phone=phone,
        location=location,
        summary=summary,
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/parse", response_model=CandidateProfile)
async def parse(file: UploadFile = File(...)) -> CandidateProfile:
    log.info("parse_request", filename=file.filename)
    try:
        content = await file.read()
        doc = fitz.open(stream=content, filetype="pdf")
        pages: list[str] = []
        for page in doc:
            pages.append(page.get_text())  # type: ignore[attr-defined]
        doc.close()
        text = "\n".join(pages)
    except Exception as exc:
        log.error("pdf_read_error", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to read PDF: {exc}") from exc

    profile = parse_profile(text)
    log.info("parse_done", full_name=profile.fullName, email=profile.email)
    return profile


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
