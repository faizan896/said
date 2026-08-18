"use client";

import { useState } from "react";
import type { Connector } from "wagmi";

interface ConnectSheetProps {
  open: boolean;
  connectors: readonly Connector[];
  onConnect: (connectorId: string) => Promise<void>;
  onClose: () => void;
}

/** wagmi names the generic injected connector "Injected", which means nothing
 * to a normal person. When a wallet is actually installed it reports its real
 * name (MetaMask, Rabby…); when it isn't, we hide the option entirely rather
 * than offering a button that can't work. */
function connectorLabel(connector: Connector): string {
  if (connector.name === "Injected") return "Browser wallet";
  return connector.name;
}

function hasInjectedProvider(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as { ethereum?: unknown }).ethereum !== "undefined";
}

export function ConnectSheet({ open, connectors, onConnect, onClose }: ConnectSheetProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // This only ever renders after a click, so touching `window` is safe —
  // it never runs during SSR.
  if (!open) return null;

  const usable = connectors.filter((c) => {
    if (c.type === "injected" || c.id === "injected") return hasInjectedProvider();
    return true;
  });

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

        {usable.length === 0 ? (
          <NoWalletFound />
        ) : (
          <div className="flex flex-col gap-2">
            {usable.map((connector) => (
              <button
                key={connector.id}
                onClick={() => handleClick(connector)}
                disabled={pendingId !== null}
                className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-left text-sm text-ink transition hover:border-ink disabled:opacity-50"
              >
                <span>{connectorLabel(connector)}</span>
                {pendingId === connector.id && (
                  <span className="text-xs text-ink-faint">confirm in wallet…</span>
                )}
              </button>
            ))}
          </div>
        )}

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

function NoWalletFound() {
  return (
    <div className="rounded-lg border border-line bg-paper-dim px-4 py-3 text-sm text-ink-faint">
      <p className="text-ink">No wallet found in this browser.</p>
      <p className="mt-1">
        Install{" "}
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="text-ink underline underline-offset-2"
        >
          MetaMask
        </a>{" "}
        (or any Ethereum wallet), then come back and try again.
      </p>
    </div>
  );
}
