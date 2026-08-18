import { notFound } from "next/navigation";
import { DeployPanel } from "@/components/deploy/deploy-panel";

export const metadata = { title: "deploy — said" };

/**
 * A one-time setup screen for putting Said.sol on-chain using your own
 * browser wallet, so no private key ever has to live in a .env file or get
 * pasted anywhere. Development-only: it never ships in a production build.
 */
export default function DeployPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      <DeployPanel />
    </div>
  );
}
