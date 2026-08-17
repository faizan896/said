"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useAccount, useConnect } from "wagmi";
import type { Address } from "viem";
import { ConnectSheet } from "./connect-sheet";

interface WalletUIContextValue {
  /** Resolves with the connected address, prompting a connect sheet first if
   * needed. Rejects if the user closes the sheet without connecting. This is
   * the only way the app should ask someone to connect — never on load. */
  requireWallet: () => Promise<Address>;
}

const WalletUIContext = createContext<WalletUIContextValue | null>(null);

export function useWalletUI() {
  const ctx = useContext(WalletUIContext);
  if (!ctx) throw new Error("useWalletUI must be used within WalletUIProvider");
  return ctx;
}

export function WalletUIProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const [sheetOpen, setSheetOpen] = useState(false);
  const resolverRef = useRef<{
    resolve: (address: Address) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const requireWallet = useCallback((): Promise<Address> => {
    if (isConnected && address) {
      return Promise.resolve(address);
    }
    setSheetOpen(true);
    return new Promise((resolve, reject) => {
      resolverRef.current = { resolve, reject };
    });
  }, [isConnected, address]);

  const handleConnect = useCallback(
    async (connectorId: string) => {
      const connector = connectors.find((c) => c.id === connectorId);
      if (!connector) return;
      try {
        const result = await connectAsync({ connector });
        setSheetOpen(false);
        resolverRef.current?.resolve(result.accounts[0]);
        resolverRef.current = null;
      } catch (err) {
        // user rejected in wallet, or connector error — surface via sheet, don't reject yet
        throw err;
      }
    },
    [connectAsync, connectors]
  );

  const handleClose = useCallback(() => {
    setSheetOpen(false);
    resolverRef.current?.reject(new Error("Wallet connection cancelled."));
    resolverRef.current = null;
  }, []);

  return (
    <WalletUIContext.Provider value={{ requireWallet }}>
      {children}
      <ConnectSheet
        open={sheetOpen}
        connectors={connectors}
        onConnect={handleConnect}
        onClose={handleClose}
      />
    </WalletUIContext.Provider>
  );
}
