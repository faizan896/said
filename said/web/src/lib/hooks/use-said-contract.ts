"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { SAID_ABI } from "@/lib/contracts/said-abi";
import { monadTestnet, SAID_CONTRACT_ADDRESS, isContractDeployed } from "@/lib/chain";
import { useWalletUI } from "@/components/wallet/wallet-ui-provider";

export type WriteStage =
  | "idle"
  | "connecting"
  | "switching-network"
  | "waiting-for-wallet"
  | "confirming"
  | "indexing"
  | "done"
  | "error";

// Maps Said.sol's custom revert errors to plain language. viem surfaces these
// as e.g. `... reverted with the following reason: AlreadyWitnessed(...)` —
// matching by name means we don't have to keep this in lockstep with exact
// wagmi/viem error formatting.
const CONTRACT_ERROR_COPY: Record<string, string> = {
  EmptyStatement: "Say something first.",
  StatementTooLong: "That's too long — keep it under 280 characters.",
  DeadlineNotInFuture: "Pick a deadline that's in the future.",
  DeadlineTooFar: "That deadline is too far out.",
  PromiseNotFound: "Couldn't find that promise.",
  NotPromiseCreator: "Only the person who made this promise can do that.",
  CannotWitnessOwnPromise: "You can't witness your own promise.",
  AlreadyWitnessed: "You've already witnessed this one.",
  PromiseNotActive:
    "This promise is past its deadline, so it can't be marked kept anymore — it's broken, on the record.",
  ProofTooLong: "That proof is too long — keep it under 512 characters.",
};

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  for (const [name, copy] of Object.entries(CONTRACT_ERROR_COPY)) {
    if (message.includes(name)) return copy;
  }

  if (/user rejected|denied/i.test(message)) return "You rejected the request in your wallet.";
  if (/insufficient funds/i.test(message)) return "Not enough MON to cover gas on Monad testnet.";
  if (/chain mismatch|does not match/i.test(message)) return "Your wallet is on the wrong network.";
  if (/network|fetch failed|rpc/i.test(message)) return "Couldn't reach Monad right now. Try again.";
  if (!isContractDeployed) return "Said isn't deployed to Monad testnet yet.";
  return "Something went wrong recording that. Try again.";
}

/** Shared plumbing for every write flow: connect if needed, switch to Monad
 * testnet if needed, send the tx, wait for it to confirm, then mirror the
 * resulting event into the index via `indexAfterConfirm`. */
function useSaidWrite() {
  const { requireWallet } = useWalletUI();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });

  const [stage, setStage] = useState<WriteStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const run = useCallback(
    async (
      sendTx: () => Promise<`0x${string}`>,
      indexAfterConfirm: (hash: `0x${string}`) => Promise<Response>
    ) => {
      setError(null);
      setStage("connecting");
      try {
        await requireWallet();

        if (chainId !== monadTestnet.id) {
          setStage("switching-network");
          await switchChainAsync({ chainId: monadTestnet.id });
        }

        setStage("waiting-for-wallet");
        const hash = await sendTx();
        setTxHash(hash);

        setStage("confirming");
        if (!publicClient) throw new Error("network");
        await publicClient.waitForTransactionReceipt({ hash });

        setStage("indexing");
        const res = await indexAfterConfirm(hash);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? "indexing failed");
        }

        setStage("done");
        return { hash, body };
      } catch (err) {
        setStage("error");
        setError(friendlyError(err));
        throw err;
      }
    },
    [requireWallet, chainId, switchChainAsync, publicClient]
  );

  return { run, stage, error, txHash, writeContractAsync };
}

export function useCreatePromise() {
  const write = useSaidWrite();

  const create = useCallback(
    async (input: { statement: string; deadline: Date; category: string }) => {
      const deadlineSeconds = BigInt(Math.floor(input.deadline.getTime() / 1000));
      const { body } = await write.run(
        () =>
          write.writeContractAsync({
            address: SAID_CONTRACT_ADDRESS as `0x${string}`,
            abi: SAID_ABI,
            functionName: "createPromise",
            args: [input.statement, deadlineSeconds],
          }),
        (hash) =>
          fetch("/api/promises", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash: hash, category: input.category }),
          })
      );
      return body.id as number;
    },
    [write]
  );

  return { create, stage: write.stage, error: write.error, txHash: write.txHash };
}

export function useWitnessPromise(promiseId: number) {
  const write = useSaidWrite();

  const witness = useCallback(
    () =>
      write.run(
        () =>
          write.writeContractAsync({
            address: SAID_CONTRACT_ADDRESS as `0x${string}`,
            abi: SAID_ABI,
            functionName: "witnessPromise",
            args: [BigInt(promiseId)],
          }),
        (hash) =>
          fetch(`/api/promises/${promiseId}/witness`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash: hash }),
          })
      ),
    [write, promiseId]
  );

  return { witness, stage: write.stage, error: write.error, txHash: write.txHash };
}

export function useCompletePromise(promiseId: number) {
  const write = useSaidWrite();

  const complete = useCallback(
    (proof: string) =>
      write.run(
        () =>
          write.writeContractAsync({
            address: SAID_CONTRACT_ADDRESS as `0x${string}`,
            abi: SAID_ABI,
            functionName: "completePromise",
            args: [BigInt(promiseId), proof],
          }),
        (hash) =>
          fetch(`/api/promises/${promiseId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash: hash }),
          })
      ),
    [write, promiseId]
  );

  return { complete, stage: write.stage, error: write.error, txHash: write.txHash };
}
