#!/usr/bin/env python3
"""Test position fetching with fixed field names"""

import asyncio
from src.orchestrator import AgentOrchestrator
from src.simple_decision_engine import SimpleDecisionEngine

async def main():
    print("Testing position fetching with fixed field names...")

    orchestrator = AgentOrchestrator()

    # Use the actual agent address
    agent_address = "0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f"

    # Fetch agent state
    agent_state = await orchestrator._fetch_agent_state(agent_address)

    print(f"\n✅ Agent State:")
    print(f"   Collateral: {agent_state.collateral_amount}")
    print(f"   Borrowed: {agent_state.borrowed_usdc}")
    print(f"   Available Credit: {agent_state.available_credit}")
    print(f"   Positions: {len(agent_state.positions)}")

    if len(agent_state.positions) > 0:
        print(f"\n📊 Positions:")
        for idx, pos in enumerate(agent_state.positions):
            print(f"\n   Position {idx}:")
            print(f"      Asset: {pos.asset}")
            print(f"      Amount: {pos.amount}")
            print(f"      Entry Price: {pos.entry_price}")
            print(f"      Stop Loss: {pos.stop_loss}")
            print(f"      Take Profit: {pos.take_profit}")
    else:
        print("\n   No positions found")

if __name__ == "__main__":
    asyncio.run(main())
