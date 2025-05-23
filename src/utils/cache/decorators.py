"""
Cache decorators for SKB Visualization Application.
Provides convenient decorators for caching specific computation types.
"""

from typing import Optional

from .core import get_cache_manager


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