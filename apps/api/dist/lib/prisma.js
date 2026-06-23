import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "./env.js";
let prismaClient;
if (env.DATABASE_URL.startsWith("postgresql://") || env.DATABASE_URL.startsWith("postgres://")) {
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prismaClient = new PrismaClient({ adapter });
}
else {
    // Fallback for non-postgres URLs (should not happen in production)
    prismaClient = new PrismaClient();
}
export const prisma = global.prisma || prismaClient;
if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}
export default prisma;
//# sourceMappingURL=prisma.js.map