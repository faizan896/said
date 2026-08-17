import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPromiseCreated, ChainVerificationError } from "@/lib/server/chain-verify";
import { indexPromiseCreated } from "@db/queries";
import type { PromiseCategory } from "@db/types";

const CATEGORIES: PromiseCategory[] = ["BUILD", "LIFE", "FITNESS", "MONEY", "LEARNING", "OTHER"];

const bodySchema = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "not a valid transaction hash"),
  category: z.enum(CATEGORIES as [PromiseCategory, ...PromiseCategory[]]).default("OTHER"),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid request" }, { status: 400 });
  }

  try {
    const created = await verifyPromiseCreated(parsed.data.txHash as `0x${string}`);
    indexPromiseCreated({ ...created, category: parsed.data.category });
    return NextResponse.json({ id: created.id });
  } catch (err) {
    if (err instanceof ChainVerificationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Couldn't verify that transaction. Try again in a moment." }, { status: 502 });
  }
}
