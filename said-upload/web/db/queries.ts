import { query } from "./client";
import type {
  PromiseRow,
  WitnessRow,
  ProfileRow,
  PromiseWithMeta,
  PromiseCategory,
  PromiseStatus,
} from "./types";

function iso(v: Date | string | null): string | null {
  if (v === null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

/** Derives live status from stored status + deadline, mirroring the
 * contract's `_statusOf`: Kept stays Kept forever; otherwise Active flips to
 * Broken once the deadline has passed. Never trust the stored `status` alone
 * for a row that isn't Kept. */
function deriveStatus(row: PromiseRow, now: number): PromiseStatus {
  if (row.status === "KEPT") return "KEPT";
  return new Date(row.deadline).getTime() < now ? "BROKEN" : "ACTIVE";
}

async function attachMeta(rows: PromiseRow[]): Promise<PromiseWithMeta[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const creators = Array.from(new Set(rows.map((r) => r.creator_address)));

  const [counts, profiles] = await Promise.all([
    query<{ promise_id: number; cnt: string }>(
      `SELECT promise_id, COUNT(*)::text AS cnt
         FROM witnesses WHERE promise_id = ANY($1::int[]) GROUP BY promise_id`,
      [ids]
    ),
    query<{ address: string; username: string | null }>(
      `SELECT address, username FROM profiles WHERE address = ANY($1::text[])`,
      [creators]
    ),
  ]);

  const countByPromise = new Map(counts.map((c) => [c.promise_id, Number(c.cnt)]));
  const usernameByAddress = new Map(profiles.map((p) => [p.address, p.username]));

  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    creator_address: row.creator_address,
    statement: row.statement,
    category: row.category,
    created_at: iso(row.created_at)!,
    deadline: iso(row.deadline)!,
    status: deriveStatus(row, now),
    proof_url: row.proof_url,
    proof_note: row.proof_note,
    completed_at: iso(row.completed_at),
    create_tx_hash: row.create_tx_hash,
    complete_tx_hash: row.complete_tx_hash,
    witnessCount: countByPromise.get(row.id) ?? 0,
    creatorUsername: usernameByAddress.get(row.creator_address) ?? null,
  }));
}

// ---------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------

export async function getPromiseById(id: number): Promise<PromiseWithMeta | null> {
  const rows = await query<PromiseRow>("SELECT * FROM promises WHERE id = $1", [id]);
  if (rows.length === 0) return null;
  return (await attachMeta(rows))[0];
}

export async function listRecentPromises(limit = 20): Promise<PromiseWithMeta[]> {
  const rows = await query<PromiseRow>(
    "SELECT * FROM promises ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return attachMeta(rows);
}

export async function listMostWitnessed(limit = 10): Promise<PromiseWithMeta[]> {
  const rows = await query<PromiseRow>(
    `SELECT p.* FROM promises p
       LEFT JOIN witnesses w ON w.promise_id = p.id
      GROUP BY p.id
      ORDER BY COUNT(w.id) DESC, p.created_at DESC
      LIMIT $1`,
    [limit]
  );
  return attachMeta(rows);
}

export async function listRecentlyKept(limit = 10): Promise<PromiseWithMeta[]> {
  const rows = await query<PromiseRow>(
    `SELECT * FROM promises WHERE status = 'KEPT'
      ORDER BY completed_at DESC NULLS LAST LIMIT $1`,
    [limit]
  );
  return attachMeta(rows);
}

/** "they said WHAT?" — no ML, just a simple heuristic: personal/offbeat
 * categories with real social proof, most-witnessed first. Simple sorting
 * per spec, not a recommendation system. */
export async function listInteresting(limit = 10): Promise<PromiseWithMeta[]> {
  const rows = await query<PromiseRow>(
    `SELECT p.* FROM promises p
       LEFT JOIN witnesses w ON w.promise_id = p.id
      WHERE p.category IN ('LIFE', 'OTHER')
      GROUP BY p.id
      ORDER BY COUNT(w.id) DESC, p.created_at DESC
      LIMIT $1`,
    [limit]
  );
  return attachMeta(rows);
}

/** "happening now" — promises that most recently received a witness. */
export async function listHappeningNow(limit = 10): Promise<PromiseWithMeta[]> {
  const rows = await query<PromiseRow>(
    `SELECT p.* FROM promises p
       JOIN witnesses w ON w.promise_id = p.id
      GROUP BY p.id
      ORDER BY MAX(w.witnessed_at) DESC
      LIMIT $1`,
    [limit]
  );
  return attachMeta(rows);
}

export async function listByCreator(
  address: string,
  filter?: PromiseStatus
): Promise<PromiseWithMeta[]> {
  const rows = await query<PromiseRow>(
    "SELECT * FROM promises WHERE creator_address = $1 ORDER BY created_at DESC",
    [address.toLowerCase()]
  );
  const withMeta = await attachMeta(rows);
  return filter ? withMeta.filter((p) => p.status === filter) : withMeta;
}

export async function getProfileStats(address: string) {
  const [promises, profiles] = await Promise.all([
    listByCreator(address),
    query<ProfileRow>("SELECT * FROM profiles WHERE address = $1", [
      address.toLowerCase(),
    ]),
  ]);

  const kept = promises.filter((p) => p.status === "KEPT").length;
  const broken = promises.filter((p) => p.status === "BROKEN").length;
  const active = promises.filter((p) => p.status === "ACTIVE").length;
  const decided = kept + broken;

  return {
    address: address.toLowerCase(),
    username: profiles[0]?.username ?? null,
    joinedAt: profiles[0] ? iso(profiles[0].joined_at) : null,
    total: promises.length,
    kept,
    broken,
    active,
    keptPct: decided === 0 ? null : Math.round((kept / decided) * 100),
  };
}

/** `handle` can be a 0x address or a username; returns the canonical address. */
export async function resolveProfileHandle(handle: string): Promise<string | null> {
  if (handle.startsWith("0x")) return handle.toLowerCase();
  const rows = await query<{ address: string }>(
    "SELECT address FROM profiles WHERE username = $1",
    [handle]
  );
  return rows[0]?.address ?? null;
}

export async function getWitnesses(promiseId: number, limit = 50): Promise<WitnessRow[]> {
  const rows = await query<WitnessRow>(
    `SELECT id, promise_id, witness_address, witnessed_at, tx_hash
       FROM witnesses WHERE promise_id = $1 ORDER BY witnessed_at ASC LIMIT $2`,
    [promiseId, limit]
  );
  return rows;
}

export async function hasWitnessedIndex(
  promiseId: number,
  address: string
): Promise<boolean> {
  const rows = await query(
    "SELECT 1 FROM witnesses WHERE promise_id = $1 AND witness_address = $2",
    [promiseId, address.toLowerCase()]
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------------
// Writes — only ever called after a transaction has been confirmed
// on-chain and its event log verified (see lib/server/chain-verify.ts).
// ---------------------------------------------------------------------

export async function indexPromiseCreated(input: {
  id: number;
  creatorAddress: string;
  statement: string;
  category: PromiseCategory;
  createdAt: string;
  deadline: string;
  createTxHash: string;
}) {
  await ensureProfile(input.creatorAddress);
  await query(
    `INSERT INTO promises
       (id, creator_address, statement, category, created_at, deadline, status, create_tx_hash)
     VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7)
     ON CONFLICT (id) DO NOTHING`,
    [
      input.id,
      input.creatorAddress.toLowerCase(),
      input.statement,
      input.category,
      input.createdAt,
      input.deadline,
      input.createTxHash,
    ]
  );
}

export async function indexWitness(input: {
  promiseId: number;
  witnessAddress: string;
  witnessedAt: string;
  txHash: string;
}) {
  await ensureProfile(input.witnessAddress);
  await query(
    `INSERT INTO witnesses (promise_id, witness_address, witnessed_at, tx_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (promise_id, witness_address) DO NOTHING`,
    [input.promiseId, input.witnessAddress.toLowerCase(), input.witnessedAt, input.txHash]
  );
}

export async function indexPromiseCompleted(input: {
  id: number;
  completedAt: string;
  proofUrl: string | null;
  proofNote: string | null;
  completeTxHash: string;
}) {
  await query(
    `UPDATE promises
        SET status = 'KEPT', completed_at = $1, proof_url = $2,
            proof_note = $3, complete_tx_hash = $4
      WHERE id = $5`,
    [input.completedAt, input.proofUrl, input.proofNote, input.completeTxHash, input.id]
  );
}

export async function ensureProfile(address: string) {
  await query(
    `INSERT INTO profiles (address, joined_at) VALUES ($1, now())
     ON CONFLICT (address) DO NOTHING`,
    [address.toLowerCase()]
  );
}
