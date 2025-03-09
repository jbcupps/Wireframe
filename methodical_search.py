import numpy as np
import json
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional, Union, Any
from functools import lru_cache

# Define constants for search defaults and limits
DEFAULT_TWIST_MIN = -2.0
DEFAULT_TWIST_MAX = 2.0
DEFAULT_TWIST_STEP = 0.5
DEFAULT_LINK_MIN = -3
DEFAULT_LINK_MAX = 3
DEFAULT_LINK_STEP = 1
DEFAULT_CHARGE_SCALE = 0.3
DEFAULT_BASE_MASS = 0.0
DEFAULT_ENERGY_SCALE = 100.0
MAX_RESULTS = 20
MAX_VISUALIZATION_POINTS = 50
COMPUTATION_TIME_PER_POINT = 0.02  # seconds

# Data models for the Methodical Search feature
@dataclass
class ParticleData:
    """Standard Model particle data"""
    name: str
    display_name: str
    mass_mev: float
    charge: float
    structure: str
    sub_skbs: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "mass_mev": self.mass_mev,
            "charge": self.charge,
            "structure": self.structure,
            "sub_skbs": self.sub_skbs
        }

@dataclass
class SearchParameters:
    """Parameters for the search algorithm"""
    twist_min: float
    twist_max: float
    twist_step: float
    link_min: int
    link_max: int
    link_step: int
    charge_scale: float
    base_mass: float
    energy_scale: float
    
    def to_dict(self) -> Dict[str, Union[float, int]]:
        return {
            "twist_min": self.twist_min,
            "twist_max": self.twist_max,
            "twist_step": self.twist_step,
            "link_min": self.link_min,
            "link_max": self.link_max,
            "link_step": self.link_step,
            "charge_scale": self.charge_scale,
            "base_mass": self.base_mass,
            "energy_scale": self.energy_scale
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SearchParameters':
        return cls(
            twist_min=float(data.get('twist_min', DEFAULT_TWIST_MIN)),
            twist_max=float(data.get('twist_max', DEFAULT_TWIST_MAX)),
            twist_step=float(data.get('twist_step', DEFAULT_TWIST_STEP)),
            link_min=int(data.get('link_min', DEFAULT_LINK_MIN)),
            link_max=int(data.get('link_max', DEFAULT_LINK_MAX)),
            link_step=int(data.get('link_step', DEFAULT_LINK_STEP)),
            charge_scale=float(data.get('charge_scale', DEFAULT_CHARGE_SCALE)),
            base_mass=float(data.get('base_mass', DEFAULT_BASE_MASS)),
            energy_scale=float(data.get('energy_scale', DEFAULT_ENERGY_SCALE))
        )

@dataclass
class SearchResult:
    """Result from the search algorithm"""
    twist: float
    link: int
    calculated_charge: float
    calculated_mass: float
    error: float
    
    def to_dict(self) -> Dict[str, Union[float, int]]:
        return {
            "twist": self.twist,
            "link": self.link,
            "calculated_charge": self.calculated_charge,
            "calculated_mass": self.calculated_mass,
            "error": self.error
        }

# Particle database - Standard Model particles
PARTICLES = {
    "proton": ParticleData(
        name="proton",
        display_name="Proton",
        mass_mev=938.272,
        charge=1.0,
        structure="3 Sub-SKBs",
        sub_skbs=["Up Quark", "Up Quark", "Down Quark"]
    ),
    "neutron": ParticleData(
        name="neutron",
        display_name="Neutron",
        mass_mev=939.565,
        charge=0.0,
        structure="3 Sub-SKBs",
        sub_skbs=["Up Quark", "Down Quark", "Down Quark"]
    ),
    "pion+": ParticleData(
        name="pion+",
        display_name="Pion+ (π+)",
        mass_mev=139.570,
        charge=1.0,
        structure="2 Sub-SKBs",
        sub_skbs=["Up Quark", "Anti-Down Quark"]
    ),
    "pion0": ParticleData(
        name="pion0",
        display_name="Pion0 (π0)",
        mass_mev=134.977,
        charge=0.0,
        structure="2 Sub-SKBs",
        sub_skbs=["Up Quark", "Anti-Up Quark"]
    ),
    "electron": ParticleData(
        name="electron",
        display_name="Electron",
        mass_mev=0.511,
        charge=-1.0,
        structure="1 Sub-SKB",
        sub_skbs=["Electron"]
    ),
    "up-quark": ParticleData(
        name="up-quark",
        display_name="Up Quark",
        mass_mev=2.16,
        charge=2/3,
        structure="1 Sub-SKB",
        sub_skbs=["Up Quark"]
    ),
    "down-quark": ParticleData(
        name="down-quark",
        display_name="Down Quark",
        mass_mev=4.67,
        charge=-1/3,
        structure="1 Sub-SKB",
        sub_skbs=["Down Quark"]
    ),
    # Leptons
    "muon": ParticleData(
        name="muon",
        display_name="Muon",
        mass_mev=105.66,
        charge=-1.0,
        structure="1 Sub-SKB",
        sub_skbs=["Muon"]
    ),
    "tau": ParticleData(
        name="tau",
        display_name="Tau",
        mass_mev=1776.8,
        charge=-1.0,
        structure="1 Sub-SKB",
        sub_skbs=["Tau"]
    ),
    "electron-neutrino": ParticleData(
        name="electron-neutrino",
        display_name="Electron Neutrino",
        mass_mev=0.0000022,
        charge=0.0,
        structure="1 Sub-SKB",
        sub_skbs=["Electron Neutrino"]
    ),
    "muon-neutrino": ParticleData(
        name="muon-neutrino",
        display_name="Muon Neutrino",
        mass_mev=0.17,
        charge=0.0,
        structure="1 Sub-SKB",
        sub_skbs=["Muon Neutrino"]
    ),
    "tau-neutrino": ParticleData(
        name="tau-neutrino",
        display_name="Tau Neutrino",
        mass_mev=15.5,
        charge=0.0,
        structure="1 Sub-SKB",
        sub_skbs=["Tau Neutrino"]
    ),
    # Quarks
    "charm-quark": ParticleData(
        name="charm-quark",
        display_name="Charm Quark",
        mass_mev=1270.0,
        charge=2/3,
        structure="1 Sub-SKB",
        sub_skbs=["Charm Quark"]
    ),
    "strange-quark": ParticleData(
        name="strange-quark",
        display_name="Strange Quark",
        mass_mev=93.4,
        charge=-1/3,
        structure="1 Sub-SKB",
        sub_skbs=["Strange Quark"]
    ),
    "top-quark": ParticleData(
        name="top-quark",
        display_name="Top Quark",
        mass_mev=172500.0,
        charge=2/3,
        structure="1 Sub-SKB",
        sub_skbs=["Top Quark"]
    ),
    "bottom-quark": ParticleData(
        name="bottom-quark",
        display_name="Bottom Quark",
        mass_mev=4180.0,
        charge=-1/3,
        structure="1 Sub-SKB",
        sub_skbs=["Bottom Quark"]
    ),
    # Bosons
    "photon": ParticleData(
        name="photon",
        display_name="Photon",
        mass_mev=0.0,
        charge=0.0,
        structure="1 Sub-SKB",
        sub_skbs=["Photon"]
    ),
    "z-boson": ParticleData(
        name="z-boson",
        display_name="Z Boson",
        mass_mev=91188.0,
        charge=0.0,
        structure="1 Sub-SKB",
        sub_skbs=["Z Boson"]
    ),
    "w-boson": ParticleData(
        name="w-boson",
        display_name="W Boson",
        mass_mev=80379.0,
        charge=1.0,
        structure="1 Sub-SKB",
        sub_skbs=["W Boson"]
    ),
    "gluon": ParticleData(
        name="gluon",
        display_name="Gluon",
        mass_mev=0.0,
        charge=0.0,
        structure="1 Sub-SKB",
        sub_skbs=["Gluon"]
    ),
    "higgs": ParticleData(
        name="higgs",
        display_name="Higgs Boson",
        mass_mev=125180.0,
        charge=0.0,
        structure="1 Sub-SKB",
        sub_skbs=["Higgs Boson"]
    ),
    # Hadrons
    "kaon+": ParticleData(
        name="kaon+",
        display_name="Kaon+ (K+)",
        mass_mev=493.68,
        charge=1.0,
        structure="2 Sub-SKBs",
        sub_skbs=["Up Quark", "Anti-Strange Quark"]
    ),
    "lambda": ParticleData(
        name="lambda",
        display_name="Lambda (Λ)",
        mass_mev=1115.68,
        charge=0.0,
        structure="3 Sub-SKBs",
        sub_skbs=["Up Quark", "Down Quark", "Strange Quark"]
    )
}

# API functions
def get_particle_data(particle_name: str) -> Optional[Dict[str, Any]]:
    """Get data for a specific particle"""
    particle = PARTICLES.get(particle_name)
    if particle:
        return particle.to_dict()
    return None

def get_all_particles() -> List[Dict[str, Any]]:
    """Get data for all available particles"""
    return [particle.to_dict() for particle in PARTICLES.values()]

def group_particles_by_category() -> Dict[str, List[Dict[str, Any]]]:
    """Group particles by category for UI organization"""
    categories = {
        "Hadrons": ["proton", "neutron", "pion+", "pion0", "kaon+", "lambda"],
        "Leptons": ["electron", "muon", "tau", "electron-neutrino", "muon-neutrino", "tau-neutrino"],
        "Quarks": ["up-quark", "down-quark", "charm-quark", "strange-quark", "top-quark", "bottom-quark"],
        "Bosons": ["photon", "z-boson", "w-boson", "gluon", "higgs"]
    }
    
    result = {}
    for category, particle_names in categories.items():
        result[category] = [PARTICLES[name].to_dict() for name in particle_names if name in PARTICLES]
    
    return result

# Core calculation functions
def calculate_charge(twist: float, charge_scale: float) -> float:
    """Calculate charge from twist number"""
    return twist * charge_scale

def calculate_mass(link: int, base_mass: float, energy_scale: float) -> float:
    """Calculate mass from linking number"""
    return base_mass + energy_scale * abs(link)

def calculate_error(calculated_mass: float, calculated_charge: float, 
                    target_mass: float, target_charge: float, 
                    metric: str = "relative") -> float:
    """Calculate error between calculated and target properties
    
    Args:
        calculated_mass: The calculated mass
        calculated_charge: The calculated charge
        target_mass: The target mass
        target_charge: The target charge
        metric: The error metric to use ("relative", "absolute", or "weighted")
    
    Returns:
        float: The calculated error value
    """
    if metric == "absolute":
        mass_error = abs(calculated_mass - target_mass)
        charge_error = abs(calculated_charge - target_charge) * 1000  # Scale up for comparable magnitude
        return mass_error + charge_error
    elif metric == "weighted":
        mass_error = abs(calculated_mass - target_mass) / (target_mass if target_mass != 0 else 1)
        charge_error = abs(calculated_charge - target_charge) / (abs(target_charge) if target_charge != 0 else 1)
        return 0.3 * mass_error + 0.7 * charge_error  # Prioritize charge
    else:  # relative
        mass_error = abs(calculated_mass - target_mass) / (target_mass if target_mass != 0 else 1)
        charge_error = abs(calculated_charge - target_charge) / (abs(target_charge) if target_charge != 0 else 1)
        return (mass_error + charge_error) / 2

# Search space generation
@lru_cache(maxsize=32)
def generate_parameter_space(params: SearchParameters) -> Dict[str, Any]:
    """Generate parameter space for the search
    
    Args:
        params: The search parameters
        
    Returns:
        Dict containing parameter space details and estimated computation time
    """
    twist_range = np.arange(params.twist_min, params.twist_max + params.twist_step/2, params.twist_step)
    link_range = np.arange(params.link_min, params.link_max + params.link_step/2, params.link_step)
    
    combo_count = len(twist_range) * len(link_range)
    estimated_time = combo_count * COMPUTATION_TIME_PER_POINT
    
    return {
        "twist_values": twist_range.tolist(),
        "link_values": link_range.tolist(),
        "combination_count": combo_count,
        "estimated_time": f"~{estimated_time:.1f} seconds"
    }

# Main search function
def run_search(particle_name: str, params: SearchParameters, metric: str = "relative") -> Dict[str, Any]:
    """Run the grid search to find best manifold configurations
    
    Args:
        particle_name: The name of the target particle
        params: Search parameters
        metric: The error metric to use
        
    Returns:
        Dict containing search results and visualization data
    """
    particle = PARTICLES.get(particle_name)
    if not particle:
        return {
            "error": f"Particle '{particle_name}' not found",
            "results": [],
            "visualization_data": {}
        }
    
    target_mass = particle.mass_mev
    target_charge = particle.charge
    
    twist_range = np.arange(params.twist_min, params.twist_max + params.twist_step/2, params.twist_step)
    link_range = np.arange(params.link_min, params.link_max + params.link_step/2, params.link_step)
    
    results = []
    
    # Grid search
    for twist in twist_range:
        for link in link_range:
            calculated_charge = calculate_charge(twist, params.charge_scale)
            calculated_mass = calculate_mass(link, params.base_mass, params.energy_scale)
            
            error = calculate_error(
                calculated_mass, calculated_charge, 
                target_mass, target_charge, 
                metric
            )
            
            result = SearchResult(
                twist=twist,
                link=link,
                calculated_charge=calculated_charge,
                calculated_mass=calculated_mass,
                error=error
            )
            
            results.append(result.to_dict())
    
    # Sort results by error (lowest first)
    results.sort(key=lambda x: x['error'])
    
    # Prepare visualization data from top results
    top_results = results[:MAX_VISUALIZATION_POINTS]
    visualization_data = prepare_visualization_data(top_results, particle)
    
    return {
        "results": results[:MAX_RESULTS],  # Return top results
        "visualization_data": visualization_data,
        "target": {
            "mass": target_mass,
            "charge": target_charge,
            "name": particle.display_name
        }
    }

def prepare_visualization_data(results: List[Dict[str, Any]], particle: ParticleData) -> Dict[str, Any]:
    """Prepare data for visualization
    
    Args:
        results: The search results to visualize
        particle: The target particle
        
    Returns:
        Dict containing visualization data
    """
    return {
        "x": [r["twist"] for r in results],
        "y": [r["link"] for r in results],
        "z": [r["error"] * 100 for r in results],  # Convert to percentage
        "sizes": [max(10, 30 * (1 - min(r["error"] * 10, 0.9))) for r in results],
        "colors": [f"rgba(98, 0, 238, {max(0.2, 1 - min(r['error'] * 5, 0.8))})" for r in results],
        "text": [
            f"Twist: {r['twist']}, Link: {r['link']}<br>"
            f"Charge: {r['calculated_charge']:.2f}, Mass: {r['calculated_mass']:.1f} MeV<br>"
            f"Error: {r['error']*100:.2f}%"
            for r in results
        ],
        "particle": particle.display_name
    } 