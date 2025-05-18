# Maxwell-Boltzmann Distribution Visualization

## Purpose
This module demonstrates statistical mechanics by showing the Maxwell-Boltzmann
velocity distribution of a gas. Users can vary temperature and observe how the
probability curve changes in real time.

## Visualization Details
- **Plotly.js** is used to plot the distribution curve.
- Temperature sliders update the curve dynamically without reloading the page.
- The interface highlights peak velocity and spread for intuitive learning.

## Mathematical Basis
The visualization computes the probability density
\[ f(v) = 4\pi \left(\frac{m}{2\pi kT}\right)^{3/2} v^2 e^{-\frac{mv^2}{2kT}} \]
where `m` is particle mass, `k` is Boltzmann's constant, and `T` is temperature.

This equation comes directly from kinetic theory and ensures a sound foundation
for exploring thermodynamic behavior.

