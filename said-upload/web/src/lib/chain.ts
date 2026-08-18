import { monad, monadTestnet } from "viem/chains";
import { defineChain } from "viem";

/**
 * Said runs on Monad. Which network is picked by NEXT_PUBLIC_CHAIN so the
 * same codebase can point at mainnet or testnet without code changes — set
 * it to "testnet" for a free dry run, leave it unset (or "mainnet") for real.
 *
 * The base definitions come from viem so chain ids, explorers and default
 * RPCs stay correct as Monad's own config evolves; we only layer an optional
 * custom RPC on top for anyone on a private/partner endpoint.
 */
export const isTestnet = process.env.NEXT_PUBLIC_CHAIN === "testnet";

const rpcOverride = process.env.NEXT_PUBLIC_MONAD_RPC_URL;
const explorerOverride = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL;

/** Applies env overrides, but only to the network actually in use — an
 * override meant for mainnet must never silently repoint testnet. */
function configure<T extends typeof monad | typeof monadTestnet>(
  base: T,
  active: boolean
) {
  return defineChain({
    ...base,
    rpcUrls: {
      default: {
        http: [
          (active && rpcOverride) || base.rpcUrls.default.http[0],
        ],
      },
    },
    blockExplorers: {
      default: {
        name: base.blockExplorers.default.name,
        url: (active && explorerOverride) || base.blockExplorers.default.url,
      },
    },
  });
}

export const monadMainnet = configure(monad, !isTestnet);
export const monadTestnetChain = configure(monadTestnet, isTestnet);

/** The network this deployment of Said actually talks to. */
export const saidChain = isTestnet ? monadTestnetChain : monadMainnet;

/** Both networks, active one first — wagmi needs every chain it might see
 * registered so it can offer to switch when a wallet is on the wrong one.
 * Typed as a non-empty tuple because that's what wagmi's `chains` requires. */
export const supportedChains: readonly [
  typeof monadMainnet | typeof monadTestnetChain,
  ...(typeof monadMainnet | typeof monadTestnetChain)[],
] = isTestnet
  ? [monadTestnetChain, monadMainnet]
  : [monadMainnet, monadTestnetChain];

export const SAID_CONTRACT_ADDRESS = (process.env
  .NEXT_PUBLIC_SAID_CONTRACT_ADDRESS || "") as `0x${string}` | "";

export const isContractDeployed = SAID_CONTRACT_ADDRESS.length > 0;

/** "Monad" or "Monad testnet" — used in copy so we never tell someone on
 * mainnet that they need testnet MON. */
export const networkLabel = isTestnet ? "Monad testnet" : "Monad";
