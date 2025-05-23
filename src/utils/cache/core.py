"""
Core cache functionality for SKB Visualization Application.
Provides global cache management and initialization.
"""

import logging
from typing import Any, Dict, Union, Optional

from .manager import CacheManager, create_cache_manager

logger = logging.getLogger(__name__)

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