from flask import Flask, render_template, jsonify, request
import plotly.graph_objects as go
import numpy as np
import json
import traceback
import logging
import random

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Function to generate data for a twisted strip (sub-SKB) with multi-dimensional twists, time, and loops
def generate_twisted_strip(twists, t, loop_factor):
    """Generate a twisted strip (sub-SKB) with multi-dimensional twists, time, and loops."""
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(-0.5, 0.5, 50)  # Changed from 10 to 50 points
    u, v = np.meshgrid(u, v)
    kx, ky, kz, kt = twists  # Twist components including time twist
    
    # Apply time twist effect - creates temporal distortion
    timeFactor = kt * np.sin(u + t) * 0.3
    
    # Apply multi-dimensional twists and time evolution
    x = (1 + 0.5 * v * np.cos(kx * (u + t) / 2)) * np.cos(u)
    y = (1 + 0.5 * v * np.cos(ky * (u + t) / 2)) * np.sin(u)
    z = 0.5 * v * np.sin(kz * (u + t) / 2)
    
    # Apply time twist effect to create CTC visualization
    x = x + timeFactor * np.cos(v)
    y = y + timeFactor * np.sin(v)
    
    return x, y, z, u, v  # Return u and v for surface coloring

# Function to generate data for a Klein bottle (stable SKB) with time and loops
def generate_klein_bottle(twists, t, loop_factor):
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    kx, ky, kz, kt = twists  # Twist components including time twist
    
    a, b = 2.0, 1.0  # Parameters for size
    
    # Apply time twist effect - creates temporal distortion
    timeFactor = kt * np.sin(u + t) * 0.3
    
    # Apply multi-dimensional twists and time evolution
    x = (a + b * np.cos(v)) * np.cos(u + kx * t / 5)
    y = (a + b * np.cos(v)) * np.sin(u + ky * t / 5)
    z = b * np.sin(v) * np.cos((u + kz * t / 5) / 2)  # Simplified immersion
    
    # Apply time twist effect to create CTC visualization
    x = x + timeFactor * np.cos(v)
    y = y + timeFactor * np.sin(v)
    
    return x, y, z, u, v  # Return u and v for surface coloring

# Function to generate data for a torus (third Sub-SKB) with time and loops
def generate_torus(twists, t, loop_factor):
    """Generate a torus with multi-dimensional twists, time, and loops."""
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    kx, ky, kz, kt = twists  # Twist components including time twist
    
    R, r = 2.0, 0.5  # Major and minor radii
    
    # Apply time twist effect - creates temporal distortion
    timeFactor = kt * np.sin(u + t) * 0.3
    
    # Apply multi-dimensional twists and time evolution
    x = (R + r * np.cos(v + kx * t / 5)) * np.cos(u + ky * t / 5)
    y = (R + r * np.cos(v + ky * t / 5)) * np.sin(u + kx * t / 5)
    z = r * np.sin(v + kz * t / 5)
    
    # Apply time twist effect to create CTC visualization
    x = x + timeFactor * np.cos(v)
    y = y + timeFactor * np.sin(v)
    
    return x, y, z, u, v  # Return u and v for surface coloring

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/visualization')
def visualization():
    return render_template('index.html')

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
    """Generate visualization data based on parameters."""
    try:
        print("Received visualization request")
        data = request.get_json()
        print(f"Request data: {data}")
        
        # Extract parameters
        t = float(data.get('t', 0))
        loop_factor = float(data.get('loop_factor', 1))
        loop1 = float(data.get('loop1', 1))
        loop2 = float(data.get('loop2', 1))
        loop3 = float(data.get('loop3', 1))
        merge = bool(data.get('merge', False))
        
        print(f"Basic parameters: t={t}, loop_factor={loop_factor}, merge={merge}")
        
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
            print(f"Sub-SKB {i} twists: {twist}")
        
        # Ensure values are within valid ranges
        t = max(0, min(2 * np.pi, t))
        loop_factor = max(1, min(5, loop_factor))
        loop1 = max(1, min(5, loop1))
        loop2 = max(1, min(5, loop2))
        loop3 = max(1, min(5, loop3))
        merge = 1 if merge else 0
        
        for i in range(3):
            for j in range(3):
                twists[i][j] = max(-5, min(5, twists[i][j]))
            # Validate time twist parameter (index 3)
            twists[i][3] = max(-1, min(1, twists[i][3]))
        
        print("Generating visualization data...")
        
        # Generate visualization data
        if merge:
            print("Generating merged SKB")
            # Merged stable SKB - use average of all twist values
            avg_twists = [sum(t[j] for t in twists)/3 for j in range(4)]  # Include time twist in average
            x, y, z, u, v = generate_klein_bottle(avg_twists, t, loop_factor)
            
            # Create a single surface
            surfaces = [{
                'x': x.tolist(),
                'y': y.tolist(),
                'z': z.tolist(),
                'type': 'surface',
                'colorscale': 'Viridis',
                'showscale': False,
                'opacity': 0.8,
                'name': 'Merged SKB',
                'hoverinfo': 'none',
                'contours': {
                    'x': {'show': True, 'width': 1.5, 'color': 'rgba(255,255,255,0.5)'},
                    'y': {'show': True, 'width': 1.5, 'color': 'rgba(255,255,255,0.5)'},
                    'z': {'show': True, 'width': 1.5, 'color': 'rgba(255,255,255,0.5)'}
                },
                'lighting': {
                    'ambient': 0.6,
                    'diffuse': 0.8,
                    'roughness': 0.5,
                    'specular': 0.6,
                    'fresnel': 0.8
                }
            }]
        else:
            print("Generating individual Sub-SKBs")
            # Individual sub-SKBs
            surfaces = []
            
            # Colors from the request with improved contrast
            colors = data.get('colors', {
                'skb1': '#FF6E91',  # Default pink
                'skb2': '#33C4FF',  # Default blue
                'skb3': '#65FF8F'   # Default green
            })
            
            # Enhanced wireframe settings for each Sub-SKB
            wireframe_settings = [
                {'width': 1.5, 'color': 'rgba(255,255,255,0.7)', 'highlight': 3.0},
                {'width': 1.5, 'color': 'rgba(255,255,255,0.7)', 'highlight': 3.0},
                {'width': 1.5, 'color': 'rgba(255,255,255,0.7)', 'highlight': 3.0}
            ]
            
            # Adjust opacities for layering effect
            opacities = [0.7, 0.65, 0.6]
            
            # Generate each sub-SKB
            for i, (twist, loop_val) in enumerate(zip(twists, [loop1, loop2, loop3])):
                print(f"Generating Sub-SKB {i+1}")
                if i == 0:
                    # First sub-SKB: Klein bottle - used as wireframe with low surface opacity
                    x, y, z, u, v = generate_klein_bottle(twist, t, loop_val)
                    display_type = 'surface'
                    lighting = {
                        'ambient': 0.4,
                        'diffuse': 0.8,
                        'roughness': 0.6,
                        'specular': 0.8,
                        'fresnel': 0.7
                    }
                elif i == 1:
                    # Second sub-SKB: Twisted strip - semi-transparent surface
                    x, y, z, u, v = generate_twisted_strip(twist, t, loop_val)
                    display_type = 'surface'
                    lighting = {
                        'ambient': 0.5,
                        'diffuse': 0.6,
                        'roughness': 0.4,
                        'specular': 0.7,
                        'fresnel': 0.6
                    }
                else:
                    # Third sub-SKB: Torus - most transparent to show through
                    x, y, z, u, v = generate_torus(twist, t, loop_val)
                    display_type = 'surface'
                    lighting = {
                        'ambient': 0.6,
                        'diffuse': 0.5,
                        'roughness': 0.5,
                        'specular': 0.6,
                        'fresnel': 0.5
                    }
                
                print(f"Sub-SKB {i+1} generated, shape: {x.shape}")
                
                # Create surface for this sub-SKB
                color_key = f'skb{i+1}'
                surfaces.append({
                    'x': x.tolist(),
                    'y': y.tolist(),
                    'z': z.tolist(),
                    'type': display_type,
                    'colorscale': [[0, colors[color_key]], [1, colors[color_key]]],
                    'showscale': False,
                    'opacity': opacities[i],
                    'name': f'Sub-SKB {i+1}',
                    'hoverinfo': 'none',
                    'contours': {
                        'x': {'show': True, 'width': wireframe_settings[i]['width'], 'color': wireframe_settings[i]['color'], 'highlight': wireframe_settings[i]['highlight']},
                        'y': {'show': True, 'width': wireframe_settings[i]['width'], 'color': wireframe_settings[i]['color'], 'highlight': wireframe_settings[i]['highlight']},
                        'z': {'show': True, 'width': wireframe_settings[i]['width'], 'color': wireframe_settings[i]['color'], 'highlight': wireframe_settings[i]['highlight']}
                    },
                    'lighting': lighting,
                    'lightposition': {
                        'x': 1,
                        'y': 1,
                        'z': 1
                    }
                })
                
                # Add intersection markers where the surfaces meet
                if i > 0:
                    # Calculate potential intersection areas (a simplified approach)
                    # This is a simplified approach - real intersection detection would be more complex
                    intersect_points_x = []
                    intersect_points_y = []
                    intersect_points_z = []
                    
                    # Sample points from grid for potential intersections
                    for row in range(0, x.shape[0], 5):  # Sample every 5th point
                        for col in range(0, x.shape[1], 5):  # Sample every 5th point
                            cur_x, cur_y, cur_z = x[row, col], y[row, col], z[row, col]
                            
                            # Check if this point is close to any point in the previous surface
                            for prev_i in range(i):
                                prev_surface = surfaces[prev_i]
                                prev_x = np.array(prev_surface['x']).reshape(x.shape)
                                prev_y = np.array(prev_surface['y']).reshape(y.shape)
                                prev_z = np.array(prev_surface['z']).reshape(z.shape)
                                
                                for prev_row in range(0, prev_x.shape[0], 5):
                                    for prev_col in range(0, prev_x.shape[1], 5):
                                        px, py, pz = prev_x[prev_row, prev_col], prev_y[prev_row, prev_col], prev_z[prev_row, prev_col]
                                        
                                        # Calculate distance - if close, mark as intersection
                                        dist = np.sqrt((cur_x-px)**2 + (cur_y-py)**2 + (cur_z-pz)**2)
                                        if dist < 0.08:  # Threshold for intersection
                                            intersect_points_x.append(cur_x)
                                            intersect_points_y.append(cur_y)
                                            intersect_points_z.append(cur_z)
                    
                    # Add intersection markers if we found any
                    if intersect_points_x:
                        surfaces.append({
                            'x': intersect_points_x,
                            'y': intersect_points_y,
                            'z': intersect_points_z,
                            'mode': 'markers',
                            'type': 'scatter3d',
                            'marker': {
                                'size': 3,
                                'color': 'rgba(255, 255, 255, 0.8)',
                                'symbol': 'circle',
                                'line': {
                                    'width': 1,
                                    'color': 'rgba(0, 0, 0, 0.5)'
                                }
                            },
                            'name': f'Intersection {i}',
                            'hoverinfo': 'none'
                        })
            
        print(f"Returning {len(surfaces)} surfaces")
        
        # Return the visualization data
        response_data = {
            'plot': {
                'data': surfaces
            }
        }
        
        return jsonify(response_data)
    
    except Exception as e:
        import traceback
        print(f"Error in get_visualization: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)