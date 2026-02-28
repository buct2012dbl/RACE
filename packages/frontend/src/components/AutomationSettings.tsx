"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Card } from "./ui/Card";
import { Shield, Zap, TrendingUp, AlertTriangle, Clock, DollarSign } from "lucide-react";

// Contract addresses
const CONTRACTS = {
  AIAgent: process.env.NEXT_PUBLIC_AI_AGENT_ADDRESS as `0x${string}`,
  Controller: process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS as `0x${string}`,
};

// Extended ABI for automation functions
const AI_AGENT_AUTOMATION_ABI = [
  {
    inputs: [
      { name: "controllerAddress", type: "address" },
      { name: "maxBorrow", type: "uint256" },
      { name: "cooldown", type: "uint256" },
      { name: "strategyType", type: "uint8" }
    ],
    name: "enableAutomation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "disableAutomation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "maxBorrow", type: "uint256" },
      { name: "cooldown", type: "uint256" },
      { name: "strategyType", type: "uint8" }
    ],
    name: "updateAutomation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserPreferences",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "autoDecisionsEnabled", type: "bool" },
          { name: "decisionController", type: "address" },
          { name: "maxBorrowPerDecision", type: "uint256" },
          { name: "cooldownPeriod", type: "uint256" },
          { name: "lastDecisionTime", type: "uint256" },
          { name: "strategy", type: "uint8" }
        ]
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "isAutomationEnabled",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "canMakeAutomatedDecision",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const STRATEGIES = [
  {
    value: 0,
    name: "Conservative",
    icon: Shield,
    description: "Low risk, stable returns",
    color: "green",
    risk: "Low (1-3)",
    targetROI: "5-8% APY",
    maxLeverage: "1.5x",
  },
  {
    value: 1,
    name: "Balanced",
    icon: TrendingUp,
    description: "Moderate risk, balanced returns",
    color: "blue",
    risk: "Medium (4-6)",
    targetROI: "10-15% APY",
    maxLeverage: "2.0x",
  },
  {
    value: 2,
    name: "Aggressive",
    icon: Zap,
    description: "High risk, maximum returns",
    color: "purple",
    risk: "High (7-10)",
    targetROI: "20%+ APY",
    maxLeverage: "3.0x",
  },
];

export function AutomationSettings() {
  const { address, isConnected } = useAccount();

  // Local state
  const [isEnabled, setIsEnabled] = useState(false);
  const [maxBorrow, setMaxBorrow] = useState("100");
  const [strategy, setStrategy] = useState(1); // Default: Balanced
  const [cooldown, setCooldown] = useState("300"); // 5 minutes default
  const [showSettings, setShowSettings] = useState(false);

  // Read current preferences
  const { data: preferencesData, refetch: refetchPreferences } = useReadContract({
    address: CONTRACTS.AIAgent,
    abi: AI_AGENT_AUTOMATION_ABI,
    functionName: "getUserPreferences",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isConnected,
    }
  });

  // Check if automation can run now
  const { data: canRunNow } = useReadContract({
    address: CONTRACTS.AIAgent,
    abi: AI_AGENT_AUTOMATION_ABI,
    functionName: "canMakeAutomatedDecision",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000, // Check every 10 seconds
    }
  });

  // Write contracts
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Parse preferences data
  useEffect(() => {
    if (preferencesData) {
      const prefs = preferencesData as any;
      setIsEnabled(prefs.autoDecisionsEnabled);
      if (prefs.maxBorrowPerDecision != null) {
        setMaxBorrow(formatEther(prefs.maxBorrowPerDecision));
      }
      if (prefs.cooldownPeriod != null) {
        setCooldown(prefs.cooldownPeriod.toString());
      }
      setStrategy(Number(prefs.strategy));
    }
  }, [preferencesData]);

  // Refetch after transaction success
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        refetchPreferences();
      }, 2000);
    }
  }, [isSuccess, refetchPreferences]);

  const handleEnableAutomation = async () => {
    if (!CONTRACTS.Controller) {
      console.error("NEXT_PUBLIC_CONTROLLER_ADDRESS is not set");
      return;
    }

    try {
      writeContract({
        address: CONTRACTS.AIAgent,
        abi: AI_AGENT_AUTOMATION_ABI,
        functionName: "enableAutomation",
        args: [
          CONTRACTS.Controller,
          parseEther(maxBorrow),
          BigInt(cooldown),
          strategy,
        ],
      });
    } catch (error) {
      console.error("Error enabling automation:", error);
    }
  };

  const handleDisableAutomation = async () => {
    try {
      writeContract({
        address: CONTRACTS.AIAgent,
        abi: AI_AGENT_AUTOMATION_ABI,
        functionName: "disableAutomation",
      });
    } catch (error) {
      console.error("Error disabling automation:", error);
    }
  };

  const handleUpdateAutomation = async () => {
    try {
      writeContract({
        address: CONTRACTS.AIAgent,
        abi: AI_AGENT_AUTOMATION_ABI,
        functionName: "updateAutomation",
        args: [
          parseEther(maxBorrow),
          BigInt(cooldown),
          strategy,
        ],
      });
    } catch (error) {
      console.error("Error updating automation:", error);
    }
  };

  if (!isConnected) {
    return null;
  }

  const selectedStrategy = STRATEGIES[strategy];
  const nextDecisionTime = preferencesData
    ? (Number((preferencesData as any).lastDecisionTime) + Number((preferencesData as any).cooldownPeriod)) * 1000
    : 0;
  const timeUntilNext = nextDecisionTime > Date.now()
    ? Math.ceil((nextDecisionTime - Date.now()) / 1000)
    : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            AI Automation
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Let AI make investment decisions for you
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isEnabled
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {isEnabled ? '● Active' : '○ Inactive'}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
          >
            {showSettings ? 'Hide Settings' : 'Configure'}
          </button>
        </div>
      </div>

      {/* Status Overview */}
      {isEnabled && !showSettings && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              {React.createElement(selectedStrategy.icon, {
                className: `w-5 h-5 text-${selectedStrategy.color}-400`
              })}
              <span className="text-white font-medium">{selectedStrategy.name} Strategy</span>
            </div>
            <span className="text-gray-400 text-sm">{selectedStrategy.targetROI}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Max Borrow</span>
              </div>
              <p className="text-white font-semibold">${maxBorrow} USDC</p>
            </div>

            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Cooldown</span>
              </div>
              <p className="text-white font-semibold">{Math.floor(Number(cooldown) / 60)} min</p>
            </div>
          </div>

          {timeUntilNext > 0 ? (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                ⏸️ Next decision in {Math.floor(timeUntilNext / 60)}m {timeUntilNext % 60}s
              </p>
            </div>
          ) : canRunNow ? (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400">
                ✅ Ready for next automated decision
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Configuration Panel */}
      {showSettings && (
        <div className="space-y-6">
          {/* Strategy Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Investment Strategy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {STRATEGIES.map((strat) => (
                <button
                  key={strat.value}
                  onClick={() => setStrategy(strat.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    strategy === strat.value
                      ? `border-${strat.color}-500 bg-${strat.color}-500/10`
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {React.createElement(strat.icon, {
                      className: `w-5 h-5 text-${strat.color}-400`
                    })}
                    <span className="font-semibold text-white">{strat.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{strat.description}</p>
                  <div className="text-xs text-gray-500">
                    <p>Risk: {strat.risk}</p>
                    <p>Target: {strat.targetROI}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Borrow */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Maximum Borrow Per Decision
            </label>
            <input
              type="number"
              value={maxBorrow}
              onChange={(e) => setMaxBorrow(e.target.value)}
              placeholder="100"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              AI cannot borrow more than this amount in a single decision
            </p>
          </div>

          {/* Cooldown */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cooldown Period (seconds)
            </label>
            <div className="flex gap-2">
              {[60, 300, 600, 1800].map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => setCooldown(seconds.toString())}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    cooldown === seconds.toString()
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              placeholder="300"
              className="w-full mt-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum time between automated decisions (min: 60 seconds)
            </p>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400 mb-1">
                  Important: Understand the Risks
                </p>
                <ul className="text-xs text-yellow-300/80 space-y-1">
                  <li>• AI makes autonomous investment decisions within your limits</li>
                  <li>• Past performance does not guarantee future results</li>
                  <li>• You are responsible for all automated decisions</li>
                  <li>• You can disable automation anytime</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {!CONTRACTS.Controller && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                ⚠️ Controller address not configured. Set NEXT_PUBLIC_CONTROLLER_ADDRESS in .env and restart.
              </p>
            </div>
          )}
          {writeError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                ❌ Error: {writeError.message}
              </p>
            </div>
          )}

          {/* Transaction Status */}
          {(isPending || isConfirming) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                ⏳ {isPending ? 'Waiting for confirmation...' : 'Confirming transaction...'}
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400">
                ✅ Settings updated successfully!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isEnabled ? (
              <button
                onClick={handleEnableAutomation}
                disabled={isPending || isConfirming || !CONTRACTS.Controller}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enable Automation
              </button>
            ) : (
              <>
                <button
                  onClick={handleUpdateAutomation}
                  disabled={isPending || isConfirming}
                  className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Settings
                </button>
                <button
                  onClick={handleDisableAutomation}
                  disabled={isPending || isConfirming}
                  className="px-6 py-3 bg-red-500/20 text-red-400 rounded-lg font-semibold hover:bg-red-500/30 border border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Disable
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
