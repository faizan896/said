import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ensureSchema, getPool, query } from "../client";
import * as q from "../queries";

// These run against a real Postgres so the SQL is actually exercised rather
// than mocked. Point DATABASE_URL at a throwaway database — the suite wipes
// all three tables before each test. Skipped entirely when it isn't set, so
// `npm test` still works for anyone without a database handy.
const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

const CREATOR = "0xaaaa000000000000000000000000000000aaaa";
const WITNESS = "0xbbbb000000000000000000000000000000bbbb";
const TX = (n: string) => `0x${n.repeat(64).slice(0, 64)}`;

const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 86_400_000).toISOString();

async function createPromise(overrides: Partial<Parameters<typeof q.indexPromiseCreated>[0]> = {}) {
  await q.indexPromiseCreated({
    id: 1,
    creatorAddress: CREATOR,
    statement: "test promise",
    category: "OTHER",
    createdAt: past(),
    deadline: future(),
    createTxHash: TX("1"),
    ...overrides,
  });
}

d("queries (Postgres)", () => {
  beforeEach(async () => {
    await ensureSchema();
    await query("DELETE FROM witnesses");
    await query("DELETE FROM promises");
    await query("DELETE FROM profiles");
  });

  afterAll(async () => {
    if (hasDb) await getPool().end();
  });

  describe("status derivation", () => {
    it("reads as ACTIVE before the deadline", async () => {
      await createPromise();
      expect((await q.getPromiseById(1))?.status).toBe("ACTIVE");
    });

    it("derives BROKEN once the deadline passes, with no write", async () => {
      await createPromise({ deadline: past() });
      expect((await q.getPromiseById(1))?.status).toBe("BROKEN");
    });

    it("stays KEPT even after the deadline once completed", async () => {
      await createPromise({ deadline: past() });
      await q.indexPromiseCompleted({
        id: 1,
        completedAt: past(),
        proofUrl: null,
        proofNote: "done",
        completeTxHash: TX("2"),
      });
      const p = await q.getPromiseById(1);
      expect(p?.status).toBe("KEPT");
      expect(p?.proof_note).toBe("done");
    });

    it("never stores BROKEN — only ACTIVE or KEPT hits the table", async () => {
      await createPromise({ deadline: past() });
      const rows = await query<{ status: string }>("SELECT status FROM promises WHERE id = 1");
      expect(rows[0].status).toBe("ACTIVE");
      expect((await q.getPromiseById(1))?.status).toBe("BROKEN");
    });
  });

  describe("witnesses", () => {
    it("counts witnesses and ignores a duplicate from the same wallet", async () => {
      await createPromise();
      const w = {
        promiseId: 1,
        witnessAddress: WITNESS,
        witnessedAt: new Date().toISOString(),
        txHash: TX("3"),
      };
      await q.indexWitness(w);
      await q.indexWitness(w); // retried index call must not double-count

      expect((await q.getPromiseById(1))?.witnessCount).toBe(1);
      expect(await q.hasWitnessedIndex(1, WITNESS)).toBe(true);
      expect(await q.hasWitnessedIndex(1, CREATOR)).toBe(false);
    });

    it("returns witnesses in the order they witnessed", async () => {
      await createPromise();
      for (let i = 0; i < 3; i++) {
        await q.indexWitness({
          promiseId: 1,
          witnessAddress: `0x${String(i).repeat(40)}`,
          witnessedAt: new Date(Date.now() - (3 - i) * 1000).toISOString(),
          txHash: TX(String(i + 4)),
        });
      }
      const rows = await q.getWitnesses(1);
      expect(rows).toHaveLength(3);
      expect(rows[0].witness_address).toBe(`0x${"0".repeat(40)}`);
    });
  });

  describe("profile stats", () => {
    it("computes kept/broken/active counts and kept percentage", async () => {
      await createPromise({ id: 1, statement: "kept one" });
      await q.indexPromiseCompleted({
        id: 1,
        completedAt: new Date().toISOString(),
        proofUrl: null,
        proofNote: null,
        completeTxHash: TX("9"),
      });
      await createPromise({ id: 2, statement: "broken one", deadline: past(), createTxHash: TX("a") });
      await createPromise({ id: 3, statement: "active one", createTxHash: TX("b") });

      const stats = await q.getProfileStats(CREATOR);
      expect(stats).toMatchObject({ total: 3, kept: 1, broken: 1, active: 1, keptPct: 50 });
    });

    it("returns a null keptPct when nothing has been decided yet", async () => {
      await createPromise();
      expect((await q.getProfileStats(CREATOR)).keptPct).toBeNull();
    });
  });

  describe("resolveProfileHandle", () => {
    it("lowercases a 0x address", async () => {
      expect(await q.resolveProfileHandle("0xAAAA000000000000000000000000000000AAAA")).toBe(CREATOR);
    });

    it("resolves a username to its address", async () => {
      await q.ensureProfile(CREATOR);
      await query("UPDATE profiles SET username = $1 WHERE address = $2", ["faizan", CREATOR]);
      expect(await q.resolveProfileHandle("faizan")).toBe(CREATOR);
    });

    it("returns null for an unknown username", async () => {
      expect(await q.resolveProfileHandle("nobody")).toBeNull();
    });
  });

  describe("feeds", () => {
    it("orders the landing feed newest first", async () => {
      await createPromise({ id: 1, statement: "older", createdAt: new Date(Date.now() - 60_000).toISOString() });
      await createPromise({ id: 2, statement: "newer", createdAt: new Date().toISOString(), createTxHash: TX("c") });
      const feed = await q.listRecentPromises(10);
      expect(feed.map((p) => p.statement)).toEqual(["newer", "older"]);
    });

    it("returns empty arrays rather than throwing when there's nothing", async () => {
      expect(await q.listRecentPromises(10)).toEqual([]);
      expect(await q.listHappeningNow(10)).toEqual([]);
      expect(await q.listMostWitnessed(10)).toEqual([]);
      expect(await q.listRecentlyKept(10)).toEqual([]);
      expect(await q.listInteresting(10)).toEqual([]);
    });
  });
});
