/**
 * 4D Manifold Explorer - Evolution JavaScript
 * Handles the evolutionary algorithm visualization with Plotly.js
 */

// Global variables
let currentView = 'fitness'; // 'fitness', 'best-skb', or 'population'
let evolutionResults = null;
let evolutionPlot = null;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize controls
    initializeControls();
    
    // Set up view buttons
    document.getElementById('view-fitness-btn').addEventListener('click', () => setView('fitness'));
    document.getElementById('view-best-skb-btn').addEventListener('click', () => setView('best-skb'));
    document.getElementById('view-population-btn').addEventListener('click', () => setView('population'));
    
    // Set up action buttons
    document.getElementById('run-evolution-btn').addEventListener('click', runEvolution);
    document.getElementById('reset-evolution-btn').addEventListener('click', resetControls);
    document.getElementById('use-best-params-btn').addEventListener('click', useBestParameters);
    document.getElementById('export-best-params-btn').addEventListener('click', exportBestParameters);
    
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
                
                // Special handling for weights to ensure they sum to 1
                if (this.id === 'twist-weight') {
                    const loopWeight = document.getElementById('loop-weight');
                    const loopWeightValue = document.getElementById('loop-weight-value');
                    
                    // Calculate complementary weight
                    const newLoopWeight = Math.round((1 - parseFloat(this.value)) * 10) / 10;
                    loopWeight.value = newLoopWeight;
                    loopWeightValue.textContent = newLoopWeight.toFixed(1);
                } else if (this.id === 'loop-weight') {
                    const twistWeight = document.getElementById('twist-weight');
                    const twistWeightValue = document.getElementById('twist-weight-value');
                    
                    // Calculate complementary weight
                    const newTwistWeight = Math.round((1 - parseFloat(this.value)) * 10) / 10;
                    twistWeight.value = newTwistWeight;
                    twistWeightValue.textContent = newTwistWeight.toFixed(1);
                }
            });
        }
    });
}

/**
 * Reset all controls to their default values
 */
function resetControls() {
    document.getElementById('population-size').value = 20;
    document.getElementById('population-size-value').textContent = 20;
    
    document.getElementById('generations').value = 10;
    document.getElementById('generations-value').textContent = 10;
    
    document.getElementById('mutation-rate').value = 0.1;
    document.getElementById('mutation-rate-value').textContent = 0.1;
    
    document.getElementById('target-twist-sum').value = 3.0;
    document.getElementById('target-twist-sum-value').textContent = 3.0;
    
    document.getElementById('target-loop-factor').value = 1.5;
    document.getElementById('target-loop-factor-value').textContent = 1.5;
    
    document.getElementById('twist-weight').value = 0.6;
    document.getElementById('twist-weight-value').textContent = 0.6;
    
    document.getElementById('loop-weight').value = 0.4;
    document.getElementById('loop-weight-value').textContent = 0.4;
    
    // Reset results
    evolutionResults = null;
    
    // Reset visualization
    createVisualization();
    
    // Reset tables
    document.getElementById('best-twist-x').textContent = '-';
    document.getElementById('best-twist-y').textContent = '-';
    document.getElementById('best-twist-z').textContent = '-';
    document.getElementById('best-loop-factor').textContent = '-';
    document.getElementById('best-fitness').textContent = '-';
    
    document.getElementById('best-mass').textContent = '-';
    document.getElementById('best-charge').textContent = '-';
    document.getElementById('best-spin').textContent = '-';
    document.getElementById('best-particle').textContent = '-';
    document.getElementById('best-confidence').textContent = '-';
}

/**
 * Change the current view type
 * @param {string} viewType - Type of view to show
 */
function setView(viewType) {
    currentView = viewType;
    
    // Highlight the active button
    document.getElementById('view-fitness-btn').classList.remove('active');
    document.getElementById('view-best-skb-btn').classList.remove('active');
    document.getElementById('view-population-btn').classList.remove('active');
    
    document.getElementById(`view-${viewType}-btn`).classList.add('active');
    
    // Update the visualization with the new view type
    updateVisualization();
}

/**
 * Run the evolutionary algorithm with current settings
 */
function runEvolution() {
    // Show loading indicator
    showLoading('evolution-visualization', true);
    
    // Get parameters from form
    const params = {
        population_size: parseInt(document.getElementById('population-size').value),
        generations: parseInt(document.getElementById('generations').value),
        mutation_rate: parseFloat(document.getElementById('mutation-rate').value),
        fitness_criteria: {
            target_twist_sum: parseFloat(document.getElementById('target-twist-sum').value),
            target_loop_factor: parseFloat(document.getElementById('target-loop-factor').value),
            twist_weight: parseFloat(document.getElementById('twist-weight').value),
            loop_weight: parseFloat(document.getElementById('loop-weight').value)
        }
    };
    
    // Call the evolution API
    fetchAPI('/evolution/run_evolution', params)
        .then(data => {
            // Store results
            evolutionResults = data;
            
            // Update visualization
            updateVisualization();
            
            // Update best individual info
            updateBestIndividualInfo(data.best_individual);
            
            // Hide loading indicator
            showLoading('evolution-visualization', false);
            
            // Get particle property predictions for best individual
            const bestParams = data.best_individual.params;
            fetchAPI('/evolution/predict_properties', { manifold_features: bestParams })
                .then(predictionData => {
                    updateBestParticleProperties(predictionData);
                })
                .catch(error => {
                    console.error('Error fetching particle predictions:', error);
                });
        })
        .catch(error => {
            handleAPIError(error, 'error-text');
            showLoading('evolution-visualization', false);
        });
}

/**
 * Create the initial Plotly visualization
 */
function createVisualization() {
    // Initialize with a placeholder
    const container = document.getElementById('evolution-visualization');
    
    // Clear container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Create placeholder content
    const placeholder = document.createElement('div');
    placeholder.className = 'd-flex flex-column justify-content-center align-items-center h-100';
    placeholder.innerHTML = `
        <p class="text-muted mb-4">Configure evolution parameters and click "Run Evolution" to begin</p>
        <i class="fas fa-dna fa-5x text-muted mb-4"></i>
    `;
    container.appendChild(placeholder);
}

/**
 * Update the visualization based on current view and results
 */
function updateVisualization() {
    if (!evolutionResults) {
        // No results yet, nothing to update
        return;
    }
    
    const container = document.getElementById('evolution-visualization');
    
    // Clear container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Create appropriate visualization based on current view
    if (currentView === 'fitness') {
        renderFitnessGraph(container);
    } else if (currentView === 'best-skb') {
        renderBestIndividual(container);
    } else if (currentView === 'population') {
        renderPopulationGrid(container);
    }
}

/**
 * Render the fitness evolution graph
 * @param {HTMLElement} container - The container element
 */
function renderFitnessGraph(container) {
    const generations = Array.from({ length: evolutionResults.generations }, (_, i) => i + 1);
    
    const trace1 = {
        x: generations,
        y: evolutionResults.best_fitness_history,
        mode: 'lines+markers',
        name: 'Best Fitness',
        line: { color: 'rgb(31, 119, 180)', width: 3 },
        marker: { size: 8 }
    };
    
    const trace2 = {
        x: generations,
        y: evolutionResults.avg_fitness_history,
        mode: 'lines+markers',
        name: 'Average Fitness',
        line: { color: 'rgb(255, 127, 14)', width: 2, dash: 'dot' },
        marker: { size: 6 }
    };
    
    const layout = {
        title: 'Fitness Evolution',
        xaxis: {
            title: 'Generation',
            showgrid: true,
            zeroline: true
        },
        yaxis: {
            title: 'Fitness',
            showline: true,
            range: [0, 1]
        },
        margin: { l: 50, r: 20, t: 50, b: 50 },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            orientation: 'h'
        }
    };
    
    Plotly.newPlot(container, [trace1, trace2], layout);
}

/**
 * Render the best individual visualization
 * @param {HTMLElement} container - The container element
 */
function renderBestIndividual(container) {
    // Get best individual parameters
    const params = evolutionResults.best_individual.params;
    
    // Call the API to get the visualization data
    showLoading('evolution-visualization', true);
    
    fetchAPI('/manifold/generate_sub_skb', params)
        .then(data => {
            // Create surface plot
            const trace = {
                type: 'surface',
                x: data.sub_skb_data.x,
                y: data.sub_skb_data.y,
                z: data.sub_skb_data.z,
                colorscale: 'Viridis',
                opacity: 0.7,
                showscale: false
            };
            
            const layout = {
                title: 'Best Individual (Sub-SKB)',
                scene: {
                    aspectmode: 'cube',
                    xaxis: { range: [-3, 3], title: 'X' },
                    yaxis: { range: [-3, 3], title: 'Y' },
                    zaxis: { range: [-3, 3], title: 'Z' }
                },
                margin: { l: 0, r: 0, t: 50, b: 0 },
                showlegend: false
            };
            
            Plotly.newPlot(container, [trace], layout);
            showLoading('evolution-visualization', false);
        })
        .catch(error => {
            handleAPIError(error, 'error-text');
            showLoading('evolution-visualization', false);
        });
}

/**
 * Render the population grid visualization
 * @param {HTMLElement} container - The container element
 */
function renderPopulationGrid(container) {
    // Create a scatter3d plot with points representing each individual
    const population = evolutionResults.final_population;
    
    // Extract parameters for each individual
    const x = population.map(ind => ind.params.twist_x || 0);
    const y = population.map(ind => ind.params.twist_y || 0);
    const z = population.map(ind => ind.params.twist_z || 0);
    
    // Calculate color based on fitness
    const fitness = population.map(ind => ind.fitness);
    const maxFitness = Math.max(...fitness);
    const normalizedFitness = fitness.map(f => f / maxFitness);
    
    // Calculate marker size based on loop factor
    const loopFactors = population.map(ind => ind.params.loop_factor || 1);
    const markerSizes = loopFactors.map(lf => lf * 10);
    
    // Create text labels
    const textLabels = population.map((ind, i) => {
        return `Fitness: ${formatNumber(ind.fitness, 3)}<br>` + 
               `Twist X: ${formatNumber(ind.params.twist_x, 2)}<br>` + 
               `Twist Y: ${formatNumber(ind.params.twist_y, 2)}<br>` + 
               `Twist Z: ${formatNumber(ind.params.twist_z, 2)}<br>` + 
               `Loop Factor: ${formatNumber(ind.params.loop_factor, 2)}`;
    });
    
    const trace = {
        type: 'scatter3d',
        mode: 'markers',
        x: x,
        y: y,
        z: z,
        text: textLabels,
        hoverinfo: 'text',
        marker: {
            size: markerSizes,
            color: normalizedFitness,
            colorscale: 'Viridis',
            opacity: 0.8,
            showscale: true,
            colorbar: {
                title: 'Fitness'
            }
        }
    };
    
    const layout = {
        title: 'Population Distribution',
        scene: {
            aspectmode: 'cube',
            xaxis: { title: 'Twist X' },
            yaxis: { title: 'Twist Y' },
            zaxis: { title: 'Twist Z' }
        },
        margin: { l: 0, r: 0, t: 50, b: 0 }
    };
    
    Plotly.newPlot(container, [trace], layout);
}

/**
 * Update the best individual information display
 * @param {Object} bestIndividual - The best individual data
 */
function updateBestIndividualInfo(bestIndividual) {
    if (!bestIndividual || !bestIndividual.params) return;
    
    // Update parameter table
    document.getElementById('best-twist-x').textContent = formatNumber(bestIndividual.params.twist_x, 3);
    document.getElementById('best-twist-y').textContent = formatNumber(bestIndividual.params.twist_y, 3);
    document.getElementById('best-twist-z').textContent = formatNumber(bestIndividual.params.twist_z, 3);
    document.getElementById('best-loop-factor').textContent = formatNumber(bestIndividual.params.loop_factor, 3);
    document.getElementById('best-fitness').textContent = formatNumber(bestIndividual.fitness, 4);
}

/**
 * Update the best individual's particle property predictions
 * @param {Object} properties - The predicted particle properties
 */
function updateBestParticleProperties(properties) {
    if (!properties) return;
    
    // Update the properties table
    if (properties.predicted_mass !== undefined) {
        document.getElementById('best-mass').textContent = formatNumber(properties.predicted_mass, 3);
    }
    
    if (properties.predicted_charge !== undefined) {
        document.getElementById('best-charge').textContent = properties.predicted_charge;
    }
    
    if (properties.predicted_spin !== undefined) {
        document.getElementById('best-spin').textContent = properties.predicted_spin;
    }
    
    if (properties.likely_particle !== undefined) {
        document.getElementById('best-particle').textContent = properties.likely_particle;
    }
    
    if (properties.confidence !== undefined) {
        document.getElementById('best-confidence').textContent = formatNumber(properties.confidence * 100, 0) + '%';
    }
}

/**
 * Use the best individual's parameters in the main visualization
 */
function useBestParameters() {
    if (!evolutionResults || !evolutionResults.best_individual || !evolutionResults.best_individual.params) {
        return;
    }
    
    const params = evolutionResults.best_individual.params;
    
    // Create a URL with parameters
    const url = `/manifold/skb_visualization?` +
        `twist_x=${params.twist_x}&` +
        `twist_y=${params.twist_y}&` +
        `twist_z=${params.twist_z}&` +
        `loop_factor=${params.loop_factor}&` +
        `time=0`;
    
    // Navigate to the URL
    window.location.href = url;
}

/**
 * Export the best individual's parameters as JSON
 */
function exportBestParameters() {
    if (!evolutionResults || !evolutionResults.best_individual || !evolutionResults.best_individual.params) {
        return;
    }
    
    const params = evolutionResults.best_individual.params;
    
    // Create a JSON string
    const jsonString = JSON.stringify(params, null, 2);
    
    // Create a data URI
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', dataUri);
    downloadLink.setAttribute('download', 'best_parameters.json');
    document.body.appendChild(downloadLink);
    
    // Click the link and remove it
    downloadLink.click();
    document.body.removeChild(downloadLink);
} 