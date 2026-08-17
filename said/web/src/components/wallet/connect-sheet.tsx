"use client";

import { useState } from "react";
import type { Connector } from "wagmi";

interface ConnectSheetProps {
  open: boolean;
  connectors: readonly Connector[];
  onConnect: (connectorId: string) => Promise<void>;
  onClose: () => void;
}

export function ConnectSheet({ open, connectors, onConnect, onClose }: ConnectSheetProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleClick = async (connector: Connector) => {
    setError(null);
    setPendingId(connector.id);
    try {
      await onConnect(connector.id);
    } catch {
      setError("Connection was cancelled or rejected.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl border border-line bg-paper p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-sm font-medium tracking-tight text-ink">
          connect a wallet
        </div>
        <p className="mb-5 text-sm text-ink-faint">
          You&rsquo;ll need this to put something on the record.
        </p>

        <div className="flex flex-col gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleClick(connector)}
              disabled={pendingId !== null}
              className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-left text-sm text-ink transition hover:border-ink disabled:opacity-50"
            >
              <span>{connector.name}</span>
              {pendingId === connector.id && (
                <span className="text-xs text-ink-faint">confirm in wallet…</span>
              )}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-broken">{error}</p>}

        <button
          onClick={onClose}
          className="mt-5 w-full text-center text-sm text-ink-faint hover:text-ink"
        >
          not now
        </button>
      </div>
    </div>
  );
}
