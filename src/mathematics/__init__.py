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
    generate_topological_field_lines,
    calculate_surface_intersections
)
from .utils import hex_to_rgb
from .fermion_evolution import (
    FermionSKB, 
    FermionEvolutionSystem,
    FermionProperties,
    create_fermion_evolution_system,
    calculate_klein_bottle_fermion
)

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
    "calculate_surface_intersections",
    
    # Fermion evolution
    "FermionSKB",
    "FermionEvolutionSystem", 
    "FermionProperties",
    "create_fermion_evolution_system",
    "calculate_klein_bottle_fermion",
    
    # Utilities
    "hex_to_rgb"
] 