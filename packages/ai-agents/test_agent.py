"""Test script to run AI agent once"""
import asyncio
from src.orchestrator import AgentOrchestrator
from src.config import config

async def test_agent():
    print("=" * 60)
    print("Testing AI Agent - Single Decision Cycle")
    print("=" * 60)
    print(f"\nAgent Address: {config.AI_AGENT_ADDRESS}")
    print(f"RPC URL: {config.WEB3_PROVIDER_URI}\n")

    orchestrator = AgentOrchestrator()
    agent_id = config.AI_AGENT_ADDRESS

    try:
        # Make one decision
        print("Making investment decision...")
        result = await orchestrator.orchestrate_decision(agent_id)

        print(f"\n✅ Decision made:")
        print(f"Action: {result['decision']['action']}")
        print(f"Reasoning: {result['decision']['reasoning']}")
        print(f"Risk Score: {result['decision']['risk_score']:.2f}")
        print(f"Expected Return: {result['decision']['expected_return']:.2%}")
        print(f"Params: {result['decision']['params']}")

        # Execute if not HOLD
        if result['decision']['action'] != "HOLD":
            print(f"\n🤖 Executing decision on-chain...")
            await orchestrator._execute_decision(agent_id, result)
        else:
            print(f"\n💤 Action is HOLD, no transaction needed")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_agent())
