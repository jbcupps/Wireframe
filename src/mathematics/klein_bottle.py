"""
Klein Bottle Mathematical Computations for SKB Visualization.
Provides enhanced parametric equations and topological analysis for Klein bottles.
"""

import numpy as np
import logging
from typing import Tuple, Dict, Any, Optional

from ..utils.cache import cached_klein_bottle
from ..config import settings

logger = logging.getLogger(__name__)


class KleinBottleParametrics:
    """Handles Klein bottle parametric equations and surface generation."""
    
    def __init__(self, resolution: int = 75):
        """Initialize parametric generator."""
        self.resolution = min(resolution, settings.max_surface_resolution)
        self.numerical_precision = settings.numerical_precision
        self.stability_threshold = settings.stability_threshold
    
    def generate_surface_coordinates(
        self, 
        twists: Tuple[float, float, float, float],
        time_param: float,
        loop_factor: float
    ) -> Dict[str, np.ndarray]:
        """
        Generate Klein bottle surface coordinates.
        
        Args:
            twists: Twist parameters [kx, ky, kz, kt]
            time_param: Time parameter for dynamic evolution
            loop_factor: Number of loops in the parametric domain
            
        Returns:
            Dict containing x, y, z, u, v coordinate arrays
        """
        # Validate input parameters
        kx, ky, kz, kt = self._validate_twists(twists)
        time_param = self._validate_time_param(time_param)
        loop_factor = max(1.0, min(5.0, loop_factor))
        
        # Generate parameter meshgrid
        u = np.linspace(0, 2 * np.pi * loop_factor, self.resolution)
        v = np.linspace(0, 2 * np.pi, self.resolution)
        u_mesh, v_mesh = np.meshgrid(u, v)
        
        # Compute enhanced surface
        return self._compute_enhanced_surface(
            u_mesh, v_mesh, kx, ky, kz, kt, time_param, loop_factor
        )
    
    def _validate_twists(self, twists: Tuple[float, float, float, float]) -> Tuple[float, float, float, float]:
        """Validate and clamp twist parameters."""
        kx, ky, kz, kt = twists
        
        # Clamp spatial twists
        kx = max(-5.0, min(5.0, kx))
        ky = max(-5.0, min(5.0, ky))
        kz = max(-5.0, min(5.0, kz))
        
        # Clamp time twist for CTC stability
        kt = max(-1.0, min(1.0, kt))
        
        return (kx, ky, kz, kt)
    
    def _validate_time_param(self, t: float) -> float:
        """Validate time parameter."""
        return max(0.0, min(2 * np.pi, t))
    
    def _compute_enhanced_surface(
        self, 
        u: np.ndarray, 
        v: np.ndarray,
        kx: float, ky: float, kz: float, kt: float,
        t: float, 
        loop_factor: float
    ) -> Dict[str, np.ndarray]:
        """Compute enhanced Klein bottle surface with topological deformations."""
        # Enhanced time twist modeling for CTC visualization
        time_factor = kt * np.sin(u + t) * 0.2
        stability_factor = 1.0 / (1.0 + abs(kt) * 2)
        
        # Dynamic Klein bottle parameters with twist effects
        a = 2.5 + 0.3 * np.sin(kx * t / 10)  # Dynamic major radius
        b = 1.2 + 0.2 * np.cos(ky * t / 10)  # Dynamic minor radius
        
        # Enhanced parametric equations with temporal evolution
        cos_u = np.cos(u + kx * t / 8)
        sin_u = np.sin(u + ky * t / 8)
        cos_v = np.cos(v + kz * t / 12)
        sin_v = np.sin(v + kz * t / 12)
        cos_2v = np.cos(2 * v + kz * t / 6)
        
        # Figure-8 Klein bottle immersion with enhanced topology
        x = (a + b * cos_v) * cos_u
        y = (a + b * cos_v) * sin_u
        z = b * sin_v * cos_u / 2 + b * cos_2v * sin_u / 4
        
        # Apply time twist effects for CTC visualization
        x += time_factor * np.cos(v) * stability_factor
        y += time_factor * np.sin(v) * stability_factor
        z += time_factor * np.sin(u / loop_factor) * 0.15
        
        # Apply numerical precision
        x = np.round(x, self.numerical_precision)
        y = np.round(y, self.numerical_precision)
        z = np.round(z, self.numerical_precision)
        
        return {'x': x, 'y': y, 'z': z, 'u': u, 'v': v}


class KleinBottleTopology:
    """Handles topological property calculations for Klein bottles."""
    
    def __init__(self, stability_threshold: float = None):
        """Initialize topology calculator."""
        self.stability_threshold = stability_threshold or settings.stability_threshold
    
    def calculate_properties(
        self, 
        x: np.ndarray, 
        y: np.ndarray, 
        z: np.ndarray,
        twists: Tuple[float, float, float, float]
    ) -> Dict[str, Any]:
        """Calculate topological properties of the Klein bottle surface."""
        kx, ky, kz, kt = twists
        
        # Calculate basic topological invariants
        euler_characteristic = 0  # Klein bottle: χ = 0
        genus = 2  # Klein bottle: genus = 2 in 4D
        orientable = False  # Klein bottle is non-orientable
        
        # Calculate Stiefel-Whitney classes
        w1_class = 1  # Non-trivial for non-orientable surfaces
        w2_class = self._calculate_w2_class(x, y, z)
        
        # Calculate intersection form signature
        intersection_form = self._calculate_intersection_form(twists)
        
        # Calculate CTC stability metric
        ctc_stability = max(0, 1 - abs(kt))
        
        # Calculate topological charge
        topological_charge = self._calculate_topological_charge(x, y, z)
        
        return {
            'euler_characteristic': euler_characteristic,
            'genus': genus,
            'orientable': orientable,
            'stiefel_whitney_w1': w1_class,
            'stiefel_whitney_w2': w2_class,
            'intersection_form': intersection_form,
            'ctc_stability': ctc_stability,
            'topological_charge': topological_charge,
            'surface_type': 'Klein Bottle'
        }
    
    def _calculate_w2_class(self, x: np.ndarray, y: np.ndarray, z: np.ndarray) -> int:
        """Calculate second Stiefel-Whitney class."""
        from .curvature import calculate_gaussian_curvature
        curvature = calculate_gaussian_curvature(x, y, z)
        return 1 if np.mean(np.abs(curvature)) > self.stability_threshold else 0
    
    def _calculate_intersection_form(self, twists: Tuple[float, float, float, float]) -> str:
        """Calculate intersection form type."""
        kx, ky, kz, kt = twists
        
        # Simplified intersection form calculation
        determinant = kx * ky - kz * kt
        
        if abs(determinant) < self.stability_threshold:
            return "Degenerate"
        elif determinant > 0:
            return "Positive Definite"
        else:
            return "Indefinite"
    
    def _calculate_topological_charge(self, x: np.ndarray, y: np.ndarray, z: np.ndarray) -> float:
        """Calculate topological charge (winding number)."""
        # Sample points for charge calculation
        sample_step = max(1, len(x) // 10)
        
        x_sample = x[::sample_step, ::sample_step]
        y_sample = y[::sample_step, ::sample_step]
        z_sample = z[::sample_step, ::sample_step]
        
        # Calculate approximate winding number
        center_x, center_y, center_z = np.mean(x_sample), np.mean(y_sample), np.mean(z_sample)
        
        # Vector from center to surface points
        dx = x_sample - center_x
        dy = y_sample - center_y
        dz = z_sample - center_z
        
        # Normalize vectors
        norm = np.sqrt(dx**2 + dy**2 + dz**2) + 1e-10
        dx, dy, dz = dx/norm, dy/norm, dz/norm
        
        # Calculate approximate charge
        charge = np.mean(dx * np.roll(dy, 1, axis=0) - dy * np.roll(dx, 1, axis=0))
        
        return float(np.round(charge, 4))


class KleinBottleQuality:
    """Handles surface quality metrics and analysis."""
    
    def calculate_metrics(self, surface_data: Dict[str, np.ndarray]) -> Dict[str, float]:
        """Calculate surface quality metrics."""
        x, y, z = surface_data['x'], surface_data['y'], surface_data['z']
        
        # Calculate surface area (approximate)
        surface_area = self._approximate_surface_area(x, y, z)
        
        # Calculate volume (for closed surfaces)
        volume = self._approximate_volume(x, y, z)
        
        # Calculate smoothness metric
        smoothness = self._calculate_smoothness(x, y, z)
        
        # Calculate aspect ratio
        x_range = np.max(x) - np.min(x)
        y_range = np.max(y) - np.min(y)
        z_range = np.max(z) - np.min(z)
        aspect_ratio = max(x_range, y_range, z_range) / min(x_range, y_range, z_range)
        
        return {
            'surface_area': float(surface_area),
            'volume': float(volume),
            'smoothness': float(smoothness),
            'aspect_ratio': float(aspect_ratio),
            'resolution': len(x),
            'num_points': x.size
        }
    
    def _approximate_surface_area(self, x: np.ndarray, y: np.ndarray, z: np.ndarray) -> float:
        """Approximate surface area using finite differences."""
        dx_du = np.gradient(x, axis=1)
        dy_du = np.gradient(y, axis=1)
        dz_du = np.gradient(z, axis=1)
        
        dx_dv = np.gradient(x, axis=0)
        dy_dv = np.gradient(y, axis=0)
        dz_dv = np.gradient(z, axis=0)
        
        # Cross product magnitude
        cross_x = dy_du * dz_dv - dz_du * dy_dv
        cross_y = dz_du * dx_dv - dx_du * dz_dv
        cross_z = dx_du * dy_dv - dy_du * dx_dv
        
        cross_magnitude = np.sqrt(cross_x**2 + cross_y**2 + cross_z**2)
        
        return np.sum(cross_magnitude) * (2 * np.pi / len(x))**2
    
    def _approximate_volume(self, x: np.ndarray, y: np.ndarray, z: np.ndarray) -> float:
        """Approximate volume using divergence theorem."""
        center_x, center_y, center_z = np.mean(x), np.mean(y), np.mean(z)
        
        # Calculate distances from center
        distances = np.sqrt((x - center_x)**2 + (y - center_y)**2 + (z - center_z)**2)
        
        # Approximate volume as integral of distances
        return float(np.mean(distances**3) * 8 * np.pi / 3)
    
    def _calculate_smoothness(self, x: np.ndarray, y: np.ndarray, z: np.ndarray) -> float:
        """Calculate surface smoothness metric."""
        # Calculate second derivatives
        d2x_du2 = np.gradient(np.gradient(x, axis=1), axis=1)
        d2y_du2 = np.gradient(np.gradient(y, axis=1), axis=1)
        d2z_du2 = np.gradient(np.gradient(z, axis=1), axis=1)
        
        d2x_dv2 = np.gradient(np.gradient(x, axis=0), axis=0)
        d2y_dv2 = np.gradient(np.gradient(y, axis=0), axis=0)
        d2z_dv2 = np.gradient(np.gradient(z, axis=0), axis=0)
        
        # Calculate curvature magnitude
        curvature_magnitude = np.sqrt(
            d2x_du2**2 + d2y_du2**2 + d2z_du2**2 +
            d2x_dv2**2 + d2y_dv2**2 + d2z_dv2**2
        )
        
        # Smoothness is inverse of mean curvature magnitude
        mean_curvature = np.mean(curvature_magnitude)
        return 1.0 / (1.0 + mean_curvature)


class KleinBottleGenerator:
    """Main Klein bottle generator that coordinates all components."""
    
    def __init__(self, resolution: int = 75):
        """Initialize Klein bottle generator."""
        self.resolution = min(resolution, settings.max_surface_resolution)
        self.parametrics = KleinBottleParametrics(resolution)
        self.topology = KleinBottleTopology()
        self.quality = KleinBottleQuality()
        
    @cached_klein_bottle()
    def generate_parametric_surface(
        self, 
        twists: Tuple[float, float, float, float],
        time_param: float,
        loop_factor: float
    ) -> Dict[str, Any]:
        """Generate enhanced Klein bottle parametric surface."""
        logger.debug(f"Generating Klein bottle with twists={twists}, t={time_param}, loops={loop_factor}")
        
        # Generate surface coordinates
        surface_data = self.parametrics.generate_surface_coordinates(
            twists, time_param, loop_factor
        )
        
        # Calculate topological properties
        topological_props = self.topology.calculate_properties(
            surface_data['x'], surface_data['y'], surface_data['z'], twists
        )
        
        # Calculate surface quality metrics
        quality_metrics = self.quality.calculate_metrics(surface_data)
        
        return {
            **surface_data,
            'topological_properties': topological_props,
            'quality_metrics': quality_metrics,
            'parameters': {
                'twists': twists,
                'time_param': time_param,
                'loop_factor': loop_factor,
                'resolution': self.resolution
            }
        }


# Global Klein bottle generator instance
_klein_bottle_generator: Optional[KleinBottleGenerator] = None


def get_klein_bottle_generator(resolution: int = 75) -> KleinBottleGenerator:
    """Get global Klein bottle generator instance."""
    global _klein_bottle_generator
    if _klein_bottle_generator is None or _klein_bottle_generator.resolution != resolution:
        _klein_bottle_generator = KleinBottleGenerator(resolution)
    return _klein_bottle_generator


# Convenience functions
def generate_klein_bottle(
    twists: Tuple[float, float, float, float],
    time_param: float = 0.0,
    loop_factor: float = 1.0,
    resolution: int = 75
) -> Dict[str, Any]:
    """Generate Klein bottle surface with given parameters."""
    generator = get_klein_bottle_generator(resolution)
    return generator.generate_parametric_surface(twists, time_param, loop_factor)


# Export public interface
__all__ = [
    "KleinBottleGenerator",
    "KleinBottleParametrics",
    "KleinBottleTopology", 
    "KleinBottleQuality",
    "get_klein_bottle_generator", 
    "generate_klein_bottle"
] 