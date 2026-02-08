"""Agent orchestrator for managing multiple AI agents"""
import asyncio
import time
from typing import Dict, List, Optional
from web3 import Web3
from .simple_decision_engine import SimpleDecisionEngine
from .market_simulator import MarketSimulator
from .models import AgentState, MarketData, Decision
from .config import config
from .price_service import get_price_service

class AgentOrchestrator:
    """Orchestrates multiple AI agents"""

    def __init__(self):
        """Initialize orchestrator"""
        self.w3 = Web3(Web3.HTTPProvider(config.WEB3_PROVIDER_URI))
        self.decision_engine = SimpleDecisionEngine()
        self.market_simulator = MarketSimulator()
        self.active_agents: Dict[str, AgentState] = {}
        self.price_service = get_price_service()

        # Token address to symbol mapping
        self.token_address_to_symbol = {
            config.WETH_ADDRESS.lower(): "ETH",
            config.WBTC_ADDRESS.lower(): "BTC",
        }

    async def orchestrate_decision(self, agent_id: str) -> Dict:
        """
        Orchestrate decision-making for an agent

        Args:
            agent_id: Agent contract address

        Returns:
            Decision result with proof
        """
        # Get agent state from blockchain
        agent_state = await self._fetch_agent_state(agent_id)

        # Get market data
        market_data = await self._fetch_market_data()

        # Make decision
        decision = await self.decision_engine.evaluate(
            agent_state,
            market_data,
            int(time.time()),
            orchestrator=self  # Pass orchestrator for DEX price fetching
        )

        # Generate proof (simplified - in production use ZK proofs)
        proof = self._generate_proof(decision)

        # Sign decision
        signature = self._sign_decision(decision)

        return {
            "decision": decision.dict(),
            "proof": proof,
            "timestamp": int(time.time()),
            "signature": signature
        }

    async def _fetch_agent_state(self, agent_id: str) -> AgentState:
        """Fetch agent state from blockchain"""
        from .models import AgentConfig, Position

        try:
            # Load AIAgent contract ABI
            import json
            import os

            # Get contract ABI from artifacts - go up to project root
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            abi_path = os.path.join(
                project_root,
                "contracts/artifacts/contracts/AIAgent.sol/AIAgent.json"
            )

            if not os.path.exists(abi_path):
                print(f"⚠️  ABI file not found at {abi_path}")
                raise FileNotFoundError(f"ABI file not found: {abi_path}")

            with open(abi_path, 'r') as f:
                contract_json = json.load(f)
                abi = contract_json['abi']

            # Create contract instance
            contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(agent_id),
                abi=abi
            )

            # Fetch agent state from contract
            print(f"Fetching agent state from {agent_id}...")
            state = contract.functions.agentState().call()

            # Parse the state tuple
            # state = (config, rwaCollateral, collateralAmount, borrowedUSDC, availableCredit, totalAssets)
            config_tuple = state[0]

            # Fetch positions
            positions = []
            try:
                positions_data = contract.functions.getAllPositions().call()
                for pos in positions_data:
                    positions.append(Position(
                        protocol=pos[0],
                        asset=pos[1],
                        amount=float(self.w3.from_wei(pos[2], 'ether')),
                        entry_price=float(pos[3]) / 1e18,  # Price values ARE in wei (scaled by 10^18), unscale them
                        timestamp=pos[4],
                        stop_loss=float(pos[5]) / 1e18,  # Price values ARE in wei (scaled by 10^18), unscale them
                        take_profit=float(pos[6]) / 1e18  # Price values ARE in wei (scaled by 10^18), unscale them
                    ))
                print(f"   Positions: {len(positions)}")
            except Exception as e:
                print(f"   Warning: Could not fetch positions: {e}")

            agent_state = AgentState(
                config=AgentConfig(
                    owner=config_tuple[0],
                    risk_tolerance=config_tuple[1],
                    target_roi=config_tuple[2] / 10000.0,  # Convert from basis points
                    max_drawdown=config_tuple[3] / 10000.0,  # Convert from basis points
                    strategies=list(config_tuple[4])
                ),
                rwa_collateral=state[1],
                collateral_amount=float(self.w3.from_wei(state[2], 'ether')),
                borrowed_usdc=float(self.w3.from_wei(state[3], 'ether')),
                available_credit=float(self.w3.from_wei(state[4], 'ether')),
                total_assets=float(self.w3.from_wei(state[5], 'ether')),
                positions=positions
            )

            print(f"✅ Agent state fetched:")
            print(f"   Collateral: {agent_state.collateral_amount}")
            print(f"   Borrowed: {agent_state.borrowed_usdc}")
            print(f"   Available Credit: {agent_state.available_credit}")

            return agent_state

        except Exception as e:
            print(f"❌ Error fetching agent state: {e}")
            import traceback
            traceback.print_exc()
            # Return default state on error
            return AgentState(
                config=AgentConfig(
                    owner="0x" + "0" * 40,
                    risk_tolerance=5,
                    target_roi=0.12,
                    max_drawdown=0.15,
                    strategies=[]
                ),
                rwa_collateral="0x" + "0" * 40,
                collateral_amount=0.0,
                borrowed_usdc=0.0,
                available_credit=0.0,
                total_assets=0.0,
                positions=[]
            )

    async def _fetch_market_data(self) -> MarketData:
        """Fetch market data from simulator"""
        return self.market_simulator.get_market_data()

    def get_market_price(self, token_symbol: str) -> Optional[float]:
        """
        Get current market price from CoinGecko for a token

        Args:
            token_symbol: Token symbol (e.g., "BTC", "ETH")

        Returns:
            Current market price in USD, or None if fetch fails
        """
        try:
            price = self.price_service.get_current_price(token_symbol)
            if price:
                print(f"Market price for {token_symbol}: ${price:,.2f}")
            return price
        except Exception as e:
            print(f"Warning: Could not get market price for {token_symbol}: {e}")
            return None

    def get_dex_price(self, token_address: str) -> float:
        """
        Get current price for a token, preferring CoinGecko with DEX as fallback

        Args:
            token_address: Address of the token to get price for

        Returns:
            Current price in USD (NOT scaled, e.g., 69325 for BTC)
        """
        # Try to get market price from CoinGecko first
        token_symbol = self.token_address_to_symbol.get(token_address.lower())
        if token_symbol:
            market_price = self.get_market_price(token_symbol)
            if market_price:
                # Return unscaled price in USD
                return market_price

        # Fallback to DEX price
        print(f"Falling back to DEX price for {token_address}")
        dex_price_scaled = self._get_dex_price_from_contract(token_address)
        # DEX returns price scaled by 10^18, so divide to get USD price
        return dex_price_scaled / 1e18 if dex_price_scaled > 0 else 0.0

    def _get_dex_price_from_contract(self, token_address: str) -> float:
        """
        Get current price from DEX contract for a token

        Args:
            token_address: Address of the token to get price for

        Returns:
            Current DEX price (USDC per token, scaled by 10^18)
            Note: Caller should divide by 1e18 to get USD price
        """
        try:
            import json

            # Load DEX ABI
            with open('../contracts/artifacts/contracts/SimpleDEX.sol/SimpleDEX.json') as f:
                dex_abi = json.load(f)['abi']

            # Get DEX contract
            dex_address = self.w3.to_checksum_address(config.SIMPLE_DEX_ADDRESS)
            dex_contract = self.w3.eth.contract(address=dex_address, abi=dex_abi)

            # Get USDC address
            usdc_address = self.w3.to_checksum_address(config.MOCK_USDC_ADDRESS)
            token_address = self.w3.to_checksum_address(token_address)

            # Get price from DEX (returns USDC per token, scaled by 10^18)
            price = dex_contract.functions.getPrice(usdc_address, token_address).call()

            return float(price)

        except Exception as e:
            print(f"Warning: Could not get DEX price for {token_address}: {e}")
            return 0.0

    def _generate_proof(self, decision: Decision) -> str:
        """Generate ZK proof for decision"""
        # In production, implement actual ZK proof generation
        return "0x" + "proof" * 16

    def _sign_decision(self, decision: Decision) -> str:
        """Sign decision with agent's private key"""
        if not config.PRIVATE_KEY:
            return "0x" + "0" * 130

        try:
            # Create message hash from decision JSON
            from eth_account.messages import encode_defunct

            message = encode_defunct(text=decision.json())

            # Sign message
            signed = self.w3.eth.account.sign_message(
                message,
                private_key=config.PRIVATE_KEY
            )

            return signed.signature.hex()
        except Exception as e:
            print(f"Warning: Could not sign decision: {e}")
            return "0x" + "0" * 130

    async def run_agent_loop(self, agent_id: str):
        """Run continuous agent loop"""
        print(f"Starting agent loop for {agent_id}")

        while True:
            try:
                # Make decision
                result = await self.orchestrate_decision(agent_id)

                print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Agent Decision:")
                print(f"Action: {result['decision']['action']}")
                print(f"Reasoning: {result['decision']['reasoning']}")
                print(f"Risk Score: {result['decision']['risk_score']:.2f}")
                print(f"Expected Return: {result['decision']['expected_return']:.2%}")

                # Execute decision on-chain (if not HOLD)
                if result['decision']['action'] != "HOLD":
                    await self._execute_decision(agent_id, result)

                # Wait for next decision interval
                await asyncio.sleep(config.DECISION_INTERVAL)

            except Exception as e:
                print(f"Error in agent loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error

    async def _execute_decision(self, agent_id: str, result: Dict):
        """Execute decision on blockchain"""
        print(f"\n🤖 Executing decision on-chain for agent {agent_id}")

        if not config.PRIVATE_KEY:
            print("⚠️  No private key configured, skipping on-chain execution")
            return

        try:
            import json
            import os

            # Load AIAgent contract ABI
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            abi_path = os.path.join(
                project_root,
                "contracts/artifacts/contracts/AIAgent.sol/AIAgent.json"
            )

            with open(abi_path, 'r') as f:
                contract_json = json.load(f)
                abi = contract_json['abi']

            # Create contract instance
            contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(agent_id),
                abi=abi
            )

            # Get account from private key
            account = self.w3.eth.account.from_key(config.PRIVATE_KEY)

            # Map action to enum value
            action_map = {
                "HOLD": 0,
                "BORROW_AND_INVEST": 1,
                "REBALANCE": 2,
                "TAKE_PROFIT": 3,
                "STOP_LOSS": 4
            }

            action = result['decision']['action']
            action_enum = action_map.get(action, 0)

            print(f"Action: {action} (enum: {action_enum})")
            print(f"Params: {result['decision']['params']}")

            # Encode parameters based on action
            params = self._encode_params(action, result['decision']['params'])

            # Build transaction
            nonce = self.w3.eth.get_transaction_count(account.address)

            tx = contract.functions.makeInvestmentDecision(
                action_enum,
                params
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': 1000000,
                'gasPrice': self.w3.eth.gas_price
            })

            # Sign and send transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, config.PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            print(f"✅ Transaction sent: {tx_hash.hex()}")

            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            print(f"✅ Transaction confirmed in block {receipt['blockNumber']}")

        except Exception as e:
            print(f"❌ Error executing decision on-chain: {e}")
            import traceback
            traceback.print_exc()

    def _encode_params(self, action: str, params: Dict) -> bytes:
        """Encode parameters for smart contract call"""
        from eth_abi import encode

        if action == "BORROW_AND_INVEST":
            # New format: (uint256 borrowAmount, address dexAddress, address tokenOut, uint256 minAmountOut)
            borrow_amount = self.w3.to_wei(params.get('borrow_amount', 0), 'ether')

            # Get DEX address
            dex_address = self.w3.to_checksum_address(config.SIMPLE_DEX_ADDRESS or '0x' + '0' * 40)

            # Get token address based on token name
            token_name = params.get('token', 'ETH')
            if token_name == 'ETH':
                token_out = self.w3.to_checksum_address(config.WETH_ADDRESS or '0x' + '0' * 40)
            elif token_name == 'BTC':
                token_out = self.w3.to_checksum_address(config.WBTC_ADDRESS or '0x' + '0' * 40)
            else:
                token_out = self.w3.to_checksum_address(config.WETH_ADDRESS or '0x' + '0' * 40)

            # Get expected output amount from DEX
            try:
                # Load SimpleDEX ABI
                import json
                import os
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                dex_abi_path = os.path.join(
                    project_root,
                    "contracts/artifacts/contracts/SimpleDEX.sol/SimpleDEX.json"
                )

                with open(dex_abi_path, 'r') as f:
                    dex_json = json.load(f)
                    dex_abi = dex_json['abi']

                # Create DEX contract instance
                dex_contract = self.w3.eth.contract(
                    address=dex_address,
                    abi=dex_abi
                )

                # Get expected output amount
                usdc_address = self.w3.to_checksum_address(config.MOCK_USDC_ADDRESS)
                expected_out = dex_contract.functions.getAmountOut(
                    usdc_address,
                    token_out,
                    borrow_amount
                ).call()

                # Calculate minimum with 2% slippage
                min_amount_out = int(expected_out * 0.98)

                print(f"Encoded params:")
                print(f"  Borrow: {self.w3.from_wei(borrow_amount, 'ether')} USDC")
                print(f"  DEX: {dex_address}")
                print(f"  Token Out: {token_out} ({token_name})")
                print(f"  Expected Out: {self.w3.from_wei(expected_out, 'ether')}")
                print(f"  Min Amount Out: {self.w3.from_wei(min_amount_out, 'ether')} (2% slippage)")

            except Exception as e:
                print(f"Warning: Could not get expected output from DEX: {e}")
                # Fallback: use a very low minimum (accept high slippage)
                min_amount_out = 1  # Accept any amount
                print(f"Using fallback min_amount_out: {min_amount_out}")

            return encode(
                ['uint256', 'address', 'address', 'uint256'],
                [borrow_amount, dex_address, token_out, min_amount_out]
            )
        elif action == "REBALANCE":
            # Encode (uint256[] closeIndices, uint256[] newAllocations)
            close_indices = params.get('close_indices', [])
            new_allocations = params.get('new_allocations', [])
            return encode(
                ['uint256[]', 'uint256[]'],
                [close_indices, new_allocations]
            )
        elif action in ["TAKE_PROFIT", "STOP_LOSS"]:
            # Encode (uint256 positionIndex)
            position_index = params.get('position_index', 0)
            return encode(['uint256'], [position_index])
        else:
            # HOLD or unknown action
            return b''

    async def monitor_risk(self, agent_id: str):
        """Continuously monitor agent risk"""
        print(f"Starting risk monitoring for {agent_id}")

        while True:
            try:
                agent_state = await self._fetch_agent_state(agent_id)
                market_data = await self._fetch_market_data()

                risk_report = await self.decision_engine._assess_risk(
                    agent_state,
                    market_data
                )

                if risk_report.warnings:
                    print(f"\n⚠️  RISK WARNINGS for {agent_id}:")
                    for warning in risk_report.warnings:
                        print(f"  - {warning}")

                await asyncio.sleep(config.RISK_CHECK_INTERVAL)

            except Exception as e:
                print(f"Error in risk monitoring: {e}")
                await asyncio.sleep(60)
