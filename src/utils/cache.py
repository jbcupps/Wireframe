"""
Caching utilities for SKB Visualization Application.
Provides memory and Redis-based caching for expensive computations.
"""

import json
import hashlib
import logging
import pickle
import time
from typing import Any, Optional, Dict, Callable, TypeVar, Union
from functools import wraps
from abc import ABC, abstractmethod

import numpy as np

# Type variable for generic function caching
T = TypeVar('T')

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


class CacheManager:
    """Central cache manager for the application."""
    
    def __init__(self, backend: CacheBackend):
        """
        Initialize cache manager.
        
        Args:
            backend: Cache backend implementation
        """
        self.backend = backend
        self.hit_count = 0
        self.miss_count = 0
        self.total_requests = 0
    
    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        """
        Generate cache key from function arguments.
        
        Args:
            prefix: Key prefix
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            str: Generated cache key
        """
        # Convert numpy arrays to lists for hashing
        serializable_args = []
        for arg in args:
            if isinstance(arg, np.ndarray):
                serializable_args.append(arg.tolist())
            else:
                serializable_args.append(arg)
        
        serializable_kwargs = {}
        for key, value in kwargs.items():
            if isinstance(value, np.ndarray):
                serializable_kwargs[key] = value.tolist()
            else:
                serializable_kwargs[key] = value
        
        # Create hashable string
        cache_data = {
            "args": serializable_args,
            "kwargs": serializable_kwargs
        }
        
        cache_string = json.dumps(cache_data, sort_keys=True, default=str)
        cache_hash = hashlib.md5(cache_string.encode()).hexdigest()
        
        return f"{prefix}:{cache_hash}"
    
    def get_stats(self) -> Dict[str, Union[int, float]]:
        """Get cache statistics."""
        if self.total_requests == 0:
            hit_rate = 0.0
        else:
            hit_rate = self.hit_count / self.total_requests
        
        return {
            "total_requests": self.total_requests,
            "hits": self.hit_count,
            "misses": self.miss_count,
            "hit_rate": hit_rate
        }
    
    def cached_computation(
        self, 
        key_prefix: str, 
        ttl: Optional[int] = None,
        use_cache: bool = True
    ) -> Callable[[Callable[..., T]], Callable[..., T]]:
        """
        Decorator for caching expensive computational functions.
        
        Args:
            key_prefix: Cache key prefix
            ttl: Time to live in seconds
            use_cache: Whether to use caching
            
        Returns:
            Decorated function
        """
        def decorator(func: Callable[..., T]) -> Callable[..., T]:
            @wraps(func)
            def wrapper(*args, **kwargs) -> T:
                self.total_requests += 1
                
                if not use_cache:
                    return func(*args, **kwargs)
                
                # Generate cache key
                cache_key = self.generate_key(key_prefix, *args, **kwargs)
                
                # Try to get from cache
                cached_result = self.backend.get(cache_key)
                if cached_result is not None:
                    self.hit_count += 1
                    logger.debug(f"Cache hit for key: {cache_key}")
                    return cached_result
                
                # Cache miss - compute result
                self.miss_count += 1
                logger.debug(f"Cache miss for key: {cache_key}")
                
                result = func(*args, **kwargs)
                
                # Store in cache
                try:
                    self.backend.set(cache_key, result, ttl)
                    logger.debug(f"Cached result for key: {cache_key}")
                except Exception as e:
                    logger.warning(f"Failed to cache result: {e}")
                
                return result
            
            return wrapper
        return decorator


def create_cache_manager(config: Dict[str, Any]) -> CacheManager:
    """
    Create cache manager based on configuration.
    
    Args:
        config: Cache configuration
        
    Returns:
        CacheManager: Configured cache manager
    """
    backend_type = config.get("backend", "memory")
    
    if backend_type == "redis" and config.get("url"):
        try:
            backend = RedisCache(
                redis_url=config["url"],
                default_ttl=config.get("ttl", 3600)
            )
        except Exception as e:
            logger.warning(f"Failed to create Redis cache, falling back to memory: {e}")
            backend = MemoryCache(
                max_size=config.get("max_size", 1000),
                default_ttl=config.get("ttl", 3600)
            )
    else:
        backend = MemoryCache(
            max_size=config.get("max_size", 1000),
            default_ttl=config.get("ttl", 3600)
        )
    
    return CacheManager(backend)


# Global cache instance (will be initialized by the application)
cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """Get the global cache manager instance."""
    if cache_manager is None:
        raise RuntimeError("Cache manager not initialized. Call initialize_cache() first.")
    return cache_manager


def initialize_cache(config: Dict[str, Any]) -> None:
    """Initialize the global cache manager."""
    global cache_manager
    cache_manager = create_cache_manager(config)
    logger.info(f"Initialized cache with backend: {type(cache_manager.backend).__name__}")


# Convenience decorators using global cache manager
def cached_klein_bottle(ttl: Optional[int] = None):
    """Cache decorator for Klein bottle computations."""
    def decorator(func):
        return get_cache_manager().cached_computation("klein_bottle", ttl)(func)
    return decorator


def cached_mobius_strip(ttl: Optional[int] = None):
    """Cache decorator for Möbius strip computations."""
    def decorator(func):
        return get_cache_manager().cached_computation("mobius_strip", ttl)(func)
    return decorator


def cached_torus(ttl: Optional[int] = None):
    """Cache decorator for torus computations."""
    def decorator(func):
        return get_cache_manager().cached_computation("torus", ttl)(func)
    return decorator


def cached_topology(ttl: Optional[int] = None):
    """Cache decorator for topological computations."""
    def decorator(func):
        return get_cache_manager().cached_computation("topology", ttl)(func)
    return decorator


def clear_cache() -> None:
    """Clear all cached data."""
    if cache_manager:
        cache_manager.backend.clear()
        logger.info("Cache cleared")


def get_cache_stats() -> Dict[str, Union[int, float]]:
    """Get cache statistics."""
    if cache_manager:
        return cache_manager.get_stats()
    return {"error": "Cache not initialized"}


# Export public interface
__all__ = [
    "CacheBackend",
    "MemoryCache", 
    "RedisCache",
    "CacheManager",
    "create_cache_manager",
    "initialize_cache",
    "get_cache_manager",
    "cached_klein_bottle",
    "cached_mobius_strip", 
    "cached_torus",
    "cached_topology",
    "clear_cache",
    "get_cache_stats"
] 