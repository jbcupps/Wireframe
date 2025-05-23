"""
Mathematical utility functions for SKB Visualization Application.
Contains helper functions for color conversion and other utilities.
"""

from typing import Tuple


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """
    Convert hex color to RGB tuple.
    
    Args:
        hex_color: Hex color string (e.g., '#ff6b9d' or 'ff6b9d')
        
    Returns:
        Tuple of RGB values (0-255)
    """
    if hex_color.startswith('#'):
        hex_color = hex_color[1:]
    
    if len(hex_color) != 6:
        raise ValueError(f"Invalid hex color format: {hex_color}")
    
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except ValueError as e:
        raise ValueError(f"Invalid hex color: {hex_color}") from e


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """
    Convert RGB values to hex color string.
    
    Args:
        r, g, b: RGB color values (0-255)
        
    Returns:
        Hex color string with '#' prefix
    """
    return f"#{r:02x}{g:02x}{b:02x}"


def normalize_color(color: Tuple[int, int, int]) -> Tuple[float, float, float]:
    """
    Normalize RGB color values to 0-1 range.
    
    Args:
        color: RGB tuple with values 0-255
        
    Returns:
        RGB tuple with values 0-1
    """
    return tuple(c / 255.0 for c in color) 