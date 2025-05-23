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