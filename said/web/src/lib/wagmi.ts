import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { monadTestnet } from "./chain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Wallet connection is intentionally minimal: an injected-wallet connector
// (MetaMask, Rabby, Phantom EVM, etc.) covers desktop, and WalletConnect
// (only added if a project id is configured) covers mobile wallets and
// anyone without a browser extension. No RainbowKit/Web3Modal — the connect
// flow is a single small sheet we own, styled like the rest of the product.
export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId, showQrModal: true })] : []),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
