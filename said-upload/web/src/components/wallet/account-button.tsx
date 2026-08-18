"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { shortenAddress } from "@/lib/format";
import { useProfileUsername } from "@/lib/hooks/use-profile-username";
import { useWalletUI } from "./wallet-ui-provider";

export function AccountButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { requireWallet } = useWalletUI();
  const [open, setOpen] = useState(false);
  const username = useProfileUsername(address);

  if (!isConnected || !address) {
    // Deliberately quiet — no loud "CONNECT WALLET" call to action, since you
    // can read the whole site without a wallet. But it IS clickable, so anyone
    // who wants to connect up front has an obvious way to, instead of having
    // to guess that it happens somewhere inside the composer.
    return (
      <button
        onClick={() => {
          requireWallet().catch(() => {
            /* user closed the sheet — nothing to do */
          });
        }}
        className="text-xs text-ink-faint-2 underline decoration-transparent underline-offset-4 transition hover:text-ink hover:decoration-line-strong"
      >
        connect
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-ink"
      >
        {username ?? shortenAddress(address)}
      </button>
      {open && (
        <div
          className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-lg border border-line bg-paper shadow-sm"
          onMouseLeave={() => setOpen(false)}
        >
          <Link
            href={`/u/${username ?? address}`}
            className="block px-4 py-2.5 text-sm text-ink hover:bg-paper-dim"
            onClick={() => setOpen(false)}
          >
            your profile
          </Link>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-ink-faint hover:bg-paper-dim hover:text-ink"
          >
            disconnect
          </button>
        </div>
      )}
    </div>
  );
}
