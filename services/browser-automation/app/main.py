"""
EasyFormCV Browser Automation Microservice
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
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from playwright.async_api import async_playwright, Page
from pydantic import BaseModel

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

log = structlog.get_logger()

app = FastAPI(title="EasyFormCV Browser Automation", version="0.1.0", docs_url=None, redoc_url=None)

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


DATA_DIR = Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parents[3] / "data")))
RUNS_DIR = DATA_DIR / "logs" / "runs"
FIXTURE_PATH = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "sample_form.html"

FILLABLE_TYPES = {"text", "email", "tel", "number", "search", "url", "textarea"}

# ── Common selectors for login fields ──────────────────────────────────────────

EMAIL_SELECTORS = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="identifier"]',
    'input[name="username"]',
    'input[name="login"]',
    'input[name="session_key"]',
    'input[autocomplete="username"]',
    '#identifierId',
    '#email',
    '#username',
    '#session_key',
]

PASSWORD_SELECTORS = [
    'input[type="password"]',
    'input[name="password"]',
    'input[name="passwd"]',
    'input[name="session_password"]',
    'input[autocomplete="current-password"]',
    '#password',
    '#passwd',
    '#session_password',
    '#hiddenPassword',
]

SUBMIT_SELECTORS = [
    'button:has-text("Next")',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Continue")',
    'button:has-text("Submit")',
    'button[type="submit"]',
    'input[type="submit"]',
    '#identifierNext',
    '#passwordNext',
    '.VfPpkd-LgbsSe',
]


class AuthConfig(BaseModel):
    email: str
    password: str
    loginUrl: str | None = None
    emailSelector: str | None = None
    passwordSelector: str | None = None
    submitSelector: str | None = None


class DetectRequest(BaseModel):
    url: str | None = None
    fixture: bool = False
    auth: AuthConfig | None = None
    model_config = {"populate_by_name": True}


class FormField(BaseModel):
    id: str
    label: str
    type: str = "text"
    confidence: float = 0.8
    selector: str | None = None


class RunRequest(BaseModel):
    url: str
    mappings: list[dict[str, str]] = []
    profile: dict[str, Any] = {}
    run_id: str = ""
    auth: AuthConfig | None = None


class RunResult(BaseModel):
    status: str
    filled: list[str] = []
    failed: list[str] = []
    screenshot_path: str | None = None
    error: str | None = None


# ── Login helpers ──────────────────────────────────────────────────────────────

async def _try_fill(page: Page, selectors: list[str], value: str, timeout: int = 5_000) -> bool:
    for selector in selectors:
        try:
            el = await page.wait_for_selector(selector, timeout=timeout)
            if el:
                await el.fill(value)
                return True
        except Exception:
            continue
    return False


async def _try_click_submit(page: Page, selectors: list[str], timeout: int = 5_000) -> bool:
    for selector in selectors:
        try:
            el = await page.wait_for_selector(selector, timeout=timeout)
            if el:
                await el.click()
                return True
        except Exception:
            continue
    return False


async def _do_login(page: Page, auth: AuthConfig) -> None:
    """Generic login flow: fill email → submit → fill password → submit."""
    login_url = auth.loginUrl or page.url
    if page.url != login_url:
        await page.goto(login_url, wait_until="networkidle", timeout=20_000)

    email_sel = [auth.emailSelector] if auth.emailSelector else EMAIL_SELECTORS
    password_sel = [auth.passwordSelector] if auth.passwordSelector else PASSWORD_SELECTORS
    submit_sel = [auth.submitSelector] if auth.submitSelector else SUBMIT_SELECTORS

    if not await _try_fill(page, email_sel, auth.email):
        raise RuntimeError("Could not find email field on login page")

    await page.wait_for_timeout(500)

    if not await _try_click_submit(page, submit_sel):
        # Try pressing Enter as fallback
        await page.keyboard.press("Enter")

    await page.wait_for_timeout(1500)

    if not await _try_fill(page, password_sel, auth.password):
        raise RuntimeError("Could not find password field on login page")

    await page.wait_for_timeout(500)

    if not await _try_click_submit(page, submit_sel):
        await page.keyboard.press("Enter")

    await page.wait_for_load_state("networkidle", timeout=20_000)


# ── Field detection ───────────────────────────────────────────────────────────

async def _detect_fields(url: str | None, use_fixture: bool, auth: AuthConfig | None = None) -> list[FormField]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            if use_fixture and FIXTURE_PATH.exists():
                await page.goto(FIXTURE_PATH.as_uri())
            elif url:
                await page.goto(url, wait_until="networkidle", timeout=20_000)
                if auth:
                    await _do_login(page, auth)
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

            return fields
        finally:
            await browser.close()


# ── Form filling ──────────────────────────────────────────────────────────────

async def _run_automation(req: RunRequest) -> RunResult:
    run_id = req.run_id or str(uuid.uuid4())
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    screenshot_file = run_dir / "filled.png"

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

        if req.auth:
            try:
                await _do_login(page, req.auth)
                await page.goto(req.url, wait_until="networkidle", timeout=20_000)
            except Exception as exc:
                await browser.close()
                return RunResult(status="failed", error=f"Login failed: {exc}")

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

        await page.screenshot(path=str(screenshot_file), full_page=True)
        await browser.close()

    report = {"status": "completed", "filled": filled, "failed": failed, "screenshot_path": str(screenshot_file)}
    (run_dir / "report.json").write_text(json.dumps(report, indent=2))

    return RunResult(
        status="completed",
        filled=filled,
        failed=failed,
        screenshot_path=f"data/logs/runs/{run_id}/filled.png",
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/detect", response_model=list[FormField])
async def detect(body: DetectRequest) -> list[FormField]:
    log.info("detect_request", url=body.url, fixture=body.fixture, has_auth=body.auth is not None)
    if not body.url and not body.fixture:
        raise HTTPException(status_code=400, detail="Provide url or fixture=true")
    try:
        fields = await _detect_fields(body.url, body.fixture, body.auth)
        log.info("detect_done", count=len(fields))
        return fields
    except HTTPException:
        raise
    except Exception as exc:
        log.error("detect_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to detect form fields") from exc


@app.post("/run", response_model=RunResult)
async def run(body: RunRequest) -> RunResult:
    log.info("run_request", url=body.url, run_id=body.run_id, has_auth=body.auth is not None)
    try:
        result = await _run_automation(body)
        log.info("run_done", status=result.status, filled=len(result.filled), failed=len(result.failed))
        return result
    except HTTPException:
        raise
    except Exception as exc:
        log.error("run_error", error=str(exc))
        return RunResult(status="failed", error="Form filling failed unexpectedly")


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)
