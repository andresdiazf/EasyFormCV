import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../lib/env.js";
import { CREATE_TABLES_SQL } from "./schema.js";
// __fileDir is the real directory of THIS source file, regardless of CWD.
const __fileDir = path.dirname(fileURLToPath(import.meta.url));
function resolveDbPath(dbUrl) {
    // Strip "file:" prefix
    const filePath = dbUrl.replace(/^file:/, "");
    if (path.isAbsolute(filePath))
        return filePath;
    // DATABASE_URL in .env is written relative to the monorepo root.
    // This file lives at  apps/api/src/db/index.ts
    //   → 4 levels up    apps/api/src/db → apps/api/src → apps/api → apps → monorepo root
    const monoRoot = path.resolve(__fileDir, "../../../..");
    return path.resolve(monoRoot, filePath);
}
const dbPath = resolveDbPath(env.DATABASE_URL);
export const db = new DatabaseSync(dbPath);
// Initialise schema on first run
db.exec(CREATE_TABLES_SQL);
export default db;
//# sourceMappingURL=index.js.map