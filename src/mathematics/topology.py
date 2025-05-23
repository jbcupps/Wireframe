"""
Topological calculations for SKB Visualization Application.
Provides functions for calculating topological properties and field lines.
"""

import numpy as np
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def calculate_ctc_stability(twists: List[List[float]]) -> float:
    """
    Calculate the overall CTC (Closed Timelike Curve) stability.
    
    Args:
        twists: List of twist parameters for each surface
        
    Returns:
        Stability value between 0 and 1
    """
    try:
        # Extract time twist parameters (index 3)
        time_twists = [twist[3] for twist in twists if len(twist) > 3]
        total_time_twist = sum(abs(tt) for tt in time_twists)
        stability = max(0, 1 - total_time_twist / 3)  # Normalize to 0-1 range
        return round(stability, 3)
    except (IndexError, TypeError):
        logger.warning("Invalid twist parameters for CTC stability calculation")
        return 0.5


def calculate_total_genus(twists: List[List[float]], merged: bool = False) -> int:
    """
    Calculate the total topological genus of the configuration.
    
    Args:
        twists: List of twist parameters for each surface
        merged: Whether surfaces are merged
        
    Returns:
        Total genus value
    """
    try:
        if merged:
            # Merged topology typically has genus 2 for Klein bottle
            return 2
        else:
            # Individual components: Klein bottle (1), Möbius strip (1), Torus (1)
            return len(twists) if twists else 1
    except TypeError:
        logger.warning("Invalid parameters for genus calculation")
        return 1


def generate_topological_field_lines(twists: List[List[float]], t: float) -> List[Dict[str, Any]]:
    """
    Generate field lines representing topological connections between Sub-SKBs.
    
    Args:
        twists: List of twist parameters for each Sub-SKB
        t: Time parameter
        
    Returns:
        List of field line traces
    """
    try:
        field_lines = []
        
        # Calculate field strength based on twist compatibility
        for i in range(len(twists)):
            for j in range(i + 1, len(twists)):
                if len(twists[i]) < 3 or len(twists[j]) < 3:
                    continue
                    
                twist1, twist2 = twists[i], twists[j]
                
                # Calculate topological field strength
                field_strength = 1.0 / (1.0 + np.sqrt(
                    (twist1[0] - twist2[0])**2 + 
                    (twist1[1] - twist2[1])**2 + 
                    (twist1[2] - twist2[2])**2
                ))
                
                # Only show strong connections
                if field_strength > 0.3:
                    field_line = _create_field_line(i, j, twist1, twist2, t, field_strength)
                    if field_line:
                        field_lines.append(field_line)
        
        return field_lines
        
    except Exception as e:
        logger.warning(f"Error generating field lines: {e}")
        return []


def _create_field_line(
    i: int, 
    j: int, 
    twist1: List[float], 
    twist2: List[float], 
    t: float, 
    field_strength: float
) -> Optional[Dict[str, Any]]:
    """
    Create a single field line between two surfaces.
    
    Args:
        i, j: Surface indices
        twist1, twist2: Twist parameters
        t: Time parameter
        field_strength: Connection strength
        
    Returns:
        Field line trace configuration or None
    """
    try:
        # Generate parametric field line
        u = np.linspace(0, 1, 20)
        
        # Create curved connection based on twist parameters
        curve_factor = (twist1[0] + twist2[0]) * 0.1 if len(twist1) > 0 and len(twist2) > 0 else 0
        
        x_line = (1 - u) * (2 * np.cos(i * 2 * np.pi / 3)) + u * (2 * np.cos(j * 2 * np.pi / 3))
        y_line = (1 - u) * (2 * np.sin(i * 2 * np.pi / 3)) + u * (2 * np.sin(j * 2 * np.pi / 3))
        z_line = curve_factor * np.sin(np.pi * u) + 0.2 * np.sin(t + u * np.pi)
        
        field_line = {
            'x': x_line.tolist(),
            'y': y_line.tolist(),
            'z': z_line.tolist(),
            'mode': 'lines',
            'type': 'scatter3d',
            'line': {
                'width': max(2, int(field_strength * 8)),
                'color': f'rgba(255, 200, 100, {field_strength * 0.8})'
            },
            'name': f'Field Line {i+1}-{j+1}',
            'hoverinfo': 'name',
            'showlegend': False
        }
        return field_line
        
    except Exception as e:
        logger.warning(f"Error creating field line {i}-{j}: {e}")
        return None


def calculate_surface_intersections(
    surface1: Dict[str, Any], 
    surface2: Dict[str, Any], 
    tolerance: float = 0.1
) -> Optional[Dict[str, List[float]]]:
    """
    Calculate intersections between two surfaces for enhanced visualization.
    
    Args:
        surface1, surface2: Surface data dictionaries
        tolerance: Distance tolerance for intersection detection
        
    Returns:
        Dictionary with intersection point coordinates or None
    """
    try:
        # Extract surface coordinates
        x1, y1, z1 = np.array(surface1['x']), np.array(surface1['y']), np.array(surface1['z'])
        x2, y2, z2 = np.array(surface2['x']), np.array(surface2['y']), np.array(surface2['z'])
        
        # Sample points for intersection calculation
        sample_step = max(1, len(x1) // 20)
        
        intersections_x, intersections_y, intersections_z = [], [], []
        
        # Optimized intersection detection
        for i in range(0, len(x1), sample_step):
            for j in range(0, len(x1[0]), sample_step):
                if i < len(x1) and j < len(x1[0]):
                    p1 = np.array([x1[i][j], y1[i][j], z1[i][j]])
                    
                    # Find closest point on surface2
                    min_dist = float('inf')
                    closest_point = None
                    
                    for ii in range(0, len(x2), sample_step):
                        for jj in range(0, len(x2[0]), sample_step):
                            if ii < len(x2) and jj < len(x2[0]):
                                p2 = np.array([x2[ii][jj], y2[ii][jj], z2[ii][jj]])
                                dist = np.linalg.norm(p1 - p2)
                                
                                if dist < min_dist:
                                    min_dist = dist
                                    closest_point = p2
                    
                    # If points are close enough, consider it an intersection
                    if min_dist < tolerance and closest_point is not None:
                        # Add midpoint as intersection
                        midpoint = (p1 + closest_point) / 2
                        intersections_x.append(float(midpoint[0]))
                        intersections_y.append(float(midpoint[1]))
                        intersections_z.append(float(midpoint[2]))
        
        if intersections_x:
            return {
                'x': intersections_x,
                'y': intersections_y,
                'z': intersections_z
            }
        else:
            return None
            
    except Exception as e:
        logger.warning(f"Error calculating surface intersections: {e}")
        return None 