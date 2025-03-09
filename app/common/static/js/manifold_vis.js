/**
 * 4D Manifold Explorer - Manifold Visualization JavaScript
 * Handles the SKB and Sub-SKB visualizations with Plotly.js
 */

// Global variables
let currentView = 'skb'; // 'skb', 'sub-skb', or 'combined'
let isAnimating = false;
let animationInterval = null;
let manifoldPlot = null;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize controls
    initializeControls();
    
    // Set up view buttons
    document.getElementById('view-skb-btn').addEventListener('click', () => setView('skb'));
    document.getElementById('view-sub-skb-btn').addEventListener('click', () => setView('sub-skb'));
    document.getElementById('view-combined-btn').addEventListener('click', () => setView('combined'));
    
    // Set up action buttons
    document.getElementById('update-visualization-btn').addEventListener('click', updateVisualization);
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
    document.getElementById('twist-x').value = 1.0;
    document.getElementById('twist-x-value').textContent = 1.0;
    
    document.getElementById('twist-y').value = 0.5;
    document.getElementById('twist-y-value').textContent = 0.5;
    
    document.getElementById('twist-z').value = 1.5;
    document.getElementById('twist-z-value').textContent = 1.5;
    
    document.getElementById('loop-factor').value = 1.0;
    document.getElementById('loop-factor-value').textContent = 1.0;
    
    document.getElementById('time').value = 0.0;
    document.getElementById('time-value').textContent = 0.0;
    
    // Update visualization with reset values
    updateVisualization();
}

/**
 * Change the current view type (SKB, Sub-SKB, or combined)
 * @param {string} viewType - Type of view to show
 */
function setView(viewType) {
    currentView = viewType;
    
    // Highlight the active button
    document.getElementById('view-skb-btn').classList.remove('active');
    document.getElementById('view-sub-skb-btn').classList.remove('active');
    document.getElementById('view-combined-btn').classList.remove('active');
    
    document.getElementById(`view-${viewType}-btn`).classList.add('active');
    
    // Update the visualization with the new view type
    updateVisualization();
}

/**
 * Update the visualization based on current controls and view
 */
function updateVisualization() {
    // Show loading indicator
    showLoading('manifold-visualization', true);
    
    // Get parameters from form
    const params = {
        twist_x: parseFloat(document.getElementById('twist-x').value),
        twist_y: parseFloat(document.getElementById('twist-y').value),
        twist_z: parseFloat(document.getElementById('twist-z').value),
        loop_factor: parseFloat(document.getElementById('loop-factor').value),
        time: parseFloat(document.getElementById('time').value)
    };
    
    // Determine endpoint based on view type
    let endpoint;
    if (currentView === 'skb') {
        endpoint = '/manifold/generate_skb';
    } else if (currentView === 'sub-skb') {
        endpoint = '/manifold/generate_sub_skb';
    } else {
        // For combined view, we'll need to call both endpoints
        // Here we'll start with the SKB for simplicity
        endpoint = '/manifold/generate_skb';
    }
    
    // Fetch data from API
    fetchAPI(endpoint, params)
        .then(data => {
            if (currentView === 'combined') {
                // For combined view, fetch the sub-SKB data as well
                fetchAPI('/manifold/generate_sub_skb', params)
                    .then(subSkbData => {
                        renderCombinedVisualization(data, subSkbData);
                        updateInvariants(data.invariants);
                        showLoading('manifold-visualization', false);
                    })
                    .catch(error => {
                        handleAPIError(error, 'error-text');
                        showLoading('manifold-visualization', false);
                    });
            } else {
                // For single view types
                renderVisualization(data);
                updateInvariants(data.invariants);
                showLoading('manifold-visualization', false);
            }
            
            // Make a separate call to get particle property predictions
            fetchAPI('/evolution/predict_properties', params)
                .then(predictionData => {
                    updateParticleProperties(predictionData);
                })
                .catch(error => {
                    console.error('Error fetching particle predictions:', error);
                });
        })
        .catch(error => {
            handleAPIError(error, 'error-text');
            showLoading('manifold-visualization', false);
        });
}

/**
 * Create the initial Plotly visualization
 */
function createVisualization() {
    // Initialize with a placeholder
    const container = document.getElementById('manifold-visualization');
    
    // Create empty 3D plot
    manifoldPlot = Plotly.newPlot(container, [], {
        scene: {
            aspectmode: 'cube',
            xaxis: { range: [-3, 3], title: 'X' },
            yaxis: { range: [-3, 3], title: 'Y' },
            zaxis: { range: [-3, 3], title: 'Z' }
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false
    });
    
    // Update with actual data
    updateVisualization();
}

/**
 * Render the visualization with the provided data
 * @param {Object} data - The data to visualize
 */
function renderVisualization(data) {
    const container = document.getElementById('manifold-visualization');
    
    let traces = [];
    
    if (currentView === 'skb' && data.skb_data) {
        // Add SKB surface
        traces.push({
            type: 'surface',
            x: data.skb_data.x,
            y: data.skb_data.y,
            z: data.skb_data.z,
            colorscale: 'Viridis',
            opacity: 0.7,
            showscale: false
        });
    } else if (currentView === 'sub-skb' && data.sub_skb_data) {
        // Add Sub-SKB surface
        traces.push({
            type: 'surface',
            x: data.sub_skb_data.x,
            y: data.sub_skb_data.y,
            z: data.sub_skb_data.z,
            colorscale: 'Plasma',
            opacity: 0.7,
            showscale: false
        });
    }
    
    // Layout configuration
    const layout = {
        scene: {
            aspectmode: 'cube',
            xaxis: { range: [-3, 3], title: 'X' },
            yaxis: { range: [-3, 3], title: 'Y' },
            zaxis: { range: [-3, 3], title: 'Z' }
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false
    };
    
    // Update the plot
    Plotly.react(container, traces, layout);
}

/**
 * Render a visualization with both SKB and Sub-SKB
 * @param {Object} skbData - The SKB data
 * @param {Object} subSkbData - The Sub-SKB data
 */
function renderCombinedVisualization(skbData, subSkbData) {
    const container = document.getElementById('manifold-visualization');
    
    let traces = [];
    
    // Add SKB surface
    if (skbData.skb_data) {
        traces.push({
            type: 'surface',
            x: skbData.skb_data.x,
            y: skbData.skb_data.y,
            z: skbData.skb_data.z,
            colorscale: 'Viridis',
            opacity: 0.5,
            showscale: false,
            name: 'SKB'
        });
    }
    
    // Add Sub-SKB surface
    if (subSkbData.sub_skb_data) {
        traces.push({
            type: 'surface',
            x: subSkbData.sub_skb_data.x,
            y: subSkbData.sub_skb_data.y,
            z: subSkbData.sub_skb_data.z,
            colorscale: 'Plasma',
            opacity: 0.7,
            showscale: false,
            name: 'Sub-SKB'
        });
    }
    
    // Layout configuration
    const layout = {
        scene: {
            aspectmode: 'cube',
            xaxis: { range: [-3, 3], title: 'X' },
            yaxis: { range: [-3, 3], title: 'Y' },
            zaxis: { range: [-3, 3], title: 'Z' }
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            orientation: 'h'
        }
    };
    
    // Update the plot
    Plotly.react(container, traces, layout);
}

/**
 * Update the topological invariants display
 * @param {Object} invariants - The invariants data
 */
function updateInvariants(invariants) {
    if (!invariants) return;
    
    // Update the invariants table
    if (invariants.euler_characteristic !== undefined) {
        document.getElementById('euler-characteristic').textContent = invariants.euler_characteristic;
    }
    
    if (invariants.orientability !== undefined) {
        document.getElementById('orientability').textContent = invariants.orientability;
    }
    
    if (invariants.genus !== undefined) {
        document.getElementById('genus').textContent = invariants.genus;
    }
    
    if (invariants.twist_complexity !== undefined) {
        document.getElementById('twist-complexity').textContent = formatNumber(invariants.twist_complexity, 2);
    }
}

/**
 * Update the particle properties display
 * @param {Object} properties - The predicted particle properties
 */
function updateParticleProperties(properties) {
    if (!properties) return;
    
    // Update the properties table
    if (properties.predicted_mass !== undefined) {
        document.getElementById('property-mass').textContent = formatNumber(properties.predicted_mass, 3);
        document.getElementById('confidence-mass').textContent = formatNumber(properties.confidence * 100, 0) + '%';
    }
    
    if (properties.predicted_charge !== undefined) {
        document.getElementById('property-charge').textContent = properties.predicted_charge;
        document.getElementById('confidence-charge').textContent = formatNumber(properties.confidence * 100, 0) + '%';
    }
    
    if (properties.predicted_spin !== undefined) {
        document.getElementById('property-spin').textContent = properties.predicted_spin;
        document.getElementById('confidence-spin').textContent = formatNumber(properties.confidence * 100, 0) + '%';
    }
    
    if (properties.likely_particle !== undefined) {
        document.getElementById('likely-particle').textContent = properties.likely_particle;
    }
}

/**
 * Toggle animation of the time parameter
 */
function toggleAnimation() {
    isAnimating = !isAnimating;
    
    const animateBtn = document.getElementById('animate-btn');
    const animateLabel = document.getElementById('animate-label');
    
    if (isAnimating) {
        // Start animation
        animateBtn.innerHTML = '<i class="fas fa-pause"></i> <span id="animate-label">Pause</span>';
        animateLabel.textContent = 'Pause';
        
        let timeSlider = document.getElementById('time');
        let timeValue = document.getElementById('time-value');
        let currentTime = parseFloat(timeSlider.value);
        
        animationInterval = setInterval(() => {
            currentTime = (currentTime + 0.1) % 10;
            timeSlider.value = currentTime;
            timeValue.textContent = formatNumber(currentTime, 1);
            updateVisualization();
        }, 100);
    } else {
        // Stop animation
        animateBtn.innerHTML = '<i class="fas fa-play"></i> <span id="animate-label">Animate</span>';
        animateLabel.textContent = 'Animate';
        
        clearInterval(animationInterval);
    }
} 