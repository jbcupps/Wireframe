"""
Methodical search tools for systematic exploration of manifold configurations.
"""

import numpy as np
from typing import Dict, List, Any, Tuple, Optional
import itertools

class Parameter:
    """Parameter to be searched in a methodical way."""
    
    def __init__(self, name: str, min_val: float, max_val: float, steps: int):
        """
        Initialize a parameter for methodical search.
        
        Args:
            name: Parameter name
            min_val: Minimum value
            max_val: Maximum value
            steps: Number of steps for search
        """
        self.name = name
        self.min_val = min_val
        self.max_val = max_val
        self.steps = steps
        
    def get_values(self) -> List[float]:
        """Get evenly spaced values for this parameter."""
        return list(np.linspace(self.min_val, self.max_val, self.steps))

class SearchSpace:
    """Defines a parameter space for methodical search."""
    
    def __init__(self, parameters: List[Parameter]):
        """
        Initialize search space with parameters.
        
        Args:
            parameters: List of Parameter objects
        """
        self.parameters = parameters
        
    def get_all_combinations(self) -> List[Dict[str, float]]:
        """
        Generate all parameter combinations for the search space.
        
        Returns:
            List of dictionaries with parameter combinations
        """
        param_values = [param.get_values() for param in self.parameters]
        param_names = [param.name for param in self.parameters]
        
        combinations = []
        for values in itertools.product(*param_values):
            combination = {
                param_names[i]: values[i] 
                for i in range(len(param_names))
            }
            combinations.append(combination)
            
        return combinations

class IterativeSearch:
    """
    Manages iterative searching through parameter spaces based on theoretical targets.
    This implementation is based on the categorical framework for topological features
    of Spacetime Klein Bottles (SKBs) in particle physics.
    """
    
    # Constants based on theoretical particle properties
    QUARK_CHARGES = {
        'up': 2/3,
        'down': -1/3,
        'charm': 2/3,
        'strange': -1/3,
        'top': 2/3,
        'bottom': -1/3
    }
    
    LEPTON_CHARGES = {
        'electron': -1,
        'muon': -1,
        'tau': -1,
        'electron_neutrino': 0,
        'muon_neutrino': 0,
        'tau_neutrino': 0
    }
    
    BARYON_CONFIGS = {
        'proton': [2/3, 2/3, -1/3],  # uud
        'neutron': [2/3, -1/3, -1/3],  # udd
        'delta++': [2/3, 2/3, 2/3],  # uuu
        'lambda': [2/3, -1/3, -1/3]   # uds (simplified)
    }
    
    def __init__(self):
        """Initialize the iterative search."""
        self.iteration_history = []
        self.best_configurations = {}
        self.current_iteration = 0
        
    def generate_twist_targets(self, target_type: str) -> List[float]:
        """
        Generate twist sum targets based on theoretical particle properties.
        
        Args:
            target_type: Type of target ('quark', 'lepton', 'baryon', 'all')
            
        Returns:
            List of twist sum targets
        """
        targets = []
        
        if target_type in ['quark', 'all']:
            targets.extend(list(self.QUARK_CHARGES.values()))
            
        if target_type in ['lepton', 'all']:
            targets.extend(list(self.LEPTON_CHARGES.values()))
            
        if target_type in ['baryon', 'all']:
            # For baryons, we're targeting individual quark components
            for config in self.BARYON_CONFIGS.values():
                targets.extend(config)
                
        return sorted(list(set(targets)))  # Remove duplicates and sort
        
    def generate_loop_factor_targets(self) -> List[float]:
        """
        Generate loop factor targets based on theoretical considerations.
        In the SKB model, loop factors may correlate with generation or spin.
        
        Returns:
            List of loop factor targets
        """
        # Basic loop factors: 1.0 = first generation, 2.0 = second generation, 3.0 = third generation
        # Half-integer values may correspond to half-integer spin states
        return [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
        
    def generate_theoretical_targets(self, particle_type: str = 'all') -> List[Dict[str, float]]:
        """
        Generate theoretical target configurations based on the categorical framework.
        
        Args:
            particle_type: Type of particle targets to generate
            
        Returns:
            List of target property dictionaries
        """
        twist_targets = self.generate_twist_targets(particle_type)
        loop_targets = self.generate_loop_factor_targets()
        
        targets = []
        for twist in twist_targets:
            for loop in loop_targets:
                targets.append({
                    'twist_sum': twist,
                    'loop_factor': loop,
                    'twist_weight': 0.7,  # Higher weight for twist sum as it correlates with charge
                    'loop_weight': 0.3,
                    'theoretical_basis': self._get_theoretical_description(twist, loop)
                })
                
        return targets
    
    def _get_theoretical_description(self, twist_sum: float, loop_factor: float) -> str:
        """
        Get theoretical description for a given twist sum and loop factor.
        
        Args:
            twist_sum: The twist sum value
            loop_factor: The loop factor value
            
        Returns:
            Description string
        """
        # Find matching particle for twist sum
        particle_desc = []
        
        # Check quarks
        for quark, charge in self.QUARK_CHARGES.items():
            if abs(twist_sum - charge) < 0.1:  # Close enough to the charge
                particle_desc.append(f"{quark} quark (charge {charge})")
                
        # Check leptons
        for lepton, charge in self.LEPTON_CHARGES.items():
            if abs(twist_sum - charge) < 0.1:
                particle_desc.append(f"{lepton} (charge {charge})")
                
        # Generation based on loop factor
        generation = "unknown"
        if 0.5 <= loop_factor < 1.5:
            generation = "first"
        elif 1.5 <= loop_factor < 2.5:
            generation = "second"
        elif 2.5 <= loop_factor <= 3.5:
            generation = "third"
            
        if not particle_desc:
            particle_desc = ["unknown particle"]
            
        return f"May represent {', '.join(particle_desc)} of {generation} generation"
        
    def run_iterative_search(self, 
                             parameter_space: Dict[str, Dict[str, float]],
                             target_type: str = 'all',
                             max_targets: int = 5,
                             optimize_each: bool = False) -> Dict[str, Any]:
        """
        Run iterative search for multiple theoretical targets.
        
        Args:
            parameter_space: Parameter space configuration
            target_type: Type of targets to search for
            max_targets: Maximum number of targets to search
            optimize_each: Whether to optimize each target separately
            
        Returns:
            Dictionary with search results
        """
        self.current_iteration += 1
        iteration_results = []
        
        # Create parameter objects
        parameters = []
        for param_name, param_config in parameter_space.items():
            min_val = float(param_config.get('min', 0))
            max_val = float(param_config.get('max', 1))
            steps = min(int(param_config.get('steps', 10)), 20)  # Limit steps
            
            parameters.append(Parameter(
                name=param_name,
                min_val=min_val,
                max_val=max_val,
                steps=steps
            ))
            
        search_space = SearchSpace(parameters)
        all_combinations = search_space.get_all_combinations()
        
        # Get theoretical targets
        targets = self.generate_theoretical_targets(target_type)
        if len(targets) > max_targets:
            targets = targets[:max_targets]
            
        # Evaluate each combination for each target
        for target_props in targets:
            target_results = []
            best_error = float('inf')
            best_config = None
            
            for params in all_combinations:
                # Calculate error
                error = evaluate_configuration(params, target_props)
                
                result = {
                    'parameters': params,
                    'error': error,
                    'target': target_props
                }
                
                if error < best_error:
                    best_error = error
                    best_config = result
                    
                if optimize_each:
                    target_results.append(result)
            
            # Store best configuration for this target
            target_key = f"twist_{target_props['twist_sum']}_loop_{target_props['loop_factor']}"
            self.best_configurations[target_key] = best_config
            
            if optimize_each:
                # Sort results for this target
                target_results.sort(key=lambda x: x['error'])
                iteration_results.append({
                    'target': target_props,
                    'results': target_results[:10],  # Top 10 results
                    'best_configuration': best_config
                })
            else:
                # Just store the best configuration
                iteration_results.append({
                    'target': target_props,
                    'best_configuration': best_config
                })
                
        # Store in history
        self.iteration_history.append({
            'iteration': self.current_iteration,
            'parameter_space': parameter_space,
            'targets': targets,
            'results': iteration_results
        })
        
        return {
            'iteration': self.current_iteration,
            'parameter_space': parameter_space,
            'targets': targets,
            'results': iteration_results,
            'combinations_evaluated': len(all_combinations),
            'total_targets': len(targets)
        }

def evaluate_configuration(params: Dict[str, float], target_properties: Dict[str, float]) -> float:
    """
    Evaluate a specific parameter configuration against target properties.
    
    Args:
        params: Dictionary of parameter values (twist_x, twist_y, twist_z, loop_factor)
        target_properties: Dictionary of target values and weights
        
    Returns:
        Error score (lower is better)
    """
    # Safely extract parameters with defaults
    twist_x = params.get('twist_x', 0.0)
    twist_y = params.get('twist_y', 0.0)
    twist_z = params.get('twist_z', 0.0)
    loop_factor = params.get('loop_factor', 1.0)
    
    # Calculate the twist sum
    twist_sum = twist_x + twist_y + twist_z
    
    # Safely extract target properties with defaults
    target_twist_sum = target_properties.get('twist_sum', 0.0)
    target_loop_factor = target_properties.get('loop_factor', 1.0)
    twist_weight = target_properties.get('twist_weight', 0.6)
    loop_weight = target_properties.get('loop_weight', 0.4)
    
    # Calculate error components
    twist_error = abs(twist_sum - target_twist_sum)
    loop_error = abs(loop_factor - target_loop_factor)
    
    # Normalize errors (assuming reasonable ranges)
    # Use max() to prevent division by zero
    normalized_twist_error = twist_error / max(5.0, abs(target_twist_sum) * 2.0)  # Assuming max difference of 5
    normalized_loop_error = loop_error / max(2.0, abs(target_loop_factor) * 2.0)   # Assuming max difference of 2
    
    # Calculate weighted error (ensure weights sum to 1.0)
    total_weight = twist_weight + loop_weight
    if total_weight <= 0:
        total_weight = 1.0  # Fallback if weights are invalid
        
    # Normalize weights if needed
    twist_weight_norm = twist_weight / total_weight
    loop_weight_norm = loop_weight / total_weight
    
    weighted_error = (
        twist_weight_norm * normalized_twist_error +
        loop_weight_norm * normalized_loop_error
    )
    
    # Physical interpretation:
    # - Twist sum correlates with charge in the SKB model
    # - Loop factor relates to the topology/periodicity
    #
    # Lower error means the configuration is closer to the target properties
    
    return weighted_error 