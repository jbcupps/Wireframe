"""
Mathematics package for SKB Visualization Application.
Contains mathematical computation modules for topological surfaces and analysis.
"""

from .klein_bottle import KleinBottleGenerator, generate_klein_bottle
from .surfaces import (
    generate_mobius_strip,
    generate_torus,
    generate_twisted_strip,
    calculate_surface_curvature,
    create_enhanced_surface_trace
)
from .topology import (
    calculate_ctc_stability,
    calculate_total_genus,
    generate_topological_field_lines
)
from .utils import hex_to_rgb

# Export all mathematical functions and classes
__all__ = [
    # Klein bottle
    "KleinBottleGenerator",
    "generate_klein_bottle",
    
    # Surface generation
    "generate_mobius_strip",
    "generate_torus", 
    "generate_twisted_strip",
    "calculate_surface_curvature",
    "create_enhanced_surface_trace",
    
    # Topology calculations
    "calculate_ctc_stability",
    "calculate_total_genus",
    "generate_topological_field_lines",
    
    # Utilities
    "hex_to_rgb"
] 