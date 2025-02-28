/**
 * Maxwell-Boltzmann Distribution Visualization
 * 
 * This module visualizes the Maxwell-Boltzmann distribution for particle speeds and energies
 * in thermal equilibrium, providing interactive simulations of gas particle behavior.
 */

// Physical constants
const BOLTZMANN = 1.380649e-23;  // Boltzmann constant in J/K
const AMU = 1.66053886e-27;      // Atomic mass unit in kg
const GAS_CONSTANT = 8.31446;    // Gas constant in J/(mol·K)
const AVOGADRO = 6.02214076e23;  // Avogadro's number

// Class to manage the Maxwell-Boltzmann visualization
class MaxwellBoltzmannVisualizer {
    constructor() {
        console.log("Initializing Maxwell-Boltzmann Visualizer");
        
        // Default parameters
        this.temperature = 300;       // Temperature in Kelvin
        this.mass = 28;               // Particle mass in amu (Nitrogen)
        this.particleCount = 200;     // Number of particles for simulation
        this.isSimulationRunning = false;
        this.compareMode = false;
        this.savedDistributions = [];
        this.particles = [];
        
        // Initialize the UI
        this.initEventListeners();
        
        // Initialize visualizations
        this.initDistributionPlot();
        this.initParticleSimulation();
        this.init3DVisualization();
        
        // Update all displays
        this.updateAllVisualizations();
    }
    
    initEventListeners() {
        console.log("Setting up event listeners");
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all tabs and tab contents
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Activate the clicked tab and its content
                tab.classList.add('active');
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                // Resize plots when tab changes (fixes Plotly rendering issues)
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 100);
            });
        });
        
        // Distribution Plot Controls
        document.getElementById('temp-slider').addEventListener('input', e => {
            this.temperature = parseInt(e.target.value);
            document.getElementById('temp-value').textContent = this.temperature;
            this.updateDistributionPlot();
        });
        
        document.getElementById('mass-slider').addEventListener('input', e => {
            this.mass = parseInt(e.target.value);
            document.getElementById('mass-value').textContent = this.mass;
            this.updateDistributionPlot();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetDistribution();
        });
        
        document.getElementById('compare-btn').addEventListener('click', () => {
            this.toggleCompareMode();
        });
        
        // Particle Simulation Controls
        document.getElementById('num-particles-slider').addEventListener('input', e => {
            this.particleCount = parseInt(e.target.value);
            document.getElementById('num-particles-value').textContent = this.particleCount;
            this.resetParticleSimulation();
        });
        
        document.getElementById('sim-temp-slider').addEventListener('input', e => {
            this.temperature = parseInt(e.target.value);
            document.getElementById('sim-temp-value').textContent = this.temperature;
            this.updateParticleSimulation();
        });
        
        document.getElementById('start-sim-btn').addEventListener('click', () => {
            this.toggleSimulation();
        });
        
        document.getElementById('reset-sim-btn').addEventListener('click', () => {
            this.resetParticleSimulation();
        });
        
        // 3D Visualization Controls
        document.getElementById('3d-temp-slider').addEventListener('input', e => {
            this.temperature = parseInt(e.target.value);
            document.getElementById('3d-temp-value').textContent = this.temperature;
        });
        
        document.getElementById('3d-mass-slider').addEventListener('input', e => {
            this.mass = parseInt(e.target.value);
            document.getElementById('3d-mass-value').textContent = this.mass;
        });
        
        document.getElementById('view-selector').addEventListener('change', () => {
            this.update3DVisualization();
        });
        
        document.getElementById('update-3d-btn').addEventListener('click', () => {
            this.update3DVisualization();
        });
        
        document.getElementById('reset-3d-btn').addEventListener('click', () => {
            this.reset3DVisualization();
        });
    }
    
    // Initialize the 1D distribution plot
    initDistributionPlot() {
        console.log("Initializing distribution plot");
        
        // Create an empty plot with proper layout
        const layout = {
            title: 'Maxwell-Boltzmann Speed Distribution',
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: {
                color: '#ffffff'
            },
            xaxis: {
                title: 'Speed (m/s)',
                color: '#ffffff',
                gridcolor: 'rgba(255, 255, 255, 0.1)'
            },
            yaxis: {
                title: 'Probability Density',
                color: '#ffffff',
                gridcolor: 'rgba(255, 255, 255, 0.1)'
            },
            showlegend: true,
            margin: { l: 60, r: 40, b: 60, t: 80, pad: 4 },
            hovermode: 'closest'
        };
        
        Plotly.newPlot('distribution-plot', [], layout);
    }
    
    // Calculate the Maxwell-Boltzmann speed distribution
    calculateSpeedDistribution(temperature, particleMass, points = 100) {
        // Convert mass from amu to kg
        const massKg = particleMass * AMU;
        
        // Create array of speeds from 0 to a reasonable maximum
        // Maximum speed chosen as 5x the most probable speed
        const mostProbableSpeed = Math.sqrt(2 * BOLTZMANN * temperature / massKg);
        const maxSpeed = 5 * mostProbableSpeed;
        
        const speeds = Array.from({ length: points }, (_, i) => i * maxSpeed / (points - 1));
        const distribution = speeds.map(v => {
            // Maxwell-Boltzmann probability density function
            const factor = Math.sqrt(Math.pow(massKg / (2 * Math.PI * BOLTZMANN * temperature), 3));
            return 4 * Math.PI * factor * v * v * Math.exp(-massKg * v * v / (2 * BOLTZMANN * temperature));
        });
        
        return { speeds, distribution };
    }
    
    // Calculate key distribution values
    calculateDistributionValues(temperature, particleMass) {
        // Convert mass from amu to kg
        const massKg = particleMass * AMU;
        
        // Most probable speed = sqrt(2kT/m)
        const mostProbableSpeed = Math.sqrt(2 * BOLTZMANN * temperature / massKg);
        
        // Average speed = sqrt(8kT/πm)
        const averageSpeed = Math.sqrt(8 * BOLTZMANN * temperature / (Math.PI * massKg));
        
        // Root mean square speed = sqrt(3kT/m)
        const rmsSpeed = Math.sqrt(3 * BOLTZMANN * temperature / massKg);
        
        // Average energy = 3kT/2
        const averageEnergy = 3 * BOLTZMANN * temperature / 2;
        
        return {
            mostProbableSpeed,
            averageSpeed,
            rmsSpeed,
            averageEnergy
        };
    }
    
    // Update the distribution plot with current parameters
    updateDistributionPlot() {
        console.log(`Updating distribution plot: T=${this.temperature}K, M=${this.mass}amu`);
        
        // Calculate distribution data
        const { speeds, distribution } = this.calculateSpeedDistribution(this.temperature, this.mass);
        
        // Calculate key values
        const values = this.calculateDistributionValues(this.temperature, this.mass);
        
        // Update key values display
        document.getElementById('most-probable').textContent = `${values.mostProbableSpeed.toFixed(1)} m/s`;
        document.getElementById('average-speed').textContent = `${values.averageSpeed.toFixed(1)} m/s`;
        document.getElementById('rms-speed').textContent = `${values.rmsSpeed.toFixed(1)} m/s`;
        document.getElementById('average-energy').textContent = `${(values.averageEnergy * 1e21).toFixed(2)} zJ`;
        
        // Create trace for the current distribution
        const trace = {
            x: speeds,
            y: distribution,
            type: 'scatter',
            mode: 'lines',
            name: `T=${this.temperature}K, M=${this.mass}amu`,
            line: {
                color: 'rgb(255, 110, 145)',
                width: 3
            }
        };
        
        // Add vertical lines for key speeds
        const mostProbableTrace = {
            x: [values.mostProbableSpeed, values.mostProbableSpeed],
            y: [0, Math.max(...distribution) * 1.1],
            type: 'scatter',
            mode: 'lines',
            name: 'Most Probable',
            line: {
                color: 'rgba(255, 110, 145, 0.5)',
                width: 2,
                dash: 'dash'
            }
        };
        
        const averageTrace = {
            x: [values.averageSpeed, values.averageSpeed],
            y: [0, Math.max(...distribution) * 1.1],
            type: 'scatter',
            mode: 'lines',
            name: 'Average',
            line: {
                color: 'rgba(51, 196, 255, 0.5)',
                width: 2,
                dash: 'dash'
            }
        };
        
        const rmsTrace = {
            x: [values.rmsSpeed, values.rmsSpeed],
            y: [0, Math.max(...distribution) * 1.1],
            type: 'scatter',
            mode: 'lines',
            name: 'RMS',
            line: {
                color: 'rgba(101, 255, 143, 0.5)',
                width: 2,
                dash: 'dash'
            }
        };
        
        // Prepare data based on whether we're in compare mode
        let plotData;
        if (this.compareMode && this.savedDistributions.length > 0) {
            // Include saved distributions in compare mode
            plotData = [...this.savedDistributions, trace, mostProbableTrace, averageTrace, rmsTrace];
        } else {
            // Only show current distribution
            plotData = [trace, mostProbableTrace, averageTrace, rmsTrace];
        }
        
        // Update the plot
        Plotly.react('distribution-plot', plotData);
    }
    
    // Reset distribution to default values
    resetDistribution() {
        console.log("Resetting distribution to default values");
        
        // Reset parameters to defaults
        this.temperature = 300;
        this.mass = 28;
        
        // Update UI
        document.getElementById('temp-slider').value = this.temperature;
        document.getElementById('temp-value').textContent = this.temperature;
        document.getElementById('mass-slider').value = this.mass;
        document.getElementById('mass-value').textContent = this.mass;
        
        // Clear saved distributions
        this.savedDistributions = [];
        this.compareMode = false;
        document.getElementById('compare-btn').innerHTML = '<i class="fas fa-chart-line"></i> Compare';
        
        // Update visualization
        this.updateDistributionPlot();
    }
    
    // Toggle compare mode (save current distribution for comparison)
    toggleCompareMode() {
        if (!this.compareMode) {
            // Enter compare mode and save current distribution
            this.compareMode = true;
            document.getElementById('compare-btn').innerHTML = '<i class="fas fa-times"></i> Clear Comparison';
            
            // Calculate current distribution
            const { speeds, distribution } = this.calculateSpeedDistribution(this.temperature, this.mass);
            
            // Add to saved distributions with a unique color
            const colors = ['#33C4FF', '#65FF8F', '#FFD700', '#FF6E91'];
            const colorIndex = this.savedDistributions.length % colors.length;
            
            this.savedDistributions.push({
                x: speeds,
                y: distribution,
                type: 'scatter',
                mode: 'lines',
                name: `T=${this.temperature}K, M=${this.mass}amu`,
                line: {
                    color: colors[colorIndex],
                    width: 2
                }
            });
        } else {
            // Exit compare mode and clear saved distributions
            this.compareMode = false;
            document.getElementById('compare-btn').innerHTML = '<i class="fas fa-chart-line"></i> Compare';
            this.savedDistributions = [];
        }
        
        // Update visualization
        this.updateDistributionPlot();
    }
    
    // Initialize the particle simulation
    initParticleSimulation() {
        console.log("Initializing particle simulation");
        
        // Create an empty plot with proper layout
        const layout = {
            title: 'Maxwell-Boltzmann Particle Simulation',
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: {
                color: '#ffffff'
            },
            xaxis: {
                title: 'Position X',
                color: '#ffffff',
                gridcolor: 'rgba(255, 255, 255, 0.1)',
                range: [-10, 10]
            },
            yaxis: {
                title: 'Position Y',
                color: '#ffffff',
                gridcolor: 'rgba(255, 255, 255, 0.1)',
                range: [-10, 10]
            },
            showlegend: false,
            margin: { l: 60, r: 40, b: 60, t: 80, pad: 4 },
            hovermode: 'closest'
        };
        
        Plotly.newPlot('particles-plot', [], layout);
        
        // Initialize particles
        this.resetParticleSimulation();
    }
    
    // Generate random particles following Maxwell-Boltzmann distribution
    generateParticles(count, temperature, particleMass) {
        console.log(`Generating ${count} particles at T=${temperature}K`);
        
        const particles = [];
        
        // Convert mass from amu to kg
        const massKg = particleMass * AMU;
        
        // Most probable speed = sqrt(2kT/m)
        const mostProbableSpeed = Math.sqrt(2 * BOLTZMANN * temperature / massKg);
        
        // Box-Muller transform to generate normally distributed velocities
        for (let i = 0; i < count; i++) {
            // Position within boundaries
            const x = (Math.random() * 16) - 8;
            const y = (Math.random() * 16) - 8;
            
            // Generate velocities using Box-Muller transform for Maxwell-Boltzmann distribution
            // For each component, we need Gaussian random values
            let vx, vy;
            
            // Box-Muller transform
            const u1 = Math.random();
            const u2 = Math.random();
            const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
            
            // Scale based on temperature and mass
            const scaleFactor = Math.sqrt(BOLTZMANN * temperature / massKg);
            vx = z1 * scaleFactor;
            vy = z2 * scaleFactor;
            
            // Calculate speed and energy
            const speed = Math.sqrt(vx * vx + vy * vy);
            const energy = 0.5 * massKg * speed * speed;
            
            // Determine color based on energy
            const colorScale = d3.scaleLinear()
                .domain([0, 3 * BOLTZMANN * temperature])  // 0 to 3kT
                .range(['#0000FF', '#FF0000'])            // Blue to Red
                .clamp(true);
                
            const color = colorScale(energy);
            
            particles.push({
                x, y, vx, vy, speed, energy, color
            });
        }
        
        return particles;
    }
    
    // Update particle simulation with current parameters
    updateParticleSimulation() {
        // Only update if simulation is not running
        if (!this.isSimulationRunning) {
            this.particles = this.generateParticles(this.particleCount, this.temperature, this.mass);
            this.renderParticles();
            this.updateParticleStats();
        }
    }
    
    // Reset particle simulation
    resetParticleSimulation() {
        console.log("Resetting particle simulation");
        
        // Stop simulation if running
        if (this.isSimulationRunning) {
            this.toggleSimulation();
        }
        
        // Reset parameters and regenerate particles
        this.particles = this.generateParticles(this.particleCount, this.temperature, this.mass);
        this.renderParticles();
        this.updateParticleStats();
    }
    
    // Render particles to the plot
    renderParticles() {
        // Prepare data for Plotly
        const x = this.particles.map(p => p.x);
        const y = this.particles.map(p => p.y);
        const colors = this.particles.map(p => p.color);
        const speeds = this.particles.map(p => p.speed);
        
        const trace = {
            x: x,
            y: y,
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 8,
                color: colors,
                line: {
                    color: 'rgba(255, 255, 255, 0.3)',
                    width: 1
                }
            },
            text: speeds.map(s => `Speed: ${s.toFixed(2)} m/s`),
            hoverinfo: 'text'
        };
        
        // Update the plot
        Plotly.react('particles-plot', [trace]);
    }
    
    // Update particle statistics display
    updateParticleStats() {
        // Calculate average energy
        const totalEnergy = this.particles.reduce((sum, p) => sum + p.energy, 0);
        const avgEnergy = totalEnergy / this.particles.length;
        
        // Calculate mass in kg
        const massKg = this.mass * AMU;
        
        // Most probable speed = sqrt(2kT/m) - the speed at the peak of the distribution
        const mostProbableSpeed = Math.sqrt(2 * BOLTZMANN * this.temperature / massKg);
        
        // Standard deviation of speed distribution
        const sigma = mostProbableSpeed / Math.sqrt(2);
        
        // Count particles within standard deviation ranges
        let within1Sigma = 0;
        let within2Sigma = 0;
        let within3Sigma = 0;
        
        this.particles.forEach(p => {
            if (Math.abs(p.speed - mostProbableSpeed) < sigma) within1Sigma++;
            if (Math.abs(p.speed - mostProbableSpeed) < 2 * sigma) within2Sigma++;
            if (Math.abs(p.speed - mostProbableSpeed) < 3 * sigma) within3Sigma++;
        });
        
        // Display stats
        document.getElementById('particles-1sigma').textContent = `${(within1Sigma / this.particles.length * 100).toFixed(1)}%`;
        document.getElementById('particles-2sigma').textContent = `${(within2Sigma / this.particles.length * 100).toFixed(1)}%`;
        document.getElementById('particles-3sigma').textContent = `${(within3Sigma / this.particles.length * 100).toFixed(1)}%`;
        document.getElementById('system-energy').textContent = `${(totalEnergy * 1e21).toFixed(2)} zJ`;
    }
    
    // Toggle particle simulation running state
    toggleSimulation() {
        if (this.isSimulationRunning) {
            // Stop simulation
            this.isSimulationRunning = false;
            clearInterval(this.simulationInterval);
            document.getElementById('sim-btn-text').textContent = 'Start';
            document.getElementById('start-sim-btn').querySelector('i').className = 'fas fa-play';
        } else {
            // Start simulation
            this.isSimulationRunning = true;
            document.getElementById('sim-btn-text').textContent = 'Pause';
            document.getElementById('start-sim-btn').querySelector('i').className = 'fas fa-pause';
            
            // Run simulation step at regular intervals
            this.simulationInterval = setInterval(() => {
                this.simulationStep();
            }, 33); // ~30 fps
        }
    }
    
    // Perform one step of the particle simulation
    simulationStep() {
        // Box boundaries
        const boxSize = 10;
        
        // Update particle positions based on velocities
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Move particle
            p.x += p.vx * 0.02;  // Scale time step for better visualization
            p.y += p.vy * 0.02;
            
            // Boundary collisions (elastic)
            if (p.x > boxSize) {
                p.x = boxSize;
                p.vx = -p.vx;
            } else if (p.x < -boxSize) {
                p.x = -boxSize;
                p.vx = -p.vx;
            }
            
            if (p.y > boxSize) {
                p.y = boxSize;
                p.vy = -p.vy;
            } else if (p.y < -boxSize) {
                p.y = -boxSize;
                p.vy = -p.vy;
            }
            
            // Update speed and energy
            p.speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            p.energy = 0.5 * (this.mass * AMU) * p.speed * p.speed;
            
            // Update color based on energy
            const colorScale = d3.scaleLinear()
                .domain([0, 3 * BOLTZMANN * this.temperature])  // 0 to 3kT
                .range(['#0000FF', '#FF0000'])                 // Blue to Red
                .clamp(true);
                
            p.color = colorScale(p.energy);
        }
        
        // Render updated particles
        this.renderParticles();
        
        // Update statistics periodically (every 10 frames)
        if (this.frameCount % 10 === 0) {
            this.updateParticleStats();
        }
        this.frameCount = (this.frameCount || 0) + 1;
    }
    
    // Initialize 3D visualization
    init3DVisualization() {
        console.log("Initializing 3D visualization");
        
        // Create an empty plot with proper layout
        const layout = {
            title: '3D Maxwell-Boltzmann Distribution',
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: {
                color: '#ffffff'
            },
            scene: {
                xaxis: {
                    title: 'Velocity X (m/s)',
                    color: '#ffffff',
                    gridcolor: 'rgba(255, 255, 255, 0.1)'
                },
                yaxis: {
                    title: 'Velocity Y (m/s)',
                    color: '#ffffff',
                    gridcolor: 'rgba(255, 255, 255, 0.1)'
                },
                zaxis: {
                    title: 'Probability Density',
                    color: '#ffffff',
                    gridcolor: 'rgba(255, 255, 255, 0.1)'
                },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.2 }
                },
                aspectmode: 'data'
            },
            margin: { l: 0, r: 0, b: 0, t: 50, pad: 4 }
        };
        
        Plotly.newPlot('3d-plot', [], layout);
        
        // Initial 3D visualization
        this.update3DVisualization();
    }
    
    // Calculate 3D Maxwell-Boltzmann distribution
    calculate3DDistribution(temperature, particleMass, resolution = 50) {
        console.log(`Calculating 3D distribution: T=${temperature}K, M=${particleMass}amu`);
        
        // Convert mass from amu to kg
        const massKg = particleMass * AMU;
        
        // Most probable speed = sqrt(2kT/m)
        const mostProbableSpeed = Math.sqrt(2 * BOLTZMANN * temperature / massKg);
        
        // Create arrays for velocity components
        const velocityRange = 3 * mostProbableSpeed; // Range from -3v_p to 3v_p
        const velocities = Array.from({ length: resolution }, (_, i) => 
            -velocityRange + i * (2 * velocityRange) / (resolution - 1)
        );
        
        // Prepare data structures for the 3D plot
        const x = [];
        const y = [];
        const z = [];
        
        // Calculate the full 3D distribution
        for (let i = 0; i < velocities.length; i++) {
            for (let j = 0; j < velocities.length; j++) {
                const vx = velocities[i];
                const vy = velocities[j];
                
                // Maxwell-Boltzmann probability density for 2 components (2D slice of 3D)
                const exponent = -massKg * (vx * vx + vy * vy) / (2 * BOLTZMANN * temperature);
                const factor = Math.pow(massKg / (2 * Math.PI * BOLTZMANN * temperature), 1);
                const probabilityDensity = factor * Math.exp(exponent);
                
                x.push(vx);
                y.push(vy);
                z.push(probabilityDensity);
            }
        }
        
        return { x, y, z, resolution };
    }
    
    // Update 3D visualization with current parameters
    update3DVisualization() {
        console.log(`Updating 3D visualization: T=${this.temperature}K, M=${this.mass}amu`);
        
        // Get view type
        const viewType = document.getElementById('view-selector').value;
        
        // Calculate distribution data
        const { x, y, z, resolution } = this.calculate3DDistribution(this.temperature, this.mass);
        
        // Prepare plot data based on view type
        let plotData;
        
        if (viewType === 'surface') {
            // Surface plot (continuous)
            plotData = [{
                type: 'surface',
                x: x,
                y: y,
                z: z,
                colorscale: [
                    [0, 'rgb(0, 0, 255)'],
                    [0.5, 'rgb(0, 255, 0)'],
                    [1, 'rgb(255, 0, 0)']
                ],
                showscale: false,
                hoverinfo: 'none'
            }];
        } else if (viewType === 'isosurface') {
            // Create a 3D array for isosurface
            const zArr = [];
            for (let i = 0; i < resolution; i++) {
                const zSlice = [];
                for (let j = 0; j < resolution; j++) {
                    zSlice.push(z[i * resolution + j]);
                }
                zArr.push(zSlice);
            }
            
            // Find max value for isosurface levels
            const maxVal = Math.max(...z);
            
            // Isosurfaces at different levels
            plotData = [{
                type: 'isosurface',
                x: x.slice(0, resolution),
                y: y.filter((_, i) => i % resolution === 0),
                z: zArr,
                isomin: 0.1 * maxVal,
                isomax: 0.9 * maxVal,
                surface: { count: 3, fill: 0.8, pattern: 'all' },
                colorscale: [
                    [0, 'rgb(0, 0, 255)'],
                    [0.5, 'rgb(0, 255, 0)'],
                    [1, 'rgb(255, 0, 0)']
                ],
                caps: {
                    x: { show: false },
                    y: { show: false },
                    z: { show: false }
                },
                showscale: false
            }];
        } else if (viewType === 'contour') {
            // Scatter3d with contour slices
            const contourData = [];
            
            // Find max value for contour levels
            const maxVal = Math.max(...z);
            
            // Create several z-planes with contours
            for (let level = 0.1; level <= 0.9; level += 0.2) {
                const threshold = level * maxVal;
                
                // Create points for this contour level
                const contourX = [];
                const contourY = [];
                const contourZ = [];
                
                // Add points that are close to the threshold
                for (let i = 0; i < z.length; i++) {
                    if (Math.abs(z[i] - threshold) < threshold * 0.1) {
                        contourX.push(x[i]);
                        contourY.push(y[i]);
                        contourZ.push(z[i]);
                    }
                }
                
                contourData.push({
                    type: 'scatter3d',
                    mode: 'markers',
                    x: contourX,
                    y: contourY,
                    z: contourZ,
                    marker: {
                        size: 3,
                        color: z,
                        colorscale: [
                            [0, 'rgb(0, 0, 255)'],
                            [0.5, 'rgb(0, 255, 0)'],
                            [1, 'rgb(255, 0, 0)']
                        ],
                        opacity: 0.7
                    },
                    name: `Level ${level.toFixed(1)}`,
                    showlegend: false
                });
            }
            
            plotData = contourData;
        }
        
        // Update the plot
        Plotly.react('3d-plot', plotData);
    }
    
    // Reset 3D visualization to default values
    reset3DVisualization() {
        console.log("Resetting 3D visualization to default values");
        
        // Reset parameters to defaults
        this.temperature = 300;
        this.mass = 28;
        
        // Update UI
        document.getElementById('3d-temp-slider').value = this.temperature;
        document.getElementById('3d-temp-value').textContent = this.temperature;
        document.getElementById('3d-mass-slider').value = this.mass;
        document.getElementById('3d-mass-value').textContent = this.mass;
        document.getElementById('view-selector').value = 'surface';
        
        // Update visualization
        this.update3DVisualization();
    }
    
    // Update all visualizations with current parameters
    updateAllVisualizations() {
        this.updateDistributionPlot();
        this.updateParticleSimulation();
        this.update3DVisualization();
    }
}

// Initialize the visualizer when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing Maxwell-Boltzmann Visualizer");
    try {
        const visualizer = new MaxwellBoltzmannVisualizer();
        console.log("Maxwell-Boltzmann Visualizer loaded successfully");
        
        // Store reference to visualizer globally for debugging
        window.mbVisualizer = visualizer;
    } catch (error) {
        console.error("Error initializing Maxwell-Boltzmann Visualizer:", error);
    }
}); 