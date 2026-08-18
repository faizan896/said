-- Off-chain index for Said (PostgreSQL).
--
-- The chain (Said.sol on Monad) is always the source of truth for a
-- promise's existence, statement, deadline, witnesses and completion state.
-- This database exists purely so the UI can answer "recent promises,"
-- "most witnessed," and profile aggregates without re-walking chain logs on
-- every request. Every row here is either seeded demo data or a mirror of a
-- verified on-chain event (see lib/server/chain-verify.ts) — nothing is
-- written here that wasn't first proven to have happened on-chain.
--
-- Safe to run repeatedly: everything is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS promises (
  id               INTEGER PRIMARY KEY,        -- matches the on-chain promise id
  creator_address  TEXT        NOT NULL,
  statement        TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'OTHER',
  created_at       TIMESTAMPTZ NOT NULL,
  deadline         TIMESTAMPTZ NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | KEPT (BROKEN is derived on read)
  proof_url        TEXT,
  proof_note       TEXT,
  completed_at     TIMESTAMPTZ,
  create_tx_hash   TEXT        NOT NULL,
  complete_tx_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_promises_status     ON promises (status);
CREATE INDEX IF NOT EXISTS idx_promises_creator    ON promises (creator_address);
CREATE INDEX IF NOT EXISTS idx_promises_created_at ON promises (created_at DESC);

CREATE TABLE IF NOT EXISTS witnesses (
  id              SERIAL PRIMARY KEY,
  promise_id      INTEGER     NOT NULL REFERENCES promises (id) ON DELETE CASCADE,
  witness_address TEXT        NOT NULL,
  witnessed_at    TIMESTAMPTZ NOT NULL,
  tx_hash         TEXT        NOT NULL,
  UNIQUE (promise_id, witness_address)
);

CREATE INDEX IF NOT EXISTS idx_witnesses_promise ON witnesses (promise_id);

CREATE TABLE IF NOT EXISTS profiles (
  address   TEXT PRIMARY KEY,
  username  TEXT UNIQUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
