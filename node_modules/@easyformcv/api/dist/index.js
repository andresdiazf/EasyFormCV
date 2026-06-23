import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "./lib/env.js";
import { cvRoutes } from "./routes/cv.js";
import { profileRoutes } from "./routes/profile.js";
import { formsRoutes } from "./routes/forms.js";
import { runsRoutes } from "./routes/runs.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In dev: tsx runs from src/index.ts -> apps/api/src -> 3 levels up -> apps/web/dist
// In prod: node runs from dist/index.js -> apps/api/dist -> 3 levels up -> apps/web/dist
const WEB_DIST = path.resolve(__dirname, "../../../web/dist");
const app = Fastify({
    logger: {
        transport: env.NODE_ENV === "development"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
    },
});
// ── Plugins ───────────────────────────────────────────────────────────────────
await app.register(cors, {
    origin: true,
});
await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});
// ── Routes ────────────────────────────────────────────────────────────────────
const API_PREFIX = "/api/v1";
await app.register(cvRoutes, { prefix: API_PREFIX });
await app.register(profileRoutes, { prefix: API_PREFIX });
await app.register(formsRoutes, { prefix: API_PREFIX });
await app.register(runsRoutes, { prefix: API_PREFIX });
// Health check
app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
// ── Static Assets & SPA Fallback ──────────────────────────────────────────────
if (fs.existsSync(WEB_DIST)) {
    app.log.info(`Serving static files from ${WEB_DIST}`);
    await app.register(fastifyStatic, {
        root: WEB_DIST,
        prefix: "/",
    });
    // Client-side routing fallback (for SPA)
    app.setNotFoundHandler(async (request, reply) => {
        if (request.url.startsWith("/api")) {
            return reply.status(404).send({ error: "API endpoint not found" });
        }
        return reply.sendFile("index.html");
    });
}
else {
    app.log.warn(`Static files directory ${WEB_DIST} not found. Frontend static serving disabled.`);
}
// ── Start ─────────────────────────────────────────────────────────────────────
try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
}
catch (err) {
    app.log.error(err);
    process.exit(1);
}
//# sourceMappingURL=index.js.map