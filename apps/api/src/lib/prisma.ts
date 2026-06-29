import prismaModule from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "./env.js";

const { PrismaClient } = prismaModule as unknown as {
  PrismaClient: new (...args: any[]) => any;
};
type PrismaClientType = InstanceType<typeof PrismaClient>;

/**
 * Prisma Client singleton for the EasyFormCV API.
 *
 * Implements the recommended singleton pattern to prevent exhausting the
 * PostgreSQL connection pool in development when the module is hot-reloaded.
 *
 * Connection strategy:
 * - **PostgreSQL / Supabase** (default): Uses `@prisma/adapter-pg` with a
 *   `pg.Pool` whose connection string comes from `DATABASE_URL`.
 * - Other providers are unsupported; the adapter requires a PostgreSQL URL.
 *
 * @module lib/prisma
 *
 * @example
 * ```ts
 * import prisma from "./lib/prisma.js";
 *
 * const profiles = await prisma.profile.findMany();
 * ```
 *
 * @see {@link https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient Prisma singleton docs}
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClientType | undefined;
}

let prismaClient: PrismaClientType;

if (env.DATABASE_URL.startsWith("postgresql://") || env.DATABASE_URL.startsWith("postgres://")) {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prismaClient = new PrismaClient({ adapter });
} else {
  // Fallback for non-postgres URLs (should not happen in production)
  prismaClient = new PrismaClient();
}

export const prisma = global.prisma || prismaClient;

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
