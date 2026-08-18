import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPromiseWitnessed, ChainVerificationError } from "@/lib/server/chain-verify";
import { indexWitness } from "@db/queries";

const bodySchema = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "not a valid transaction hash"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid request" }, { status: 400 });
  }

  try {
    const witnessed = await verifyPromiseWitnessed(parsed.data.txHash as `0x${string}`);
    if (String(witnessed.promiseId) !== id) {
      return NextResponse.json({ error: "Transaction is for a different promise." }, { status: 422 });
    }
    await indexWitness(witnessed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ChainVerificationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Couldn't verify that transaction. Try again in a moment." }, { status: 502 });
  }
}
