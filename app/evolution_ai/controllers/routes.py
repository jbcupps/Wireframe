"""
Routes for the Evolution, Iterative, and AI/ML section.
"""

from flask import render_template, jsonify, request
from . import evolution_bp
from ..models.evolution import run_evolution_algorithm
from ..iterative.methodical_search import run_methodical_search, IterativeSearch
from ..ml.prediction import predict_particle_properties
import numpy as np

@evolution_bp.route('/')
def index():
    """Render the main evolution page."""
    return render_template('index.html')

@evolution_bp.route('/evolution')
def evolution():
    """Render the evolutionary algorithm page."""
    return render_template('evolution.html')

@evolution_bp.route('/iterative')
def iterative():
    """Render the methodical iterative search page."""
    return render_template('iterative.html')

@evolution_bp.route('/ai_ml')
def ai_ml():
    """Render the AI and Machine Learning page."""
    return render_template('ai_ml.html')

@evolution_bp.route('/run_evolution', methods=['POST'])
def run_evolution():
    """Run the evolutionary algorithm with provided parameters."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract parameters
        population_size = data.get('population_size', 20)
        generations = data.get('generations', 10)
        mutation_rate = data.get('mutation_rate', 0.1)
        initial_population = data.get('initial_population', [])
        fitness_criteria = data.get('fitness_criteria', {})
        
        # Run evolution algorithm
        results = run_evolution_algorithm(
            population_size=population_size,
            generations=generations,
            mutation_rate=mutation_rate,
            initial_population=initial_population,
            fitness_criteria=fitness_criteria
        )
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@evolution_bp.route('/methodical_search', methods=['POST'])
def methodical_search():
    """Run methodical search with provided parameters."""
    try:
        data = request.get_json()
        if not data:
            print("Error: No JSON data received in request")
            return jsonify({"error": "No data provided"}), 400
            
        # Extract parameters
        parameter_space = data.get('parameter_space', {})
        target_properties = data.get('target_properties', {})
        max_iterations = data.get('max_iterations', 100)
        tolerance = data.get('tolerance', 0.01)
        
        # Debug output
        print(f"Received parameter_space: {parameter_space}")
        print(f"Received target_properties: {target_properties}")
        
        if not parameter_space:
            return jsonify({"error": "Parameter space is empty"}), 400
            
        # Initialize search - convert parameters to Search objects
        parameters = []
        try:
            for param_name, param_config in parameter_space.items():
                # Validate parameter configuration
                if not isinstance(param_config, dict):
                    return jsonify({"error": f"Invalid parameter configuration for {param_name}"}), 400
                
                min_val = float(param_config.get('min', 0))
                max_val = float(param_config.get('max', 1))
                steps = int(param_config.get('steps', 10))
                
                # Validate steps to prevent excessive combinations
                if steps > 20:
                    steps = 20  # Limit maximum steps to prevent server overload
                
                parameters.append(Parameter(
                    name=param_name,
                    min_val=min_val,
                    max_val=max_val,
                    steps=steps
                ))
        except (ValueError, TypeError) as e:
            print(f"Error converting parameter values: {str(e)}")
            return jsonify({"error": f"Invalid parameter values: {str(e)}"}), 400
        
        search_space = SearchSpace(parameters)
        
        # Run the search with the specified parameters
        results = []
        iterations = []
        best_configuration = None
        best_error = float('inf')
        
        # Generate all parameter combinations
        try:
            param_combinations = search_space.get_all_combinations()
            print(f"Generated {len(param_combinations)} parameter combinations")
            
            # Check if too many combinations were generated
            if len(param_combinations) > 10000:
                return jsonify({"error": "Too many parameter combinations. Please reduce parameter steps."}), 400
        except Exception as e:
            print(f"Error generating parameter combinations: {str(e)}")
            return jsonify({"error": f"Failed to generate parameter combinations: {str(e)}"}), 500
        
        # Evaluate each combination
        for params in param_combinations:
            try:
                # Calculate error
                error = evaluate_configuration(params, target_properties)
                
                # Store result
                result = {
                    'parameters': params,
                    'error': error
                }
                results.append(result)
                
                # Check if this is the best configuration
                if error < best_error:
                    best_error = error
                    best_configuration = result
                    
            except Exception as e:
                # Log error but continue with other combinations
                print(f"Error evaluating configuration {params}: {str(e)}")
                continue
        
        if not results:
            return jsonify({"error": "No valid configurations found"}), 500
            
        # Sort results by error (best first)
        results.sort(key=lambda x: x['error'])
        
        # Generate visualization data for sub-SKBs
        for result in results[:20]:  # Only process top 20 for efficiency
            try:
                params = result['parameters']
                # Generate sub-SKB data for each result
                result['sub_skb_data'] = generate_sub_skb_data(params)
            except Exception as e:
                # If visualization data generation fails, add empty data but keep the result
                print(f"Error generating visualization data: {str(e)}")
                result['sub_skb_data'] = {'x': [], 'y': [], 'z': []}
        
        # Return the search results
        response_data = {
            'results': results[:20],  # Return top 20 results
            'best_configuration': best_configuration,
            'iterations': iterations,
            'parameter_space': {p.name: {'min': p.min_val, 'max': p.max_val, 'steps': p.steps} for p in parameters},
            'target_properties': target_properties,
            'total_configurations_evaluated': len(param_combinations)
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in methodical search: {str(e)}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e)}), 500

# Helper function to generate sub-SKB data for visualization
def generate_sub_skb_data(params):
    """Generate sub-SKB surface data for visualization.
    
    Args:
        params: Dictionary of parameters including twist_x, twist_y, twist_z, loop_factor
        
    Returns:
        Dictionary with x, y, z coordinate arrays for a sub-SKB surface
    """
    try:
        # Parameters for the sub-SKB - use safe defaults
        twist_x = float(params.get('twist_x', 0))
        twist_y = float(params.get('twist_y', 0))
        twist_z = float(params.get('twist_z', 0))
        loop_factor = float(params.get('loop_factor', 1.0))
        
        # Ensure reasonable values
        loop_factor = max(0.1, min(5.0, loop_factor))  # Limit to reasonable range
        
        # Generate u and v parameter grids (simplified for API response)
        u_points = 15  # Reduced from 20 for better performance
        v_points = 8   # Reduced from 10 for better performance
        
        try:
            u = np.linspace(0, 2 * np.pi * loop_factor, u_points)
            v = np.linspace(-0.5, 0.5, v_points)
            
            # Meshgrid for calculations
            u_grid, v_grid = np.meshgrid(u, v)
            
            # Calculate x, y, z coordinates using the twisted strip formula
            x = (1 + 0.5 * v_grid * np.cos(twist_x * u_grid / 2)) * np.cos(u_grid)
            y = (1 + 0.5 * v_grid * np.cos(twist_y * u_grid / 2)) * np.sin(u_grid)
            z = 0.5 * v_grid * np.sin(twist_z * u_grid / 2)
            
            # Convert to list format for JSON serialization
            return {
                'x': x.tolist(),
                'y': y.tolist(),
                'z': z.tolist()
            }
        except Exception as e:
            print(f"Error generating sub-SKB coordinate data: {str(e)}")
            # Return minimal empty data if calculation fails
            return {
                'x': [[0, 0], [0, 0]],
                'y': [[0, 0], [0, 0]],
                'z': [[0, 0], [0, 0]]
            }
    except Exception as e:
        print(f"Error in generate_sub_skb_data: {str(e)}")
        # Return minimal empty data if anything fails
        return {
            'x': [[0, 0], [0, 0]],
            'y': [[0, 0], [0, 0]],
            'z': [[0, 0], [0, 0]]
        }

@evolution_bp.route('/predict_properties', methods=['POST'])
def predict_properties():
    """Predict particle properties from provided topology."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract manifold features
        manifold_features = data.get('manifold_features', {})
        
        # Execute prediction
        predictions = predict_particle_properties(manifold_features)
        
        return jsonify(predictions)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@evolution_bp.route('/generate_hypothesis', methods=['POST'])
def generate_hypothesis():
    """Generate hypotheses using LLMs based on topological data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # This would integrate with an LLM API
        # For now, return placeholder data
        return jsonify({
            "hypotheses": [
                "A sub-SKB with 3 twists may represent an electron-like particle.",
                "Nested SKBs with orthogonal twists may model hadron formation.",
                "Higher genus manifolds correlate with greater mass."
            ],
            "confidence_scores": [0.85, 0.72, 0.63]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@evolution_bp.route('/iterative_search', methods=['POST'])
def iterative_search():
    """Run iterative search with theoretical targets based on particle physics."""
    try:
        data = request.get_json()
        if not data:
            print("Error: No JSON data received in request")
            return jsonify({"error": "No data provided"}), 400
            
        # Extract parameters
        parameter_space = data.get('parameter_space', {})
        target_type = data.get('target_type', 'all')  # 'quark', 'lepton', 'baryon', or 'all'
        max_targets = int(data.get('max_targets', 5))
        optimize_each = data.get('optimize_each', False)
        
        # Debug output
        print(f"Received parameter_space: {parameter_space}")
        print(f"Target type: {target_type}, Max targets: {max_targets}")
        
        if not parameter_space:
            return jsonify({"error": "Parameter space is empty"}), 400
            
        # Create and run the iterative search
        try:
            iterative_searcher = IterativeSearch()
            results = iterative_searcher.run_iterative_search(
                parameter_space=parameter_space,
                target_type=target_type,
                max_targets=max_targets,
                optimize_each=optimize_each
            )
            
            # Generate visualization data for the best configurations
            for result_item in results['results']:
                if 'best_configuration' in result_item and result_item['best_configuration']:
                    best_config = result_item['best_configuration']
                    params = best_config['parameters']
                    
                    try:
                        # Generate sub-SKB data for visualization
                        best_config['sub_skb_data'] = generate_sub_skb_data(params)
                    except Exception as e:
                        print(f"Error generating visualization data: {str(e)}")
                        best_config['sub_skb_data'] = {'x': [], 'y': [], 'z': []}
            
            return jsonify(results)
            
        except Exception as e:
            import traceback
            print(f"Error in iterative search: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": f"Iterative search failed: {str(e)}"}), 500
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in iterative search endpoint: {str(e)}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e)}), 500 