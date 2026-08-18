"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { useWalletUI } from "@/components/wallet/wallet-ui-provider";
import { SAID_ABI } from "@/lib/contracts/said-abi";
import bytecodeJson from "@/lib/contracts/Said.bytecode.json";
import {
  saidChain,
  networkLabel,
  isTestnet,
  SAID_CONTRACT_ADDRESS,
  isContractDeployed,
} from "@/lib/chain";
import { shortenAddress } from "@/lib/format";

const BYTECODE = bytecodeJson.bytecode as `0x${string}`;

type Stage =
  | "idle"
  | "connecting"
  | "switching"
  | "confirm"
  | "deploying"
  | "saving"
  | "done"
  | "error";

export function DeployPanel() {
  const { requireWallet } = useWalletUI();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: saidChain.id });

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [savedToEnv, setSavedToEnv] = useState(false);

  const busy = !["idle", "error", "done"].includes(stage);

  async function handleDeploy() {
    setError(null);
    try {
      setStage("connecting");
      await requireWallet();

      if (chainId !== saidChain.id) {
        setStage("switching");
        await switchChainAsync({ chainId: saidChain.id });
      }

      // Re-read the wallet client after any chain switch.
      const wc = walletClient;
      if (!wc) throw new Error("Wallet not ready — try again in a second.");
      if (!publicClient) throw new Error("Can't reach the network right now.");

      setStage("confirm");
      const hash = await wc.deployContract({
        abi: SAID_ABI,
        bytecode: BYTECODE,
        args: [],
        chain: saidChain,
        account: wc.account,
      });
      setTxHash(hash);

      setStage("deploying");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) {
        throw new Error("Deployment confirmed but returned no contract address.");
      }
      setDeployed(receipt.contractAddress);

      // Write the address into .env.local so a dev-server restart picks it up
      // automatically. Best-effort — if it fails you can still copy/paste.
      setStage("saving");
      try {
        const res = await fetch("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: receipt.contractAddress,
            chainId: saidChain.id,
          }),
        });
        setSavedToEnv(res.ok);
      } catch {
        setSavedToEnv(false);
      }

      setStage("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/user rejected|denied/i.test(msg)) setError("You rejected it in your wallet.");
      else if (/insufficient funds/i.test(msg))
        setError(`Not enough MON in this wallet to cover gas on ${networkLabel}.`);
      else setError(msg);
      setStage("error");
    }
  }

  if (isContractDeployed && !deployed) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl text-ink">already deployed.</h1>
        <p className="text-sm text-ink-faint">
          Said is pointed at{" "}
          <code className="text-ink">{shortenAddress(SAID_CONTRACT_ADDRESS, 6)}</code> on{" "}
          {networkLabel}. Clear NEXT_PUBLIC_SAID_CONTRACT_ADDRESS in web/.env if you want to
          deploy a fresh copy.
        </p>
      </div>
    );
  }

  if (stage === "done" && deployed) {
    return <Success address={deployed} txHash={txHash} savedToEnv={savedToEnv} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl text-ink">put said on-chain.</h1>
        <p className="mt-2 text-sm text-ink-faint">
          This deploys the Said contract using the wallet in your browser. No private key
          goes into a file, and nothing leaves your machine except the transaction itself.
        </p>
      </div>

      <dl className="border-y border-line">
        <Row label="Network" value={`${saidChain.name} (chain ${saidChain.id})`} />
        <Row label="Contract" value="Said.sol" />
        <Row label="Size" value={`${Math.round(BYTECODE.length / 2 / 1024)} KB`} />
        <Row
          label="Wallet"
          value={address ? shortenAddress(address, 6) : "not connected yet"}
        />
      </dl>

      {!isTestnet && (
        <div className="rounded-lg border border-broken-dim bg-broken-dim px-4 py-3 text-xs text-broken">
          This is <strong>Monad mainnet</strong> — it costs real MON and can&rsquo;t be undone.
          To rehearse for free first, set <code>NEXT_PUBLIC_CHAIN=testnet</code> in web/.env,
          restart the dev server, and come back here.
        </div>
      )}

      {error && <p className="text-sm text-broken">{error}</p>}

      <Button onClick={handleDeploy} disabled={busy} className="w-full sm:w-auto">
        {stage === "idle" || stage === "error" ? "deploy said" : stageCopy[stage]}
      </Button>

      {txHash && stage !== "done" && (
        <p className="text-xs text-ink-faint">
          tx sent — waiting for confirmation…{" "}
          <ExplorerLink path={`tx/${txHash}`}>view</ExplorerLink>
        </p>
      )}
    </div>
  );
}

const stageCopy: Record<string, string> = {
  connecting: "connecting wallet…",
  switching: "switching network…",
  confirm: "confirm in your wallet…",
  deploying: "deploying…",
  saving: "saving address…",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-b-0">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function ExplorerLink({ path, children }: { path: string; children: React.ReactNode }) {
  const base = saidChain.blockExplorers?.default.url;
  if (!base) return <>{children}</>;
  return (
    <a
      href={`${base}/${path}`}
      target="_blank"
      rel="noreferrer"
      className="text-ink underline underline-offset-2"
    >
      {children}
    </a>
  );
}

function Success({
  address,
  txHash,
  savedToEnv,
}: {
  address: string;
  txHash: string | null;
  savedToEnv: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-3xl text-ink">it&rsquo;s on chain.</h1>
        <p className="mt-2 text-sm text-ink-faint">
          Said is live on {networkLabel}.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-paper-dim px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-ink-faint-2">
          Contract address
        </div>
        <code className="mt-1 block break-all text-sm text-ink">{address}</code>
        <div className="mt-2 flex gap-4 text-xs">
          <ExplorerLink path={`address/${address}`}>view contract</ExplorerLink>
          {txHash && <ExplorerLink path={`tx/${txHash}`}>view transaction</ExplorerLink>}
        </div>
      </div>

      {savedToEnv ? (
        <div className="rounded-lg border border-kept-dim bg-kept-dim/40 px-4 py-3 text-sm text-ink">
          Saved to <code>web/.env.local</code>. Restart the dev server
          (<code>Ctrl+C</code>, then <code>npm run dev</code>) and the whole app is live on
          {" "}{networkLabel}.
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-paper-dim px-4 py-3 text-sm text-ink">
          <p className="mb-2 text-ink-faint">
            Couldn&rsquo;t write the file automatically — add this to{" "}
            <code>web/.env</code> yourself, then restart the dev server:
          </p>
          <code className="block break-all text-xs">
            NEXT_PUBLIC_SAID_CONTRACT_ADDRESS={address}
          </code>
        </div>
      )}

      <p className="text-xs text-ink-faint">
        Optional but worth doing: verify the source so anyone can read what they&rsquo;re
        trusting — <code>cd contracts && npx hardhat verify --network monad {address}</code>
      </p>
    </div>
  );
}
