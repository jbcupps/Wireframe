# 4D Manifold Explorer

A sophisticated web application for exploring 4D manifold physics concepts, visualizing topological structures, and mapping them to particle properties.

## Overview

The 4D Manifold Explorer is a Flask-based web application that provides interactive visualizations and tools for exploring higher-dimensional topological manifolds, particularly Spacetime Klein Bottles (SKBs) and their relationship to particle physics. The application is organized into three main sections:

1. **4D Manifold Visualization and Description**
   - Interactive 3D visualization of 4D manifolds with adjustable parameters
   - Real-time calculation and display of topological invariants
   - Educational content explaining SKB topology and its relation to particle properties

2. **Evolution, Iterative, and AI/ML**
   - Evolutionary algorithms for finding stable particle structures
   - Methodical iterative search tools for systematic analysis
   - AI and ML integration for hypothesis generation and property prediction

3. **Standard and Quantum Physics**
   - Visualization of established physics theories (oscillators, distributions, fields)
   - Mapping tools to compare 4D manifold results with standard models
   - Interactive parameter adjustment for physics simulations

## Installation

### Prerequisites

- Python 3.9+
- Docker (optional, for containerized deployment)

### Local Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/4d-manifold-explorer.git
   cd 4d-manifold-explorer
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the application:
   ```
   python run.py
   ```

5. Access the application at http://localhost:5000

### Docker Deployment

1. Build the Docker image:
   ```
   docker build -t 4d-manifold-explorer .
   ```

2. Run the container:
   ```
   docker run -p 5000:5000 4d-manifold-explorer
   ```

3. Access the application at http://localhost:5000

## Project Structure

```
4d-manifold-explorer/
├── app/
│   ├── __init__.py                 # Application factory
│   ├── common/                     # Shared components
│   │   ├── error_handlers.py       # Error handling
│   │   ├── static/                 # Static assets
│   │   └── templates/              # Common templates
│   ├── manifold_vis/               # 4D Manifold Visualization section
│   │   ├── controllers/            # Route definitions
│   │   ├── models/                 # Data generation
│   │   └── templates/              # Section templates
│   ├── evolution_ai/               # Evolution and AI/ML section
│   │   ├── controllers/            # Route definitions
│   │   ├── models/                 # Evolution algorithms
│   │   ├── iterative/              # Methodical search tools
│   │   ├── ml/                     # Machine learning components
│   │   └── templates/              # Section templates
│   └── quantum_physics/            # Quantum Physics section
│       ├── controllers/            # Route definitions
│       ├── models/                 # Physics simulations
│       └── templates/              # Section templates
├── requirements.txt                # Python dependencies
├── Dockerfile                      # Docker configuration
└── run.py                          # Application entry point
```

## Features

### 4D Manifold Visualization

- Interactive 3D visualization of SKBs and sub-SKBs
- Adjustable parameters for twists, loops, and time evolution
- Real-time calculation of topological invariants
- Educational content on manifold topology

### Evolution and AI/ML

- Evolutionary algorithms for optimizing manifold configurations
- Methodical search tools for systematic exploration
- ML models for predicting particle properties from topology
- LLM integration for hypothesis generation

### Quantum Physics

- Quantum harmonic oscillator visualization
- Maxwell-Boltzmann distribution simulation
- Electromagnetic field visualization
- Mapping tools to connect manifold topology to particle properties

## Technologies

- **Backend**: Flask, NumPy, SciPy
- **Frontend**: Bootstrap 5, Plotly.js, MathJax
- **ML/AI**: TensorFlow, scikit-learn, Transformers
- **Deployment**: Docker, Gunicorn

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The theoretical foundation is based on research in topological physics
- Visualization techniques inspired by mathematical topology and differential geometry