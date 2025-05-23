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

## Documentation
Detailed documentation for each module is available in the [`docs`](./docs) directory.
Key references and an overview of the SKB hypothesis can be found in
[`docs/skb_hypothesis.md`](docs/skb_hypothesis.md).

## Security Updates

This repository has been updated to address the following security vulnerabilities:

- **Gunicorn HTTP Request Smuggling (CVE-2024-04-16)**: Updated to version 22.0.0 to fix vulnerability that could allow attackers to bypass security restrictions.
- **Setuptools Remote Code Execution (CVE-2024-07-15)**: Updated to version 70.0.0 to prevent potential code injection via download functions.
- **Setuptools Denial of Service (CVE-2022-12-23)**: Ensured version is above 65.5.1 to fix vulnerable Regular Expression in package_index.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- A web browser

## Quick Start

### For Users (Run the Application)

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd wireframe
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up web
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

### For Developers

📖 **See [Docker Development Guide](docs/DOCKER_DEVELOPMENT.md) for complete development setup and workflow.**

Quick development setup:
```bash
# Clone the repository
git clone <repository-url>
cd wireframe

# Start development environment with hot reloading
docker-compose up web-dev
```

The development server includes:
- Hot reloading for code changes
- Debug mode enabled
- Volume mounting for real-time development

## Building the Docker Image (Optional)

If you prefer to build and run manually:

1. Build the image:
   ```bash
   docker build -t skb-web-visualizer .
   ```

2. Run the container:
   ```bash
   docker run -d -p 5000:5000 --name skb-visualization skb-web-visualizer
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
- Docker: Containerization for consistent development and deployment

## Development Environment

This project is configured for **Docker-based development only**. Local Python installations are not required or recommended.

**Key Benefits:**
- ✅ Consistent environment across all developers
- ✅ No local Python package management needed
- ✅ Easy onboarding for new developers
- ✅ Identical to production environment
- ✅ Supports hot reloading and debugging

**Development Services:**
- `web`: Production-like environment with Gunicorn
- `web-dev`: Development environment with Flask debug server and hot reloading

See [Docker Development Guide](docs/DOCKER_DEVELOPMENT.md) for detailed instructions.

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

## Deploy with Azure Web Apps

This repository contains a GitHub Actions workflow that builds a Docker image
and deploys it to an Azure Web App for Containers. Before running the workflow,
create an Entra ID app registration with a federated credential for this
repository and grant the `AcrPush` and `Website Contributor` roles.

```bash
az ad app federated-credential create \
  --id $APP_ID \
  --parameters repository=<org>/<repo>,subject=repo:<org>/<repo>:ref:refs/heads/main
```

Trigger the **cd-azure** workflow from the Actions tab to publish the latest
image.
