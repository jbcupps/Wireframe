"""
4D Manifold Explorer Application
A web application for exploring 4D manifold physics concepts.
"""

from flask import Flask
from logging.config import dictConfig
import datetime

# Configure application logging
dictConfig({
    'version': 1,
    'formatters': {
        'default': {
            'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'INFO',
            'formatter': 'default',
            'stream': 'ext://sys.stdout',
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console']
    }
})

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__, 
                template_folder='common/templates',
                static_folder='common/static')
    
    # Add custom Jinja2 filters
    @app.template_filter('current_year')
    def current_year_filter(text):
        """Get the current year."""
        return datetime.datetime.now().year
    
    # Register blueprint for the main landing page
    from .common.controllers import common_bp
    app.register_blueprint(common_bp)
    
    # Register blueprints for each section
    from .manifold_vis.controllers import manifold_bp
    from .evolution_ai.controllers import evolution_bp
    from .quantum_physics.controllers import quantum_bp
    
    app.register_blueprint(manifold_bp)
    app.register_blueprint(evolution_bp)
    app.register_blueprint(quantum_bp)
    
    # Register error handlers
    from .common.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    # Add custom template context processor
    @app.context_processor
    def inject_now():
        """Inject date/time variables into templates."""
        return {'now': datetime.datetime.now()}
    
    return app 