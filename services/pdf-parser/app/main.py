"""
EasyFormCV PDF Parser Microservice
Extracts candidate profile fields from PDF file uploads.
"""
from __future__ import annotations

import re

import fitz
import structlog
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

log = structlog.get_logger()

app = FastAPI(title="EasyFormCV PDF Parser", version="0.1.0", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    log.error("unhandled_error", error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


class CandidateProfile(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    summary: str = ""


_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", re.IGNORECASE)
_PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}"
)


def parse_profile(text: str) -> CandidateProfile:
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    email = ""
    phone = ""
    full_name = ""
    location = ""
    summary_lines: list[str] = []

    for i, line in enumerate(lines):
        if not email:
            m = _EMAIL_RE.search(line)
            if m:
                email = m.group(0)

        if not phone:
            m = _PHONE_RE.search(line)
            if m:
                phone = m.group(0).strip()

        if not full_name and i < 5:
            words = line.split()
            if 2 <= len(words) <= 4 and not any(ch.isdigit() for ch in line):
                full_name = line

        if not location and "," in line and not _EMAIL_RE.search(line):
            if len(line) < 80:
                location = line

        if i > 3 and len(line) > 60:
            summary_lines.append(line)

    summary = " ".join(summary_lines[:3])

    return CandidateProfile(
        fullName=full_name,
        email=email,
        phone=phone,
        location=location,
        summary=summary,
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/parse", response_model=CandidateProfile)
async def parse(file: UploadFile = File(...)) -> CandidateProfile:
    log.info("parse_request", filename=file.filename)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    try:
        content = await file.read()
    except Exception as exc:
        log.error("file_read_error", error=str(exc))
        raise HTTPException(status_code=400, detail="Failed to read uploaded file") from exc

    try:
        doc = fitz.open(stream=content, filetype="pdf")
        pages: list[str] = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        text = "\n".join(pages)
    except Exception:
        log.error("pdf_parse_error", filename=file.filename)
        raise HTTPException(status_code=400, detail="Invalid or corrupt PDF file")

    profile = parse_profile(text)
    log.info("parse_done", full_name=profile.fullName, email=profile.email)
    return profile


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
