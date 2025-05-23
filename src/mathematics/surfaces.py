"""
Surface generation functions for SKB Visualization Application.
Provides parametric equations and surface generation for various topological surfaces.
"""

import numpy as np
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)


def mobius_strip_parametric(u: np.ndarray, v: np.ndarray, radius: float = 2.0, width: float = 0.5) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Enhanced Möbius strip for twisted strip visualization.
    
    Args:
        u: Parameter along the strip (0 to 2π)
        v: Parameter across the strip (-width to width)
        radius: Radius of the central circle
        width: Half-width of the strip
        
    Returns:
        Tuple of x, y, z coordinate arrays
    """
    cos_u_2, sin_u_2 = np.cos(u/2), np.sin(u/2)
    cos_u, sin_u = np.cos(u), np.sin(u)
    
    x = (radius + v * cos_u_2) * cos_u
    y = (radius + v * cos_u_2) * sin_u
    z = v * sin_u_2
    
    return x, y, z


def torus_parametric(u: np.ndarray, v: np.ndarray, R: float = 2.0, r: float = 0.5) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Enhanced torus with better surface quality.
    
    Args:
        u, v: Parameter arrays
        R: Major radius
        r: Minor radius
        
    Returns:
        Tuple of x, y, z coordinate arrays
    """
    cos_u, sin_u = np.cos(u), np.sin(u)
    cos_v, sin_v = np.cos(v), np.sin(v)
    
    x = (R + r * cos_v) * cos_u
    y = (R + r * cos_v) * sin_u
    z = r * sin_v
    
    return x, y, z


def generate_twisted_strip(twists: list, t: float, loop_factor: float, resolution: int = 75) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate an enhanced twisted strip (sub-SKB) with improved mathematical modeling.
    
    Args:
        twists: List of twist parameters [kx, ky, kz, kt]
        t: Time parameter
        loop_factor: Number of loops
        resolution: Surface resolution for better quality
        
    Returns:
        Tuple of x, y, z, u, v arrays
    """
    u = np.linspace(0, 2 * np.pi * loop_factor, resolution)
    v = np.linspace(-0.75, 0.75, int(resolution * 0.6))
    u, v = np.meshgrid(u, v)
    
    kx, ky, kz, kt = twists
    
    # Enhanced time twist effect with better CTC modeling
    time_factor = kt * np.sin(u + t) * 0.25
    stability_factor = 1.0 / (1.0 + abs(kt))
    
    # Enhanced Möbius strip with multi-dimensional twists
    radius = 2.0 + 0.3 * np.sin(kx * u / loop_factor)
    width_modulation = 0.75 + 0.2 * np.sin(ky * u / loop_factor)
    
    # Apply twist effects
    cos_u_2 = np.cos((u + kx * t / 5) / 2)
    sin_u_2 = np.sin((u + kx * t / 5) / 2)
    cos_u = np.cos(u + ky * t / 5)
    sin_u = np.sin(u + ky * t / 5)
    
    # Enhanced parametric equations
    x = (radius + v * width_modulation * cos_u_2) * cos_u
    y = (radius + v * width_modulation * cos_u_2) * sin_u
    z = v * width_modulation * sin_u_2 * np.cos(kz * u / loop_factor)
    
    # Apply time twist effect for CTC visualization
    x = x + time_factor * np.cos(v) * stability_factor
    y = y + time_factor * np.sin(v) * stability_factor
    z = z + time_factor * np.sin(u / loop_factor) * 0.1
    
    return x, y, z, u, v


def generate_torus(twists: list, t: float, loop_factor: float, resolution: int = 75) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate an enhanced torus with improved mathematical modeling.
    
    Args:
        twists: List of twist parameters [kx, ky, kz, kt]
        t: Time parameter
        loop_factor: Number of loops
        resolution: Surface resolution
        
    Returns:
        Tuple of x, y, z, u, v arrays
    """
    u = np.linspace(0, 2 * np.pi * loop_factor, resolution)
    v = np.linspace(0, 2 * np.pi, resolution)
    u, v = np.meshgrid(u, v)
    
    kx, ky, kz, kt = twists
    
    # Enhanced time twist modeling
    time_factor = kt * np.sin(u + t) * 0.2
    stability_factor = 1.0 / (1.0 + abs(kt) * 1.5)
    
    # Dynamic torus parameters
    R = 2.2 + 0.2 * np.sin(kx * t / 8)  # Major radius variation
    r = 0.6 + 0.1 * np.cos(ky * t / 8)  # Minor radius variation
    
    # Enhanced torus parametric equations with twist effects
    cos_u = np.cos(u + ky * t / 10)
    sin_u = np.sin(u + kx * t / 10)
    cos_v = np.cos(v + kz * t / 12)
    sin_v = np.sin(v + kz * t / 12)
    
    x = (R + r * cos_v) * cos_u
    y = (R + r * cos_v) * sin_u
    z = r * sin_v * (1 + 0.1 * np.sin(kz * u / loop_factor))
    
    # Apply time twist effect for CTC visualization
    x = x + time_factor * np.cos(v) * stability_factor
    y = y + time_factor * np.sin(v) * stability_factor
    z = z + time_factor * np.cos(u / loop_factor) * 0.1
    
    return x, y, z, u, v


def generate_mobius_strip(twists: list, t: float, loop_factor: float, resolution: int = 75) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate Möbius strip surface.
    
    Args:
        twists: List of twist parameters [kx, ky, kz, kt]
        t: Time parameter
        loop_factor: Number of loops
        resolution: Surface resolution
        
    Returns:
        Tuple of x, y, z, u, v arrays
    """
    return generate_twisted_strip(twists, t, loop_factor, resolution)


def calculate_surface_curvature(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> np.ndarray:
    """
    Calculate approximate Gaussian curvature for surface visualization enhancement.
    
    Args:
        x, y, z: Surface coordinate arrays
        
    Returns:
        Array of curvature values for color mapping
    """
    # Simple finite difference approximation of curvature
    dx_du = np.gradient(x, axis=1)
    dy_du = np.gradient(y, axis=1)
    dz_du = np.gradient(z, axis=1)
    
    dx_dv = np.gradient(x, axis=0)
    dy_dv = np.gradient(y, axis=0)
    dz_dv = np.gradient(z, axis=0)
    
    # Normal vector approximation
    nx = dy_du * dz_dv - dz_du * dy_dv
    ny = dz_du * dx_dv - dx_du * dz_dv
    nz = dx_du * dy_dv - dy_du * dx_dv
    
    # Normalize
    norm = np.sqrt(nx**2 + ny**2 + nz**2) + 1e-10
    nx, ny, nz = nx/norm, ny/norm, nz/norm
    
    # Approximate mean curvature
    d2x_du2 = np.gradient(dx_du, axis=1)
    d2y_du2 = np.gradient(dy_du, axis=1)
    d2z_du2 = np.gradient(dz_du, axis=1)
    
    mean_curvature = np.abs(d2x_du2 * nx + d2y_du2 * ny + d2z_du2 * nz)
    
    return mean_curvature


def create_enhanced_surface_trace(
    x: np.ndarray, 
    y: np.ndarray, 
    z: np.ndarray, 
    u: np.ndarray, 
    v: np.ndarray, 
    name: str, 
    color: tuple, 
    opacity: float, 
    surface_type: str = "Klein"
) -> Dict[str, Any]:
    """
    Create an enhanced surface trace with better lighting and scientific coloring.
    
    Args:
        x, y, z: Surface coordinates
        u, v: Parameter grids for texture mapping
        name: Surface name
        color: Base color as RGB tuple
        opacity: Surface opacity
        surface_type: Type of surface for specialized rendering
        
    Returns:
        Dict containing surface trace configuration
    """
    # Calculate curvature for enhanced coloring
    curvature = calculate_surface_curvature(x, y, z)
    
    # Create enhanced colorscale based on mathematical properties
    if surface_type == "Klein":
        # Klein bottle specific coloring based on topology
        colorscale = [
            [0.0, f"rgba({color[0]}, {color[1]}, {color[2]}, 0.3)"],
            [0.3, f"rgba({color[0]}, {color[1]}, {color[2]}, 0.6)"],
            [0.7, f"rgba({min(255, color[0]+30)}, {min(255, color[1]+30)}, {min(255, color[2]+30)}, 0.8)"],
            [1.0, f"rgba({min(255, color[0]+50)}, {min(255, color[1]+50)}, {min(255, color[2]+50)}, 1.0)"]
        ]
    else:
        # Generic mathematical surface coloring
        colorscale = [
            [0.0, f"rgba({color[0]}, {color[1]}, {color[2]}, 0.4)"],
            [0.5, f"rgba({color[0]}, {color[1]}, {color[2]}, 0.7)"],
            [1.0, f"rgba({min(255, color[0]+40)}, {min(255, color[1]+40)}, {min(255, color[2]+40)}, 0.9)"]
        ]
    
    # Enhanced surface trace with scientific lighting
    surface_trace = {
        'x': x.tolist(),
        'y': y.tolist(),
        'z': z.tolist(),
        'surfacecolor': curvature.tolist(),  # Use curvature for coloring
        'type': 'surface',
        'colorscale': colorscale,
        'showscale': False,
        'opacity': opacity,
        'name': name,
        'hoverinfo': 'none',
        'contours': {
            'x': {'show': True, 'width': 2, 'color': 'rgba(255,255,255,0.4)'},
            'y': {'show': True, 'width': 2, 'color': 'rgba(255,255,255,0.4)'},
            'z': {'show': True, 'width': 2, 'color': 'rgba(255,255,255,0.4)'}
        },
        'lighting': {
            'ambient': 0.4,
            'diffuse': 0.8,
            'roughness': 0.2,
            'specular': 0.9,
            'fresnel': 0.4
        },
        'lightposition': {
            'x': 1.5,
            'y': 1.5,
            'z': 2.0
        },
        'hidesurface': False,
        'cauto': False,
        'cmin': np.min(curvature),
        'cmax': np.max(curvature)
    }
    
    return surface_trace 