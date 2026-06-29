# EasyFormCV

> Automate job application form filling. Upload your CV, detect form fields, map them, and let the automation do the rest.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  Node API    │────▶│  pdf-parser      │
│  (React/Vite)│     │  (Fastify)   │     │  (Python/FastAPI)│
│  :5173       │     │  :3000       │     │  :8001           │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                            │
                            │              ┌──────────────────┐
                            ├─────────────▶│ browser-auto     │
                            │              │ (Python/Playwright│
                            │              │  :8002           │
                            │              └──────────────────┘
                            │
                     ┌──────┴───────┐
                     │  PostgreSQL  │
                     │  (via Prisma)│
                     └──────────────┘
```

### Monorepo Structure

```
EasyFormCV/
├── apps/
│   ├── api/          # Fastify REST API server
│   └── web/          # React SPA (Vite + TanStack Query + Tailwind)
├── packages/
│   └── shared-schemas/  # Zod schemas + TypeScript types
├── services/
│   ├── pdf-parser/           # Python PDF extraction microservice
│   └── browser-automation/   # Python Playwright automation microservice
├── prisma/                   # Canonical Prisma schema
└── data/                     # Runtime data (CVs, screenshots, logs, SQLite)
```

### ADD (Attribute-Driven Design)

The architecture is organized with ADD and quality attributes as primary drivers:

1. Availability: graceful degradation when microservices are unavailable.
2. Security: strict upload validation + safe target URL checks.
3. Performance: explicit timeouts for outbound service calls.
4. Deployability: independent services mapped directly to Render web services.
5. Modifiability: shared schemas package as single contract boundary.

Full ADD document: `docs/add-architecture.md`.

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Monorepo with npm workspaces** | Single `npm install`, shared config, cross-package imports via `@easyformcv/*` |
| **Zod schemas in a shared package** | Single source of truth for types & validation consumed by both API and frontend |
| **Fastify over Express** | Faster, built-in schema validation, TypeScript-native, better plugin system |
| **Python microservices** | PyMuPDF for PDF parsing and Playwright for browser automation are Python-native |
| **Prisma ORM** | Type-safe database access, auto-generated client, easy migrations |
| **Race-condition-safe upsert** | Singleton-profile pattern uses `findFirst` + conditional update/create with proper error boundaries |
| **Offline-first caching** | `sessionStorage` cache with graceful degradation when API is unreachable |
| **HTTP timeouts** | All outbound requests use `AbortController` with configurable timeouts to prevent hanging |
| **No stack trace leaks** | Global exception handlers in Python services return generic error messages |

---

## Security

### Environment Variables

- `.env` is listed in `.gitignore` and must never be committed
- Use `.env.example` as a template — it contains safe defaults
- In production, set secrets via platform UI (Render, Fly.io, etc.)
- `CORS_ORIGIN` controls allowed browser origins for API requests
- `ALLOW_PRIVATE_TARGETS=false` should be used in production to reduce SSRF risk

### Request Validation

- All API routes validate input with **Zod schemas** from `@easyformcv/shared-schemas`
- Invalid payloads are rejected with `400 Bad Request`
- Type assertions like `as CandidateProfile` have been replaced with `.parse()`

### File Upload Safety

- **Size limit**: 20 MB via `@fastify/multipart` + `Content-Length` header check
- **Type check**: Extension + MIME + PDF signature (`%PDF-`) are validated
- **Path traversal**: Filenames are sanitized and resolved paths are verified to stay within the CV directory
- **No stack traces**: Python services return generic `"Internal server error"` messages

### Target URL Safety

- Only `http`/`https` target URLs are accepted
- In production (`ALLOW_PRIVATE_TARGETS=false`), local/private hosts are blocked

### HTTP Request Safety

- All outbound HTTP requests to microservices have **30–120 second timeouts** via `AbortController`
- Background automation runs have a **5-minute hard timeout**
- No secrets are logged or exposed in error messages

---

## API Reference

### Public Endpoints (Fastify — Node.js :3000)

| Method | Route | Description | Validation |
|--------|-------|-------------|------------|
| `POST` | `/api/v1/cv/upload` | Upload PDF, extract profile | Multipart form, file type check |
| `GET` | `/api/v1/profile` | Get latest profile | — |
| `PUT` | `/api/v1/profile` | Create/update profile | `CandidateProfileSchema.partial()` |
| `POST` | `/api/v1/forms/detect` | Detect fields on a URL | `DetectFieldsRequestSchema` |
| `GET` | `/api/v1/forms/mapping` | Get saved mapping | — |
| `POST` | `/api/v1/forms/mapping` | Save field mapping | `SaveMappingRequestSchema` |
| `POST` | `/api/v1/runs` | Start automation run | `StartRunRequestSchema` |
| `GET` | `/api/v1/runs` | List recent runs | — |
| `GET` | `/api/v1/runs/:id` | Get run details | UUID param |
| `GET` | `/health` | Health check | — |

### Microservice Endpoints (Python)

| Service | Endpoint | Description |
|---------|----------|-------------|
| `pdf-parser` | `POST /parse` | Extract profile from PDF buffer |
| `browser-automation` | `POST /detect` | Detect fields on a URL or fixture |
| `browser-automation` | `POST /run` | Fill form, take screenshot |
| Both | `GET /health` | Health check |

---

## Setup

### Prerequisites

- **Node.js >=22**
- **Python >=3.11** with pip
- **PostgreSQL** (or Supabase)
- **Google Chrome / Chromium** (for Playwright)

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up Python services (Windows)
cd services\pdf-parser
python -m venv .venv && .venv\Scripts\activate
pip install fastapi uvicorn pymupdf structlog pydantic
pip install -e ".[dev]"
cd ..\..

cd services\browser-automation
python -m venv .venv && .venv\Scripts\activate
pip install fastapi uvicorn playwright structlog pydantic httpx pyyaml
pip install -e ".[dev]"
python -m playwright install chromium
cd ..\..

# 3. Configure environment
copy .env.example .env
# Edit .env with your DATABASE_URL (get it from Supabase → Project Settings → Database)

# 4. Create database tables
npx prisma db push --accept-data-loss
```

### Start all services (Windows)

Open **4 separate terminals** and run:

| # | Service | Command |
|---|---------|---------|
| 1 | **API** (Node.js) | `cd apps\api && npx tsx src\index.ts` |
| 2 | **Frontend** (Vite) | `cd apps\web && npx vite --host --port 5173` |
| 3 | **PDF Parser** (Python) | `cd services\pdf-parser && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8001` |
| 4 | **Browser Automation** (Python) | `cd services\browser-automation && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8002` |

Then open `http://localhost:5173` in your browser.

### Start all services (Linux / macOS)

```bash
# Terminal 1 — API
npm run dev -w @easyformcv/api

# Terminal 2 — Frontend
npm run dev -w @easyformcv/web

# Terminal 3 — PDF Parser
cd services/pdf-parser && source .venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# Terminal 4 — Browser Automation
cd services/browser-automation && source .venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002
```

---

## Testing

```bash
# All workspaces
npm test

# Individual
npm test -w @easyformcv/api
npm test -w @easyformcv/web
npm test -w @easyformcv/shared-schemas

# Python services (activate venv first)
cd services/pdf-parser && .venv\Scripts\python -m pytest -v
cd services/browser-automation && .venv\Scripts\python -m pytest -v
```

Note: some packages may intentionally have no test files yet; workspace test scripts are configured to pass in that case.

---

## Deploy to Render

`render.yaml` defines 3 services:

1. `easyformcv-api` (Node)
2. `easyformcv-pdf-parser` (Python)
3. `easyformcv-browser-automation` (Python + Playwright)

### Render deployment steps

1. Connect the repository in Render.
2. Create Blueprint from `render.yaml`.
3. Set environment variables on `easyformcv-api`:
       - `DATABASE_URL`
       - `PDF_PARSER_URL` (internal URL of parser service)
       - `BROWSER_AUTOMATION_URL` (internal URL of automation service)
       - `CORS_ORIGIN` (public frontend URL)
       - `ALLOW_PRIVATE_TARGETS=false`
4. Deploy all services.
5. Verify health endpoints:
       - API: `/health`
       - PDF parser: `/health`
       - Browser automation: `/health`

### Stop all services

```bash
# Windows (PowerShell)
powershell "Get-Process | Where-Object { \$_.ProcessName -eq 'node' -or \$_.ProcessName -eq 'python' } | ForEach-Object { Stop-Process \$_.Id -Force }"

# Linux / macOS
pkill -f "tsx|vite|uvicorn"
```

---

## Internationalization

The UI supports **English** and **Spanish**. Translations are defined in `apps/web/src/lib/i18n.tsx` using a React context pattern. Locale is persisted in `localStorage`.

To add a language:
1. Add translations to the `translations` object in `i18n.tsx`
2. Add the locale code to the `Locale` type
3. Add the locale to the `LocaleSwitcher` options in `App.tsx`

---

## License

MIT © EasyFormCV — See [LICENSE](./LICENSE).
