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
from app import create_app

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create the Flask application using the factory function
app = create_app()

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

    # Parameters
    a = params.get('a', 1.0)
    b = params.get('b', 1.0)
    c = params.get('c', 1.0)
    
    # Apply time evolution
    x = a * np.cos(u) * np.cos(v + params.get('twist_x', 0) * t / 5)
    y = b * np.sin(u) * np.cos(v + params.get('twist_y', 0) * t / 5)
    z = c * np.sin(v + params.get('twist_z', 0) * t / 5)
    
    return go.Surface(x=x, y=y, z=z, colorscale='Plasma', opacity=0.7, showscale=False)

# Function to calculate topological invariants for a manifold
def calculate_topological_invariants(manifold_type: str, params: Dict[str, float]) -> Dict[str, Any]:
    """Calculate topological invariants for a manifold."""
    invariants = {
        'euler_characteristic': 0,
        'genus': 0,
        'orientability': False,
        'dimension': 0,
        'homology_groups': [],
        'fundamental_group': '',
        'stability_metric': 0.0
    }
    
    try:
        if manifold_type == 'klein_bottle':
            invariants['euler_characteristic'] = 0
            invariants['genus'] = 2
            invariants['orientability'] = False
            invariants['dimension'] = 2
            invariants['homology_groups'] = ['Z', 'Z⊕Z₂', 'Z']
            invariants['fundamental_group'] = 'Non-abelian group with presentation <a,b|aba⁻¹b>'
            
            # Calculate stability based on parameters
            twist_factor = sum([params.get(f'twist_{axis}', 0)**2 for axis in ['x', 'y', 'z']])
            invariants['stability_metric'] = 1.0 / (1.0 + twist_factor)
            
        elif manifold_type == 'torus':
            invariants['euler_characteristic'] = 0
            invariants['genus'] = 1
            invariants['orientability'] = True
            invariants['dimension'] = 2
            invariants['homology_groups'] = ['Z', 'Z⊕Z', 'Z']
            invariants['fundamental_group'] = 'Z⊕Z (free abelian group of rank 2)'
            
            # Calculate stability based on parameters
            twist_factor = sum([params.get(f'twist_{axis}', 0)**2 for axis in ['x', 'y', 'z']])
            invariants['stability_metric'] = 1.0 / (1.0 + twist_factor)
            
        elif manifold_type == '4d_torus':
            invariants['euler_characteristic'] = 0
            invariants['genus'] = 'Not applicable in 4D'
            invariants['orientability'] = True
            invariants['dimension'] = 4
            invariants['homology_groups'] = ['Z', 'Z⁴', 'Z⁶', 'Z⁴', 'Z']
            invariants['fundamental_group'] = 'Z⁴ (free abelian group of rank 4)'
            
            # Calculate stability based on parameters
            twist_factor = sum([params.get(f'twist_{axis}', 0)**2 for axis in ['x', 'y', 'z', 't']])
            invariants['stability_metric'] = 1.0 / (1.0 + twist_factor)
            
        elif manifold_type == 'projective_plane':
            invariants['euler_characteristic'] = 1
            invariants['genus'] = 1  # Non-orientable genus
            invariants['orientability'] = False
            invariants['dimension'] = 2
            invariants['homology_groups'] = ['Z', 'Z₂', '0']
            invariants['fundamental_group'] = 'Z₂'
            
            # Calculate stability based on parameters
            twist_factor = sum([params.get(f'twist_{axis}', 0)**2 for axis in ['x', 'y', 'z']])
            invariants['stability_metric'] = 1.0 / (1.0 + twist_factor)
            
        elif manifold_type == 'twisted_strip':
            invariants['euler_characteristic'] = 0
            invariants['genus'] = 1  # Non-orientable genus
            invariants['orientability'] = False
            invariants['dimension'] = 2
            invariants['homology_groups'] = ['Z', 'Z⊕Z₂', '0']
            invariants['fundamental_group'] = 'Z'
            
            # Calculate stability based on parameters
            twist_factor = sum([params.get(f'twist_{axis}', 0)**2 for axis in ['x', 'y', 'z']])
            invariants['stability_metric'] = 1.0 / (1.0 + 0.5 * twist_factor)
    
    except Exception as e:
        logger.error(f"Error calculating topological invariants: {str(e)}")
        logger.error(traceback.format_exc())
    
    return invariants

# Main entry point for running the application directly
if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)