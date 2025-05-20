/**
 * Topological Diffusion GAN - 4D Manifold Explorer
 * 
 * This script implements a combination of diffusion models and generative adversarial networks
 * to identify, generate, and visualize topological maps for 4D manifolds.
 */

// Main configuration and parameters
const config = {
    // Diffusion model parameters
    diffusion: {
        noiseStrength: 0.5,
        steps: 100,
        samplingMethod: 'ddpm'
    },
    
    // Topological randomization parameters
    topology: {
        twistComplexity: 3,
        curveComplexity: 3,
        dimensionChanges: 4
    },
    
    // GAN parameters
    gan: {
        learningRate: 0.001,
        batchSize: 32,
        iterations: 1000
    },
    
    // Mapping parameters
    mapping: {
        matchingThreshold: 0.7,
        filterStrength: 0.5,
        showOnlyMatches: false
    }
};

// Data structures for visualization
let diffusionData = {
    trajectories: [],
    initialNoise: [],
    finalSamples: []
};

let ganData = {
    realSamples: [],
    generatedSamples: [],
    discriminatorBoundary: []
};

let topoMapData = {
    twistAreas: [],
    curveAreas: [],
    dimensionalChanges: [],
    properMatches: []
};

// Topological properties
let topoProperties = {
    eulerCharacteristic: 0,
    bettiNumbers: [1, 0, 1, 0],
    stiefelWhitney: [0, 0, 1, 0],
    pontryaginNumbers: [0, 0],
    signature: 0
};

// Particle configurations
const particleConfigurations = {
    proton: {
        quarks: ['up', 'up', 'down'],
        colors: ['red', 'blue', 'green'],
        topologicalProperties: {
            twist: 2,
            curve: 3,
            dimension: 4
        }
    },
    neutron: {
        quarks: ['down', 'down', 'up'],
        colors: ['red', 'blue', 'green'],
        topologicalProperties: {
            twist: 2,
            curve: 3,
            dimension: 4
        }
    },
    lambda: {
        quarks: ['up', 'down', 'strange'],
        colors: ['red', 'blue', 'green'],
        topologicalProperties: {
            twist: 3,
            curve: 2,
            dimension: 4
        }
    },
    sigma: {
        quarks: ['up', 'up', 'strange'],
        colors: ['red', 'blue', 'green'],
        topologicalProperties: {
            twist: 3,
            curve: 3,
            dimension: 4
        }
    },
    xi: {
        quarks: ['strange', 'strange', 'up'],
        colors: ['red', 'blue', 'green'],
        topologicalProperties: {
            twist: 4,
            curve: 2,
            dimension: 4
        }
    },
    omega: {
        quarks: ['strange', 'strange', 'strange'],
        colors: ['red', 'blue', 'green'],
        topologicalProperties: {
            twist: 4,
            curve: 4,
            dimension: 4
        }
    }
};

class TopologicalDiffusionGAN {
    constructor() {
        this.matchedTopologies = [];
        this.isGenerating = false;
        this.currentParticle = 'proton';
        this.initializePlots();
        this.setupEventListeners();
    }

    initializePlots() {
        // Initialize the three plots
        this.initializeTopoMap();
        this.initializeDiffusionPlot();
        this.initializeGANPlot();
    }

    initializeTopoMap() {
        const topoData = {
            type: 'scatter3d',
            mode: 'markers',
            marker: {
                size: 5,
                color: 'rgb(187, 134, 252)',
                opacity: 0.8
            }
        };

        const layout = {
            title: 'Topological Map',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            scene: {
                xaxis: { title: 'Twist' },
                yaxis: { title: 'Curve' },
                zaxis: { title: 'Dimension' }
            },
            margin: { l: 0, r: 0, t: 30, b: 0 },
            showlegend: false
        };

        Plotly.newPlot('topo-map-plot', [topoData], layout);
    }

    initializeDiffusionPlot() {
        const diffusionData = {
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: 'rgb(187, 134, 252)' }
        };

        const layout = {
            title: 'Diffusion Process',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: { l: 40, r: 40, t: 40, b: 40 },
            showlegend: false
        };

        Plotly.newPlot('diffusion-plot', [diffusionData], layout);
    }

    initializeGANPlot() {
        const ganData = {
            type: 'scatter',
            mode: 'markers',
            marker: { color: 'rgb(51, 196, 255)' }
        };

        const layout = {
            title: 'GAN Distribution',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: { l: 40, r: 40, t: 40, b: 40 },
            showlegend: false
        };

        Plotly.newPlot('gan-plot', [ganData], layout);
    }

    setupEventListeners() {
        // Particle type selection
        document.getElementById('particle-type').addEventListener('change', (e) => {
            this.currentParticle = e.target.value;
            this.updateTargetProperties();
        });

        // Auto-generate toggle
        document.getElementById('auto-generate').addEventListener('change', (e) => {
            this.isGenerating = e.target.checked;
            if (this.isGenerating) {
                this.startContinuousGeneration();
            }
        });

        // Generate button
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateTopology();
        });

        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetGeneration();
        });
    }

    updateTargetProperties() {
        const config = particleConfigurations[this.currentParticle];
        document.getElementById('twist-complexity').value = config.topologicalProperties.twist;
        document.getElementById('curve-complexity').value = config.topologicalProperties.curve;
        document.getElementById('dimension-changes').value = config.topologicalProperties.dimension;
        
        // Update displayed values
        document.getElementById('twist-complexity-value').textContent = config.topologicalProperties.twist;
        document.getElementById('curve-complexity-value').textContent = config.topologicalProperties.curve;
        document.getElementById('dimension-changes-value').textContent = config.topologicalProperties.dimension;
    }

    async startContinuousGeneration() {
        while (this.isGenerating && this.matchedTopologies.length < 3) {
            await this.generateTopology();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between generations
        }
        
        if (this.matchedTopologies.length >= 3) {
            this.isGenerating = false;
            document.getElementById('auto-generate').checked = false;
            this.displaySuccess();
        }
    }

    async generateTopology() {
        const config = particleConfigurations[this.currentParticle];
        
        // Generate new topology
        const topology = await this.runDiffusionStep();
        
        // Check if it matches target properties
        if (this.checkTopologyMatch(topology, config)) {
            this.matchedTopologies.push(topology);
            this.updateMatchCount();
            this.updateTopoMap();
        }
    }

    async runDiffusionStep() {
        // Simulate diffusion process
        const steps = parseInt(document.getElementById('diffusion-steps').value);
        const noiseStrength = parseFloat(document.getElementById('noise-strength').value);
        
        // Generate random topology properties
        return {
            twist: Math.random() * 10,
            curve: Math.random() * 10,
            dimension: Math.random() * 10,
            color: ['red', 'blue', 'green'][this.matchedTopologies.length % 3]
        };
    }

    checkTopologyMatch(topology, config) {
        const threshold = parseFloat(document.getElementById('matching-threshold').value);
        
        // Check if properties match within threshold
        return Math.abs(topology.twist - config.topologicalProperties.twist) < threshold &&
               Math.abs(topology.curve - config.topologicalProperties.curve) < threshold &&
               Math.abs(topology.dimension - config.topologicalProperties.dimension) < threshold;
    }

    updateMatchCount() {
        document.getElementById('match-count').textContent = `${this.matchedTopologies.length}/3`;
    }

    updateTopoMap() {
        const data = this.matchedTopologies.map(t => ({
            x: [t.twist],
            y: [t.curve],
            z: [t.dimension],
            type: 'scatter3d',
            mode: 'markers',
            marker: {
                size: 10,
                color: t.color,
                opacity: 0.8
            }
        }));

        Plotly.react('topo-map-plot', data);
    }

    displaySuccess() {
        // Update properties panel with final configuration
        document.getElementById('euler-characteristic').textContent = this.calculateEulerCharacteristic();
        document.getElementById('betti-numbers').textContent = this.calculateBettiNumbers();
        document.getElementById('stiefel-whitney').textContent = this.calculateStiefelWhitney();
        document.getElementById('pontryagin-numbers').textContent = this.calculatePontryaginNumbers();
        document.getElementById('signature').textContent = this.calculateSignature();
    }

    resetGeneration() {
        this.matchedTopologies = [];
        this.isGenerating = false;
        document.getElementById('auto-generate').checked = false;
        this.updateMatchCount();
        this.initializePlots();
    }

    // Mathematical calculations for topological properties
    calculateEulerCharacteristic() {
        return this.matchedTopologies.length > 0 ? 2 : 0;
    }

    calculateBettiNumbers() {
        return '[1, 0, 1, 0]';
    }

    calculateStiefelWhitney() {
        return '[0, 0, 1, 0]';
    }

    calculatePontryaginNumbers() {
        return '[0, 0]';
    }

    calculateSignature() {
        return '0';
    }
}

/**
 * Initialize the visualizations and UI event handlers
 */
function initialize() {
    // Create initial empty plots
    createDiffusionPlot();
    createGANPlot();
    createTopoMapPlot();
    
    // Set up UI event handlers
    setupUIHandlers();
    
    // Initialize with some random data for visualization
    generateRandomData();
    updatePlots();
}

/**
 * Set up all UI event handlers for the controls
 */
function setupUIHandlers() {
    // Diffusion parameters
    document.getElementById('noise-strength').addEventListener('input', function(e) {
        config.diffusion.noiseStrength = parseFloat(e.target.value);
        document.getElementById('noise-strength-value').textContent = e.target.value;
    });
    
    document.getElementById('diffusion-steps').addEventListener('input', function(e) {
        config.diffusion.steps = parseInt(e.target.value);
        document.getElementById('diffusion-steps-value').textContent = e.target.value;
    });
    
    document.getElementById('sampling-method').addEventListener('change', function(e) {
        config.diffusion.samplingMethod = e.target.value;
    });
    
    // Topological randomization
    document.getElementById('twist-complexity').addEventListener('input', function(e) {
        config.topology.twistComplexity = parseInt(e.target.value);
        document.getElementById('twist-complexity-value').textContent = e.target.value;
    });
    
    document.getElementById('curve-complexity').addEventListener('input', function(e) {
        config.topology.curveComplexity = parseInt(e.target.value);
        document.getElementById('curve-complexity-value').textContent = e.target.value;
    });
    
    document.getElementById('dimension-changes').addEventListener('input', function(e) {
        config.topology.dimensionChanges = parseInt(e.target.value);
        document.getElementById('dimension-changes-value').textContent = e.target.value;
    });
    
    // GAN parameters
    document.getElementById('learning-rate').addEventListener('input', function(e) {
        config.gan.learningRate = parseFloat(e.target.value);
        document.getElementById('learning-rate-value').textContent = e.target.value;
    });
    
    document.getElementById('batch-size').addEventListener('input', function(e) {
        config.gan.batchSize = parseInt(e.target.value);
        document.getElementById('batch-size-value').textContent = e.target.value;
    });
    
    document.getElementById('gan-iterations').addEventListener('input', function(e) {
        config.gan.iterations = parseInt(e.target.value);
        document.getElementById('gan-iterations-value').textContent = e.target.value;
    });
    
    // Mapping parameters
    document.getElementById('matching-threshold').addEventListener('input', function(e) {
        config.mapping.matchingThreshold = parseFloat(e.target.value);
        document.getElementById('matching-threshold-value').textContent = e.target.value;
    });
    
    document.getElementById('filter-strength').addEventListener('input', function(e) {
        config.mapping.filterStrength = parseFloat(e.target.value);
        document.getElementById('filter-strength-value').textContent = e.target.value;
    });
    
    document.getElementById('show-only-matches').addEventListener('change', function(e) {
        config.mapping.showOnlyMatches = e.target.checked;
        updateTopoMapPlot();
    });
    
    // Action buttons
    document.getElementById('generate-btn').addEventListener('click', function() {
        runDiffusionProcess();
    });
    
    document.getElementById('identify-btn').addEventListener('click', function() {
        identifyTopologicalMaps();
    });
    
    document.getElementById('reset-btn').addEventListener('click', function() {
        resetAll();
    });
}

/**
 * Create the diffusion process visualization
 */
function createDiffusionPlot() {
    const data = [{
        type: 'scatter3d',
        mode: 'markers',
        x: [],
        y: [],
        z: [],
        marker: {
            size: 5,
            color: 'rgba(255, 110, 145, 0.8)', // var(--gan-real)
            symbol: 'circle'
        },
        name: 'Initial Noise'
    }, {
        type: 'scatter3d',
        mode: 'markers',
        x: [],
        y: [],
        z: [],
        marker: {
            size: 5,
            color: 'rgba(51, 196, 255, 0.8)', // var(--gan-generated)
            symbol: 'circle'
        },
        name: 'Generated Samples'
    }, {
        type: 'scatter3d',
        mode: 'lines',
        x: [],
        y: [],
        z: [],
        line: {
            color: 'rgba(187, 134, 252, 0.8)', // var(--gan-diffusion)
            width: 3
        },
        name: 'Diffusion Trajectory'
    }];
    
    const layout = {
        title: 'Diffusion Process',
        paper_bgcolor: 'rgba(30, 30, 30, 0.0)',
        plot_bgcolor: 'rgba(30, 30, 30, 0.0)',
        margin: { l: 0, r: 0, b: 0, t: 30 },
        scene: {
            xaxis: { title: 'X', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            yaxis: { title: 'Y', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            zaxis: { title: 'Z', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
        },
        font: { color: '#b0b0b0' },
        showlegend: false
    };
    
    Plotly.newPlot('diffusion-plot', data, layout, { responsive: true });
}

/**
 * Create the GAN training visualization
 */
function createGANPlot() {
    const data = [{
        type: 'scatter3d',
        mode: 'markers',
        x: [],
        y: [],
        z: [],
        marker: {
            size: 5,
            color: 'rgba(255, 110, 145, 0.8)', // var(--gan-real)
            symbol: 'circle'
        },
        name: 'Real Samples'
    }, {
        type: 'scatter3d',
        mode: 'markers',
        x: [],
        y: [],
        z: [],
        marker: {
            size: 5,
            color: 'rgba(51, 196, 255, 0.8)', // var(--gan-generated)
            symbol: 'circle'
        },
        name: 'Generated Samples'
    }, {
        type: 'mesh3d',
        x: [],
        y: [],
        z: [],
        opacity: 0.5,
        color: 'rgba(101, 255, 143, 0.5)', // var(--gan-discriminator)
        name: 'Discriminator Boundary'
    }];
    
    const layout = {
        title: 'GAN Distribution',
        paper_bgcolor: 'rgba(30, 30, 30, 0.0)',
        plot_bgcolor: 'rgba(30, 30, 30, 0.0)',
        margin: { l: 0, r: 0, b: 0, t: 30 },
        scene: {
            xaxis: { title: 'X', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            yaxis: { title: 'Y', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            zaxis: { title: 'Z', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
        },
        font: { color: '#b0b0b0' },
        showlegend: false
    };
    
    Plotly.newPlot('gan-plot', data, layout, { responsive: true });
}

/**
 * Create the topological map visualization
 */
function createTopoMapPlot() {
    const data = [{
        type: 'mesh3d',
        x: [],
        y: [],
        z: [],
        opacity: 0.7,
        color: 'rgba(255, 110, 145, 0.8)', // var(--topo-twist)
        name: 'Twist Areas'
    }, {
        type: 'mesh3d',
        x: [],
        y: [],
        z: [],
        opacity: 0.7,
        color: 'rgba(51, 196, 255, 0.8)', // var(--topo-curve)
        name: 'Curve Areas'
    }, {
        type: 'mesh3d',
        x: [],
        y: [],
        z: [],
        opacity: 0.7,
        color: 'rgba(101, 255, 143, 0.8)', // var(--topo-dim-change)
        name: 'Dimensional Changes'
    }, {
        type: 'scatter3d',
        mode: 'markers',
        x: [],
        y: [],
        z: [],
        marker: {
            size: 8,
            color: 'rgba(187, 134, 252, 1.0)', // var(--topo-match)
            symbol: 'circle'
        },
        name: 'Proper Matches'
    }];
    
    const layout = {
        title: 'Topological Map',
        paper_bgcolor: 'rgba(30, 30, 30, 0.0)',
        plot_bgcolor: 'rgba(30, 30, 30, 0.0)',
        margin: { l: 0, r: 0, b: 30, t: 30 },
        scene: {
            xaxis: { title: 'X', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            yaxis: { title: 'Y', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            zaxis: { title: 'Z', gridcolor: '#444', showbackground: true, backgroundcolor: 'rgba(30, 30, 30, 0.7)' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
        },
        font: { color: '#b0b0b0' },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            bgcolor: 'rgba(30, 30, 30, 0.7)',
            bordercolor: '#333'
        }
    };
    
    Plotly.newPlot('topo-map-plot', data, layout, { responsive: true });
}

/**
 * Update all visualizations with current data
 */
function updatePlots() {
    updateDiffusionPlot();
    updateGANPlot();
    updateTopoMapPlot();
    updateTopoProperties();
}

/**
 * Update the diffusion plot with current data
 */
function updateDiffusionPlot() {
    const initialNoiseX = diffusionData.initialNoise.map(p => p.x);
    const initialNoiseY = diffusionData.initialNoise.map(p => p.y);
    const initialNoiseZ = diffusionData.initialNoise.map(p => p.z);
    
    const finalSamplesX = diffusionData.finalSamples.map(p => p.x);
    const finalSamplesY = diffusionData.finalSamples.map(p => p.y);
    const finalSamplesZ = diffusionData.finalSamples.map(p => p.z);
    
    const trajectoryX = diffusionData.trajectories.map(p => p.x).flat();
    const trajectoryY = diffusionData.trajectories.map(p => p.y).flat();
    const trajectoryZ = diffusionData.trajectories.map(p => p.z).flat();
    
    Plotly.update('diffusion-plot', {
        x: [initialNoiseX, finalSamplesX, trajectoryX],
        y: [initialNoiseY, finalSamplesY, trajectoryY],
        z: [initialNoiseZ, finalSamplesZ, trajectoryZ]
    }, {}, [0, 1, 2]);
}

/**
 * Update the GAN plot with current data
 */
function updateGANPlot() {
    const realX = ganData.realSamples.map(p => p.x);
    const realY = ganData.realSamples.map(p => p.y);
    const realZ = ganData.realSamples.map(p => p.z);
    
    const generatedX = ganData.generatedSamples.map(p => p.x);
    const generatedY = ganData.generatedSamples.map(p => p.y);
    const generatedZ = ganData.generatedSamples.map(p => p.z);
    
    const boundaryX = ganData.discriminatorBoundary.x || [];
    const boundaryY = ganData.discriminatorBoundary.y || [];
    const boundaryZ = ganData.discriminatorBoundary.z || [];
    
    Plotly.update('gan-plot', {
        x: [realX, generatedX, boundaryX],
        y: [realY, generatedY, boundaryY],
        z: [realZ, generatedZ, boundaryZ]
    }, {}, [0, 1, 2]);
}

/**
 * Update the topological map plot with current data
 */
function updateTopoMapPlot() {
    const twistX = topoMapData.twistAreas.x || [];
    const twistY = topoMapData.twistAreas.y || [];
    const twistZ = topoMapData.twistAreas.z || [];
    
    const curveX = topoMapData.curveAreas.x || [];
    const curveY = topoMapData.curveAreas.y || [];
    const curveZ = topoMapData.curveAreas.z || [];
    
    const dimChangeX = topoMapData.dimensionalChanges.x || [];
    const dimChangeY = topoMapData.dimensionalChanges.y || [];
    const dimChangeZ = topoMapData.dimensionalChanges.z || [];
    
    const matchesX = topoMapData.properMatches.map(p => p.x);
    const matchesY = topoMapData.properMatches.map(p => p.y);
    const matchesZ = topoMapData.properMatches.map(p => p.z);
    
    // Apply visibility filter if show only matches is enabled
    const visibilityArray = config.mapping.showOnlyMatches ? 
        [false, false, false, true] : 
        [true, true, true, true];
    
    Plotly.update('topo-map-plot', {
        x: [twistX, curveX, dimChangeX, matchesX],
        y: [twistY, curveY, dimChangeY, matchesY],
        z: [twistZ, curveZ, dimChangeZ, matchesZ],
        visible: visibilityArray
    }, {}, [0, 1, 2, 3]);
}

/**
 * Update the topological properties display
 */
function updateTopoProperties() {
    document.getElementById('euler-characteristic').textContent = topoProperties.eulerCharacteristic;
    document.getElementById('betti-numbers').textContent = JSON.stringify(topoProperties.bettiNumbers);
    document.getElementById('stiefel-whitney').textContent = JSON.stringify(topoProperties.stiefelWhitney);
    document.getElementById('pontryagin-numbers').textContent = JSON.stringify(topoProperties.pontryaginNumbers);
    document.getElementById('signature').textContent = topoProperties.signature;
}

/**
 * Run the diffusion process to generate new topological samples
 */
function runDiffusionProcess() {
    console.log("Starting diffusion process with parameters:", config.diffusion);
    
    // Generate initial noise
    const numSamples = 10;
    diffusionData.initialNoise = [];
    diffusionData.finalSamples = [];
    diffusionData.trajectories = [];
    
    for (let i = 0; i < numSamples; i++) {
        // Create initial random noise
        const initialNoise = {
            x: (Math.random() * 2 - 1) * 2,
            y: (Math.random() * 2 - 1) * 2,
            z: (Math.random() * 2 - 1) * 2
        };
        diffusionData.initialNoise.push(initialNoise);
        
        // Create trajectory path for visualization
        let trajectory = simulateDiffusionTrajectory(initialNoise, config.diffusion.steps);
        diffusionData.trajectories.push(trajectory);
        
        // Get final generated sample
        const finalSample = trajectory[trajectory.length - 1];
        diffusionData.finalSamples.push(finalSample);
    }
    
    // Update plots
    updateDiffusionPlot();
    
    // Update GAN training with the generated samples
    trainGANWithSamples(diffusionData.finalSamples);
}

/**
 * Simulate a diffusion trajectory for visualization
 */
function simulateDiffusionTrajectory(initialPoint, steps) {
    let trajectory = [];
    let currentPoint = { ...initialPoint };
    
    const noiseStrength = config.diffusion.noiseStrength;
    const twistFactor = config.topology.twistComplexity * 0.2;
    const curveFactor = config.topology.curveComplexity * 0.1;
    
    // Add initial point
    trajectory.push({ ...currentPoint });
    
    // Generate trajectory using a simplified diffusion model
    for (let i = 0; i < steps; i++) {
        const t = i / steps; // Normalized time parameter
        
        // Calculate direction of movement (gradient towards manifold)
        const gradient = {
            x: Math.sin(currentPoint.y * twistFactor + t * Math.PI) * curveFactor,
            y: Math.sin(currentPoint.z * twistFactor + t * Math.PI) * curveFactor,
            z: Math.sin(currentPoint.x * twistFactor + t * Math.PI) * curveFactor
        };
        
        // Add noise based on noise strength and current step
        const noise = {
            x: (Math.random() * 2 - 1) * noiseStrength * (1 - t),
            y: (Math.random() * 2 - 1) * noiseStrength * (1 - t),
            z: (Math.random() * 2 - 1) * noiseStrength * (1 - t)
        };
        
        // Update point position
        currentPoint.x += gradient.x + noise.x;
        currentPoint.y += gradient.y + noise.y;
        currentPoint.z += gradient.z + noise.z;
        
        // Add to trajectory if significant movement
        if (i % Math.max(1, Math.floor(steps / 20)) === 0) {
            trajectory.push({ ...currentPoint });
        }
    }
    
    // Add a final point if not already added
    if (trajectory[trajectory.length - 1] !== currentPoint) {
        trajectory.push({ ...currentPoint });
    }
    
    return trajectory;
}

/**
 * Train the GAN with the generated samples from diffusion
 */
function trainGANWithSamples(samples) {
    console.log("Training GAN with parameters:", config.gan);
    
    // Generate real samples (with more diverse data than the diffusion samples)
    ganData.realSamples = generateRealTopoSamples(20);
    
    // Use the diffusion samples as starting points for GAN generation
    ganData.generatedSamples = [...samples];
    
    // Simulate GAN training by adjusting generated samples toward the manifold
    for (let i = 0; i < ganData.generatedSamples.length; i++) {
        const sample = ganData.generatedSamples[i];
        
        // Apply slight adjustments to make samples better fit the target distribution
        sample.x += (Math.random() * 2 - 1) * 0.5;
        sample.y += (Math.random() * 2 - 1) * 0.5;
        sample.z += (Math.random() * 2 - 1) * 0.5;
    }
    
    // Generate discriminator boundary (simplified for visualization)
    ganData.discriminatorBoundary = generateDiscriminatorBoundary();
    
    // Update GAN plot
    updateGANPlot();
}

/**
 * Generate "real" topological samples for GAN training
 */
function generateRealTopoSamples(count) {
    let samples = [];
    
    // Generate samples along a torus-like manifold to create a realistic distribution
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 0.2 - 0.1;
        
        // Distort the torus slightly based on topology parameters
        const twistDistortion = Math.sin(theta * config.topology.twistComplexity * 0.5) * 0.3;
        const curveDistortion = Math.cos(phi * config.topology.curveComplexity * 0.5) * 0.3;
        
        samples.push({
            x: (r + 0.5 * Math.cos(phi)) * Math.cos(theta) + twistDistortion,
            y: (r + 0.5 * Math.cos(phi)) * Math.sin(theta) + curveDistortion,
            z: 0.5 * Math.sin(phi) + twistDistortion * curveDistortion
        });
    }
    
    return samples;
}

/**
 * Generate a discriminator boundary visualization
 */
function generateDiscriminatorBoundary() {
    // Create a surface that approximates the decision boundary
    // For visualization purposes only
    
    const resolution = 10;
    const x = [];
    const y = [];
    const z = [];
    
    // Create a grid of points
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const theta = (i / (resolution - 1)) * Math.PI * 2;
            const phi = (j / (resolution - 1)) * Math.PI * 2;
            const r = 1.5 + 0.2 * Math.sin(theta * phi * 3);
            
            x.push((r + 0.6 * Math.cos(phi)) * Math.cos(theta));
            y.push((r + 0.6 * Math.cos(phi)) * Math.sin(theta));
            z.push(0.6 * Math.sin(phi));
        }
    }
    
    return { x, y, z };
}

/**
 * Identify topological maps from the generated samples
 */
function identifyTopologicalMaps() {
    console.log("Identifying topological maps with parameters:", config.mapping);
    
    // Generate topological structures based on the parameters
    generateTopologicalMaps();
    
    // Analyze the properties of the generated topological structures
    analyzeTopologicalProperties();
    
    // Update visualization
    updateTopoMapPlot();
    updateTopoProperties();
}

/**
 * Generate topological map visualizations based on current parameters
 */
function generateTopologicalMaps() {
    // Generate twisted areas
    topoMapData.twistAreas = generateTwistSurface();
    
    // Generate curved areas
    topoMapData.curveAreas = generateCurveSurface();
    
    // Generate dimensional change areas
    topoMapData.dimensionalChanges = generateDimensionalChangeSurface();
    
    // Identify proper matches (points of interest at intersections)
    topoMapData.properMatches = identifyProperMatches();
}

/**
 * Generate a surface representing twist areas
 */
function generateTwistSurface() {
    const resolution = 20;
    const x = [];
    const y = [];
    const z = [];
    
    const twistCount = config.topology.twistComplexity;
    
    // Create a möbius-strip-like surface with varying twist
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const u = (i / (resolution - 1)) * Math.PI * 2;
            const v = (j / (resolution - 1) - 0.5) * 2;
            
            const twistFactor = Math.sin(twistCount * u);
            
            x.push((1.2 + 0.2 * v * Math.cos(u * twistCount / 2)) * Math.cos(u));
            y.push((1.2 + 0.2 * v * Math.cos(u * twistCount / 2)) * Math.sin(u));
            z.push(0.2 * v * Math.sin(u * twistCount / 2) + 0.8 * twistFactor);
        }
    }
    
    return { x, y, z };
}

/**
 * Generate a surface representing curve areas
 */
function generateCurveSurface() {
    const resolution = 20;
    const x = [];
    const y = [];
    const z = [];
    
    const curveCount = config.topology.curveComplexity;
    
    // Create a curved surface with varying curvature
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const u = (i / (resolution - 1) - 0.5) * Math.PI * 2;
            const v = (j / (resolution - 1) - 0.5) * Math.PI * 2;
            
            const curveFactor = Math.cos(curveCount * v) * Math.sin(curveCount * u);
            
            x.push(1.2 * u + 0.5 * curveFactor);
            y.push(1.2 * v - 0.5 * curveFactor);
            z.push(0.8 * curveFactor);
        }
    }
    
    return { x, y, z };
}

/**
 * Generate a surface representing dimensional change areas
 */
function generateDimensionalChangeSurface() {
    const resolution = 20;
    const x = [];
    const y = [];
    const z = [];
    
    const dimChangeCount = config.topology.dimensionChanges;
    
    // Create a surface with varying dimensional changes
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const u = (i / (resolution - 1)) * Math.PI * 2;
            const v = (j / (resolution - 1)) * Math.PI;
            
            const dimChangeFactor = Math.sin(dimChangeCount * u) * Math.cos(dimChangeCount * v);
            
            x.push(Math.sin(u) * Math.sin(v) + 0.3 * dimChangeFactor);
            y.push(Math.cos(u) * Math.sin(v) - 0.3 * dimChangeFactor);
            z.push(Math.cos(v) + 0.3 * dimChangeFactor);
        }
    }
    
    return { x, y, z };
}

/**
 * Identify proper matches (intersection points of interest)
 */
function identifyProperMatches() {
    const matches = [];
    const matchThreshold = config.mapping.matchingThreshold;
    const filterStrength = config.mapping.filterStrength;
    
    // Generate points where the topological features properly match
    const sampleCount = 30;
    
    for (let i = 0; i < sampleCount; i++) {
        // Generate random points
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        
        // Calculate distance metrics to each surface
        const twistDistance = Math.random(); // Simplified; would be actual distance calculation
        const curveDistance = Math.random();
        const dimChangeDistance = Math.random();
        
        // Apply matching criteria
        const matchScore = (
            (1 - twistDistance) * 
            (1 - curveDistance) * 
            (1 - dimChangeDistance)
        );
        
        // Filter based on threshold
        if (matchScore > matchThreshold) {
            // Calculate position with some jitter
            const jitter = 0.2 * (1 - filterStrength);
            
            matches.push({
                x: Math.sin(u) * Math.cos(v) + (Math.random() * 2 - 1) * jitter,
                y: Math.sin(u) * Math.sin(v) + (Math.random() * 2 - 1) * jitter,
                z: Math.cos(u) + (Math.random() * 2 - 1) * jitter,
                matchScore: matchScore
            });
        }
    }
    
    return matches;
}

/**
 * Analyze the topological properties of the generated structures
 */
function analyzeTopologicalProperties() {
    // Calculate topological invariants
    
    // Euler characteristic depends on genus and orientability
    const twistComplexity = config.topology.twistComplexity;
    const orientable = twistComplexity % 2 === 0;
    const genus = Math.floor(twistComplexity / 2);
    
    topoProperties.eulerCharacteristic = orientable ? 2 - 2 * genus : 2 - genus;
    
    // Betti numbers calculation (simplified)
    topoProperties.bettiNumbers = [
        1, // b0 (connected components)
        genus, // b1 (holes)
        orientable ? 1 : 0, // b2 (voids)
        0  // b3 (4D holes)
    ];
    
    // Stiefel-Whitney class (simplified)
    topoProperties.stiefelWhitney = [
        0,
        orientable ? 0 : 1,
        twistComplexity % 4 < 2 ? 0 : 1,
        0
    ];
    
    // Pontryagin numbers (simplified)
    topoProperties.pontryaginNumbers = [
        Math.floor(twistComplexity / 3),
        Math.floor(config.topology.curveComplexity / 2)
    ];
    
    // Signature calculation
    topoProperties.signature = orientable ? 
        (topoProperties.bettiNumbers[2] % 2 === 0 ? 0 : 1) : 
        0;
}

/**
 * Generate random data for initial visualization
 */
function generateRandomData() {
    // Create some initial random data for visualization
    
    // Diffusion data
    diffusionData.initialNoise = Array(5).fill().map(() => ({
        x: (Math.random() * 2 - 1) * 2,
        y: (Math.random() * 2 - 1) * 2,
        z: (Math.random() * 2 - 1) * 2
    }));
    
    diffusionData.finalSamples = Array(5).fill().map(() => ({
        x: (Math.random() * 2 - 1) * 1.5,
        y: (Math.random() * 2 - 1) * 1.5,
        z: (Math.random() * 2 - 1) * 1.5
    }));
    
    diffusionData.trajectories = diffusionData.initialNoise.map((p, i) => {
        const steps = 5;
        const trajectory = [p];
        
        for (let j = 1; j < steps; j++) {
            const t = j / steps;
            trajectory.push({
                x: p.x * (1 - t) + diffusionData.finalSamples[i].x * t,
                y: p.y * (1 - t) + diffusionData.finalSamples[i].y * t,
                z: p.z * (1 - t) + diffusionData.finalSamples[i].z * t
            });
        }
        
        return trajectory;
    });
    
    // GAN data
    ganData.realSamples = Array(10).fill().map(() => ({
        x: (Math.random() * 2 - 1) * 1.5,
        y: (Math.random() * 2 - 1) * 1.5,
        z: (Math.random() * 2 - 1) * 1.5
    }));
    
    ganData.generatedSamples = Array(10).fill().map(() => ({
        x: (Math.random() * 2 - 1) * 1.5,
        y: (Math.random() * 2 - 1) * 1.5,
        z: (Math.random() * 2 - 1) * 1.5
    }));
    
    // Empty discriminator boundary
    ganData.discriminatorBoundary = { x: [], y: [], z: [] };
    
    // Empty topo map data
    topoMapData.twistAreas = { x: [], y: [], z: [] };
    topoMapData.curveAreas = { x: [], y: [], z: [] };
    topoMapData.dimensionalChanges = { x: [], y: [], z: [] };
    topoMapData.properMatches = [];
}

/**
 * Reset all visualizations and data
 */
function resetAll() {
    // Reset parameters to defaults
    config.diffusion.noiseStrength = 0.5;
    config.diffusion.steps = 100;
    config.diffusion.samplingMethod = 'ddpm';
    
    config.topology.twistComplexity = 3;
    config.topology.curveComplexity = 3;
    config.topology.dimensionChanges = 4;
    
    config.gan.learningRate = 0.001;
    config.gan.batchSize = 32;
    config.gan.iterations = 1000;
    
    config.mapping.matchingThreshold = 0.7;
    config.mapping.filterStrength = 0.5;
    config.mapping.showOnlyMatches = false;
    
    // Reset UI to match default parameters
    document.getElementById('noise-strength').value = config.diffusion.noiseStrength;
    document.getElementById('noise-strength-value').textContent = config.diffusion.noiseStrength;
    
    document.getElementById('diffusion-steps').value = config.diffusion.steps;
    document.getElementById('diffusion-steps-value').textContent = config.diffusion.steps;
    
    document.getElementById('sampling-method').value = config.diffusion.samplingMethod;
    
    document.getElementById('twist-complexity').value = config.topology.twistComplexity;
    document.getElementById('twist-complexity-value').textContent = config.topology.twistComplexity;
    
    document.getElementById('curve-complexity').value = config.topology.curveComplexity;
    document.getElementById('curve-complexity-value').textContent = config.topology.curveComplexity;
    
    document.getElementById('dimension-changes').value = config.topology.dimensionChanges;
    document.getElementById('dimension-changes-value').textContent = config.topology.dimensionChanges;
    
    document.getElementById('learning-rate').value = config.gan.learningRate;
    document.getElementById('learning-rate-value').textContent = config.gan.learningRate;
    
    document.getElementById('batch-size').value = config.gan.batchSize;
    document.getElementById('batch-size-value').textContent = config.gan.batchSize;
    
    document.getElementById('gan-iterations').value = config.gan.iterations;
    document.getElementById('gan-iterations-value').textContent = config.gan.iterations;
    
    document.getElementById('matching-threshold').value = config.mapping.matchingThreshold;
    document.getElementById('matching-threshold-value').textContent = config.mapping.matchingThreshold;
    
    document.getElementById('filter-strength').value = config.mapping.filterStrength;
    document.getElementById('filter-strength-value').textContent = config.mapping.filterStrength;
    
    document.getElementById('show-only-matches').checked = config.mapping.showOnlyMatches;
    
    // Reset data and visualizations
    generateRandomData();
    updatePlots();
    
    // Reset topological properties
    topoProperties = {
        eulerCharacteristic: 0,
        bettiNumbers: [1, 0, 1, 0],
        stiefelWhitney: [0, 0, 1, 0],
        pontryaginNumbers: [0, 0],
        signature: 0
    };
    updateTopoProperties();
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', initialize);

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new TopologicalDiffusionGAN();
}); 