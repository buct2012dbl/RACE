"""Test script to demonstrate full trading cycle with take profit and stop loss"""
import asyncio
import time
from src.orchestrator import AgentOrchestrator
from src.config import config

async def main():
    print("=" * 60)
    print("AI AGENT TRADING CYCLE TEST")
    print("=" * 60)
    print(f"\nAgent Address: {config.AI_AGENT_ADDRESS}")
    print(f"Network: Arc Testnet")
    print("\nThis test will:")
    print("1. Make initial investment decision")
    print("2. Monitor positions with simulated price movements")
    print("3. Trigger TAKE_PROFIT or STOP_LOSS when conditions are met")
    print("\n" + "=" * 60 + "\n")

    orchestrator = AgentOrchestrator()
    agent_id = config.AI_AGENT_ADDRESS

    # Run 10 decision cycles (about 5 minutes with 30s intervals)
    for cycle in range(10):
        print(f"\n{'='*60}")
        print(f"CYCLE {cycle + 1}/10 - {time.strftime('%H:%M:%S')}")
        print(f"{'='*60}")

        try:
            # Make decision
            result = await orchestrator.orchestrate_decision(agent_id)

            print(f"\n📊 Decision:")
            print(f"   Action: {result['decision']['action']}")
            print(f"   Reasoning: {result['decision']['reasoning']}")
            print(f"   Risk Score: {result['decision']['risk_score']:.2f}")
            print(f"   Expected Return: {result['decision']['expected_return']:.2%}")

            # Execute decision on-chain (if not HOLD)
            if result['decision']['action'] != "HOLD":
                print(f"\n🔄 Executing {result['decision']['action']} on-chain...")
                await orchestrator._execute_decision(agent_id, result)
                print("✅ Execution complete!")

            # Show current market prices
            market_data = await orchestrator._fetch_market_data()
            print(f"\n💹 Current Market Prices:")
            print(f"   ETH: ${market_data.prices['ETH']:.2f}")
            print(f"   BTC: ${market_data.prices['BTC']:.2f}")

            # Show agent state
            agent_state = await orchestrator._fetch_agent_state(agent_id)
            print(f"\n💼 Portfolio State:")
            print(f"   Collateral: {agent_state.collateral_amount:.2f} RWA")
            print(f"   Borrowed: {agent_state.borrowed_usdc:.2f} USDC")
            print(f"   Available Credit: {agent_state.available_credit:.2f} USDC")
            print(f"   Active Positions: {len(agent_state.positions)}")

            if agent_state.positions:
                print(f"\n📈 Position Details:")
                for idx, pos in enumerate(agent_state.positions):
                    token_name = "ETH" if config.WETH_ADDRESS.lower() in pos.asset.lower() else "BTC"
                    current_price = market_data.prices.get(token_name, 0)
                    entry_price = pos.entry_price  # Use snake_case
                    pnl_pct = ((current_price - entry_price) / entry_price * 100) if entry_price > 0 else 0

                    print(f"   Position {idx}:")
                    print(f"      Token: {token_name}")
                    print(f"      Amount: {pos.amount:.4f}")
                    print(f"      Entry Price: ${entry_price:.2f}")
                    print(f"      Current Price: ${current_price:.2f}")
                    print(f"      PnL: {pnl_pct:+.2f}%")
                    print(f"      Stop Loss: ${pos.stop_loss:.2f} (-10%)")  # Use snake_case
                    print(f"      Take Profit: ${pos.take_profit:.2f} (+20%)")  # Use snake_case

        except Exception as e:
            print(f"❌ Error in cycle {cycle + 1}: {e}")
            import traceback
            traceback.print_exc()

        # Wait before next cycle
        if cycle < 9:
            print(f"\n⏳ Waiting 30 seconds before next cycle...")
            await asyncio.sleep(30)

    print("\n" + "=" * 60)
    print("TEST COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
