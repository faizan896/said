import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

/**
 * Writes the freshly deployed contract address into web/.env.local so the
 * dev server picks it up on restart, saving a copy-paste step.
 *
 * Development only — this route 404s in production. It writes a single
 * known key to a single known file and nothing else; it never reads or
 * echoes any other environment value.
 */
const bodySchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "not a valid contract address"),
  chainId: z.number().int().positive(),
});

const ENV_KEY = "NEXT_PUBLIC_SAID_CONTRACT_ADDRESS";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid request" },
      { status: 400 }
    );
  }

  const { address, chainId } = parsed.data;

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const line = `${ENV_KEY}=${address}`;

    let contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

    if (contents.includes(`${ENV_KEY}=`)) {
      contents = contents.replace(new RegExp(`^${ENV_KEY}=.*$`, "m"), line);
    } else {
      const header = contents.trim().length
        ? contents.replace(/\s*$/, "\n")
        : `# Written by the /deploy page — Said contract on chain ${chainId}.\n`;
      contents = `${header}${line}\n`;
    }

    fs.writeFileSync(envPath, contents);

    // Mirror it into the checked-in address map too, so the deployment is
    // recorded in the repo alongside the ABI.
    const addressesPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "contracts",
      "addresses.json"
    );
    const existing = fs.existsSync(addressesPath)
      ? JSON.parse(fs.readFileSync(addressesPath, "utf-8"))
      : {};
    existing[String(chainId)] = address;
    fs.writeFileSync(addressesPath, `${JSON.stringify(existing, null, 2)}\n`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "couldn't write env file" }, { status: 500 });
  }
}
