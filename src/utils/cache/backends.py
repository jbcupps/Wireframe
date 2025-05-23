"""
Cache backend implementations for SKB Visualization Application.
Provides memory and Redis-based cache backends.
"""

import pickle
import time
import logging
from typing import Any, Optional, Dict
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class CacheBackend(ABC):
    """Abstract base class for cache backends."""
    
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        pass
    
    @abstractmethod
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with optional TTL."""
        pass
    
    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete value from cache."""
        pass
    
    @abstractmethod
    def clear(self) -> None:
        """Clear all cached values."""
        pass
    
    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        pass


class MemoryCache(CacheBackend):
    """In-memory cache implementation with LRU eviction."""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        """
        Initialize memory cache.
        
        Args:
            max_size: Maximum number of items in cache
            default_ttl: Default TTL in seconds
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._access_times: Dict[str, float] = {}
        
    def _evict_if_needed(self) -> None:
        """Evict oldest items if cache is full."""
        if len(self._cache) >= self.max_size:
            # Remove oldest accessed item
            oldest_key = min(self._access_times.keys(), key=lambda k: self._access_times[k])
            self.delete(oldest_key)
    
    def _is_expired(self, item: Dict[str, Any]) -> bool:
        """Check if cached item is expired."""
        if item.get("ttl") is None:
            return False
        return time.time() > item["timestamp"] + item["ttl"]
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from memory cache."""
        if key not in self._cache:
            return None
            
        item = self._cache[key]
        
        # Check expiration
        if self._is_expired(item):
            self.delete(key)
            return None
            
        # Update access time
        self._access_times[key] = time.time()
        
        return item["value"]
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in memory cache."""
        self._evict_if_needed()
        
        ttl = ttl or self.default_ttl
        
        self._cache[key] = {
            "value": value,
            "timestamp": time.time(),
            "ttl": ttl
        }
        self._access_times[key] = time.time()
    
    def delete(self, key: str) -> None:
        """Delete value from memory cache."""
        self._cache.pop(key, None)
        self._access_times.pop(key, None)
    
    def clear(self) -> None:
        """Clear all cached values."""
        self._cache.clear()
        self._access_times.clear()
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if key not in self._cache:
            return False
            
        item = self._cache[key]
        if self._is_expired(item):
            self.delete(key)
            return False
            
        return True
    
    def size(self) -> int:
        """Get current cache size."""
        return len(self._cache)
    
    def cleanup_expired(self) -> int:
        """Remove expired items and return count of removed items."""
        expired_keys = []
        for key, item in self._cache.items():
            if self._is_expired(item):
                expired_keys.append(key)
        
        for key in expired_keys:
            self.delete(key)
            
        return len(expired_keys)


class RedisCache(CacheBackend):
    """Redis-based cache implementation."""
    
    def __init__(self, redis_url: str, default_ttl: int = 3600):
        """
        Initialize Redis cache.
        
        Args:
            redis_url: Redis connection URL
            default_ttl: Default TTL in seconds
        """
        try:
            import redis
            self.redis_client = redis.from_url(redis_url, decode_responses=False)
            self.default_ttl = default_ttl
            # Test connection
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {redis_url}")
        except ImportError:
            logger.error("Redis package not installed. Install with: pip install redis")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache."""
        try:
            data = self.redis_client.get(key)
            if data is None:
                return None
            return pickle.loads(data)
        except Exception as e:
            logger.warning(f"Failed to get from Redis cache: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in Redis cache."""
        try:
            ttl = ttl or self.default_ttl
            data = pickle.dumps(value)
            self.redis_client.setex(key, ttl, data)
        except Exception as e:
            logger.warning(f"Failed to set in Redis cache: {e}")
    
    def delete(self, key: str) -> None:
        """Delete value from Redis cache."""
        try:
            self.redis_client.delete(key)
        except Exception as e:
            logger.warning(f"Failed to delete from Redis cache: {e}")
    
    def clear(self) -> None:
        """Clear all cached values."""
        try:
            self.redis_client.flushdb()
        except Exception as e:
            logger.warning(f"Failed to clear Redis cache: {e}")
    
    def exists(self, key: str) -> bool:
        """Check if key exists in Redis cache."""
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.warning(f"Failed to check Redis cache existence: {e}")
            return False 