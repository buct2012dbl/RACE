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

        # Volatility parameters (increased for more dramatic movements)
        self.volatility = {
            "ETH": 0.8,  # 80% annualized volatility (increased from 60%)
            "BTC": 0.7,  # 70% annualized volatility (increased from 50%)
        }

        # Liquidity scores
        self.liquidity = {
            "ETH": 0.9,
            "BTC": 0.95,
        }

        self.last_update = time.time()

        # Add trend direction for more realistic movements
        self.trend_direction = {
            "ETH": random.choice([-1, 1]),  # -1 for down, 1 for up
            "BTC": random.choice([-1, 1]),
        }
        self.trend_strength = {
            "ETH": random.uniform(0.5, 1.5),
            "BTC": random.uniform(0.5, 1.5),
        }

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
        """Update prices with realistic random walk and trends"""
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

            # Drift with trend direction (more dramatic movements)
            base_drift = 0.15 / (365 * 24 * 3600)  # 15% annual drift (increased from 10%)
            trend_drift = base_drift * self.trend_direction[token] * self.trend_strength[token]

            # Random shock (Wiener process) - amplified for testing
            dt = time_elapsed
            dW = random.gauss(0, math.sqrt(dt)) * 2.0  # Amplified by 2x for more dramatic moves

            # Price change
            price_change = current_price * (trend_drift * dt + volatility * dW / math.sqrt(365 * 24 * 3600))

            # Update price
            new_price = current_price + price_change

            # Add some bounds to prevent extreme prices (wider bounds for testing)
            min_price = self.base_prices[token] * 0.3  # Max 70% drop (was 50%)
            max_price = self.base_prices[token] * 3.0  # Max 200% gain (was 100%)

            new_price = max(min_price, min(max_price, new_price))

            self.base_prices[token] = new_price

            # Update history
            self.price_history[token].append(new_price)
            if len(self.price_history[token]) > 100:
                self.price_history[token].pop(0)

            # Occasionally change trend direction (10% chance per update)
            if random.random() < 0.1:
                self.trend_direction[token] *= -1
                self.trend_strength[token] = random.uniform(0.5, 1.5)
                print(f"📊 {token} trend changed to {'UP' if self.trend_direction[token] > 0 else 'DOWN'} (strength: {self.trend_strength[token]:.2f})")

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
