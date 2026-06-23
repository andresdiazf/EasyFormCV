import prisma from "../lib/prisma.js";
import { detectFields } from "../services/browser-automation.js";
export async function formsRoutes(app) {
    // POST /api/v1/forms/detect
    app.post("/forms/detect", async (request, reply) => {
        const body = request.body;
        try {
            const fields = await detectFields({
                url: body.url,
                fixture: body.fixture,
            });
            return reply.send({ fields });
        }
        catch (err) {
            app.log.error(err, "browser-automation /detect error");
            // Return stub fields when service is offline
            return reply.send({
                fields: [],
                warning: "browser-automation service unavailable",
            });
        }
    });
    // GET /api/v1/forms/mapping
    app.get("/forms/mapping", async (_request, reply) => {
        const mapping = await prisma.formMapping.findFirst({
            orderBy: { updatedAt: "desc" },
        });
        if (!mapping) {
            return reply.send({ url: "", fields: [], mappings: [] });
        }
        return reply.send({
            id: mapping.id,
            url: mapping.url,
            fields: JSON.parse(mapping.fieldsJson || "[]"),
            mappings: JSON.parse(mapping.mappingsJson || "[]"),
            createdAt: mapping.createdAt.toISOString(),
            updatedAt: mapping.updatedAt.toISOString(),
        });
    });
    // POST /api/v1/forms/mapping
    app.post("/forms/mapping", async (request, reply) => {
        const body = request.body;
        const existing = await prisma.formMapping.findFirst({
            orderBy: { updatedAt: "desc" },
            select: { id: true },
        });
        const fieldsJson = JSON.stringify(body.fields ?? []);
        const mappingsJson = JSON.stringify(body.mappings ?? []);
        const url = body.url ?? "";
        if (existing) {
            const updated = await prisma.formMapping.update({
                where: { id: existing.id },
                data: {
                    url,
                    fieldsJson,
                    mappingsJson,
                },
            });
            return reply.send({
                id: updated.id,
                url: updated.url,
                fields: JSON.parse(updated.fieldsJson || "[]"),
                mappings: JSON.parse(updated.mappingsJson || "[]"),
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            });
        }
        const created = await prisma.formMapping.create({
            data: {
                url,
                fieldsJson,
                mappingsJson,
            },
        });
        return reply.status(201).send({
            id: created.id,
            url: created.url,
            fields: JSON.parse(created.fieldsJson || "[]"),
            mappings: JSON.parse(created.mappingsJson || "[]"),
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        });
    });
}
//# sourceMappingURL=forms.js.map