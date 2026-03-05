"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Activity, TrendingUp, Shield, Wallet, Plus, BarChart3, RefreshCw } from "lucide-react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AutomationSettings } from "./AutomationSettings";
import { useQueryClient } from '@tanstack/react-query';
import { useNetwork } from '@/contexts/NetworkContext';
import { ContractAddresses } from '@/config/networks';

// AIAgent ABI - Multi-User Functions
const AI_AGENT_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserState",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "config", type: "tuple", components: [
            { name: "owner", type: "address" },
            { name: "riskTolerance", type: "uint256" },
            { name: "targetROI", type: "uint256" },
            { name: "maxDrawdown", type: "uint256" },
            { name: "strategies", type: "address[]" }
          ]},
          { name: "rwaCollateral", type: "address" },
          { name: "collateralAmount", type: "uint256" },
          { name: "borrowedUSDC", type: "uint256" },
          { name: "availableCredit", type: "uint256" },
          { name: "totalAssets", type: "uint256" },
          { name: "positions", type: "tuple[]", components: [
            { name: "protocol", type: "address" },
            { name: "asset", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "entryPrice", type: "uint256" },
            { name: "timestamp", type: "uint256" },
            { name: "stopLoss", type: "uint256" },
            { name: "takeProfit", type: "uint256" }
          ]}
        ]
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserPositions",
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "protocol", type: "address" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "entryPrice", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "stopLoss", type: "uint256" },
          { name: "takeProfit", type: "uint256" }
        ]
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "hasInitialized",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "agentState",
    outputs: [
      { name: "config", type: "tuple", components: [
        { name: "owner", type: "address" },
        { name: "riskTolerance", type: "uint256" },
        { name: "targetROI", type: "uint256" },
        { name: "maxDrawdown", type: "uint256" },
        { name: "strategies", type: "address[]" }
      ]},
      { name: "rwaCollateral", type: "address" },
      { name: "collateralAmount", type: "uint256" },
      { name: "borrowedUSDC", type: "uint256" },
      { name: "availableCredit", type: "uint256" },
      { name: "totalAssets", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllPositions",
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "protocol", type: "address" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "entryPrice", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "stopLoss", type: "uint256" },
          { name: "takeProfit", type: "uint256" }
        ]
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "addCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "rwaCollateral", type: "address" },
      { name: "collateralAmount", type: "uint256" },
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "riskTolerance", type: "uint256" },
          { name: "targetROI", type: "uint256" },
          { name: "maxDrawdown", type: "uint256" },
          { name: "strategies", type: "address[]" },
        ],
      },
    ],
    name: "initializeAgent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// RWA Vault ABI
const RWA_VAULT_ABI = [
  {
    inputs: [
      { name: "agent", type: "address" },
      { name: "rwaToken", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "addCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "rwaToken", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "getBorrowingPower",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC20 ABI for approve
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function getTokenName(tokenAddress: string, contracts: any): string {
  const address = tokenAddress.toLowerCase();
  const tokenMap: { [key: string]: string } = {
    [contracts.WETH?.toLowerCase() || '']: 'ETH',
    [contracts.WBTC?.toLowerCase() || '']: 'BTC',
    [contracts.USDC?.toLowerCase() || '']: 'USDC',
  };
  return tokenMap[address] || 'Unknown';
}

export function AgentDashboard() {
  const { address, isConnected, chain } = useAccount();
  const { contracts } = useNetwork();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'positions' | 'chart'>('positions');
  const [kLineData, setKLineData] = useState<any[]>([]);
  const [priceDataLoading, setPriceDataLoading] = useState(false);
  const [priceDataError, setPriceDataError] = useState<string | null>(null);
  const itemsPerPage = 5;

  const { data: agentStateData, refetch: refetchAgentState, error, isLoading } = useReadContract({
    address: contracts.AIAgent,
    abi: AI_AGENT_ABI,
    functionName: "getUserState",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && isConnected }
  });

  const { data: hasInitializedData, refetch: refetchHasInitialized } = useReadContract({
    address: contracts.AIAgent,
    abi: AI_AGENT_ABI,
    functionName: "hasInitialized",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && isConnected }
  });

  const { data: positionsData, refetch: refetchPositions } = useReadContract({
    address: contracts.AIAgent,
    abi: AI_AGENT_ABI,
    functionName: "getUserPositions",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && isConnected }
  });

  const generateMockKLineData = () => {
    const data = [];
    const basePrice = 45000;
    let currentPrice = basePrice;
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const change = (Math.random() - 0.5) * 2000;
      currentPrice += change;
      const open = currentPrice;
      const close = currentPrice + (Math.random() - 0.5) * 1000;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      const volume = Math.random() * 1000000;
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        open: Math.round(open), high: Math.round(high),
        low: Math.round(low), close: Math.round(close),
        volume: Math.round(volume),
      });
    }
    return data;
  };

  useEffect(() => {
    const fetchPriceData = async () => {
      if (activeTab !== 'chart') return;
      setPriceDataLoading(true);
      setPriceDataError(null);
      try {
        let symbol = 'BTC';
        if (positionsData && (positionsData as any[]).length > 0) {
          const firstPosition = (positionsData as any[])[0];
          const tokenName = getTokenName(firstPosition.asset, contracts);
          symbol = tokenName === 'ETH' ? 'ETH' : 'BTC';
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/prices/history?symbol=${symbol}&days=30`);
        if (!response.ok) throw new Error(`Failed to fetch price data: ${response.statusText}`);
        const result = await response.json();
        if (!result.success || !result.data.ohlc) throw new Error('Invalid response format from API');
        const formattedData = result.data.ohlc.map((item: any) => {
          const date = new Date(item.timestamp);
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            open: Math.round(item.open), high: Math.round(item.high),
            low: Math.round(item.low), close: Math.round(item.close),
            volume: 0,
          };
        });
        setKLineData(formattedData);
      } catch (error) {
        console.error('Error fetching price data:', error);
        setPriceDataError(error instanceof Error ? error.message : 'Failed to fetch price data');
        setKLineData(generateMockKLineData());
      } finally {
        setPriceDataLoading(false);
      }
    };
    fetchPriceData();
  }, [activeTab, positionsData]);

  useEffect(() => {
    console.log("Contract Address:", contracts.AIAgent);
    console.log("Connected Chain:", chain?.id, chain?.name);
    console.log("Agent State Data:", agentStateData?.toString());
    console.log("Error:", error);
    console.log("Is Loading:", isLoading);
    console.log("Show Deposit Modal:", showDepositModal);
  }, [agentStateData, error, isLoading, chain, showDepositModal]);

  const stats = agentStateData ? {
    tvl: Number(formatEther((agentStateData as any).collateralAmount || 0n)),
    activeAgents: 1,
    avgAPY: 8.5,
    riskScore: calculateRiskScore(agentStateData),
    collateralAmount: Number(formatEther((agentStateData as any).collateralAmount || 0n)),
    borrowedUSDC: Number(formatEther((agentStateData as any).borrowedUSDC || 0n)),
    availableCredit: Number(formatEther((agentStateData as any).availableCredit || 0n)),
  } : {
    tvl: 0, activeAgents: 0, avgAPY: 0, riskScore: 0,
    collateralAmount: 0, borrowedUSDC: 0, availableCredit: 0,
  };

  function calculateRiskScore(state: any): number {
    const collateral = Number(formatEther(state.collateralAmount || 0n));
    const borrowed = Number(formatEther(state.borrowedUSDC || 0n));
    const availableCredit = Number(formatEther(state.availableCredit || 0n));
    if (collateral === 0) return 0;
    const collateralRatio = borrowed > 0 ? collateral / borrowed : 0;
    const totalCredit = borrowed + availableCredit;
    const utilizationRate = totalCredit > 0 ? borrowed / totalCredit : 0;
    const collateralRisk = collateralRatio > 0 ? Math.max(0, 1 - (collateralRatio / 2.0)) : 0;
    const utilizationRisk = utilizationRate;
    const riskScore = (collateralRisk * 0.5) + (utilizationRisk * 0.3) + 0.1;
    return Math.min(1.0, Math.max(0, riskScore));
  }

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        refetchHasInitialized();
        refetchAgentState();
        refetchPositions();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, refetchHasInitialized, refetchAgentState, refetchPositions]);

  useEffect(() => {
    if (isConnected && address && hasInitializedData === false) {
      setShowInitModal(true);
    } else {
      setShowInitModal(false);
    }
  }, [isConnected, address, hasInitializedData]);

  // ─── Not Connected ────────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center py-24 border border-[#111111] border-t-0 newsprint-texture">
        <div className="text-center px-8">
          <div className="border border-[#111111] w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-[#111111]" strokeWidth={1.5} />
          </div>
          <p className="font-serif text-2xl font-bold text-[#111111] mb-2">
            Connect Your Wallet
          </p>
          <p className="font-body text-sm text-neutral-500 leading-relaxed max-w-xs mx-auto">
            Connect your wallet to access your AI agents and portfolio dashboard.
          </p>
        </div>
      </div>
    );
  }

  const handleDepositRWA = () => {
    console.log("Deposit button clicked, opening modal");
    setShowDepositModal(true);
  };

  const handleRefresh = () => {
    refetchHasInitialized();
    refetchAgentState();
    refetchPositions();
  };

  // ─── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Contract error */}
      {error && (
        <div className="border-l-4 border-[#CC0000] bg-[#FFF5F5] px-5 py-4 mb-4 mt-4">
          <p className="font-mono text-xs uppercase tracking-widest text-[#CC0000] mb-1">Contract Error</p>
          <p className="font-body text-sm text-[#111111]">{error.message}</p>
          <p className="font-mono text-xs text-neutral-500 mt-1">
            {hasInitializedData
              ? "There was an error reading your agent data."
              : "Initialize your AI Agent with RWA collateral to get started."}
          </p>
        </div>
      )}

      {/* System status strip */}
      <div className="border border-[#111111] border-t-0 p-4 bg-[#F5F5F5]">
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">System Status</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <p className="font-mono text-xs text-neutral-600">
            <span className="font-bold text-[#111111]">Wallet:</span> {address}
          </p>
          <p className="font-mono text-xs text-neutral-600">
            <span className="font-bold text-[#111111]">Chain:</span> {chain?.name} (ID: {chain?.id})
          </p>
          <p className="font-mono text-xs text-neutral-600 truncate">
            <span className="font-bold text-[#111111]">Contract:</span> {contracts.AIAgent}
          </p>
          <p className="font-mono text-xs text-neutral-600">
            <span className="font-bold text-[#111111]">Agent:</span>{" "}
            {hasInitializedData === undefined ? "Checking..." : hasInitializedData ? "Initialized ✓" : "Not initialized"} &nbsp;|&nbsp;{" "}
            {isLoading ? "Loading…" : agentStateData ? "Data loaded" : "Awaiting init"}
          </p>
        </div>
      </div>

      {/* Init required banner */}
      {hasInitializedData === false && (
        <div className="border border-[#CC0000] border-t-0 bg-[#FFF9F9] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[#CC0000] mb-1">Action Required</p>
            <p className="font-body text-sm text-[#111111]">
              Initialize your AI Agent with RWA collateral before you can begin autonomous trading.
            </p>
          </div>
          <button
            onClick={() => setShowInitModal(true)}
            className="ml-4 px-5 py-2.5 bg-[#CC0000] text-[#F9F9F7] font-mono text-xs uppercase tracking-widest whitespace-nowrap hover:bg-[#AA0000] transition-colors min-h-[44px]"
          >
            Initialize Now
          </button>
        </div>
      )}

      {/* ── Stats grid ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-[#111111] mt-6">
        {/* Collateral */}
        <div className="border-r border-b border-[#111111] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Total Collateral</p>
              <p className="font-serif text-3xl font-black text-[#111111] mt-2 leading-none">
                ${stats.collateralAmount.toFixed(2)}
              </p>
              <p className="font-mono text-xs text-neutral-500 mt-2">From blockchain</p>
            </div>
            <div className="border border-[#111111] w-10 h-10 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-[#111111]" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Borrowed */}
        <div className="border-r border-b border-[#111111] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Borrowed USDC</p>
              <p className="font-serif text-3xl font-black text-[#111111] mt-2 leading-none">
                ${stats.borrowedUSDC.toFixed(2)}
              </p>
              <p className="font-mono text-xs text-neutral-500 mt-2">Live data</p>
            </div>
            <div className="border border-[#111111] w-10 h-10 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-[#111111]" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Credit */}
        <div className="border-r border-b border-[#111111] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Available Credit</p>
              <p className="font-serif text-3xl font-black text-[#111111] mt-2 leading-none">
                ${stats.availableCredit.toFixed(2)}
              </p>
              <p className="font-mono text-xs text-neutral-500 mt-2">Ready to deploy</p>
            </div>
            <div className="border border-[#111111] w-10 h-10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[#111111]" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Risk */}
        <div className="border-b border-[#111111] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Risk Score</p>
              <p className={`font-serif text-3xl font-black mt-2 leading-none ${
                stats.riskScore < 0.3 ? "text-[#111111]"
                  : stats.riskScore < 0.6 ? "text-neutral-600"
                  : "text-[#CC0000]"
              }`}>
                {stats.riskScore < 0.3 ? "Low" : stats.riskScore < 0.6 ? "Med." : "High"}
              </p>
              <p className="font-mono text-xs text-neutral-500 mt-2">
                {stats.riskScore.toFixed(2)} / 1.0
              </p>
            </div>
            <div className="border border-[#111111] w-10 h-10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[#111111]" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────────────── */}
      <div className="flex gap-3 py-5 border-b border-[#111111]">
        {!hasInitializedData ? (
          <button
            type="button"
            onClick={() => setShowInitModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#111111] text-[#F9F9F7] border border-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-[#111111] transition-all duration-200 min-h-[44px]"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Initialize Agent
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDepositRWA(); }}
            className="flex items-center gap-2 px-6 py-3 bg-[#111111] text-[#F9F9F7] border border-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-[#111111] transition-all duration-200 min-h-[44px]"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Deposit RWA Collateral
          </button>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-2 px-6 py-3 border border-[#111111] bg-transparent text-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-[#111111] hover:text-[#F9F9F7] transition-all duration-200 min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      {/* ── Main 12-column grid ──────────────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-12 border-b border-[#111111]">

        {/* Left col — Positions & Chart (8/12) */}
        <div className="lg:col-span-8 border-r border-[#111111]">

          {/* Section label */}
          <div className="border-b border-[#111111] px-6 py-3 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
              Investment Positions
            </p>
            <span className="font-mono text-xs border border-[#111111] px-2 py-0.5">
              {positionsData ? (positionsData as any[]).length : 0} Active
            </span>
          </div>

          {/* Tab navigation */}
          <div className="flex border-b border-[#111111]">
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-6 py-3 font-mono text-xs uppercase tracking-widest border-r border-[#111111] transition-all duration-200 ${
                activeTab === 'positions'
                  ? "bg-[#111111] text-[#F9F9F7]"
                  : "text-[#111111] hover:bg-[#F5F5F5]"
              }`}
            >
              Positions
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-widest transition-all duration-200 ${
                activeTab === 'chart'
                  ? "bg-[#111111] text-[#F9F9F7]"
                  : "text-[#111111] hover:bg-[#F5F5F5]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              Price Chart
            </button>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'positions' ? (
              /* ── Positions tab ── */
              !positionsData || (positionsData as any[]).length === 0 ? (
                <div className="py-16 text-center newsprint-texture">
                  <p className="font-serif text-xl font-bold text-[#111111] mb-2">No Active Positions</p>
                  <p className="font-body text-sm text-neutral-500">
                    The AI agent will automatically invest when conditions are favorable.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-0 border border-[#111111]">
                    {(() => {
                      const positions = positionsData as any[];
                      const totalPages = Math.ceil(positions.length / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const currentPositions = positions.slice(startIndex, startIndex + itemsPerPage);

                      return currentPositions.map((position: any, index: number) => {
                        const tokenName = getTokenName(position.asset as string, contracts);
                        const amount = Number(formatEther(position.amount || BigInt(0)));
                        const rawEntryPrice = Number(position.entryPrice || BigInt(0));
                        const rawStopLoss = Number(position.stopLoss || BigInt(0));
                        const rawTakeProfit = Number(position.takeProfit || BigInt(0));
                        const stopLossPct = rawEntryPrice > 0
                          ? ((rawStopLoss - rawEntryPrice) / rawEntryPrice * 100) : 0;
                        const takeProfitPct = rawEntryPrice > 0
                          ? ((rawTakeProfit - rawEntryPrice) / rawEntryPrice * 100) : 0;
                        const timestamp = Number(position.timestamp || BigInt(0));
                        const date = new Date(timestamp * 1000);

                        return (
                          <div key={startIndex + index} className="border-b border-[#111111] last:border-b-0">
                            {/* Position header */}
                            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E0]">
                              <div className="flex items-center gap-4">
                                <div className="border border-[#111111] w-10 h-10 flex items-center justify-center">
                                  <span className="font-serif text-lg font-black text-[#111111]">
                                    {tokenName.slice(0, 1)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-serif text-base font-bold text-[#111111]">{tokenName}</p>
                                  <p className="font-mono text-xs text-neutral-500">
                                    {date.toLocaleDateString()} {date.toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-sm font-bold text-[#111111]">
                                  {amount.toFixed(4)} {tokenName}
                                </p>
                                <p className="font-mono text-xs text-neutral-500">Entry (DEX)</p>
                              </div>
                            </div>
                            {/* Position details */}
                            <div className="grid grid-cols-3">
                              <div className="p-3 border-r border-[#E5E5E0]">
                                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">Protocol</p>
                                <p className="font-mono text-xs text-[#111111]">
                                  {(position.protocol as string).slice(0, 8)}...
                                </p>
                              </div>
                              <div className="p-3 border-r border-[#E5E5E0]">
                                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">Stop Loss</p>
                                <p className={`font-mono text-xs font-bold ${rawStopLoss > 0 ? "text-[#CC0000]" : "text-neutral-400"}`}>
                                  {rawStopLoss > 0 ? `${stopLossPct.toFixed(1)}%` : "Not set"}
                                </p>
                              </div>
                              <div className="p-3">
                                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">Take Profit</p>
                                <p className="font-mono text-xs font-bold text-[#111111]">
                                  {rawTakeProfit > 0
                                    ? `${takeProfitPct > 0 ? "+" : ""}${takeProfitPct.toFixed(1)}%`
                                    : "Not set"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Pagination */}
                  {(() => {
                    const positions = positionsData as any[];
                    const totalPages = Math.ceil(positions.length / itemsPerPage);
                    if (totalPages <= 1) return null;
                    return (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#111111]">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-[#111111] hover:text-[#F9F9F7] disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[44px]"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-10 h-10 border border-[#111111] font-mono text-xs transition-all ${
                                currentPage === page
                                  ? "bg-[#111111] text-[#F9F9F7]"
                                  : "hover:bg-[#F5F5F5] text-[#111111]"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-[#111111] hover:text-[#F9F9F7] disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[44px]"
                        >
                          Next
                        </button>
                      </div>
                    );
                  })()}
                </>
              )
            ) : (
              /* ── Chart tab ── */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-serif text-lg font-bold text-[#111111]">30-Day Price History</p>
                    <p className="font-mono text-xs text-neutral-500 mt-0.5">Market data via CoinGecko</p>
                  </div>
                  <div className="border border-[#111111] px-3 py-1">
                    <span className="font-mono text-xs text-[#111111]">
                      {positionsData && (positionsData as any[]).length > 0
                        ? getTokenName((positionsData as any[])[0].asset, contracts)
                        : 'BTC'}
                    </span>
                  </div>
                </div>

                {priceDataLoading && (
                  <div className="border border-[#111111] p-12 text-center newsprint-texture">
                    <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                      Fetching market data&hellip;
                    </p>
                  </div>
                )}

                {priceDataError && !priceDataLoading && (
                  <div className="border-l-4 border-[#CC0000] pl-4 py-2">
                    <p className="font-mono text-xs text-[#CC0000]">{priceDataError}</p>
                    <p className="font-mono text-xs text-neutral-500 mt-1">
                      Showing fallback data. Ensure the backend API is running.
                    </p>
                  </div>
                )}

                {!priceDataLoading && kLineData.length > 0 && (
                  <>
                    <div className="border border-[#111111] p-4 bg-[#F9F9F7]">
                      <ResponsiveContainer width="100%" height={360}>
                        <ComposedChart data={kLineData}>
                          <CartesianGrid
                            strokeDasharray="none"
                            stroke="#E5E5E0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            stroke="#111111"
                            tick={{ fill: "#737373", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}
                          />
                          <YAxis
                            stroke="#111111"
                            tick={{ fill: "#737373", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}
                            domain={['dataMin - 1000', 'dataMax + 1000']}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#F9F9F7',
                              border: '1px solid #111111',
                              borderRadius: '0px',
                              fontFamily: 'JetBrains Mono, monospace',
                              color: '#111111',
                              fontSize: '12px',
                            }}
                            formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                          />
                          <Legend
                            wrapperStyle={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '11px',
                              color: '#737373',
                            }}
                          />
                          <Bar dataKey="volume" fill="#E5E5E0" name="Volume" />
                          <Line
                            type="monotone" dataKey="high"
                            stroke="#111111" strokeWidth={1.5} dot={false} name="High"
                            strokeDasharray="4 2"
                          />
                          <Line
                            type="monotone" dataKey="low"
                            stroke="#CC0000" strokeWidth={1.5} dot={false} name="Low"
                          />
                          <Line
                            type="monotone" dataKey="close"
                            stroke="#111111" strokeWidth={2.5} dot={false} name="Close"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Price stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 border border-[#111111] border-r-0">
                      <div className="border-r border-[#111111] p-4">
                        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">
                          Current Price
                        </p>
                        <p className="font-mono text-lg font-bold text-[#111111]">
                          ${kLineData[kLineData.length - 1]?.close.toLocaleString()}
                        </p>
                        <p className="font-mono text-xs text-neutral-500 mt-1">
                          {((kLineData[kLineData.length - 1]?.close - kLineData[0]?.close) / kLineData[0]?.close * 100).toFixed(2)}% (30d)
                        </p>
                      </div>
                      <div className="border-r border-[#111111] p-4">
                        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">
                          Period High
                        </p>
                        <p className="font-mono text-lg font-bold text-[#111111]">
                          ${Math.max(...kLineData.map(d => d.high)).toLocaleString()}
                        </p>
                      </div>
                      <div className="border-r border-[#111111] p-4">
                        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">
                          Period Low
                        </p>
                        <p className="font-mono text-lg font-bold text-[#CC0000]">
                          ${Math.min(...kLineData.map(d => d.low)).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4">
                        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">
                          Avg Volume
                        </p>
                        <p className="font-mono text-lg font-bold text-[#111111]">
                          ${(kLineData[kLineData.length - 1]?.volume / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right col — Agent Status + Automation (4/12) */}
        <div className="lg:col-span-4">

          {/* Agent status */}
          <div className="border-b border-[#111111]">
            <div className="border-b border-[#111111] px-6 py-3 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                Agent Status
              </p>
              <span className="font-mono text-xs border border-[#111111] px-2 py-0.5 bg-[#111111] text-[#F9F9F7]">
                Active
              </span>
            </div>

            <div className="divide-y divide-[#E5E5E0]">
              <div className="flex items-start justify-between px-6 py-4">
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 shrink-0">Contract</p>
                <p className="font-mono text-xs text-[#111111] text-right break-all ml-4">
                  {contracts.AIAgent}
                </p>
              </div>
              <div className="flex items-start justify-between px-6 py-4">
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 shrink-0">Owner</p>
                <p className="font-mono text-xs text-[#111111] text-right ml-4">
                  {address?.slice(0, 10)}…
                </p>
              </div>
              <div className="flex items-start justify-between px-6 py-4">
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 shrink-0">
                  Collateral Ratio
                </p>
                <p className="font-mono text-xs font-bold text-[#111111] ml-4">
                  {stats.borrowedUSDC > 0
                    ? `${(stats.collateralAmount / stats.borrowedUSDC * 100).toFixed(0)}%`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* AI Automation */}
          {hasInitializedData && <AutomationSettings />}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      {showInitModal && (
        <InitializeAgentModal
          onClose={() => setShowInitModal(false)}
          onSuccess={() => {
            setShowInitModal(false);
            refetchHasInitialized();
            refetchAgentState();
            refetchPositions();
          }}
          contracts={contracts}
          userAddress={address!}
        />
      )}

      {showDepositModal && (
        <DepositCollateralModal
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => { setShowDepositModal(false); refetchAgentState(); }}
          contracts={contracts}
        />
      )}
    </div>
  );
}

// ─── Deposit Collateral Modal ─────────────────────────────────────────────────
function DepositCollateralModal({
  onClose,
  onSuccess,
  contracts,
}: {
  onClose: () => void;
  onSuccess: () => void;
  contracts: ContractAddresses;
}) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [currentStep, setCurrentStep] = useState<
    "idle" | "minting" | "minted" | "approving" | "approved" | "depositing" | "complete"
  >("idle");
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  const { data: tokenBalance, isLoading: isLoadingBalance, error: balanceError } = useReadContract({
    address: contracts.RWAToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  useEffect(() => {
    console.log("Balance state:", {
      tokenBalance: tokenBalance ? (tokenBalance as bigint).toString() : "undefined",
      isLoadingBalance, balanceError: balanceError?.message, address,
      rwaTokenAddress: contracts.RWAToken
    });
  }, [tokenBalance, isLoadingBalance, balanceError, address, contracts.RWAToken]);

  useEffect(() => {
    if (isSuccess && currentStep === "minting") {
      setCurrentStep("minted");
      const refetchInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['readContract'] });
      }, 1000);
      setTimeout(() => clearInterval(refetchInterval), 10000);
      setTimeout(() => reset(), 800);
    } else if (isSuccess && currentStep === "approving") {
      setCurrentStep("approved");
      setTimeout(() => { reset(); handleDepositAfterApproval(); }, 1000);
    } else if (isSuccess && currentStep === "depositing") {
      setCurrentStep("complete");
      setTimeout(() => onSuccess(), 1500);
    }
  }, [isSuccess, currentStep, queryClient]);

  const handleMintTokens = () => {
    if (!amount || parseFloat(amount) <= 0 || !address) { alert("Please enter a valid amount"); return; }
    setCurrentStep("minting");
    writeContract({ address: contracts.RWAToken, abi: ERC20_ABI, functionName: "mint", args: [address, parseEther(amount)] });
  };

  const handleDepositAfterApproval = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setCurrentStep("depositing");
    try {
      writeContract({ address: contracts.AIAgent, abi: AI_AGENT_ABI, functionName: "addCollateral", args: [parseEther(amount)] });
    } catch (error) { console.error(error); setCurrentStep("idle"); }
  };

  const handleApproveAndDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) { alert("Please enter a valid amount"); return; }
    setCurrentStep("approving");
    try {
      writeContract({
        address: contracts.RWAToken, abi: ERC20_ABI, functionName: "approve",
        args: [contracts.AIAgent, parseEther(amount)],
      });
    } catch (error) { console.error(error); setCurrentStep("idle"); }
  };

  const isLocked = currentStep !== "idle" && currentStep !== "minted";
  const balance = tokenBalance ? parseFloat(formatEther(tokenBalance as bigint)) : 0;
  const requestedAmount = amount ? parseFloat(amount) : 0;
  const hasInsufficientBalance = requestedAmount > 0 && balance < requestedAmount;

  return (
    <div className="fixed inset-0 bg-[#111111]/80 flex items-center justify-center z-50 p-4">
      <div className="border-2 border-[#111111] bg-[#F9F9F7] max-w-md w-full max-h-[90vh] overflow-y-auto">

        {/* Modal header */}
        <div className="bg-[#111111] text-[#F9F9F7] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5" strokeWidth={1.5} />
            <h3 className="font-serif text-xl font-bold">Deposit RWA Collateral</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLocked}
            className="font-mono text-xs hover:text-neutral-400 transition-colors disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Amount input */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Amount (RWA tokens)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={isLocked}
              className="w-full border-b-2 border-[#111111] bg-transparent px-0 py-2 font-mono text-lg text-[#111111] placeholder-neutral-400 focus:outline-none focus:bg-[#F0F0F0] disabled:opacity-50 transition-colors"
              style={{ borderRadius: 0 }}
            />
            {tokenBalance !== undefined && (
              <p className="font-mono text-xs text-neutral-500 mt-1.5">
                Balance: {formatEther(tokenBalance as bigint)} RWA
              </p>
            )}
          </div>

          {/* Insufficient balance */}
          {hasInsufficientBalance && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000]">
                Insufficient balance. You have {balance.toFixed(2)} RWA but requested {amount}. Mint more tokens below.
              </p>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex items-center gap-3 font-mono text-xs border border-[#E5E5E0] p-3">
            <span className={[
              "minted","approving","approved","depositing","complete"
            ].includes(currentStep) ? "text-[#111111] font-bold" : "text-neutral-400"}>
              {["minted","approving","approved","depositing","complete"].includes(currentStep) ? "✓" : "1."} Get tokens
            </span>
            <span className="text-neutral-300">→</span>
            <span className={[
              "approved","depositing","complete"
            ].includes(currentStep) ? "text-[#111111] font-bold"
              : currentStep === "approving" ? "text-[#CC0000] font-bold" : "text-neutral-400"}>
              {["approved","depositing","complete"].includes(currentStep) ? "✓" : "2."} Approve
            </span>
            <span className="text-neutral-300">→</span>
            <span className={currentStep === "complete" ? "text-[#111111] font-bold"
              : currentStep === "depositing" ? "text-[#CC0000] font-bold" : "text-neutral-400"}>
              {currentStep === "complete" ? "✓" : "3."} Deposit
            </span>
          </div>

          {/* Info */}
          <div className="border-l-4 border-[#111111] pl-4 py-2 bg-[#F5F5F5]">
            <p className="font-mono text-xs text-[#111111]">
              Need RWA tokens? Mint them for free first, then approve and deposit.
            </p>
          </div>

          {/* Status messages */}
          {(writeError || receiptError) && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000] break-all">
                {writeError?.message || receiptError?.message}
              </p>
            </div>
          )}
          {currentStep === "minting" && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">
                {isPending ? "Confirm in wallet…" : "Minting tokens…"}
              </p>
            </div>
          )}
          {currentStep === "minted" && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">Tokens minted. Now approve below.</p>
            </div>
          )}
          {currentStep === "approving" && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000]">
                {isPending ? "Confirm in wallet…" : "Approving transfer…"}
              </p>
            </div>
          )}
          {currentStep === "approved" && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">Approved. Depositing…</p>
            </div>
          )}
          {currentStep === "depositing" && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000]">
                {isPending ? "Confirm in wallet…" : "Depositing collateral…"}
              </p>
            </div>
          )}
          {currentStep === "complete" && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">Collateral deposited successfully.</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-[#111111] p-6 space-y-2">
          <button
            onClick={handleMintTokens}
            disabled={isLocked || ["approving","approved","depositing","complete"].includes(currentStep)}
            className="w-full px-4 py-3 border border-[#111111] bg-transparent text-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-[#F5F5F5] transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            {currentStep === "minting" ? "Minting…"
              : ["minted","approving","approved","depositing","complete"].includes(currentStep) ? "✓ Tokens Ready"
              : `Get ${amount || "1000"} Test RWA Tokens (free)`}
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleApproveAndDeposit}
              disabled={isLocked || hasInsufficientBalance}
              className="flex-1 px-4 py-3 bg-[#111111] text-[#F9F9F7] border border-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-[#111111] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {currentStep === "idle" || currentStep === "minted"
                ? (hasInsufficientBalance ? "Insufficient Balance" : "Approve & Deposit")
                : currentStep === "approving" ? "Approving…"
                : currentStep === "approved" ? "Approved ✓"
                : currentStep === "depositing" ? "Depositing…"
                : "Complete ✓"}
            </button>
            <button
              onClick={onClose}
              disabled={isLocked}
              className="px-4 py-3 border border-[#111111] text-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-[#111111] hover:text-[#F9F9F7] transition-all disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Initialize Agent Modal ───────────────────────────────────────────────────
function InitializeAgentModal({
  onClose,
  onSuccess,
  contracts,
  userAddress,
}: {
  onClose: () => void;
  onSuccess: () => void;
  contracts: ContractAddresses;
  userAddress: `0x${string}`;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("1000");
  const [currentStep, setCurrentStep] = useState<
    "idle" | "minting" | "minted" | "approving" | "approved" | "initializing" | "complete"
  >("idle");
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  const { data: tokenBalance, isLoading: isLoadingBalance, error: balanceError } = useReadContract({
    address: contracts.RWAToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  });

  const balance = tokenBalance ? parseFloat(formatEther(tokenBalance as bigint)) : 0;
  const requestedAmount = amount ? parseFloat(amount) : 0;
  const hasInsufficientBalance = requestedAmount > 0 && balance < requestedAmount;

  useEffect(() => {
    if (isSuccess && currentStep === "minting") {
      setCurrentStep("minted");
      const refetchInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['readContract'] });
      }, 1000);
      setTimeout(() => clearInterval(refetchInterval), 10000);
      setTimeout(() => reset(), 800);
    } else if (isSuccess && currentStep === "approving") {
      setCurrentStep("approved");
      setTimeout(() => { reset(); handleInitializeAfterApproval(); }, 1000);
    } else if (isSuccess && currentStep === "initializing") {
      setCurrentStep("complete");
      setTimeout(() => onSuccess(), 1500);
    }
  }, [isSuccess, currentStep, queryClient]);

  const handleMintTestTokens = () => {
    if (!amount || parseFloat(amount) <= 0) { alert("Please enter a valid amount"); return; }
    setCurrentStep("minting");
    writeContract({
      address: contracts.RWAToken, abi: ERC20_ABI, functionName: "mint",
      args: [userAddress, parseEther(amount)],
    });
  };

  const handleInitializeAfterApproval = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setCurrentStep("initializing");
    writeContract({
      address: contracts.AIAgent, abi: AI_AGENT_ABI, functionName: "initializeAgent",
      args: [
        contracts.RWAToken,
        parseEther(amount),
        { owner: userAddress, riskTolerance: 5n, targetROI: 1000n, maxDrawdown: 2000n, strategies: [] },
      ],
    });
  };

  const handleApproveAndInitialize = () => {
    if (!amount || parseFloat(amount) <= 0) { alert("Please enter a valid amount"); return; }
    setCurrentStep("approving");
    writeContract({
      address: contracts.RWAToken, abi: ERC20_ABI, functionName: "approve",
      args: [contracts.AIAgent, parseEther(amount)],
    });
  };

  const isLocked = currentStep !== "idle" && currentStep !== "minted";

  return (
    <div className="fixed inset-0 bg-[#111111]/80 flex items-center justify-center z-50 p-4">
      <div className="border-2 border-[#111111] bg-[#F9F9F7] max-w-md w-full max-h-[90vh] overflow-y-auto">

        {/* Modal header */}
        <div className="bg-[#111111] text-[#F9F9F7] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" strokeWidth={1.5} />
            <h3 className="font-serif text-xl font-bold">Initialize AI Agent</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLocked}
            className="font-mono text-xs hover:text-neutral-400 transition-colors disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="font-body text-sm text-neutral-600 leading-relaxed">
            Activate your agent by depositing RWA collateral. Need test tokens? Mint them first for free.
          </p>

          {/* Amount input */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
              RWA Collateral Amount (tokens)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              disabled={isLocked}
              className="w-full border-b-2 border-[#111111] bg-transparent px-0 py-2 font-mono text-lg text-[#111111] placeholder-neutral-400 focus:outline-none focus:bg-[#F0F0F0] disabled:opacity-50 transition-colors"
              style={{ borderRadius: 0 }}
            />
            {tokenBalance !== undefined && (
              <p className="font-mono text-xs text-neutral-500 mt-1.5">
                Balance: {formatEther(tokenBalance as bigint)} RWA
              </p>
            )}
          </div>

          {/* Insufficient balance */}
          {hasInsufficientBalance && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000]">
                Insufficient balance. You have {balance.toFixed(2)} RWA but need {amount}. Mint more below.
              </p>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex items-center gap-3 font-mono text-xs border border-[#E5E5E0] p-3">
            <span className={[
              "minted","approving","approved","initializing","complete"
            ].includes(currentStep) ? "text-[#111111] font-bold" : "text-neutral-400"}>
              {["minted","approving","approved","initializing","complete"].includes(currentStep) ? "✓" : "1."} Get tokens
            </span>
            <span className="text-neutral-300">→</span>
            <span className={["approved","initializing","complete"].includes(currentStep) ? "text-[#111111] font-bold"
              : currentStep === "approving" ? "text-[#CC0000] font-bold" : "text-neutral-400"}>
              {["approved","initializing","complete"].includes(currentStep) ? "✓" : "2."} Approve
            </span>
            <span className="text-neutral-300">→</span>
            <span className={currentStep === "complete" ? "text-[#111111] font-bold"
              : currentStep === "initializing" ? "text-[#CC0000] font-bold" : "text-neutral-400"}>
              {currentStep === "complete" ? "✓" : "3."} Initialize
            </span>
          </div>

          {/* Agent defaults */}
          <div className="border-l-4 border-[#111111] pl-4 py-2 bg-[#F5F5F5]">
            <p className="font-mono text-xs text-[#111111]">
              Agent defaults: Risk 5/10 · Target ROI 10% · Max Drawdown 20%
            </p>
          </div>

          {/* Error */}
          {(writeError || receiptError) && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000] break-all">
                {writeError?.message || receiptError?.message}
              </p>
            </div>
          )}

          {/* Status messages */}
          {currentStep === "minting" && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">
                {isPending ? "Confirm in wallet…" : "Minting test tokens…"}
              </p>
            </div>
          )}
          {currentStep === "minted" && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">
                {amount} RWA tokens minted. Now approve below.
              </p>
            </div>
          )}
          {currentStep === "approving" && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000]">
                {isPending ? "Confirm in wallet…" : "Approving token transfer…"}
              </p>
            </div>
          )}
          {currentStep === "approved" && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">Approved. Initializing agent…</p>
            </div>
          )}
          {currentStep === "initializing" && (
            <div className="border-l-4 border-[#CC0000] pl-4 py-2">
              <p className="font-mono text-xs text-[#CC0000]">
                {isPending ? "Confirm in wallet…" : "Initializing agent on-chain…"}
              </p>
            </div>
          )}
          {currentStep === "complete" && (
            <div className="border-l-4 border-[#111111] pl-4 py-2">
              <p className="font-mono text-xs text-[#111111]">Agent initialized successfully.</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-[#111111] p-6 space-y-2">
          <button
            onClick={handleMintTestTokens}
            disabled={isLocked || ["approving","approved","initializing","complete"].includes(currentStep)}
            className="w-full px-4 py-3 border border-[#111111] bg-transparent text-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-[#F5F5F5] transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            {currentStep === "minting" ? "Minting…"
              : ["minted","approving","approved","initializing","complete"].includes(currentStep) ? "✓ Tokens Ready"
              : `Get ${amount || "1000"} Test RWA Tokens (free)`}
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleApproveAndInitialize}
              disabled={isLocked || hasInsufficientBalance}
              className="flex-1 px-4 py-3 bg-[#111111] text-[#F9F9F7] border border-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-white hover:text-[#111111] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {currentStep === "idle" || currentStep === "minted"
                ? (hasInsufficientBalance ? "Insufficient Balance" : "Approve & Initialize")
                : currentStep === "approving" ? "Approving…"
                : currentStep === "approved" ? "Approved ✓"
                : currentStep === "initializing" ? "Initializing…"
                : "Complete ✓"}
            </button>
            <button
              onClick={onClose}
              disabled={isLocked}
              className="px-4 py-3 border border-[#111111] text-[#111111] font-mono text-xs uppercase tracking-widest hover:bg-[#111111] hover:text-[#F9F9F7] transition-all disabled:opacity-50 min-h-[44px]"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
