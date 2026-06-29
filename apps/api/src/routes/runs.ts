import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prisma.js";
import { runAutomation } from "../services/browser-automation.js";
import type { CandidateProfile, FieldMappingEntry } from "@easyformcv/shared-schemas";

export async function runsRoutes(app: FastifyInstance) {
  // POST /api/v1/runs
  app.post("/runs", async (request, reply) => {
    const body = request.body as {
      url: string;
      mappings: FieldMappingEntry[];
      profile: CandidateProfile;
    };

    if (!body.url) {
      return reply.status(400).send({ error: "url is required" });
    }

    const runId = uuidv4();

    // Insert run record as pending
    await prisma.run.create({
      data: {
        id: runId,
        status: "pending",
        url: body.url,
        profileSnapshot: JSON.stringify(body.profile ?? {}),
        filledJson: "[]",
        failedJson: "[]",
      },
    });

    // Call browser-automation service asynchronously
    setImmediate(async () => {
      try {
        await prisma.run.update({
          where: { id: runId },
          data: { status: "running" },
        });

        const result = await runAutomation({
          url: body.url,
          mappings: body.mappings ?? [],
          profile: body.profile ?? {},
          run_id: runId,
        });

        await prisma.run.update({
          where: { id: runId },
          data: {
            status: result.status ?? "completed",
            filledJson: JSON.stringify(result.filled ?? []),
            failedJson: JSON.stringify(result.failed ?? []),
            screenshotPath: result.screenshot_path ?? null,
            error: result.error ?? null,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        app.log.error(err, `Run ${runId} failed`);
        await prisma.run.update({
          where: { id: runId },
          data: {
            status: "failed",
            error: message,
          },
        });
      }
    });

    return reply.status(202).send({ id: runId, status: "pending" });
  });

  // GET /api/v1/runs/:id
  app.get("/runs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const run = await prisma.run.findUnique({
      where: { id },
    });

    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    return reply.send({
      id: run.id,
      status: run.status,
      url: run.url,
      profileSnapshot: JSON.parse(run.profileSnapshot || "{}"),
      filled: JSON.parse(run.filledJson || "[]"),
      failed: JSON.parse(run.failedJson || "[]"),
      screenshotPath: run.screenshotPath ?? undefined,
      error: run.error ?? undefined,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    });
  });

  // GET /api/v1/runs — list all runs
  app.get("/runs", async (_request, reply) => {
    const runs = await prisma.run.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return reply.send(
      runs.map((run: any) => ({
        id: run.id,
        status: run.status,
        url: run.url,
        profileSnapshot: JSON.parse(run.profileSnapshot || "{}"),
        filled: JSON.parse(run.filledJson || "[]"),
        failed: JSON.parse(run.failedJson || "[]"),
        screenshotPath: run.screenshotPath ?? undefined,
        error: run.error ?? undefined,
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString(),
      }))
    );
  });
}
