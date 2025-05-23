"""
Evolution Service for SKB Visualization Application.
Handles evolutionary algorithm computations for finding compatible Sub-SKBs.
"""

import random
import logging
from typing import Dict, List, Any, Tuple

from .topology_service import TopologyService

logger = logging.getLogger(__name__)


class EvolutionService:
    """Service for evolutionary algorithm computations."""
    
    def __init__(self):
        """Initialize evolution service."""
        self.topology_service = TopologyService()
    
    def run_evolution(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run evolutionary algorithm to find compatible Sub-SKBs.
        
        Args:
            data: Request data containing evolution parameters
            
        Returns:
            Dict containing evolution results
        """
        logger.info("Starting evolutionary algorithm computation")
        
        # Extract parameters with defaults
        generations = int(data.get('generations', 10))
        population_size = int(data.get('population_size', 20))
        mutation_rate = float(data.get('mutation_rate', 0.1))
        
        # Weights for fitness components
        weights = self._extract_weights(data)
        
        # Target values
        targets = self._extract_targets(data)
        
        # Initialize population
        population = self._initialize_population(population_size)
        
        # Track results
        best_individuals = []
        compatible_pairs = []
        
        # Run evolution
        for generation in range(generations):
            # Evaluate fitness
            fitness_scores = self._evaluate_fitness(population, weights, targets)
            
            # Track best individual
            best_idx = fitness_scores.index(max(fitness_scores))
            best_individuals.append({
                'generation': generation,
                'parameters': population[best_idx],
                'fitness': fitness_scores[best_idx]
            })
            
            # Check for compatible pairs
            compatible_pairs.extend(
                self._find_compatible_pairs(population, generation)
            )
            
            # Create new generation
            population = self._create_new_generation(
                population, fitness_scores, population_size, mutation_rate
            )
        
        logger.info(f"Evolution completed with {len(best_individuals)} generations")
        
        return {
            'best_individuals': best_individuals,
            'compatible_pairs': compatible_pairs
        }
    
    def _extract_weights(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Extract fitness weights from request data."""
        return {
            'w1': float(data.get('w1_weight', 1.0)),
            'euler': float(data.get('euler_weight', 1.0)),
            'q': float(data.get('q_weight', 1.0)),
            'twist': float(data.get('twist_weight', 1.0)),
            'ctc': float(data.get('ctc_weight', 1.0))
        }
    
    def _extract_targets(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract target values from request data."""
        return {
            'orientability': data.get('target_orientability', 'orientable'),
            'euler': int(data.get('target_euler', 0)),
            'q_form': data.get('target_q_form', 'indefinite')
        }
    
    def _initialize_population(self, population_size: int) -> List[Dict[str, float]]:
        """Initialize random population of Sub-SKBs."""
        population = []
        for _ in range(population_size):
            skb = {
                'tx': random.uniform(-5, 5),
                'ty': random.uniform(-5, 5),
                'tz': random.uniform(-5, 5),
                'tt': random.uniform(-1, 1),  # Time twist parameter
                'orientable': 1 if random.random() > 0.5 else 0,
                'genus': random.randint(0, 3)
            }
            population.append(skb)
        return population
    
    def _evaluate_fitness(
        self, 
        population: List[Dict[str, float]], 
        weights: Dict[str, float],
        targets: Dict[str, Any]
    ) -> List[float]:
        """Evaluate fitness for each individual in the population."""
        fitness_scores = []
        
        for skb in population:
            # Calculate topological properties
            orientable = skb['orientable']
            genus = skb['genus']
            
            # Calculate Euler characteristic
            euler = 2 - 2 * genus if orientable == 1 else 2 - genus
            
            # Calculate intersection form type
            q_form = "Positive Definite" if skb['tx'] * skb['ty'] > 0 else "Indefinite"
            
            # Calculate fitness components
            w1_fitness = 1.0 if (
                (orientable == 1 and targets['orientability'] == 'orientable') or
                (orientable == 0 and targets['orientability'] == 'non-orientable')
            ) else 0.0
            
            euler_fitness = 1.0 / (1.0 + abs(euler - targets['euler']))
            q_fitness = 1.0 if q_form == targets['q_form'] else 0.0
            
            # Twist alignment - prefer values that would cancel out when combined
            twist_fitness = 1.0 / (1.0 + abs(skb['tx']) + abs(skb['ty']) + abs(skb['tz']))
            
            # CTC stability - prefer moderate time twist values
            ctc_fitness = 1.0 - abs(skb['tt'])
            
            # Combined fitness with weights
            fitness = (
                weights['w1'] * w1_fitness +
                weights['euler'] * euler_fitness +
                weights['q'] * q_fitness +
                weights['twist'] * twist_fitness +
                weights['ctc'] * ctc_fitness
            )
            
            fitness_scores.append(fitness)
        
        return fitness_scores
    
    def _find_compatible_pairs(
        self, 
        population: List[Dict[str, float]], 
        generation: int
    ) -> List[Dict[str, Any]]:
        """Find compatible pairs in the current population."""
        compatible_pairs = []
        
        for i in range(len(population)):
            for j in range(i + 1, len(population)):
                compatibility = self.topology_service.compute_compatibility_internal(
                    population[i], population[j]
                )
                if compatibility.get('compatible', False):
                    compatible_pairs.append({
                        'generation': generation,
                        'skb1': population[i],
                        'skb2': population[j],
                        'details': compatibility
                    })
        
        return compatible_pairs
    
    def _create_new_generation(
        self,
        population: List[Dict[str, float]],
        fitness_scores: List[float],
        population_size: int,
        mutation_rate: float
    ) -> List[Dict[str, float]]:
        """Create new generation through selection, crossover, and mutation."""
        # Selection - tournament selection
        new_population = []
        tournament_size = 3
        
        for _ in range(population_size):
            # Tournament selection
            tournament = random.sample(range(population_size), tournament_size)
            best_in_tournament = max(tournament, key=lambda idx: fitness_scores[idx])
            new_population.append(population[best_in_tournament].copy())
        
        # Crossover and Mutation
        for i in range(0, population_size, 2):
            if i + 1 < population_size:
                # Crossover
                if random.random() < 0.7:  # 70% chance of crossover
                    self._crossover(new_population[i], new_population[i + 1])
                
                # Mutation
                for j in range(i, i + 2):
                    if random.random() < mutation_rate:
                        self._mutate(new_population[j])
        
        return new_population
    
    def _crossover(self, parent1: Dict[str, float], parent2: Dict[str, float]) -> None:
        """Perform crossover between two parents."""
        crossover_point = random.choice(['tx', 'ty', 'tz', 'tt', 'orientable', 'genus'])
        parent1[crossover_point], parent2[crossover_point] = \
            parent2[crossover_point], parent1[crossover_point]
    
    def _mutate(self, individual: Dict[str, float]) -> None:
        """Mutate an individual."""
        param = random.choice(['tx', 'ty', 'tz', 'tt', 'orientable', 'genus'])
        
        if param in ['tx', 'ty', 'tz']:
            individual[param] += random.uniform(-1, 1)
            individual[param] = max(-5, min(5, individual[param]))
        elif param == 'tt':
            individual[param] += random.uniform(-0.2, 0.2)
            individual[param] = max(-1, min(1, individual[param]))
        elif param == 'orientable':
            individual[param] = 1 - individual[param]
        elif param == 'genus':
            individual[param] += random.choice([-1, 1])
            individual[param] = max(0, min(3, individual[param])) 