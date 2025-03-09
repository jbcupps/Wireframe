"""
Electromagnetic field model and visualization.
"""

import numpy as np
from typing import Dict, Any, List, Tuple

def electric_field_point_charge(x: np.ndarray, y: np.ndarray, z: np.ndarray, 
                                charge: float, position: Tuple[float, float, float]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Calculate electric field from a point charge.
    
    Args:
        x, y, z: Grid coordinates
        charge: Charge value
        position: Charge position (x, y, z)
        
    Returns:
        Electric field components (Ex, Ey, Ez)
    """
    # Constants
    k = 8.9875517923e9  # Coulomb constant (N·m²/C²)
    
    # Distance from charge
    rx = x - position[0]
    ry = y - position[1]
    rz = z - position[2]
    r = np.sqrt(rx**2 + ry**2 + rz**2)
    
    # Avoid division by zero
    r = np.maximum(r, 1e-10)
    
    # Electric field components
    prefactor = k * charge / r**3
    Ex = prefactor * rx
    Ey = prefactor * ry
    Ez = prefactor * rz
    
    return Ex, Ey, Ez

def magnetic_field_current_loop(x: np.ndarray, y: np.ndarray, z: np.ndarray,
                               current: float, radius: float, position: Tuple[float, float, float], 
                               orientation: Tuple[float, float, float]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Calculate magnetic field from a current loop.
    
    Args:
        x, y, z: Grid coordinates
        current: Current in amperes
        radius: Loop radius in meters
        position: Loop center position (x, y, z)
        orientation: Loop orientation unit vector
        
    Returns:
        Magnetic field components (Bx, By, Bz)
    """
    # Constants
    mu0 = 4 * np.pi * 1e-7  # Vacuum permeability (H/m)
    
    # Normalized orientation vector
    ox, oy, oz = orientation
    norm = np.sqrt(ox**2 + oy**2 + oz**2)
    if norm > 0:
        ox, oy, oz = ox/norm, oy/norm, oz/norm
    else:
        ox, oy, oz = 0, 0, 1  # Default to z-axis
    
    # Displaced coordinates
    x_d = x - position[0]
    y_d = y - position[1]
    z_d = z - position[2]
    
    # Distance from loop center along orientation
    dist_along_axis = ox * x_d + oy * y_d + oz * z_d
    
    # Distance perpendicular to orientation
    x_perp = x_d - dist_along_axis * ox
    y_perp = y_d - dist_along_axis * oy
    z_perp = z_d - dist_along_axis * oz
    rho = np.sqrt(x_perp**2 + y_perp**2 + z_perp**2)
    
    # Simplified magnetic field calculation (Biot-Savart approximation)
    # This is a simple model for visualization purposes
    factor = (mu0 * current * radius**2) / (2 * (radius**2 + (rho - radius)**2 + dist_along_axis**2)**(3/2))
    
    Bx = factor * ox
    By = factor * oy
    Bz = factor * oz
    
    return Bx, By, Bz

def generate_electromagnetic_field(
    field_type: str = 'electric',
    source_type: str = 'point_charge',
    grid_size: int = 20
) -> Dict[str, Any]:
    """
    Generate electromagnetic field visualization data.
    
    Args:
        field_type: Type of field ('electric', 'magnetic', or 'both')
        source_type: Source configuration ('point_charge', 'dipole', 'current_loop')
        grid_size: Size of the simulation grid
        
    Returns:
        Dictionary with field data
    """
    # Create grid
    x = np.linspace(-1, 1, grid_size)
    y = np.linspace(-1, 1, grid_size)
    z = np.linspace(-1, 1, grid_size)
    X, Y, Z = np.meshgrid(x, y, z)
    
    # Initialize field components
    Ex = np.zeros_like(X)
    Ey = np.zeros_like(Y)
    Ez = np.zeros_like(Z)
    Bx = np.zeros_like(X)
    By = np.zeros_like(Y)
    Bz = np.zeros_like(Z)
    
    # Calculate electric field if needed
    if field_type in ['electric', 'both']:
        if source_type == 'point_charge':
            # Single point charge
            Ex_point, Ey_point, Ez_point = electric_field_point_charge(
                X, Y, Z, charge=1.0, position=(0, 0, 0))
            Ex += Ex_point
            Ey += Ey_point
            Ez += Ez_point
            
        elif source_type == 'dipole':
            # Electric dipole (two opposite charges)
            Ex_pos, Ey_pos, Ez_pos = electric_field_point_charge(
                X, Y, Z, charge=1.0, position=(0, 0, 0.2))
            Ex_neg, Ey_neg, Ez_neg = electric_field_point_charge(
                X, Y, Z, charge=-1.0, position=(0, 0, -0.2))
            Ex += Ex_pos + Ex_neg
            Ey += Ey_pos + Ey_neg
            Ez += Ez_pos + Ez_neg
    
    # Calculate magnetic field if needed
    if field_type in ['magnetic', 'both']:
        if source_type == 'current_loop':
            # Current loop in xy-plane
            Bx_loop, By_loop, Bz_loop = magnetic_field_current_loop(
                X, Y, Z, current=1.0, radius=0.5, position=(0, 0, 0), orientation=(0, 0, 1))
            Bx += Bx_loop
            By += By_loop
            Bz += Bz_loop
            
        elif source_type == 'dipole':
            # Magnetic dipole (two perpendicular current loops)
            Bx_loop1, By_loop1, Bz_loop1 = magnetic_field_current_loop(
                X, Y, Z, current=1.0, radius=0.5, position=(0, 0, 0), orientation=(0, 0, 1))
            Bx_loop2, By_loop2, Bz_loop2 = magnetic_field_current_loop(
                X, Y, Z, current=1.0, radius=0.5, position=(0, 0, 0), orientation=(0, 1, 0))
            Bx += Bx_loop1 + Bx_loop2
            By += By_loop1 + By_loop2
            Bz += Bz_loop1 + Bz_loop2
    
    # Calculate field magnitudes
    E_mag = np.sqrt(Ex**2 + Ey**2 + Ez**2)
    B_mag = np.sqrt(Bx**2 + By**2 + Bz**2)
    
    # Prepare data for visualization (subsample for clarity)
    stride = max(1, grid_size // 8)
    
    # Create output data structure
    field_data = {
        "grid": {
            "x": x.tolist(),
            "y": y.tolist(),
            "z": z.tolist()
        },
        "parameters": {
            "field_type": field_type,
            "source_type": source_type,
            "grid_size": grid_size
        }
    }
    
    # Add electric field data if calculated
    if field_type in ['electric', 'both']:
        field_data["electric_field"] = {
            "components": {
                "Ex": Ex[::stride, ::stride, ::stride].tolist(),
                "Ey": Ey[::stride, ::stride, ::stride].tolist(),
                "Ez": Ez[::stride, ::stride, ::stride].tolist()
            },
            "magnitude": E_mag[::stride, ::stride, ::stride].tolist(),
            "vectors": {
                "x": X[::stride, ::stride, ::stride].flatten().tolist(),
                "y": Y[::stride, ::stride, ::stride].flatten().tolist(),
                "z": Z[::stride, ::stride, ::stride].flatten().tolist(),
                "u": Ex[::stride, ::stride, ::stride].flatten().tolist(),
                "v": Ey[::stride, ::stride, ::stride].flatten().tolist(),
                "w": Ez[::stride, ::stride, ::stride].flatten().tolist()
            }
        }
    
    # Add magnetic field data if calculated
    if field_type in ['magnetic', 'both']:
        field_data["magnetic_field"] = {
            "components": {
                "Bx": Bx[::stride, ::stride, ::stride].tolist(),
                "By": By[::stride, ::stride, ::stride].tolist(),
                "Bz": Bz[::stride, ::stride, ::stride].tolist()
            },
            "magnitude": B_mag[::stride, ::stride, ::stride].tolist(),
            "vectors": {
                "x": X[::stride, ::stride, ::stride].flatten().tolist(),
                "y": Y[::stride, ::stride, ::stride].flatten().tolist(),
                "z": Z[::stride, ::stride, ::stride].flatten().tolist(),
                "u": Bx[::stride, ::stride, ::stride].flatten().tolist(),
                "v": By[::stride, ::stride, ::stride].flatten().tolist(),
                "w": Bz[::stride, ::stride, ::stride].flatten().tolist()
            }
        }
    
    return field_data 