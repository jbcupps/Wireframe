"""
Caching utilities package for SKB Visualization Application.
Provides memory and Redis-based caching for expensive computations.
"""

from .backends import MemoryCache, RedisCache, CacheBackend
from .manager import CacheManager, create_cache_manager
from .decorators import (
    cached_klein_bottle,
    cached_mobius_strip,
    cached_torus,
    cached_topology
)
from .core import initialize_cache, get_cache_manager, clear_cache, get_cache_stats

# Export public interface
__all__ = [
    # Backends
    "CacheBackend",
    "MemoryCache", 
    "RedisCache",
    
    # Manager
    "CacheManager",
    "create_cache_manager",
    
    # Decorators
    "cached_klein_bottle",
    "cached_mobius_strip", 
    "cached_torus",
    "cached_topology",
    
    # Core functions
    "initialize_cache",
    "get_cache_manager",
    "clear_cache",
    "get_cache_stats"
] 