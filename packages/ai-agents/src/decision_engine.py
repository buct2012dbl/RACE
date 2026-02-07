"""AI Decision Engine using LangChain"""
import time
from typing import Tuple, List
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

from .models import (
    AgentState, MarketData, Decision, InvestmentAction,
    Opportunity, RiskReport
)
from .config import config

class AIDecisionEngine:
    """AI-powered decision engine for autonomous trading"""

    def __init__(self):
        """Initialize decision engine with AI models"""
        self.primary_llm = ChatOpenAI(
            model=config.PRIMARY_MODEL,
            temperature=0.1,
            api_key=config.OPENAI_API_KEY
        )

        self.risk_llm = ChatAnthropic(
            model=config.RISK_MODEL,
            temperature=0,
            api_key=config.ANTHROPIC_API_KEY
        )

    async def evaluate(
        self,
        agent_state: AgentState,
        market_data: MarketData,
        timestamp: int
    ) -> Decision:
        """
        Evaluate current state and market conditions to make investment decision

        Args:
            agent_state: Current agent state
            market_data: Current market data
            timestamp: Current timestamp

        Returns:
            Investment decision
        """
        # 1. Calculate portfolio performance
        portfolio_performance = self._calculate_portfolio_performance(agent_state)

        # 2. Risk assessment
        risk_report = await self._assess_risk(agent_state, market_data)

        # 3. Identify opportunities
        opportunities = self._identify_opportunities(market_data)

        # 4. Make decision based on reinforcement learning
        # If no positions yet and no borrowed funds, prioritize expanding
        if len(agent_state.positions) == 0 and agent_state.borrowed_usdc == 0:
            if self._should_expand_position(agent_state, opportunities, risk_report):
                action = await self._determine_investment_action(agent_state, opportunities)
            else:
                action = Decision(
                    action=InvestmentAction.HOLD,
                    params={},
                    risk_score=risk_report.overall_risk,
                    expected_return=0.0,
                    timestamp=timestamp,
                    reasoning="No suitable opportunities found for initial investment"
                )
        # If we have borrowed funds but no position data, assume positions exist and HOLD
        elif agent_state.borrowed_usdc > 0 and len(agent_state.positions) == 0:
            action = Decision(
                action=InvestmentAction.HOLD,
                params={},
                risk_score=risk_report.overall_risk,
                expected_return=0.0,
                timestamp=timestamp,
                reasoning=f"Holding active positions (borrowed: {agent_state.borrowed_usdc} USDC)"
            )
        # If we have positions, let them mature before making changes
        elif agent_state.positions and len(agent_state.positions) > 0:
            newest_position_age = time.time() - max(p.timestamp for p in agent_state.positions)
            if newest_position_age < 3600:  # Less than 1 hour old
                action = Decision(
                    action=InvestmentAction.HOLD,
                    params={},
                    risk_score=risk_report.overall_risk,
                    expected_return=0.0,
                    timestamp=timestamp,
                    reasoning=f"Holding positions to mature (age: {int(newest_position_age/60)} minutes)"
                )
            elif self._should_rebalance(agent_state, portfolio_performance, risk_report):
                action = await self._determine_rebalance_action(agent_state, opportunities)
            elif self._should_expand_position(agent_state, opportunities, risk_report):
                action = await self._determine_investment_action(agent_state, opportunities)
            elif self._should_risk_off(agent_state, risk_report):
                action = await self._determine_risk_reduction_action(agent_state)
            else:
                action = Decision(
                    action=InvestmentAction.HOLD,
                    params={},
                    risk_score=risk_report.overall_risk,
                    expected_return=0.0,
                    timestamp=timestamp,
                    reasoning="Portfolio is balanced and within risk parameters"
                )
        elif self._should_rebalance(agent_state, portfolio_performance, risk_report):
            action = await self._determine_rebalance_action(agent_state, opportunities)
        elif self._should_expand_position(agent_state, opportunities, risk_report):
            action = await self._determine_investment_action(agent_state, opportunities)
        elif self._should_risk_off(agent_state, risk_report):
            action = await self._determine_risk_reduction_action(agent_state)
        else:
            action = Decision(
                action=InvestmentAction.HOLD,
                params={},
                risk_score=risk_report.overall_risk,
                expected_return=0.0,
                timestamp=timestamp,
                reasoning="No action needed - portfolio is balanced and within risk parameters"
            )

        return action

    def _calculate_portfolio_performance(self, agent_state: AgentState) -> dict:
        """Calculate current portfolio performance metrics"""
        if not agent_state.positions:
            return {
                "total_value": agent_state.collateral_amount,
                "pnl": 0.0,
                "roi": 0.0,
                "sharpe_ratio": 0.0
            }

        total_value = agent_state.total_assets + agent_state.collateral_amount
        initial_value = agent_state.collateral_amount
        pnl = total_value - initial_value - agent_state.borrowed_usdc
        roi = pnl / initial_value if initial_value > 0 else 0.0

        # Simplified Sharpe ratio calculation
        sharpe_ratio = roi / 0.1 if roi > 0 else 0.0  # Assuming 10% volatility

        return {
            "total_value": total_value,
            "pnl": pnl,
            "roi": roi,
            "sharpe_ratio": sharpe_ratio
        }

    async def _assess_risk(
        self,
        agent_state: AgentState,
        market_data: MarketData
    ) -> RiskReport:
        """Assess portfolio risk using Claude"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a risk management expert for DeFi portfolios.
            Analyze the agent state and market conditions to assess risk.
            Provide numerical scores (0-1) for each risk metric."""),
            ("user", """Agent State:
            - Collateral: {collateral_amount}
            - Borrowed: {borrowed_usdc}
            - Positions: {position_count}
            - Available Credit: {available_credit}

            Market Conditions:
            - Volatility: {volatility}
            - Treasury Yield: {treasury_yield}

            Assess the following risks:
            1. Collateral ratio
            2. Utilization rate
            3. Volatility exposure
            4. Liquidity risk
            5. Concentration risk

            Provide overall risk score and warnings.""")
        ])

        # Calculate metrics
        collateral_ratio = (
            (agent_state.collateral_amount + agent_state.total_assets) /
            agent_state.borrowed_usdc
            if agent_state.borrowed_usdc > 0 else 999.0
        )

        utilization_rate = (
            agent_state.borrowed_usdc /
            (agent_state.available_credit + agent_state.borrowed_usdc)
            if (agent_state.available_credit + agent_state.borrowed_usdc) > 0 else 0.0
        )

        # Calculate concentration
        concentration = 0.0
        if agent_state.positions:
            max_position = max(p.amount for p in agent_state.positions)
            total_value = sum(p.amount for p in agent_state.positions)
            concentration = max_position / total_value if total_value > 0 else 0.0

        warnings = []
        if collateral_ratio < config.MIN_COLLATERAL_RATIO:
            warnings.append(f"Low collateral ratio: {collateral_ratio:.2f}")
        if concentration > config.MAX_CONCENTRATION:
            warnings.append(f"High concentration: {concentration:.2%}")
        if utilization_rate > 0.8:
            warnings.append(f"High utilization: {utilization_rate:.2%}")

        overall_risk = (
            (1.0 - min(collateral_ratio / 2.0, 1.0)) * 0.3 +
            utilization_rate * 0.3 +
            concentration * 0.2 +
            0.1  # Base market risk
        )

        return RiskReport(
            collateral_ratio=collateral_ratio,
            utilization_rate=utilization_rate,
            volatility_score=0.5,  # Placeholder
            liquidity_score=0.7,  # Placeholder
            concentration_risk=concentration,
            overall_risk=overall_risk,
            warnings=warnings
        )

    def _identify_opportunities(self, market_data: MarketData) -> List[Opportunity]:
        """Identify investment opportunities from market data"""
        opportunities = []

        for protocol, curve in market_data.yield_curves.items():
            apy = curve.get("apy", 0)
            volatility = curve.get("volatility", 1)
            tvl = curve.get("tvl", 0)

            # Calculate risk-adjusted return (Sharpe-like ratio)
            risk_adjusted_return = apy / volatility if volatility > 0 else 0

            if risk_adjusted_return > 2.0:  # Sharpe > 2
                opportunities.append(Opportunity(
                    protocol=protocol,
                    asset=curve.get("asset", "USDC"),
                    expected_return=apy,
                    risk_score=volatility,
                    liquidity_score=min(tvl / 1_000_000, 1.0),  # Normalize by 1M
                    confidence=min(risk_adjusted_return / 3.0, 1.0)
                ))

        # Sort by expected return
        return sorted(opportunities, key=lambda x: x.expected_return, reverse=True)

    def _should_rebalance(
        self,
        agent_state: AgentState,
        performance: dict,
        risk_report: RiskReport
    ) -> bool:
        """Determine if portfolio needs rebalancing"""
        # Don't rebalance if we have no positions or just borrowed
        if not agent_state.positions or len(agent_state.positions) == 0:
            return False

        # Don't rebalance if positions are too new (less than 1 hour old)
        if agent_state.positions:
            newest_position_age = time.time() - max(p.timestamp for p in agent_state.positions)
            if newest_position_age < 3600:  # 1 hour
                return False

        # Check concentration - only if we have multiple positions
        if len(agent_state.positions) > 1 and risk_report.concentration_risk > config.MAX_CONCENTRATION:
            return True

        # Check risk exposure - only if significantly high
        if risk_report.overall_risk > 0.8:  # 80% risk threshold
            return True

        # Check Sharpe ratio - only if we have meaningful performance data
        if performance["roi"] != 0 and performance["sharpe_ratio"] < config.MIN_SHARPE_RATIO:
            return True

        return False

    def _should_expand_position(
        self,
        agent_state: AgentState,
        opportunities: List[Opportunity],
        risk_report: RiskReport
    ) -> bool:
        """Determine if should open new positions"""
        # Check if we have good opportunities
        if not opportunities or opportunities[0].expected_return < 0.08:  # 8% APY
            return False

        # Check if we have available credit
        if agent_state.available_credit < agent_state.collateral_amount * 0.1:
            return False

        # Check risk level
        if risk_report.overall_risk > 0.7:
            return False

        return True

    def _should_risk_off(self, agent_state: AgentState, risk_report: RiskReport) -> bool:
        """Determine if should reduce risk"""
        return (
            risk_report.overall_risk > 0.8 or
            risk_report.collateral_ratio < config.MIN_COLLATERAL_RATIO or
            len(risk_report.warnings) > 2
        )

    async def _determine_investment_action(
        self,
        agent_state: AgentState,
        opportunities: List[Opportunity]
    ) -> Decision:
        """Determine specific investment action"""
        if not opportunities:
            return Decision(
                action=InvestmentAction.HOLD,
                params={},
                risk_score=0.5,
                expected_return=0.0,
                timestamp=int(time.time()),
                reasoning="No suitable opportunities found"
            )

        best_opp = opportunities[0]
        borrow_amount = min(
            agent_state.available_credit * 0.5,  # Use 50% of available credit
            agent_state.collateral_amount * config.MAX_POSITION_SIZE
        )

        return Decision(
            action=InvestmentAction.BORROW_AND_INVEST,
            params={
                "borrow_amount": borrow_amount,
                "protocol": best_opp.protocol,
                "asset": best_opp.asset,
                "investment_amount": borrow_amount
            },
            risk_score=best_opp.risk_score,
            expected_return=best_opp.expected_return,
            timestamp=int(time.time()),
            reasoning=f"Investing in {best_opp.protocol} with {best_opp.expected_return:.2%} APY"
        )

    async def _determine_rebalance_action(
        self,
        agent_state: AgentState,
        opportunities: List[Opportunity]
    ) -> Decision:
        """Determine rebalancing action"""
        # Close most concentrated positions
        if agent_state.positions:
            positions_sorted = sorted(
                enumerate(agent_state.positions),
                key=lambda x: x[1].amount,
                reverse=True
            )
            close_indices = [i for i, _ in positions_sorted[:2]]  # Close top 2
        else:
            close_indices = []

        return Decision(
            action=InvestmentAction.REBALANCE,
            params={
                "close_indices": close_indices,
                "new_allocations": []
            },
            risk_score=0.5,
            expected_return=0.0,
            timestamp=int(time.time()),
            reasoning="Rebalancing to reduce concentration risk"
        )

    async def _determine_risk_reduction_action(
        self,
        agent_state: AgentState
    ) -> Decision:
        """Determine risk reduction action"""
        # Close riskiest positions
        if agent_state.positions:
            # Close position with worst performance
            position_index = 0  # Simplified - should calculate actual worst
        else:
            position_index = 0

        return Decision(
            action=InvestmentAction.STOP_LOSS,
            params={"position_index": position_index},
            risk_score=0.9,
            expected_return=0.0,
            timestamp=int(time.time()),
            reasoning="Reducing risk due to high risk score"
        )
