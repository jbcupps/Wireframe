"""
Main navigation routes for SKB Visualization Application.
Handles basic page routing and navigation.
"""

from flask import Blueprint, render_template

# Create blueprint for main routes
main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def landing():
    """Landing page route."""
    return render_template('landing.html')


@main_bp.route('/visualization')
def visualization():
    """Main visualization page route."""
    return render_template('visualization.html')


@main_bp.route('/topological_diffusion')
def topological_diffusion():
    """Topological diffusion page route."""
    return render_template('topological_diffusion.html')


@main_bp.route('/evolution')
def evolution():
    """Evolution algorithm page route."""
    return render_template('evolution.html')


@main_bp.route('/oscillator')
def oscillator():
    """Quantum oscillator page route."""
    return render_template('oscillator.html')


@main_bp.route('/maxwell')
def maxwell():
    """Maxwell equations page route."""
    return render_template('maxwell.html')


@main_bp.route('/maxwells')
def maxwells():
    """Maxwell's equations detailed page route."""
    return render_template('maxwells.html')


@main_bp.route('/fermion-evolution')
def fermion_evolution():
    """Fermion evolution visualization page route."""
    return render_template('fermion_evolution.html')


@main_bp.route('/skb_explorer')
def skb_explorer():
    """Spacetime Klein Bottle Explorer page route."""
    return render_template('skb_explorer.html')


@main_bp.route('/health')
def health_check():
    """Health check endpoint for container monitoring."""
    from flask import jsonify
    return jsonify({
        'status': 'healthy',
        'service': 'SKB Visualization',
        'version': '1.0.0'
    }), 200 