"""
API routes for SKB Visualization Application.
Handles computational endpoints and data processing.
"""

from flask import Blueprint, request, jsonify
import logging

from ..services.evolution_service import EvolutionService
from ..services.topology_service import TopologyService  
from ..services.visualization_service import VisualizationService

# Create blueprint for API routes
api_bp = Blueprint('api', __name__)

logger = logging.getLogger(__name__)

# Initialize services
evolution_service = EvolutionService()
topology_service = TopologyService()
visualization_service = VisualizationService()


@api_bp.route('/compute_evolution', methods=['POST'])
def compute_evolution():
    """Run evolutionary algorithm to find compatible Sub-SKBs."""
    try:
        data = request.get_json()
        result = evolution_service.run_evolution(data)
        return jsonify(result)
    except (ValueError, TypeError) as e:
        logger.error(f"Error in evolution computation: {e}")
        return jsonify({'error': str(e)}), 400


@api_bp.route('/compute_topological_compatibility', methods=['POST'])
def compute_topological_compatibility():
    """Compute topological compatibility between two Sub-SKBs."""
    try:
        data = request.get_json()
        result = topology_service.compute_compatibility(data)
        return jsonify(result)
    except (ValueError, TypeError) as e:
        logger.error(f"Error in topology computation: {e}")
        return jsonify({'error': str(e)}), 400


@api_bp.route('/get_visualization', methods=['POST'])
def get_visualization():
    """Generate enhanced visualization data with improved mathematical modeling."""
    try:
        data = request.get_json()
        result = visualization_service.generate_visualization(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in visualization generation: {e}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/get_skb_visualization', methods=['POST'])
def get_skb_visualization():
    """Generate visualization data for a single Spacetime Klein Bottle."""
    try:
        data = request.get_json()
        
        # Extract parameters
        kx = float(data.get('kx', 0))
        ky = float(data.get('ky', 0))
        kz = float(data.get('kz', 0))
        kt = float(data.get('kt', 0))
        t = float(data.get('t', 0))
        loop_factor = int(data.get('loop_factor', 1))
        
        # Use KleinBottleGenerator for single SKB visualization
        from ..mathematics.klein_bottle import get_klein_bottle_generator
        from ..mathematics.surfaces import create_enhanced_surface_trace
        
        generator = get_klein_bottle_generator(resolution=75)
        skb_data = generator.generate_parametric_surface(
            twists=(kx, ky, kz, kt),
            time_param=t,
            loop_factor=loop_factor
        )
        
        # Create surface trace for Plotly
        surface_trace = create_enhanced_surface_trace(
            x=skb_data['x'],
            y=skb_data['y'],
            z=skb_data['z'],
            u=skb_data['u'],
            v=skb_data['v'],
            name='Spacetime Klein Bottle',
            color=(187, 134, 252),  # Purple color for SKB
            opacity=0.85,
            surface_type="Klein"
        )
        
        # Add fundamental group to properties
        properties = skb_data['topological_properties']
        properties['fundamental_group'] = 'π₁(𝒦) = ℤ ⋊ ℤ₂'  # Standard Klein bottle fundamental group
        
        return jsonify({
            'plot': {'data': [surface_trace]},
            'properties': properties
        })
        
    except Exception as e:
        logger.error(f"Error in SKB visualization generation: {e}")
        return jsonify({'error': str(e)}), 500 