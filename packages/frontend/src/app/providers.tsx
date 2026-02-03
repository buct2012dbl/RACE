"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, arbitrum } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

// Define custom chains
const arcTestnet = {
  id: 1234, // Replace with actual Arc testnet chain ID
  name: "Arc Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.arc.testnet"] },
    public: { http: ["https://rpc.arc.testnet"] },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://explorer.arc.testnet" },
  },
  testnet: true,
};

const monadTestnet = {
  id: 5678, // Replace with actual Monad testnet chain ID
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MONAD", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.testnet"] },
    public: { http: ["https://rpc.monad.testnet"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://explorer.monad.testnet" },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: "RACE Protocol",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [mainnet, arbitrum, arcTestnet as any, monadTestnet as any],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
