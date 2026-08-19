import {
  listHappeningNow,
  listMostWitnessed,
  listRecentlyKept,
  listInteresting,
} from "@db/queries";
import { PromiseCardCompact } from "@/components/promise/promise-card";
import type { PromiseWithMeta } from "@db/types";

export const metadata = { title: "explore — said" };

// Same reasoning as the landing feed: always read live.
export const dynamic = "force-dynamic";

function Section({ title, promises }: { title: string; promises: PromiseWithMeta[] }) {
  if (promises.length === 0) return null;
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-serif text-xl text-ink">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {promises.map((p) => (
          <PromiseCardCompact key={p.id} promise={p} />
        ))}
      </div>
    </section>
  );
}

export default async function ExplorePage() {
  const [happeningNow, mostWitnessed, keptTheirWord, interesting] = await Promise.all([
    listHappeningNow(6),
    listMostWitnessed(6),
    listRecentlyKept(6),
    listInteresting(6),
  ]);

  const nothingAtAll =
    happeningNow.length === 0 &&
    mostWitnessed.length === 0 &&
    keptTheirWord.length === 0 &&
    interesting.length === 0;

  return (
    <div className="sheet mx-3 mt-2 mb-8 sm:mx-auto sm:mt-6 max-w-3xl px-5 py-8 sm:px-10 sm:py-12">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">explore</h1>
      <p className="mt-2 text-sm text-ink-faint">what people are putting on the record.</p>

      <div className="mt-10">
        {nothingAtAll ? (
          <p className="py-10 text-sm text-ink-faint">nothing said yet.</p>
        ) : (
          <>
            <Section title="happening now" promises={happeningNow} />
            <Section title="most witnessed" promises={mostWitnessed} />
            <Section title="kept their word" promises={keptTheirWord} />
            <Section title="they said WHAT?" promises={interesting} />
          </>
        )}
      </div>
    </div>
  );
}
