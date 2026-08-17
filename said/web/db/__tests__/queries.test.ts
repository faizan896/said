import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Each test gets its own throwaway sqlite file so tests never interfere with
// each other or with db/said.db used by `npm run dev`.
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "said-test-"));
  process.env.SQLITE_DB_PATH = path.join(tmpDir, "test.db");
  (globalThis as { __saidDb?: unknown }).__saidDb = undefined;
});

afterEach(() => {
  (globalThis as { __saidDb?: unknown }).__saidDb = undefined;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function freshQueries() {
  // vitest doesn't reset the module cache between tests by default the way
  // we need here (getDb() caches on globalThis, which we clear above), so a
  // plain import is fine as long as globalThis.__saidDb was reset.
  return await import("../queries");
}

const CREATOR = "0xaaaa000000000000000000000000000000aaaa";
const WITNESS = "0xbbbb000000000000000000000000000000bbbb";

describe("status derivation", () => {
  it("reports ACTIVE for a promise with a future deadline", async () => {
    const q = await freshQueries();
    q.indexPromiseCreated({
      id: 1,
      creatorAddress: CREATOR,
      statement: "test",
      category: "OTHER",
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 86400_000).toISOString(),
      createTxHash: `0x${"1".repeat(64)}`,
    });
    const promise = q.getPromiseById(1);
    expect(promise?.status).toBe("ACTIVE");
  });

  it("derives BROKEN once the deadline has passed, without any write", async () => {
    const q = await freshQueries();
    q.indexPromiseCreated({
      id: 1,
      creatorAddress: CREATOR,
      statement: "test",
      category: "OTHER",
      createdAt: new Date(Date.now() - 172800_000).toISOString(),
      deadline: new Date(Date.now() - 86400_000).toISOString(),
      createTxHash: `0x${"1".repeat(64)}`,
    });
    const promise = q.getPromiseById(1);
    expect(promise?.status).toBe("BROKEN");
  });

  it("stays KEPT even after the deadline once completed", async () => {
    const q = await freshQueries();
    q.indexPromiseCreated({
      id: 1,
      creatorAddress: CREATOR,
      statement: "test",
      category: "OTHER",
      createdAt: new Date(Date.now() - 172800_000).toISOString(),
      deadline: new Date(Date.now() - 86400_000).toISOString(),
      createTxHash: `0x${"1".repeat(64)}`,
    });
    q.indexPromiseCompleted({
      id: 1,
      completedAt: new Date(Date.now() - 100000_000).toISOString(),
      proofUrl: null,
      proofNote: "done",
      completeTxHash: `0x${"2".repeat(64)}`,
    });
    const promise = q.getPromiseById(1);
    expect(promise?.status).toBe("KEPT");
  });
});

describe("witnesses", () => {
  it("counts witnesses and dedupes the same address via the unique index", async () => {
    const q = await freshQueries();
    q.indexPromiseCreated({
      id: 1,
      creatorAddress: CREATOR,
      statement: "test",
      category: "OTHER",
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 86400_000).toISOString(),
      createTxHash: `0x${"1".repeat(64)}`,
    });

    q.indexWitness({
      promiseId: 1,
      witnessAddress: WITNESS,
      witnessedAt: new Date().toISOString(),
      txHash: `0x${"3".repeat(64)}`,
    });
    // Same witness again (e.g. a retried index call) — INSERT OR IGNORE means
    // this should not double-count, mirroring the contract's one-witness-per-
    // wallet invariant.
    q.indexWitness({
      promiseId: 1,
      witnessAddress: WITNESS,
      witnessedAt: new Date().toISOString(),
      txHash: `0x${"3".repeat(64)}`,
    });

    const promise = q.getPromiseById(1);
    expect(promise?.witnessCount).toBe(1);
    expect(q.hasWitnessedIndex(1, WITNESS)).toBe(true);
    expect(q.hasWitnessedIndex(1, CREATOR)).toBe(false);
  });
});

describe("profile stats", () => {
  it("computes kept/broken/active counts and kept percentage", async () => {
    const q = await freshQueries();
    const future = new Date(Date.now() + 86400_000).toISOString();
    const past = new Date(Date.now() - 86400_000).toISOString();

    q.indexPromiseCreated({
      id: 1,
      creatorAddress: CREATOR,
      statement: "kept one",
      category: "OTHER",
      createdAt: past,
      deadline: future,
      createTxHash: `0x${"1".repeat(64)}`,
    });
    q.indexPromiseCompleted({
      id: 1,
      completedAt: new Date().toISOString(),
      proofUrl: null,
      proofNote: null,
      completeTxHash: `0x${"2".repeat(64)}`,
    });

    q.indexPromiseCreated({
      id: 2,
      creatorAddress: CREATOR,
      statement: "broken one",
      category: "OTHER",
      createdAt: past,
      deadline: past,
      createTxHash: `0x${"3".repeat(64)}`,
    });

    q.indexPromiseCreated({
      id: 3,
      creatorAddress: CREATOR,
      statement: "active one",
      category: "OTHER",
      createdAt: past,
      deadline: future,
      createTxHash: `0x${"4".repeat(64)}`,
    });

    const stats = q.getProfileStats(CREATOR);
    expect(stats.total).toBe(3);
    expect(stats.kept).toBe(1);
    expect(stats.broken).toBe(1);
    expect(stats.active).toBe(1);
    expect(stats.keptPct).toBe(50);
  });

  it("returns null keptPct when nothing has been decided yet", async () => {
    const q = await freshQueries();
    q.indexPromiseCreated({
      id: 1,
      creatorAddress: CREATOR,
      statement: "active only",
      category: "OTHER",
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 86400_000).toISOString(),
      createTxHash: `0x${"1".repeat(64)}`,
    });
    const stats = q.getProfileStats(CREATOR);
    expect(stats.keptPct).toBeNull();
  });
});

describe("resolveProfileHandle", () => {
  it("resolves a 0x address to itself, lowercased", async () => {
    const q = await freshQueries();
    expect(q.resolveProfileHandle("0xAAAA000000000000000000000000000000AAAA")).toBe(
      CREATOR
    );
  });

  it("resolves a username to its address", async () => {
    const q = await freshQueries();
    q.ensureProfile(CREATOR);
    const db = (await import("../client")).getDb();
    db.prepare("UPDATE profiles SET username = ? WHERE address = ?").run("faizan", CREATOR);
    expect(q.resolveProfileHandle("faizan")).toBe(CREATOR);
  });

  it("returns null for an unknown username", async () => {
    const q = await freshQueries();
    expect(q.resolveProfileHandle("nobody")).toBeNull();
  });
});
