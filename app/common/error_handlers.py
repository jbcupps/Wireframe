"""
Error handlers for the 4D Manifold Explorer application.
"""

from flask import jsonify, render_template, request

def register_error_handlers(app):
    """Register error handlers with the Flask application."""
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors."""
        if request_wants_json():
            return jsonify({"error": "Resource not found"}), 404
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(500)
    def server_error(error):
        """Handle 500 errors."""
        if request_wants_json():
            return jsonify({"error": "Internal server error"}), 500
        return render_template('errors/500.html'), 500
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 errors."""
        if request_wants_json():
            return jsonify({"error": "Bad request"}), 400
        return render_template('errors/400.html'), 400

def request_wants_json():
    """Check if the request prefers JSON response."""
    best = request.accept_mimetypes.best_match(['application/json', 'text/html'])
    return best == 'application/json' and \
        request.accept_mimetypes[best] > request.accept_mimetypes['text/html'] 