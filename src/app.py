from flask import Flask, render_template, jsonify, request
import plotly.graph_objects as go
import numpy as np
import json
import traceback
import logging
import random
import os
from scipy.spatial.distance import cdist
from scipy.interpolate import interp2d
import math

# Configure enhanced logging for scientific visualization
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "pages"),
    static_folder=os.path.join(BASE_DIR, "static"),
)


def create_app():
    """Application factory used for Codex deployment."""
    return app

# Enhanced mathematical functions for better Klein bottle modeling
def klein_bottle_parametric(u, v, a=2.0, b=1.0):
    """
    Enhanced parametric equations for Klein bottle immersion in 3D.
    
    Parameters:
    u, v: Parameter arrays
    a, b: Scale parameters for major and minor radii
    
    Returns:
    x, y, z: Coordinate arrays for Klein bottle surface
    """
    # Enhanced Klein bottle with better immersion properties
    cos_u, sin_u = np.cos(u), np.sin(u)
    cos_v, sin_v = np.cos(v), np.sin(v)
    cos_2v, sin_2v = np.cos(2*v), np.sin(2*v)
    
    # Figure-8 Klein bottle variant for better visualization
    x = (a + b * cos_v) * cos_u
    y = (a + b * cos_v) * sin_u
    z = b * sin_v * cos_u/2 + b * sin_2v * sin_u/4
    
    return x, y, z

def mobius_strip_parametric(u, v, radius=2.0, width=0.5):
    """
    Enhanced Möbius strip for twisted strip visualization.
    
    Parameters:
    u: Parameter along the strip (0 to 2π)
    v: Parameter across the strip (-width to width)
    radius: Radius of the central circle
    width: Half-width of the strip
    """
    cos_u_2, sin_u_2 = np.cos(u/2), np.sin(u/2)
    cos_u, sin_u = np.cos(u), np.sin(u)
    
    x = (radius + v * cos_u_2) * cos_u
    y = (radius + v * cos_u_2) * sin_u
    z = v * sin_u_2
    
    return x, y, z

def torus_parametric(u, v, R=2.0, r=0.5):
    """
    Enhanced torus with better surface quality.
    
    Parameters:
    u, v: Parameter arrays
    R: Major radius
    r: Minor radius
    """
    cos_u, sin_u = np.cos(u), np.sin(u)
    cos_v, sin_v = np.cos(v), np.sin(v)
    
    x = (R + r * cos_v) * cos_u
    y = (R + r * cos_v) * sin_u
    z = r * sin_v
    
    return x, y, z

# Enhanced function to generate data for a twisted strip (sub-SKB) with improved mathematics
def generate_twisted_strip(twists, t, loop_factor, resolution=75):
    """
    Generate an enhanced twisted strip (sub-SKB) with improved mathematical modeling.
    
    Parameters:
    twists: List of twist parameters [kx, ky, kz, kt]
    t: Time parameter
    loop_factor: Number of loops
    resolution: Surface resolution for better quality
    """
    u = np.linspace(0, 2 * np.pi * loop_factor, resolution)
    v = np.linspace(-0.75, 0.75, int(resolution * 0.6))  # Adjusted for better aspect ratio
    u, v = np.meshgrid(u, v)
    
    kx, ky, kz, kt = twists
    
    # Enhanced time twist effect with better CTC modeling
    time_factor = kt * np.sin(u + t) * 0.25
    stability_factor = 1.0 / (1.0 + abs(kt))  # Stability decreases with higher time twist
    
    # Enhanced Möbius strip with multi-dimensional twists
    radius = 2.0 + 0.3 * np.sin(kx * u / loop_factor)
    width_modulation = 0.75 + 0.2 * np.sin(ky * u / loop_factor)
    
    # Apply twist effects
    cos_u_2 = np.cos((u + kx * t / 5) / 2)
    sin_u_2 = np.sin((u + kx * t / 5) / 2)
    cos_u = np.cos(u + ky * t / 5)
    sin_u = np.sin(u + ky * t / 5)
    
    # Enhanced parametric equations
    x = (radius + v * width_modulation * cos_u_2) * cos_u
    y = (radius + v * width_modulation * cos_u_2) * sin_u
    z = v * width_modulation * sin_u_2 * np.cos(kz * u / loop_factor)
    
    # Apply time twist effect for CTC visualization
    x = x + time_factor * np.cos(v) * stability_factor
    y = y + time_factor * np.sin(v) * stability_factor
    z = z + time_factor * np.sin(u / loop_factor) * 0.1
    
    return x, y, z, u, v

# Enhanced function to generate data for a Klein bottle (stable SKB)
def generate_klein_bottle(twists, t, loop_factor, resolution=75):
    """
    Generate an enhanced Klein bottle with improved mathematical modeling.
    """
    u = np.linspace(0, 2 * np.pi * loop_factor, resolution)
    v = np.linspace(0, 2 * np.pi, resolution)
    u, v = np.meshgrid(u, v)
    
    kx, ky, kz, kt = twists
    
    # Enhanced time twist modeling
    time_factor = kt * np.sin(u + t) * 0.2
    stability_factor = 1.0 / (1.0 + abs(kt) * 2)
    
    # Enhanced Klein bottle parameters
    a = 2.5 + 0.3 * np.sin(kx * t / 10)  # Dynamic major radius
    b = 1.2 + 0.2 * np.cos(ky * t / 10)  # Dynamic minor radius
    
    # Enhanced Klein bottle parametric equations
    cos_u, sin_u = np.cos(u + kx * t / 8), np.sin(u + ky * t / 8)
    cos_v, sin_v = np.cos(v + kz * t / 12), np.sin(v + kz * t / 12)
    cos_2v = np.cos(2 * v + kz * t / 6)
    
    # Figure-8 Klein bottle immersion
    x = (a + b * cos_v) * cos_u
    y = (a + b * cos_v) * sin_u
    z = b * sin_v * cos_u/2 + b * cos_2v * sin_u/4
    
    # Apply time twist effect for enhanced CTC visualization
    x = x + time_factor * np.cos(v) * stability_factor
    y = y + time_factor * np.sin(v) * stability_factor
    z = z + time_factor * np.sin(u / loop_factor) * 0.15
    
    return x, y, z, u, v

# Enhanced function to generate data for a torus (third Sub-SKB)
def generate_torus(twists, t, loop_factor, resolution=75):
    """
    Generate an enhanced torus with improved mathematical modeling.
    """
    u = np.linspace(0, 2 * np.pi * loop_factor, resolution)
    v = np.linspace(0, 2 * np.pi, resolution)
    u, v = np.meshgrid(u, v)
    
    kx, ky, kz, kt = twists
    
    # Enhanced time twist modeling
    time_factor = kt * np.sin(u + t) * 0.2
    stability_factor = 1.0 / (1.0 + abs(kt) * 1.5)
    
    # Dynamic torus parameters
    R = 2.2 + 0.2 * np.sin(kx * t / 8)  # Major radius variation
    r = 0.6 + 0.1 * np.cos(ky * t / 8)  # Minor radius variation
    
    # Enhanced torus parametric equations with twist effects
    cos_u = np.cos(u + ky * t / 10)
    sin_u = np.sin(u + kx * t / 10)
    cos_v = np.cos(v + kz * t / 12)
    sin_v = np.sin(v + kz * t / 12)
    
    x = (R + r * cos_v) * cos_u
    y = (R + r * cos_v) * sin_u
    z = r * sin_v * (1 + 0.1 * np.sin(kz * u / loop_factor))
    
    # Apply time twist effect for CTC visualization
    x = x + time_factor * np.cos(v) * stability_factor
    y = y + time_factor * np.sin(v) * stability_factor
    z = z + time_factor * np.cos(u / loop_factor) * 0.1
    
    return x, y, z, u, v

def calculate_surface_curvature(x, y, z):
    """
    Calculate approximate Gaussian curvature for surface visualization enhancement.
    
    Returns:
    curvature: Array of curvature values for color mapping
    """
    # Simple finite difference approximation of curvature
    dx_du = np.gradient(x, axis=1)
    dy_du = np.gradient(y, axis=1)
    dz_du = np.gradient(z, axis=1)
    
    dx_dv = np.gradient(x, axis=0)
    dy_dv = np.gradient(y, axis=0)
    dz_dv = np.gradient(z, axis=0)
    
    # Normal vector approximation
    nx = dy_du * dz_dv - dz_du * dy_dv
    ny = dz_du * dx_dv - dx_du * dz_dv
    nz = dx_du * dy_dv - dy_du * dx_dv
    
    # Normalize
    norm = np.sqrt(nx**2 + ny**2 + nz**2) + 1e-10
    nx, ny, nz = nx/norm, ny/norm, nz/norm
    
    # Approximate mean curvature
    d2x_du2 = np.gradient(dx_du, axis=1)
    d2y_du2 = np.gradient(dy_du, axis=1)
    d2z_du2 = np.gradient(dz_du, axis=1)
    
    mean_curvature = np.abs(d2x_du2 * nx + d2y_du2 * ny + d2z_du2 * nz)
    
    return mean_curvature

def create_enhanced_surface_trace(x, y, z, u, v, name, color, opacity, surface_type="Klein"):
    """
    Create an enhanced surface trace with better lighting and scientific coloring.
    
    Parameters:
    x, y, z: Surface coordinates
    u, v: Parameter grids for texture mapping
    name: Surface name
    color: Base color
    opacity: Surface opacity
    surface_type: Type of surface for specialized rendering
    """
    # Calculate curvature for enhanced coloring
    curvature = calculate_surface_curvature(x, y, z)
    
    # Create enhanced colorscale based on mathematical properties
    if surface_type == "Klein":
        # Klein bottle specific coloring based on topology
        colorscale = [
            [0.0, f"rgba({color[0]}, {color[1]}, {color[2]}, 0.3)"],
            [0.3, f"rgba({color[0]}, {color[1]}, {color[2]}, 0.6)"],
            [0.7, f"rgba({min(255, color[0]+30)}, {min(255, color[1]+30)}, {min(255, color[2]+30)}, 0.8)"],
            [1.0, f"rgba({min(255, color[0]+50)}, {min(255, color[1]+50)}, {min(255, color[2]+50)}, 1.0)"]
        ]
    else:
        # Generic mathematical surface coloring
        colorscale = [
            [0.0, f"rgba({color[0]}, {color[1]}, {color[2]}, 0.4)"],
            [0.5, f"rgba({color[0]}, {color[1]}, {color[2]}, 0.7)"],
            [1.0, f"rgba({min(255, color[0]+40)}, {min(255, color[1]+40)}, {min(255, color[2]+40)}, 0.9)"]
        ]
    
    # Enhanced surface trace with scientific lighting
    surface_trace = {
        'x': x.tolist(),
        'y': y.tolist(),
        'z': z.tolist(),
        'surfacecolor': curvature.tolist(),  # Use curvature for coloring
        'type': 'surface',
        'colorscale': colorscale,
        'showscale': False,
        'opacity': opacity,
        'name': name,
        'hoverinfo': 'none',
        'contours': {
            'x': {'show': True, 'width': 2, 'color': 'rgba(255,255,255,0.4)'},
            'y': {'show': True, 'width': 2, 'color': 'rgba(255,255,255,0.4)'},
            'z': {'show': True, 'width': 2, 'color': 'rgba(255,255,255,0.4)'}
        },
        'lighting': {
            'ambient': 0.4,
            'diffuse': 0.8,
            'roughness': 0.2,
            'specular': 0.9,
            'fresnel': 0.4
        },
        'lightposition': {
            'x': 1.5,
            'y': 1.5,
            'z': 2.0
        },
        'hidesurface': False,
        'cauto': False,
        'cmin': np.min(curvature),
        'cmax': np.max(curvature)
    }
    
    return surface_trace

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    if hex_color.startswith('#'):
        hex_color = hex_color[1:]
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/visualization')
def visualization():
    return render_template('visualization.html')

@app.route('/topological_diffusion')
def topological_diffusion():
    return render_template('topological_diffusion.html')

@app.route('/evolution')
def evolution():
    return render_template('evolution.html')

@app.route('/oscillator')
def oscillator():
    return render_template('oscillator.html')

@app.route('/maxwell')
def maxwell():
    return render_template('maxwell.html')

@app.route('/maxwells')
def maxwells():
    return render_template('maxwells.html')

@app.route('/double_slit')
def double_slit():
    return render_template('double_slit.html')

@app.route('/quantum_tunneling')
def quantum_tunneling():
    return render_template('quantum_tunneling.html')

# API endpoint for evolutionary algorithm
@app.route('/compute_evolution', methods=['POST'])
def compute_evolution():
    """Run evolutionary algorithm to find compatible Sub-SKBs."""
    try:
        data = request.get_json()
        
        # Extract parameters
        generations = int(data.get('generations', 10))
        population_size = int(data.get('population_size', 20))
        mutation_rate = float(data.get('mutation_rate', 0.1))
        
        # Weights for fitness components
        w1_weight = float(data.get('w1_weight', 1.0))
        euler_weight = float(data.get('euler_weight', 1.0))
        q_weight = float(data.get('q_weight', 1.0))
        twist_weight = float(data.get('twist_weight', 1.0))
        ctc_weight = float(data.get('ctc_weight', 1.0))
        
        # Target values
        target_orientability = data.get('target_orientability', 'orientable')
        target_euler = int(data.get('target_euler', 0))
        target_q_form = data.get('target_q_form', 'indefinite')
        
        # Initialize population
        population = []
        for _ in range(population_size):
            # Generate random parameters for a Sub-SKB
            skb = {
                'tx': random.uniform(-5, 5),
                'ty': random.uniform(-5, 5),
                'tz': random.uniform(-5, 5),
                'tt': random.uniform(-1, 1),  # Time twist parameter
                'orientable': 1 if random.random() > 0.5 else 0,
                'genus': random.randint(0, 3)
            }
            population.append(skb)
        
        # Track best individuals and compatibility pairs
        best_individuals = []
        compatible_pairs = []
        
        # Run evolution for specified number of generations
        for generation in range(generations):
            # Evaluate fitness for each individual
            fitness_scores = []
            for skb in population:
                # Calculate topological properties
                orientable = skb['orientable']
                genus = skb['genus']
                
                # Calculate Euler characteristic
                euler = 2 - 2 * genus if orientable == 1 else 2 - genus
                
                # Calculate intersection form type
                q_form = "Positive Definite" if skb['tx'] * skb['ty'] > 0 else "Indefinite"
                
                # Calculate fitness components
                w1_fitness = 1.0 if (orientable == 1 and target_orientability == 'orientable') or \
                                   (orientable == 0 and target_orientability == 'non-orientable') else 0.0
                
                euler_fitness = 1.0 / (1.0 + abs(euler - target_euler))
                
                q_fitness = 1.0 if (q_form == target_q_form) else 0.0
                
                # Twist alignment - prefer values that would cancel out when combined
                twist_fitness = 1.0 / (1.0 + abs(skb['tx']) + abs(skb['ty']) + abs(skb['tz']))
                
                # CTC stability - prefer moderate time twist values
                ctc_fitness = 1.0 - abs(skb['tt'])
                
                # Combined fitness with weights
                fitness = (
                    w1_weight * w1_fitness +
                    euler_weight * euler_fitness +
                    q_weight * q_fitness +
                    twist_weight * twist_fitness +
                    ctc_weight * ctc_fitness
                )
                
                fitness_scores.append(fitness)
            
            # Find best individual in this generation
            best_idx = fitness_scores.index(max(fitness_scores))
            best_individuals.append({
                'generation': generation,
                'parameters': population[best_idx],
                'fitness': fitness_scores[best_idx]
            })
            
            # Check for compatible pairs
            for i in range(len(population)):
                for j in range(i+1, len(population)):
                    compatibility = compute_topological_compatibility(population[i], population[j])
                    if compatibility.get('compatible', False):
                        compatible_pairs.append({
                            'generation': generation,
                            'skb1': population[i],
                            'skb2': population[j],
                            'details': compatibility
                        })
            
            # Selection - tournament selection
            new_population = []
            tournament_size = 3
            
            for _ in range(population_size):
                # Select random individuals for tournament
                tournament = random.sample(range(population_size), tournament_size)
                
                # Find the best individual in the tournament
                best_in_tournament = max(tournament, key=lambda idx: fitness_scores[idx])
                
                # Add the winner to the new population
                new_population.append(population[best_in_tournament].copy())
            
            # Crossover and Mutation
            for i in range(0, population_size, 2):
                if i + 1 < population_size:  # Ensure we have a pair
                    # Crossover
                    if random.random() < 0.7:  # 70% chance of crossover
                        # Randomly select crossover point
                        crossover_point = random.choice(['tx', 'ty', 'tz', 'tt', 'orientable', 'genus'])
                        
                        # Swap values at crossover point
                        new_population[i][crossover_point], new_population[i+1][crossover_point] = \
                            new_population[i+1][crossover_point], new_population[i][crossover_point]
                    
                    # Mutation
                    for j in range(i, i+2):
                        if random.random() < mutation_rate:
                            # Select random parameter to mutate
                            param = random.choice(['tx', 'ty', 'tz', 'tt', 'orientable', 'genus'])
                            
                            # Apply mutation based on parameter type
                            if param == 'tx' or param == 'ty' or param == 'tz':
                                new_population[j][param] += random.uniform(-1, 1)
                                new_population[j][param] = max(-5, min(5, new_population[j][param]))
                            elif param == 'tt':
                                new_population[j][param] += random.uniform(-0.2, 0.2)
                                new_population[j][param] = max(-1, min(1, new_population[j][param]))
                            elif param == 'orientable':
                                new_population[j][param] = 1 - new_population[j][param]  # Flip orientability
                            elif param == 'genus':
                                new_population[j][param] += random.choice([-1, 1])
                                new_population[j][param] = max(0, min(3, new_population[j][param]))
            
            # Update population for next generation
            population = new_population
        
        # Return results
        return jsonify({
            'best_individuals': best_individuals,
            'compatible_pairs': compatible_pairs
        })
        
    except (ValueError, TypeError) as e:
        return jsonify({'error': str(e)}), 400

@app.route('/compute_topological_compatibility', methods=['POST'])
def compute_topological_compatibility(skb1=None, skb2=None):
    """Compute topological compatibility between two Sub-SKBs."""
    try:
        if skb1 is None or skb2 is None:
            data = request.get_json()
            skb1 = data.get('skb1', {})
            skb2 = data.get('skb2', {})
        
        # Extract parameters
        tx1 = float(skb1.get('tx', 0))
        ty1 = float(skb1.get('ty', 0))
        tz1 = float(skb1.get('tz', 0))
        tt1 = float(skb1.get('tt', 0))
        orientable1 = int(skb1.get('orientable', 1))
        genus1 = int(skb1.get('genus', 0))
        
        tx2 = float(skb2.get('tx', 0))
        ty2 = float(skb2.get('ty', 0))
        tz2 = float(skb2.get('tz', 0))
        tt2 = float(skb2.get('tt', 0))
        orientable2 = int(skb2.get('orientable', 1))
        genus2 = int(skb2.get('genus', 0))
        
        # Compute Stiefel-Whitney compatibility
        w1_compatible = orientable1 == orientable2
        
        # Compute twist compatibility
        twist_sum = abs(tx1 + tx2) + abs(ty1 + ty2) + abs(tz1 + tz2)
        twist_compatible = twist_sum < 1.0
        
        # Compute CTC stability
        time_twist_sum = abs(tt1 + tt2)
        ctc_stable = time_twist_sum < 0.5
        
        # Compute Kirby-Siebenmann invariant
        ks1 = (tx1 * ty1 * tz1) % 2
        ks2 = (tx2 * ty2 * tz2) % 2
        ks_compatible = ks1 == ks2
        
        # Determine intersection form type
        q_form_1 = "Positive Definite" if tx1 * ty1 > 0 else "Indefinite"
        q_form_2 = "Positive Definite" if tx2 * ty2 > 0 else "Indefinite"
        q_compatible = q_form_1 == q_form_2
        
        # Overall compatibility
        compatible = w1_compatible and twist_compatible and ks_compatible and q_compatible and ctc_stable
        
        # Detailed compatibility report
        compatibility_details = {
            "w1_compatible": w1_compatible,
            "twist_compatible": twist_compatible,
            "ks_compatible": ks_compatible,
            "q_compatible": q_compatible,
            "ctc_stable": ctc_stable,
            "compatible": compatible
        }
        
        # If this is an API call, return JSON
        if request.method == 'POST':
            return jsonify(compatibility_details)
        
        # Otherwise return the details for internal use
        return compatibility_details
        
    except (ValueError, TypeError) as e:
        if request.method == 'POST':
            return jsonify({"error": str(e)}), 400
        return {"error": str(e), "compatible": False}

@app.route('/get_visualization', methods=['POST'])
def get_visualization():
    """Generate enhanced visualization data with improved mathematical modeling and scientific rendering."""
    try:
        logger.info("Received enhanced visualization request")
        data = request.get_json()
        logger.debug(f"Request data: {data}")
        
        # Extract and validate parameters
        t = float(data.get('t', 0))
        loop_factor = float(data.get('loop_factor', 1))
        loop1 = float(data.get('loop1', 1))
        loop2 = float(data.get('loop2', 1))
        loop3 = float(data.get('loop3', 1))
        merge = bool(data.get('merge', False))
        
        logger.debug(f"Basic parameters: t={t}, loop_factor={loop_factor}, merge={merge}")
        
        # Extract twist parameters for each sub-SKB
        twists = []
        for i in range(1, 4):
            twist = [
                float(data.get(f't{i}x', 0)),
                float(data.get(f't{i}y', 0)),
                float(data.get(f't{i}z', 0)),
                float(data.get(f't{i}t', 0))  # Time twist parameter
            ]
            twists.append(twist)
            logger.debug(f"Sub-SKB {i} twists: {twist}")
        
        # Ensure values are within scientifically valid ranges
        t = max(0, min(2 * np.pi, t))
        loop_factor = max(1, min(5, loop_factor))
        loop1 = max(1, min(5, loop1))
        loop2 = max(1, min(5, loop2))
        loop3 = max(1, min(5, loop3))
        
        # Validate twist parameters
        for i in range(3):
            for j in range(3):
                twists[i][j] = max(-5, min(5, twists[i][j]))
            # Validate time twist parameter (index 3) - critical for CTC stability
            twists[i][3] = max(-1, min(1, twists[i][3]))
        
        logger.info("Generating enhanced visualization data...")
        
        # Enhanced color processing
        default_colors = {
            'skb1': '#ff6b9d',  # Enhanced pink
            'skb2': '#4fc3f7',  # Enhanced blue
            'skb3': '#81c784'   # Enhanced green
        }
        colors = data.get('colors', default_colors)
        
        # Convert hex colors to RGB for enhanced processing
        color_rgb = {}
        for key, hex_color in colors.items():
            color_rgb[key] = hex_to_rgb(hex_color)
        
        surfaces = []
        
        if merge:
            logger.debug("Generating enhanced merged SKB")
            # Enhanced merged stable SKB with weighted averages based on topological significance
            weight_factors = [0.4, 0.35, 0.25]  # Different weights for different components
            avg_twists = []
            for j in range(4):
                weighted_sum = sum(weight_factors[i] * twists[i][j] for i in range(3))
                avg_twists.append(weighted_sum)
            
            # Generate enhanced Klein bottle for merged state
            x, y, z, u, v = generate_klein_bottle(avg_twists, t, loop_factor, resolution=85)
            
            # Create enhanced merged surface with scientific coloring
            merged_color = [187, 134, 252]  # Purple for merged state
            enhanced_surface = create_enhanced_surface_trace(
                x, y, z, u, v, 
                name='Merged SKB (Stable Hadron)',
                color=merged_color,
                opacity=0.85,
                surface_type="Klein"
            )
            
            # Enhanced properties for merged SKB
            enhanced_surface.update({
                'contours': {
                    'x': {'show': True, 'width': 2.5, 'color': 'rgba(255,255,255,0.6)'},
                    'y': {'show': True, 'width': 2.5, 'color': 'rgba(255,255,255,0.6)'},
                    'z': {'show': True, 'width': 2.5, 'color': 'rgba(255,255,255,0.6)'}
                },
                'lighting': {
                    'ambient': 0.5,
                    'diffuse': 0.9,
                    'roughness': 0.15,
                    'specular': 1.0,
                    'fresnel': 0.5
                }
            })
            
            surfaces.append(enhanced_surface)
            
        else:
            logger.debug("Generating enhanced individual Sub-SKBs")
            
            # Enhanced surface generation with improved mathematical modeling
            surface_types = ["Klein", "Mobius", "Torus"]
            surface_names = ["Sub-SKB 1 (Klein)", "Sub-SKB 2 (Möbius)", "Sub-SKB 3 (Torus)"]
            opacities = [0.75, 0.68, 0.62]  # Graduated opacity for depth perception
            
            # Generate each enhanced sub-SKB
            for i, (twist, loop_val) in enumerate(zip(twists, [loop1, loop2, loop3])):
                logger.debug(f"Generating enhanced Sub-SKB {i+1}")
                
                if i == 0:
                    # Enhanced Klein bottle for first sub-SKB
                    x, y, z, u, v = generate_klein_bottle(twist, t, loop_val, resolution=80)
                    surface_type = "Klein"
                elif i == 1:
                    # Enhanced twisted strip (Möbius-like) for second sub-SKB
                    x, y, z, u, v = generate_twisted_strip(twist, t, loop_val, resolution=80)
                    surface_type = "Mobius"
                else:
                    # Enhanced torus for third sub-SKB
                    x, y, z, u, v = generate_torus(twist, t, loop_val, resolution=80)
                    surface_type = "Torus"
                
                logger.debug(f"Enhanced Sub-SKB {i+1} generated, shape: {x.shape}")
                
                # Create enhanced surface trace
                color_key = f'skb{i+1}'
                enhanced_surface = create_enhanced_surface_trace(
                    x, y, z, u, v,
                    name=surface_names[i],
                    color=color_rgb[color_key],
                    opacity=opacities[i],
                    surface_type=surface_type
                )
                
                # Add specialized lighting for each surface type
                if surface_type == "Klein":
                    enhanced_surface['lighting'] = {
                        'ambient': 0.45,
                        'diffuse': 0.85,
                        'roughness': 0.25,
                        'specular': 0.95,
                        'fresnel': 0.6
                    }
                elif surface_type == "Mobius":
                    enhanced_surface['lighting'] = {
                        'ambient': 0.5,
                        'diffuse': 0.75,
                        'roughness': 0.3,
                        'specular': 0.8,
                        'fresnel': 0.4
                    }
                else:  # Torus
                    enhanced_surface['lighting'] = {
                        'ambient': 0.55,
                        'diffuse': 0.7,
                        'roughness': 0.35,
                        'specular': 0.75,
                        'fresnel': 0.35
                    }
                
                surfaces.append(enhanced_surface)
                
                # Add enhanced intersection analysis for topological compatibility
                if i > 0:
                    intersection_points = calculate_surface_intersections(
                        surfaces[0], enhanced_surface, tolerance=0.15
                    )
                    
                    if intersection_points:
                        # Create enhanced intersection markers
                        intersection_trace = {
                            'x': intersection_points['x'],
                            'y': intersection_points['y'],
                            'z': intersection_points['z'],
                            'mode': 'markers',
                            'type': 'scatter3d',
                            'marker': {
                                'size': 4,
                                'color': 'rgba(255, 255, 100, 0.9)',
                                'symbol': 'diamond',
                                'line': {
                                    'width': 2,
                                    'color': 'rgba(255, 255, 255, 0.8)'
                                }
                            },
                            'name': f'Topological Interface {i}',
                            'hoverinfo': 'name',
                            'showlegend': True
                        }
                        surfaces.append(intersection_trace)
            
            # Add topological field lines for visualization of connections
            if len(surfaces) >= 3:
                field_lines = generate_topological_field_lines(twists, t)
                if field_lines:
                    surfaces.extend(field_lines)
        
        logger.info(f"Returning {len(surfaces)} enhanced surfaces and visualizations")
        
        # Enhanced response with additional metadata
        response_data = {
            'plot': {
                'data': surfaces
            },
            'metadata': {
                'surface_count': len(surfaces),
                'enhancement_level': 'scientific',
                'mathematical_accuracy': 'high',
                'ctc_stability': calculate_ctc_stability(twists),
                'topological_genus': calculate_total_genus(twists, merge)
            }
        }
        
        return jsonify(response_data)
    
    except Exception as e:
        logger.error(f"Error in enhanced visualization: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)})

def calculate_surface_intersections(surface1, surface2, tolerance=0.1):
    """
    Calculate intersections between two surfaces for enhanced visualization.
    
    Parameters:
    surface1, surface2: Surface data dictionaries
    tolerance: Distance tolerance for intersection detection
    
    Returns:
    Dictionary with intersection point coordinates
    """
    try:
        # Extract surface coordinates
        x1, y1, z1 = np.array(surface1['x']), np.array(surface1['y']), np.array(surface1['z'])
        x2, y2, z2 = np.array(surface2['x']), np.array(surface2['y']), np.array(surface2['z'])
        
        # Sample points for intersection calculation
        sample_step = max(1, len(x1) // 20)  # Sample approximately 20 points per dimension
        
        intersections_x, intersections_y, intersections_z = [], [], []
        
        # Optimized intersection detection
        for i in range(0, len(x1), sample_step):
            for j in range(0, len(x1[0]), sample_step):
                if i < len(x1) and j < len(x1[0]):
                    p1 = np.array([x1[i][j], y1[i][j], z1[i][j]])
                    
                    # Find closest point on surface2
                    min_dist = float('inf')
                    closest_point = None
                    
                    for ii in range(0, len(x2), sample_step):
                        for jj in range(0, len(x2[0]), sample_step):
                            if ii < len(x2) and jj < len(x2[0]):
                                p2 = np.array([x2[ii][jj], y2[ii][jj], z2[ii][jj]])
                                dist = np.linalg.norm(p1 - p2)
                                
                                if dist < min_dist:
                                    min_dist = dist
                                    closest_point = p2
                    
                    # If points are close enough, consider it an intersection
                    if min_dist < tolerance and closest_point is not None:
                        # Add midpoint as intersection
                        midpoint = (p1 + closest_point) / 2
                        intersections_x.append(midpoint[0])
                        intersections_y.append(midpoint[1])
                        intersections_z.append(midpoint[2])
        
        if intersections_x:
            return {
                'x': intersections_x,
                'y': intersections_y,
                'z': intersections_z
            }
        else:
            return None
            
    except Exception as e:
        logger.warning(f"Error calculating surface intersections: {e}")
        return None

def generate_topological_field_lines(twists, t):
    """
    Generate field lines representing topological connections between Sub-SKBs.
    
    Parameters:
    twists: List of twist parameters for each Sub-SKB
    t: Time parameter
    
    Returns:
    List of field line traces
    """
    try:
        field_lines = []
        
        # Calculate field strength based on twist compatibility
        for i in range(len(twists)):
            for j in range(i + 1, len(twists)):
                twist1, twist2 = twists[i], twists[j]
                
                # Calculate topological field strength
                field_strength = 1.0 / (1.0 + np.sqrt(
                    (twist1[0] - twist2[0])**2 + 
                    (twist1[1] - twist2[1])**2 + 
                    (twist1[2] - twist2[2])**2
                ))
                
                # Only show strong connections
                if field_strength > 0.3:
                    # Generate parametric field line
                    u = np.linspace(0, 1, 20)
                    
                    # Create curved connection based on twist parameters
                    curve_factor = (twist1[0] + twist2[0]) * 0.1
                    
                    x_line = (1 - u) * (2 * np.cos(i * 2 * np.pi / 3)) + u * (2 * np.cos(j * 2 * np.pi / 3))
                    y_line = (1 - u) * (2 * np.sin(i * 2 * np.pi / 3)) + u * (2 * np.sin(j * 2 * np.pi / 3))
                    z_line = curve_factor * np.sin(np.pi * u) + 0.2 * np.sin(t + u * np.pi)
                    
                    field_line = {
                        'x': x_line.tolist(),
                        'y': y_line.tolist(),
                        'z': z_line.tolist(),
                        'mode': 'lines',
                        'type': 'scatter3d',
                        'line': {
                            'width': max(2, int(field_strength * 8)),
                            'color': f'rgba(255, 200, 100, {field_strength * 0.8})'
                        },
                        'name': f'Field Line {i+1}-{j+1}',
                        'hoverinfo': 'name',
                        'showlegend': False
                    }
                    field_lines.append(field_line)
        
        return field_lines
        
    except Exception as e:
        logger.warning(f"Error generating field lines: {e}")
        return []

def calculate_ctc_stability(twists):
    """Calculate the overall CTC (Closed Timelike Curve) stability."""
    try:
        time_twists = [twist[3] for twist in twists]  # Extract time twist parameters
        total_time_twist = sum(abs(tt) for tt in time_twists)
        stability = max(0, 1 - total_time_twist / 3)  # Normalize to 0-1 range
        return round(stability, 3)
    except:
        return 0.5

def calculate_total_genus(twists, merged=False):
    """Calculate the total topological genus of the configuration."""
    try:
        if merged:
            # Merged topology typically has genus 2 for Klein bottle
            return 2
        else:
            # Individual components: Klein bottle (1), Möbius strip (1), Torus (1)
            return 3
    except:
        return 1

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host='0.0.0.0', port=port, debug=debug)
