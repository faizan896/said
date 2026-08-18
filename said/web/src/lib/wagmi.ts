import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { monadMainnet, monadTestnetChain, supportedChains } from "./chain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Wallet connection is intentionally minimal: an injected-wallet connector
// (MetaMask, Rabby, Phantom EVM, etc.) covers desktop, and WalletConnect
// (only added if a project id is configured) covers mobile wallets and
// anyone without a browser extension. No RainbowKit/Web3Modal — the connect
// flow is a single small sheet we own, styled like the rest of the product.
//
// Both Monad networks are registered so that if someone's wallet is sitting
// on the wrong one, wagmi can recognise it and offer a clean switch rather
// than throwing an opaque chain-mismatch error.
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId, showQrModal: true })] : []),
  ],
  transports: {
    [monadMainnet.id]: http(monadMainnet.rpcUrls.default.http[0]),
    [monadTestnetChain.id]: http(monadTestnetChain.rpcUrls.default.http[0]),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
