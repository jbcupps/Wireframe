/**
 * 4D Manifold Explorer - Quantum Oscillator JavaScript
 * Handles the quantum harmonic oscillator visualizations with Plotly.js
 */

// Global variables
let currentView = 'wavefunction'; // 'wavefunction', 'probability', 'energy', 'classical'
let isAnimating = false;
let animationInterval = null;
let oscillatorData = null;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize controls
    initializeControls();
    
    // Set up view buttons
    document.getElementById('view-wavefunction-btn').addEventListener('click', () => setView('wavefunction'));
    document.getElementById('view-probability-btn').addEventListener('click', () => setView('probability'));
    document.getElementById('view-energy-btn').addEventListener('click', () => setView('energy'));
    document.getElementById('view-classical-btn').addEventListener('click', () => setView('classical'));
    
    // Set up action buttons
    document.getElementById('update-oscillator-btn').addEventListener('click', updateOscillator);
    document.getElementById('reset-controls-btn').addEventListener('click', resetControls);
    document.getElementById('animate-btn').addEventListener('click', toggleAnimation);
    
    // Create initial visualization
    createVisualization();
});

/**
 * Initialize the controls and their event listeners
 */
function initializeControls() {
    // Initialize sliders
    const sliders = document.querySelectorAll('.range-slider');
    sliders.forEach(slider => {
        const valueDisplay = document.getElementById(slider.dataset.valueDisplay);
        if (valueDisplay) {
            // Initial value
            valueDisplay.textContent = slider.value;
            
            // Update on change
            slider.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
            });
        }
    });
}

/**
 * Reset all controls to their default values
 */
function resetControls() {
    document.getElementById('frequency').value = 1.0;
    document.getElementById('frequency-value').textContent = 1.0;
    
    document.getElementById('quantum-n').value = 0;
    document.getElementById('quantum-n-value').textContent = 0;
    
    document.getElementById('amplitude').value = 1.0;
    document.getElementById('amplitude-value').textContent = 1.0;
    
    document.getElementById('damping-factor').value = 0.1;
    document.getElementById('damping-factor-value').textContent = 0.1;
    
    document.getElementById('time-range').value = 10.0;
    document.getElementById('time-range-value').textContent = 10.0;
    
    // Update visualization with reset values
    updateOscillator();
}

/**
 * Change the current view type
 * @param {string} viewType - Type of view to show
 */
function setView(viewType) {
    currentView = viewType;
    
    // Highlight the active button
    document.getElementById('view-wavefunction-btn').classList.remove('active');
    document.getElementById('view-probability-btn').classList.remove('active');
    document.getElementById('view-energy-btn').classList.remove('active');
    document.getElementById('view-classical-btn').classList.remove('active');
    
    document.getElementById(`view-${viewType}-btn`).classList.add('active');
    
    // Update the visualization with the new view type
    if (oscillatorData) {
        renderVisualization(oscillatorData);
    }
}

/**
 * Update the oscillator visualization with current parameters
 */
function updateOscillator() {
    // Show loading indicator
    showLoading('oscillator-visualization', true);
    
    // Get parameters from form
    const params = {
        frequency: parseFloat(document.getElementById('frequency').value),
        quantum_n: parseInt(document.getElementById('quantum-n').value),
        amplitude: parseFloat(document.getElementById('amplitude').value),
        damping_factor: parseFloat(document.getElementById('damping-factor').value),
        time_range: parseFloat(document.getElementById('time-range').value)
    };
    
    // Call the API
    fetchAPI('/quantum/generate_oscillator', params)
        .then(data => {
            // Store the data for later use
            oscillatorData = data;
            
            // Render the visualization
            renderVisualization(data);
            
            // Update quantum properties
            updateQuantumProperties(data);
            
            // Hide loading indicator
            showLoading('oscillator-visualization', false);
        })
        .catch(error => {
            handleAPIError(error, 'error-text');
            showLoading('oscillator-visualization', false);
        });
}

/**
 * Create the initial visualization
 */
function createVisualization() {
    // Initialize with a placeholder
    const container = document.getElementById('oscillator-visualization');
    
    // Create empty plot
    Plotly.newPlot(container, [], {
        margin: { l: 50, r: 20, t: 20, b: 50 }
    });
    
    // Update with actual data
    updateOscillator();
}

/**
 * Render the oscillator visualization based on the current view
 * @param {Object} data - The oscillator data
 */
function renderVisualization(data) {
    if (!data) return;
    
    const container = document.getElementById('oscillator-visualization');
    
    if (currentView === 'wavefunction') {
        renderWavefunction(container, data);
    } else if (currentView === 'probability') {
        renderProbability(container, data);
    } else if (currentView === 'energy') {
        renderEnergyLevels(container, data);
    } else if (currentView === 'classical') {
        renderClassicalComparison(container, data);
    }
}

/**
 * Render the wavefunction visualization
 * @param {HTMLElement} container - The container element
 * @param {Object} data - The oscillator data
 */
function renderWavefunction(container, data) {
    const quantum = data.quantum;
    const n = quantum.selected_state;
    
    // Create an array of traces for each state up to n
    const traces = [];
    
    for (let i = 0; i <= n; i++) {
        const trace = {
            x: quantum.x_space,
            y: quantum.wavefunctions[i],
            mode: 'lines',
            name: `n = ${i}`,
            line: {
                width: i === n ? 3 : 1.5,
                color: getStateColor(i)
            }
        };
        traces.push(trace);
    }
    
    const layout = {
        title: `Quantum Harmonic Oscillator Wavefunctions (n = 0 to ${n})`,
        xaxis: {
            title: 'Position (x)',
            zeroline: true
        },
        yaxis: {
            title: 'Wavefunction Amplitude ψ(x)',
            zeroline: true
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            orientation: 'h'
        }
    };
    
    Plotly.react(container, traces, layout);
}

/**
 * Render the probability density visualization
 * @param {HTMLElement} container - The container element
 * @param {Object} data - The oscillator data
 */
function renderProbability(container, data) {
    const quantum = data.quantum;
    
    const trace = {
        x: quantum.x_space,
        y: quantum.probability_density,
        mode: 'lines',
        name: `n = ${quantum.selected_state}`,
        line: {
            width: 3,
            color: getStateColor(quantum.selected_state)
        },
        fill: 'tozeroy',
        fillcolor: getStateColor(quantum.selected_state, 0.3)
    };
    
    // Add a marker for the expected position
    const expectedPositionTrace = {
        x: [quantum.expectation_x, quantum.expectation_x],
        y: [0, Math.max(...quantum.probability_density) * 1.1],
        mode: 'lines',
        name: 'Expected Position',
        line: {
            width: 2,
            color: 'red',
            dash: 'dash'
        }
    };
    
    // Add uncertainty range
    const uncertainty = Math.sqrt(data.quantum.uncertainty);
    const xMinUncertainty = quantum.expectation_x - uncertainty;
    const xMaxUncertainty = quantum.expectation_x + uncertainty;
    
    const uncertaintyTrace = {
        x: [xMinUncertainty, xMinUncertainty, xMaxUncertainty, xMaxUncertainty],
        y: [0, Math.max(...quantum.probability_density) * 0.2, Math.max(...quantum.probability_density) * 0.2, 0],
        mode: 'lines',
        name: 'Position Uncertainty (Δx)',
        line: {
            width: 0
        },
        fill: 'toself',
        fillcolor: 'rgba(255, 0, 0, 0.1)'
    };
    
    const layout = {
        title: `Probability Density for n = ${quantum.selected_state}`,
        xaxis: {
            title: 'Position (x)',
            zeroline: true
        },
        yaxis: {
            title: 'Probability Density |ψ(x)|²',
            zeroline: true
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            orientation: 'h'
        }
    };
    
    Plotly.react(container, [trace, expectedPositionTrace, uncertaintyTrace], layout);
}

/**
 * Render the energy levels visualization
 * @param {HTMLElement} container - The container element
 * @param {Object} data - The oscillator data
 */
function renderEnergyLevels(container, data) {
    const quantum = data.quantum;
    const energyLevels = quantum.energy_levels;
    const n = quantum.selected_state;
    
    // Create traces for energy levels
    const traces = [];
    
    // Energy levels as horizontal lines
    for (let i = 0; i < energyLevels.length; i++) {
        const energy = energyLevels[i];
        const xMin = -3;
        const xMax = i <= n ? 0 : -2; // Extend occupied levels to center
        
        const trace = {
            x: [xMin, xMax],
            y: [energy, energy],
            mode: 'lines',
            name: `n = ${i}`,
            line: {
                width: i === n ? 3 : 1.5,
                color: getStateColor(i)
            }
        };
        traces.push(trace);
    }
    
    // Add potential well curve V(x) = 0.5 * m * ω^2 * x^2
    const x = quantum.x_space;
    const omega = 2 * Math.PI * data.parameters.frequency;
    const potentialEnergy = x.map(xi => 0.5 * omega * xi * xi);
    
    const potentialTrace = {
        x: x,
        y: potentialEnergy,
        mode: 'lines',
        name: 'Potential V(x)',
        line: {
            width: 2,
            color: 'black'
        }
    };
    traces.push(potentialTrace);
    
    // Add wavefunction for selected state, scaled and shifted to its energy level
    const selectedEnergy = energyLevels[n];
    const wavefunctionScaled = quantum.wavefunctions[n].map(
        psi => psi * 0.5 + selectedEnergy
    );
    
    const wavefunctionTrace = {
        x: x,
        y: wavefunctionScaled,
        mode: 'lines',
        name: `ψ(x) for n = ${n}`,
        line: {
            width: 2,
            color: getStateColor(n)
        }
    };
    traces.push(wavefunctionTrace);
    
    const layout = {
        title: 'Energy Levels and Wavefunctions',
        xaxis: {
            title: 'Position (x)',
            zeroline: true
        },
        yaxis: {
            title: 'Energy (E)',
            zeroline: true
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            orientation: 'h'
        }
    };
    
    Plotly.react(container, traces, layout);
}

/**
 * Render the classical vs. quantum comparison
 * @param {HTMLElement} container - The container element
 * @param {Object} data - The oscillator data
 */
function renderClassicalComparison(container, data) {
    const classical = data.classical;
    const quantum = data.quantum;
    
    // Classical oscillator trace
    const classicalTrace = {
        x: classical.time,
        y: classical.position,
        mode: 'lines',
        name: 'Classical Oscillator',
        line: {
            width: 2,
            color: 'blue'
        }
    };
    
    // Create expected position over time for quantum oscillator
    // For a coherent state, the expected position follows the classical trajectory
    // For simplicity, we'll use a sinusoid with appropriate parameters
    const omega = 2 * Math.PI * data.parameters.frequency;
    const quantumPosition = classical.time.map(t => 
        Math.cos(omega * t) * Math.exp(-data.parameters.damping_factor * t)
    );
    
    const quantumTrace = {
        x: classical.time,
        y: quantumPosition,
        mode: 'lines',
        name: `Quantum Expected Position (n = ${quantum.selected_state})`,
        line: {
            width: 2,
            color: getStateColor(quantum.selected_state)
        }
    };
    
    // Add uncertainty range
    const uncertainty = Math.sqrt(quantum.uncertainty);
    const upperBound = classical.time.map((t, i) => quantumPosition[i] + uncertainty);
    const lowerBound = classical.time.map((t, i) => quantumPosition[i] - uncertainty);
    
    const uncertaintyTrace = {
        x: classical.time.concat(classical.time.slice().reverse()),
        y: upperBound.concat(lowerBound.slice().reverse()),
        mode: 'lines',
        name: 'Quantum Uncertainty',
        line: {
            width: 0
        },
        fill: 'toself',
        fillcolor: getStateColor(quantum.selected_state, 0.2)
    };
    
    const layout = {
        title: 'Classical vs. Quantum Oscillator',
        xaxis: {
            title: 'Time (t)',
            zeroline: true
        },
        yaxis: {
            title: 'Position (x)',
            zeroline: true
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            orientation: 'h'
        }
    };
    
    Plotly.react(container, [classicalTrace, quantumTrace, uncertaintyTrace], layout);
}

/**
 * Update the quantum properties display
 * @param {Object} data - The oscillator data
 */
function updateQuantumProperties(data) {
    if (!data || !data.quantum) return;
    
    const quantum = data.quantum;
    const omega = 2 * Math.PI * data.parameters.frequency;
    
    // Update energy levels table
    for (let i = 0; i < 4; i++) {
        const energyElement = document.getElementById(`energy-level-${i}`);
        if (energyElement) {
            const energyValue = quantum.energy_levels[i];
            const hbarOmega = omega;
            energyElement.textContent = `${(i + 0.5)}ħω = ${formatNumber(energyValue, 2)}`;
        }
    }
    
    // Update quantum observables
    document.getElementById('expected-position').textContent = formatNumber(quantum.expectation_x, 2);
    document.getElementById('position-uncertainty').textContent = formatNumber(Math.sqrt(quantum.uncertainty), 3);
    
    // Momentum uncertainty (calculated from position uncertainty and Heisenberg relation)
    const momentumUncertainty = 0.5 / Math.sqrt(quantum.uncertainty);
    document.getElementById('momentum-uncertainty').textContent = formatNumber(momentumUncertainty, 3);
    
    // Uncertainty product should be approximately hbar/2 = 0.5
    const uncertaintyProduct = Math.sqrt(quantum.uncertainty) * momentumUncertainty;
    document.getElementById('uncertainty-product').textContent = `${formatNumber(uncertaintyProduct, 3)} ħ`;
}

/**
 * Get a color for a quantum state
 * @param {number} n - Quantum number
 * @param {number} alpha - Optional transparency
 * @returns {string} - Color string
 */
function getStateColor(n, alpha = 1) {
    const colors = [
        'rgb(31, 119, 180)',   // Blue
        'rgb(255, 127, 14)',   // Orange
        'rgb(44, 160, 44)',    // Green
        'rgb(214, 39, 40)',    // Red
        'rgb(148, 103, 189)',  // Purple
        'rgb(140, 86, 75)'     // Brown
    ];
    
    if (alpha < 1) {
        const rgb = colors[n % colors.length].match(/\d+/g);
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }
    
    return colors[n % colors.length];
}

/**
 * Toggle animation of the oscillation
 */
function toggleAnimation() {
    isAnimating = !isAnimating;
    
    const animateBtn = document.getElementById('animate-btn');
    const animateLabel = document.getElementById('animate-label');
    
    if (isAnimating) {
        // Start animation
        animateBtn.innerHTML = '<i class="fas fa-pause"></i> <span id="animate-label">Pause</span>';
        animateLabel.textContent = 'Pause';
        
        // For animation, we'll update the frequency parameter
        let freqSlider = document.getElementById('frequency');
        let freqValue = document.getElementById('frequency-value');
        let currentFreq = parseFloat(freqSlider.value);
        let direction = 0.1;
        
        animationInterval = setInterval(() => {
            // Oscillate the frequency between 0.1 and 5.0
            currentFreq += direction;
            if (currentFreq >= 5.0) {
                currentFreq = 5.0;
                direction = -0.1;
            } else if (currentFreq <= 0.1) {
                currentFreq = 0.1;
                direction = 0.1;
            }
            
            freqSlider.value = currentFreq;
            freqValue.textContent = formatNumber(currentFreq, 1);
            updateOscillator();
        }, 200);
    } else {
        // Stop animation
        animateBtn.innerHTML = '<i class="fas fa-play"></i> <span id="animate-label">Animate</span>';
        animateLabel.textContent = 'Animate';
        
        clearInterval(animationInterval);
    }
} 