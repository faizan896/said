import Link from "next/link";
import { listRecentPromises } from "@db/queries";
import { PromiseCard } from "@/components/promise/promise-card";

// The feed must reflect promises made seconds ago, so never serve a
// build-time snapshot of it.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const feed = await listRecentPromises(25);

  return (
    <div>
      {/* The first screen is the painting. The only things laid on top of it
          are the line and the two ways in — everything else waits below. */}
      {/* Centred at the foot of the frame, like a title card — so the wall,
          the woman pinning her note and the road all stay unobscured. */}
      <section className="mx-auto flex min-h-[calc(100svh-5rem)] max-w-3xl flex-col items-center justify-end px-4 pb-32 text-center sm:px-6 sm:pb-16">
        <p className="on-art font-serif text-[2.6rem] leading-[1.1] sm:text-6xl">
          you said you&rsquo;d do it.
        </p>
        <p className="on-art mt-4 max-w-md text-sm sm:text-base">
          Say it out loud, on-chain. Other people witness it. Later you either kept your word
          or you didn&rsquo;t &mdash; and either way, it stays on the record.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/new"
            className="rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink shadow-lg shadow-black/30 transition hover:bg-white"
          >
            make a promise
          </Link>
          <Link
            href="/explore"
            className="chip rounded-full px-6 py-3 text-sm text-paper/85 transition hover:text-paper"
          >
            explore
          </Link>
        </div>
      </section>

      {/* Below the fold, the wall itself. */}
      <section className="mx-auto max-w-2xl px-3 pb-6 sm:px-6">
        <div className="sheet px-5 py-6 sm:px-8 sm:py-8">
          <h2 className="mb-2 font-serif text-xl text-ink">on the record</h2>
          {feed.length === 0 ? (
            <p className="py-8 text-sm text-ink-faint">nothing said yet.</p>
          ) : (
            <div>
              {feed.map((p) => (
                <PromiseCard key={p.id} promise={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
