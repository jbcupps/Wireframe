"""
Curvature calculations for mathematical surfaces.
Provides functions for calculating various types of curvature.
"""

import numpy as np
from typing import Tuple

from ..config import settings


def calculate_gaussian_curvature(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> np.ndarray:
    """
    Calculate approximate Gaussian curvature for surface quality assessment.
    
    Args:
        x, y, z: Surface coordinate arrays
        
    Returns:
        Array of curvature values
    """
    stability_threshold = settings.stability_threshold
    
    # First derivatives
    dx_du = np.gradient(x, axis=1)
    dy_du = np.gradient(y, axis=1)
    dz_du = np.gradient(z, axis=1)
    
    dx_dv = np.gradient(x, axis=0)
    dy_dv = np.gradient(y, axis=0)
    dz_dv = np.gradient(z, axis=0)
    
    # Second derivatives
    d2x_du2 = np.gradient(dx_du, axis=1)
    d2y_du2 = np.gradient(dy_du, axis=1)
    d2z_du2 = np.gradient(dz_du, axis=1)
    
    d2x_dv2 = np.gradient(dx_dv, axis=0)
    d2y_dv2 = np.gradient(dy_dv, axis=0)
    d2z_dv2 = np.gradient(dz_dv, axis=0)
    
    d2x_dudv = np.gradient(dx_du, axis=0)
    d2y_dudv = np.gradient(dy_du, axis=0)
    d2z_dudv = np.gradient(dz_du, axis=0)
    
    # Normal vector
    nx = dy_du * dz_dv - dz_du * dy_dv
    ny = dz_du * dx_dv - dx_du * dz_dv
    nz = dx_du * dy_dv - dy_du * dx_dv
    
    # Normalize
    norm = np.sqrt(nx**2 + ny**2 + nz**2) + 1e-10
    nx, ny, nz = nx/norm, ny/norm, nz/norm
    
    # Calculate mean curvature components
    L = d2x_du2 * nx + d2y_du2 * ny + d2z_du2 * nz
    M = d2x_dudv * nx + d2y_dudv * ny + d2z_dudv * nz
    N = d2x_dv2 * nx + d2y_dv2 * ny + d2z_dv2 * nz
    
    # First fundamental form coefficients
    E = dx_du**2 + dy_du**2 + dz_du**2
    F = dx_du * dx_dv + dy_du * dy_dv + dz_du * dz_dv
    G = dx_dv**2 + dy_dv**2 + dz_dv**2
    
    # Gaussian curvature
    det_I = E * G - F**2
    gaussian_curvature = np.where(
        det_I > stability_threshold,
        (L * N - M**2) / det_I,
        0.0
    )
    
    return gaussian_curvature


def calculate_mean_curvature(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> np.ndarray:
    """
    Calculate mean curvature for a parametric surface.
    
    Args:
        x, y, z: Surface coordinate arrays
        
    Returns:
        Array of mean curvature values
    """
    stability_threshold = settings.stability_threshold
    
    # First derivatives
    dx_du = np.gradient(x, axis=1)
    dy_du = np.gradient(y, axis=1)
    dz_du = np.gradient(z, axis=1)
    
    dx_dv = np.gradient(x, axis=0)
    dy_dv = np.gradient(y, axis=0)
    dz_dv = np.gradient(z, axis=0)
    
    # Second derivatives
    d2x_du2 = np.gradient(dx_du, axis=1)
    d2y_du2 = np.gradient(dy_du, axis=1)
    d2z_du2 = np.gradient(dz_du, axis=1)
    
    d2x_dv2 = np.gradient(dx_dv, axis=0)
    d2y_dv2 = np.gradient(dy_dv, axis=0)
    d2z_dv2 = np.gradient(dz_dv, axis=0)
    
    d2x_dudv = np.gradient(dx_du, axis=0)
    d2y_dudv = np.gradient(dy_du, axis=0)
    d2z_dudv = np.gradient(dz_du, axis=0)
    
    # Normal vector
    nx = dy_du * dz_dv - dz_du * dy_dv
    ny = dz_du * dx_dv - dx_du * dz_dv
    nz = dx_du * dy_dv - dy_du * dx_dv
    
    # Normalize
    norm = np.sqrt(nx**2 + ny**2 + nz**2) + 1e-10
    nx, ny, nz = nx/norm, ny/norm, nz/norm
    
    # Calculate mean curvature components
    L = d2x_du2 * nx + d2y_du2 * ny + d2z_du2 * nz
    M = d2x_dudv * nx + d2y_dudv * ny + d2z_dudv * nz
    N = d2x_dv2 * nx + d2y_dv2 * ny + d2z_dv2 * nz
    
    # First fundamental form coefficients
    E = dx_du**2 + dy_du**2 + dz_du**2
    F = dx_du * dx_dv + dy_du * dy_dv + dz_du * dz_dv
    G = dx_dv**2 + dy_dv**2 + dz_dv**2
    
    # Mean curvature
    det_I = E * G - F**2
    mean_curvature = np.where(
        det_I > stability_threshold,
        (E * N - 2 * F * M + G * L) / (2 * det_I),
        0.0
    )
    
    return mean_curvature


def calculate_principal_curvatures(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Calculate principal curvatures for a parametric surface.
    
    Args:
        x, y, z: Surface coordinate arrays
        
    Returns:
        Tuple of (k1, k2) principal curvature arrays
    """
    # Calculate Gaussian and mean curvatures
    K = calculate_gaussian_curvature(x, y, z)
    H = calculate_mean_curvature(x, y, z)
    
    # Principal curvatures from Gaussian and mean curvatures
    # k1, k2 = H ± sqrt(H² - K)
    discriminant = H**2 - K
    discriminant = np.maximum(discriminant, 0)  # Ensure non-negative
    sqrt_discriminant = np.sqrt(discriminant)
    
    k1 = H + sqrt_discriminant
    k2 = H - sqrt_discriminant
    
    return k1, k2


# Export public interface
__all__ = [
    "calculate_gaussian_curvature",
    "calculate_mean_curvature", 
    "calculate_principal_curvatures"
] 