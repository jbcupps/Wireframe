"""
Standard and Quantum Physics Section
This module provides visualization of established physics theories
and tools for mapping 4D manifold results to known models and observations.
"""

from flask import Blueprint

quantum_bp = Blueprint('quantum', __name__, 
                      url_prefix='/quantum',
                      template_folder='../templates')

from . import routes 