# Spacetime Klein Bottle (SKB) Visualization - Web Interface

This repository provides a web-based interactive visualization of Spacetime Klein Bottles (SKBs) representing quarks and baryons in a topological model.

## About the Visualization

The application displays:
- Three sub-SKBs (representing quarks) with adjustable twist numbers
- A merged stable SKB (representing a baryon)
- Interactive controls to adjust visualization parameters

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
   - Twist 1 (u quark): Controls the twist number of the first up quark (red)
   - Twist 2 (u quark): Controls the twist number of the second up quark (green)
   - Twist 3 (d quark): Controls the twist number of the down quark (blue)

2. **Toggle Switch**:
   - Switch between individual quarks view and merged baryon view

3. **Update Button**:
   - Click to apply your parameter changes to the visualization

4. **Interactive 3D Plot**:
   - Rotate: Click and drag
   - Zoom: Scroll wheel
   - Pan: Right-click and drag

## Technical Details

This application uses:
- Flask: Python web framework
- Plotly: Interactive visualization library
- Docker: Containerization

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
  - Reduce the complexity of the visualization by using a less powerful device
  - Ensure your browser is up to date