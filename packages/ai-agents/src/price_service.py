"""
Price Service for fetching real-time cryptocurrency prices from CoinGecko API.

This service provides:
- Real-time BTC/ETH prices
- Historical OHLC data for charts
- Caching to avoid rate limits
- Fallback mechanisms for reliability
"""

import requests
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class OHLCData:
    """Open, High, Low, Close data point"""
    timestamp: int  # Unix timestamp in milliseconds
    open: float
    high: float
    low: float
    close: float


class PriceService:
    """Service for fetching cryptocurrency prices from CoinGecko API"""

    # CoinGecko API endpoints
    BASE_URL = "https://api.coingecko.com/api/v3"
    SIMPLE_PRICE_URL = f"{BASE_URL}/simple/price"
    OHLC_URL = f"{BASE_URL}/coins/{{coin_id}}/ohlc"

    # Token mapping to CoinGecko IDs
    TOKEN_MAP = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "USDC": "usd-coin",
        "USDT": "tether"
    }

    # Cache settings
    CACHE_TTL = 60  # 60 seconds cache

    def __init__(self, cache_ttl: int = CACHE_TTL):
        """
        Initialize PriceService

        Args:
            cache_ttl: Cache time-to-live in seconds (default: 60)
        """
        self.cache_ttl = cache_ttl
        self._price_cache: Dict[str, Tuple[float, float]] = {}  # {symbol: (price, timestamp)}
        self._session = requests.Session()
        self._session.headers.update({
            'Accept': 'application/json',
            'User-Agent': 'RebelInParadise-Trading-Bot/1.0'
        })

    def get_current_price(self, token_symbol: str) -> Optional[float]:
        """
        Get current price for a token in USD

        Args:
            token_symbol: Token symbol (e.g., "BTC", "ETH")

        Returns:
            Current price in USD, or None if fetch fails
        """
        token_symbol = token_symbol.upper()

        # Check cache first
        if token_symbol in self._price_cache:
            cached_price, cached_time = self._price_cache[token_symbol]
            if time.time() - cached_time < self.cache_ttl:
                logger.debug(f"Using cached price for {token_symbol}: ${cached_price}")
                return cached_price

        # Fetch from API
        try:
            coin_id = self.TOKEN_MAP.get(token_symbol)
            if not coin_id:
                logger.error(f"Unknown token symbol: {token_symbol}")
                return None

            params = {
                'ids': coin_id,
                'vs_currencies': 'usd'
            }

            response = self._session.get(self.SIMPLE_PRICE_URL, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            price = data.get(coin_id, {}).get('usd')

            if price is None:
                logger.error(f"Price not found in response for {token_symbol}")
                return None

            # Update cache
            self._price_cache[token_symbol] = (price, time.time())
            logger.info(f"Fetched {token_symbol} price: ${price}")

            return price

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch price for {token_symbol}: {e}")
            return None
        except (KeyError, ValueError) as e:
            logger.error(f"Failed to parse price data for {token_symbol}: {e}")
            return None

    def get_multiple_prices(self, symbols: List[str]) -> Dict[str, Optional[float]]:
        """
        Get current prices for multiple tokens in a single API call

        Args:
            symbols: List of token symbols (e.g., ["BTC", "ETH"])

        Returns:
            Dictionary mapping symbols to prices
        """
        symbols = [s.upper() for s in symbols]
        result = {}

        # Separate cached and non-cached symbols
        to_fetch = []
        for symbol in symbols:
            if symbol in self._price_cache:
                cached_price, cached_time = self._price_cache[symbol]
                if time.time() - cached_time < self.cache_ttl:
                    result[symbol] = cached_price
                    continue
            to_fetch.append(symbol)

        if not to_fetch:
            return result

        # Fetch non-cached prices
        try:
            coin_ids = [self.TOKEN_MAP.get(s) for s in to_fetch if s in self.TOKEN_MAP]
            if not coin_ids:
                logger.error(f"No valid token symbols in: {to_fetch}")
                return result

            params = {
                'ids': ','.join(coin_ids),
                'vs_currencies': 'usd'
            }

            response = self._session.get(self.SIMPLE_PRICE_URL, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            for symbol in to_fetch:
                coin_id = self.TOKEN_MAP.get(symbol)
                if coin_id and coin_id in data:
                    price = data[coin_id].get('usd')
                    if price is not None:
                        result[symbol] = price
                        self._price_cache[symbol] = (price, time.time())
                        logger.info(f"Fetched {symbol} price: ${price}")
                    else:
                        result[symbol] = None
                else:
                    result[symbol] = None

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch multiple prices: {e}")
            for symbol in to_fetch:
                result[symbol] = None
        except (KeyError, ValueError) as e:
            logger.error(f"Failed to parse price data: {e}")
            for symbol in to_fetch:
                result[symbol] = None

        return result

    def get_historical_prices(self, token_symbol: str, days: int = 30) -> List[OHLCData]:
        """
        Get historical OHLC (Open, High, Low, Close) data for a token

        Args:
            token_symbol: Token symbol (e.g., "BTC", "ETH")
            days: Number of days of historical data (1, 7, 14, 30, 90, 180, 365, max)

        Returns:
            List of OHLC data points
        """
        token_symbol = token_symbol.upper()

        try:
            coin_id = self.TOKEN_MAP.get(token_symbol)
            if not coin_id:
                logger.error(f"Unknown token symbol: {token_symbol}")
                return []

            params = {
                'vs_currency': 'usd',
                'days': days
            }

            url = self.OHLC_URL.format(coin_id=coin_id)
            response = self._session.get(url, params=params, timeout=15)
            response.raise_for_status()

            data = response.json()

            # CoinGecko OHLC format: [[timestamp, open, high, low, close], ...]
            ohlc_data = []
            for item in data:
                if len(item) >= 5:
                    ohlc_data.append(OHLCData(
                        timestamp=int(item[0]),
                        open=float(item[1]),
                        high=float(item[2]),
                        low=float(item[3]),
                        close=float(item[4])
                    ))

            logger.info(f"Fetched {len(ohlc_data)} OHLC data points for {token_symbol}")
            return ohlc_data

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch historical prices for {token_symbol}: {e}")
            return []
        except (KeyError, ValueError, IndexError) as e:
            logger.error(f"Failed to parse historical data for {token_symbol}: {e}")
            return []

    def clear_cache(self):
        """Clear the price cache"""
        self._price_cache.clear()
        logger.info("Price cache cleared")

    def get_cache_info(self) -> Dict[str, Dict]:
        """
        Get information about cached prices

        Returns:
            Dictionary with cache information
        """
        cache_info = {}
        current_time = time.time()

        for symbol, (price, timestamp) in self._price_cache.items():
            age = current_time - timestamp
            cache_info[symbol] = {
                'price': price,
                'age_seconds': age,
                'is_valid': age < self.cache_ttl
            }

        return cache_info


# Singleton instance for easy import
_price_service_instance = None


def get_price_service(cache_ttl: int = 60) -> PriceService:
    """
    Get or create the singleton PriceService instance

    Args:
        cache_ttl: Cache time-to-live in seconds

    Returns:
        PriceService instance
    """
    global _price_service_instance
    if _price_service_instance is None:
        _price_service_instance = PriceService(cache_ttl=cache_ttl)
    return _price_service_instance


if __name__ == "__main__":
    # Test the price service
    logging.basicConfig(level=logging.INFO)

    ps = PriceService()

    print("\n=== Testing Current Prices ===")
    btc_price = ps.get_current_price("BTC")
    print(f"BTC Price: ${btc_price:,.2f}" if btc_price else "BTC Price: Failed")

    eth_price = ps.get_current_price("ETH")
    print(f"ETH Price: ${eth_price:,.2f}" if eth_price else "ETH Price: Failed")

    print("\n=== Testing Multiple Prices ===")
    prices = ps.get_multiple_prices(["BTC", "ETH", "USDC"])
    for symbol, price in prices.items():
        if price:
            print(f"{symbol}: ${price:,.2f}")
        else:
            print(f"{symbol}: Failed")

    print("\n=== Testing Historical Data ===")
    historical = ps.get_historical_prices("BTC", days=7)
    if historical:
        print(f"Fetched {len(historical)} data points")
        print(f"First: {datetime.fromtimestamp(historical[0].timestamp/1000)} - O:{historical[0].open:.2f} H:{historical[0].high:.2f} L:{historical[0].low:.2f} C:{historical[0].close:.2f}")
        print(f"Last: {datetime.fromtimestamp(historical[-1].timestamp/1000)} - O:{historical[-1].open:.2f} H:{historical[-1].high:.2f} L:{historical[-1].low:.2f} C:{historical[-1].close:.2f}")
    else:
        print("Failed to fetch historical data")

    print("\n=== Cache Info ===")
    cache_info = ps.get_cache_info()
    for symbol, info in cache_info.items():
        print(f"{symbol}: ${info['price']:,.2f} (age: {info['age_seconds']:.1f}s, valid: {info['is_valid']})")
