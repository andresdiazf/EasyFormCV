// Drizzle-style schema definitions (for documentation / future migration use).
// Actual DB operations use node:sqlite directly via src/db/index.ts.
export const TABLES = {
    profiles: "profiles",
    form_mappings: "form_mappings",
    runs: "runs",
};
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  summary     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS form_mappings (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  url         TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '[]',
  mappings_json TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS runs (
  id               TEXT PRIMARY KEY,
  status           TEXT NOT NULL DEFAULT 'pending',
  url              TEXT NOT NULL DEFAULT '',
  profile_snapshot TEXT NOT NULL DEFAULT '{}',
  filled_json      TEXT NOT NULL DEFAULT '[]',
  failed_json      TEXT NOT NULL DEFAULT '[]',
  screenshot_path  TEXT,
  error            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
//# sourceMappingURL=schema.js.map