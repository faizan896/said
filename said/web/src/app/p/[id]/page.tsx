import { notFound } from "next/navigation";
import Link from "next/link";
import { getPromiseById, getWitnesses } from "@db/queries";
import { StatusBadge } from "@/components/ui/status-badge";
import { WitnessAvatars } from "@/components/promise/witness-avatars";
import { WitnessAction } from "@/components/promise/witness-action";
import { CompleteAction } from "@/components/promise/complete-action";
import { ShareRow } from "@/components/promise/share-row";
import { OnTheRecord } from "@/components/promise/on-the-record";
import {
  displayName,
  formatDate,
  daysLeftLabel,
  keptTimingLabel,
} from "@/lib/format";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const promise = await getPromiseById(Number(id));
  if (!promise) return { title: "said" };
  return {
    title: `"${promise.statement}" — said`,
    description: `${displayName(promise.creator_address, promise.creatorUsername)} said this on Said. ${promise.witnessCount} people witnessed it.`,
    openGraph: {
      images: [`/p/${id}/opengraph-image`],
    },
  };
}

export default async function PromisePage({ params }: Props) {
  const { id } = await params;
  const promiseId = Number(id);
  if (!Number.isInteger(promiseId)) notFound();

  const promise = await getPromiseById(promiseId);
  if (!promise) notFound();

  const witnesses = await getWitnesses(promiseId, 200);
  const name = displayName(promise.creator_address, promise.creatorUsername);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <p className="font-serif text-3xl leading-snug text-ink sm:text-4xl">
        {promise.statement}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-faint">
        <span>
          said by{" "}
          <Link href={`/u/${promise.creatorUsername ?? promise.creator_address}`} className="text-ink hover:underline">
            {name}
          </Link>
        </span>
        <span aria-hidden>·</span>
        <span>{formatDate(promise.created_at)}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <StatusBadge status={promise.status} />
        <span className="text-sm text-ink-faint">
          {promise.status === "ACTIVE" && `due ${formatDate(promise.deadline)} · ${daysLeftLabel(promise.deadline)}`}
          {promise.status === "BROKEN" && "you said you would."}
          {promise.status === "KEPT" &&
            promise.completed_at &&
            keptTimingLabel(promise.deadline, promise.completed_at)}
        </span>
      </div>

      {promise.status === "KEPT" && (promise.proof_url || promise.proof_note) && (
        <div className="mt-4 rounded-lg border border-kept-dim bg-kept-dim/40 px-4 py-3 text-sm text-ink">
          {promise.proof_url ? (
            <a href={promise.proof_url} target="_blank" rel="noreferrer" className="text-kept underline">
              {promise.proof_url}
            </a>
          ) : (
            <span>{promise.proof_note}</span>
          )}
        </div>
      )}

      <div className="mt-10 border-t border-line pt-6">
        <div
          className="text-sm text-ink"
          title={`${promise.witnessCount} people saw you say it.`}
        >
          {promise.witnessCount} {promise.witnessCount === 1 ? "person" : "people"} witnessed this
        </div>
        {witnesses.length > 0 && (
          <div className="mt-3">
            <WitnessAvatars addresses={witnesses.map((w) => w.witness_address)} total={promise.witnessCount} max={10} />
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <WitnessAction
            promiseId={promise.id}
            creatorAddress={promise.creator_address}
            witnessAddresses={witnesses.map((w) => w.witness_address)}
          />
          {promise.status === "ACTIVE" && (
            <CompleteAction promiseId={promise.id} creatorAddress={promise.creator_address} />
          )}
        </div>
      </div>

      <OnTheRecord promise={promise} />

      <ShareRow promise={promise} name={name} />
    </div>
  );
}
