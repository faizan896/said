import { getDb } from "./client";
import type {
  PromiseRow,
  WitnessRow,
  ProfileRow,
  PromiseWithMeta,
  PromiseCategory,
} from "./types";

/** Derives live status from stored status + deadline, mirroring the
 * contract's `_statusOf`: Kept stays Kept forever; otherwise Active flips to
 * Broken once the deadline has passed. Never trust `status` alone for an
 * Active row without running it through this. */
function deriveStatus(row: PromiseRow, now: Date): PromiseWithMeta["status"] {
  if (row.status === "KEPT") return "KEPT";
  return new Date(row.deadline).getTime() < now.getTime() ? "BROKEN" : "ACTIVE";
}

function withMeta(row: PromiseRow, witnessCount: number, creatorUsername: string | null): PromiseWithMeta {
  const now = new Date();
  const { status: _status, ...rest } = row;
  void _status;
  return {
    ...rest,
    status: deriveStatus(row, now),
    witnessCount,
    creatorUsername,
  };
}

function attachMeta(rows: PromiseRow[]): PromiseWithMeta[] {
  if (rows.length === 0) return [];
  const db = getDb();

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  const witnessCounts = new Map<number, number>();
  const countRows = db
    .prepare(
      `SELECT promise_id, COUNT(*) as cnt FROM witnesses WHERE promise_id IN (${placeholders}) GROUP BY promise_id`
    )
    .all(...ids) as { promise_id: number; cnt: number }[];
  for (const r of countRows) witnessCounts.set(r.promise_id, r.cnt);

  const creators = Array.from(new Set(rows.map((r) => r.creator_address)));
  const creatorPlaceholders = creators.map(() => "?").join(",");
  const usernames = new Map<string, string | null>();
  if (creators.length > 0) {
    const profileRows = db
      .prepare(`SELECT address, username FROM profiles WHERE address IN (${creatorPlaceholders})`)
      .all(...creators) as { address: string; username: string | null }[];
    for (const p of profileRows) usernames.set(p.address, p.username);
  }

  return rows.map((row) =>
    withMeta(row, witnessCounts.get(row.id) ?? 0, usernames.get(row.creator_address) ?? null)
  );
}

export function getPromiseById(id: number): PromiseWithMeta | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM promises WHERE id = ?").get(id) as
    | PromiseRow
    | undefined;
  if (!row) return null;
  return attachMeta([row])[0];
}

export function listRecentPromises(limit = 20): PromiseWithMeta[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM promises ORDER BY created_at DESC LIMIT ?")
    .all(limit) as unknown as PromiseRow[];
  return attachMeta(rows);
}

export function listMostWitnessed(limit = 10): PromiseWithMeta[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM witnesses w WHERE w.promise_id = p.id) as wc
       FROM promises p ORDER BY wc DESC LIMIT ?`
    )
    .all(limit) as unknown as (PromiseRow & { wc: number })[];
  return attachMeta(rows);
}

export function listRecentlyKept(limit = 10): PromiseWithMeta[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM promises WHERE status = 'KEPT' ORDER BY completed_at DESC LIMIT ?"
    )
    .all(limit) as unknown as PromiseRow[];
  return attachMeta(rows);
}

/** "they said WHAT?" — no ML, just a simple heuristic: personal/offbeat
 * categories (LIFE, OTHER) with real social proof (witnesses), newest first.
 * Simple sorting per spec, not a recommendation system. */
export function listInteresting(limit = 10): PromiseWithMeta[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM witnesses w WHERE w.promise_id = p.id) as wc
       FROM promises p
       WHERE p.category IN ('LIFE', 'OTHER')
       ORDER BY wc DESC, p.created_at DESC
       LIMIT ?`
    )
    .all(limit) as unknown as (PromiseRow & { wc: number })[];
  return attachMeta(rows);
}

export function listHappeningNow(limit = 10): PromiseWithMeta[] {
  // "Recent promises receiving witnesses" — most recently witnessed, deduped by promise.
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, MAX(w.witnessed_at) as last_witness
       FROM promises p
       JOIN witnesses w ON w.promise_id = p.id
       GROUP BY p.id
       ORDER BY last_witness DESC
       LIMIT ?`
    )
    .all(limit) as unknown as (PromiseRow & { last_witness: string })[];
  return attachMeta(rows);
}

export function listByCreator(
  address: string,
  filter?: "ACTIVE" | "KEPT" | "BROKEN"
): PromiseWithMeta[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM promises WHERE creator_address = ? ORDER BY created_at DESC")
    .all(address) as unknown as PromiseRow[];
  const withMetaRows = attachMeta(rows);
  if (!filter) return withMetaRows;
  return withMetaRows.filter((p) => p.status === filter);
}

export function getProfileStats(address: string) {
  const promises = listByCreator(address);
  const kept = promises.filter((p) => p.status === "KEPT").length;
  const broken = promises.filter((p) => p.status === "BROKEN").length;
  const active = promises.filter((p) => p.status === "ACTIVE").length;
  const decided = kept + broken;
  const keptPct = decided === 0 ? null : Math.round((kept / decided) * 100);

  const db = getDb();
  const profile = db
    .prepare("SELECT * FROM profiles WHERE address = ?")
    .get(address) as ProfileRow | undefined;

  return {
    address,
    username: profile?.username ?? null,
    joinedAt: profile?.joined_at ?? null,
    total: promises.length,
    kept,
    broken,
    active,
    keptPct,
  };
}

export function resolveProfileHandle(handle: string): string | null {
  // handle can be a 0x address or a username; returns the canonical address.
  if (handle.startsWith("0x")) return handle.toLowerCase();
  const db = getDb();
  const row = db
    .prepare("SELECT address FROM profiles WHERE username = ?")
    .get(handle) as { address: string } | undefined;
  return row?.address ?? null;
}

export function getWitnesses(promiseId: number, limit = 50): WitnessRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM witnesses WHERE promise_id = ? ORDER BY witnessed_at ASC LIMIT ?"
    )
    .all(promiseId, limit) as unknown as WitnessRow[];
}

export function hasWitnessedIndex(promiseId: number, address: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM witnesses WHERE promise_id = ? AND witness_address = ?")
    .get(promiseId, address);
  return !!row;
}

// ---------------------------------------------------------------------
// Writes — called after a wallet's transaction has been confirmed
// on-chain, to mirror the resulting event into the index.
// ---------------------------------------------------------------------

export function indexPromiseCreated(input: {
  id: number;
  creatorAddress: string;
  statement: string;
  category: PromiseCategory;
  createdAt: string;
  deadline: string;
  createTxHash: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO promises
      (id, creator_address, statement, category, created_at, deadline, status, create_tx_hash)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`
  ).run(
    input.id,
    input.creatorAddress.toLowerCase(),
    input.statement,
    input.category,
    input.createdAt,
    input.deadline,
    input.createTxHash
  );
  ensureProfile(input.creatorAddress);
}

export function indexWitness(input: {
  promiseId: number;
  witnessAddress: string;
  witnessedAt: string;
  txHash: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO witnesses (promise_id, witness_address, witnessed_at, tx_hash)
     VALUES (?, ?, ?, ?)`
  ).run(input.promiseId, input.witnessAddress.toLowerCase(), input.witnessedAt, input.txHash);
  ensureProfile(input.witnessAddress);
}

export function indexPromiseCompleted(input: {
  id: number;
  completedAt: string;
  proofUrl: string | null;
  proofNote: string | null;
  completeTxHash: string;
}) {
  const db = getDb();
  db.prepare(
    `UPDATE promises
     SET status = 'KEPT', completed_at = ?, proof_url = ?, proof_note = ?, complete_tx_hash = ?
     WHERE id = ?`
  ).run(input.completedAt, input.proofUrl, input.proofNote, input.completeTxHash, input.id);
}

export function ensureProfile(address: string) {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO profiles (address, joined_at) VALUES (?, ?)`
  ).run(address.toLowerCase(), new Date().toISOString());
}

export function nextLocalPromiseId(): number {
  const db = getDb();
  const row = db.prepare("SELECT MAX(id) as maxId FROM promises").get() as {
    maxId: number | null;
  };
  return (row.maxId ?? 0) + 1;
}
