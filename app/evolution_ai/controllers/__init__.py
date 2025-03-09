"""
Evolution, Iterative, and AI/ML Section
This module provides tools for exploring and developing 
the 4D Manifold hypothesis through evolutionary algorithms,
methodical iteration, and AI/ML approaches.
"""

from flask import Blueprint

evolution_bp = Blueprint('evolution', __name__, 
                        url_prefix='/evolution',
                        template_folder='../templates')

from . import routes 