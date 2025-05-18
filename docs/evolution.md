# Evolution Algorithm Documentation

## Overview
The evolution module searches for compatible Spacetime Klein Bottle (SKB) configurations.
It uses a genetic algorithm to evolve sub‑SKB parameters until they meet topological
criteria such as Euler characteristic, orientability, and intersection form alignment.

## Algorithm Steps
1. **Initialization**: Generate a population of random sub‑SKB twist values and
   genus selections.
2. **Fitness Evaluation**: Compute each candidate's fitness using weighted sums of
   Stiefel‑Whitney class match, Euler characteristic proximity, intersection form
   type, twist alignment, and closed‑timelike‑curve (CTC) stability.
3. **Selection and Mutation**: Choose the best candidates and apply random
   mutations to twists and genus to create the next generation.
4. **Compatibility Tracking**: Record individuals whose topological properties are
   mutually compatible, allowing visual inspection of promising pairs.

## Visualization
The `/evolution` page renders a 3D Plotly scene showing sub‑SKBs as surfaces with
color gradients. Evolution progress is displayed in real time with fitness
metrics in a population grid. Users can adjust generation count, population size,
and mutation rate.

## Mathematical Soundness
The algorithm uses well‑known topological invariants:
- **Euler characteristic** and **orientability** determine manifold type.
- **Intersection forms** classify four‑manifolds by quadratic form.
- **Twist alignment** ensures geometric consistency when merging sub‑SKBs.
These metrics follow the SKB hypothesis of modeling particles as four‑dimensional
Klein bottles.

