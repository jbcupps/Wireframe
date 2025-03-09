"""
Evolutionary algorithm for Sub-SKB optimization.
"""

import numpy as np
import random
from typing import List, Dict, Any, Tuple, Optional

class SubSKB:
    """Representation of a Sub-SKB for evolutionary optimization."""
    
    def __init__(self, twist_x: float = 0.0, twist_y: float = 0.0, twist_z: float = 0.0, 
                 loop_factor: float = 1.0, time: float = 0.0):
        """Initialize a Sub-SKB with given parameters."""
        self.params = {
            'twist_x': twist_x,
            'twist_y': twist_y,
            'twist_z': twist_z,
            'loop_factor': loop_factor,
            'time': time
        }
        self.fitness = 0.0
        
    def mutate(self, mutation_rate: float) -> None:
        """Apply random mutations to the parameters."""
        for param in ['twist_x', 'twist_y', 'twist_z']:
            if random.random() < mutation_rate:
                # Apply a random change, biased toward small changes
                change = np.random.normal(0, 0.5)
                self.params[param] += change
                
        if random.random() < mutation_rate:
            # Mutate loop factor (smaller changes)
            change = np.random.normal(0, 0.2)
            self.params['loop_factor'] = max(0.1, self.params['loop_factor'] + change)

def run_evolution_algorithm(
    population_size: int = 20,
    generations: int = 10,
    mutation_rate: float = 0.1,
    initial_population: List[Dict[str, float]] = None,
    fitness_criteria: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    Run an evolutionary algorithm to find optimal Sub-SKB configurations.
    
    Args:
        population_size: Size of the population to evolve
        generations: Number of generations to run
        mutation_rate: Probability of mutation for each parameter
        initial_population: Optional list of initial Sub-SKB parameters
        fitness_criteria: Criteria for evaluating fitness
        
    Returns:
        Dictionary with results of the evolution algorithm
    """
    # Initialize population
    population = []
    
    if initial_population and len(initial_population) > 0:
        # Use provided initial population
        for params in initial_population[:population_size]:
            sub_skb = SubSKB(
                twist_x=params.get('twist_x', random.uniform(0, 3)),
                twist_y=params.get('twist_y', random.uniform(0, 3)),
                twist_z=params.get('twist_z', random.uniform(0, 3)),
                loop_factor=params.get('loop_factor', random.uniform(0.5, 2.0)),
                time=params.get('time', 0.0)
            )
            population.append(sub_skb)
    
    # Fill remaining population with random individuals
    while len(population) < population_size:
        sub_skb = SubSKB(
            twist_x=random.uniform(0, 3),
            twist_y=random.uniform(0, 3),
            twist_z=random.uniform(0, 3),
            loop_factor=random.uniform(0.5, 2.0)
        )
        population.append(sub_skb)
    
    # Initialize results tracking
    best_fitness_history = []
    avg_fitness_history = []
    
    # Set default fitness criteria if none provided
    if not fitness_criteria:
        fitness_criteria = {
            'target_twist_sum': 3.0,  # Sum of absolute twist values
            'target_loop_factor': 1.5,  # Ideal loop factor
            'twist_weight': 0.6,      # Importance of twist sum
            'loop_weight': 0.4        # Importance of loop factor
        }
    
    # Evolve for specified generations
    for generation in range(generations):
        # Evaluate fitness
        for individual in population:
            twist_sum = abs(individual.params['twist_x']) + \
                       abs(individual.params['twist_y']) + \
                       abs(individual.params['twist_z'])
            
            # Calculate fitness based on proximity to target values
            twist_fitness = 1.0 / (1.0 + abs(twist_sum - fitness_criteria['target_twist_sum']))
            loop_fitness = 1.0 / (1.0 + abs(individual.params['loop_factor'] - fitness_criteria['target_loop_factor']))
            
            # Weighted fitness
            individual.fitness = (twist_fitness * fitness_criteria['twist_weight'] + 
                                 loop_fitness * fitness_criteria['loop_weight'])
        
        # Sort by fitness (descending)
        population.sort(key=lambda x: x.fitness, reverse=True)
        
        # Record statistics
        best_fitness = population[0].fitness
        avg_fitness = sum(ind.fitness for ind in population) / len(population)
        best_fitness_history.append(best_fitness)
        avg_fitness_history.append(avg_fitness)
        
        # Create new generation
        new_population = []
        
        # Elitism: Keep top 20%
        elite_count = max(1, int(population_size * 0.2))
        new_population.extend(population[:elite_count])
        
        # Create rest of new population
        while len(new_population) < population_size:
            # Tournament selection (select 3 random individuals, pick the best)
            tournament = random.sample(population, min(3, len(population)))
            parent1 = max(tournament, key=lambda x: x.fitness)
            
            tournament = random.sample(population, min(3, len(population)))
            parent2 = max(tournament, key=lambda x: x.fitness)
            
            # Crossover (create child with random parameters from each parent)
            child = SubSKB()
            for param in ['twist_x', 'twist_y', 'twist_z', 'loop_factor']:
                # 50% chance of inheriting from each parent
                child.params[param] = parent1.params[param] if random.random() < 0.5 else parent2.params[param]
            
            # Mutation
            child.mutate(mutation_rate)
            
            new_population.append(child)
        
        # Replace population with new generation
        population = new_population
    
    # Prepare results
    best_individual = max(population, key=lambda x: x.fitness)
    
    # Convert population to serializable format
    final_population = [
        {
            "params": ind.params,
            "fitness": ind.fitness
        }
        for ind in population
    ]
    
    return {
        "best_individual": {
            "params": best_individual.params,
            "fitness": best_individual.fitness
        },
        "best_fitness_history": best_fitness_history,
        "avg_fitness_history": avg_fitness_history,
        "final_population": final_population,
        "generations": generations,
        "population_size": population_size,
        "mutation_rate": mutation_rate
    } 