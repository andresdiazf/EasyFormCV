# EasyFormCV Architecture Using ADD (Attribute-Driven Design)

## 1. Quality Attribute Drivers

### Primary scenarios

1. Availability: If the PDF parser or browser automation service is unavailable, the API should degrade gracefully and still return controlled responses.
2. Performance: Form detection and execution requests should not block indefinitely.
3. Security: The system should reject malformed uploads and unsafe target URLs.
4. Deployability: Services should be deployable independently in Render.
5. Modifiability: Shared request/response contracts should be defined in one place to avoid drift.

### Constraints

1. Frontend and API are TypeScript.
2. Automation and PDF extraction are Python-first workloads.
3. Database access is centralized through Prisma.

## 2. Architectural Tactics Selected

1. Separation by deployable component:
- apps/web for UI.
- apps/api as orchestration layer.
- services/pdf-parser and services/browser-automation as specialized workers.

2. Contract-first boundary:
- packages/shared-schemas holds Zod schemas and shared types consumed by both API and web.

3. Controlled failure and timeout behavior:
- API outbound calls use explicit timeouts and fallback responses when possible.
- Run orchestration uses a hard timeout guard to avoid hanging job state.

4. Input hardening:
- PDF upload checks extension, mime type, file size, and PDF signature.
- URL target safety checks reject unsupported protocols and, in production, private/local hosts.

## 3. Module Decomposition (ADD Step)

1. Presentation module:
- React app with feature folders for CV upload, profile, form mapping, and automation runs.

2. Application module:
- Fastify routes coordinate persistence and external service calls.

3. Domain contract module:
- Shared schemas package defines canonical DTOs and validations.

4. Infrastructure module:
- Prisma + PostgreSQL persistence.
- Python services for document parsing and browser execution.

## 4. Runtime View

1. User uploads CV in web.
2. API stores file safely and calls pdf-parser.
3. User maps detected fields.
4. API launches run and calls browser-automation.
5. Run status is persisted and polled by web.

## 5. Security Decisions

1. Strict upload validation in API route.
2. URL target filtering for SSRF reduction.
3. Generic internal error messages in Python services.
4. Configurable CORS and private-target controls via environment variables.

## 6. Deployment Mapping (Render)

1. easyformcv-api (Node web service).
2. easyformcv-pdf-parser (Python web service).
3. easyformcv-browser-automation (Python web service with Playwright Chromium install).

The API must reference parser/automation internal URLs through environment variables.
