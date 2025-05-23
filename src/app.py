"""
SKB Visualization Application - Refactored Main Application File.
This file has been significantly refactored for better maintainability and organization.
"""

import os
import logging
from flask import Flask

from .config import settings, get_logging_config
from .routes import main_bp, api_bp, quantum_bp
from .utils.cache import initialize_cache, get_cache_config

# Configure enhanced logging for scientific visualization
logging.basicConfig(**get_logging_config())
logger = logging.getLogger(__name__)

# Determine base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def create_app():
    """
    Application factory for creating Flask application instances.
    This approach supports better testing and deployment flexibility.
    """
    # Initialize Flask app with proper template and static folder paths
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, "pages"),
        static_folder=os.path.join(BASE_DIR, "static"),
    )
    
    # Configure app from settings
    app.config.update({
        'SECRET_KEY': settings.secret_key,
        'DEBUG': settings.debug,
        'ENV': settings.environment.value,
        'TESTING': settings.environment.name == 'TESTING'
    })
    
    # Initialize cache system
    try:
        cache_config = get_cache_config()
        initialize_cache(cache_config)
        logger.info("Cache system initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize cache: {e}")
    
    # Register blueprints for organized routing
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(quantum_bp)
    
    logger.info(f"Flask application created in {settings.environment.value} mode")
    
    return app


# Create the main application instance
app = create_app()


if __name__ == '__main__':
    # Run the application with settings from configuration
    app.run(
        host=settings.host,
        port=settings.port,
        debug=settings.debug
    ) 