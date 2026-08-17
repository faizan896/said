import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// A single shared connection for the lifetime of the server process.
// Next.js dev mode hot-reloads modules, so we stash the instance on
// globalThis to avoid re-opening the file (and re-running schema.sql) on
// every edit, the same way you'd cache a Prisma client.
declare global {
  var __saidDb: DatabaseSync | undefined;
}

function openDb(): DatabaseSync {
  const dbPath = process.env.SQLITE_DB_PATH ?? "./db/said.db";
  // turbopackIgnore: this path resolution runs against a runtime env var, not
  // a static asset the bundler needs to trace/include in the server output.
  const resolved = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(/* turbopackIgnore: true */ process.cwd(), dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new DatabaseSync(resolved);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  const schemaPath = path.join(/* turbopackIgnore: true */ process.cwd(), "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__saidDb) {
    globalThis.__saidDb = openDb();
  }
  return globalThis.__saidDb;
}
