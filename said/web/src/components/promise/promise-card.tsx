import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { displayName, saidAgo, daysLeftLabel, shortenAddress } from "@/lib/format";
import type { PromiseWithMeta } from "@db/types";

export function PromiseCard({ promise }: { promise: PromiseWithMeta }) {
  const name = displayName(promise.creator_address, promise.creatorUsername);

  return (
    <Link
      href={`/p/${promise.id}`}
      className="group block border-b border-line py-6 transition-colors first:pt-0 hover:bg-paper-dim/60 -mx-4 px-4"
    >
      <p className="font-serif text-xl leading-snug text-ink sm:text-2xl">
        {promise.statement}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
        <span className="text-ink">{name}</span>
        <span aria-hidden>·</span>
        <span>
          {promise.status === "ACTIVE"
            ? daysLeftLabel(promise.deadline)
            : `said ${saidAgo(promise.created_at)}`}
        </span>
        <span aria-hidden>·</span>
        <span title={`${promise.witnessCount} people saw you say it.`}>
          {promise.witnessCount} witness{promise.witnessCount === 1 ? "" : "es"}
        </span>
        <span className="ml-auto">
          <StatusBadge status={promise.status} />
        </span>
      </div>
    </Link>
  );
}

export function PromiseCardCompact({ promise }: { promise: PromiseWithMeta }) {
  const name = displayName(promise.creator_address, promise.creatorUsername) || shortenAddress(promise.creator_address);
  return (
    <Link
      href={`/p/${promise.id}`}
      className="block rounded-xl border border-line p-4 transition-colors hover:border-ink"
    >
      <p className="font-serif text-lg leading-snug text-ink">{promise.statement}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
        <span>{name}</span>
        <StatusBadge status={promise.status} />
      </div>
      <div className="mt-1 text-xs text-ink-faint">{promise.witnessCount} witnesses</div>
    </Link>
  );
}
