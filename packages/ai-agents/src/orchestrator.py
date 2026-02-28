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

    async def orchestrate_decision(self, agent_id: str, user_address: str) -> Dict:
        """
        Orchestrate decision-making for a specific user's agent

        Args:
            agent_id: Agent contract address
            user_address: User's wallet address

        Returns:
            Decision result with proof
        """
        # Get agent state from blockchain for specific user
        agent_state = await self._fetch_agent_state(agent_id, user_address)

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

        # Store decision in database with user_address
        await self._store_decision(agent_id, user_address, decision)

        return {
            "decision": decision.dict(),
            "proof": proof,
            "timestamp": int(time.time()),
            "signature": signature,
            "user_address": user_address
        }

    async def _fetch_agent_state(self, agent_id: str, user_address: str) -> AgentState:
        """Fetch agent state from blockchain for a specific user"""
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

            # Fetch user-specific agent state from contract
            user_addr = self.w3.to_checksum_address(user_address)
            print(f"Fetching agent state for user {user_addr} from {agent_id}...")
            state = contract.functions.getUserState(user_addr).call()

            # Parse the state tuple
            # state = (config, rwaCollateral, collateralAmount, borrowedUSDC, availableCredit, totalAssets)
            config_tuple = state[0]

            # Fetch positions for this user
            positions = []
            try:
                positions_data = contract.functions.getUserPositions(user_addr).call()
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
                print(f"   User positions: {len(positions)}")
            except Exception as e:
                print(f"   Warning: Could not fetch user positions: {e}")

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

            print(f"✅ Agent state fetched for user {user_addr}:")
            print(f"   Collateral: {agent_state.collateral_amount}")
            print(f"   Borrowed: {agent_state.borrowed_usdc}")
            print(f"   Available Credit: {agent_state.available_credit}")

            return agent_state

        except Exception as e:
            print(f"❌ Error fetching agent state for user {user_address}: {e}")
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
        """Run continuous agent loop (legacy - single user)"""
        print(f"⚠️  WARNING: run_agent_loop is deprecated, use run_multi_user_loop instead")
        print(f"Starting single-user agent loop for {agent_id}")

        while True:
            try:
                # For backward compatibility, use owner address as user
                # In multi-user setup, this should be replaced
                result = await self.orchestrate_decision(agent_id, "0x0000000000000000000000000000000000000000")

                print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Agent Decision:")
                print(f"Action: {result['decision']['action']}")
                print(f"Reasoning: {result['decision']['reasoning']}")
                print(f"Risk Score: {result['decision']['risk_score']:.2f}")
                print(f"Expected Return: {result['decision']['expected_return']:.2%}")

                # Execute decision on-chain (if not HOLD)
                if result['decision']['action'] != "HOLD":
                    await self._execute_decision(agent_id, "0x0000000000000000000000000000000000000000", result)

                # Wait for next decision interval
                await asyncio.sleep(config.DECISION_INTERVAL)

            except Exception as e:
                print(f"Error in agent loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error

    async def run_multi_user_loop(self, agent_id: str):
        """
        Run continuous decision loop for all users of an agent contract.
        Each user is checked against their own cooldown period independently.
        The loop sleeps until the soonest cooldown expires rather than a fixed interval.

        Args:
            agent_id: Agent contract address
        """
        print(f"🚀 Starting multi-user agent loop for {agent_id}")

        # Derive controller address once (same for the lifetime of this process)
        controller_addr = None
        if config.PRIVATE_KEY:
            controller_addr = self.w3.eth.account.from_key(config.PRIVATE_KEY).address
            print(f"   Controller: {controller_addr}")

        while True:
            try:
                all_users = await self._get_all_users(agent_id)

                if not all_users:
                    print(f"No users found, waiting {config.DECISION_INTERVAL}s...")
                    await asyncio.sleep(config.DECISION_INTERVAL)
                    continue

                now = int(time.time())
                print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Checking {len(all_users)} user(s)")

                opted_in_count = 0
                skipped_count = 0
                # Track the earliest timestamp at which any user becomes actionable
                next_wakeup: Optional[int] = None

                for user_address in all_users:
                    try:
                        print(f"\n--- User {user_address} ---")

                        prefs = await self._get_user_preferences(agent_id, user_address)

                        if not prefs or not prefs.get('autoDecisionsEnabled'):
                            print(f"⏭️  Automation disabled")
                            skipped_count += 1
                            continue

                        if not controller_addr or prefs['decisionController'].lower() != controller_addr.lower():
                            print(f"⚠️  Controller mismatch (expected {controller_addr}, got {prefs['decisionController']})")
                            skipped_count += 1
                            continue

                        last_decision = int(prefs.get('lastDecisionTime', 0))
                        cooldown = int(prefs.get('cooldownPeriod', 300))
                        next_decision_at = last_decision + cooldown

                        if now < next_decision_at:
                            remaining = next_decision_at - now
                            print(f"⏸️  Cooldown active — {remaining}s remaining (cooldown={cooldown}s)")
                            # Record when this user can be processed next
                            if next_wakeup is None or next_decision_at < next_wakeup:
                                next_wakeup = next_decision_at
                            skipped_count += 1
                            continue

                        # User is ready
                        opted_in_count += 1
                        strategy_name = ['Conservative', 'Balanced', 'Aggressive'][int(prefs.get('strategy', 1))]
                        print(f"✅ Ready | Strategy: {strategy_name} | Cooldown: {cooldown}s")

                        result = await self.orchestrate_decision(agent_id, user_address)

                        print(f"   Action:          {result['decision']['action']}")
                        print(f"   Reasoning:       {result['decision']['reasoning']}")
                        print(f"   Risk Score:      {result['decision']['risk_score']:.2f}")
                        print(f"   Expected Return: {result['decision']['expected_return']:.2%}")

                        if result['decision']['action'] == 'BORROW_AND_INVEST':
                            borrow_amount = result['decision']['params'].get('borrow_amount', 0)
                            max_borrow = float(self.w3.from_wei(prefs['maxBorrowPerDecision'], 'ether'))
                            if borrow_amount > max_borrow:
                                print(f"⚠️  Capping borrow {borrow_amount:.4f} → {max_borrow:.4f}")
                                result['decision']['params']['borrow_amount'] = max_borrow

                        if result['decision']['action'] != "HOLD":
                            await self._execute_decision(agent_id, user_address, result)
                        else:
                            print(f"   HOLD — no action taken")

                        # After execution this user's next slot is now + their cooldown
                        user_next = int(time.time()) + cooldown
                        if next_wakeup is None or user_next < next_wakeup:
                            next_wakeup = user_next

                        await asyncio.sleep(1)  # brief pause between users

                    except Exception as e:
                        print(f"Error processing user {user_address}: {e}")
                        import traceback
                        traceback.print_exc()
                        continue

                print(f"\n📊 Round complete — acted: {opted_in_count}, skipped: {skipped_count}")

                # Sleep until the soonest user cooldown expires.
                # Cap at DECISION_INTERVAL so we also notice newly registered users.
                if next_wakeup is not None:
                    sleep_for = max(10, next_wakeup - int(time.time()))
                    sleep_for = min(sleep_for, config.DECISION_INTERVAL)
                    print(f"⏰ Next wakeup in {sleep_for}s (soonest cooldown expiry, capped at {config.DECISION_INTERVAL}s)")
                else:
                    sleep_for = config.DECISION_INTERVAL
                    print(f"⏰ No active users — polling again in {sleep_for}s")

                await asyncio.sleep(sleep_for)

            except Exception as e:
                print(f"Error in multi-user loop: {e}")
                import traceback
                traceback.print_exc()
                await asyncio.sleep(60)

    async def _get_all_users(self, agent_id: str) -> List[str]:
        """
        Get all users who have initialized agents on this contract

        Args:
            agent_id: Agent contract address

        Returns:
            List of user wallet addresses
        """
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

            # Call getAllUsers function
            users = contract.functions.getAllUsers().call()

            print(f"Found {len(users)} users in contract")
            return [str(user) for user in users]

        except Exception as e:
            print(f"Error getting all users: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def _get_user_preferences(self, agent_id: str, user_address: str) -> Optional[Dict]:
        """
        Get user's automation preferences from contract

        Args:
            agent_id: Agent contract address
            user_address: User wallet address

        Returns:
            Dict with user preferences or None if error
        """
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

            # Call getUserPreferences function
            user_addr = self.w3.to_checksum_address(user_address)
            prefs = contract.functions.getUserPreferences(user_addr).call()

            # Parse preferences tuple
            # (autoDecisionsEnabled, decisionController, maxBorrowPerDecision, cooldownPeriod, lastDecisionTime, strategy)
            return {
                'autoDecisionsEnabled': prefs[0],
                'decisionController': prefs[1],
                'maxBorrowPerDecision': prefs[2],
                'cooldownPeriod': prefs[3],
                'lastDecisionTime': prefs[4],
                'strategy': prefs[5]
            }

        except Exception as e:
            print(f"Error getting user preferences for {user_address}: {e}")
            import traceback
            traceback.print_exc()
            return None

    async def _store_decision(self, agent_id: str, user_address: str, decision: Decision):
        """
        Store decision in Supabase database

        Args:
            agent_id: Agent contract address
            user_address: User wallet address
            decision: Decision object to store
        """
        try:
            # Import Supabase client (if configured)
            from supabase import create_client
            import os

            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

            if not supabase_url or not supabase_key:
                print("⚠️  Supabase not configured, skipping decision storage")
                return

            supabase = create_client(supabase_url, supabase_key)

            # Insert decision with user_address
            data = {
                'agent_id': agent_id,
                'user_address': user_address,
                'action': decision.action,
                'params': decision.params,
                'risk_score': float(decision.risk_score),
                'expected_return': float(decision.expected_return),
                'reasoning': decision.reasoning,
                'timestamp': int(time.time())
            }

            result = supabase.table('agent_decisions').insert(data).execute()
            print(f"✅ Decision stored in database for user {user_address}")

        except Exception as e:
            print(f"Warning: Could not store decision in database: {e}")

    async def _execute_decision(self, agent_id: str, user_address: str, result: Dict):
        """Execute decision on blockchain for a specific user"""
        print(f"\n🤖 Executing decision on-chain for user {user_address} on agent {agent_id}")

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
            print(f"User: {user_address}")
            print(f"Params: {result['decision']['params']}")

            # Encode parameters based on action
            params = self._encode_params(action, result['decision']['params'])

            # Build transaction with user parameter (NEW)
            nonce = self.w3.eth.get_transaction_count(account.address)

            user_addr = self.w3.to_checksum_address(user_address)

            tx = contract.functions.makeInvestmentDecision(
                user_addr,      # NEW: user parameter
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

    async def monitor_risk(self, agent_id: str, user_address: Optional[str] = None):
        """
        Continuously monitor agent risk

        Args:
            agent_id: Agent contract address
            user_address: Optional specific user to monitor, or None to monitor all users
        """
        if user_address:
            print(f"Starting risk monitoring for user {user_address} on agent {agent_id}")
        else:
            print(f"Starting risk monitoring for all users on agent {agent_id}")

        while True:
            try:
                if user_address:
                    # Monitor specific user
                    await self._monitor_user_risk(agent_id, user_address)
                else:
                    # Monitor all users
                    all_users = await self._get_all_users(agent_id)
                    for user in all_users:
                        await self._monitor_user_risk(agent_id, user)

                await asyncio.sleep(config.RISK_CHECK_INTERVAL)

            except Exception as e:
                print(f"Error in risk monitoring: {e}")
                await asyncio.sleep(60)

    async def _monitor_user_risk(self, agent_id: str, user_address: str):
        """Monitor risk for a specific user"""
        try:
            agent_state = await self._fetch_agent_state(agent_id, user_address)
            market_data = await self._fetch_market_data()

            risk_report = await self.decision_engine._assess_risk(
                agent_state,
                market_data
            )

            if risk_report.warnings:
                print(f"\n⚠️  RISK WARNINGS for user {user_address}:")
                for warning in risk_report.warnings:
                    print(f"  - {warning}")

        except Exception as e:
            print(f"Error monitoring risk for user {user_address}: {e}")
