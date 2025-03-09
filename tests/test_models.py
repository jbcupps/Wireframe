"""
Unit tests for the 4D Manifold Explorer models.
"""

import pytest
import numpy as np
from app.manifold_vis.models.manifold_generators import (
    generate_skb,
    generate_sub_skb,
    calculate_topological_invariants
)
from app.evolution_ai.models.evolution import (
    SubSKB,
    run_evolution_algorithm
)
from app.evolution_ai.iterative.methodical_search import (
    Parameter,
    SearchSpace,
    evaluate_configuration,
    run_methodical_search
)
from app.evolution_ai.ml.prediction import (
    extract_features,
    identify_likely_particle,
    predict_particle_properties
)
from app.quantum_physics.models.oscillator import (
    quantum_wavefunction,
    generate_oscillator_data
)
from app.quantum_physics.models.maxwell_boltzmann import (
    maxwell_boltzmann_pdf,
    generate_maxwell_boltzmann_data
)
from app.quantum_physics.models.electromagnetic import (
    electric_field_point_charge,
    magnetic_field_current_loop,
    generate_electromagnetic_field
)

@pytest.mark.unit
class TestManifoldGenerators:
    """Unit tests for the manifold generator models."""
    
    def test_generate_skb(self):
        """Test SKB generation."""
        twists = (1.0, 0.5, 1.5)
        time = 0.0
        loop_factor = 1.0
        
        result = generate_skb(twists, time, loop_factor)
        
        assert 'x' in result
        assert 'y' in result
        assert 'z' in result
        assert isinstance(result['x'], list)
        assert isinstance(result['y'], list)
        assert isinstance(result['z'], list)
        assert len(result['x']) > 0
        assert len(result['y']) > 0
        assert len(result['z']) > 0
    
    def test_generate_sub_skb(self):
        """Test Sub-SKB generation."""
        twists = (1.0, 0.5, 1.5)
        time = 0.0
        loop_factor = 1.0
        
        result = generate_sub_skb(twists, time, loop_factor)
        
        assert 'x' in result
        assert 'y' in result
        assert 'z' in result
        assert isinstance(result['x'], list)
        assert isinstance(result['y'], list)
        assert isinstance(result['z'], list)
        assert len(result['x']) > 0
        assert len(result['y']) > 0
        assert len(result['z']) > 0
    
    def test_calculate_topological_invariants(self):
        """Test topological invariant calculation."""
        for manifold_type in ['skb', 'sub_skb', 'torus']:
            params = {
                'twist_x': 1.0,
                'twist_y': 0.5,
                'twist_z': 1.5,
                'loop_factor': 1.0,
                'time': 0.0
            }
            
            result = calculate_topological_invariants(manifold_type, params)
            
            assert isinstance(result, dict)
            assert 'manifold_type' in result
            assert 'euler_characteristic' in result
            assert 'orientability' in result
            assert 'genus' in result
            assert 'betti_numbers' in result
            assert 'twist_complexity' in result
            assert 'loop_complexity' in result

@pytest.mark.unit
class TestEvolutionModels:
    """Unit tests for the evolution models."""
    
    def test_sub_skb_class(self):
        """Test the SubSKB class."""
        sub_skb = SubSKB(twist_x=1.0, twist_y=0.5, twist_z=1.5, loop_factor=1.0)
        
        assert sub_skb.params['twist_x'] == 1.0
        assert sub_skb.params['twist_y'] == 0.5
        assert sub_skb.params['twist_z'] == 1.5
        assert sub_skb.params['loop_factor'] == 1.0
        assert sub_skb.fitness == 0.0
        
        # Test mutation
        original_values = sub_skb.params.copy()
        sub_skb.mutate(1.0)  # 100% mutation rate
        
        # At least one parameter should have changed
        assert any(sub_skb.params[param] != original_values[param] for param in original_values)
    
    def test_run_evolution_algorithm(self):
        """Test the evolutionary algorithm."""
        result = run_evolution_algorithm(
            population_size=5,
            generations=3,
            mutation_rate=0.1,
            initial_population=None,
            fitness_criteria={
                'target_twist_sum': 3.0,
                'target_loop_factor': 1.5,
                'twist_weight': 0.6,
                'loop_weight': 0.4
            }
        )
        
        assert 'best_individual' in result
        assert 'best_fitness_history' in result
        assert 'avg_fitness_history' in result
        assert 'final_population' in result
        assert 'generations' in result
        assert 'population_size' in result
        assert 'mutation_rate' in result
        
        assert len(result['best_fitness_history']) == 3
        assert len(result['avg_fitness_history']) == 3
        assert len(result['final_population']) == 5

@pytest.mark.unit
class TestMethodicalSearch:
    """Unit tests for the methodical search models."""
    
    def test_parameter_class(self):
        """Test the Parameter class."""
        param = Parameter(name='twist_x', min_val=0.0, max_val=3.0, steps=4)
        
        assert param.name == 'twist_x'
        assert param.min_val == 0.0
        assert param.max_val == 3.0
        assert param.steps == 4
        
        values = param.get_values()
        assert len(values) == 4
        assert values[0] == 0.0
        assert values[-1] == 3.0
    
    def test_search_space_class(self):
        """Test the SearchSpace class."""
        params = [
            Parameter(name='twist_x', min_val=0.0, max_val=1.0, steps=2),
            Parameter(name='twist_y', min_val=0.0, max_val=1.0, steps=2)
        ]
        
        search_space = SearchSpace(params)
        
        combinations = search_space.get_all_combinations()
        assert len(combinations) == 4  # 2x2 combinations
        
        # Check all expected combinations
        expected_combinations = [
            {'twist_x': 0.0, 'twist_y': 0.0},
            {'twist_x': 0.0, 'twist_y': 1.0},
            {'twist_x': 1.0, 'twist_y': 0.0},
            {'twist_x': 1.0, 'twist_y': 1.0}
        ]
        
        for expected in expected_combinations:
            assert any(
                all(comb[k] == v for k, v in expected.items())
                for comb in combinations
            )
    
    def test_evaluate_configuration(self):
        """Test configuration evaluation."""
        params = {
            'twist_x': 1.0,
            'twist_y': 0.5,
            'twist_z': 1.5,
            'loop_factor': 1.5
        }
        
        target_properties = {
            'target_twist_sum': 3.0,
            'target_loop_factor': 1.5,
            'twist_weight': 0.6,
            'loop_weight': 0.4
        }
        
        fitness = evaluate_configuration(params, target_properties)
        
        assert 0.0 <= fitness <= 1.0
        
        # Perfect match should give high fitness
        perfect_params = {
            'twist_x': 1.0,
            'twist_y': 0.5,
            'twist_z': 1.5,  # Sum is 3.0
            'loop_factor': 1.5  # Exact match
        }
        
        perfect_fitness = evaluate_configuration(perfect_params, target_properties)
        assert perfect_fitness > 0.9

@pytest.mark.unit
class TestMLPrediction:
    """Unit tests for the ML prediction models."""
    
    def test_extract_features(self):
        """Test feature extraction."""
        manifold_features = {
            'twist_x': 1.0,
            'twist_y': 0.5,
            'twist_z': 1.5,
            'loop_factor': 1.0
        }
        
        features = extract_features(manifold_features)
        
        assert features.shape[0] == 1  # One sample
        assert features.shape[1] > 4  # More features than original inputs
    
    def test_identify_likely_particle(self):
        """Test particle identification."""
        # Test electron-like properties
        particle, confidence = identify_likely_particle(0.511, -1, 0.5)
        
        assert isinstance(particle, str)
        assert isinstance(confidence, float)
        assert 0.0 <= confidence <= 1.0
        assert "electron" in particle.lower()
        
        # Test photon-like properties
        particle, confidence = identify_likely_particle(0.0, 0, 1.0)
        
        assert "photon" in particle.lower()
    
    def test_predict_particle_properties(self):
        """Test particle property prediction."""
        manifold_features = {
            'twist_x': 1.0,
            'twist_y': 0.5,
            'twist_z': 1.5,
            'loop_factor': 1.0
        }
        
        result = predict_particle_properties(manifold_features)
        
        assert 'predicted_mass' in result
        assert 'predicted_charge' in result
        assert 'predicted_spin' in result
        assert 'confidence' in result
        assert 'likely_particle' in result
        assert isinstance(result['predicted_mass'], float)
        assert isinstance(result['predicted_charge'], float)
        assert isinstance(result['predicted_spin'], float)
        assert 0.0 <= result['confidence'] <= 1.0

@pytest.mark.unit
class TestQuantumModels:
    """Unit tests for the quantum physics models."""
    
    def test_quantum_wavefunction(self):
        """Test quantum wavefunction calculation."""
        x = np.linspace(-5, 5, 100)
        n = 0  # Ground state
        omega = 1.0
        
        psi = quantum_wavefunction(x, n, omega)
        
        assert len(psi) == len(x)
        assert isinstance(psi, np.ndarray)
        
        # Wavefunction should be normalized
        dx = x[1] - x[0]
        norm = np.sum(np.abs(psi)**2) * dx
        assert np.isclose(norm, 1.0, rtol=1e-1)
    
    def test_generate_oscillator_data(self):
        """Test oscillator data generation."""
        result = generate_oscillator_data(
            frequency=1.0,
            damping_factor=0.1,
            amplitude=1.0,
            time_range=10.0,
            quantum_n=0
        )
        
        assert 'classical' in result
        assert 'quantum' in result
        assert 'parameters' in result
        
        # Check classical data
        assert 'time' in result['classical']
        assert 'position' in result['classical']
        
        # Check quantum data
        assert 'wavefunctions' in result['quantum']
        assert 'probability_density' in result['quantum']
        assert 'energy_levels' in result['quantum']
    
    def test_maxwell_boltzmann_pdf(self):
        """Test Maxwell-Boltzmann PDF calculation."""
        v = np.linspace(0, 1000, 100)
        mass = 1.0  # amu
        temperature = 300.0  # K
        
        pdf = maxwell_boltzmann_pdf(v, mass, temperature)
        
        assert len(pdf) == len(v)
        assert isinstance(pdf, np.ndarray)
        assert np.all(pdf >= 0)  # PDF should be non-negative
    
    def test_generate_maxwell_boltzmann_data(self):
        """Test Maxwell-Boltzmann data generation."""
        result = generate_maxwell_boltzmann_data(
            temperature=300.0,
            mass=1.0,
            particle_count=100
        )
        
        assert 'distribution' in result
        assert 'particles' in result
        assert 'parameters' in result
        
        # Check distribution data
        assert 'velocity' in result['distribution']
        assert 'pdf' in result['distribution']
        assert 'v_mp' in result['distribution']
        assert 'v_avg' in result['distribution']
        assert 'v_rms' in result['distribution']
        
        # Check particle data
        assert 'velocities' in result['particles']
        assert 'speeds' in result['particles']
        assert len(result['particles']['velocities']) == 100
    
    def test_electric_field_point_charge(self):
        """Test electric field calculation."""
        x = np.linspace(-1, 1, 3)
        y = np.linspace(-1, 1, 3)
        z = np.linspace(-1, 1, 3)
        X, Y, Z = np.meshgrid(x, y, z)
        
        Ex, Ey, Ez = electric_field_point_charge(X, Y, Z, charge=1.0, position=(0, 0, 0))
        
        assert Ex.shape == X.shape
        assert Ey.shape == Y.shape
        assert Ez.shape == Z.shape
    
    def test_generate_electromagnetic_field(self):
        """Test electromagnetic field generation."""
        result = generate_electromagnetic_field(
            field_type='both',
            source_type='point_charge',
            grid_size=5
        )
        
        assert 'grid' in result
        assert 'parameters' in result
        assert 'electric_field' in result
        assert 'magnetic_field' in result
        
        # Check electric field data
        assert 'components' in result['electric_field']
        assert 'magnitude' in result['electric_field']
        assert 'vectors' in result['electric_field'] 