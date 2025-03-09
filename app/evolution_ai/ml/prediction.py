"""
Enhanced machine learning models for predicting particle properties from topological features.
"""

import numpy as np
import tensorflow as tf
from typing import Dict, Any, List, Optional, Union, Tuple
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.neighbors import KNeighborsRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.svm import SVR
from sklearn.model_selection import train_test_split

# Extended mock training data for development
MOCK_TRAINING_DATA = [
    # twist_x, twist_y, twist_z, loop_factor, mass, charge, spin
    # Electron-like particles with variations
    [1.0, 0.5, 1.5, 1.0, 0.511, -1, 0.5],  # Electron
    [1.1, 0.6, 1.4, 1.1, 0.511, -1, 0.5],
    [0.5, 1.0, 1.5, 1.0, 0.511, -1, 0.5],
    [1.2, 0.4, 1.5, 1.0, 0.511, -1, 0.5],
    
    # Muon-like particles
    [1.5, 1.5, 0.0, 1.2, 105.7, -1, 0.5],  # Muon
    [1.6, 1.6, 0.1, 1.3, 105.7, -1, 0.5],
    [1.4, 1.5, 0.2, 1.2, 105.7, -1, 0.5],
    
    # Tau-like particles
    [1.8, 1.8, 0.5, 1.3, 1776.8, -1, 0.5],  # Tau
    [1.7, 1.9, 0.4, 1.4, 1776.8, -1, 0.5],
    
    # Proton-like particles
    [2.0, 2.0, 2.0, 2.0, 938.3, 1, 0.5],   # Proton
    [2.1, 2.1, 1.9, 2.1, 938.3, 1, 0.5],
    [1.9, 2.0, 2.1, 2.0, 938.3, 1, 0.5],
    
    # Neutron-like particles
    [2.0, 2.0, 2.0, 2.2, 939.6, 0, 0.5],   # Neutron
    [2.1, 1.9, 2.0, 2.3, 939.6, 0, 0.5],
    
    # Quarks (up, down, strange, charm, bottom, top)
    [0.3, 0.3, 0.3, 0.3, 2.2, 2/3, 0.5],   # up quark
    [0.3, 0.3, 0.4, 0.3, 4.7, -1/3, 0.5],  # down quark
    [0.4, 0.4, 0.4, 0.4, 95.0, -1/3, 0.5], # strange quark
    [0.5, 0.5, 0.5, 0.5, 1275.0, 2/3, 0.5], # charm quark
    [0.6, 0.6, 0.6, 0.6, 4180.0, -1/3, 0.5], # bottom quark
    [0.8, 0.8, 0.8, 0.8, 173100.0, 2/3, 0.5], # top quark
    
    # Bosons (photon, W, Z, Higgs)
    [0.5, 0.5, 0.5, 0.7, 0, 0, 1.0],       # Photon
    [0.9, 0.9, 0.9, 1.3, 80400, 1, 1.0],   # W+
    [0.9, 0.9, 0.9, 1.3, 80400, -1, 1.0],  # W-
    [1.0, 1.0, 1.0, 1.5, 91200, 0, 1.0],   # Z boson
    [1.2, 1.2, 1.2, 1.8, 125000, 0, 0.0],  # Higgs boson
    
    # Additional particles for better training
    [2.5, 2.5, 2.5, 2.5, 1115.7, 0, 0.5],  # Lambda
    [2.7, 2.7, 2.7, 2.7, 1189.4, 1, 0.5],  # Sigma+
    [2.7, 2.7, 2.8, 2.7, 1192.6, 0, 0.5],  # Sigma0
    [2.7, 2.7, 2.9, 2.7, 1197.4, -1, 0.5], # Sigma-
    [2.8, 2.8, 2.8, 2.8, 1314.9, 0, 0.5],  # Xi0
    [2.8, 2.8, 2.9, 2.8, 1321.7, -1, 0.5], # Xi-
    [3.0, 3.0, 3.0, 3.0, 1672.5, -1, 0.5], # Omega-
]

# Particle reference data for interpretation
PARTICLE_REFERENCE = {
    "electron": {"mass": 0.511, "charge": -1, "spin": 0.5},
    "muon": {"mass": 105.7, "charge": -1, "spin": 0.5},
    "tau": {"mass": 1776.8, "charge": -1, "spin": 0.5},
    "proton": {"mass": 938.3, "charge": 1, "spin": 0.5},
    "neutron": {"mass": 939.6, "charge": 0, "spin": 0.5},
    "photon": {"mass": 0, "charge": 0, "spin": 1.0},
    "w_plus": {"mass": 80400, "charge": 1, "spin": 1.0},
    "w_minus": {"mass": 80400, "charge": -1, "spin": 1.0},
    "z_boson": {"mass": 91200, "charge": 0, "spin": 1.0},
    "higgs": {"mass": 125000, "charge": 0, "spin": 0.0},
    "up_quark": {"mass": 2.2, "charge": 2/3, "spin": 0.5},
    "down_quark": {"mass": 4.7, "charge": -1/3, "spin": 0.5},
    "strange_quark": {"mass": 95.0, "charge": -1/3, "spin": 0.5},
    "charm_quark": {"mass": 1275.0, "charge": 2/3, "spin": 0.5},
    "bottom_quark": {"mass": 4180.0, "charge": -1/3, "spin": 0.5},
    "top_quark": {"mass": 173100.0, "charge": 2/3, "spin": 0.5},
}

# Model instances
# We'll create an ensemble of different models for better prediction
scaler = None
mass_models = []
charge_models = []
spin_models = []
particle_classifier = None
model_weights = None

# Feature extraction functions to create derived features
def extract_features(manifold_features: Dict[str, float]) -> np.ndarray:
    """
    Extract and engineer features from the raw manifold parameters.
    
    Args:
        manifold_features: Raw manifold parameters
        
    Returns:
        Engineered feature array
    """
    # Basic features
    twist_x = manifold_features.get('twist_x', 0.0)
    twist_y = manifold_features.get('twist_y', 0.0)
    twist_z = manifold_features.get('twist_z', 0.0)
    loop_factor = manifold_features.get('loop_factor', 1.0)
    
    # Derived features
    twist_sum = abs(twist_x) + abs(twist_y) + abs(twist_z)
    twist_product = abs(twist_x) * abs(twist_y) * abs(twist_z)
    twist_mean = twist_sum / 3
    twist_std = np.std([twist_x, twist_y, twist_z])
    twist_max = max(abs(twist_x), abs(twist_y), abs(twist_z))
    twist_min = min(abs(twist_x), abs(twist_y), abs(twist_z))
    twist_range = twist_max - twist_min
    
    # Ratios and combinations
    xy_ratio = abs(twist_x) / (abs(twist_y) + 1e-10)  # Avoid division by zero
    xz_ratio = abs(twist_x) / (abs(twist_z) + 1e-10)
    yz_ratio = abs(twist_y) / (abs(twist_z) + 1e-10)
    loop_twist_ratio = loop_factor / (twist_sum + 1e-10)
    
    # Polynomial features
    twist_x_squared = twist_x ** 2
    twist_y_squared = twist_y ** 2
    twist_z_squared = twist_z ** 2
    loop_factor_squared = loop_factor ** 2
    
    # Create feature vector
    features = np.array([
        twist_x, twist_y, twist_z, loop_factor,
        twist_sum, twist_product, twist_mean, twist_std,
        twist_max, twist_min, twist_range,
        xy_ratio, xz_ratio, yz_ratio, loop_twist_ratio,
        twist_x_squared, twist_y_squared, twist_z_squared, loop_factor_squared
    ])
    
    return features.reshape(1, -1)

def prepare_models():
    """Prepare an ensemble of ML models for prediction."""
    global mass_models, charge_models, spin_models, scaler, particle_classifier, model_weights
    
    # Convert mock data to numpy arrays
    data = np.array(MOCK_TRAINING_DATA)
    
    # Basic features (X)
    X_basic = data[:, :4]  # twist_x, twist_y, twist_z, loop_factor
    
    # Engineer features for each sample
    X_engineered = []
    for i in range(X_basic.shape[0]):
        features_dict = {
            'twist_x': X_basic[i, 0],
            'twist_y': X_basic[i, 1],
            'twist_z': X_basic[i, 2],
            'loop_factor': X_basic[i, 3]
        }
        X_engineered.append(extract_features(features_dict).flatten())
    
    X = np.array(X_engineered)
    
    # Target variables
    y_mass = data[:, 4]  # mass
    y_charge = data[:, 5]  # charge
    y_spin = data[:, 6]  # spin
    
    # Split data into training and validation sets
    X_train, X_val, y_mass_train, y_mass_val = train_test_split(X, y_mass, test_size=0.2, random_state=42)
    _, _, y_charge_train, y_charge_val = train_test_split(X, y_charge, test_size=0.2, random_state=42)
    _, _, y_spin_train, y_spin_val = train_test_split(X, y_spin, test_size=0.2, random_state=42)
    
    # Normalize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    
    # Create ensemble of models for mass prediction
    mass_models = [
        # Linear model for baseline
        LinearRegression(),
        
        # Non-linear models for complex relationships
        SVR(kernel='rbf', C=100, gamma=0.1),
        RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
        GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42),
        KNeighborsRegressor(n_neighbors=3, weights='distance'),
        
        # Neural network for high-dimensional patterns
        MLPRegressor(hidden_layer_sizes=(50, 25), activation='relu', solver='adam', 
                     max_iter=1000, random_state=42)
    ]
    
    # Create ensemble of models for charge prediction
    charge_models = [
        LinearRegression(),
        SVR(kernel='rbf', C=100, gamma=0.1),
        RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42),
        GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42),
        KNeighborsRegressor(n_neighbors=3, weights='distance'),
        MLPRegressor(hidden_layer_sizes=(20, 10), activation='relu', solver='adam', 
                     max_iter=1000, random_state=42)
    ]
    
    # Create ensemble of models for spin prediction
    spin_models = [
        LinearRegression(),
        SVR(kernel='rbf', C=100, gamma=0.1),
        RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42),
        GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42),
        KNeighborsRegressor(n_neighbors=3, weights='distance'),
        MLPRegressor(hidden_layer_sizes=(20, 10), activation='relu', solver='adam', 
                     max_iter=1000, random_state=42)
    ]
    
    # Train all models
    for model in mass_models:
        model.fit(X_train_scaled, y_mass_train)
    
    for model in charge_models:
        model.fit(X_train_scaled, y_charge_train)
    
    for model in spin_models:
        model.fit(X_train_scaled, y_spin_train)
    
    # Evaluate models on validation set to determine weights
    mass_weights = []
    for model in mass_models:
        score = model.score(X_val_scaled, y_mass_val)
        mass_weights.append(max(0.1, score))  # Ensure minimum weight
    
    charge_weights = []
    for model in charge_models:
        score = model.score(X_val_scaled, y_charge_val)
        charge_weights.append(max(0.1, score))
    
    spin_weights = []
    for model in spin_models:
        score = model.score(X_val_scaled, y_spin_val)
        spin_weights.append(max(0.1, score))
    
    # Normalize weights
    mass_weights = np.array(mass_weights) / sum(mass_weights)
    charge_weights = np.array(charge_weights) / sum(charge_weights)
    spin_weights = np.array(spin_weights) / sum(spin_weights)
    
    model_weights = {
        'mass': mass_weights,
        'charge': charge_weights,
        'spin': spin_weights
    }
    
    # Create a simple neural network for particle classification
    # This will be a multi-layer perceptron that classifies particles
    particle_classifier = MLPRegressor(
        hidden_layer_sizes=(100, 50, 25),
        activation='relu',
        solver='adam',
        alpha=0.0001,
        batch_size='auto',
        learning_rate='adaptive',
        learning_rate_init=0.001,
        max_iter=1000,
        random_state=42
    )
    
    # Create target vectors for particle similarity
    # Each particle gets a vector of similarities to known particles
    particle_similarity = []
    for i in range(X_basic.shape[0]):
        # Get the properties of this sample
        mass = data[i, 4]
        charge = data[i, 5]
        spin = data[i, 6]
        
        # Calculate similarity to each reference particle
        similarity_vector = []
        for particle_name, properties in PARTICLE_REFERENCE.items():
            # Calculate similarity based on normalized differences in properties
            mass_diff = abs(mass - properties['mass']) / (properties['mass'] + 1e-10)
            charge_diff = abs(charge - properties['charge'])
            spin_diff = abs(spin - properties['spin'])
            
            # Combined similarity score (lower is more similar)
            similarity_score = 1.0 / (1.0 + mass_diff + charge_diff * 3 + spin_diff * 3)
            similarity_vector.append(similarity_score)
        
        particle_similarity.append(similarity_vector)
    
    # Train the particle classifier
    particle_classifier.fit(X_train_scaled, np.array(particle_similarity)[:-5])  # Leave a few samples out

def identify_likely_particle(predicted_mass: float, predicted_charge: float, predicted_spin: float) -> Tuple[str, float]:
    """
    Identify the most likely particle based on predicted properties.
    
    Args:
        predicted_mass: Predicted mass in MeV/c²
        predicted_charge: Predicted charge in units of e
        predicted_spin: Predicted spin in units of ħ
        
    Returns:
        Tuple of (particle name, confidence score)
    """
    best_match = None
    best_score = -1
    
    for particle_name, properties in PARTICLE_REFERENCE.items():
        # Calculate similarity based on properties
        # For mass, use logarithmic scale due to large range
        if properties['mass'] > 0 and predicted_mass > 0:
            mass_diff = abs(np.log10(predicted_mass) - np.log10(properties['mass'])) / 5
        else:
            mass_diff = 1.0 if (predicted_mass > 1.0 or properties['mass'] > 1.0) else 0.1
        
        charge_diff = abs(predicted_charge - properties['charge'])
        spin_diff = abs(predicted_spin - properties['spin'])
        
        # Weighted similarity score
        mass_weight = 0.5
        charge_weight = 0.3
        spin_weight = 0.2
        
        similarity_score = 1.0 - (
            mass_weight * min(1.0, mass_diff) + 
            charge_weight * min(1.0, charge_diff) + 
            spin_weight * min(1.0, spin_diff)
        )
        
        if similarity_score > best_score:
            best_score = similarity_score
            best_match = particle_name
    
    return best_match.replace('_', ' '), best_score

def predict_particle_properties(manifold_features: Dict[str, float]) -> Dict[str, Any]:
    """
    Predict particle properties from manifold features using an ensemble of ML models.
    
    Args:
        manifold_features: Dictionary with manifold parameters
        
    Returns:
        Dictionary with predicted particle properties
    """
    # Prepare models if not already done
    if not mass_models:
        prepare_models()
    
    # Extract and engineer features
    features = extract_features(manifold_features)
    
    # Scale features
    features_scaled = scaler.transform(features)
    
    # Ensemble prediction for mass
    mass_predictions = []
    for i, model in enumerate(mass_models):
        pred = model.predict(features_scaled)[0]
        mass_predictions.append(pred)
    
    predicted_mass = np.average(mass_predictions, weights=model_weights['mass'])
    
    # Ensemble prediction for charge
    charge_predictions = []
    for i, model in enumerate(charge_models):
        pred = model.predict(features_scaled)[0]
        charge_predictions.append(pred)
    
    predicted_charge_raw = np.average(charge_predictions, weights=model_weights['charge'])
    
    # Round charge to nearest 1/3 (reflecting quark charges)
    predicted_charge = round(predicted_charge_raw * 3) / 3
    
    # Ensemble prediction for spin
    spin_predictions = []
    for i, model in enumerate(spin_models):
        pred = model.predict(features_scaled)[0]
        spin_predictions.append(pred)
    
    predicted_spin_raw = np.average(spin_predictions, weights=model_weights['spin'])
    
    # Round spin to nearest 0.5 (common spin values)
    predicted_spin = round(predicted_spin_raw * 2) / 2
    
    # Calculate uncertainty estimates based on variance in ensemble predictions
    mass_uncertainty = np.std(mass_predictions) / predicted_mass if predicted_mass > 0 else 1.0
    charge_uncertainty = np.std(charge_predictions)
    spin_uncertainty = np.std(spin_predictions)
    
    overall_uncertainty = (mass_uncertainty + charge_uncertainty + spin_uncertainty) / 3
    confidence = 1.0 / (1.0 + overall_uncertainty)
    
    # Identify likely particle
    likely_particle, particle_confidence = identify_likely_particle(
        predicted_mass, predicted_charge, predicted_spin
    )
    
    # Combine confidences
    combined_confidence = 0.7 * confidence + 0.3 * particle_confidence
    
    # Get particle classifier prediction for additional insights
    if particle_classifier is not None:
        similarity_vector = particle_classifier.predict(features_scaled)[0]
        
        # Get top 3 most similar particles
        particle_names = list(PARTICLE_REFERENCE.keys())
        top_indices = np.argsort(similarity_vector)[-3:][::-1]
        top_particles = [particle_names[i].replace('_', ' ') for i in top_indices]
        top_scores = [float(similarity_vector[i]) for i in top_indices]
        
        similar_particles = [
            {"name": name, "similarity": score}
            for name, score in zip(top_particles, top_scores)
        ]
    else:
        similar_particles = []
    
    return {
        "predicted_mass": float(predicted_mass),
        "predicted_charge": float(predicted_charge),
        "predicted_spin": float(predicted_spin),
        "raw_predictions": {
            "mass": float(predicted_mass_raw),
            "charge": float(predicted_charge_raw),
            "spin": float(predicted_spin_raw)
        },
        "uncertainties": {
            "mass": float(mass_uncertainty),
            "charge": float(charge_uncertainty),
            "spin": float(spin_uncertainty),
            "overall": float(overall_uncertainty)
        },
        "confidence": float(combined_confidence),
        "likely_particle": likely_particle,
        "particle_confidence": float(particle_confidence),
        "similar_particles": similar_particles
    } 