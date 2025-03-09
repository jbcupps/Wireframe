"""
4D Manifold Visualization and Description Section
This module provides visualization and educational content 
about 4D manifolds, specifically Spacetime Klein Bottles (SKBs) and sub-SKBs.
"""

from flask import Blueprint

manifold_bp = Blueprint('manifold', __name__, 
                        url_prefix='/manifold',
                        template_folder='../templates')

from . import routes 