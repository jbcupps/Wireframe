"""
Flask routes package for SKB Visualization Application.
Organizes routes into logical modules for better maintainability.
"""

from .main_routes import main_bp
from .api_routes import api_bp
from .quantum_routes import quantum_bp

# Export all blueprints
__all__ = ["main_bp", "api_bp", "quantum_bp"] 