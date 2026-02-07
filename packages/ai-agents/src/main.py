"""Main entry point for AI agents"""
import asyncio
from .orchestrator import AgentOrchestrator
from .config import config

async def main():
    """Main function"""
    print("=" * 60)
    print("RACE Protocol - AI Agent System")
    print("=" * 60)
    print(f"\nConfiguration:")
    print(f"  Primary Model: {config.PRIMARY_MODEL}")
    print(f"  Risk Model: {config.RISK_MODEL}")
    print(f"  Decision Interval: {config.DECISION_INTERVAL}s")
    print(f"  Risk Check Interval: {config.RISK_CHECK_INTERVAL}s")
    print(f"  AI Agent Address: {config.AI_AGENT_ADDRESS}")
    print(f"  RPC URL: {config.WEB3_PROVIDER_URI}")
    print(f"\nStarting agent orchestrator...\n")

    try:
        orchestrator = AgentOrchestrator()
        print("✅ Orchestrator created")

        # Example agent address (replace with actual deployed agent)
        agent_id = config.AI_AGENT_ADDRESS or "0x1234567890123456789012345678901234567890"
        print(f"Agent ID: {agent_id}\n")

        # Run agent loop and risk monitoring concurrently
        await asyncio.gather(
            orchestrator.run_agent_loop(agent_id),
            orchestrator.monitor_risk(agent_id)
        )
    except Exception as e:
        print(f"❌ Error in main: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nShutting down AI agent system...")
