"""
Main navigation routes for SKB Visualization Application.
Handles basic page routing and navigation.
"""

import base64
import os
from flask import Blueprint, render_template, send_file

main_bp = Blueprint('main', __name__)

# Existing routes...
@main_bp.route('/')
def landing():
    """Landing page route."""
    return render_template('site_home.html', explorers=EXPLORERS)

# ... other existing routes ...

# NEW: Forces Evolution Guided Tour (7-stage tentacle deformations)
@main_bp.route('/forces-evolution')
def forces_evolution():
    """Guided 7-stage evolution showing continuous spacetime fabric, inseparable gluon tentacles, torsion tension, curvature deformation, and mass emergence."""
    return render_template('forces-evolution.html')
