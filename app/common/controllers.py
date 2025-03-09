"""
Common controllers for the 4D Manifold Explorer application.
"""

from flask import Blueprint, render_template

common_bp = Blueprint('common', __name__, url_prefix='/')

@common_bp.route('/')
def index():
    """Render the main landing page."""
    return render_template('index.html') 