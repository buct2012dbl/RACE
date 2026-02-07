"""Test LLM-powered AI agent with real DEX trading"""
import asyncio
from src.orchestrator import AgentOrchestrator
from src.config import config

async def test_llm_agent():
    print("=" * 70)
    print("🤖 Testing AI Agent with Real DEX Trading")
    print("=" * 70)
    print(f"\n📍 Agent Address: {config.AI_AGENT_ADDRESS}")
    print(f"📍 DEX Address: {config.SIMPLE_DEX_ADDRESS}")
    print(f"📍 RPC URL: {config.WEB3_PROVIDER_URI}\n")

    orchestrator = AgentOrchestrator()
    agent_id = config.AI_AGENT_ADDRESS

    try:
        # Fetch current agent state
        print("1️⃣ Fetching agent state from blockchain...")
        agent_state = await orchestrator._fetch_agent_state(agent_id)

        # Get market data
        print("\n2️⃣ Getting market data from simulator...")
        market_data = await orchestrator._fetch_market_data()
        print(f"   ETH Price: ${market_data.prices['ETH']:,.2f}")
        print(f"   BTC Price: ${market_data.prices['BTC']:,.2f}")

        # Make LLM decision
        print("\n3️⃣ Making investment decision...")
        print("   (Using rule-based decision engine)")
        result = await orchestrator.orchestrate_decision(agent_id)

        print(f"\n✅ Decision Made:")
        print(f"   Action: {result['decision']['action']}")
        print(f"   Reasoning: {result['decision']['reasoning']}")
        print(f"   Risk Score: {result['decision']['risk_score']:.2f}")
        print(f"   Expected Return: {result['decision']['expected_return']:.2%}")
        print(f"   Params: {result['decision']['params']}")

        # Execute if not HOLD
        if result['decision']['action'] != "HOLD":
            print(f"\n4️⃣ Executing decision on-chain...")
            print(f"   This will:")
            print(f"   - Borrow USDC from lending pool")
            print(f"   - Swap USDC for {result['decision']['params'].get('token', 'token')} on DEX")
            print(f"   - Record position with real entry price")

            await orchestrator._execute_decision(agent_id, result)
        else:
            print(f"\n💤 Action is HOLD, no transaction needed")

        print("\n" + "=" * 70)
        print("✅ Test Complete!")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_llm_agent())
