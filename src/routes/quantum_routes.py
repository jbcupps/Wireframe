"""
Quantum mechanics routes for SKB Visualization Application.
Handles quantum physics related page routing.
"""

from flask import Blueprint, render_template

# Create blueprint for quantum routes
quantum_bp = Blueprint('quantum', __name__)


@quantum_bp.route('/double_slit')
def double_slit():
    """Double-slit experiment visualization page route."""
    return render_template('double_slit.html')


@quantum_bp.route('/quantum_tunneling')
def quantum_tunneling():
    """Quantum tunneling visualization page route."""
    return render_template('quantum_tunneling.html') 