import type { FastifyInstance } from "fastify";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parsePdf } from "../services/pdf-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/routes → 4 levels up → monorepo root
const CV_DIR = path.resolve(__dirname, "../../../../data/cvs");

export async function cvRoutes(app: FastifyInstance) {
  // POST /api/v1/cv/upload
  app.post("/cv/upload", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    if (!data.mimetype.includes("pdf")) {
      return reply.status(400).send({ error: "Only PDF files are accepted" });
    }

    // Ensure CV directory exists
    await fs.mkdir(CV_DIR, { recursive: true });

    const filename = `${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(CV_DIR, filename);

    const buffer = await data.toBuffer();
    // Save locally for record/debug
    try {
      await fs.writeFile(filePath, buffer);
    } catch (err) {
      app.log.warn(err, "Failed to write CV file locally (non-fatal)");
    }

    try {
      const profile = await parsePdf(buffer, data.filename);
      return reply.send({ profile, filePath });
    } catch (err) {
      app.log.error(err, "pdf-parser service error");
      // Return a stub profile so the UI doesn't break when service is offline
      return reply.send({
        profile: {
          fullName: "",
          email: "",
          phone: "",
          location: "",
          summary: "",
        },
        filePath,
        warning: "pdf-parser service unavailable — profile fields are empty",
      });
    }
  });
}
