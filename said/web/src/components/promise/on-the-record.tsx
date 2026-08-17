import { formatDate, shortTxHash } from "@/lib/format";
import { monadTestnet } from "@/lib/chain";
import type { PromiseWithMeta } from "@db/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-b-0">
      <span className="text-ink-faint">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

export function OnTheRecord({ promise }: { promise: PromiseWithMeta }) {
  const explorerBase = monadTestnet.blockExplorers?.default.url;
  const txUrl = explorerBase ? `${explorerBase}/tx/${promise.create_tx_hash}` : undefined;

  return (
    <div className="mt-12 border-t border-line pt-6">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint-2">
        On the record
      </div>
      <Row label="Created" value={formatDate(promise.created_at)} />
      <Row label="Deadline" value={formatDate(promise.deadline)} />
      <Row label="Network" value="Monad" />
      <Row
        label="Transaction"
        value={
          txUrl ? (
            <a href={txUrl} target="_blank" rel="noreferrer" className="underline hover:text-ink">
              {shortTxHash(promise.create_tx_hash)}
            </a>
          ) : (
            shortTxHash(promise.create_tx_hash)
          )
        }
      />
    </div>
  );
}
