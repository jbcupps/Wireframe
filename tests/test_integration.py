"""
Integration tests for the 4D Manifold Explorer application.
These tests verify that different components of the application
work together correctly.
"""

import pytest
import json
from app import create_app

@pytest.fixture
def client():
    """Create a test client for the Flask application."""
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        yield client

class TestManifoldVisualization:
    """Tests for the 4D Manifold Visualization section."""
    
    def test_index_page(self, client):
        """Test the main index page of the manifold section."""
        response = client.get('/manifold/')
        assert response.status_code == 200
        assert b'4D Manifold Visualization' in response.data
    
    def test_skb_visualization_page(self, client):
        """Test the SKB visualization page."""
        response = client.get('/manifold/skb_visualization')
        assert response.status_code == 200
        assert b'SKB Controls' in response.data
    
    def test_generate_skb_api(self, client):
        """Test the SKB generation API."""
        data = {
            'twist_x': 1.0,
            'twist_y': 0.5,
            'twist_z': 1.5,
            'loop_factor': 1.0,
            'time': 0.0
        }
        response = client.post(
            '/manifold/generate_skb',
            data=json.dumps(data),
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Check if response contains expected data
        result = json.loads(response.data)
        assert 'skb_data' in result
        assert 'invariants' in result
        
        # Check if SKB data contains the necessary components
        assert 'x' in result['skb_data']
        assert 'y' in result['skb_data']
        assert 'z' in result['skb_data']
        
        # Check if invariants contain expected properties
        assert 'euler_characteristic' in result['invariants']
        assert 'orientability' in result['invariants']
        assert 'genus' in result['invariants']

class TestEvolutionAI:
    """Tests for the Evolution, Iterative, and AI/ML section."""
    
    def test_index_page(self, client):
        """Test the main index page of the evolution section."""
        response = client.get('/evolution/')
        assert response.status_code == 200
        assert b'Evolution, Iterative, and AI/ML' in response.data
    
    def test_evolution_page(self, client):
        """Test the evolutionary algorithm page."""
        response = client.get('/evolution/evolution')
        assert response.status_code == 200
        assert b'Evolution Settings' in response.data
    
    def test_run_evolution_api(self, client):
        """Test the evolution algorithm API."""
        data = {
            'population_size': 10,
            'generations': 5,
            'mutation_rate': 0.1,
            'fitness_criteria': {
                'target_twist_sum': 3.0,
                'target_loop_factor': 1.5,
                'twist_weight': 0.6,
                'loop_weight': 0.4
            }
        }
        response = client.post(
            '/evolution/run_evolution',
            data=json.dumps(data),
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Check if response contains expected data
        result = json.loads(response.data)
        assert 'best_individual' in result
        assert 'best_fitness_history' in result
        assert 'final_population' in result
        
        # Check if evolution ran for the specified number of generations
        assert len(result['best_fitness_history']) == data['generations']
        
        # Check if population has the right size
        assert len(result['final_population']) == data['population_size']
    
    def test_predict_properties_api(self, client):
        """Test the particle property prediction API."""
        data = {
            'manifold_features': {
                'twist_x': 1.0,
                'twist_y': 0.5,
                'twist_z': 1.5,
                'loop_factor': 1.0
            }
        }
        response = client.post(
            '/evolution/predict_properties',
            data=json.dumps(data),
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Check if response contains expected data
        result = json.loads(response.data)
        assert 'predicted_mass' in result
        assert 'predicted_charge' in result
        assert 'predicted_spin' in result
        assert 'confidence' in result
        assert 'likely_particle' in result

class TestQuantumPhysics:
    """Tests for the Standard and Quantum Physics section."""
    
    def test_index_page(self, client):
        """Test the main index page of the quantum physics section."""
        response = client.get('/quantum/')
        assert response.status_code == 200
        assert b'Standard and Quantum Physics' in response.data
    
    def test_oscillator_page(self, client):
        """Test the quantum oscillator page."""
        response = client.get('/quantum/oscillator')
        assert response.status_code == 200
        assert b'Quantum Harmonic Oscillator' in response.data
    
    def test_generate_oscillator_api(self, client):
        """Test the quantum oscillator generation API."""
        data = {
            'frequency': 1.0,
            'quantum_n': 0,
            'amplitude': 1.0,
            'damping_factor': 0.1,
            'time_range': 10.0
        }
        response = client.post(
            '/quantum/generate_oscillator',
            data=json.dumps(data),
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Check if response contains expected data
        result = json.loads(response.data)
        assert 'classical' in result
        assert 'quantum' in result
        assert 'parameters' in result
        
        # Check if quantum data contains the necessary components
        assert 'wavefunctions' in result['quantum']
        assert 'probability_density' in result['quantum']
        assert 'energy_levels' in result['quantum']
        
        # Check if classical data contains the necessary components
        assert 'time' in result['classical']
        assert 'position' in result['classical']

class TestEndToEndFlows:
    """End-to-end workflow tests that combine multiple components."""
    
    def test_evolution_to_visualization_flow(self, client):
        """Test the flow from evolutionary algorithm to visualization."""
        # First, run evolution to find good parameters
        evolution_data = {
            'population_size': 5,
            'generations': 3,
            'mutation_rate': 0.1,
            'fitness_criteria': {
                'target_twist_sum': 3.0,
                'target_loop_factor': 1.5,
                'twist_weight': 0.6,
                'loop_weight': 0.4
            }
        }
        evolution_response = client.post(
            '/evolution/run_evolution',
            data=json.dumps(evolution_data),
            content_type='application/json'
        )
        assert evolution_response.status_code == 200
        evolution_result = json.loads(evolution_response.data)
        
        # Extract best parameters from evolution result
        best_params = evolution_result['best_individual']['params']
        
        # Use these parameters to generate an SKB
        skb_response = client.post(
            '/manifold/generate_skb',
            data=json.dumps(best_params),
            content_type='application/json'
        )
        assert skb_response.status_code == 200
        skb_result = json.loads(skb_response.data)
        
        # Now predict particle properties from these parameters
        predict_response = client.post(
            '/evolution/predict_properties',
            data=json.dumps({'manifold_features': best_params}),
            content_type='application/json'
        )
        assert predict_response.status_code == 200
        predict_result = json.loads(predict_response.data)
        
        # Verify the complete workflow
        assert 'skb_data' in skb_result
        assert 'predicted_mass' in predict_result
        assert isinstance(predict_result['predicted_mass'], (int, float))
        
    def test_mapping_quantum_to_manifold_flow(self, client):
        """Test the flow from quantum physics to manifold mapping."""
        # First, generate oscillator data
        oscillator_data = {
            'frequency': 1.0,
            'quantum_n': 0,
            'amplitude': 1.0,
            'damping_factor': 0.1,
            'time_range': 10.0
        }
        oscillator_response = client.post(
            '/quantum/generate_oscillator',
            data=json.dumps(oscillator_data),
            content_type='application/json'
        )
        assert oscillator_response.status_code == 200
        
        # Now map this to a manifold configuration
        manifold_data = {
            'manifold_data': {
                'manifold_type': 'sub_skb',
                'twist_x': 1.0,
                'twist_y': 0.5,
                'twist_z': 1.5,
                'loop_factor': 1.0
            }
        }
        mapping_response = client.post(
            '/quantum/map_manifold_to_particles',
            data=json.dumps(manifold_data),
            content_type='application/json'
        )
        assert mapping_response.status_code == 200
        mapping_result = json.loads(mapping_response.data)
        
        # Verify the mapping results
        assert 'particle' in mapping_result
        assert isinstance(mapping_result['particle'], str)
        assert 'confidence' in mapping_result 