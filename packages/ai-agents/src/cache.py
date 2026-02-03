"""Cache utilities using Upstash Redis"""
import json
from typing import Optional, Any
import requests

from .config import config

class UpstashCache:
    """Upstash Redis cache client using REST API"""

    def __init__(self):
        """Initialize Upstash client"""
        if not config.UPSTASH_REDIS_REST_URL or not config.UPSTASH_REDIS_REST_TOKEN:
            raise ValueError("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set")

        self.url = config.UPSTASH_REDIS_REST_URL
        self.token = config.UPSTASH_REDIS_REST_TOKEN
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def _execute(self, command: list) -> Any:
        """Execute Redis command via REST API"""
        response = requests.post(
            self.url,
            headers=self.headers,
            json=command
        )
        response.raise_for_status()
        result = response.json()
        return result.get("result")

    async def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        try:
            result = self._execute(["GET", key])
            return result
        except Exception as e:
            print(f"Cache get error: {e}")
            return None

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set value in cache with optional expiration (seconds)"""
        try:
            if ex:
                self._execute(["SET", key, value, "EX", ex])
            else:
                self._execute(["SET", key, value])
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    async def get_json(self, key: str) -> Optional[dict]:
        """Get JSON value from cache"""
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return None
        return None

    async def set_json(self, key: str, value: dict, ex: Optional[int] = None) -> bool:
        """Set JSON value in cache"""
        try:
            json_str = json.dumps(value)
            return await self.set(key, json_str, ex)
        except Exception as e:
            print(f"Cache set_json error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            self._execute(["DEL", key])
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            result = self._execute(["EXISTS", key])
            return result == 1
        except Exception as e:
            print(f"Cache exists error: {e}")
            return False

    async def cache_market_data(self, data: dict, ttl: int = 300) -> bool:
        """Cache market data with 5 minute TTL"""
        return await self.set_json("market_data:latest", data, ex=ttl)

    async def get_cached_market_data(self) -> Optional[dict]:
        """Get cached market data"""
        return await self.get_json("market_data:latest")

    async def cache_agent_decision(self, agent_id: str, decision: dict, ttl: int = 3600) -> bool:
        """Cache agent decision with 1 hour TTL"""
        key = f"agent:{agent_id}:decision:latest"
        return await self.set_json(key, decision, ex=ttl)

    async def get_cached_decision(self, agent_id: str) -> Optional[dict]:
        """Get cached agent decision"""
        key = f"agent:{agent_id}:decision:latest"
        return await self.get_json(key)

# Global instance
cache = UpstashCache() if config.UPSTASH_REDIS_REST_URL and config.UPSTASH_REDIS_REST_TOKEN else None
