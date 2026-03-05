"use client";

import { createContext, useContext, ReactNode } from 'react';
import { NetworkId, NETWORK_CONFIGS, DEFAULT_NETWORK, ContractAddresses } from '@/config/networks';
import { useAccount } from 'wagmi';

interface NetworkContextType {
  activeNetwork: NetworkId;
  contracts: ContractAddresses;
  networkConfig: typeof NETWORK_CONFIGS[NetworkId];
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { chain } = useAccount();

  // Determine active network based on connected chain
  const activeNetwork: NetworkId = (() => {
    if (!chain) return DEFAULT_NETWORK;

    // Match chain ID to network
    if (chain.id === NETWORK_CONFIGS.arc.id) return 'arc';
    if (chain.id === NETWORK_CONFIGS.monad.id) return 'monad';

    return DEFAULT_NETWORK;
  })();

  const value: NetworkContextType = {
    activeNetwork,
    contracts: NETWORK_CONFIGS[activeNetwork].contracts,
    networkConfig: NETWORK_CONFIGS[activeNetwork],
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
