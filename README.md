# Spacetime Klein Bottle (SKB) Visualization - Web Interface

This repository provides a web-based interactive visualization of Spacetime Klein Bottles (SKBs) representing quarks and baryons in a topological model.

## About the Visualization

The application displays:
- Three sub-SKBs (representing quarks) with adjustable twist numbers
- A merged stable SKB (representing a baryon)
- Interactive controls to adjust visualization parameters
- Evolutionary programming algorithm to discover compatible Sub-SKB configurations

## Features

### Interactive Visualization
Explore and manipulate 3D visualizations of Spacetime Klein Bottles with adjustable parameters like twists, time evolution, and loop factors.

### Evolutionary Programming
The evolutionary algorithm allows you to:
- Generate populations of Sub-SKB configurations
- Evaluate topological compatibility between different Sub-SKBs
- Optimize for target topological properties such as Euler characteristic and orientability
- Visualize the evolution of compatible configurations over generations

## Research Papers

This visualization is based on the following research papers:

- [A Categorical Framework for Topological Features of Spacetime Klein Bottles in Particle Physics](https://figshare.com/articles/preprint/A_Categorical_Framework_for_Topological_Features_of_Spacetime_Klein_Bottles_in_Particle_Physics/28466279?file=52550969)
- [4D Spacetime Klein Bottles as Fundamental Particle Models](https://figshare.com/articles/preprint/4D_Spacetime_Klein_Bottles_as_Fundamental_Particle_Models_pdf/28466276?file=52550963)

## Security Updates

This repository has been updated to address the following security vulnerabilities:

- **Gunicorn HTTP Request Smuggling (CVE-2024-04-16)**: Updated to version 22.0.0 to fix vulnerability that could allow attackers to bypass security restrictions.
- **Setuptools Remote Code Execution (CVE-2024-07-15)**: Updated to version 70.0.0 to prevent potential code injection via download functions.
- **Setuptools Denial of Service (CVE-2022-12-23)**: Ensured version is above 65.5.1 to fix vulnerable Regular Expression in package_index.

## Prerequisites

- Docker installed on your system
- A web browser

## Building the Docker Image

1. Clone this repository or ensure all files are in the same directory.
2. Build the image:
   ```bash
   docker build -t skb-web-visualizer .
   ```

## Running the Container

Run the container with the following command:

```bash
docker run -d -p 5000:5000 --name skb-visualization skb-web-visualizer
```

Then open your web browser and navigate to:
```
http://localhost:5000
```

## Using the Web Interface

The web interface provides:

1. **Sliders for Twist Parameters**:
   - Each sub-SKB has three twist parameters (X, Y, Z) that control its topological properties
   - These twist parameters may correspond to quantum numbers in the particle physics model

2. **Loop Factor Controls**:
   - Individual loop factors for each sub-SKB
   - Global loop factor for the merged SKB
   - In the topological model, loops may relate to energy levels and particle mass

3. **Time Evolution**:
   - Slider to control the time parameter
   - Visualizes evolution through closed timelike curves (CTCs)
   - Shows how particles maintain their topological identity through time

4. **Toggle Switch**:
   - Switch between individual quark-like components view and merged composite particle view
   - In categorical theory, this represents a colimit of the sub-objects

5. **Topological Properties Panel**:
   - Displays mathematical characteristics such as Euler characteristic, genus, and homology groups
   - These properties relate to fundamental aspects of the particle model

6. **Interactive 3D Plot**:
   - Rotate: Click and drag
   - Zoom: Scroll wheel
   - Pan: Right-click and drag
   - Reset view: Double-click

7. **Animation Controls**:
   - Animate the time evolution to visualize dynamic behavior
   - Reset button to return to default settings

## Technical Details

This application uses:
- Flask: Python web framework
- Plotly: Interactive visualization library
- NumPy: Mathematical operations
- Docker: Containerization

## Theoretical Basis

The SKB model explores a novel hypothesis in which fundamental particles are modeled as 4-dimensional spacetime Klein bottles endowed with closed timelike curves. Key aspects include:

- **Non-orientable Topology**: SKBs are non-orientable surfaces with no boundary
- **Quark-like Components**: Three sub-SKBs with distinct topological features represent quark-like particles
- **Composite Structures**: Merged SKBs represent baryons or other composite particles
- **Categorical Framework**: Category theory provides a mathematical foundation for analyzing topological features
- **Emergent Properties**: Particle attributes like mass and charge emerge from topological characteristics

## Stopping the Container

To stop and remove the container:

```bash
docker stop skb-visualization
docker rm skb-visualization
```

## Troubleshooting

- **Cannot access the web interface**:
  - Ensure port 5000 is not being used by another application
  - Check that the container is running with `docker ps`
  - Try accessing with the IP address of your machine instead of localhost

- **Slow performance**:
  - Reduce the complexity of the visualization by using simpler configurations
  - Ensure your browser is up to date
  - Try using a device with better graphics capabilities

## Recent Updates

### Landing Page
- Added a modern landing page at the root URL `/`
- Includes overview of the application's purpose, key features, and research background
- The interactive visualization is available at `/visualization`

### Evolutionary Programming
- Added a new section for topological evolution of Sub-SKBs at `/evolution`
- Implements an evolutionary algorithm to discover compatible Sub-SKB configurations
- Features include:
  - Interactive 3D visualization of evolving Sub-SKBs
  - Configurable evolutionary parameters (population size, mutation rate, etc.)
  - Real-time display of topological properties (Stiefel-Whitney class, Euler characteristic, etc.)
  - Population grid showing fitness and compatibility metrics