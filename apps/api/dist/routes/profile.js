import prisma from "../lib/prisma.js";
export async function profileRoutes(app) {
    // GET /api/v1/profile
    app.get("/profile", async (_request, reply) => {
        const profile = await prisma.profile.findFirst({
            orderBy: { updatedAt: "desc" },
        });
        if (!profile) {
            return reply.send({
                fullName: "",
                email: "",
                phone: "",
                location: "",
                summary: "",
            });
        }
        return reply.send({
            id: profile.id,
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            summary: profile.summary,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
        });
    });
    // PUT /api/v1/profile
    app.put("/profile", async (request, reply) => {
        const body = request.body;
        const existing = await prisma.profile.findFirst({
            orderBy: { updatedAt: "desc" },
            select: { id: true },
        });
        if (existing) {
            const updated = await prisma.profile.update({
                where: { id: existing.id },
                data: {
                    fullName: body.fullName ?? "",
                    email: body.email ?? "",
                    phone: body.phone ?? "",
                    location: body.location ?? "",
                    summary: body.summary ?? "",
                },
            });
            return reply.send({
                id: updated.id,
                fullName: updated.fullName,
                email: updated.email,
                phone: updated.phone,
                location: updated.location,
                summary: updated.summary,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            });
        }
        const created = await prisma.profile.create({
            data: {
                fullName: body.fullName ?? "",
                email: body.email ?? "",
                phone: body.phone ?? "",
                location: body.location ?? "",
                summary: body.summary ?? "",
            },
        });
        return reply.status(201).send({
            id: created.id,
            fullName: created.fullName,
            email: created.email,
            phone: created.phone,
            location: created.location,
            summary: created.summary,
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        });
    });
}
//# sourceMappingURL=profile.js.map