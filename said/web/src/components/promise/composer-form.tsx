"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { useCreatePromise } from "@/lib/hooks/use-said-contract";
import {
  CATEGORIES,
  DEADLINE_PRESETS,
  MAX_STATEMENT_LENGTH,
  resolvePresetDeadline,
} from "@/lib/constants";
import { isContractDeployed, networkLabel } from "@/lib/chain";
import { formatDate } from "@/lib/format";

const stageCopy: Record<string, string> = {
  connecting: "connecting wallet…",
  "switching-network": "switching network…",
  "waiting-for-wallet": "confirm in your wallet…",
  confirming: "recording on Monad…",
  indexing: "almost there…",
};

export function ComposerForm() {
  const router = useRouter();
  const { create, stage, error } = useCreatePromise();

  const [statement, setStatement] = useState("");
  const [preset, setPreset] = useState<string>("30d");
  const [customDate, setCustomDate] = useState("");
  const [category, setCategory] = useState<string>("OTHER");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const deadline = useMemo(() => {
    if (preset === "custom") {
      return customDate ? new Date(`${customDate}T23:59:00`) : null;
    }
    return resolvePresetDeadline(preset);
  }, [preset, customDate]);

  const remaining = MAX_STATEMENT_LENGTH - statement.length;
  const isBusy = stage !== "idle" && stage !== "error" && stage !== "done";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const trimmed = statement.trim();
    if (trimmed.length === 0) {
      setValidationError("Say something first.");
      return;
    }
    if (trimmed.length > MAX_STATEMENT_LENGTH) {
      setValidationError(`Keep it under ${MAX_STATEMENT_LENGTH} characters.`);
      return;
    }
    if (!deadline || deadline.getTime() <= Date.now()) {
      setValidationError("Pick a deadline that's in the future.");
      return;
    }

    try {
      const id = await create({ statement: trimmed, deadline, category });
      setCreatedId(id);
    } catch {
      // error state is already surfaced via `error` from the hook
    }
  }

  if (createdId !== null) {
    return <RecordedConfirmation id={createdId} onViewFeed={() => router.push("/")} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div>
        <label htmlFor="statement" className="sr-only">
          I said...
        </label>
        <div className="flex items-baseline gap-2 font-serif text-2xl text-ink sm:text-3xl">
          <span className="text-ink-faint-2">I said…</span>
        </div>
        <textarea
          id="statement"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="I'll launch my startup before 2027."
          rows={3}
          maxLength={MAX_STATEMENT_LENGTH + 40}
          className="mt-2 w-full resize-none border-b border-line bg-transparent font-serif text-2xl leading-snug text-ink placeholder:text-ink-faint-2 focus:border-ink focus:outline-none sm:text-3xl"
          autoFocus
        />
        <div
          className={clsx(
            "mt-1 text-right text-xs",
            remaining < 0 ? "text-broken" : "text-ink-faint-2"
          )}
        >
          {remaining} left
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-ink">When?</div>
        <div className="flex flex-wrap gap-2">
          {DEADLINE_PRESETS.map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={clsx(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                preset === p.value
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong text-ink-faint hover:border-ink hover:text-ink"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="mt-3 rounded-md border border-line-strong bg-transparent px-3 py-2 text-sm text-ink"
          />
        )}
        {deadline && (
          <p className="mt-2 text-xs text-ink-faint">Due {formatDate(deadline)}</p>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-ink">Category (optional)</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={clsx(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                category === c.value
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong text-ink-faint hover:border-ink hover:text-ink"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-paper-dim px-4 py-3 text-xs text-ink-faint">
        This will be public, and permanent. Promises can&rsquo;t be edited after they&rsquo;re
        recorded — you can only mark them kept.
      </div>

      {!isContractDeployed && (
        <div className="rounded-lg border border-broken-dim bg-broken-dim px-4 py-3 text-xs text-broken">
          Said isn&rsquo;t deployed to {networkLabel} yet — set
          NEXT_PUBLIC_SAID_CONTRACT_ADDRESS after running the deploy script and this will
          start recording for real.
        </div>
      )}

      {(validationError || error) && (
        <p className="text-sm text-broken">{validationError ?? error}</p>
      )}

      <Button type="submit" disabled={isBusy} className="w-full sm:w-auto">
        {isBusy ? stageCopy[stage] ?? "working…" : "put it on record"}
      </Button>
    </form>
  );
}

function RecordedConfirmation({ id, onViewFeed }: { id: number; onViewFeed: () => void }) {
  return (
    <div className="flex flex-col items-start gap-6 py-10">
      <div>
        <p className="font-serif text-3xl text-ink">it&rsquo;s on record.</p>
        <p className="mt-2 text-sm text-ink-faint">No edits. No excuses.</p>
      </div>
      <div className="flex gap-3">
        <Link
          href={`/p/${id}`}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
        >
          view it
        </Link>
        <Button variant="secondary" onClick={onViewFeed}>
          back home
        </Button>
      </div>
    </div>
  );
}
