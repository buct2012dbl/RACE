"""LLM-Powered Decision Engine using Claude"""
import time
import json
from typing import Dict, List
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

from .models import (
    AgentState, MarketData, Decision, InvestmentAction,
    Opportunity, RiskReport
)
from .config import config


class LLMDecisionEngine:
    """LLM-powered decision engine for autonomous trading"""

    def __init__(self):
        """Initialize decision engine with Claude"""
        self.llm = ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            temperature=0.3,  # Some creativity but mostly deterministic
            anthropic_api_key=config.ANTHROPIC_API_KEY
        )

    async def evaluate(
        self,
        agent_state: AgentState,
        market_data: MarketData,
        timestamp: int
    ) -> Decision:
        """
        Use LLM to evaluate current state and make investment decision
        """
        # 1. Prepare context for LLM
        context = self._prepare_context(agent_state, market_data)

        # 2. Create prompt for LLM
        prompt = self._create_decision_prompt(context, agent_state)

        # 3. Get LLM decision
        response = await self.llm.ainvoke(prompt)

        # 4. Parse LLM response into Decision
        decision = self._parse_llm_response(response.content, agent_state, timestamp)

        return decision

    def _prepare_context(self, agent_state: AgentState, market_data: MarketData) -> Dict:
        """Prepare context data for LLM"""
        # Calculate portfolio metrics
        portfolio_value = agent_state.collateral_amount + agent_state.total_assets
        utilization = agent_state.borrowed_usdc / (agent_state.borrowed_usdc + agent_state.available_credit) if (agent_state.borrowed_usdc + agent_state.available_credit) > 0 else 0
        collateral_ratio = agent_state.collateral_amount / agent_state.borrowed_usdc if agent_state.borrowed_usdc > 0 else float('inf')

        # Get available opportunities
        opportunities = []
        for token, price in market_data.prices.items():
            if token != "USDC":
                opportunities.append({
                    "token": token,
                    "price": price,
                    "potential_return": self._estimate_return(token, market_data)
                })

        return {
            "portfolio": {
                "collateral": agent_state.collateral_amount,
                "borrowed": agent_state.borrowed_usdc,
                "available_credit": agent_state.available_credit,
                "total_value": portfolio_value,
                "utilization": utilization,
                "collateral_ratio": collateral_ratio,
                "positions": len(agent_state.positions)
            },
            "risk_profile": {
                "tolerance": agent_state.config.risk_tolerance,
                "target_roi": agent_state.config.target_roi,
                "max_drawdown": agent_state.config.max_drawdown
            },
            "market": {
                "prices": market_data.prices,
                "opportunities": opportunities,
                "treasury_yield": market_data.treasury_yield
            }
        }

    def _estimate_return(self, token: str, market_data: MarketData) -> float:
        """Estimate potential return for a token"""
        # Simple momentum-based estimation
        volatility = market_data.volatility.get(token, 0.5)
        liquidity = market_data.liquidity.get(token, 0.5)

        # Higher volatility = higher potential return (but also higher risk)
        # Higher liquidity = more stable returns
        estimated_return = (volatility * 0.15) + (liquidity * 0.05)
        return estimated_return

    def _create_decision_prompt(self, context: Dict, agent_state: AgentState) -> str:
        """Create prompt for LLM decision making"""
        prompt = f"""You are an AI trading agent managing a DeFi portfolio. Analyze the current state and make an investment decision.

## Current Portfolio State:
- Collateral: ${context['portfolio']['collateral']:.2f}
- Borrowed USDC: ${context['portfolio']['borrowed']:.2f}
- Available Credit: ${context['portfolio']['available_credit']:.2f}
- Total Portfolio Value: ${context['portfolio']['total_value']:.2f}
- Utilization Rate: {context['portfolio']['utilization']:.1%}
- Collateral Ratio: {context['portfolio']['collateral_ratio']:.2f}x
- Active Positions: {context['portfolio']['positions']}

## Risk Profile:
- Risk Tolerance: {context['risk_profile']['tolerance']}/10
- Target ROI: {context['risk_profile']['target_roi']:.1%}
- Max Drawdown: {context['risk_profile']['max_drawdown']:.1%}

## Market Conditions:
{json.dumps(context['market'], indent=2)}

## Available Actions:
1. **HOLD** - Keep current positions, no action
2. **BORROW_AND_INVEST** - Borrow USDC and buy a token (ETH, BTC, etc.)
3. **REBALANCE** - Close some positions and rebalance
4. **TAKE_PROFIT** - Close profitable positions
5. **STOP_LOSS** - Close losing positions to limit losses

## Decision Guidelines:
- If no positions and available credit > 0: Consider BORROW_AND_INVEST
- If utilization > 80%: Be cautious, consider HOLD or TAKE_PROFIT
- If collateral ratio < 1.5x: URGENT - reduce risk
- If positions are new (< 1 hour): Usually HOLD to let them mature
- Consider market opportunities and risk tolerance

## Your Task:
Analyze the situation and provide a decision in this EXACT JSON format:
{{
    "action": "HOLD|BORROW_AND_INVEST|REBALANCE|TAKE_PROFIT|STOP_LOSS",
    "reasoning": "Brief explanation of why you chose this action",
    "token": "ETH|BTC|null (only for BORROW_AND_INVEST)",
    "amount_usdc": 0.0 (amount to borrow/invest, 0 for other actions),
    "risk_assessment": "LOW|MEDIUM|HIGH",
    "expected_return": 0.0 (estimated return as decimal, e.g., 0.08 for 8%)
}}

Provide ONLY the JSON, no other text."""

        return prompt

    def _parse_llm_response(self, response: str, agent_state: AgentState, timestamp: int) -> Decision:
        """Parse LLM response into Decision object"""
        try:
            # Extract JSON from response
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            response = response.strip()

            data = json.loads(response)

            action = InvestmentAction(data["action"])
            reasoning = data["reasoning"]
            risk_score = {"LOW": 0.2, "MEDIUM": 0.5, "HIGH": 0.8}.get(data["risk_assessment"], 0.5)
            expected_return = data["expected_return"]

            # Build params based on action
            params = {}
            if action == InvestmentAction.BORROW_AND_INVEST:
                token = data.get("token")
                amount_usdc = data.get("amount_usdc", 0)

                # Validate amount
                if amount_usdc > agent_state.available_credit:
                    amount_usdc = agent_state.available_credit * 0.5  # Use 50% of available

                params = {
                    "borrow_amount": amount_usdc,
                    "token": token,
                    "amount": amount_usdc
                }

            return Decision(
                action=action,
                params=params,
                risk_score=risk_score,
                expected_return=expected_return,
                timestamp=timestamp,
                reasoning=reasoning
            )

        except Exception as e:
            print(f"Error parsing LLM response: {e}")
            print(f"Response was: {response}")
            # Fallback to HOLD
            return Decision(
                action=InvestmentAction.HOLD,
                params={},
                risk_score=0.5,
                expected_return=0.0,
                timestamp=timestamp,
                reasoning=f"Failed to parse LLM response: {str(e)}"
            )
