"use client";

import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useWitnessPromise } from "@/lib/hooks/use-said-contract";

const stageCopy: Record<string, string> = {
  connecting: "connecting…",
  "switching-network": "switching network…",
  "waiting-for-wallet": "confirm in wallet…",
  confirming: "recording…",
  indexing: "almost there…",
};

export function WitnessAction({
  promiseId,
  creatorAddress,
  witnessAddresses,
}: {
  promiseId: number;
  creatorAddress: string;
  witnessAddresses: string[];
}) {
  const router = useRouter();
  const { address } = useAccount();
  const { witness, stage, error } = useWitnessPromise(promiseId);

  const isCreator = !!address && address.toLowerCase() === creatorAddress.toLowerCase();
  const alreadyWitnessed =
    !!address && witnessAddresses.some((w) => w.toLowerCase() === address.toLowerCase());
  const isBusy = stage !== "idle" && stage !== "error" && stage !== "done";

  if (isCreator) {
    return <p className="text-sm text-ink-faint-2">you can&rsquo;t witness your own promise.</p>;
  }

  if (stage === "done" || alreadyWitnessed) {
    return <p className="text-sm text-kept">✓ you witnessed this</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={isBusy}
        onClick={async () => {
          try {
            await witness();
            router.refresh();
          } catch {
            // surfaced via `error`
          }
        }}
      >
        {isBusy ? stageCopy[stage] ?? "working…" : "witness"}
      </Button>
      {error && <p className="text-xs text-broken">{error}</p>}
    </div>
  );
}
