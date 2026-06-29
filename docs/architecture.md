# Architecture Decisions

## Monorepo with npm Workspaces

**Context**: The project has three distinct deployable units (API, Frontend, Shared Types) plus two Python microservices.

**Decision**: Use npm workspaces with packages under `apps/` and `packages/`. This enables shared config, a single `npm install`, and cross-package imports via `@easyformcv/*` aliases.

**Consequence**: Clean separation of concerns. The `shared-schemas` package is the single source of truth for Zod schemas consumed by both frontend and API.

## Zod Schemas in a Shared Package

**Context**: Input validation is needed on both client and server. Without a shared layer, validation logic drifts apart.

**Decision**: Define all schemas in `packages/shared-schemas` using Zod. Both `apps/api` and `apps/web` import from `@easyformcv/shared-schemas`. API routes call `.parse()` to validate input; the frontend uses the inferred TypeScript types.

**Consequence**: Validation is consistent. A single change propagates everywhere. API routes no longer use unsafe `as` type assertions.

## Fastify over Express

**Context**: The Node.js API needs to handle file uploads, CORS, and serve static assets with good performance.

**Decision**: Use Fastify 5. It's faster, has built-in schema validation hooks, TypeScript-native type support, and a richer plugin ecosystem.

**Consequence**: Cleaner route definitions, built-in multipart support, and easy static file serving.

## Python Microservices for PDF and Browser Automation

**Context**: PyMuPDF (PDF parsing) and Playwright (browser automation) are Python-native libraries with no equivalent first-class Node.js alternatives.

**Decision**: Decompose these into standalone FastAPI microservices. The Node.js API communicates with them via HTTP.

**Consequence**: Each service scales independently. Downside: additional network latency and deployment complexity.

## Singleton Profile with Race-Condition-Aware Upsert

**Context**: The app stores a single "current profile" for the user. Multiple concurrent PUT requests could create duplicates.

**Decision**: Use `findFirst` to detect an existing profile, then either `update` or `create`. While not atomic, the likelihood of concurrent writes in a single-user app is low. A unique constraint on a dedicated key field would be needed for full atomicity.

**Consequence**: Simple, correct for the single-user use case. If multi-user auth is added, a `userId` unique constraint should be introduced.

## Offline-First Caching with sessionStorage

**Context**: The frontend should remain usable when the API is temporarily unreachable.

**Decision**: Cache GET responses in `sessionStorage`. On fetch failure, return cached data with a console warning. Cache writes are best-effort (silently catch `QuotaExceededError`).

**Consequence**: UI stays functional offline for previously visited pages. Cache is cleared when the tab closes (sessionStorage scope).

## HTTP Timeouts on All Outbound Requests

**Context**: Without timeouts, a hanging microservice could hold resources indefinitely.

**Decision**: All `fetch()` calls to Python microservices use `AbortController` with 30s (pdf-parser) or 120s (browser-automation) timeouts. Background automation runs also have a 5-minute hard timeout.

**Consequence**: No resource leaks from hanging requests.

## Security: No Stack Trace Leaks

**Context**: Python FastAPI default error handling can expose internal paths and stack traces.

**Decision**: Global exception handlers in both Python services return generic `"Internal server error"` messages. File uploads sanitize filenames and verify resolved paths stay within the intended directory.

**Consequence**: Reduced information disclosure in error responses.
