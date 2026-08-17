-- Off-chain index for Said.
--
-- The chain (Said.sol on Monad) is always the source of truth for a
-- promise's existence, statement, deadline, witnesses and completion state.
-- This database exists purely so the UI can answer "recent promises,"
-- "most witnessed," and profile aggregates without re-walking chain logs on
-- every request. Every row here is either seeded demo data or a mirror of
-- an on-chain event (see lib/server/indexer.ts).
--
-- SQLite via Node's built-in `node:sqlite` was chosen for zero-setup local
-- dev. The data-access layer in db/queries.ts is the only place that knows
-- SQL, so swapping this for Postgres/Supabase later is a matter of
-- rewriting that one file against the same function signatures.

CREATE TABLE IF NOT EXISTS promises (
  id INTEGER PRIMARY KEY,               -- matches the on-chain promise id
  creator_address TEXT NOT NULL,
  statement TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'OTHER',
  created_at TEXT NOT NULL,             -- ISO 8601
  deadline TEXT NOT NULL,               -- ISO 8601
  status TEXT NOT NULL DEFAULT 'ACTIVE',-- ACTIVE | KEPT | BROKEN (derived on read, cached here)
  proof_url TEXT,
  proof_note TEXT,
  completed_at TEXT,
  create_tx_hash TEXT NOT NULL,
  complete_tx_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_promises_status ON promises(status);
CREATE INDEX IF NOT EXISTS idx_promises_creator ON promises(creator_address);
CREATE INDEX IF NOT EXISTS idx_promises_created_at ON promises(created_at);

CREATE TABLE IF NOT EXISTS witnesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promise_id INTEGER NOT NULL REFERENCES promises(id),
  witness_address TEXT NOT NULL,
  witnessed_at TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  UNIQUE(promise_id, witness_address)
);

CREATE INDEX IF NOT EXISTS idx_witnesses_promise ON witnesses(promise_id);

CREATE TABLE IF NOT EXISTS profiles (
  address TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  joined_at TEXT NOT NULL
);
