"""
Integration tests for multi-user orchestrator
"""
import asyncio
import pytest
from unittest.mock import Mock, AsyncMock, patch
from web3 import Web3

from src.orchestrator import AgentOrchestrator
from src.models import AgentState, AgentConfig, Position


@pytest.fixture
def mock_w3():
    """Mock Web3 instance"""
    w3 = Mock(spec=Web3)
    w3.from_wei = lambda val, unit: float(val) / 1e18 if unit == 'ether' else float(val)
    w3.to_wei = lambda val, unit: int(val * 1e18) if unit == 'ether' else int(val)
    w3.to_checksum_address = lambda addr: addr
    w3.eth = Mock()
    w3.eth.get_transaction_count = Mock(return_value=0)
    w3.eth.gas_price = 20000000000
    w3.eth.account = Mock()
    w3.eth.account.from_key = Mock(return_value=Mock(address="0xController"))
    w3.eth.contract = Mock()
    return w3


@pytest.fixture
def orchestrator(mock_w3):
    """Create orchestrator instance with mocked Web3"""
    with patch('src.orchestrator.Web3', return_value=mock_w3):
        orch = AgentOrchestrator()
        orch.w3 = mock_w3
        return orch


@pytest.mark.asyncio
class TestMultiUserOrchestrator:
    """Test multi-user orchestrator functionality"""

    async def test_fetch_user_specific_state(self, orchestrator, mock_w3):
        """Test fetching state for specific user"""
        agent_id = "0xAgent123"
        user_address = "0xUser001"

        # Mock contract calls
        mock_contract = Mock()
        mock_contract.functions.getUserState = Mock()
        mock_contract.functions.getUserState().call = Mock(return_value=(
            ("0xOwner", 5, 1200, 1500, []),  # config
            "0xRWA",  # rwaCollateral
            int(1000 * 1e18),  # collateralAmount
            int(500 * 1e18),  # borrowedUSDC
            int(500 * 1e18),  # availableCredit
            int(100 * 1e18),  # totalAssets
        ))
        mock_contract.functions.getUserPositions = Mock()
        mock_contract.functions.getUserPositions().call = Mock(return_value=[])

        mock_w3.eth.contract = Mock(return_value=mock_contract)

        # Fetch state
        state = await orchestrator._fetch_agent_state(agent_id, user_address)

        # Verify
        assert state.collateral_amount == 1000.0
        assert state.borrowed_usdc == 500.0
        assert state.available_credit == 500.0
        mock_contract.functions.getUserState.assert_called_once()

    async def test_orchestrate_decision_with_user(self, orchestrator):
        """Test making decision for specific user"""
        agent_id = "0xAgent123"
        user_address = "0xUser001"

        # Mock methods
        orchestrator._fetch_agent_state = AsyncMock(return_value=AgentState(
            config=AgentConfig(
                owner="0xUser001",
                risk_tolerance=5,
                target_roi=0.12,
                max_drawdown=0.15,
                strategies=[]
            ),
            rwa_collateral="0xRWA",
            collateral_amount=1000.0,
            borrowed_usdc=0.0,
            available_credit=666.0,
            total_assets=0.0,
            positions=[]
        ))

        orchestrator._fetch_market_data = AsyncMock(return_value=Mock())
        orchestrator.decision_engine.evaluate = AsyncMock(return_value=Mock(
            action="HOLD",
            params={},
            risk_score=0.3,
            expected_return=0.08,
            reasoning="Market conditions unfavorable",
            dict=lambda: {
                "action": "HOLD",
                "params": {},
                "risk_score": 0.3,
                "expected_return": 0.08,
                "reasoning": "Market conditions unfavorable"
            }
        ))

        orchestrator._store_decision = AsyncMock()

        # Execute
        result = await orchestrator.orchestrate_decision(agent_id, user_address)

        # Verify
        assert result["user_address"] == user_address
        assert result["decision"]["action"] == "HOLD"
        orchestrator._store_decision.assert_called_once_with(agent_id, user_address, Mock)

    async def test_get_all_users(self, orchestrator, mock_w3):
        """Test retrieving all users from contract"""
        agent_id = "0xAgent123"

        # Mock contract
        mock_contract = Mock()
        mock_contract.functions.getAllUsers = Mock()
        mock_contract.functions.getAllUsers().call = Mock(return_value=[
            "0xUser001",
            "0xUser002",
            "0xUser003"
        ])

        mock_w3.eth.contract = Mock(return_value=mock_contract)

        # Execute
        users = await orchestrator._get_all_users(agent_id)

        # Verify
        assert len(users) == 3
        assert "0xUser001" in users
        assert "0xUser002" in users
        assert "0xUser003" in users

    async def test_multi_user_loop_iteration(self, orchestrator):
        """Test one iteration of multi-user loop"""
        agent_id = "0xAgent123"

        # Mock methods
        orchestrator._get_all_users = AsyncMock(return_value=[
            "0xUser001",
            "0xUser002"
        ])

        orchestrator.orchestrate_decision = AsyncMock(return_value={
            "decision": {
                "action": "HOLD",
                "params": {},
                "risk_score": 0.3,
                "expected_return": 0.08,
                "reasoning": "Test"
            },
            "user_address": "0xUser001"
        })

        orchestrator._execute_decision = AsyncMock()

        # Mock to stop after one iteration
        call_count = 0

        async def mock_sleep(seconds):
            nonlocal call_count
            call_count += 1
            if call_count >= 1:
                raise KeyboardInterrupt()

        with patch('asyncio.sleep', side_effect=mock_sleep):
            try:
                await orchestrator.run_multi_user_loop(agent_id)
            except KeyboardInterrupt:
                pass

        # Verify both users were processed
        assert orchestrator.orchestrate_decision.call_count == 2

    async def test_execute_decision_with_user_parameter(self, orchestrator, mock_w3):
        """Test executing decision with user parameter"""
        agent_id = "0xAgent123"
        user_address = "0xUser001"

        result = {
            "decision": {
                "action": "HOLD",
                "params": {}
            }
        }

        # Mock contract
        mock_contract = Mock()
        mock_contract.functions.makeInvestmentDecision = Mock()

        mock_tx_builder = Mock()
        mock_tx_builder.build_transaction = Mock(return_value={
            'from': '0xController',
            'nonce': 0,
            'gas': 1000000,
            'gasPrice': 20000000000
        })

        mock_contract.functions.makeInvestmentDecision.return_value = mock_tx_builder

        mock_w3.eth.contract = Mock(return_value=mock_contract)
        mock_w3.eth.account.sign_transaction = Mock(return_value=Mock(
            rawTransaction=b'0x123'
        ))
        mock_w3.eth.send_raw_transaction = Mock(return_value=b'0xHash')
        mock_w3.eth.wait_for_transaction_receipt = Mock(return_value={
            'blockNumber': 12345
        })

        # Execute
        await orchestrator._execute_decision(agent_id, user_address, result)

        # Verify makeInvestmentDecision was called with user parameter
        mock_contract.functions.makeInvestmentDecision.assert_called_once()
        call_args = mock_contract.functions.makeInvestmentDecision.call_args[0]
        assert call_args[0] == user_address  # First argument should be user address

    async def test_store_decision_with_user_address(self, orchestrator):
        """Test storing decision with user_address in database"""
        agent_id = "0xAgent123"
        user_address = "0xUser001"

        decision = Mock(
            action="BORROW_AND_INVEST",
            params={"borrow_amount": 100, "token": "BTC"},
            risk_score=0.4,
            expected_return=0.12,
            reasoning="Good opportunity"
        )

        # Mock Supabase
        with patch.dict('os.environ', {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_KEY': 'test-key'
        }):
            with patch('src.orchestrator.create_client') as mock_create_client:
                mock_supabase = Mock()
                mock_table = Mock()
                mock_insert = Mock()
                mock_insert.execute = Mock()

                mock_table.insert = Mock(return_value=mock_insert)
                mock_supabase.table = Mock(return_value=mock_table)
                mock_create_client.return_value = mock_supabase

                # Execute
                await orchestrator._store_decision(agent_id, user_address, decision)

                # Verify
                mock_supabase.table.assert_called_once_with('agent_decisions')
                mock_table.insert.assert_called_once()

                # Check that user_address was included in the data
                insert_data = mock_table.insert.call_args[0][0]
                assert insert_data['user_address'] == user_address
                assert insert_data['agent_id'] == agent_id
                assert insert_data['action'] == "BORROW_AND_INVEST"

    async def test_monitor_user_risk(self, orchestrator):
        """Test risk monitoring for specific user"""
        agent_id = "0xAgent123"
        user_address = "0xUser001"

        # Mock methods
        orchestrator._fetch_agent_state = AsyncMock(return_value=AgentState(
            config=AgentConfig(
                owner=user_address,
                risk_tolerance=5,
                target_roi=0.12,
                max_drawdown=0.15,
                strategies=[]
            ),
            rwa_collateral="0xRWA",
            collateral_amount=1000.0,
            borrowed_usdc=800.0,  # High utilization
            available_credit=100.0,
            total_assets=500.0,
            positions=[]
        ))

        orchestrator._fetch_market_data = AsyncMock(return_value=Mock())

        orchestrator.decision_engine._assess_risk = AsyncMock(return_value=Mock(
            warnings=["High utilization rate", "Low collateral ratio"]
        ))

        # Execute
        await orchestrator._monitor_user_risk(agent_id, user_address)

        # Verify
        orchestrator._fetch_agent_state.assert_called_once_with(agent_id, user_address)
        orchestrator.decision_engine._assess_risk.assert_called_once()

    async def test_multiple_users_independent_states(self, orchestrator, mock_w3):
        """Test that multiple users have independent states"""
        agent_id = "0xAgent123"
        user1 = "0xUser001"
        user2 = "0xUser002"

        # Mock different states for each user
        def mock_get_user_state(user):
            if user == user1:
                return (
                    ("0xOwner1", 5, 1200, 1500, []),
                    "0xRWA",
                    int(1000 * 1e18),
                    int(200 * 1e18),
                    int(400 * 1e18),
                    int(100 * 1e18),
                )
            else:
                return (
                    ("0xOwner2", 7, 1500, 2000, []),
                    "0xRWA",
                    int(2000 * 1e18),
                    int(500 * 1e18),
                    int(800 * 1e18),
                    int(300 * 1e18),
                )

        mock_contract = Mock()
        mock_contract.functions.getUserState = lambda user: Mock(
            call=Mock(return_value=mock_get_user_state(user))
        )
        mock_contract.functions.getUserPositions = Mock()
        mock_contract.functions.getUserPositions().call = Mock(return_value=[])

        mock_w3.eth.contract = Mock(return_value=mock_contract)

        # Fetch states
        state1 = await orchestrator._fetch_agent_state(agent_id, user1)
        state2 = await orchestrator._fetch_agent_state(agent_id, user2)

        # Verify independence
        assert state1.collateral_amount == 1000.0
        assert state2.collateral_amount == 2000.0
        assert state1.borrowed_usdc == 200.0
        assert state2.borrowed_usdc == 500.0

    async def test_empty_user_list_handling(self, orchestrator):
        """Test handling when no users exist"""
        agent_id = "0xAgent123"

        orchestrator._get_all_users = AsyncMock(return_value=[])

        call_count = 0

        async def mock_sleep(seconds):
            nonlocal call_count
            call_count += 1
            if call_count >= 1:
                raise KeyboardInterrupt()

        with patch('asyncio.sleep', side_effect=mock_sleep):
            try:
                await orchestrator.run_multi_user_loop(agent_id)
            except KeyboardInterrupt:
                pass

        # Verify orchestrate_decision was never called
        orchestrator._get_all_users.assert_called()


@pytest.mark.asyncio
class TestBackwardCompatibility:
    """Test backward compatibility with single-user mode"""

    async def test_legacy_run_agent_loop(self, orchestrator):
        """Test legacy single-user loop still works"""
        agent_id = "0xAgent123"

        orchestrator.orchestrate_decision = AsyncMock(return_value={
            "decision": {
                "action": "HOLD",
                "params": {},
                "risk_score": 0.3,
                "expected_return": 0.08,
                "reasoning": "Test"
            }
        })

        orchestrator._execute_decision = AsyncMock()

        call_count = 0

        async def mock_sleep(seconds):
            nonlocal call_count
            call_count += 1
            if call_count >= 1:
                raise KeyboardInterrupt()

        with patch('asyncio.sleep', side_effect=mock_sleep):
            try:
                await orchestrator.run_agent_loop(agent_id)
            except KeyboardInterrupt:
                pass

        # Verify it was called at least once
        assert orchestrator.orchestrate_decision.call_count >= 1
