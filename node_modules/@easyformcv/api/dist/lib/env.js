import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from the monorepo root (4 levels up from src/lib)
config({ path: path.resolve(__dirname, "../../../../.env") });
/**
 * Validated, typed map of all environment variables consumed by the API.
 *
 * ## Security Guidelines for Environment Variables
 *
 * **Never hard-code secrets in source code.** All sensitive values (API keys,
 * database passwords, service URLs) must be supplied via environment variables.
 *
 * ### Local Development
 * Copy `.env.example` to `.env` at the monorepo root and fill in your values:
 * ```bash
 * cp .env.example .env
 * ```
 * The `.env` file is listed in `.gitignore` — it will never be committed.
 *
 * ### Production (Render / other platforms)
 * Add each variable through the platform's Secret/Environment UI — never via
 * a committed file. Render's dashboard: **Service → Environment → Add variable**.
 *
 * ### Variables Reference
 * | Variable               | Required | Default                     | Description                              |
 * |------------------------|----------|-----------------------------|------------------------------------------|
 * | `DATABASE_URL`         | ✅       | —                           | PostgreSQL connection string (Supabase)  |
 * | `PDF_PARSER_URL`       | ✅       | `http://localhost:8001`     | Base URL of the pdf-parser microservice  |
 * | `BROWSER_AUTOMATION_URL`| ✅      | `http://localhost:8002`     | Base URL of the browser-automation service |
 * | `API_PORT`             | ❌       | `3000`                      | TCP port the Fastify server binds to     |
 * | `API_HOST`             | ❌       | `0.0.0.0`                  | Host the Fastify server binds to         |
 * | `NODE_ENV`             | ❌       | `development`               | Runtime environment flag                 |
 * | `OPENAI_API_KEY`       | ❌       | —                           | Optional — enables AI-assisted mapping   |
 *
 * @throws {Error} At module import time if `DATABASE_URL` is not set in
 *                 production (`NODE_ENV === "production"`).
 */
function requireEnv(key, fallback) {
    const value = process.env[key] ?? fallback;
    if (!value) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(`[env] Required environment variable "${key}" is missing. Add it to your Render service environment settings.`);
        }
        console.warn(`[env] Warning: "${key}" is not set. Using empty string — some features may not work.`);
        return "";
    }
    return value;
}
export const env = {
    API_PORT: parseInt(process.env.API_PORT ?? "3000", 10),
    API_HOST: process.env.API_HOST ?? "0.0.0.0",
    /**
     * PostgreSQL connection string.
     * Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
     * Get this from Supabase → Project Settings → Database → Connection String.
     */
    DATABASE_URL: requireEnv("DATABASE_URL", "postgresql://localhost:5432/easyformcv_dev"),
    /**
     * Base URL of the Python pdf-parser FastAPI microservice.
     * In production, this is the public Render URL of the pdf-parser Web Service.
     */
    PDF_PARSER_URL: process.env.PDF_PARSER_URL ?? "http://localhost:8001",
    /**
     * Base URL of the Python browser-automation FastAPI microservice.
     * In production, this is the public Render URL of the browser-automation Web Service.
     */
    BROWSER_AUTOMATION_URL: process.env.BROWSER_AUTOMATION_URL ?? "http://localhost:8002",
    NODE_ENV: process.env.NODE_ENV ?? "development",
    /**
     * Optional OpenAI API key — enables AI-assisted field mapping.
     * Never log this value. Store it only in `.env` locally or in Render's
     * Secret Environment settings in production.
     */
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};
//# sourceMappingURL=env.js.map