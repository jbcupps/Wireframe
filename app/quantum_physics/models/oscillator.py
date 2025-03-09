"""
Quantum harmonic oscillator model and visualization.
"""

import numpy as np
from typing import Dict, Any, List, Tuple

def quantum_wavefunction(x: np.ndarray, n: int, omega: float) -> np.ndarray:
    """
    Calculate the quantum harmonic oscillator wavefunction.
    
    Args:
        x: Position array
        n: Quantum number (energy level)
        omega: Angular frequency
        
    Returns:
        Wavefunction values
    """
    # Constants
    hbar = 1.0  # Reduced Planck constant (normalized)
    m = 1.0  # Mass (normalized)
    
    # Characteristic length
    alpha = np.sqrt(m * omega / hbar)
    
    # Normalization constant
    from scipy.special import factorial
    N = 1.0 / np.sqrt(2**n * factorial(n)) * (alpha / np.pi)**0.25
    
    # Hermite polynomial (recursively)
    def hermite(x: np.ndarray, n: int) -> np.ndarray:
        if n == 0:
            return np.ones_like(x)
        elif n == 1:
            return 2 * x
        else:
            return 2 * x * hermite(x, n-1) - 2 * (n-1) * hermite(x, n-2)
    
    # Wavefunction
    psi = N * hermite(alpha * x, n) * np.exp(-(alpha * x)**2 / 2)
    
    return psi

def generate_oscillator_data(
    frequency: float = 1.0,
    damping_factor: float = 0.1,
    amplitude: float = 1.0,
    time_range: float = 10.0,
    quantum_n: int = 0
) -> Dict[str, Any]:
    """
    Generate quantum harmonic oscillator data.
    
    Args:
        frequency: Oscillator frequency
        damping_factor: Damping factor
        amplitude: Initial amplitude
        time_range: Time range for simulation
        quantum_n: Quantum number (energy level)
        
    Returns:
        Dictionary with oscillator data
    """
    # Time array
    t = np.linspace(0, time_range, 500)
    
    # Angular frequency
    omega = 2 * np.pi * frequency
    
    # Classic solution
    x_classic = amplitude * np.exp(-damping_factor * t) * np.cos(omega * t)
    
    # Position space for quantum solution
    x_space = np.linspace(-5, 5, 200)
    
    # Quantum wavefunctions for first few states
    psi_values = []
    for n in range(quantum_n + 1):
        psi = quantum_wavefunction(x_space, n, omega)
        psi_values.append(psi.tolist())
    
    # Calculate energy levels
    energy_levels = [(n + 0.5) * omega for n in range(quantum_n + 3)]
    
    # Calculate probability density for selected state
    probability_density = np.abs(quantum_wavefunction(x_space, quantum_n, omega))**2
    
    # Calculate expectation values
    expectation_x = np.sum(x_space * probability_density) / np.sum(probability_density)
    expectation_x2 = np.sum(x_space**2 * probability_density) / np.sum(probability_density)
    uncertainty = np.sqrt(expectation_x2 - expectation_x**2)
    
    return {
        "classical": {
            "time": t.tolist(),
            "position": x_classic.tolist(),
            "frequency": frequency,
            "damping_factor": damping_factor,
            "amplitude": amplitude
        },
        "quantum": {
            "x_space": x_space.tolist(),
            "wavefunctions": psi_values,
            "probability_density": probability_density.tolist(),
            "selected_state": quantum_n,
            "energy_levels": energy_levels,
            "expectation_x": float(expectation_x),
            "uncertainty": float(uncertainty)
        },
        "parameters": {
            "frequency": frequency,
            "omega": float(omega),
            "damping_factor": damping_factor,
            "amplitude": amplitude,
            "quantum_n": quantum_n
        }
    } 