import "server-only";
import { createPublicClient, http, decodeEventLog, getAddress, type Hash } from "viem";
import { monadTestnet, SAID_CONTRACT_ADDRESS, isContractDeployed } from "@/lib/chain";
import { SAID_ABI } from "@/lib/contracts/said-abi";

/**
 * The chain is the source of truth. Rather than trusting whatever a client
 * POSTs after submitting a transaction, every write to the index re-reads
 * the actual event log from the confirmed transaction and indexes *that*.
 * A client can only ever get its own data indexed for a transaction it can
 * prove happened (a valid tx hash emitting the expected event, on our
 * contract) — it can't fabricate someone else's promise or witness.
 */

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

class ChainVerificationError extends Error {}

function assertDeployed() {
  if (!isContractDeployed) {
    throw new ChainVerificationError(
      "Said isn't deployed to Monad testnet yet — set NEXT_PUBLIC_SAID_CONTRACT_ADDRESS after running the deploy script."
    );
  }
}

async function getVerifiedLog(txHash: Hash, eventName: string) {
  assertDeployed();

  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new ChainVerificationError("Transaction did not succeed on-chain.");
  }
  if (getAddress(receipt.to ?? "0x0") !== getAddress(SAID_CONTRACT_ADDRESS)) {
    throw new ChainVerificationError("Transaction was not sent to the Said contract.");
  }

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: SAID_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === eventName) {
        return { decoded, blockNumber: receipt.blockNumber };
      }
    } catch {
      // not a Said event, or doesn't match this ABI entry — skip
    }
  }

  throw new ChainVerificationError(`Expected a ${eventName} event, but didn't find one.`);
}

export async function verifyPromiseCreated(txHash: Hash) {
  const { decoded } = await getVerifiedLog(txHash, "PromiseCreated");
  const args = decoded.args as unknown as {
    id: bigint;
    creator: string;
    statement: string;
    createdAt: bigint;
    deadline: bigint;
  };
  return {
    id: Number(args.id),
    creatorAddress: args.creator.toLowerCase(),
    statement: args.statement,
    createdAt: new Date(Number(args.createdAt) * 1000).toISOString(),
    deadline: new Date(Number(args.deadline) * 1000).toISOString(),
    createTxHash: txHash,
  };
}

export async function verifyPromiseWitnessed(txHash: Hash) {
  const { decoded } = await getVerifiedLog(txHash, "PromiseWitnessed");
  const args = decoded.args as unknown as { id: bigint; witness: string; timestamp: bigint };
  return {
    promiseId: Number(args.id),
    witnessAddress: args.witness.toLowerCase(),
    witnessedAt: new Date(Number(args.timestamp) * 1000).toISOString(),
    txHash,
  };
}

export async function verifyPromiseCompleted(txHash: Hash) {
  const { decoded } = await getVerifiedLog(txHash, "PromiseCompleted");
  const args = decoded.args as unknown as {
    id: bigint;
    creator: string;
    proofURI: string;
    completedAt: bigint;
  };
  return {
    id: Number(args.id),
    creatorAddress: args.creator.toLowerCase(),
    proofURI: args.proofURI,
    completedAt: new Date(Number(args.completedAt) * 1000).toISOString(),
    completeTxHash: txHash,
  };
}

export { ChainVerificationError };
