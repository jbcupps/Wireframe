"""
Cache decorators for SKB Visualization Application.
Provides convenient decorators for caching specific computation types.
"""

from typing import Optional
from functools import wraps

from .core import get_cache_manager


def cached_klein_bottle(ttl: Optional[int] = None):
    """Cache decorator for Klein bottle computations."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                cache_manager = get_cache_manager()
                cached_func = cache_manager.cached_computation("klein_bottle", ttl)(func)
                return cached_func(*args, **kwargs)
            except RuntimeError:
                # Cache not initialized, call function directly
                return func(*args, **kwargs)
        return wrapper
    return decorator


def cached_mobius_strip(ttl: Optional[int] = None):
    """Cache decorator for Möbius strip computations."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                cache_manager = get_cache_manager()
                cached_func = cache_manager.cached_computation("mobius_strip", ttl)(func)
                return cached_func(*args, **kwargs)
            except RuntimeError:
                # Cache not initialized, call function directly
                return func(*args, **kwargs)
        return wrapper
    return decorator


def cached_torus(ttl: Optional[int] = None):
    """Cache decorator for torus computations."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                cache_manager = get_cache_manager()
                cached_func = cache_manager.cached_computation("torus", ttl)(func)
                return cached_func(*args, **kwargs)
            except RuntimeError:
                # Cache not initialized, call function directly
                return func(*args, **kwargs)
        return wrapper
    return decorator


def cached_topology(ttl: Optional[int] = None):
    """Cache decorator for topological computations."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                cache_manager = get_cache_manager()
                cached_func = cache_manager.cached_computation("topology", ttl)(func)
                return cached_func(*args, **kwargs)
            except RuntimeError:
                # Cache not initialized, call function directly
                return func(*args, **kwargs)
        return wrapper
    return decorator 