"""Test a single transaction with fixed DEX addresses"""
import asyncio
from src.orchestrator import AgentOrchestrator

async def test_single_transaction():
    print("=" * 60)
    print("SINGLE TRANSACTION TEST")
    print("=" * 60)

    orchestrator = AgentOrchestrator()
    agent_address = '0xa271d4888d44bb1f994A4c917dC9Fb54eaD01F4f'

    # Get initial state
    print("\n📊 Initial State:")
    initial_state = await orchestrator._fetch_agent_state(agent_address)
    print(f"   Borrowed: {initial_state.borrowed_usdc} USDC")
    print(f"   Available Credit: {initial_state.available_credit} USDC")
    print(f"   Positions: {len(initial_state.positions)}")

    # Make decision and execute
    print("\n🔄 Making decision and executing transaction...")
    result = await orchestrator.orchestrate_decision(agent_address)

    print(f"\n📊 Decision:")
    print(f"   Action: {result['decision']['action']}")
    print(f"   Reasoning: {result['decision']['reasoning'][:150]}...")

    if 'tx_hash' in result:
        print(f"\n✅ Transaction Hash: {result['tx_hash']}")
        print("⏳ Waiting 15 seconds for confirmation...")
        await asyncio.sleep(15)

        # Get final state
        print("\n📊 Final State:")
        final_state = await orchestrator._fetch_agent_state(agent_address)
        print(f"   Borrowed: {final_state.borrowed_usdc} USDC")
        print(f"   Available Credit: {final_state.available_credit} USDC")
        print(f"   Positions: {len(final_state.positions)}")

        # Check if state changed
        borrowed_changed = final_state.borrowed_usdc != initial_state.borrowed_usdc
        positions_changed = len(final_state.positions) != len(initial_state.positions)

        if borrowed_changed or positions_changed:
            print("\n✅ SUCCESS! Transaction executed and state changed!")

            if len(final_state.positions) > 0:
                print(f"\n📈 Position Created:")
                pos = final_state.positions[0]
                print(f"   Asset: {pos.asset_address}")
                print(f"   Amount: {pos.amount}")
                print(f"   Entry Price: {pos.entry_price}")
                print(f"   Stop Loss: {pos.stop_loss}")
                print(f"   Take Profit: {pos.take_profit}")
        else:
            print("\n❌ FAILED! Transaction confirmed but state unchanged (likely reverted)")
    else:
        print("\n❌ No transaction was sent")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(test_single_transaction())
