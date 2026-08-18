"use client";

import { useState } from "react";
import { formatShortDate } from "@/lib/format";
import type { PromiseWithMeta } from "@db/types";

export function ShareRow({ promise, name }: { promise: PromiseWithMeta; name: string }) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? `${window.location.origin}/p/${promise.id}` : "";
  const shareText = `"${promise.statement}" — ${name}, ${promise.witnessCount} witnesses. on the record on said.`;
  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="mt-10 flex items-center gap-4 border-t border-line pt-6 text-sm">
      <a
        href={tweetHref}
        target="_blank"
        rel="noreferrer"
        className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
      >
        share on X
      </a>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-ink-faint hover:text-ink"
      >
        {copied ? "copied" : "copy link"}
      </button>
      <span className="ml-auto text-xs text-ink-faint-2">due {formatShortDate(promise.deadline)}</span>
    </div>
  );
}
