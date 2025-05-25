"""
Fermion Evolution Mathematics Module
Implements the mathematical framework for fermions as Klein bottle structures
in the SKB (Spacetime Klein Bottle) hypothesis.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import math

# Physical constants (in natural units where c = ℏ = 1)
PLANCK_CONSTANT = 1.0  # ℏ
SPEED_OF_LIGHT = 1.0   # c
ELECTRON_CHARGE = 1.0  # e (elementary charge unit)


@dataclass
class FermionProperties:
    """Properties of a fermion in the SKB framework."""
    name: str
    mass: float  # MeV/c²
    charge: float  # in units of e
    twist_angle: float  # θ parameter
    period: float  # CTC period
    color: str  # visualization color
    genus: int = 0  # topological genus
    stiefel_whitney_class: int = 1  # for fermions


class FermionSKB:
    """
    Spacetime Klein Bottle representation of a fermion.
    Implements the mathematical framework from the paper.
    """
    
    def __init__(self, properties: FermionProperties):
        self.properties = properties
        self.twist_angle = properties.twist_angle
        self.mass = properties.mass
        self.charge = properties.charge
        self.period = properties.period
        
    def calculate_mass_from_ctc_period(self, period: float, winding_number: int = 1) -> float:
        """
        Calculate mass from CTC period using the relation: m = 2πnℏ/(c²T)
        
        Args:
            period: CTC period T
            winding_number: winding number n
            
        Returns:
            mass in MeV/c²
        """
        if period <= 0:
            raise ValueError("Period must be positive")
            
        # m = 2πnℏ/(c²T) where ℏ = c = 1 in natural units
        mass = (2 * math.pi * winding_number) / period
        
        # Convert to MeV/c² (multiply by characteristic energy scale)
        energy_scale = 1.0  # MeV (this would be derived from more fundamental theory)
        return mass * energy_scale
    
    def calculate_quantized_action(self, path_params: Dict[str, float]) -> float:
        """
        Calculate quantized action around closed timelike curve.
        
        Args:
            path_params: Parameters defining the CTC path
            
        Returns:
            Action integral ∮ p_μ dx^μ
        """
        # For a circular CTC: ∮ p_μ dx^μ = ET where E = mc²
        energy = self.mass * SPEED_OF_LIGHT**2
        action = energy * self.period
        
        # Ensure quantization: action = 2πnℏ
        n = round(action / (2 * math.pi * PLANCK_CONSTANT))
        quantized_action = 2 * math.pi * n * PLANCK_CONSTANT
        
        return quantized_action
    
    def generate_klein_bottle_coordinates(self, 
                                        u_range: Tuple[float, float] = (0, 2*math.pi),
                                        v_range: Tuple[float, float] = (0, 2*math.pi),
                                        resolution: int = 50,
                                        time: float = 0) -> Dict[str, np.ndarray]:
        """
        Generate 4D Klein bottle coordinates projected to 3D.
        
        Args:
            u_range: Parameter u range
            v_range: Parameter v range  
            resolution: Grid resolution
            time: Time parameter for evolution
            
        Returns:
            Dictionary with x, y, z coordinates and metadata
        """
        u = np.linspace(u_range[0], u_range[1], resolution)
        v = np.linspace(v_range[0], v_range[1], resolution)
        U, V = np.meshgrid(u, v)
        
        # Klein bottle parameterization with twist and time evolution
        theta = self.twist_angle
        t_phase = time * 2 * math.pi / self.period
        
        # Standard Klein bottle in 4D, projected to 3D
        # With CTC time dependence and twist angle
        
        # Temporal modulation from CTC
        temporal_factor = 1 + 0.1 * np.sin(t_phase)
        
        # Klein bottle surface equations with twist
        r = 2 + np.cos(U/2) * np.sin(V) - np.sin(U/2) * np.sin(2*V)
        r *= temporal_factor
        
        # Spatial coordinates
        x_base = r * np.cos(V)
        y_base = r * np.sin(V) 
        z_base = np.cos(U/2) * np.cos(V) + np.sin(U/2) * np.cos(2*V)
        
        # Apply twist rotation around z-axis
        x = x_base * np.cos(theta) - z_base * np.sin(theta)
        y = y_base
        z = x_base * np.sin(theta) + z_base * np.cos(theta)
        
        # Calculate curvature and charge density
        gaussian_curvature = self._calculate_gaussian_curvature(U, V)
        charge_density = self.charge * gaussian_curvature
        
        return {
            'x': x,
            'y': y, 
            'z': z,
            'u': U,
            'v': V,
            'curvature': gaussian_curvature,
            'charge_density': charge_density,
            'temporal_factor': temporal_factor
        }
    
    def _calculate_gaussian_curvature(self, U: np.ndarray, V: np.ndarray) -> np.ndarray:
        """Calculate Gaussian curvature of the Klein bottle surface."""
        # Simplified curvature calculation
        K = np.abs(np.sin(U) * np.cos(V)) + 0.1 * np.abs(np.cos(U/2))
        return K
    
    def generate_ctc_path(self, time: float, resolution: int = 100) -> Dict[str, np.ndarray]:
        """
        Generate the closed timelike curve path.
        
        Args:
            time: Current time parameter
            resolution: Number of points on the curve
            
        Returns:
            Dictionary with CTC path coordinates
        """
        t = np.linspace(0, 2*math.pi, resolution)
        phase = time * 2 * math.pi / self.period
        
        # CTC parameterization - helical path in spacetime
        radius = 1.5
        
        x = radius * np.cos(t + phase)
        y = radius * np.sin(t + phase)
        z = 0.5 * np.sin(2*t + phase)
        
        # Add proper time component (4th dimension projected)
        proper_time = t / (2*math.pi) * self.period
        
        return {
            'x': x,
            'y': y,
            'z': z,
            't': proper_time,
            'phase': phase
        }
    
    def calculate_electromagnetic_field_lines(self, 
                                            origin: Tuple[float, float, float] = (0, 0, 0),
                                            num_lines: int = 8,
                                            max_radius: float = 3.0) -> List[Dict[str, np.ndarray]]:
        """
        Calculate electromagnetic field lines for charged fermions.
        
        Args:
            origin: Origin point for field lines
            num_lines: Number of field lines
            max_radius: Maximum radius for field lines
            
        Returns:
            List of field line data
        """
        if abs(self.charge) < 1e-6:
            return []  # No field lines for neutral particles
        
        field_lines = []
        
        for i in range(num_lines):
            angle = (i / num_lines) * 2 * math.pi
            
            # Radial field line from origin
            r = np.linspace(0.5, max_radius, 50)
            
            x = r * np.cos(angle)
            y = r * np.sin(angle)
            z = 0.2 * np.sin(r * 2)  # Slight z-modulation
            
            # Field strength (Coulomb-like)
            field_strength = abs(self.charge) / (r**2 + 0.1)  # Regularized
            
            field_lines.append({
                'x': x,
                'y': y,
                'z': z,
                'field_strength': field_strength,
                'charge_sign': np.sign(self.charge)
            })
        
        return field_lines
    
    def evolve_twist_angle(self, time: float, evolution_type: str = 'oscillation') -> float:
        """
        Calculate time evolution of twist angle.
        
        Args:
            time: Time parameter
            evolution_type: Type of evolution ('oscillation', 'decay', 'growth')
            
        Returns:
            Evolved twist angle
        """
        base_angle = self.properties.twist_angle
        
        if evolution_type == 'oscillation':
            # Small oscillations around equilibrium
            amplitude = 0.1
            frequency = 0.5
            return base_angle + amplitude * np.sin(frequency * time)
        
        elif evolution_type == 'decay':
            # Exponential decay (e.g., for unstable particles)
            decay_rate = 0.1
            return base_angle * np.exp(-decay_rate * time)
        
        elif evolution_type == 'growth':
            # Growth with saturation
            growth_rate = 0.05
            max_angle = base_angle * 1.5
            return max_angle * (1 - np.exp(-growth_rate * time))
        
        else:
            return base_angle
    
    def calculate_beta_decay_transition(self, target_fermion: 'FermionSKB', time: float) -> Dict[str, float]:
        """
        Calculate beta decay transition probabilities in SKB framework.
        
        Args:
            target_fermion: Target fermion after decay
            time: Time parameter
            
        Returns:
            Transition data including matrix elements and probabilities
        """
        # Transition matrix element for d → u + W⁻
        # Based on topological transition of Klein bottle structure
        
        theta_diff = abs(self.twist_angle - target_fermion.twist_angle)
        
        # Weak interaction coupling (from paper)
        g_w = 0.63  # Weak coupling constant
        theta_w = theta_diff  # Weinberg angle approximation
        
        # CKM matrix element (for flavor mixing)
        V_ud = 0.974
        
        # Transition matrix element
        matrix_element = g_w * np.sin(theta_w/2) / np.sqrt(2*math.pi) * V_ud
        
        # Phase space factor (3-body decay: n → p + e⁻ + ν̄)
        Q = abs(self.mass - target_fermion.mass)  # Energy release
        if Q > 0:
            phase_space = Q**5 / (5760 * math.pi**3)  # 3-body phase space
        else:
            phase_space = 0
        
        # Decay rate
        decay_rate = abs(matrix_element)**2 * phase_space
        
        # Survival probability
        survival_prob = np.exp(-decay_rate * time)
        
        return {
            'matrix_element': matrix_element,
            'decay_rate': decay_rate,
            'survival_probability': survival_prob,
            'theta_difference': theta_diff,
            'energy_release': Q,
            'phase_space_factor': phase_space
        }


class FermionEvolutionSystem:
    """System for managing multiple fermions and their interactions."""
    
    def __init__(self):
        self.fermions: List[FermionSKB] = []
        
        # Standard fermion properties from the paper
        self.standard_fermions = {
            'up': FermionProperties(
                name='Up Quark',
                mass=2.3,  # MeV/c²
                charge=2/3,
                twist_angle=2*math.pi/3 + 0.10,
                period=1.2,
                color='#ff4444'
            ),
            'down': FermionProperties(
                name='Down Quark',
                mass=4.8,  # MeV/c²
                charge=-1/3,
                twist_angle=4*math.pi/3 - 0.20,
                period=0.9,
                color='#4444ff'
            ),
            'electron': FermionProperties(
                name='Electron',
                mass=0.511,  # MeV/c²
                charge=-1,
                twist_angle=math.pi,
                period=2.1,
                color='#44ff44'
            ),
            'muon': FermionProperties(
                name='Muon',
                mass=105.7,  # MeV/c²
                charge=-1,
                twist_angle=math.pi + 0.3,
                period=0.3,
                color='#ff44ff'
            ),
            'neutrino': FermionProperties(
                name='Neutrino',
                mass=0.001,  # MeV/c²
                charge=0,
                twist_angle=math.pi/2,
                period=10.0,
                color='#ffff44'
            )
        }
    
    def create_fermion(self, fermion_type: str) -> FermionSKB:
        """Create a fermion of the specified type."""
        if fermion_type not in self.standard_fermions:
            raise ValueError(f"Unknown fermion type: {fermion_type}")
        
        properties = self.standard_fermions[fermion_type]
        fermion = FermionSKB(properties)
        self.fermions.append(fermion)
        return fermion
    
    def calculate_neutron_lifetime(self) -> Dict[str, float]:
        """
        Calculate neutron lifetime using SKB beta decay framework.
        
        Returns:
            Dictionary with lifetime calculation results
        """
        # Create neutron (udd) and proton (uud) systems
        down_quark = self.create_fermion('down')
        up_quark = self.create_fermion('up')
        
        # Beta decay transition: d → u + W⁻
        transition_data = down_quark.calculate_beta_decay_transition(up_quark, 0)
        
        # Neutron lifetime = 1 / decay_rate
        lifetime = 1.0 / transition_data['decay_rate'] if transition_data['decay_rate'] > 0 else np.inf
        
        # Scale to experimental units (seconds)
        # This scaling factor would come from fundamental theory
        time_scale = 885.0  # seconds (from paper prediction)
        lifetime_seconds = lifetime * time_scale
        
        return {
            'lifetime_natural_units': lifetime,
            'lifetime_seconds': lifetime_seconds,
            'decay_rate': transition_data['decay_rate'],
            'experimental_value': 879.4,  # seconds
            'agreement': abs(lifetime_seconds - 879.4) / 879.4
        }
    
    def calculate_scattering_cross_section(self, fermion1: str, fermion2: str) -> Dict[str, float]:
        """
        Calculate scattering cross section between two fermions.
        
        Args:
            fermion1: First fermion type
            fermion2: Second fermion type
            
        Returns:
            Cross section calculation results
        """
        f1 = self.create_fermion(fermion1)
        f2 = self.create_fermion(fermion2)
        
        # Multi-handle interaction (from paper)
        # σ = 4πr₀² (∑ A_ij)² (1 + spin_factor)
        
        r0 = 1.0  # Characteristic length scale (fm)
        
        # Handle coupling strengths
        A_ij = abs(f1.charge * f2.charge)  # Electromagnetic
        
        # Add strong interaction for quarks
        if 'quark' in f1.properties.name.lower() and 'quark' in f2.properties.name.lower():
            A_ij += 1.0  # Strong coupling contribution
        
        # Spin factor from CTC topology
        spin_factor = 0.25 * np.sin(f1.twist_angle)**2 * np.sin(f2.twist_angle)**2
        
        # Cross section
        cross_section = 4 * math.pi * r0**2 * A_ij**2 * (1 + spin_factor)
        
        return {
            'cross_section_natural': cross_section,
            'cross_section_barns': cross_section * 10,  # Convert to barns (approximation)
            'electromagnetic_coupling': abs(f1.charge * f2.charge),
            'spin_factor': spin_factor
        }


# Export commonly used functions
def create_fermion_evolution_system() -> FermionEvolutionSystem:
    """Create a new fermion evolution system."""
    return FermionEvolutionSystem()


def calculate_klein_bottle_fermion(fermion_type: str, time: float = 0) -> Dict:
    """
    Quick function to calculate Klein bottle representation of a fermion.
    
    Args:
        fermion_type: Type of fermion ('up', 'down', 'electron', etc.)
        time: Time parameter for evolution
        
    Returns:
        Klein bottle coordinate data
    """
    system = FermionEvolutionSystem()
    fermion = system.create_fermion(fermion_type)
    return fermion.generate_klein_bottle_coordinates(time=time) 