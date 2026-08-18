import { notFound } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { getProfileStats, listByCreator, resolveProfileHandle } from "@db/queries";
import { displayName, formatDate, saidAgo, daysLeftLabel } from "@/lib/format";
import type { PromiseStatus } from "@db/types";

interface Props {
  params: Promise<{ wallet: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "all" },
  { value: "active", label: "active" },
  { value: "kept", label: "kept" },
  { value: "broken", label: "broken" },
];

const statusIcon: Record<PromiseStatus, string> = {
  KEPT: "✓",
  ACTIVE: "○",
  BROKEN: "✕",
};
const statusColor: Record<PromiseStatus, string> = {
  KEPT: "text-kept",
  ACTIVE: "text-ink-faint-2",
  BROKEN: "text-broken",
};

export default async function ProfilePage({ params, searchParams }: Props) {
  const { wallet } = await params;
  const { tab = "all" } = await searchParams;

  const address = await resolveProfileHandle(wallet.toLowerCase());
  if (!address) notFound();

  const stats = await getProfileStats(address);
  const filter =
    tab === "active" ? "ACTIVE" : tab === "kept" ? "KEPT" : tab === "broken" ? "BROKEN" : undefined;
  const promises = await listByCreator(address, filter);
  const name = displayName(address, stats.username);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{name}</h1>
      {stats.joinedAt && (
        <p className="mt-1 text-sm text-ink-faint">Joined {formatDate(stats.joinedAt)}</p>
      )}

      <div className="mt-8 border-y border-line py-6">
        <div className="font-serif text-2xl text-ink">
          {stats.total} said
        </div>
        <div className="mt-1 text-sm text-ink-faint">
          {stats.kept} kept · {stats.broken} broken · {stats.active} active
        </div>
        <div className="mt-3 text-4xl font-semibold tracking-tight text-ink">
          {stats.keptPct === null ? "—" : `${stats.keptPct}%`}{" "}
          <span className="text-base font-normal text-ink-faint">kept</span>
        </div>
      </div>

      <nav className="mt-6 flex gap-5 border-b border-line text-sm">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "all" ? `/u/${wallet}` : `/u/${wallet}?tab=${t.value}`}
            className={clsx(
              "-mb-px border-b-2 pb-2.5 pt-1",
              tab === t.value ? "border-ink text-ink" : "border-transparent text-ink-faint hover:text-ink"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {promises.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          promises.map((p) => (
            <Link
              key={p.id}
              href={`/p/${p.id}`}
              className="-mx-4 flex items-start gap-3 border-b border-line px-4 py-5 hover:bg-paper-dim/60"
            >
              <span className={clsx("mt-1 text-sm", statusColor[p.status])}>{statusIcon[p.status]}</span>
              <div className="flex-1">
                <p className="font-serif text-lg leading-snug text-ink">{p.statement}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
                  <span className={clsx("font-medium uppercase tracking-wide", statusColor[p.status])}>
                    {p.status.toLowerCase()}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {p.status === "ACTIVE"
                      ? daysLeftLabel(p.deadline)
                      : p.status === "BROKEN"
                        ? "you said you would"
                        : `said ${saidAgo(p.created_at)}`}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{p.witnessCount} witnesses</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const copy: Record<string, string> = {
    all: "nothing said yet.",
    active: "nothing to prove right now.",
    kept: "nothing kept yet — but there's still time.",
    broken: "clean record so far.",
  };
  return <p className="py-10 text-sm text-ink-faint">{copy[tab] ?? copy.all}</p>;
}
