import { monadTestnet as viemMonadTestnet } from "viem/chains";
import { defineChain } from "viem";

// Wrap viem's built-in Monad Testnet definition so a custom RPC URL from env
// (useful if you're on a private/partner endpoint) is respected everywhere.
export const monadTestnet = defineChain({
  ...viemMonadTestnet,
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || viemMonadTestnet.rpcUrls.default.http[0]],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url:
        process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ||
        viemMonadTestnet.blockExplorers.default.url,
    },
  },
});

export const SAID_CONTRACT_ADDRESS = (process.env
  .NEXT_PUBLIC_SAID_CONTRACT_ADDRESS || "") as `0x${string}` | "";

export const isContractDeployed = SAID_CONTRACT_ADDRESS.length > 0;
