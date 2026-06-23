import { PrismaClient } from "@prisma/client";
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
    var prisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/client").DefaultArgs>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map