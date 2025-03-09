"""
Routes for the Standard and Quantum Physics section.
"""

from flask import render_template, jsonify, request
from . import quantum_bp
from ..models.oscillator import generate_oscillator_data
from ..models.maxwell_boltzmann import generate_maxwell_boltzmann_data
from ..models.electromagnetic import generate_electromagnetic_field

@quantum_bp.route('/')
def index():
    """Render the main quantum physics page."""
    return render_template('index.html')

@quantum_bp.route('/oscillator')
def oscillator():
    """Render the quantum harmonic oscillator page."""
    return render_template('oscillator.html')

@quantum_bp.route('/maxwell_boltzmann')
def maxwell_boltzmann():
    """Render the Maxwell-Boltzmann distribution page."""
    return render_template('maxwell_boltzmann.html')

@quantum_bp.route('/maxwell_equations')
def maxwell_equations():
    """Render the Maxwell's equations visualization page."""
    return render_template('maxwell_equations.html')

@quantum_bp.route('/manifold_mapping')
def manifold_mapping():
    """Render the manifold mapping page."""
    return render_template('manifold_mapping.html')

@quantum_bp.route('/generate_oscillator', methods=['POST'])
def generate_oscillator():
    """Generate quantum harmonic oscillator data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract parameters
        frequency = data.get('frequency', 1.0)
        damping_factor = data.get('damping_factor', 0.1)
        amplitude = data.get('amplitude', 1.0)
        time_range = data.get('time_range', 10.0)
        quantum_n = data.get('quantum_n', 0)  # Quantum number
        
        # Generate oscillator data
        results = generate_oscillator_data(
            frequency=frequency,
            damping_factor=damping_factor,
            amplitude=amplitude,
            time_range=time_range,
            quantum_n=quantum_n
        )
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@quantum_bp.route('/generate_maxwell_boltzmann', methods=['POST'])
def generate_maxwell_boltzmann():
    """Generate Maxwell-Boltzmann distribution data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract parameters
        temperature = data.get('temperature', 300.0)  # in Kelvin
        mass = data.get('mass', 1.0)  # in atomic mass units
        particle_count = data.get('particle_count', 1000)
        
        # Generate Maxwell-Boltzmann data
        results = generate_maxwell_boltzmann_data(
            temperature=temperature,
            mass=mass,
            particle_count=particle_count
        )
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@quantum_bp.route('/generate_electromagnetic_field', methods=['POST'])
def generate_electromagnetic_field():
    """Generate electromagnetic field visualization data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract parameters
        field_type = data.get('field_type', 'electric')  # 'electric', 'magnetic', or 'both'
        source_type = data.get('source_type', 'point_charge')
        grid_size = data.get('grid_size', 20)
        
        # Generate electromagnetic field data
        results = generate_electromagnetic_field(
            field_type=field_type,
            source_type=source_type,
            grid_size=grid_size
        )
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@quantum_bp.route('/map_manifold_to_particles', methods=['POST'])
def map_manifold_to_particles():
    """Map manifold features to particle properties."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract manifold data
        manifold_data = data.get('manifold_data', {})
        
        # Placeholder mapping logic (to be expanded with actual physics)
        # In a real implementation, this would involve complex calculations
        # based on the topological properties of the manifold
        
        # Example mapping for electron-like particle
        if manifold_data.get('manifold_type') == 'sub_skb':
            twist_sum = sum(abs(manifold_data.get(f'twist_{axis}', 0)) for axis in ['x', 'y', 'z'])
            
            if 2.0 <= twist_sum <= 3.0:
                return jsonify({
                    "particle": "electron-like",
                    "mass_prediction": 0.511,  # MeV/c²
                    "charge_prediction": -1,   # e
                    "spin_prediction": 0.5,    # ħ
                    "confidence": 0.85,
                    "topological_features": {
                        "twist_complexity": twist_sum,
                        "non_orientability": True,
                        "genus": 1
                    }
                })
            else:
                return jsonify({
                    "particle": "unknown",
                    "confidence": 0.2,
                    "suggestion": "Adjust twists to be between 2.0 and 3.0 for electron-like properties"
                })
        
        # For SKB (Klein bottle) manifold type
        elif manifold_data.get('manifold_type') == 'skb':
            loop_factor = manifold_data.get('loop_factor', 1.0)
            
            if loop_factor > 1.5:
                return jsonify({
                    "particle": "proton-like",
                    "mass_prediction": 938.27,  # MeV/c²
                    "charge_prediction": 1,     # e
                    "spin_prediction": 0.5,     # ħ
                    "confidence": 0.72,
                    "topological_features": {
                        "loop_complexity": loop_factor * 2 * 3.14159,
                        "non_orientability": True,
                        "genus": 2
                    }
                })
            else:
                return jsonify({
                    "particle": "unknown",
                    "confidence": 0.3,
                    "suggestion": "Increase loop factor above 1.5 for proton-like properties"
                })
                
        else:
            return jsonify({
                "particle": "unknown",
                "confidence": 0.1,
                "suggestion": "Try using sub-SKB or SKB manifold types"
            })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500 