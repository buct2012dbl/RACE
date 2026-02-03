"""Database utilities using Supabase"""
import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client

from .config import config

class SupabaseDB:
    """Supabase database client"""

    def __init__(self):
        """Initialize Supabase client"""
        if not config.SUPABASE_URL or not config.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")

        self.client: Client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_KEY
        )

    async def store_decision(self, agent_id: str, decision: Dict[str, Any]) -> Dict:
        """Store AI agent decision"""
        data = {
            "agent_id": agent_id,
            "action": decision.get("action"),
            "params": decision.get("params"),
            "risk_score": decision.get("risk_score"),
            "expected_return": decision.get("expected_return"),
            "reasoning": decision.get("reasoning"),
            "timestamp": decision.get("timestamp")
        }

        result = self.client.table("agent_decisions").insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_agent_history(self, agent_id: str, limit: int = 100) -> List[Dict]:
        """Get agent decision history"""
        result = self.client.table("agent_decisions")\
            .select("*")\
            .eq("agent_id", agent_id)\
            .order("timestamp", desc=True)\
            .limit(limit)\
            .execute()

        return result.data if result.data else []

    async def store_risk_report(self, agent_id: str, risk_report: Dict[str, Any]) -> Dict:
        """Store risk assessment report"""
        data = {
            "agent_id": agent_id,
            "collateral_ratio": risk_report.get("collateral_ratio"),
            "utilization_rate": risk_report.get("utilization_rate"),
            "volatility_score": risk_report.get("volatility_score"),
            "liquidity_score": risk_report.get("liquidity_score"),
            "concentration_risk": risk_report.get("concentration_risk"),
            "overall_risk": risk_report.get("overall_risk"),
            "warnings": risk_report.get("warnings", []),
            "timestamp": risk_report.get("timestamp")
        }

        result = self.client.table("risk_reports").insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_latest_risk_report(self, agent_id: str) -> Optional[Dict]:
        """Get latest risk report for agent"""
        result = self.client.table("risk_reports")\
            .select("*")\
            .eq("agent_id", agent_id)\
            .order("timestamp", desc=True)\
            .limit(1)\
            .execute()

        return result.data[0] if result.data else None

    async def store_agent_state(self, agent_id: str, state: Dict[str, Any]) -> Dict:
        """Store agent state snapshot"""
        data = {
            "agent_id": agent_id,
            "collateral_amount": state.get("collateral_amount"),
            "borrowed_usdc": state.get("borrowed_usdc"),
            "available_credit": state.get("available_credit"),
            "total_assets": state.get("total_assets"),
            "position_count": len(state.get("positions", [])),
            "timestamp": state.get("timestamp")
        }

        result = self.client.table("agent_states").insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_agent_performance(self, agent_id: str) -> Dict:
        """Get agent performance metrics"""
        # Get all decisions
        decisions = await self.get_agent_history(agent_id)

        if not decisions:
            return {
                "total_decisions": 0,
                "avg_risk_score": 0,
                "avg_expected_return": 0
            }

        total = len(decisions)
        avg_risk = sum(d.get("risk_score", 0) for d in decisions) / total
        avg_return = sum(d.get("expected_return", 0) for d in decisions) / total

        return {
            "total_decisions": total,
            "avg_risk_score": avg_risk,
            "avg_expected_return": avg_return,
            "latest_decision": decisions[0] if decisions else None
        }

# Global instance
db = SupabaseDB() if config.SUPABASE_URL and config.SUPABASE_KEY else None
