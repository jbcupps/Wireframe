"""
Routes for the 4D Manifold Visualization section.
"""

from flask import render_template, jsonify, request
from . import manifold_bp
from ..models.manifold_generators import (
    generate_skb,
    generate_sub_skb,
    calculate_topological_invariants
)

@manifold_bp.route('/')
def index():
    """Render the main visualization page for the manifold section."""
    return render_template('index.html')

@manifold_bp.route('/skb_visualization')
def skb_visualization():
    """Render the SKB visualization page."""
    return render_template('skb_visualization.html')

@manifold_bp.route('/generate_skb', methods=['POST'])
def generate_skb_route():
    """Generate SKB data based on provided parameters."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract parameters
        twists = (
            data.get('twist_x', 0),
            data.get('twist_y', 0),
            data.get('twist_z', 0)
        )
        time = data.get('time', 0)
        loop_factor = data.get('loop_factor', 1)
        
        # Generate SKB
        skb_data = generate_skb(twists, time, loop_factor)
        
        # Calculate invariants
        invariants = calculate_topological_invariants('skb', {
            'twist_x': twists[0],
            'twist_y': twists[1],
            'twist_z': twists[2],
            'time': time,
            'loop_factor': loop_factor
        })
        
        return jsonify({
            "skb_data": skb_data,
            "invariants": invariants
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@manifold_bp.route('/generate_sub_skb', methods=['POST'])
def generate_sub_skb_route():
    """Generate Sub-SKB data based on provided parameters."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract parameters
        twists = (
            data.get('twist_x', 0),
            data.get('twist_y', 0),
            data.get('twist_z', 0)
        )
        time = data.get('time', 0)
        loop_factor = data.get('loop_factor', 1)
        
        # Generate Sub-SKB
        sub_skb_data = generate_sub_skb(twists, time, loop_factor)
        
        # Calculate invariants
        invariants = calculate_topological_invariants('sub_skb', {
            'twist_x': twists[0],
            'twist_y': twists[1],
            'twist_z': twists[2],
            'time': time,
            'loop_factor': loop_factor
        })
        
        return jsonify({
            "sub_skb_data": sub_skb_data,
            "invariants": invariants
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@manifold_bp.route('/educational_content')
def educational_content():
    """Render the educational content page."""
    return render_template('educational_content.html') 