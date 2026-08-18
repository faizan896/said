"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useCompletePromise } from "@/lib/hooks/use-said-contract";
import { MAX_PROOF_LENGTH } from "@/lib/constants";
import { isValidUrl } from "@/lib/format";

const stageCopy: Record<string, string> = {
  connecting: "connecting…",
  "switching-network": "switching network…",
  "waiting-for-wallet": "confirm in wallet…",
  confirming: "recording…",
  indexing: "almost there…",
};

export function CompleteAction({
  promiseId,
  creatorAddress,
}: {
  promiseId: number;
  creatorAddress: string;
}) {
  const router = useRouter();
  const { address } = useAccount();
  const { complete, stage, error } = useCompletePromise(promiseId);
  const [open, setOpen] = useState(false);
  const [proofType, setProofType] = useState<"url" | "note">("url");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Only the creator sees this action at all. If nobody's connected yet, we
  // still show it — clicking it is what triggers the connect flow.
  const isKnownNonCreator = !!address && address.toLowerCase() !== creatorAddress.toLowerCase();
  if (isKnownNonCreator) return null;

  const isBusy = stage !== "idle" && stage !== "error" && stage !== "done";

  if (stage === "done") {
    return <p className="text-sm text-kept">✓ marked kept</p>;
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>I did it</Button>
    );
  }

  const proof = proofType === "url" ? proofUrl.trim() : proofNote.trim();

  async function handleSubmit() {
    setValidationError(null);
    if (proofType === "url" && proof && !isValidUrl(proof)) {
      setValidationError("That doesn't look like a valid URL.");
      return;
    }
    if (proof.length > MAX_PROOF_LENGTH) {
      setValidationError(`Keep proof under ${MAX_PROOF_LENGTH} characters.`);
      return;
    }
    try {
      await complete(proof);
      router.refresh();
    } catch {
      // surfaced via `error`
    }
  }

  return (
    <div className="w-full rounded-lg border border-line p-4">
      <div className="mb-3 text-sm font-medium text-ink">Proof (optional)</div>
      <div className="mb-3 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setProofType("url")}
          className={proofType === "url" ? "font-medium text-ink underline" : "text-ink-faint"}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => setProofType("note")}
          className={proofType === "note" ? "font-medium text-ink underline" : "text-ink-faint"}
        >
          short note
        </button>
      </div>

      {proofType === "url" ? (
        <input
          type="url"
          placeholder="https://…"
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
          className="w-full rounded-md border border-line-strong bg-transparent px-3 py-2 text-sm text-ink"
        />
      ) : (
        <textarea
          placeholder="What happened?"
          value={proofNote}
          onChange={(e) => setProofNote(e.target.value)}
          maxLength={MAX_PROOF_LENGTH}
          rows={2}
          className="w-full resize-none rounded-md border border-line-strong bg-transparent px-3 py-2 text-sm text-ink"
        />
      )}

      {(validationError || error) && (
        <p className="mt-2 text-xs text-broken">{validationError ?? error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={isBusy} onClick={handleSubmit}>
          {isBusy ? stageCopy[stage] ?? "working…" : "confirm kept"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isBusy}>
          cancel
        </Button>
      </div>
    </div>
  );
}
