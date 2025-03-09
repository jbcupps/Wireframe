"""
Maxwell-Boltzmann distribution model and visualization.
"""

import numpy as np
from typing import Dict, Any, List, Tuple

def maxwell_boltzmann_pdf(v: np.ndarray, mass: float, temperature: float) -> np.ndarray:
    """
    Calculate the Maxwell-Boltzmann probability density function.
    
    Args:
        v: Velocity array
        mass: Particle mass in atomic mass units (amu)
        temperature: Temperature in Kelvin
        
    Returns:
        Probability density values
    """
    # Constants
    k_B = 1.380649e-23  # Boltzmann constant (J/K)
    amu_to_kg = 1.66053886e-27  # Conversion from amu to kg
    
    # Convert mass to kg
    m_kg = mass * amu_to_kg
    
    # Maxwell-Boltzmann distribution formula
    prefactor = np.sqrt(2/np.pi) * (m_kg / (k_B * temperature))**(3/2)
    exponent = -m_kg * v**2 / (2 * k_B * temperature)
    
    return prefactor * v**2 * np.exp(exponent)

def generate_maxwell_boltzmann_data(
    temperature: float = 300.0,
    mass: float = 1.0,
    particle_count: int = 1000
) -> Dict[str, Any]:
    """
    Generate Maxwell-Boltzmann distribution data.
    
    Args:
        temperature: Temperature in Kelvin
        mass: Particle mass in atomic mass units (amu)
        particle_count: Number of particles to simulate
        
    Returns:
        Dictionary with distribution data
    """
    # Constants
    k_B = 1.380649e-23  # Boltzmann constant (J/K)
    amu_to_kg = 1.66053886e-27  # Conversion from amu to kg
    
    # Convert mass to kg
    m_kg = mass * amu_to_kg
    
    # Calculate most probable velocity
    v_mp = np.sqrt(2 * k_B * temperature / m_kg)
    
    # Calculate average velocity
    v_avg = np.sqrt(8 * k_B * temperature / (np.pi * m_kg))
    
    # Calculate RMS velocity
    v_rms = np.sqrt(3 * k_B * temperature / m_kg)
    
    # Velocity range for plotting
    v_max = 5 * v_mp
    velocity = np.linspace(0, v_max, 200)
    
    # Calculate distribution
    distribution = maxwell_boltzmann_pdf(velocity, mass, temperature)
    
    # Generate random particle velocities following the distribution
    # Using a rejection sampling approach
    particles = []
    v_range = np.linspace(0, v_max, 1000)
    pdf = maxwell_boltzmann_pdf(v_range, mass, temperature)
    pdf_max = np.max(pdf)
    
    count = 0
    while len(particles) < particle_count and count < particle_count * 10:
        count += 1
        v_candidate = np.random.uniform(0, v_max)
        p_candidate = np.random.uniform(0, pdf_max)
        
        # Interpolate PDF at candidate velocity
        v_idx = int(v_candidate / v_max * (len(v_range) - 1))
        p_accept = pdf[v_idx] / pdf_max
        
        if p_candidate <= p_accept:
            # Generate random 3D direction
            theta = np.random.uniform(0, np.pi)
            phi = np.random.uniform(0, 2 * np.pi)
            
            vx = v_candidate * np.sin(theta) * np.cos(phi)
            vy = v_candidate * np.sin(theta) * np.sin(phi)
            vz = v_candidate * np.cos(theta)
            
            particles.append([vx, vy, vz])
    
    particles = particles[:particle_count]  # Ensure we have exactly particle_count
    
    # Calculate statistics
    speeds = np.sqrt(np.sum(np.array(particles)**2, axis=1))
    mean_speed = np.mean(speeds)
    median_speed = np.median(speeds)
    
    return {
        "distribution": {
            "velocity": velocity.tolist(),
            "pdf": distribution.tolist(),
            "v_mp": float(v_mp),
            "v_avg": float(v_avg),
            "v_rms": float(v_rms)
        },
        "particles": {
            "velocities": particles,
            "speeds": speeds.tolist(),
            "mean_speed": float(mean_speed),
            "median_speed": float(median_speed)
        },
        "parameters": {
            "temperature": temperature,
            "mass": mass,
            "particle_count": len(particles),
            "mass_kg": float(m_kg)
        }
    } 