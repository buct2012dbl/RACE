export type NetworkId = 'monad' | 'arc';

export interface ContractAddresses {
  RWAVault: `0x${string}`;
  AIAgent: `0x${string}`;
  Controller: `0x${string}`;
  RiskManager: `0x${string}`;
  USDC: `0x${string}`;
  RWAToken: `0x${string}`;
  LendingPool: `0x${string}`;
  SimpleDEX: `0x${string}`;
  WETH: `0x${string}`;
  WBTC: `0x${string}`;
}

export interface NetworkConfig {
  id: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer?: string;
  contracts: ContractAddresses;
}

export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  monad: {
    id: 10143,
    name: 'Monad Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz/',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MONAD',
      decimals: 18,
    },
    blockExplorer: 'https://explorer.monad.testnet',
    contracts: {
      RWAVault: (process.env.NEXT_PUBLIC_MONAD_RWA_VAULT_ADDRESS || '0xcca23BdcA726Af2505E81c829c2D2765B747704E') as `0x${string}`,
      AIAgent: (process.env.NEXT_PUBLIC_MONAD_AI_AGENT_ADDRESS || '0xd4ADBf2A154d2a5dcE84B0A71E58d683fE4CaF85') as `0x${string}`,
      Controller: (process.env.NEXT_PUBLIC_MONAD_CONTROLLER_ADDRESS || '0x0786F76D1491AaE0bbA641284509Dbf6D2DD055d') as `0x${string}`,
      RiskManager: (process.env.NEXT_PUBLIC_MONAD_RISK_MANAGER_ADDRESS || '0x10151441D949801D04028c3B35A61a6C1Bd5C6d5') as `0x${string}`,
      USDC: (process.env.NEXT_PUBLIC_MONAD_USDC_ADDRESS || '0xCC4b2A63DDf0fa7218163Ef5bbaE02145802C52C') as `0x${string}`,
      RWAToken: (process.env.NEXT_PUBLIC_MONAD_RWA_TOKEN_ADDRESS || '0x98Ac52b43A4B02a44Ae0272B3c2F798020966D6E') as `0x${string}`,
      LendingPool: (process.env.NEXT_PUBLIC_MONAD_LENDING_POOL_ADDRESS || '0xCafd467ee0E137b3d7A28b8435Dbbf1598ab0F75') as `0x${string}`,
      SimpleDEX: (process.env.NEXT_PUBLIC_MONAD_SIMPLE_DEX_ADDRESS || '0xDf3d196F931C3FF628508f8d2628548D4233Fa33') as `0x${string}`,
      WETH: (process.env.NEXT_PUBLIC_MONAD_WETH_ADDRESS || '0xc491ACDba51588012fa04cCfED5b52fA2bBb0814') as `0x${string}`,
      WBTC: (process.env.NEXT_PUBLIC_MONAD_WBTC_ADDRESS || '0xb8Bb7e78B21B0d6b5507841A4a1e83ffC7048408') as `0x${string}`,
    },
  },
  arc: {
    id: 5042002,
    name: 'Arc Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://explorer.arc.testnet',
    contracts: {
      RWAVault: (process.env.NEXT_PUBLIC_ARC_RWA_VAULT_ADDRESS || '0x42c168F005161F3BBf9F2eB8D4F9f253332556C3') as `0x${string}`,
      AIAgent: (process.env.NEXT_PUBLIC_ARC_AI_AGENT_ADDRESS || '0xDEe535cF20a05A5Ac8099Ce3612396C3E7C9586f') as `0x${string}`,
      Controller: (process.env.NEXT_PUBLIC_ARC_CONTROLLER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      RiskManager: (process.env.NEXT_PUBLIC_ARC_RISK_MANAGER_ADDRESS || '0x31fBDe7eDe13D37a4888aF43e3B36106Ec06F90c') as `0x${string}`,
      USDC: (process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || '0xfC40492859281e332abb84537398acF1FFc24560') as `0x${string}`,
      RWAToken: (process.env.NEXT_PUBLIC_ARC_RWA_TOKEN_ADDRESS || '0xcbc68a505be3Eb3bca598CA3E1B68a6Fbcdd2cF2') as `0x${string}`,
      LendingPool: (process.env.NEXT_PUBLIC_ARC_LENDING_POOL_ADDRESS || '0x6bec256464AD5f994a154A4210510E86a0833b19') as `0x${string}`,
      SimpleDEX: (process.env.NEXT_PUBLIC_ARC_SIMPLE_DEX_ADDRESS || '0x75687780AD8B39Cc7bab179Dd127f672be04b9ED') as `0x${string}`,
      WETH: (process.env.NEXT_PUBLIC_ARC_WETH_ADDRESS || '0x6e204AF9414C49032bC3851DbDe3fe5c42ac7585') as `0x${string}`,
      WBTC: (process.env.NEXT_PUBLIC_ARC_WBTC_ADDRESS || '0xB79c2c7e30C64002A64Ab0375D36a7f701CAB84E') as `0x${string}`,
    },
  },
};

// Default network
export const DEFAULT_NETWORK: NetworkId = 'monad';
