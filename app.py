"""
4D Manifold Explorer Application
This application serves interactive visualizations and API endpoints for exploring higher-dimensional topological manifolds.
Improvements include better error handling, type hints, and structured logging.
"""

from flask import Flask, render_template, jsonify, request, redirect, url_for
import plotly.graph_objects as go
import numpy as np
import traceback
import logging
from methodical_search import get_all_particles, get_particle_data, generate_parameter_space, run_search, SearchParameters
from typing import Dict, Tuple, Union, Any, Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Function to generate data for a twisted strip (sub-SKB) with multi-dimensional twists, time, and loops
def generate_twisted_strip(twists: Tuple[float, float, float], t: float, loop_factor: float) -> go.Surface:
    """Generate a twisted strip (sub-SKB) with multi-dimensional twists, time, and loops."""
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(-0.5, 0.5, 10)
    u, v = np.meshgrid(u, v)
    kx, ky, kz = twists  # Twist components

    # Apply multi-dimensional twists and time evolution
    x = (1 + 0.5 * v * np.cos(kx * (u + t) / 2)) * np.cos(u)
    y = (1 + 0.5 * v * np.cos(ky * (u + t) / 2)) * np.sin(u)
    z = 0.5 * v * np.sin(kz * (u + t) / 2)

    return go.Surface(x=x, y=y, z=z, colorscale='Viridis', opacity=0.7, showscale=False)

# Function to generate data for a Klein bottle (stable SKB) with time and loops
def generate_klein_bottle(twists: Tuple[float, float, float], t: float, loop_factor: float) -> go.Surface:
    """Generate a Klein bottle (stable SKB) with time and loops."""
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    kx, ky, kz = twists  # Twist components

    a, b = 2.0, 1.0  # Parameters for size

    # Apply multi-dimensional twists and time evolution
    x = (a + b * np.cos(v)) * np.cos(u + kx * t / 5)
    y = (a + b * np.cos(v)) * np.sin(u + ky * t / 5)
    z = b * np.sin(v) * np.cos((u + kz * t / 5) / 2)  # Simplified immersion

    return go.Surface(x=x, y=y, z=z, colorscale='RdBu', opacity=0.7, showscale=False)

# Function to generate data for a torus with time and loops
def generate_torus(twists: Tuple[float, float, float], t: float, loop_factor: float) -> go.Surface:
    """Generate a torus with time and loops."""
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    kx, ky, kz = twists

    # Major and minor radii
    R, r = 2.0, 0.8

    # Apply multi-dimensional twists and time evolution
    x = (R + r * np.cos(v)) * np.cos(u + kx * t / 5)
    y = (R + r * np.cos(v)) * np.sin(u + ky * t / 5)
    z = r * np.sin(v + kz * t / 5)

    return go.Surface(x=x, y=y, z=z, colorscale='Portland', opacity=0.7, showscale=False)

# Function to generate data for a 4D torus with time and loops
def generate_4d_torus(params: Dict[str, float], t: float, loop_factor: float) -> go.Surface:
    """Generate a 4D torus with time and loops."""
    u = np.linspace(0, 2 * np.pi * loop_factor, 20)
    v = np.linspace(0, 2 * np.pi, 20)
    w = np.linspace(0, 2 * np.pi, 20)
    u, v, w = np.meshgrid(u, v, w)

    # Parameters for the 4D torus
    R1 = params.get('R1', 2.0)
    R2 = params.get('R2', 1.0)
    R3 = params.get('R3', 0.5)
    R4 = params.get('R4', 0.2)

    # Apply time evolution
    x = (R1 + R2 * np.cos(v)) * np.cos(u + params.get('twist_x', 0) * t / 5)
    y = (R1 + R2 * np.cos(v)) * np.sin(u + params.get('twist_y', 0) * t / 5)
    z = (R3 + R4 * np.cos(w)) * np.cos(v + params.get('twist_z', 0) * t / 5)
    c = (R3 + R4 * np.cos(w)) * np.sin(v + params.get('twist_t', 0) * t / 5)

    return go.Surface(x=x, y=y, z=z, surfacecolor=c, colorscale='Hot', opacity=0.7, showscale=False)

# Function to generate data for a projective plane with time and loops
def generate_projective_plane(params: Dict[str, float], t: float, loop_factor: float) -> go.Surface:
    """Generate a projective plane with time and loops."""
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(-np.pi / 2, np.pi / 2, 50)
    u, v = np.meshgrid(u, v)

    # Parameters for the projective plane
    a = params.get('a', 1.0)  # Scale

    # Apply time evolution
    x = a * np.cos(u + params.get('twist_x', 0) * t / 5) * np.cos(v)
    y = a * np.sin(u + params.get('twist_y', 0) * t / 5) * np.cos(v)
    z = a * np.sin(v)

    return go.Surface(x=x, y=y, z=z, colorscale='Electric', opacity=0.7, showscale=False)

# Function to calculate topological invariants (simplified for demonstration)
def calculate_topological_invariants(manifold_type: str, params: Optional[Dict[str, float]] = None) -> Dict[str, Union[int, str]]:
    """Calculate topological invariants (simplified for demonstration)."""
    try:
        if manifold_type == "twisted_strip":
            return {"Euler Characteristic": 0, "Genus": "Non-orientable"}
        elif manifold_type == "klein_bottle":
            return {"Euler Characteristic": 0, "Genus": "Non-orientable"}
        elif manifold_type == "torus":
            return {"Euler Characteristic": 0, "Genus": 1}
        elif manifold_type == "4d_torus":
            return {"Euler Characteristic": 0, "Genus": "Higher-dimensional"}
        elif manifold_type == "projective_plane":
            return {"Euler Characteristic": 1, "Genus": "Non-orientable"}
        else:
            return {"Error": "Unknown manifold type"}
    except Exception as e:
        logger.error(f"Error calculating invariants: {e}")
        return {"Error": str(e)}

# Function to calculate the linking number between two SKBs
def calculate_linking_number(skb1_params: Dict[str, float], skb2_params: Dict[str, float]) -> int:
    """Calculate the linking number between two SKBs (simplified)."""
    # In a real application, this would involve a more complex calculation
    # based on the parameters of the two SKBs.  This is a placeholder.
    try:
        # Example:  Linking number based on difference in twist parameters
        twist_diff_x = abs(skb1_params.get('twist_x', 0) - skb2_params.get('twist_x', 0))
        twist_diff_y = abs(skb1_params.get('twist_y', 0) - skb2_params.get('twist_y', 0))
        twist_diff_z = abs(skb1_params.get('twist_z', 0) - skb2_params.get('twist_z', 0))

        linking_number = int(twist_diff_x + twist_diff_y + twist_diff_z) % 5  # Example calculation
        return linking_number
    except Exception as e:
        logger.error(f"Error calculating linking number: {e}")
        return 0  # Return 0 in case of error


# Function to validate hadron formation based on SKB parameters
def validate_hadron_formation(params: Dict[str, float]) -> Dict[str, Union[bool, str]]:
    """Validate hadron formation based on SKB parameters (simplified)."""
    try:
        # Placeholder for a more complex validation logic
        # This example checks if the sum of twist parameters is within a certain range
        total_twist = abs(params.get('twist_x', 0)) + abs(params.get('twist_y', 0)) + abs(params.get('twist_z', 0))
        if 2 <= total_twist <= 5:
            return {"valid": True, "message": "Hadron formation likely"}
        else:
            return {"valid": False, "message": "Hadron formation unlikely"}
    except Exception as e:
        logger.error(f"Error validating hadron formation: {e}")
        return {"valid": False, "message": "Error during validation"}


# --- Flask Routes ---

@app.route('/')
def landing() -> str:
    """Landing page route."""
    return render_template('index.html')

@app.route('/visualization')
def visualization_route() -> str:
    """Visualization page route."""
    return render_template('visualization.html')

@app.route('/evolution')
def evolution_route() -> str:
    """Evolution page route."""
    return render_template('evolution.html')

@app.route('/oscillator')
def oscillator_route() -> str:
    """Oscillator page route."""
    return render_template('oscillator.html')

@app.route('/maxwell')
def maxwell_route() -> str:
    """Maxwell page route."""
    return render_template('maxwell.html')

@app.route('/maxwells')
def maxwells_route() -> str:
    """Maxwells page route."""
    return render_template('maxwells.html')

@app.route('/compute_evolution', methods=['POST'])
def compute_evolution() -> jsonify:
    """ Compute the evolution of SKBs with validated input and error handling. """
    try:
        data = request.get_json()
        logger.info(f"Received data for evolution: {data}")
        if not isinstance(data, list):
            raise TypeError("Input must be a list of SKB parameters.")
        if not all(isinstance(skb, dict) for skb in data):
            raise TypeError("Each SKB must be a dictionary of parameters.")
        if len(data) > 10:
            return jsonify({"error": "Too many SKBs. Maximum is 10."}), 400

        results = []
        for skb_params in data:
            if not all(isinstance(value, (int, float)) for value in skb_params.values()):
                raise ValueError("SKB parameters must be numeric.")
            skb_params['twist_x'] = (skb_params.get('twist_x', 0) + 0.1) % 5
            skb_params['twist_y'] = (skb_params.get('twist_y', 0) + 0.2) % 5
            skb_params['twist_z'] = (skb_params.get('twist_z', 0) - 0.1) % 5
            results.append(skb_params)

        return jsonify(results)
    except (TypeError, ValueError) as e:
        logger.error(f"Input validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error in compute_evolution: {traceback.format_exc()}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/compute_topological_compatibility', methods=['POST'])
def compute_topological_compatibility_route(skb1: Optional[Dict[str, float]] = None, skb2: Optional[Dict[str, float]] = None) -> jsonify:
    """Compute topological compatibility between two SKBs."""
    try:
        # If called via POST request, get data from request
        if request.method == 'POST':
            data = request.get_json()
            logger.info(f"Received data for compatibility: {data}")

            if not isinstance(data, dict):
                raise TypeError("Input must be a dictionary.")

            skb1 = data.get('skb1')
            skb2 = data.get('skb2')

        # Validate input
        if not isinstance(skb1, dict) or not isinstance(skb2, dict):
            raise TypeError("Both SKBs must be dictionaries of parameters.")
        if not all(isinstance(value, (int, float)) for value in skb1.values()):
            raise ValueError("SKB1 parameters must be numeric.")
        if not all(isinstance(value, (int, float)) for value in skb2.values()):
            raise ValueError("SKB2 parameters must be numeric.")

        # Calculate linking number (replace with your actual calculation)
        linking_number = calculate_linking_number(skb1, skb2)

        # Determine compatibility based on linking number (simplified example)
        if linking_number % 2 == 0:
            compatibility = "Compatible"
        else:
            compatibility = "Incompatible"

        return jsonify({"linking_number": linking_number, "compatibility": compatibility})

    except (TypeError, ValueError) as e:
        logger.error(f"Input validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error in compute_topological_compatibility: {traceback.format_exc()}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/get_visualization', methods=['POST'])
def get_visualization() -> jsonify:
    """Generate visualization data based on parameters."""
    try:
        params = request.get_json()
        logger.info(f"Received parameters for visualization: {params}")

        # Validate input
        if not isinstance(params, dict):
            raise TypeError("Parameters must be a dictionary.")

        # Extract parameters and provide defaults
        manifold_type = params.get('manifold_type', 'twisted_strip')
        loop_factor = float(params.get('loop_factor', 1))
        time_value = float(params.get('time', 0))

        # Validate numeric parameters
        if not all(isinstance(value, (int, float)) for value in [loop_factor, time_value]):
            raise ValueError("Loop factor and time must be numeric.")

        # Limit loop factor to prevent excessive computation/rendering
        if not 1 <= loop_factor <= 5:
            return jsonify({"error": "Loop factor must be between 1 and 5."}), 400

        # Generate the appropriate 3D object based on 'manifold_type'
        if manifold_type == "twisted_strip":
            twists = (float(params.get('twist_x', 0)),
                      float(params.get('twist_y', 0)),
                      float(params.get('twist_z', 0)))
            data = [generate_twisted_strip(twists, time_value, loop_factor)]
        elif manifold_type == "klein_bottle":
            twists = (float(params.get('twist_x', 0)),
                      float(params.get('twist_y', 0)),
                      float(params.get('twist_z', 0)))
            data = [generate_klein_bottle(twists, time_value, loop_factor)]
        elif manifold_type == "torus":
            twists = (float(params.get('twist_x', 0)),
                      float(params.get('twist_y', 0)),
                      float(params.get('twist_z', 0)))
            data = [generate_torus(twists, time_value, loop_factor)]
        elif manifold_type == "4d_torus":
            data = [generate_4d_torus(params, time_value, loop_factor)]
        elif manifold_type == "projective_plane":
            data = [generate_projective_plane(params, time_value, loop_factor)]
        else:
            return jsonify({"error": "Invalid manifold type."}), 400

        # Create the Plotly figure
        fig = go.Figure(data=data)
        fig.update_layout(
            margin=dict(l=0, r=0, b=0, t=0),
            scene=dict(
                xaxis=dict(range=[-3, 3], title='X'),
                yaxis=dict(range=[-3, 3], title='Y'),
                zaxis=dict(range=[-3, 3], title='Z'),
            ),
            showlegend=False
        )
        return jsonify(fig.to_json())

    except (TypeError, ValueError) as e:
        logger.error(f"Input validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error in get_visualization: {traceback.format_exc()}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/get_topological_invariants', methods=['POST'])
def get_topological_invariants_route() -> jsonify:
    """Calculate and return topological invariants."""
    try:
        data = request.get_json()
        logger.info(f"Received data for invariants: {data}")

        # Validate input
        if not isinstance(data, dict):
            raise TypeError("Input must be a dictionary.")

        manifold_type = data.get('manifold_type')
        if not isinstance(manifold_type, str):
            raise TypeError("Manifold type must be a string.")

        params = data.get('parameters')  # Optional parameters
        if params is not None and not isinstance(params, dict):
            raise TypeError("Parameters must be a dictionary if provided.")

        invariants = calculate_topological_invariants(manifold_type, params)
        return jsonify(invariants)

    except (TypeError, ValueError) as e:
        logger.error(f"Input validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error in get_topological_invariants: {traceback.format_exc()}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/validate_hadron', methods=['POST'])
def validate_hadron_route() -> jsonify:
    """Validate hadron formation based on SKB parameters."""
    try:
        params = request.get_json()
        logger.info(f"Received parameters for hadron validation: {params}")

        # Validate input
        if not isinstance(params, dict):
            raise TypeError("Parameters must be a dictionary.")
        if not all(isinstance(value, (int, float)) for value in params.values()):
            raise ValueError("All parameters must be numeric.")

        result = validate_hadron_formation(params)
        return jsonify(result)

    except (TypeError, ValueError) as e:
        logger.error(f"Input validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error in validate_hadron: {traceback.format_exc()}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/get_education_content', methods=['GET'])
def get_education_content_route() -> jsonify:
    """Retrieve educational content based on a key."""
    try:
        content_key = request.args.get('key')
        logger.info(f"Received request for educational content: {content_key}")

        # Validate input
        if not isinstance(content_key, str):
            raise TypeError("Content key must be a string.")

        # In a real application, you would fetch this content from a database or file
        # This is a placeholder for demonstration purposes
        content_map = {
            "intro": "Welcome to the 4D Manifold Explorer!",
            "skb": "SKBs are mathematical models...",
            "visualization": "This interactive tool allows you to visualize...",
        }

        content = content_map.get(content_key, "Content not found.")
        return jsonify({"content": content})

    except (TypeError, ValueError) as e:
        logger.error(f"Input validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error in get_education_content: {traceback.format_exc()}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/methodical-search')
def methodical_search_page() -> str:
    """Methodical Search page route."""
    return render_template('methodical_search.html')

@app.route('/api/particle/<particle_name>')
def get_particle(particle_name: str) -> jsonify:
    """API endpoint to get data for a specific particle."""
    try:
        particle_data = get_particle_data(particle_name)
        if particle_data:
            return jsonify(particle_data)
        else:
            return jsonify({'error': 'Particle not found'}), 404
    except Exception as e:
        logger.error(f"Error fetching particle {particle_name}: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/api/particle/all')
def get_all_particles_route() -> jsonify:
    """API endpoint to get data for all particles."""
    try:
        all_particles = get_all_particles()
        return jsonify(all_particles)
    except Exception as e:
        logger.error(f"Error fetching all particles: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/api/generate-parameters', methods=['POST'])
def generate_params() -> jsonify:
    """API endpoint to generate the parameter space for the search."""
    try:
        data = request.get_json()
        search_params = SearchParameters.from_dict(data)
        parameter_space = generate_parameter_space(search_params)
        return jsonify(parameter_space)
    except Exception as e:
        logger.error(f"Error generating parameter space: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/api/run-search', methods=['POST'])
def search_manifold() -> jsonify:
    """API endpoint to run the methodical search."""
    try:
        data = request.get_json()
        particle_name = data.get('particleName')
        search_params_data = data.get('parameters')
        metric = data.get('metric', 'relative')  # Default to 'relative'

        if not particle_name or not search_params_data:
            return jsonify({'error': 'Missing particleName or parameters'}), 400

        search_params = SearchParameters.from_dict(search_params_data)
        results = run_search(particle_name, search_params, metric)
        return jsonify(results)

    except Exception as e:
        logger.error(f"Error running search: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

if __name__ == '__main__':
    app.run(debug=False)  #  Run in production mode