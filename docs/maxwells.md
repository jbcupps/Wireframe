# Maxwell's Equations Visualization

## Goal
Illustrate electromagnetic wave propagation and field interactions using dynamic
3D graphics. Users can adjust field parameters to see how electric and magnetic
components evolve over time.

## Visualization Features
- Animated arrows in Three.js show oscillating `E` and `B` fields in space.
- Plotly.js plots field strength versus time for selected points.
- Controls include wave frequency, amplitude, and propagation speed.

## Mathematical Foundations
The simulation solves the source-free Maxwell equations in vacuum:
\[
\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t},\qquad
\nabla \times \mathbf{B} = \mu_0\epsilon_0\frac{\partial \mathbf{E}}{\partial t}
\]
By discretizing these equations, the visualization maintains physical accuracy
while remaining interactive and engaging.

