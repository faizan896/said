import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

/**
 * A single shared connection pool for the lifetime of the server process.
 * Next.js hot-reloads modules in dev and serverless platforms reuse warm
 * instances, so the pool is stashed on globalThis — otherwise every reload
 * would leak a new pool and exhaust the database's connection limit.
 *
 * On serverless (Vercel), use your provider's POOLED connection string
 * (Neon's `-pooler` host, Supabase's port 6543). Each function instance
 * opens very few connections, but there can be many instances.
 */
declare global {
  var __saidPool: Pool | undefined;
  var __saidSchemaReady: Promise<void> | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy web/.env.example to web/.env and point it at your Postgres database."
    );
  }

  return new Pool({
    connectionString,
    // Hosted Postgres (Neon, Supabase, Railway…) requires TLS but uses
    // certificates Node doesn't ship a root for; local dev usually has no
    // TLS at all. Allow both without downgrading a real local setup.
    ssl: /localhost|127\.0\.0\.1/.test(connectionString)
      ? undefined
      : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool {
  if (!globalThis.__saidPool) {
    globalThis.__saidPool = createPool();
  }
  return globalThis.__saidPool;
}

/**
 * Applies schema.sql once per process. Every table is IF NOT EXISTS, so this
 * is a no-op after the first run and safe to call on every query path — it
 * means a fresh database (or a fresh Vercel deploy pointed at an empty one)
 * works without a separate migration step.
 */
export function ensureSchema(): Promise<void> {
  if (!globalThis.__saidSchemaReady) {
    globalThis.__saidSchemaReady = (async () => {
      const schemaPath = path.join(process.cwd(), "db", "schema.sql");
      const schema = fs.readFileSync(schemaPath, "utf-8");
      await getPool().query(schema);
    })().catch((err) => {
      // Don't cache a failed attempt — the next request should retry.
      globalThis.__saidSchemaReady = undefined;
      throw err;
    });
  }
  return globalThis.__saidSchemaReady;
}

/** Runs a query, making sure the schema exists first. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureSchema();
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
