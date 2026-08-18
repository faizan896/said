import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPromiseCompleted, ChainVerificationError } from "@/lib/server/chain-verify";
import { indexPromiseCompleted } from "@db/queries";

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
    const completed = await verifyPromiseCompleted(parsed.data.txHash as `0x${string}`);
    if (String(completed.id) !== id) {
      return NextResponse.json({ error: "Transaction is for a different promise." }, { status: 422 });
    }

    // proofURI is a single free-text field on-chain; the composer lets people
    // enter a URL or a short note. If it looks like a URL, file it as one —
    // otherwise it's a note. Either way it came straight from the verified
    // on-chain event, not from this request body.
    const looksLikeUrl = /^https?:\/\//i.test(completed.proofURI);
    await indexPromiseCompleted({
      id: completed.id,
      completedAt: completed.completedAt,
      proofUrl: looksLikeUrl ? completed.proofURI : null,
      proofNote: looksLikeUrl ? null : completed.proofURI || null,
      completeTxHash: completed.completeTxHash,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ChainVerificationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Couldn't verify that transaction. Try again in a moment." }, { status: 502 });
  }
}
