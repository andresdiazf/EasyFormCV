"""
Browser Automation Service
POST /detect — detect form fields on a URL or local HTML fixture
POST /run    — fill a form using a profile and field mappings
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
from pathlib import Path
from typing import Any

import structlog
import uvicorn
from fastapi import FastAPI, HTTPException
from playwright.async_api import async_playwright
from pydantic import BaseModel

# Windows requires ProactorEventLoop to launch subprocesses (Playwright browser)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

log = structlog.get_logger()

app = FastAPI(title="EasyFormCV Browser Automation", version="0.1.0")

# Directory where run artefacts (screenshots, reports) are stored.
DATA_DIR = Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parents[3] / "data")))
RUNS_DIR = DATA_DIR / "logs" / "runs"
FIXTURE_PATH = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "sample_form.html"

FILLABLE_TYPES = {"text", "email", "tel", "number", "search", "url", "textarea"}


# ── Pydantic models ──────────────────────────────────────────────────────────

class DetectRequest(BaseModel):
    url: str | None = None
    fixture: bool = False

    model_config = {"populate_by_name": True}


class FormField(BaseModel):
    id: str
    label: str
    type: str = "text"
    confidence: float = 0.8
    selector: str | None = None


class RunRequest(BaseModel):
    url: str
    mappings: list[dict[str, str]] = []  # [{fieldId, profileKey}]
    profile: dict[str, Any] = {}
    run_id: str = ""


class RunResult(BaseModel):
    status: str
    filled: list[str] = []
    failed: list[str] = []
    screenshot_path: str | None = None
    error: str | None = None


# ── Field detection ───────────────────────────────────────────────────────────

async def _detect_fields(url: str | None, use_fixture: bool) -> list[FormField]:
    """Open a page with Playwright and scrape fillable input fields."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        if use_fixture and FIXTURE_PATH.exists():
            await page.goto(FIXTURE_PATH.as_uri())
        elif url:
            await page.goto(url, wait_until="networkidle", timeout=20_000)
        else:
            await browser.close()
            return []

        inputs = await page.query_selector_all("input, textarea, select")
        fields: list[FormField] = []

        for el in inputs:
            input_type = (await el.get_attribute("type") or "text").lower()
            if input_type in ("hidden", "submit", "button", "reset", "checkbox", "radio", "file"):
                continue

            field_id = (
                await el.get_attribute("id")
                or await el.get_attribute("name")
                or f"field_{len(fields)}"
            )

            # Try to find an associated <label>
            label_text = ""
            fid = await el.get_attribute("id")
            if fid:
                label_el = await page.query_selector(f'label[for="{fid}"]')
                if label_el:
                    label_text = (await label_el.inner_text()).strip()

            if not label_text:
                placeholder = await el.get_attribute("placeholder") or ""
                aria_label = await el.get_attribute("aria-label") or ""
                label_text = placeholder or aria_label or field_id

            tag = (await el.evaluate("el => el.tagName")).lower()
            effective_type = "textarea" if tag == "textarea" else input_type
            selector = f'#{fid}' if fid else f'[name="{await el.get_attribute("name")}"]'

            fields.append(
                FormField(
                    id=field_id,
                    label=label_text,
                    type=effective_type,
                    confidence=0.85,
                    selector=selector,
                )
            )

        await browser.close()
        return fields


# ── Form filling ──────────────────────────────────────────────────────────────

async def _run_automation(req: RunRequest) -> RunResult:
    run_id = req.run_id or str(uuid.uuid4())
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    screenshot_path = str(run_dir / "filled.png")

    filled: list[str] = []
    failed: list[str] = []

    mapping_dict = {m["fieldId"]: m["profileKey"] for m in req.mappings}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(req.url, wait_until="networkidle", timeout=20_000)
        except Exception as exc:
            await browser.close()
            return RunResult(status="failed", error=f"Navigation failed: {exc}")

        for field_id, profile_key in mapping_dict.items():
            value = str(req.profile.get(profile_key, ""))
            if not value:
                failed.append(field_id)
                continue
            try:
                selector = f'#{field_id}, [name="{field_id}"]'
                await page.fill(selector, value, timeout=3_000)
                filled.append(field_id)
            except Exception as exc:
                log.warning("fill_failed", field_id=field_id, error=str(exc))
                failed.append(field_id)

        await page.screenshot(path=screenshot_path, full_page=True)
        await browser.close()

    # Write report
    report = {"status": "completed", "filled": filled, "failed": failed, "screenshot_path": screenshot_path}
    (run_dir / "report.json").write_text(json.dumps(report, indent=2))

    return RunResult(
        status="completed",
        filled=filled,
        failed=failed,
        screenshot_path=screenshot_path,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/detect", response_model=list[FormField])
async def detect(body: DetectRequest) -> list[FormField]:
    log.info("detect_request", url=body.url, fixture=body.fixture)
    if not body.url and not body.fixture:
        raise HTTPException(status_code=400, detail="Provide url or fixture=true")
    try:
        fields = await _detect_fields(body.url, body.fixture)
        log.info("detect_done", count=len(fields))
        return fields
    except Exception as exc:
        log.error("detect_error", error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/run", response_model=RunResult)
async def run(body: RunRequest) -> RunResult:
    log.info("run_request", url=body.url, run_id=body.run_id)
    try:
        result = await _run_automation(body)
        log.info("run_done", status=result.status, filled=len(result.filled), failed=len(result.failed))
        return result
    except Exception as exc:
        log.error("run_error", error=str(exc))
        return RunResult(status="failed", error=str(exc))


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)
