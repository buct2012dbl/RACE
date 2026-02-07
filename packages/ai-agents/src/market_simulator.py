"""Market Data Simulator with realistic price movements"""
import time
import random
import math
from typing import Dict
from .models import MarketData
from .config import config


class MarketSimulator:
    """Simulates realistic market conditions"""

    def __init__(self):
        # Token addresses
        self.token_addresses = {
            "USDC": config.MOCK_USDC_ADDRESS,
            "ETH": config.WETH_ADDRESS,
            "BTC": config.WBTC_ADDRESS,
        }

        # Initial prices
        self.base_prices = {
            "USDC": 1.0,
            "ETH": 2500.0,
            "BTC": 45000.0,
        }

        # Price history for trend calculation
        self.price_history = {token: [price] for token, price in self.base_prices.items()}

        # Volatility parameters
        self.volatility = {
            "ETH": 0.6,  # 60% annualized volatility
            "BTC": 0.5,  # 50% annualized volatility
        }

        # Liquidity scores
        self.liquidity = {
            "ETH": 0.9,
            "BTC": 0.95,
        }

        self.last_update = time.time()

    def get_market_data(self) -> MarketData:
        """Get current market data with simulated price movements"""
        # Update prices based on time elapsed
        self._update_prices()

        # Calculate yield curves (simulated DEX APYs)
        yield_curves = {
            "ETH-USDC Pool": {
                "asset": "ETH",
                "apy": 0.08 + random.uniform(-0.02, 0.02),  # 6-10% APY
                "volatility": self.volatility["ETH"],
                "tvl": 5_000_000 + random.uniform(-500_000, 500_000)
            },
            "BTC-USDC Pool": {
                "asset": "BTC",
                "apy": 0.075 + random.uniform(-0.015, 0.015),  # 6-9% APY
                "volatility": self.volatility["BTC"],
                "tvl": 3_000_000 + random.uniform(-300_000, 300_000)
            }
        }

        return MarketData(
            timestamp=int(time.time()),
            prices=self.base_prices.copy(),
            yield_curves=yield_curves,
            volatility=self.volatility.copy(),
            liquidity=self.liquidity.copy(),
            treasury_yield=0.045  # 4.5% risk-free rate
        )

    def _update_prices(self):
        """Update prices with realistic random walk"""
        current_time = time.time()
        time_elapsed = current_time - self.last_update

        # Only update if at least 1 second has passed
        if time_elapsed < 1:
            return

        # Update each token price
        for token in ["ETH", "BTC"]:
            # Geometric Brownian Motion for price simulation
            # dS = μ * S * dt + σ * S * dW
            # where μ = drift, σ = volatility, dW = random shock

            current_price = self.base_prices[token]
            volatility = self.volatility[token]

            # Drift (slight upward bias for crypto)
            drift = 0.10 / (365 * 24 * 3600)  # 10% annual drift

            # Random shock (Wiener process)
            dt = time_elapsed
            dW = random.gauss(0, math.sqrt(dt))

            # Price change
            price_change = current_price * (drift * dt + volatility * dW / math.sqrt(365 * 24 * 3600))

            # Update price
            new_price = current_price + price_change

            # Add some bounds to prevent extreme prices
            min_price = self.base_prices[token] * 0.5  # Max 50% drop
            max_price = self.base_prices[token] * 2.0  # Max 100% gain

            new_price = max(min_price, min(max_price, new_price))

            self.base_prices[token] = new_price

            # Update history
            self.price_history[token].append(new_price)
            if len(self.price_history[token]) > 100:
                self.price_history[token].pop(0)

        self.last_update = current_time

    def get_price_trend(self, token: str) -> str:
        """Get price trend (UP, DOWN, SIDEWAYS)"""
        if token not in self.price_history:
            return "SIDEWAYS"

        history = self.price_history[token]
        if len(history) < 10:
            return "SIDEWAYS"

        # Compare recent average to older average
        recent_avg = sum(history[-5:]) / 5
        older_avg = sum(history[-10:-5]) / 5

        if recent_avg > older_avg * 1.02:
            return "UP"
        elif recent_avg < older_avg * 0.98:
            return "DOWN"
        else:
            return "SIDEWAYS"
