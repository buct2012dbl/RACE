"""Test risk monitoring"""
import asyncio
from src.orchestrator import AgentOrchestrator
from src.config import config

async def test_risk_monitor():
    print("=" * 70)
    print("🛡️  Testing Risk Monitoring")
    print("=" * 70)
    print(f"\n📍 Agent Address: {config.AI_AGENT_ADDRESS}\n")

    orchestrator = AgentOrchestrator()
    agent_id = config.AI_AGENT_ADDRESS

    try:
        # Fetch current agent state
        print("1️⃣ Fetching agent state...")
        agent_state = await orchestrator._fetch_agent_state(agent_id)
        print(f"   Collateral: {agent_state.collateral_amount}")
        print(f"   Borrowed: {agent_state.borrowed_usdc}")
        print(f"   Positions: {len(agent_state.positions)}")

        # Get market data
        print("\n2️⃣ Getting market data...")
        market_data = await orchestrator._fetch_market_data()

        # Assess risk
        print("\n3️⃣ Assessing risk...")
        risk_report = await orchestrator.decision_engine._assess_risk(
            agent_state,
            market_data
        )

        print(f"\n✅ Risk Assessment:")
        print(f"   Overall Risk: {risk_report.overall_risk:.2f}")
        print(f"   Collateral Ratio: {risk_report.collateral_ratio:.2f}x")
        print(f"   Utilization Rate: {risk_report.utilization_rate:.1%}")
        print(f"   Concentration Risk: {risk_report.concentration_risk:.1%}")
        print(f"   Volatility Score: {risk_report.volatility_score:.2f}")
        print(f"   Liquidity Score: {risk_report.liquidity_score:.2f}")

        if risk_report.warnings:
            print(f"\n⚠️  Warnings:")
            for warning in risk_report.warnings:
                print(f"   - {warning}")
        else:
            print(f"\n✅ No risk warnings")

        print("\n" + "=" * 70)
        print("✅ Risk Monitoring Test Complete!")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_risk_monitor())
