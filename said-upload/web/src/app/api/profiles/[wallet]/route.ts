import { NextRequest, NextResponse } from "next/server";
import { getProfileStats, resolveProfileHandle } from "@db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
  const address = (await resolveProfileHandle(wallet.toLowerCase())) ?? wallet.toLowerCase();
  const stats = await getProfileStats(address);
  return NextResponse.json({ username: stats.username });
}
