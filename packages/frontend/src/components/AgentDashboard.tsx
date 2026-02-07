"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Card } from "./ui/Card";
import { Activity, TrendingUp, Shield, Wallet, Plus } from "lucide-react";

// Contract addresses from environment variables
const CONTRACTS = {
  RWAVault: process.env.NEXT_PUBLIC_RWA_VAULT_ADDRESS as `0x${string}`,
  AIAgent: process.env.NEXT_PUBLIC_AI_AGENT_ADDRESS as `0x${string}`,
  RiskManager: process.env.NEXT_PUBLIC_RISK_MANAGER_ADDRESS as `0x${string}`,
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
  RWAToken: process.env.NEXT_PUBLIC_RWA_TOKEN_ADDRESS as `0x${string}`,
};

// Debug: Log contract addresses
console.log("Contract addresses:", CONTRACTS);

// AIAgent ABI - key functions we need
const AI_AGENT_ABI = [
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
    inputs: [
      { name: "amount", type: "uint256" }
    ],
    name: "addCollateral",
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
] as const;

// Helper function to get token name from address
function getTokenName(tokenAddress: string): string {
  const address = tokenAddress.toLowerCase();

  // Map known token addresses to names
  const tokenMap: { [key: string]: string } = {
    [process.env.NEXT_PUBLIC_WETH_ADDRESS?.toLowerCase() || '']: 'ETH',
    [process.env.NEXT_PUBLIC_WBTC_ADDRESS?.toLowerCase() || '']: 'BTC',
    [process.env.NEXT_PUBLIC_USDC_ADDRESS?.toLowerCase() || '']: 'USDC',
  };

  return tokenMap[address] || 'Unknown';
}

export function AgentDashboard() {
  const { address, isConnected, chain } = useAccount();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Read agent state from blockchain
  const { data: agentStateData, refetch: refetchAgentState, error, isLoading } = useReadContract({
    address: CONTRACTS.AIAgent,
    abi: AI_AGENT_ABI,
    functionName: "agentState",
  });

  // Read positions from blockchain
  const { data: positionsData, refetch: refetchPositions } = useReadContract({
    address: CONTRACTS.AIAgent,
    abi: AI_AGENT_ABI,
    functionName: "getAllPositions",
  });

  // Debug logging
  useEffect(() => {
    console.log("Contract Address:", CONTRACTS.AIAgent);
    console.log("Connected Chain:", chain?.id, chain?.name);
    console.log("Agent State Data:", agentStateData?.toString());
    console.log("Error:", error);
    console.log("Is Loading:", isLoading);
    console.log("Show Deposit Modal:", showDepositModal);
  }, [agentStateData, error, isLoading, chain, showDepositModal]);

  // Calculate stats from blockchain data
  const stats = agentStateData ? {
    tvl: Number(formatEther(agentStateData[2] || 0n)),
    activeAgents: 1, // For now, single agent
    avgAPY: 8.5,
    riskScore: calculateRiskScore(agentStateData),
    collateralAmount: Number(formatEther(agentStateData[2] || 0n)),
    borrowedUSDC: Number(formatEther(agentStateData[3] || 0n)),
    availableCredit: Number(formatEther(agentStateData[4] || 0n)),
  } : {
    tvl: 0,
    activeAgents: 0,
    avgAPY: 0,
    riskScore: 0,
    collateralAmount: 0,
    borrowedUSDC: 0,
    availableCredit: 0,
  };

  // Calculate risk score based on agent state
  function calculateRiskScore(state: any): number {
    const collateral = Number(formatEther(state[2] || 0n));
    const borrowed = Number(formatEther(state[3] || 0n));
    const availableCredit = Number(formatEther(state[4] || 0n));

    if (collateral === 0) return 0;

    // Calculate collateral ratio
    const collateralRatio = borrowed > 0 ? collateral / borrowed : 0;

    // Calculate utilization rate
    const totalCredit = borrowed + availableCredit;
    const utilizationRate = totalCredit > 0 ? borrowed / totalCredit : 0;

    // Risk score calculation (0-1 scale)
    // Lower collateral ratio = higher risk
    // Higher utilization = higher risk
    const collateralRisk = collateralRatio > 0 ? Math.max(0, 1 - (collateralRatio / 2.0)) : 0;
    const utilizationRisk = utilizationRate;

    // Weighted average
    const riskScore = (collateralRisk * 0.5) + (utilizationRisk * 0.3) + 0.1; // Base risk

    return Math.min(1.0, Math.max(0, riskScore));
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        refetchAgentState();
        refetchPositions();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, refetchAgentState, refetchPositions]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 text-lg">
            Connect your wallet to view your AI agents
          </p>
        </div>
      </div>
    );
  }

  const handleCreateAgent = () => {
    setShowCreateModal(true);
  };

  const handleDepositRWA = () => {
    console.log("Deposit button clicked, opening modal");
    setShowDepositModal(true);
  };

  const handleRefresh = () => {
    refetchAgentState();
    refetchPositions();
  };

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      {error && (
        <Card className="p-4 bg-red-500/10 border-red-500/20">
          <p className="text-red-400 text-sm mb-2">
            <strong>Contract Read Error:</strong> {error.message}
          </p>
          <p className="text-yellow-400 text-sm">
            💡 The AI Agent contract exists but hasn't been initialized yet. You need to call the <code>initializeAgent()</code> function first with RWA collateral.
          </p>
        </Card>
      )}

      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <div className="text-sm text-blue-400 space-y-1">
          <p><strong>Connected Chain:</strong> {chain?.name} (ID: {chain?.id})</p>
          <p><strong>AI Agent Contract:</strong> {CONTRACTS.AIAgent}</p>
          <p><strong>Data Status:</strong> {isLoading ? "Loading..." : agentStateData ? "Loaded" : "Not initialized"}</p>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:border-purple-500/50 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Collateral</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${stats.collateralAmount.toFixed(2)}
              </p>
              <p className="text-sm text-green-400 mt-1">From blockchain</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:border-blue-500/50 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Borrowed USDC</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${stats.borrowedUSDC.toFixed(2)}
              </p>
              <p className="text-sm text-blue-400 mt-1">Live data</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:border-green-500/50 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available Credit</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${stats.availableCredit.toFixed(2)}
              </p>
              <p className="text-sm text-green-400 mt-1">Ready to use</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:border-yellow-500/50 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Risk Score</p>
              <p className={`text-2xl font-bold mt-1 ${
                stats.riskScore < 0.3 ? 'text-green-400' :
                stats.riskScore < 0.6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {stats.riskScore < 0.3 ? 'Low' : stats.riskScore < 0.6 ? 'Medium' : 'High'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {stats.riskScore.toFixed(2)}/1.0
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Button clicked!");
            handleDepositRWA();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Deposit RWA Collateral
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Agent Info */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">AI Agent Status</h3>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
            Active
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Contract Address:</span>
            <span className="text-white font-mono text-sm">{CONTRACTS.AIAgent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Owner:</span>
            <span className="text-white font-mono text-sm">{address?.slice(0, 10)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Collateral Ratio:</span>
            <span className="text-white">
              {stats.borrowedUSDC > 0
                ? (stats.collateralAmount / stats.borrowedUSDC * 100).toFixed(0)
                : 'N/A'}%
            </span>
          </div>
        </div>
      </Card>

      {/* Investment Positions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Investment Positions</h3>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
            {positionsData ? (positionsData as any[]).length : 0} Active
          </span>
        </div>

        {!positionsData || (positionsData as any[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No active positions yet</p>
            <p className="text-sm text-gray-500 mt-2">
              The AI agent will automatically invest when conditions are favorable
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {(() => {
                const positions = positionsData as any[];
                const totalPages = Math.ceil(positions.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const currentPositions = positions.slice(startIndex, endIndex);

                return currentPositions.map((position: any, index: number) => {
                  const tokenAddress = position.asset as string;
                  const tokenName = getTokenName(tokenAddress);
                  const amount = Number(formatEther(position.amount || BigInt(0)));
                  const entryPrice = Number(formatEther(position.entryPrice || BigInt(0)));
                  const timestamp = Number(position.timestamp || BigInt(0));
                  const date = new Date(timestamp * 1000);

                  return (
                    <div key={startIndex + index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">{tokenName.slice(0, 1)}</span>
                          </div>
                          <div>
                            <p className="text-white font-semibold">{tokenName}</p>
                            <p className="text-sm text-gray-400">
                              {date.toLocaleDateString()} {date.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{amount.toFixed(4)} {tokenName}</p>
                          <p className="text-sm text-gray-400">Entry: ${entryPrice.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/10">
                        <div>
                          <p className="text-xs text-gray-400">Protocol</p>
                          <p className="text-sm text-white font-mono">{(position.protocol as string).slice(0, 8)}...</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Stop Loss</p>
                          <p className="text-sm text-white">
                            {position.stopLoss && Number(position.stopLoss) > 0
                              ? `$${Number(formatEther(position.stopLoss)).toFixed(2)}`
                              : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Take Profit</p>
                          <p className="text-sm text-white">
                            {position.takeProfit && Number(position.takeProfit) > 0
                              ? `$${Number(formatEther(position.takeProfit)).toFixed(2)}`
                              : 'Not set'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Pagination Controls */}
            {(() => {
              const positions = positionsData as any[];
              const totalPages = Math.ceil(positions.length / itemsPerPage);

              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/5 hover:bg-white/10 text-gray-400'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </Card>

      {/* Deposit Modal */}
      {showDepositModal && (
        <DepositCollateralModal
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => {
            setShowDepositModal(false);
            refetchAgentState();
          }}
          contracts={CONTRACTS}
        />
      )}
    </div>
  );
}

function DepositCollateralModal({
  onClose,
  onSuccess,
  contracts,
}: {
  onClose: () => void;
  onSuccess: () => void;
  contracts: typeof CONTRACTS;
}) {
  const [amount, setAmount] = useState("");
  const [currentStep, setCurrentStep] = useState<"idle" | "approving" | "approved" | "depositing" | "complete">("idle");
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  // Debug logging
  useEffect(() => {
    console.log("Modal state:", {
      amount,
      currentStep,
      hash,
      isPending,
      isConfirming,
      isSuccess,
      writeError: writeError?.message,
      receiptError: receiptError?.message
    });
  }, [amount, currentStep, hash, isPending, isConfirming, isSuccess, writeError, receiptError]);

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && currentStep === "approving") {
      console.log("Approval successful! Now depositing...");
      setCurrentStep("approved");
      // Reset the transaction state and proceed to deposit
      setTimeout(() => {
        reset();
        handleDepositAfterApproval();
      }, 1000);
    } else if (isSuccess && currentStep === "depositing") {
      console.log("Deposit complete!");
      setCurrentStep("complete");
      setTimeout(() => onSuccess(), 1500);
    }
  }, [isSuccess, currentStep]);

  const handleDepositAfterApproval = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setCurrentStep("depositing");
    console.log("Depositing after approval:", {
      agent: contracts.AIAgent,
      amount: parseEther(amount).toString()
    });

    try {
      writeContract({
        address: contracts.AIAgent,
        abi: AI_AGENT_ABI,
        functionName: "addCollateral",
        args: [
          parseEther(amount),
        ],
      });
    } catch (error) {
      console.error("Error depositing:", error);
      alert("Error: " + (error as Error).message);
      setCurrentStep("idle");
    }
  };

  const handleApproveAndDeposit = async () => {
    console.log("handleApproveAndDeposit called, amount:", amount);

    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setCurrentStep("approving");
    console.log("Approving RWA token:", {
      token: contracts.RWAToken,
      spender: contracts.AIAgent,
      amount: parseEther(amount).toString()
    });

    try {
      writeContract({
        address: contracts.RWAToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [
          contracts.AIAgent,
          parseEther(amount),
        ],
      });
      console.log("approve writeContract called");
    } catch (error) {
      console.error("Error approving:", error);
      alert("Error: " + (error as Error).message);
      setCurrentStep("idle");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold text-white mb-4">Deposit RWA Collateral</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Amount (in tokens)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={currentStep !== "idle"}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              💡 This will approve and deposit collateral to your AI agent in one flow
            </p>
          </div>

          {(writeError || receiptError) && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">
                ❌ Error: {writeError?.message || receiptError?.message}
              </p>
            </div>
          )}

          {currentStep === "approving" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                {isPending ? "⏳ Waiting for approval confirmation..." : "⏳ Approving transaction..."}
              </p>
            </div>
          )}

          {currentStep === "approved" && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-400">
                ✅ Approved! Now depositing...
              </p>
            </div>
          )}

          {currentStep === "depositing" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                {isPending ? "⏳ Waiting for deposit confirmation..." : "⏳ Depositing collateral..."}
              </p>
            </div>
          )}

          {currentStep === "complete" && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-400">
                ✅ Collateral deposited successfully!
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleApproveAndDeposit}
            disabled={currentStep !== "idle"}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {currentStep === "idle" ? "Approve & Deposit" :
             currentStep === "approving" ? "Approving..." :
             currentStep === "approved" ? "Approved ✓" :
             currentStep === "depositing" ? "Depositing..." :
             "Complete ✓"}
          </button>
          <button
            onClick={onClose}
            disabled={currentStep !== "idle" && currentStep !== "complete"}
            className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Card>
    </div>
  );
}
