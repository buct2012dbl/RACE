"""Main entry point for AI agents"""
import asyncio
from .orchestrator import AgentOrchestrator
from .config import config

async def main():
    """Main function - Multi-User Support"""
    print("=" * 60)
    print("RACE Protocol - Multi-User AI Agent System")
    print("=" * 60)
    print(f"\nConfiguration:")
    print(f"  Primary Model: {config.PRIMARY_MODEL}")
    print(f"  Risk Model: {config.RISK_MODEL}")
    print(f"  Decision Interval: {config.DECISION_INTERVAL}s")
    print(f"  Risk Check Interval: {config.RISK_CHECK_INTERVAL}s")
    print(f"  AI Agent Address: {config.AI_AGENT_ADDRESS}")
    print(f"  RPC URL: {config.WEB3_PROVIDER_URI}")
    print(f"\n🚀 Multi-User Mode: Processing all users independently")
    print(f"\nStarting agent orchestrator...\n")

    try:
        orchestrator = AgentOrchestrator()
        print("✅ Orchestrator created")

        # Use deployed agent address
        agent_id = config.AI_AGENT_ADDRESS
        if not agent_id or agent_id == "":
            print("❌ Error: AI_AGENT_ADDRESS not configured in .env")
            print("   Please set AI_AGENT_ADDRESS to your deployed contract address")
            return

        print(f"Agent Contract: {agent_id}")
        print(f"Controller: {config.PRIVATE_KEY[:10]}..." if config.PRIVATE_KEY else "No private key")
        print()

        # Run MULTI-USER loop and risk monitoring concurrently
        await asyncio.gather(
            orchestrator.run_multi_user_loop(agent_id),  # NEW: Multi-user loop
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
