"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Card } from "./ui/Card";
import { Activity, TrendingUp, Shield, Wallet, Plus } from "lucide-react";

// Contract addresses from environment variables
const CONTRACTS = {
  RWAVault: process.env.NEXT_PUBLIC_RWA_VAULT_ADDRESS || "",
  AIAgent: process.env.NEXT_PUBLIC_AI_AGENT_ADDRESS || "",
  RiskManager: process.env.NEXT_PUBLIC_RISK_MANAGER_ADDRESS || "",
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || "",
};

export function AgentDashboard() {
  const { address, isConnected } = useAccount();
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleDepositRWA = async () => {
    try {
      console.log("Contract addresses:", CONTRACTS);
      alert(`Deposit RWA functionality\n\nRWA Vault: ${CONTRACTS.RWAVault}\n\nIntegrate with your RWA tokens here.`);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:border-purple-500/50 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Value Locked</p>
              <p className="text-2xl font-bold text-white mt-1">$125,450</p>
              <p className="text-sm text-green-400 mt-1">+12.5%</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:border-blue-500/50 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Agents</p>
              <p className="text-2xl font-bold text-white mt-1">3</p>
              <p className="text-sm text-blue-400 mt-1">All operational</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:border-green-500/50 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Average APY</p>
              <p className="text-2xl font-bold text-white mt-1">8.7%</p>
              <p className="text-sm text-green-400 mt-1">Above target</p>
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
              <p className="text-2xl font-bold text-white mt-1">Low</p>
              <p className="text-sm text-gray-400 mt-1">0.35/1.0</p>
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
          onClick={handleCreateAgent}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Create New Agent
        </button>
        <button
          onClick={handleDepositRWA}
          className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
        >
          Deposit RWA Collateral
        </button>
      </div>

      {/* Agent List */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Your AI Agents</h3>
        <div className="space-y-4">
          <AgentCard
            name="Treasury Bond Agent #1"
            collateral="$50,000 US Treasury"
            apy="8.2%"
            status="active"
            positions={2}
            address="0x9fE4...a6e0"
            onManage={() => alert("Manage agent - View details, adjust settings")}
          />
          <AgentCard
            name="Real Estate Agent #1"
            collateral="$45,000 Property Token"
            apy="9.5%"
            status="active"
            positions={3}
            address="0xCf7E...0Fc9"
            onManage={() => alert("Manage agent - View details, adjust settings")}
          />
          <AgentCard
            name="Commodity Agent #1"
            collateral="$30,450 Gold Token"
            apy="7.8%"
            status="active"
            positions={1}
            address="0x1234...5678"
            onManage={() => alert("Manage agent - View details, adjust settings")}
          />
        </div>
      </Card>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          contracts={CONTRACTS}
        />
      )}
    </div>
  );
}

function AgentCard({
  name,
  collateral,
  apy,
  status,
  positions,
  address,
  onManage,
}: {
  name: string;
  collateral: string;
  apy: string;
  status: string;
  positions: number;
  address: string;
  onManage: () => void;
}) {
  return (
    <div className="border border-white/10 rounded-lg p-4 hover:border-purple-500/50 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-white">{name}</h4>
          <p className="text-sm text-gray-400 mt-1">{collateral}</p>
          <p className="text-xs text-gray-500 mt-1 font-mono">{address}</p>
        </div>
        <div className="text-right mr-4">
          <div className="text-2xl font-bold text-green-400">{apy}</div>
          <div className="text-sm text-gray-400">{positions} positions</div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm text-center">
            {status}
          </span>
          <button
            onClick={onManage}
            className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm hover:bg-purple-500/30 transition-all"
          >
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAgentModal({
  onClose,
  contracts,
}: {
  onClose: () => void;
  contracts: typeof CONTRACTS;
}) {
  const [riskTolerance, setRiskTolerance] = useState(5);
  const [targetROI, setTargetROI] = useState(12);

  const handleCreate = () => {
    console.log("Creating agent with contracts:", contracts);
    alert(`Creating agent with:\nRisk Tolerance: ${riskTolerance}/10\nTarget ROI: ${targetROI}%\n\nAI Agent Contract: ${contracts.AIAgent}\n\nThis will call the smart contract to deploy a new AI agent.`);
    // TODO: Integrate with smart contract using writeContract
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold text-white mb-4">Create New AI Agent</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Risk Tolerance: {riskTolerance}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {riskTolerance <= 3 && "Conservative - Lower risk, stable returns"}
              {riskTolerance > 3 && riskTolerance <= 7 && "Moderate - Balanced approach"}
              {riskTolerance > 7 && "Aggressive - Higher risk, higher potential returns"}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Target Annual ROI: {targetROI}%
            </label>
            <input
              type="range"
              min="5"
              max="30"
              value={targetROI}
              onChange={(e) => setTargetROI(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              ⚠️ You'll need to deposit RWA collateral after creating the agent
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Create Agent
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
        </div>
      </Card>
    </div>
  );
}
