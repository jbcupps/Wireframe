"""
Cache manager for SKB Visualization Application.
Provides central cache management and key generation.
"""

import json
import hashlib
import logging
from typing import Any, Dict, Callable, TypeVar, Union
from functools import wraps

import numpy as np

from .backends import CacheBackend, MemoryCache, RedisCache

# Type variable for generic function caching
T = TypeVar('T')

logger = logging.getLogger(__name__)


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
        ttl: int = None,
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