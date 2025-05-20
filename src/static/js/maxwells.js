/**
 * Maxwell's Equations Visualization
 * Part of the 4D Manifold Explorer project
 * 
 * This file provides interactive visualizations of Maxwell's equations,
 * including electric and magnetic field visualizations, electromagnetic wave
 * propagation, and equation calculators.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Maxwell's Equations visualization initialized");
    
    // Initialize tabs
    initTabs();
    
    // Initialize field visualization
    initFieldVisualization();
    
    // Initialize wave visualization
    initWaveVisualization();
    
    // Initialize calculator
    initCalculator();
});

/**
 * Initialize tab switching functionality
 */
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabName + '-tab') {
                    content.classList.add('active');
                }
            });
        });
    });
}

/**
 * Initialize the field visualization section
 */
function initFieldVisualization() {
    // Set up the initial field plot
    setupFieldPlot('point-charge', 'vector-field');
    
    // Event listeners for controls
    document.getElementById('field-type').addEventListener('change', updateFieldVisualization);
    document.getElementById('view-type').addEventListener('change', updateFieldVisualization);
    document.getElementById('charge-slider').addEventListener('input', (e) => {
        document.getElementById('charge-value').textContent = e.target.value;
    });
    document.getElementById('current-slider').addEventListener('input', (e) => {
        document.getElementById('current-value').textContent = e.target.value;
    });
    
    // Buttons
    document.getElementById('update-field-btn').addEventListener('click', updateFieldVisualization);
    document.getElementById('reset-field-btn').addEventListener('click', resetFieldVisualization);
}

/**
 * Update the field visualization based on current control values
 */
function updateFieldVisualization() {
    const fieldType = document.getElementById('field-type').value;
    const viewType = document.getElementById('view-type').value;
    const chargeMagnitude = parseFloat(document.getElementById('charge-slider').value);
    const currentMagnitude = parseFloat(document.getElementById('current-slider').value);
    
    console.log(`Updating field visualization: ${fieldType}, ${viewType}, charge: ${chargeMagnitude}, current: ${currentMagnitude}`);
    setupFieldPlot(fieldType, viewType, chargeMagnitude, currentMagnitude);
}

/**
 * Reset the field visualization to default values
 */
function resetFieldVisualization() {
    document.getElementById('field-type').value = 'point-charge';
    document.getElementById('view-type').value = 'vector-field';
    document.getElementById('charge-slider').value = 5;
    document.getElementById('charge-value').textContent = '5';
    document.getElementById('current-slider').value = 5;
    document.getElementById('current-value').textContent = '5';
    
    setupFieldPlot('point-charge', 'vector-field');
}

/**
 * Set up the field plot with the specified parameters
 */
function setupFieldPlot(fieldType, viewType, chargeMagnitude = 5, currentMagnitude = 5) {
    const plotElement = document.getElementById('field-plot');
    
    // Clear any existing plot
    Plotly.purge(plotElement);
    
    // Generate the appropriate data based on field type
    let plotData = [];
    let layout = {
        scene: {
            aspectratio: { x: 1, y: 1, z: 1 },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } },
            xaxis: { range: [-5, 5], title: 'X' },
            yaxis: { range: [-5, 5], title: 'Y' },
            zaxis: { range: [-5, 5], title: 'Z' }
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: 'rgba(255, 255, 255, 0.87)' }
    };
    
    // Generate appropriate data based on field type and view type
    switch (fieldType) {
        case 'point-charge':
            plotData = generatePointChargeData(viewType, chargeMagnitude);
            break;
        case 'dipole-electric':
            plotData = generateDipoleElectricData(viewType, chargeMagnitude);
            break;
        case 'current-wire':
            plotData = generateCurrentWireData(viewType, currentMagnitude);
            break;
        case 'bar-magnet':
            plotData = generateBarMagnetData(viewType, currentMagnitude);
            break;
        case 'solenoid':
            plotData = generateSolenoidData(viewType, currentMagnitude);
            break;
        case 'combined':
            plotData = generateCombinedFieldsData(viewType, chargeMagnitude, currentMagnitude);
            break;
    }
    
    Plotly.react(plotElement, plotData, layout, { responsive: true });
}

/**
 * Generate data for point charge electric field
 */
function generatePointChargeData(viewType, chargeMagnitude) {
    // Determine the color based on charge (positive: red, negative: blue)
    const chargeColor = chargeMagnitude >= 0 ? 'rgba(255, 110, 145, 1)' : 'rgba(51, 196, 255, 1)';
    const chargeSize = Math.abs(chargeMagnitude) * 2;
    
    // Create the charge point
    const chargePoint = {
        type: 'scatter3d',
        mode: 'markers',
        marker: {
            size: chargeSize,
            color: chargeColor,
            symbol: 'circle',
            line: { width: 1, color: 'white' }
        },
        x: [0],
        y: [0],
        z: [0],
        name: `Point Charge (q = ${chargeMagnitude})`
    };
    
    let fieldData = [];
    
    switch (viewType) {
        case 'vector-field':
            fieldData = generatePointChargeVectorField(chargeMagnitude);
            break;
        case 'field-lines':
            fieldData = generatePointChargeFieldLines(chargeMagnitude);
            break;
        case 'potential':
            fieldData = generatePointChargePotential(chargeMagnitude);
            break;
    }
    
    return [chargePoint, ...fieldData];
}

/**
 * Generate vector field data for point charge
 */
function generatePointChargeVectorField(chargeMagnitude) {
    // Generate a grid of points
    const gridSize = 3;
    const spacing = 1;
    
    let x = [], y = [], z = [];
    let u = [], v = [], w = [];
    
    for (let i = -gridSize; i <= gridSize; i++) {
        for (let j = -gridSize; j <= gridSize; j++) {
            for (let k = -gridSize; k <= gridSize; k++) {
                // Skip the center point (avoid division by zero)
                if (i === 0 && j === 0 && k === 0) continue;
                
                const xi = i * spacing;
                const yj = j * spacing;
                const zk = k * spacing;
                
                // Calculate distance from origin
                const r = Math.sqrt(xi*xi + yj*yj + zk*zk);
                
                // Calculate electric field (E ∝ q/r² in direction of r)
                const magnitude = chargeMagnitude / (r*r);
                
                // Direction (unit vector)
                const ux = xi / r;
                const uy = yj / r;
                const uz = zk / r;
                
                // Add to arrays
                x.push(xi);
                y.push(yj);
                z.push(zk);
                
                // Field vectors (scaled by magnitude)
                u.push(ux * magnitude * 0.5);
                v.push(uy * magnitude * 0.5);
                w.push(uz * magnitude * 0.5);
            }
        }
    }
    
    return [{
        type: 'cone',
        x: x,
        y: y,
        z: z,
        u: u,
        v: v,
        w: w,
        colorscale: [
            [0, 'rgba(255, 110, 145, 0.3)'],
            [1, 'rgba(255, 110, 145, 1)']
        ],
        sizemode: 'absolute',
        sizeref: 0.5,
        showscale: false,
        name: 'Electric Field'
    }];
}

/**
 * Generate field lines data for point charge
 */
function generatePointChargeFieldLines(chargeMagnitude) {
    const lines = [];
    const numLines = 12;
    const lineLength = 5;
    const stepSize = 0.1;
    
    // Generate starting points distributed on a sphere
    for (let i = 0; i < numLines; i++) {
        // Fibonacci sphere distribution
        const y = 1 - (i / (numLines - 1)) * 2;
        const radius = Math.sqrt(1 - y*y);
        const theta = Math.PI * 2 * i * (3 - Math.sqrt(5)); // golden angle
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);
        
        // Starting point with small radius
        let px = x * 0.5;
        let py = y * 0.5;
        let pz = z * 0.5;
        
        const lineX = [px];
        const lineY = [py];
        const lineZ = [pz];
        
        // Follow the field direction
        for (let step = 0; step < lineLength / stepSize; step++) {
            // Compute field direction at this point
            const r = Math.sqrt(px*px + py*py + pz*pz);
            
            // If too close to center, break
            if (r < 0.1) break;
            
            // Direction (unit vector)
            const dirX = px / r;
            const dirY = py / r;
            const dirZ = pz / r;
            
            // Move along field line (outward if positive charge, inward if negative)
            const sign = chargeMagnitude >= 0 ? 1 : -1;
            px += sign * dirX * stepSize;
            py += sign * dirY * stepSize;
            pz += sign * dirZ * stepSize;
            
            // If too far from center, break
            if (Math.sqrt(px*px + py*py + pz*pz) > 5) break;
            
            lineX.push(px);
            lineY.push(py);
            lineZ.push(pz);
        }
        
        lines.push({
            type: 'scatter3d',
            mode: 'lines',
            x: lineX,
            y: lineY,
            z: lineZ,
            line: {
                color: chargeMagnitude >= 0 ? 'rgba(255, 110, 145, 1)' : 'rgba(51, 196, 255, 1)',
                width: 2
            },
            showlegend: i === 0
        });
    }
    
    return lines;
}

/**
 * Generate potential/flux data for point charge
 */
function generatePointChargePotential(chargeMagnitude) {
    // Generate a 3D grid for isosurfaces
    const gridSize = 20;
    const spacing = 0.25;
    
    let x = [], y = [], z = [], value = [];
    
    for (let i = 0; i < gridSize; i++) {
        const xi = -5 + i * spacing;
        for (let j = 0; j < gridSize; j++) {
            const yj = -5 + j * spacing;
            for (let k = 0; k < gridSize; k++) {
                const zk = -5 + k * spacing;
                
                // Calculate distance from origin
                const r = Math.sqrt(xi*xi + yj*yj + zk*zk);
                
                // Avoid division by zero
                if (r < 0.2) continue;
                
                // Calculate potential (V ∝ q/r)
                const potential = chargeMagnitude / r;
                
                x.push(xi);
                y.push(yj);
                z.push(zk);
                value.push(potential);
            }
        }
    }
    
    // Create isosurfaces at different potential values
    const isovalues = [0.5, 1.0, 2.0, 3.0];
    const isosurfaces = isovalues.map((isovalue, index) => {
        return {
            type: 'isosurface',
            x: x,
            y: y,
            z: z,
            value: value,
            isomin: isovalue,
            isomax: isovalue,
            opacity: 0.3,
            surface: { show: true, count: 1, fill: 0.95 },
            colorscale: [
                [0, chargeMagnitude >= 0 ? 'rgba(255, 110, 145, 0.1)' : 'rgba(51, 196, 255, 0.1)'],
                [1, chargeMagnitude >= 0 ? 'rgba(255, 110, 145, 0.7)' : 'rgba(51, 196, 255, 0.7)']
            ],
            showscale: index === 0
        };
    });
    
    return isosurfaces;
}

/**
 * Placeholder functions for other field types
 * These would be implemented with similar patterns to the point charge functions
 */
function generateDipoleElectricData(viewType, chargeMagnitude) {
    // Basic implementation for now
    const dataPoints = [
        // Positive charge
        {
            type: 'scatter3d',
            mode: 'markers',
            marker: { size: Math.abs(chargeMagnitude) * 2, color: 'rgba(255, 110, 145, 1)' },
            x: [0, 0],
            y: [1, -1],
            z: [0, 0],
            name: 'Electric Dipole'
        }
    ];
    
    // Add a simple line connecting the charges
    dataPoints.push({
        type: 'scatter3d',
        mode: 'lines',
        line: { width: 2, color: 'white' },
        x: [0, 0],
        y: [1, -1],
        z: [0, 0],
        showlegend: false
    });
    
    return dataPoints;
}

function generateCurrentWireData(viewType, currentMagnitude) {
    // Basic implementation for now
    return [{
        type: 'scatter3d',
        mode: 'lines',
        line: { width: 5, color: 'rgba(101, 255, 143, 1)' },
        x: [-3, 3],
        y: [0, 0],
        z: [0, 0],
        name: `Current (I = ${currentMagnitude}A)`
    }];
}

function generateBarMagnetData(viewType, magnetStrength) {
    // Basic implementation for now
    return [
        // North pole
        {
            type: 'scatter3d',
            mode: 'markers',
            marker: { size: magnetStrength * 2, color: 'rgba(255, 110, 145, 1)' },
            x: [0],
            y: [1],
            z: [0],
            name: 'North Pole'
        },
        // South pole
        {
            type: 'scatter3d',
            mode: 'markers',
            marker: { size: magnetStrength * 2, color: 'rgba(51, 196, 255, 1)' },
            x: [0],
            y: [-1],
            z: [0],
            name: 'South Pole'
        },
        // Magnet body
        {
            type: 'scatter3d',
            mode: 'lines',
            line: { width: 10, color: 'gray' },
            x: [0, 0],
            y: [1, -1],
            z: [0, 0],
            showlegend: false
        }
    ];
}

function generateSolenoidData(viewType, currentMagnitude) {
    // Create a solenoid coil
    const turns = 10;
    const radius = 1;
    const length = 4;
    
    const coilX = [];
    const coilY = [];
    const coilZ = [];
    
    // Generate a helix
    for (let i = 0; i <= turns * 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const z = -length/2 + (i / (turns * 20)) * length;
        
        coilX.push(radius * Math.cos(angle));
        coilY.push(radius * Math.sin(angle));
        coilZ.push(z);
    }
    
    return [{
        type: 'scatter3d',
        mode: 'lines',
        line: { width: 5, color: 'rgba(101, 255, 143, 1)' },
        x: coilX,
        y: coilY,
        z: coilZ,
        name: `Solenoid (I = ${currentMagnitude}A)`
    }];
}

function generateCombinedFieldsData(viewType, chargeMagnitude, currentMagnitude) {
    // Simplified implementation - just show both a charge and a current
    return [
        ...generatePointChargeData('vector-field', chargeMagnitude),
        ...generateCurrentWireData('vector-field', currentMagnitude)
    ];
}

/**
 * Initialize the EM wave visualization
 */
function initWaveVisualization() {
    // Create initial wave plot
    setupWavePlot(1, 1, 'vacuum', 1);
    
    // Event listeners for controls
    document.getElementById('frequency-slider').addEventListener('input', (e) => {
        document.getElementById('frequency-value').textContent = e.target.value;
    });
    
    document.getElementById('amplitude-slider').addEventListener('input', (e) => {
        document.getElementById('amplitude-value').textContent = e.target.value;
    });
    
    document.getElementById('permittivity-slider').addEventListener('input', (e) => {
        document.getElementById('permittivity-value').textContent = e.target.value;
    });
    
    document.getElementById('wave-medium').addEventListener('change', updateWaveMedium);
    
    // Buttons
    document.getElementById('play-wave-btn').addEventListener('click', toggleWaveAnimation);
    document.getElementById('reset-wave-btn').addEventListener('click', resetWaveVisualization);
}

/**
 * Update the wave medium and related properties
 */
function updateWaveMedium() {
    const medium = document.getElementById('wave-medium').value;
    const permittivitySlider = document.getElementById('permittivity-slider');
    const permittivityContainer = permittivitySlider.closest('.control-group');
    
    // Show/hide permittivity slider based on medium
    if (medium === 'vacuum') {
        permittivityContainer.style.display = 'none';
        permittivitySlider.value = 1;
        document.getElementById('permittivity-value').textContent = '1';
    } else {
        permittivityContainer.style.display = 'block';
        
        // Set default values based on medium
        if (medium === 'dielectric') {
            permittivitySlider.value = 2.5;
            document.getElementById('permittivity-value').textContent = '2.5';
        } else if (medium === 'conductor') {
            permittivitySlider.value = 5;
            document.getElementById('permittivity-value').textContent = '5';
        }
    }
    
    updateWaveVisualization();
}

/**
 * Update the wave visualization based on current control values
 */
function updateWaveVisualization() {
    const frequency = parseFloat(document.getElementById('frequency-slider').value);
    const amplitude = parseFloat(document.getElementById('amplitude-slider').value);
    const medium = document.getElementById('wave-medium').value;
    const permittivity = parseFloat(document.getElementById('permittivity-slider').value);
    
    console.log(`Updating wave visualization: freq: ${frequency}, amp: ${amplitude}, medium: ${medium}, ε_r: ${permittivity}`);
    setupWavePlot(frequency, amplitude, medium, permittivity);
}

/**
 * Reset the wave visualization to default values
 */
function resetWaveVisualization() {
    // Stop animation if running
    if (waveAnimationId) {
        cancelAnimationFrame(waveAnimationId);
        waveAnimationId = null;
        const playBtn = document.getElementById('play-wave-btn');
        playBtn.innerHTML = '<i class="fas fa-play"></i> <span id="play-btn-text">Play</span>';
    }
    
    // Reset controls
    document.getElementById('frequency-slider').value = 1;
    document.getElementById('frequency-value').textContent = '1';
    document.getElementById('amplitude-slider').value = 1;
    document.getElementById('amplitude-value').textContent = '1';
    document.getElementById('wave-medium').value = 'vacuum';
    document.getElementById('permittivity-slider').value = 1;
    document.getElementById('permittivity-value').textContent = '1';
    document.getElementById('permittivity-slider').closest('.control-group').style.display = 'none';
    
    // Reset visualization
    setupWavePlot(1, 1, 'vacuum', 1);
}

// Keep track of animation request ID to cancel when needed
let waveAnimationId = null;
let waveTime = 0;
let currentWaveParams = { frequency: 1, amplitude: 1, medium: 'vacuum', permittivity: 1 };

/**
 * Toggle the wave animation play/pause state
 */
function toggleWaveAnimation() {
    const playBtn = document.getElementById('play-wave-btn');
    const btnText = document.getElementById('play-btn-text');
    
    if (waveAnimationId) {
        // Stop animation
        cancelAnimationFrame(waveAnimationId);
        waveAnimationId = null;
        playBtn.innerHTML = '<i class="fas fa-play"></i> <span id="play-btn-text">Play</span>';
    } else {
        // Start animation
        playBtn.innerHTML = '<i class="fas fa-pause"></i> <span id="play-btn-text">Pause</span>';
        animateWave();
    }
}

/**
 * Animate the EM wave
 */
function animateWave() {
    waveTime += 0.05;
    
    // Update the wave plot with the current time
    updateWavePlotTime(waveTime);
    
    // Request next frame
    waveAnimationId = requestAnimationFrame(animateWave);
}

/**
 * Set up the EM wave plot with the specified parameters
 */
function setupWavePlot(frequency, amplitude, medium, permittivity) {
    const plotElement = document.getElementById('wave-plot');
    
    // Save current parameters for animation
    currentWaveParams = { frequency, amplitude, medium, permittivity };
    
    // Reset animation time
    waveTime = 0;
    
    // Create the initial wave (at time = 0)
    updateWavePlotTime(0);
}

/**
 * Update the EM wave plot with the current time
 */
function updateWavePlotTime(time) {
    const plotElement = document.getElementById('wave-plot');
    const { frequency, amplitude, medium, permittivity } = currentWaveParams;
    
    // Clear any existing plot
    Plotly.purge(plotElement);
    
    // Calculate the wave speed based on medium (c/√εᵣ)
    const speedFactor = 1 / Math.sqrt(permittivity);
    
    // Generate wave data
    const waveData = generateEMWaveData(frequency, amplitude, time, medium, speedFactor);
    
    // Plot layout
    const layout = {
        scene: {
            aspectratio: { x: 1, y: 1, z: 1 },
            camera: { eye: { x: 1.5, y: 0.5, z: 1.5 } },
            xaxis: { range: [-8, 8], title: 'X (Propagation Direction)' },
            yaxis: { range: [-3, 3], title: 'Y (Electric Field)' },
            zaxis: { range: [-3, 3], title: 'Z (Magnetic Field)' }
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: 'rgba(255, 255, 255, 0.87)' },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            bgcolor: 'rgba(30, 30, 30, 0.7)',
            bordercolor: 'rgba(255, 255, 255, 0.12)',
            borderwidth: 1
        }
    };
    
    // Create the plot
    Plotly.react(plotElement, waveData, layout, { responsive: true });
}

/**
 * Generate data for an electromagnetic wave visualization
 */
function generateEMWaveData(frequency, amplitude, time, medium, speedFactor) {
    // Parameters for visualization
    const xRange = 16; // -8 to 8
    const points = 100;
    const dx = xRange / points;
    
    // Arrays for the wave data
    const x = [];
    const yElectric = [];
    const zMagnetic = [];
    
    // Arrays for electric field vectors
    const eX = [];
    const eY = [];
    const eZ = [];
    const eU = [];
    const eV = [];
    const eW = [];
    
    // Arrays for magnetic field vectors
    const mX = [];
    const mY = [];
    const mZ = [];
    const mU = [];
    const mV = [];
    const mW = [];
    
    // Create wave data points
    for (let i = 0; i <= points; i++) {
        const xi = -8 + i * dx;
        
        // Wave equation: y = A * sin(kx - ωt)
        // k: wave number, ω: angular frequency
        // k = ω/v where v is the wave speed
        const k = 2 * Math.PI * frequency / speedFactor;
        const omega = 2 * Math.PI * frequency;
        
        // Phase of the wave at this point and time
        const phase = k * xi - omega * time;
        
        // Electric field in y direction
        const ey = amplitude * Math.sin(phase);
        
        // Magnetic field in z direction (perpendicular to E and propagation direction)
        // B field is in phase with E field for plane waves
        const mz = amplitude * Math.sin(phase);
        
        // Store point for the wave curve
        x.push(xi);
        yElectric.push(ey);
        zMagnetic.push(mz);
        
        // Add vector field points (sparser than the wave curve)
        if (i % 5 === 0) {
            // Electric field vectors (in y direction)
            eX.push(xi);
            eY.push(0);
            eZ.push(0);
            eU.push(0);
            eV.push(ey);
            eW.push(0);
            
            // Magnetic field vectors (in z direction)
            mX.push(xi);
            mY.push(0);
            mZ.push(0);
            mU.push(0);
            mV.push(0);
            mW.push(mz);
        }
    }
    
    // Attenuation for conducting medium
    let attenuationInfo = '';
    if (medium === 'conductor') {
        attenuationInfo = ' (attenuated)';
    }
    
    // Create plot traces
    const waveCurveE = {
        type: 'scatter3d',
        mode: 'lines',
        x: x,
        y: yElectric,
        z: Array(x.length).fill(0),
        line: {
            color: 'rgba(255, 110, 145, 1)',
            width: 5
        },
        name: 'Electric Field'
    };
    
    const waveCurveB = {
        type: 'scatter3d',
        mode: 'lines',
        x: x,
        y: Array(x.length).fill(0),
        z: zMagnetic,
        line: {
            color: 'rgba(51, 196, 255, 1)',
            width: 5
        },
        name: 'Magnetic Field'
    };
    
    const electricFieldVectors = {
        type: 'cone',
        x: eX,
        y: eY,
        z: eZ,
        u: eU,
        v: eV,
        w: eW,
        colorscale: [
            [0, 'rgba(255, 110, 145, 0.3)'],
            [1, 'rgba(255, 110, 145, 1)']
        ],
        sizemode: 'absolute',
        sizeref: 0.5,
        showscale: false,
        name: 'E-Field Vectors'
    };
    
    const magneticFieldVectors = {
        type: 'cone',
        x: mX,
        y: mY,
        z: mZ,
        u: mU,
        v: mV,
        w: mW,
        colorscale: [
            [0, 'rgba(51, 196, 255, 0.3)'],
            [1, 'rgba(51, 196, 255, 1)']
        ],
        sizemode: 'absolute',
        sizeref: 0.5,
        showscale: false,
        name: 'B-Field Vectors'
    };
    
    // Add a propagation axis
    const propagationAxis = {
        type: 'scatter3d',
        mode: 'lines',
        x: [-8, 8],
        y: [0, 0],
        z: [0, 0],
        line: {
            color: 'rgba(255, 255, 255, 0.3)',
            width: 2,
            dash: 'dash'
        },
        name: 'Propagation Axis'
    };
    
    // Add attenuation envelope for conducting medium
    let traces = [waveCurveE, waveCurveB, electricFieldVectors, magneticFieldVectors, propagationAxis];
    
    if (medium === 'conductor') {
        // Create attenuation envelope
        const envelopeX = [];
        const envelopeYPlus = [];
        const envelopeYMinus = [];
        const envelopeZPlus = [];
        const envelopeZMinus = [];
        
        for (let i = 0; i <= points; i++) {
            const xi = -8 + i * dx;
            
            // Exponential decay: e^(-αx) where α is the attenuation constant
            // For simplicity, we'll make α proportional to permittivity and frequency
            const alpha = 0.1 * frequency * Math.sqrt(permittivity);
            const attenuation = Math.exp(-alpha * (xi + 8)); // Start at full amplitude at x=-8
            
            envelopeX.push(xi);
            envelopeYPlus.push(amplitude * attenuation);
            envelopeYMinus.push(-amplitude * attenuation);
            envelopeZPlus.push(amplitude * attenuation);
            envelopeZMinus.push(-amplitude * attenuation);
        }
        
        const eEnvelopePlus = {
            type: 'scatter3d',
            mode: 'lines',
            x: envelopeX,
            y: envelopeYPlus,
            z: Array(envelopeX.length).fill(0),
            line: {
                color: 'rgba(255, 110, 145, 0.3)',
                width: 2,
                dash: 'dot'
            },
            showlegend: false
        };
        
        const eEnvelopeMinus = {
            type: 'scatter3d',
            mode: 'lines',
            x: envelopeX,
            y: envelopeYMinus,
            z: Array(envelopeX.length).fill(0),
            line: {
                color: 'rgba(255, 110, 145, 0.3)',
                width: 2,
                dash: 'dot'
            },
            showlegend: false
        };
        
        const mEnvelopePlus = {
            type: 'scatter3d',
            mode: 'lines',
            x: envelopeX,
            y: Array(envelopeX.length).fill(0),
            z: envelopeZPlus,
            line: {
                color: 'rgba(51, 196, 255, 0.3)',
                width: 2,
                dash: 'dot'
            },
            showlegend: false
        };
        
        const mEnvelopeMinus = {
            type: 'scatter3d',
            mode: 'lines',
            x: envelopeX,
            y: Array(envelopeX.length).fill(0),
            z: envelopeZMinus,
            line: {
                color: 'rgba(51, 196, 255, 0.3)',
                width: 2,
                dash: 'dot'
            },
            showlegend: false
        };
        
        traces = [...traces, eEnvelopePlus, eEnvelopeMinus, mEnvelopePlus, mEnvelopeMinus];
    }
    
    return traces;
}

/**
 * Initialize the equation calculator
 */
function initCalculator() {
    // Set up initial equation form
    setupCalculatorForm('gauss-electric');
    
    // Event listeners
    document.getElementById('equation-select').addEventListener('change', (e) => {
        setupCalculatorForm(e.target.value);
    });
    
    document.getElementById('calculate-btn').addEventListener('click', performCalculation);
    document.getElementById('clear-calc-btn').addEventListener('click', clearCalculator);
}

/**
 * Set up the calculator form for the selected equation
 */
function setupCalculatorForm(equationType) {
    const parameterInputs = document.getElementById('parameter-inputs');
    
    // Clear existing inputs
    parameterInputs.innerHTML = '';
    
    // Create appropriate inputs based on equation type
    switch (equationType) {
        case 'gauss-electric':
            createGaussElectricForm(parameterInputs);
            break;
        case 'gauss-magnetic':
            createGaussMagneticForm(parameterInputs);
            break;
        case 'faraday':
            createFaradayForm(parameterInputs);
            break;
        case 'ampere':
            createAmpereForm(parameterInputs);
            break;
        case 'wave-propagation':
            createWavePropagationForm(parameterInputs);
            break;
        case 'poynting':
            createPoyntingForm(parameterInputs);
            break;
    }
    
    // Clear results
    document.getElementById('calculator-display').innerHTML = '<div style="font-family: monospace; font-size: 14px;">Select equation and enter values to calculate results...</div>';
    document.getElementById('result-output').innerHTML = 'No calculation performed yet.';
}

/**
 * Create form for Gauss's Electric Law
 */
function createGaussElectricForm(container) {
    container.innerHTML = `
        <div class="control-group">
            <label for="gauss-charge">Total Enclosed Charge (C)</label>
            <input type="number" id="gauss-charge" step="0.00000000001" value="0.000000000001" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            <div style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">Example: 1.6e-19 C (electron charge)</div>
        </div>
        <div class="control-group">
            <label for="gauss-surface-area">Gaussian Surface Area (m²)</label>
            <input type="number" id="gauss-surface-area" step="0.01" value="1.00" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            <div style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">For a sphere, use 4πr²</div>
        </div>
        <div class="control-group">
            <label>Calculate</label>
            <div style="display: flex; gap: 10px;">
                <button class="button" data-calc="electric-field">Electric Field Strength</button>
                <button class="button" data-calc="electric-flux">Electric Flux</button>
            </div>
        </div>
    `;
    
    // Add event listeners for calculation buttons
    container.querySelectorAll('button[data-calc]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const calcType = btn.getAttribute('data-calc');
            document.getElementById('calculator-display').innerHTML = `
                <div style="font-family: monospace; font-size: 14px;">
                    <strong>Gauss's Law for Electricity:</strong><br>
                    ∮<sub>S</sub> <b>E</b> · d<b>A</b> = Q/ε<sub>0</sub><br><br>
                    
                    Given:<br>
                    - Enclosed charge (Q): ${document.getElementById('gauss-charge').value} C<br>
                    - Surface area: ${document.getElementById('gauss-surface-area').value} m²<br>
                    - ε<sub>0</sub> = 8.85 × 10<sup>-12</sup> F/m (vacuum permittivity)<br><br>
                    
                    Calculating ${calcType === 'electric-field' ? 'Electric Field Strength' : 'Electric Flux'}...
                </div>
            `;
        });
    });
}

/**
 * Create form for Gauss's Magnetic Law
 */
function createGaussMagneticForm(container) {
    container.innerHTML = `
        <div style="padding: 15px; background-color: var(--surface-light); border-radius: 8px; margin-bottom: 15px;">
            <p>Gauss's Law for Magnetism states that the total magnetic flux through any closed surface is zero:</p>
            <div style="text-align: center; margin: 10px 0; font-size: 18px;">∮<sub>S</sub> <b>B</b> · d<b>A</b> = 0</div>
            <p>This implies there are no magnetic monopoles. Any magnetic field line that enters a closed surface must also exit it.</p>
        </div>
        <div class="control-group">
            <label for="magnetic-flux-in">Magnetic Flux Entering Surface (Wb)</label>
            <input type="number" id="magnetic-flux-in" step="0.01" value="1.00" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
        </div>
        <div class="control-group">
            <label>Calculate</label>
            <button class="button" data-calc="magnetic-flux-out">Magnetic Flux Exiting Surface</button>
        </div>
    `;
    
    // Add event listener for calculation button
    container.querySelector('button[data-calc]').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('calculator-display').innerHTML = `
            <div style="font-family: monospace; font-size: 14px;">
                <strong>Gauss's Law for Magnetism:</strong><br>
                ∮<sub>S</sub> <b>B</b> · d<b>A</b> = 0<br><br>
                
                Given:<br>
                - Magnetic flux entering surface: ${document.getElementById('magnetic-flux-in').value} Wb<br><br>
                
                By Gauss's Law for Magnetism, the total magnetic flux must be zero, so the exiting flux must equal the entering flux.
            </div>
        `;
    });
}

/**
 * Create form for Faraday's Law
 */
function createFaradayForm(container) {
    container.innerHTML = `
        <div class="control-group">
            <label for="faraday-area">Loop Area (m²)</label>
            <input type="number" id="faraday-area" step="0.01" value="0.01" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
        </div>
        <div class="control-group">
            <label for="faraday-b-initial">Initial Magnetic Field (T)</label>
            <input type="number" id="faraday-b-initial" step="0.01" value="0.00" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
        </div>
        <div class="control-group">
            <label for="faraday-b-final">Final Magnetic Field (T)</label>
            <input type="number" id="faraday-b-final" step="0.01" value="1.00" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
        </div>
        <div class="control-group">
            <label for="faraday-time">Time Interval (s)</label>
            <input type="number" id="faraday-time" step="0.01" value="0.10" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
        </div>
        <div class="control-group">
            <label>Calculate</label>
            <button class="button" data-calc="induced-emf">Induced EMF</button>
        </div>
    `;
    
    // Add event listener for calculation button
    container.querySelector('button[data-calc]').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('calculator-display').innerHTML = `
            <div style="font-family: monospace; font-size: 14px;">
                <strong>Faraday's Law:</strong><br>
                EMF = -dΦ/dt = -d(B·A)/dt<br><br>
                
                Given:<br>
                - Loop area (A): ${document.getElementById('faraday-area').value} m²<br>
                - Initial magnetic field (B₁): ${document.getElementById('faraday-b-initial').value} T<br>
                - Final magnetic field (B₂): ${document.getElementById('faraday-b-final').value} T<br>
                - Time interval (Δt): ${document.getElementById('faraday-time').value} s<br><br>
                
                Calculating induced EMF...
            </div>
        `;
    });
}

/**
 * Create form for Ampere's Law
 */
function createAmpereForm(container) {
    container.innerHTML = `
        <div class="control-group">
            <label for="ampere-current">Current (A)</label>
            <input type="number" id="ampere-current" step="0.1" value="1.0" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
        </div>
        <div class="control-group">
            <label for="ampere-radius">Distance from Wire (m)</label>
            <input type="number" id="ampere-radius" step="0.01" value="0.05" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
        </div>
        <div class="control-group">
            <label for="ampere-de-dt">Rate of Change of Electric Field (V/m²)</label>
            <input type="number" id="ampere-de-dt" step="0.1" value="0.0" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            <div style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">For displacement current term</div>
        </div>
        <div class="control-group">
            <label>Calculate</label>
            <button class="button" data-calc="magnetic-field">Magnetic Field Strength</button>
        </div>
    `;
    
    // Add event listener for calculation button
    container.querySelector('button[data-calc]').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('calculator-display').innerHTML = `
            <div style="font-family: monospace; font-size: 14px;">
                <strong>Ampere's Law:</strong><br>
                ∮<sub>C</sub> <b>B</b> · d<b>l</b> = μ₀I + μ₀ε₀dΦ<sub>E</sub>/dt<br><br>
                
                Given:<br>
                - Current (I): ${document.getElementById('ampere-current').value} A<br>
                - Distance from wire (r): ${document.getElementById('ampere-radius').value} m<br>
                - Rate of change of electric field: ${document.getElementById('ampere-de-dt').value} V/m²<br>
                - μ₀ = 4π × 10<sup>-7</sup> H/m (vacuum permeability)<br><br>
                
                Calculating magnetic field strength...
            </div>
        `;
    });
}

/**
 * Create form for Electromagnetic Wave Propagation
 */
function createWavePropagationForm(container) {
    container.innerHTML = `
        <div class="control-group">
            <label for="wave-permittivity">Relative Permittivity (ε<sub>r</sub>)</label>
            <input type="number" id="wave-permittivity" step="0.1" value="1.0" min="1" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            <div style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">1.0 for vacuum</div>
        </div>
        <div class="control-group">
            <label for="wave-permeability">Relative Permeability (μ<sub>r</sub>)</label>
            <input type="number" id="wave-permeability" step="0.1" value="1.0" min="1" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            <div style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">1.0 for most materials</div>
        </div>
        <div class="control-group">
            <label for="wave-frequency">Frequency (Hz)</label>
            <input type="number" id="wave-frequency" step="1e6" value="1e9" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            <div style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">Example: 1e9 (1 GHz)</div>
        </div>
        <div class="control-group">
            <label>Calculate</label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="button" data-calc="wave-speed">Wave Speed</button>
                <button class="button" data-calc="wavelength">Wavelength</button>
                <button class="button" data-calc="wave-impedance">Wave Impedance</button>
            </div>
        </div>
    `;
    
    // Add event listeners for calculation buttons
    container.querySelectorAll('button[data-calc]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const calcType = btn.getAttribute('data-calc');
            document.getElementById('calculator-display').innerHTML = `
                <div style="font-family: monospace; font-size: 14px;">
                    <strong>Electromagnetic Wave Propagation:</strong><br><br>
                    
                    Given:<br>
                    - Relative permittivity (ε<sub>r</sub>): ${document.getElementById('wave-permittivity').value}<br>
                    - Relative permeability (μ<sub>r</sub>): ${document.getElementById('wave-permeability').value}<br>
                    - Frequency (f): ${document.getElementById('wave-frequency').value} Hz<br>
                    - Speed of light in vacuum (c): 3.00 × 10<sup>8</sup> m/s<br><br>
                    
                    Calculating ${calcType === 'wave-speed' ? 'wave speed' : (calcType === 'wavelength' ? 'wavelength' : 'wave impedance')}...
                </div>
            `;
        });
    });
}

/**
 * Create form for Poynting Vector calculations
 */
function createPoyntingForm(container) {
    container.innerHTML = `
        <div class="control-group">
            <label for="poynting-e-field">Electric Field Strength (V/m)</label>
            <input type="number" id="poynting-e-field" step="1" value="10" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
        </div>
        <div class="control-group">
            <label for="poynting-b-field">Magnetic Field Strength (T)</label>
            <input type="number" id="poynting-b-field" step="0.00000001" value="0.00000001" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            <div style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">Example: 1e-8 T</div>
        </div>
        <div class="control-group">
            <label for="poynting-angle">Angle Between Fields (degrees)</label>
            <input type="number" id="poynting-angle" step="1" value="90" min="0" max="180" style="width: 100%; padding: 8px; background-color: var(--surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
            <div style="font-size: 12px; margin-top: 5px; color: var(--text-secondary);">90° for typical EM waves</div>
        </div>
        <div class="control-group">
            <label>Calculate</label>
            <button class="button" data-calc="poynting-vector">Poynting Vector Magnitude</button>
        </div>
    `;
    
    // Add event listener for calculation button
    container.querySelector('button[data-calc]').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('calculator-display').innerHTML = `
            <div style="font-family: monospace; font-size: 14px;">
                <strong>Poynting Vector:</strong><br>
                <b>S</b> = (1/μ₀) <b>E</b> × <b>B</b><br><br>
                
                Given:<br>
                - Electric field strength (E): ${document.getElementById('poynting-e-field').value} V/m<br>
                - Magnetic field strength (B): ${document.getElementById('poynting-b-field').value} T<br>
                - Angle between fields: ${document.getElementById('poynting-angle').value}°<br>
                - μ₀ = 4π × 10<sup>-7</sup> H/m (vacuum permeability)<br><br>
                
                Calculating Poynting vector magnitude...
            </div>
        `;
    });
}

/**
 * Perform the calculation based on the selected equation and parameters
 */
function performCalculation() {
    const equationType = document.getElementById('equation-select').value;
    let result = '';
    
    // Perform appropriate calculation based on equation type
    switch (equationType) {
        case 'gauss-electric':
            result = calculateGaussElectric();
            break;
        case 'gauss-magnetic':
            result = calculateGaussMagnetic();
            break;
        case 'faraday':
            result = calculateFaraday();
            break;
        case 'ampere':
            result = calculateAmpere();
            break;
        case 'wave-propagation':
            result = calculateWavePropagation();
            break;
        case 'poynting':
            result = calculatePoynting();
            break;
    }
    
    // Display result
    document.getElementById('result-output').innerHTML = result;
}

/**
 * Calculate for Gauss's Electric Law
 */
function calculateGaussElectric() {
    const charge = parseFloat(document.getElementById('gauss-charge').value);
    const area = parseFloat(document.getElementById('gauss-surface-area').value);
    const epsilon0 = 8.85e-12; // vacuum permittivity in F/m
    
    // Calculate electric flux
    const flux = charge / epsilon0;
    
    // For a uniformly charged sphere, E = Q/(4πε₀r²)
    // For a uniformly charged surface, the electric field is perpendicular to the surface
    // For simplicity, we assume a spherical surface for the electric field calculation
    const radius = Math.sqrt(area / (4 * Math.PI));
    const eField = charge / (4 * Math.PI * epsilon0 * radius * radius);
    
    return `
        <strong>Results:</strong><br><br>
        Electric Flux = Q/ε₀ = ${charge} / ${epsilon0.toExponential(2)} = ${flux.toExponential(4)} N·m²/C<br><br>
        Electric Field Strength (assuming spherical surface):<br>
        E = Q/(4πε₀r²) = ${eField.toExponential(4)} N/C (or V/m)<br><br>
        <em>Note: The actual field depends on the charge distribution and surface geometry.</em>
    `;
}

/**
 * Calculate for Gauss's Magnetic Law
 */
function calculateGaussMagnetic() {
    const fluxIn = parseFloat(document.getElementById('magnetic-flux-in').value);
    const fluxOut = fluxIn; // Equal by Gauss's Law
    
    return `
        <strong>Results:</strong><br><br>
        Magnetic Flux Entering = ${fluxIn.toFixed(4)} Wb<br>
        Magnetic Flux Exiting = ${fluxOut.toFixed(4)} Wb<br><br>
        Total Magnetic Flux = 0 Wb<br><br>
        <em>By Gauss's Law for Magnetism, the net magnetic flux through any closed surface is always zero, confirming the absence of magnetic monopoles.</em>
    `;
}

/**
 * Calculate for Faraday's Law
 */
function calculateFaraday() {
    const area = parseFloat(document.getElementById('faraday-area').value);
    const bInitial = parseFloat(document.getElementById('faraday-b-initial').value);
    const bFinal = parseFloat(document.getElementById('faraday-b-final').value);
    const time = parseFloat(document.getElementById('faraday-time').value);
    
    // Calculate magnetic flux change
    const fluxInitial = bInitial * area;
    const fluxFinal = bFinal * area;
    const fluxChange = fluxFinal - fluxInitial;
    
    // Calculate induced EMF
    const emf = -fluxChange / time;
    
    return `
        <strong>Results:</strong><br><br>
        Initial Magnetic Flux = B₁ × A = ${bInitial} × ${area} = ${fluxInitial.toFixed(6)} Wb<br>
        Final Magnetic Flux = B₂ × A = ${bFinal} × ${area} = ${fluxFinal.toFixed(6)} Wb<br>
        Change in Magnetic Flux = ${fluxChange.toFixed(6)} Wb<br>
        Time Interval = ${time} s<br><br>
        Induced EMF = -dΦ/dt = -${fluxChange.toFixed(6)} / ${time} = ${emf.toFixed(6)} V<br><br>
        <em>The negative sign indicates that the induced EMF opposes the change in magnetic flux (Lenz's Law).</em>
    `;
}

/**
 * Calculate for Ampere's Law
 */
function calculateAmpere() {
    const current = parseFloat(document.getElementById('ampere-current').value);
    const radius = parseFloat(document.getElementById('ampere-radius').value);
    const dEdt = parseFloat(document.getElementById('ampere-de-dt').value);
    const mu0 = 4 * Math.PI * 1e-7; // vacuum permeability in H/m
    const epsilon0 = 8.85e-12; // vacuum permittivity in F/m
    
    // Calculate magnetic field around a straight wire: B = μ₀I/(2πr)
    const magneticField = mu0 * current / (2 * Math.PI * radius);
    
    // Calculate contribution from displacement current
    const displacementCurrent = epsilon0 * dEdt;
    const displacementContribution = mu0 * displacementCurrent;
    
    // Total magnetic field including displacement current (simplified)
    const totalField = magneticField + displacementContribution;
    
    return `
        <strong>Results:</strong><br><br>
        Magnetic Field from Current = μ₀I/(2πr) = ${magneticField.toExponential(4)} T<br><br>
        ${dEdt !== 0 ? `
        Displacement Current = ε₀(dE/dt) = ${displacementCurrent.toExponential(4)} A/m²<br>
        Contribution from Displacement Current = ${displacementContribution.toExponential(4)} T<br>
        Total Magnetic Field = ${totalField.toExponential(4)} T<br>
        ` : 'No displacement current (dE/dt = 0)'}
        <br>
        <em>This calculation assumes a long straight wire for the current-carrying conductor.</em>
    `;
}

/**
 * Calculate for Electromagnetic Wave Propagation
 */
function calculateWavePropagation() {
    const epsilon_r = parseFloat(document.getElementById('wave-permittivity').value);
    const mu_r = parseFloat(document.getElementById('wave-permeability').value);
    const frequency = parseFloat(document.getElementById('wave-frequency').value);
    const c = 3e8; // speed of light in vacuum in m/s
    
    // Calculate wave speed in medium: v = c/√(εᵣμᵣ)
    const waveSpeed = c / Math.sqrt(epsilon_r * mu_r);
    
    // Calculate wavelength: λ = v/f
    const wavelength = waveSpeed / frequency;
    
    // Calculate wave impedance: Z = √(μ₀μᵣ/ε₀εᵣ) = Z₀√(μᵣ/εᵣ)
    const Z0 = 376.730; // impedance of free space in ohms
    const impedance = Z0 * Math.sqrt(mu_r / epsilon_r);
    
    return `
        <strong>Results:</strong><br><br>
        Wave Speed = c/√(εᵣμᵣ) = ${c.toExponential(2)} / √(${epsilon_r} × ${mu_r}) = ${waveSpeed.toFixed(2).toLocaleString()} m/s<br><br>
        Wavelength = v/f = ${waveSpeed.toExponential(2)} / ${frequency.toExponential(2)} = ${wavelength.toExponential(4)} m<br><br>
        Wave Impedance = Z₀√(μᵣ/εᵣ) = ${Z0.toFixed(2)} × √(${mu_r} / ${epsilon_r}) = ${impedance.toFixed(2)} Ω<br><br>
        <em>The wave speed is ${(waveSpeed / c * 100).toFixed(2)}% of the speed of light in vacuum.</em>
    `;
}

/**
 * Calculate for Poynting Vector
 */
function calculatePoynting() {
    const eField = parseFloat(document.getElementById('poynting-e-field').value);
    const bField = parseFloat(document.getElementById('poynting-b-field').value);
    const angle = parseFloat(document.getElementById('poynting-angle').value);
    const mu0 = 4 * Math.PI * 1e-7; // vacuum permeability in H/m
    
    // Calculate Poynting vector magnitude: S = (1/μ₀) E B sin(θ)
    const angleRad = angle * Math.PI / 180;
    const poyntingMagnitude = (1 / mu0) * eField * bField * Math.sin(angleRad);
    
    // Calculate power through 1 m² area
    const power = poyntingMagnitude;
    
    return `
        <strong>Results:</strong><br><br>
        Poynting Vector Magnitude = (1/μ₀) E B sin(θ)<br>
        = (1/${mu0.toExponential(2)}) × ${eField} × ${bField.toExponential(8)} × sin(${angle}°)<br>
        = ${poyntingMagnitude.toExponential(4)} W/m²<br><br>
        This represents the energy flux density (power per unit area) of the electromagnetic field.<br><br>
        Power through 1 m² = ${power.toExponential(4)} W<br><br>
        <em>For reference: Sunlight at Earth's surface is approximately 1000 W/m².</em>
    `;
}

/**
 * Clear the calculator inputs and results
 */
function clearCalculator() {
    // Reset the form based on current equation
    setupCalculatorForm(document.getElementById('equation-select').value);
} 