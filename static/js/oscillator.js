/**
 * Quantum Harmonic Oscillator Visualizations
 * 
 * This script creates interactive visualizations for the harmonic oscillator
 * with complex wavefunction and probability densities.
 */

// Set up global variables for the visualizations
let timeRange = [-10, 10];
let pointsCount = 500;
let gamma = 0.1;
let t0 = 5;
let omega = 1.0;
let amplitude = 1.0;
let phase = 0.0;

// Set up the plotting elements
const plotReal = document.getElementById('plot-real');
const plotImag = document.getElementById('plot-imag');
const plotPhase = document.getElementById('plot-phase');
const plotDensity = document.getElementById('plot-density');
const plotComplex = document.getElementById('plot-complex');

// Set up state and animation variables
let animationFrameId = null;
let animationTime = 0;
let isAnimating = false;

// Initialize visualizations
function initVisualizations() {
    updateParameters();
    
    // Create the initial plots
    createRealImagPlot();
    createPhasePlot();
    createDensityPlot();
    createComplexPlot();
    
    // Set up event listeners for parameter controls
    document.getElementById('gamma').addEventListener('input', updateParameters);
    document.getElementById('t0').addEventListener('input', updateParameters);
    document.getElementById('omega').addEventListener('input', updateParameters);
    document.getElementById('amplitude').addEventListener('input', updateParameters);
    document.getElementById('phase').addEventListener('input', updateParameters);
    
    // Animation controls
    document.getElementById('start-animation').addEventListener('click', toggleAnimation);
    document.getElementById('reset-animation').addEventListener('click', resetAnimation);
}

// Update parameter values from UI controls
function updateParameters() {
    gamma = parseFloat(document.getElementById('gamma').value);
    t0 = parseFloat(document.getElementById('t0').value);
    omega = parseFloat(document.getElementById('omega').value);
    amplitude = parseFloat(document.getElementById('amplitude').value);
    phase = parseFloat(document.getElementById('phase').value) * Math.PI;
    
    // Update display values
    document.getElementById('gamma-value').textContent = gamma.toFixed(2);
    document.getElementById('t0-value').textContent = t0.toFixed(1);
    document.getElementById('omega-value').textContent = omega.toFixed(2);
    document.getElementById('amplitude-value').textContent = amplitude.toFixed(2);
    document.getElementById('phase-value').textContent = (phase / Math.PI).toFixed(2) + 'π';
    
    // Update plots with new parameters
    updateAllPlots();
}

// Calculate the complex wavefunction at time t
function calculateWavefunction(t) {
    const envelope = Math.exp(-gamma * Math.pow(t - t0, 2));
    const realPart = amplitude * envelope * Math.cos(omega * t + phase);
    const imagPart = amplitude * envelope * Math.sin(omega * t + phase);
    return { real: realPart, imag: imagPart, envelope: envelope };
}

// Generate data points for plotting
function generateData(additionalTime = 0) {
    const step = (timeRange[1] - timeRange[0]) / pointsCount;
    const tValues = Array.from({ length: pointsCount }, (_, i) => timeRange[0] + i * step);
    
    const data = tValues.map(t => {
        const result = calculateWavefunction(t + additionalTime);
        return {
            t: t,
            real: result.real,
            imag: result.imag,
            envelope: result.envelope,
            density: result.real * result.real + result.imag * result.imag
        };
    });
    
    return data;
}

// Create the real and imaginary part plots
function createRealImagPlot() {
    const data = generateData();
    
    const realTrace = {
        x: data.map(d => d.t),
        y: data.map(d => d.real),
        mode: 'lines',
        name: 'Real Part',
        line: { color: 'rgba(66, 135, 245, 0.9)', width: 2 }
    };
    
    const imagTrace = {
        x: data.map(d => d.t),
        y: data.map(d => d.imag),
        mode: 'lines',
        name: 'Imaginary Part',
        line: { color: 'rgba(245, 66, 167, 0.9)', width: 2 }
    };
    
    const envelopeTrace = {
        x: data.map(d => d.t),
        y: data.map(d => d.envelope),
        mode: 'lines',
        name: 'Envelope',
        line: { color: 'rgba(255, 255, 255, 0.3)', width: 1, dash: 'dot' },
        fill: 'tozeroy',
        fillcolor: 'rgba(255, 255, 255, 0.05)'
    };
    
    const negEnvelopeTrace = {
        x: data.map(d => d.t),
        y: data.map(d => -d.envelope),
        mode: 'lines',
        name: 'Negative Envelope',
        line: { color: 'rgba(255, 255, 255, 0.3)', width: 1, dash: 'dot' },
        showlegend: false
    };
    
    const layout = {
        title: 'Real and Imaginary Parts of the Wavefunction',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Amplitude' },
        showlegend: true,
        legend: { x: 0, y: 1 },
        margin: { l: 50, r: 20, t: 50, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ffffff' },
        autosize: true,
        hovermode: 'closest'
    };
    
    Plotly.newPlot(plotReal, [realTrace, imagTrace, envelopeTrace, negEnvelopeTrace], layout, { responsive: true });
}

// Create the phase plot
function createPhasePlot() {
    const data = generateData();
    
    const phaseValues = data.map(d => Math.atan2(d.imag, d.real));
    
    const phaseTrace = {
        x: data.map(d => d.t),
        y: phaseValues,
        mode: 'lines',
        name: 'Phase',
        line: { color: 'rgba(255, 198, 0, 0.9)', width: 2 }
    };
    
    const layout = {
        title: 'Phase of the Wavefunction',
        xaxis: { title: 'Time' },
        yaxis: { 
            title: 'Phase (radians)',
            range: [-Math.PI, Math.PI],
            tickvals: [-Math.PI, -Math.PI/2, 0, Math.PI/2, Math.PI],
            ticktext: ['-π', '-π/2', '0', 'π/2', 'π']
        },
        showlegend: false,
        margin: { l: 50, r: 20, t: 50, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ffffff' },
        autosize: true
    };
    
    Plotly.newPlot(plotPhase, [phaseTrace], layout, { responsive: true });
}

// Create the probability density plot
function createDensityPlot() {
    const data = generateData();
    
    const densityTrace = {
        x: data.map(d => d.t),
        y: data.map(d => d.density),
        mode: 'lines',
        name: 'Probability Density',
        line: { color: 'rgba(0, 255, 209, 0.9)', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(0, 255, 209, 0.2)'
    };
    
    const layout = {
        title: 'Probability Density |ψ|²',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Density' },
        showlegend: false,
        margin: { l: 50, r: 20, t: 50, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ffffff' },
        autosize: true
    };
    
    Plotly.newPlot(plotDensity, [densityTrace], layout, { responsive: true });
}

// Create the complex plane plot
function createComplexPlot() {
    const data = generateData();
    
    const complexTrace = {
        x: data.map(d => d.real),
        y: data.map(d => d.imag),
        mode: 'lines',
        name: 'Complex Path',
        line: { 
            color: data.map(d => d.t),
            colorscale: 'Viridis',
            width: 3
        }
    };
    
    const layout = {
        title: 'Complex Plane Representation',
        xaxis: { title: 'Real Part' },
        yaxis: { title: 'Imaginary Part' },
        showlegend: false,
        margin: { l: 50, r: 20, t: 50, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ffffff' },
        autosize: true,
        aspectratio: { x: 1, y: 1 }
    };
    
    Plotly.newPlot(plotComplex, [complexTrace], layout, { responsive: true });
}

// Update all plots with new data
function updateAllPlots(additionalTime = 0) {
    const data = generateData(additionalTime);
    
    // Update real/imaginary plot
    Plotly.update(plotReal, {
        x: [[...data.map(d => d.t)], [...data.map(d => d.t)], [...data.map(d => d.t)], [...data.map(d => d.t)]],
        y: [[...data.map(d => d.real)], [...data.map(d => d.imag)], [...data.map(d => d.envelope)], [...data.map(d => -d.envelope)]]
    });
    
    // Update phase plot
    const phaseValues = data.map(d => Math.atan2(d.imag, d.real));
    Plotly.update(plotPhase, {
        x: [[...data.map(d => d.t)]],
        y: [[...phaseValues]]
    });
    
    // Update density plot
    Plotly.update(plotDensity, {
        x: [[...data.map(d => d.t)]],
        y: [[...data.map(d => d.density)]]
    });
    
    // Update complex plot
    Plotly.update(plotComplex, {
        x: [[...data.map(d => d.real)]],
        y: [[...data.map(d => d.imag)]]
    });
}

// Animation functions
function toggleAnimation() {
    if (isAnimating) {
        stopAnimation();
        document.getElementById('start-animation').textContent = 'Start Animation';
    } else {
        startAnimation();
        document.getElementById('start-animation').textContent = 'Stop Animation';
    }
    isAnimating = !isAnimating;
}

function startAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    const startTime = performance.now();
    const animationSpeed = 0.1;
    
    function animate(currentTime) {
        const elapsed = (currentTime - startTime) * animationSpeed;
        animationTime = elapsed / 1000;
        
        updateAllPlots(animationTime);
        animationFrameId = requestAnimationFrame(animate);
    }
    
    animationFrameId = requestAnimationFrame(animate);
}

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function resetAnimation() {
    stopAnimation();
    animationTime = 0;
    isAnimating = false;
    document.getElementById('start-animation').textContent = 'Start Animation';
    updateAllPlots();
}

// Initialize the visualizations when the document is ready
document.addEventListener('DOMContentLoaded', initVisualizations); 