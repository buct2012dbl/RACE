"""Simple rule-based decision engine for testing without LLM API calls"""
import time
import random
from typing import Dict, List
from .models import AgentState, MarketData, Decision, InvestmentAction, RiskReport
from .config import config


class SimpleDecisionEngine:
    """Simple rule-based decision engine for testing"""

    async def evaluate(
        self,
        agent_state: AgentState,
        market_data: MarketData,
        timestamp: int
    ) -> Decision:
        """
        Make investment decision using simple rules
        """
        # Calculate key metrics
        utilization = agent_state.borrowed_usdc / (agent_state.borrowed_usdc + agent_state.available_credit) if (agent_state.borrowed_usdc + agent_state.available_credit) > 0 else 0
        collateral_ratio = agent_state.collateral_amount / agent_state.borrowed_usdc if agent_state.borrowed_usdc > 0 else float('inf')

        # Decision logic
        if len(agent_state.positions) == 0 and agent_state.available_credit > 100:
            # No positions and have credit - invest!
            token = "ETH" if random.random() > 0.5 else "BTC"
            borrow_amount = min(agent_state.available_credit * 0.3, 500)  # Borrow 30% of available credit, max 500

            return Decision(
                action=InvestmentAction.BORROW_AND_INVEST,
                params={
                    "borrow_amount": borrow_amount,
                    "token": token,
                    "amount": borrow_amount
                },
                risk_score=0.4,
                expected_return=0.08,
                timestamp=timestamp,
                reasoning=f"Opening position in {token}. Portfolio has no positions and {agent_state.available_credit:.2f} USDC available credit. Borrowing {borrow_amount:.2f} USDC to invest."
            )

        elif utilization > 0.8:
            # High utilization - be cautious
            return Decision(
                action=InvestmentAction.HOLD,
                params={},
                risk_score=0.7,
                expected_return=0.0,
                timestamp=timestamp,
                reasoning=f"Holding positions. Utilization rate is high at {utilization:.1%}. Waiting for better conditions."
            )

        elif collateral_ratio < 1.5:
            # Low collateral ratio - reduce risk
            return Decision(
                action=InvestmentAction.HOLD,
                params={},
                risk_score=0.8,
                expected_return=0.0,
                timestamp=timestamp,
                reasoning=f"Holding positions. Collateral ratio is low at {collateral_ratio:.2f}x. Need to maintain safety margin."
            )

        elif len(agent_state.positions) > 0:
            # Have positions - check if they're old enough to consider new actions
            newest_position_age = time.time() - max(p.timestamp for p in agent_state.positions)

            if newest_position_age < 3600:  # Less than 1 hour
                return Decision(
                    action=InvestmentAction.HOLD,
                    params={},
                    risk_score=0.3,
                    expected_return=0.0,
                    timestamp=timestamp,
                    reasoning=f"Holding positions. Newest position is only {newest_position_age/60:.1f} minutes old. Letting positions mature."
                )

            # Positions are mature - consider adding more if we have credit
            if agent_state.available_credit > 200:
                token = "ETH" if random.random() > 0.5 else "BTC"
                borrow_amount = min(agent_state.available_credit * 0.2, 300)  # Borrow 20% of available credit, max 300

                return Decision(
                    action=InvestmentAction.BORROW_AND_INVEST,
                    params={
                        "borrow_amount": borrow_amount,
                        "token": token,
                        "amount": borrow_amount
                    },
                    risk_score=0.5,
                    expected_return=0.06,
                    timestamp=timestamp,
                    reasoning=f"Adding position in {token}. Existing positions are mature and we have {agent_state.available_credit:.2f} USDC available credit."
                )

        # Default: HOLD
        return Decision(
            action=InvestmentAction.HOLD,
            params={},
            risk_score=0.3,
            expected_return=0.0,
            timestamp=timestamp,
            reasoning="Holding positions. Current market conditions and portfolio state suggest waiting."
        )

    async def _assess_risk(
        self,
        agent_state: AgentState,
        market_data: MarketData
    ) -> RiskReport:
        """
        Assess risk for the agent's current state
        """
        warnings: List[str] = []

        # Calculate key metrics
        utilization = agent_state.borrowed_usdc / (agent_state.borrowed_usdc + agent_state.available_credit) if (agent_state.borrowed_usdc + agent_state.available_credit) > 0 else 0
        collateral_ratio = agent_state.collateral_amount / agent_state.borrowed_usdc if agent_state.borrowed_usdc > 0 else float('inf')

        # Check collateral ratio
        if collateral_ratio < config.MIN_COLLATERAL_RATIO:
            warnings.append(f"Collateral ratio ({collateral_ratio:.2f}x) below minimum ({config.MIN_COLLATERAL_RATIO}x)")

        # Check utilization
        if utilization > 0.8:
            warnings.append(f"High utilization rate: {utilization:.1%}")

        # Check concentration risk
        concentration = 0.0
        if len(agent_state.positions) > 0:
            # Calculate concentration (simplified - just check if too many positions in one asset)
            asset_counts: Dict[str, int] = {}
            for pos in agent_state.positions:
                asset = pos.asset
                asset_counts[asset] = asset_counts.get(asset, 0) + 1

            concentration = max(asset_counts.values()) / len(agent_state.positions) if agent_state.positions else 0
            if concentration > config.MAX_CONCENTRATION:
                warnings.append(f"High concentration risk: {concentration:.1%} in single asset")

        # Calculate overall risk score
        risk_score = 0.0
        if collateral_ratio < config.MIN_COLLATERAL_RATIO:
            risk_score += 0.4
        if utilization > 0.8:
            risk_score += 0.3
        if len(warnings) > 0:
            risk_score += 0.2

        risk_score = min(1.0, risk_score)

        # Calculate volatility score (simplified - based on market volatility)
        avg_volatility = sum(market_data.volatility.values()) / len(market_data.volatility) if market_data.volatility else 0.5

        # Calculate liquidity score (simplified - based on market liquidity)
        avg_liquidity = sum(market_data.liquidity.values()) / len(market_data.liquidity) if market_data.liquidity else 0.8

        return RiskReport(
            collateral_ratio=collateral_ratio if collateral_ratio != float('inf') else 0.0,
            utilization_rate=utilization,
            volatility_score=avg_volatility,
            liquidity_score=avg_liquidity,
            concentration_risk=concentration,
            overall_risk=risk_score,
            warnings=warnings
        )
