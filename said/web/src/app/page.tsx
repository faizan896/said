import Link from "next/link";
import { listRecentPromises } from "@db/queries";
import { PromiseCard } from "@/components/promise/promise-card";
import { Wordmark } from "@/components/ui/wordmark";

// The feed must reflect promises made seconds ago, so never serve a
// build-time snapshot of it.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const feed = await listRecentPromises(25);

  return (
    <div className="mx-auto max-w-2xl px-4">
      <section className="flex flex-col items-start gap-6 py-14 sm:py-20">
        <Wordmark size="lg" className="pointer-events-none" />
        <p className="font-serif text-2xl text-ink sm:text-3xl">you said you&rsquo;d do it.</p>
        <div className="flex items-center gap-5">
          <Link
            href="/new"
            className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            make a promise
          </Link>
          <Link
            href="/explore"
            className="text-sm text-ink-faint underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink"
          >
            explore
          </Link>
        </div>
      </section>

      <section className="border-t border-line py-8">
        {feed.length === 0 ? (
          <p className="py-10 text-sm text-ink-faint">nothing said yet.</p>
        ) : (
          <div>
            {feed.map((p) => (
              <PromiseCard key={p.id} promise={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
