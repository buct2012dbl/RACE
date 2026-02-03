"""Agent orchestrator for managing multiple AI agents"""
import asyncio
import time
from typing import Dict, List
from web3 import Web3
from .decision_engine import AIDecisionEngine
from .models import AgentState, MarketData, Decision
from .config import config

class AgentOrchestrator:
    """Orchestrates multiple AI agents"""

    def __init__(self):
        """Initialize orchestrator"""
        self.w3 = Web3(Web3.HTTPProvider(config.WEB3_PROVIDER_URI))
        self.decision_engine = AIDecisionEngine()
        self.active_agents: Dict[str, AgentState] = {}

    async def orchestrate_decision(self, agent_id: str) -> Dict:
        """
        Orchestrate decision-making for an agent

        Args:
            agent_id: Agent contract address

        Returns:
            Decision result with proof
        """
        # Get agent state from blockchain
        agent_state = await self._fetch_agent_state(agent_id)

        # Get market data
        market_data = await self._fetch_market_data()

        # Make decision
        decision = await self.decision_engine.evaluate(
            agent_state,
            market_data,
            int(time.time())
        )

        # Generate proof (simplified - in production use ZK proofs)
        proof = self._generate_proof(decision)

        # Sign decision
        signature = self._sign_decision(decision)

        return {
            "decision": decision.dict(),
            "proof": proof,
            "timestamp": int(time.time()),
            "signature": signature
        }

    async def _fetch_agent_state(self, agent_id: str) -> AgentState:
        """Fetch agent state from blockchain"""
        # In production, call actual contract
        # For now, return mock data
        from .models import AgentConfig, Position

        return AgentState(
            config=AgentConfig(
                owner="0x" + "0" * 40,
                risk_tolerance=5,
                target_roi=0.12,
                max_drawdown=0.15,
                strategies=["yield_farming", "lending"]
            ),
            rwa_collateral="0x" + "1" * 40,
            collateral_amount=100000.0,
            borrowed_usdc=50000.0,
            available_credit=30000.0,
            total_assets=55000.0,
            positions=[]
        )

    async def _fetch_market_data(self) -> MarketData:
        """Fetch market data from oracles"""
        # In production, fetch from Chainlink, Pyth, etc.
        return MarketData(
            timestamp=int(time.time()),
            prices={
                "USDC": 1.0,
                "ETH": 2500.0,
                "BTC": 45000.0
            },
            yield_curves={
                "Aave": {
                    "asset": "USDC",
                    "apy": 0.08,
                    "volatility": 0.02,
                    "tvl": 5_000_000_000
                },
                "Compound": {
                    "asset": "USDC",
                    "apy": 0.075,
                    "volatility": 0.025,
                    "tvl": 3_000_000_000
                }
            },
            volatility={
                "ETH": 0.6,
                "BTC": 0.5
            },
            liquidity={
                "ETH": 0.9,
                "BTC": 0.95
            },
            treasury_yield=0.045
        )

    def _generate_proof(self, decision: Decision) -> str:
        """Generate ZK proof for decision"""
        # In production, implement actual ZK proof generation
        return "0x" + "proof" * 16

    def _sign_decision(self, decision: Decision) -> str:
        """Sign decision with agent's private key"""
        if not config.PRIVATE_KEY:
            return "0x" + "0" * 130

        try:
            # Create message hash from decision JSON
            from eth_account.messages import encode_defunct

            message = encode_defunct(text=decision.json())

            # Sign message
            signed = self.w3.eth.account.sign_message(
                message,
                private_key=config.PRIVATE_KEY
            )

            return signed.signature.hex()
        except Exception as e:
            print(f"Warning: Could not sign decision: {e}")
            return "0x" + "0" * 130

    async def run_agent_loop(self, agent_id: str):
        """Run continuous agent loop"""
        print(f"Starting agent loop for {agent_id}")

        while True:
            try:
                # Make decision
                result = await self.orchestrate_decision(agent_id)

                print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Agent Decision:")
                print(f"Action: {result['decision']['action']}")
                print(f"Reasoning: {result['decision']['reasoning']}")
                print(f"Risk Score: {result['decision']['risk_score']:.2f}")
                print(f"Expected Return: {result['decision']['expected_return']:.2%}")

                # Execute decision on-chain (if not HOLD)
                if result['decision']['action'] != "HOLD":
                    await self._execute_decision(agent_id, result)

                # Wait for next decision interval
                await asyncio.sleep(config.DECISION_INTERVAL)

            except Exception as e:
                print(f"Error in agent loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error

    async def _execute_decision(self, agent_id: str, result: Dict):
        """Execute decision on blockchain"""
        print(f"Executing decision on-chain for agent {agent_id}")
        # In production, call smart contract
        # For now, just log
        print(f"Transaction would be sent with params: {result['decision']['params']}")

    async def monitor_risk(self, agent_id: str):
        """Continuously monitor agent risk"""
        print(f"Starting risk monitoring for {agent_id}")

        while True:
            try:
                agent_state = await self._fetch_agent_state(agent_id)
                market_data = await self._fetch_market_data()

                risk_report = await self.decision_engine._assess_risk(
                    agent_state,
                    market_data
                )

                if risk_report.warnings:
                    print(f"\n⚠️  RISK WARNINGS for {agent_id}:")
                    for warning in risk_report.warnings:
                        print(f"  - {warning}")

                await asyncio.sleep(config.RISK_CHECK_INTERVAL)

            except Exception as e:
                print(f"Error in risk monitoring: {e}")
                await asyncio.sleep(60)
