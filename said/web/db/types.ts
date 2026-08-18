export type PromiseStatus = "ACTIVE" | "KEPT" | "BROKEN";

export type PromiseCategory =
  | "BUILD"
  | "LIFE"
  | "FITNESS"
  | "MONEY"
  | "LEARNING"
  | "OTHER";

/** A row as it comes back from Postgres. Timestamps arrive as Date objects
 * from `pg`; everything above this layer works with ISO strings, so
 * queries.ts normalises them. */
export interface PromiseRow {
  id: number;
  creator_address: string;
  statement: string;
  category: PromiseCategory;
  created_at: Date | string;
  deadline: Date | string;
  status: "ACTIVE" | "KEPT";
  proof_url: string | null;
  proof_note: string | null;
  completed_at: Date | string | null;
  create_tx_hash: string;
  complete_tx_hash: string | null;
}

export interface WitnessRow {
  id: number;
  promise_id: number;
  witness_address: string;
  witnessed_at: string;
  tx_hash: string;
}

export interface ProfileRow {
  address: string;
  username: string | null;
  joined_at: Date | string;
}

/** Shape returned to the frontend: a promise with its *live* (derived) status
 * and witness count already attached, so components never need to re-derive
 * status themselves. Mirrors the derivation the smart contract does on-chain
 * (`Said._statusOf`) so the index and the chain never visibly disagree. */
export interface PromiseWithMeta {
  id: number;
  creator_address: string;
  statement: string;
  category: PromiseCategory;
  created_at: string;
  deadline: string;
  status: PromiseStatus;
  proof_url: string | null;
  proof_note: string | null;
  completed_at: string | null;
  create_tx_hash: string;
  complete_tx_hash: string | null;
  witnessCount: number;
  creatorUsername: string | null;
}
