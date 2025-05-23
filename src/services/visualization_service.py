"""
Visualization Service for SKB Visualization Application.
Handles generation of complex 3D visualizations and surface rendering.
"""

import numpy as np
import logging
import traceback
from typing import Dict, Any, List, Tuple

from ..mathematics import (
    generate_klein_bottle,
    generate_mobius_strip,
    generate_torus,
    create_enhanced_surface_trace,
    hex_to_rgb,
    calculate_ctc_stability,
    calculate_total_genus,
    generate_topological_field_lines,
    calculate_surface_intersections
)

logger = logging.getLogger(__name__)


class VisualizationService:
    """Service for generating complex 3D visualizations."""
    
    def generate_visualization(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate enhanced visualization data with improved mathematical modeling.
        
        Args:
            data: Request data containing visualization parameters
            
        Returns:
            Dict containing visualization data and metadata
        """
        try:
            logger.info("Received enhanced visualization request")
            logger.debug(f"Request data: {data}")
            
            # Extract and validate parameters
            params = self._extract_parameters(data)
            
            # Validate twist parameters
            params['twists'] = self._validate_twists(params['twists'])
            
            logger.info("Generating enhanced visualization data...")
            
            # Process colors
            color_rgb = self._process_colors(params['colors'])
            
            # Generate surfaces
            surfaces = self._generate_surfaces(params, color_rgb)
            
            logger.info(f"Returning {len(surfaces)} enhanced surfaces and visualizations")
            
            # Prepare response with metadata
            response_data = {
                'plot': {
                    'data': surfaces
                },
                'metadata': {
                    'surface_count': len(surfaces),
                    'enhancement_level': 'scientific',
                    'mathematical_accuracy': 'high',
                    'ctc_stability': calculate_ctc_stability(params['twists']),
                    'topological_genus': calculate_total_genus(params['twists'], params['merge'])
                }
            }
            
            return response_data
            
        except Exception as e:
            logger.error(f"Error in enhanced visualization: {str(e)}")
            logger.error(traceback.format_exc())
            return {'error': str(e)}
    
    def _extract_parameters(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and validate visualization parameters."""
        # Basic parameters
        t = float(data.get('t', 0))
        loop_factor = float(data.get('loop_factor', 1))
        loop1 = float(data.get('loop1', 1))
        loop2 = float(data.get('loop2', 1))
        loop3 = float(data.get('loop3', 1))
        merge = bool(data.get('merge', False))
        
        # Extract twist parameters for each sub-SKB
        twists = []
        for i in range(1, 4):
            twist = [
                float(data.get(f't{i}x', 0)),
                float(data.get(f't{i}y', 0)),
                float(data.get(f't{i}z', 0)),
                float(data.get(f't{i}t', 0))  # Time twist parameter
            ]
            twists.append(twist)
        
        # Ensure values are within scientifically valid ranges
        t = max(0, min(2 * np.pi, t))
        loop_factor = max(1, min(5, loop_factor))
        loop1 = max(1, min(5, loop1))
        loop2 = max(1, min(5, loop2))
        loop3 = max(1, min(5, loop3))
        
        # Color processing
        default_colors = {
            'skb1': '#ff6b9d',  # Enhanced pink
            'skb2': '#4fc3f7',  # Enhanced blue
            'skb3': '#81c784'   # Enhanced green
        }
        colors = data.get('colors', default_colors)
        
        return {
            't': t,
            'loop_factor': loop_factor,
            'loops': [loop1, loop2, loop3],
            'merge': merge,
            'twists': twists,
            'colors': colors
        }
    
    def _validate_twists(self, twists: List[List[float]]) -> List[List[float]]:
        """Validate twist parameters."""
        validated_twists = []
        for twist in twists:
            validated_twist = []
            # Validate spatial twist parameters (indices 0-2)
            for j in range(3):
                if j < len(twist):
                    validated_twist.append(max(-5, min(5, twist[j])))
                else:
                    validated_twist.append(0.0)
            
            # Validate time twist parameter (index 3) - critical for CTC stability
            if len(twist) > 3:
                validated_twist.append(max(-1, min(1, twist[3])))
            else:
                validated_twist.append(0.0)
            
            validated_twists.append(validated_twist)
        
        return validated_twists
    
    def _process_colors(self, colors: Dict[str, str]) -> Dict[str, Tuple[int, int, int]]:
        """Convert hex colors to RGB tuples."""
        color_rgb = {}
        for key, hex_color in colors.items():
            try:
                color_rgb[key] = hex_to_rgb(hex_color)
            except ValueError:
                logger.warning(f"Invalid color {hex_color} for {key}, using default")
                color_rgb[key] = (128, 128, 128)  # Gray fallback
        return color_rgb
    
    def _generate_surfaces(
        self, 
        params: Dict[str, Any], 
        color_rgb: Dict[str, Tuple[int, int, int]]
    ) -> List[Dict[str, Any]]:
        """Generate all surfaces based on parameters."""
        surfaces = []
        
        if params['merge']:
            surfaces.extend(self._generate_merged_surface(params, color_rgb))
        else:
            surfaces.extend(self._generate_individual_surfaces(params, color_rgb))
        
        return surfaces
    
    def _generate_merged_surface(
        self, 
        params: Dict[str, Any], 
        color_rgb: Dict[str, Tuple[int, int, int]]
    ) -> List[Dict[str, Any]]:
        """Generate merged stable SKB surface."""
        logger.debug("Generating enhanced merged SKB")
        
        # Enhanced merged stable SKB with weighted averages
        weight_factors = [0.4, 0.35, 0.25]  # Different weights for different components
        avg_twists = []
        for j in range(4):
            weighted_sum = sum(weight_factors[i] * params['twists'][i][j] for i in range(3))
            avg_twists.append(weighted_sum)
        
        # Generate enhanced Klein bottle for merged state
        result = generate_klein_bottle(
            tuple(avg_twists), 
            params['t'], 
            params['loop_factor'], 
            resolution=85
        )
        
        # Extract coordinates
        x, y, z = result['x'], result['y'], result['z']
        u, v = result['u'], result['v']
        
        # Create enhanced merged surface
        merged_color = (187, 134, 252)  # Purple for merged state
        enhanced_surface = create_enhanced_surface_trace(
            x, y, z, u, v,
            name='Merged SKB (Stable Hadron)',
            color=merged_color,
            opacity=0.85,
            surface_type="Klein"
        )
        
        # Enhanced properties for merged SKB
        enhanced_surface.update({
            'contours': {
                'x': {'show': True, 'width': 2.5, 'color': 'rgba(255,255,255,0.6)'},
                'y': {'show': True, 'width': 2.5, 'color': 'rgba(255,255,255,0.6)'},
                'z': {'show': True, 'width': 2.5, 'color': 'rgba(255,255,255,0.6)'}
            },
            'lighting': {
                'ambient': 0.5,
                'diffuse': 0.9,
                'roughness': 0.15,
                'specular': 1.0,
                'fresnel': 0.5
            }
        })
        
        return [enhanced_surface]
    
    def _generate_individual_surfaces(
        self, 
        params: Dict[str, Any], 
        color_rgb: Dict[str, Tuple[int, int, int]]
    ) -> List[Dict[str, Any]]:
        """Generate individual Sub-SKB surfaces."""
        logger.debug("Generating enhanced individual Sub-SKBs")
        
        surfaces = []
        surface_types = ["Klein", "Mobius", "Torus"]
        surface_names = ["Sub-SKB 1 (Klein)", "Sub-SKB 2 (Möbius)", "Sub-SKB 3 (Torus)"]
        opacities = [0.75, 0.68, 0.62]  # Graduated opacity for depth perception
        
        # Generate each enhanced sub-SKB
        for i, (twist, loop_val) in enumerate(zip(params['twists'], params['loops'])):
            logger.debug(f"Generating enhanced Sub-SKB {i+1}")
            
            # Generate surface based on type
            surface_data = self._generate_surface_by_type(i, twist, params['t'], loop_val)
            
            if surface_data:
                x, y, z, u, v = surface_data
                logger.debug(f"Enhanced Sub-SKB {i+1} generated, shape: {x.shape}")
                
                # Create enhanced surface trace
                color_key = f'skb{i+1}'
                enhanced_surface = create_enhanced_surface_trace(
                    x, y, z, u, v,
                    name=surface_names[i],
                    color=color_rgb[color_key],
                    opacity=opacities[i],
                    surface_type=surface_types[i]
                )
                
                # Add specialized lighting for each surface type
                enhanced_surface['lighting'] = self._get_lighting_for_surface_type(surface_types[i])
                
                surfaces.append(enhanced_surface)
                
                # Add intersection analysis for topological compatibility
                if i > 0:
                    intersection_points = calculate_surface_intersections(
                        surfaces[0], enhanced_surface, tolerance=0.15
                    )
                    
                    if intersection_points:
                        intersection_trace = self._create_intersection_trace(intersection_points, i)
                        surfaces.append(intersection_trace)
        
        # Add topological field lines for visualization of connections
        if len(surfaces) >= 3:
            field_lines = generate_topological_field_lines(params['twists'], params['t'])
            if field_lines:
                surfaces.extend(field_lines)
        
        return surfaces
    
    def _generate_surface_by_type(
        self, 
        surface_index: int, 
        twist: List[float], 
        t: float, 
        loop_val: float
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Generate surface based on its type."""
        if surface_index == 0:
            # Enhanced Klein bottle for first sub-SKB
            result = generate_klein_bottle(tuple(twist), t, loop_val, resolution=80)
            return result['x'], result['y'], result['z'], result['u'], result['v']
        elif surface_index == 1:
            # Enhanced twisted strip (Möbius-like) for second sub-SKB
            return generate_mobius_strip(twist, t, loop_val, resolution=80)
        else:
            # Enhanced torus for third sub-SKB
            return generate_torus(twist, t, loop_val, resolution=80)
    
    def _get_lighting_for_surface_type(self, surface_type: str) -> Dict[str, float]:
        """Get specialized lighting for each surface type."""
        lighting_configs = {
            "Klein": {
                'ambient': 0.45,
                'diffuse': 0.85,
                'roughness': 0.25,
                'specular': 0.95,
                'fresnel': 0.6
            },
            "Mobius": {
                'ambient': 0.5,
                'diffuse': 0.75,
                'roughness': 0.3,
                'specular': 0.8,
                'fresnel': 0.4
            },
            "Torus": {
                'ambient': 0.55,
                'diffuse': 0.7,
                'roughness': 0.35,
                'specular': 0.75,
                'fresnel': 0.35
            }
        }
        return lighting_configs.get(surface_type, lighting_configs["Klein"])
    
    def _create_intersection_trace(
        self, 
        intersection_points: Dict[str, List[float]], 
        surface_index: int
    ) -> Dict[str, Any]:
        """Create intersection markers trace."""
        return {
            'x': intersection_points['x'],
            'y': intersection_points['y'],
            'z': intersection_points['z'],
            'mode': 'markers',
            'type': 'scatter3d',
            'marker': {
                'size': 4,
                'color': 'rgba(255, 255, 100, 0.9)',
                'symbol': 'diamond',
                'line': {
                    'width': 2,
                    'color': 'rgba(255, 255, 255, 0.8)'
                }
            },
            'name': f'Topological Interface {surface_index}',
            'hoverinfo': 'name',
            'showlegend': True
        } 