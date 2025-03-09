/**
 * 4D Manifold Explorer - Methodical Iterative Search
 * Implements systematic parameter space exploration for sub-SKB configurations
 */

// Global state for methodical search
const searchState = {
    results: null,
    iterativeResults: null,
    currentVisualization: null,
    viewMode: 'parameter-space', // 'parameter-space', 'best-result', 'optimization'
    isRunning: false,
    currentSearchMode: 'standard' // 'standard' or 'iterative'
};

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing methodical search functionality');
    
    // Setup visualization area
    setupVisualization();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Set up the visualization area with initial state
 */
function setupVisualization() {
    const container = document.getElementById('search-visualization');
    if (!container) return;
    
    // Create empty plot
    Plotly.newPlot(container, [{
        x: [],
        y: [],
        z: [],
        type: 'scatter3d',
        mode: 'markers',
        marker: {
            size: 5,
            color: '#5271FF',
            opacity: 0.8
        }
    }], {
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 0
        },
        scene: {
            xaxis: {title: 'X Twist'},
            yaxis: {title: 'Y Twist'},
            zaxis: {title: 'Z Twist'}
        },
        hovermode: 'closest'
    }, {
        responsive: true
    });
    
    searchState.currentVisualization = container;
}

/**
 * Set up event listeners for buttons and form controls
 */
function setupEventListeners() {
    // View mode buttons
    const parameterSpaceBtn = document.getElementById('view-parameter-space-btn');
    const bestResultBtn = document.getElementById('view-best-result-btn');
    const optimizationBtn = document.getElementById('view-optimization-btn');
    
    if (parameterSpaceBtn) parameterSpaceBtn.addEventListener('click', () => setViewMode('parameter-space'));
    if (bestResultBtn) bestResultBtn.addEventListener('click', () => setViewMode('best-result'));
    if (optimizationBtn) optimizationBtn.addEventListener('click', () => setViewMode('optimization'));
    
    // Search mode buttons
    const standardSearchTab = document.getElementById('standard-search-tab');
    const iterativeSearchTab = document.getElementById('iterative-search-tab');
    
    if (standardSearchTab) {
        standardSearchTab.addEventListener('click', function() {
            searchState.currentSearchMode = 'standard';
        });
    }
    
    if (iterativeSearchTab) {
        iterativeSearchTab.addEventListener('click', function() {
            searchState.currentSearchMode = 'iterative';
        });
    }
    
    // Run search buttons
    const runStandardSearchBtn = document.getElementById('run-search-btn');
    const runIterativeSearchBtn = document.getElementById('run-iterative-search-btn');
    
    if (runStandardSearchBtn) runStandardSearchBtn.addEventListener('click', runMethodicalSearch);
    if (runIterativeSearchBtn) runIterativeSearchBtn.addEventListener('click', runIterativeSearch);
    
    // Export results buttons
    const exportResultsBtn = document.getElementById('export-results-btn');
    const exportIterativeBtn = document.getElementById('export-iterative-btn');
    
    if (exportResultsBtn) exportResultsBtn.addEventListener('click', exportResults);
    if (exportIterativeBtn) exportIterativeBtn.addEventListener('click', exportIterativeResults);
}

/**
 * Switch between different visualization views
 * @param {string} mode - The view mode to switch to
 */
function setViewMode(mode) {
    searchState.viewMode = mode;
    
    // Update active button state
    document.querySelectorAll('.btn-outline-primary').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`view-${mode}-btn`).classList.add('active');
    
    // Update visualization if results exist
    if (searchState.results) {
        updateVisualization();
    }
}

/**
 * Run the methodical search with current parameters
 */
function runMethodicalSearch() {
    if (searchState.isRunning) return;
    searchState.isRunning = true;
    
    // Show loading state
    const container = document.getElementById('search-visualization');
    if (container) {
        container.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="ms-3">Running search...</p></div>';
    }
    
    // Collect parameter data
    const parameterSpace = collectParameterSpace();
    const targetProperties = collectTargetProperties();
    
    // Validate parameter space
    if (Object.keys(parameterSpace).length === 0) {
        showError("Parameter space is empty. Please configure search parameters.");
        searchState.isRunning = false;
        return;
    }
    
    // Calculate potential parameter combinations
    let combinationCount = 1;
    Object.values(parameterSpace).forEach(param => {
        combinationCount *= param.steps;
    });
    
    // Warn user if combinations are excessive
    if (combinationCount > 1000) {
        const confirmContinue = confirm(`This search will evaluate ${combinationCount} parameter combinations, which may take some time. Continue?`);
        if (!confirmContinue) {
            if (container) {
                container.innerHTML = '<div class="d-flex flex-column justify-content-center align-items-center h-100"><p class="text-muted mb-4">Search cancelled. Consider reducing parameter steps for faster results.</p><i class="fas fa-search fa-5x text-muted mb-4"></i></div>';
            }
            searchState.isRunning = false;
            return;
        }
    }
    
    console.log("Sending search request with parameters:", {parameterSpace, targetProperties});
    
    // Send to backend
    fetch('/evolution/methodical_search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            parameter_space: parameterSpace,
            target_properties: targetProperties,
            max_iterations: parseInt(document.getElementById('max-iterations').value || 100),
            tolerance: parseFloat(document.getElementById('tolerance').value || 0.01)
        })
    })
    .then(response => {
        console.log("Received response with status:", response.status);
        
        if (!response.ok) {
            // Try to get the error message from the response
            return response.json().then(data => {
                throw new Error(data.error || 'Network response was not ok');
            }).catch(err => {
                // If we can't parse the JSON, throw the original error
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Received data:", data);
        
        // Check if the response contains an error
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Check if the response contains the expected data
        if (!data.results || !Array.isArray(data.results)) {
            throw new Error('Invalid response format: missing results array');
        }
        
        // Store results
        searchState.results = data;
        
        // Check if we found any valid results
        if (data.results.length === 0) {
            showError("No valid configurations found. Try adjusting search parameters.");
            searchState.isRunning = false;
            return;
        }
        
        // Update visualization
        updateVisualization();
        
        // Update results table
        updateResultsTable(data.results);
        
        // Update best configuration
        updateBestConfiguration(data.best_configuration);
        
        // Show success message
        showSuccess(`Search complete! Found ${data.results.length} configurations, evaluated ${data.total_configurations_evaluated} combinations.`);
        
        searchState.isRunning = false;
    })
    .catch(error => {
        console.error('Error running search:', error);
        showError(`Error running search: ${error.message}`);
        searchState.isRunning = false;
        
        // Reset the visualization container to initial state
        if (container) {
            container.innerHTML = '<div class="d-flex flex-column justify-content-center align-items-center h-100"><p class="text-danger mb-4">Search failed. Please try again with different parameters.</p><i class="fas fa-exclamation-triangle fa-5x text-danger mb-4"></i></div>';
        }
    });
}

/**
 * Collect parameter space data from form inputs
 * @returns {Object} Parameter space configuration
 */
function collectParameterSpace() {
    // Use different form elements based on search mode
    const prefix = searchState.currentSearchMode === 'iterative' ? 'iter-' : '';
    
    return {
        twist_x: {
            min: parseFloat(document.getElementById(`${prefix}twist-x-min`).value || 0),
            max: parseFloat(document.getElementById(`${prefix}twist-x-max`).value || 3),
            steps: parseInt(document.getElementById(`${prefix}twist-x-steps`).value || 10)
        },
        twist_y: {
            min: parseFloat(document.getElementById(`${prefix}twist-y-min`).value || 0),
            max: parseFloat(document.getElementById(`${prefix}twist-y-max`).value || 3),
            steps: parseInt(document.getElementById(`${prefix}twist-y-steps`).value || 10)
        },
        twist_z: {
            min: parseFloat(document.getElementById(`${prefix}twist-z-min`).value || 0),
            max: parseFloat(document.getElementById(`${prefix}twist-z-max`).value || 3),
            steps: parseInt(document.getElementById(`${prefix}twist-z-steps`).value || 10)
        },
        loop_factor: {
            min: parseFloat(document.getElementById(`${prefix}loop-factor-min`).value || 0.5),
            max: parseFloat(document.getElementById(`${prefix}loop-factor-max`).value || 2),
            steps: parseInt(document.getElementById(`${prefix}loop-factor-steps`).value || 5)
        }
    };
}

/**
 * Collect target properties from form inputs
 * @returns {Object} Target properties
 */
function collectTargetProperties() {
    return {
        twist_sum: parseFloat(document.getElementById('target-twist-sum').value || 3),
        loop_factor: parseFloat(document.getElementById('target-loop-factor').value || 1.5),
        twist_weight: parseFloat(document.getElementById('twist-weight').value || 0.6),
        loop_weight: parseFloat(document.getElementById('loop-weight').value || 0.4)
    };
}

/**
 * Update visualization based on current view mode and results
 */
function updateVisualization() {
    if (!searchState.results || !searchState.currentVisualization) return;
    
    const container = searchState.currentVisualization;
    
    switch (searchState.viewMode) {
        case 'parameter-space':
            renderParameterSpace(container);
            break;
        case 'best-result':
            renderBestResult(container);
            break;
        case 'optimization':
            renderOptimizationPath(container);
            break;
    }
}

/**
 * Render parameter space visualization
 * @param {HTMLElement} container - The container element
 */
function renderParameterSpace(container) {
    const results = searchState.results.results;
    
    // Extract data for 3D scatter plot
    const x = results.map(r => r.parameters.twist_x);
    const y = results.map(r => r.parameters.twist_y);
    const z = results.map(r => r.parameters.twist_z);
    const colors = results.map(r => r.error);
    const sizes = results.map(r => 5 + Math.max(0, (1 - r.error) * 10));
    const text = results.map(r => `Error: ${r.error.toFixed(4)}<br>X Twist: ${r.parameters.twist_x.toFixed(2)}<br>Y Twist: ${r.parameters.twist_y.toFixed(2)}<br>Z Twist: ${r.parameters.twist_z.toFixed(2)}<br>Loop Factor: ${r.parameters.loop_factor.toFixed(2)}`);
    
    // Create plot
    Plotly.react(container, [{
        x: x,
        y: y,
        z: z,
        text: text,
        hoverinfo: 'text',
        type: 'scatter3d',
        mode: 'markers',
        marker: {
            size: sizes,
            color: colors,
            colorscale: 'Viridis',
            colorbar: {
                title: 'Error',
                thickness: 20
            },
            reversescale: true,
            opacity: 0.8
        }
    }], {
        title: 'Parameter Space Exploration',
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 30,
            pad: 0
        },
        scene: {
            xaxis: {title: 'X Twist'},
            yaxis: {title: 'Y Twist'},
            zaxis: {title: 'Z Twist'}
        },
        hovermode: 'closest'
    }, {
        responsive: true
    });
}

/**
 * Render visualization of the best result found
 * @param {HTMLElement} container - The container element
 */
function renderBestResult(container) {
    const best = searchState.results.best_configuration;
    
    // Create a sub-SKB plot with best parameters
    Plotly.react(container, [{
        x: [],
        y: [],
        z: [],
        type: 'surface',
        colorscale: 'Viridis',
        showscale: false
    }], {
        title: 'Best Sub-SKB Configuration',
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 30,
            pad: 0
        },
        scene: {
            camera: {
                eye: {x: 1.5, y: 1.5, z: 1.5}
            },
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Z'}
        }
    }, {
        responsive: true
    });
    
    // Generate sub-SKB surface
    generateSubSKB(container, best.parameters);
}

/**
 * Generate a sub-SKB visualization with the given parameters
 * @param {HTMLElement} container - The plot container
 * @param {Object} params - The parameters for the sub-SKB
 */
function generateSubSKB(container, params) {
    const u = Array.from({length: 40}, (_, i) => i * 2 * Math.PI * params.loop_factor / 39);
    const v = Array.from({length: 15}, (_, i) => -0.5 + i / 14);
    
    // Generate mesh grid
    const uGrid = [];
    const vGrid = [];
    for (let j = 0; j < v.length; j++) {
        for (let i = 0; i < u.length; i++) {
            uGrid.push(u[i]);
            vGrid.push(v[j]);
        }
    }
    
    // Generate coordinates with twists
    const x = [];
    const y = [];
    const z = [];
    
    for (let i = 0; i < uGrid.length; i++) {
        const ui = uGrid[i];
        const vi = vGrid[i];
        
        // Apply multi-dimensional twists
        const xval = (1 + 0.5 * vi * Math.cos(params.twist_x * ui / 2)) * Math.cos(ui);
        const yval = (1 + 0.5 * vi * Math.cos(params.twist_y * ui / 2)) * Math.sin(ui);
        const zval = 0.5 * vi * Math.sin(params.twist_z * ui / 2);
        
        x.push(xval);
        y.push(yval);
        z.push(zval);
    }
    
    // Update the surface
    Plotly.restyle(container, {
        x: [x],
        y: [y],
        z: [z],
        type: 'mesh3d',
        opacity: 0.8,
        color: '#5271FF',
        hoverinfo: 'text',
        hovertext: `X Twist: ${params.twist_x.toFixed(2)}<br>Y Twist: ${params.twist_y.toFixed(2)}<br>Z Twist: ${params.twist_z.toFixed(2)}<br>Loop Factor: ${params.loop_factor.toFixed(2)}`
    });
}

/**
 * Render the optimization path taken during search
 * @param {HTMLElement} container - The container element
 */
function renderOptimizationPath(container) {
    const iterations = searchState.results.iterations || [];
    
    // Extract data for line plot
    const x = iterations.map((_, i) => i);
    const y = iterations.map(iter => iter.error);
    
    // Create plot
    Plotly.react(container, [{
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Error',
        line: {
            color: '#5271FF',
            width: 2
        },
        marker: {
            size: 6,
            color: '#5271FF'
        }
    }], {
        title: 'Optimization Path',
        xaxis: {
            title: 'Iteration'
        },
        yaxis: {
            title: 'Error',
            range: [0, Math.max(...y) * 1.1]
        },
        margin: {
            l: 50,
            r: 30,
            b: 50,
            t: 30,
            pad: 4
        }
    }, {
        responsive: true
    });
}

/**
 * Update the results table with search results
 * @param {Array} results - The search results 
 */
function updateResultsTable(results) {
    const tableBody = document.getElementById('results-table-body');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add new rows (top 10 only)
    results.slice(0, 10).forEach((result, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${result.parameters.twist_x.toFixed(2)}</td>
            <td>${result.parameters.twist_y.toFixed(2)}</td>
            <td>${result.parameters.twist_z.toFixed(2)}</td>
            <td>${result.parameters.loop_factor.toFixed(2)}</td>
            <td>${result.error.toFixed(4)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-result-btn" data-index="${index}">
                    View
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-result-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            viewResult(index);
        });
    });
}

/**
 * View a specific result by index
 * @param {number} index - The index of the result to view
 */
function viewResult(index) {
    if (!searchState.results || index >= searchState.results.results.length) return;
    
    // Switch to best result view
    setViewMode('best-result');
    
    // Generate visualization for this result
    const result = searchState.results.results[index];
    generateSubSKB(searchState.currentVisualization, result.parameters);
    
    // Highlight in the table
    document.querySelectorAll('#results-table-body tr').forEach((row, i) => {
        if (i === index) {
            row.classList.add('table-active');
        } else {
            row.classList.remove('table-active');
        }
    });
}

/**
 * Update best configuration display
 * @param {Object} config - The best configuration
 */
function updateBestConfiguration(config) {
    if (!config) return;
    
    // Update parameter display
    document.getElementById('best-twist-x').textContent = config.parameters.twist_x.toFixed(2);
    document.getElementById('best-twist-y').textContent = config.parameters.twist_y.toFixed(2);
    document.getElementById('best-twist-z').textContent = config.parameters.twist_z.toFixed(2);
    document.getElementById('best-loop-factor').textContent = config.parameters.loop_factor.toFixed(2);
    document.getElementById('best-error').textContent = config.error.toFixed(4);
    
    // Calculate twist sum
    const twistSum = config.parameters.twist_x + config.parameters.twist_y + config.parameters.twist_z;
    document.getElementById('best-twist-sum').textContent = twistSum.toFixed(2);
}

/**
 * Export results as JSON
 */
function exportResults() {
    if (!searchState.results) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(searchState.results, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "sub_skb_search_results.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

/**
 * Show an error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    const alertElement = createAlert(message, 'danger');
    insertAlert(alertElement);
}

/**
 * Show a success message to the user
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
    const alertElement = createAlert(message, 'success');
    insertAlert(alertElement);
}

/**
 * Create an alert element
 * @param {string} message - The message to display
 * @param {string} type - The alert type (success, danger, warning, info)
 * @returns {HTMLElement} The alert element
 */
function createAlert(message, type) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertElement.setAttribute('role', 'alert');
    
    // Add close button
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    return alertElement;
}

/**
 * Insert an alert at the top of the page
 * @param {HTMLElement} alertElement - The alert element to insert
 */
function insertAlert(alertElement) {
    // Insert at the top of the main content area
    const mainContent = document.querySelector('.container-fluid');
    if (mainContent && mainContent.firstChild) {
        mainContent.insertBefore(alertElement, mainContent.firstChild);
    } else {
        // Fallback: append to body
        document.body.appendChild(alertElement);
    }
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
        }
    }, 10000);
}

/**
 * Run iterative search with theoretical targets
 */
function runIterativeSearch() {
    if (searchState.isRunning) return;
    searchState.isRunning = true;
    
    // Show loading state
    const container = document.getElementById('search-visualization');
    if (container) {
        container.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="ms-3">Running iterative search across particle targets...</p></div>';
    }
    
    // Collect parameter data
    const parameterSpace = collectParameterSpace();
    const targetType = document.getElementById('target-type').value || 'all';
    const maxTargets = parseInt(document.getElementById('max-targets').value || 5);
    const optimizeEach = document.getElementById('optimize-each').checked;
    
    // Validate parameter space
    if (Object.keys(parameterSpace).length === 0) {
        showError("Parameter space is empty. Please configure search parameters.");
        searchState.isRunning = false;
        return;
    }
    
    // Calculate potential parameter combinations
    let combinationCount = 1;
    Object.values(parameterSpace).forEach(param => {
        combinationCount *= param.steps;
    });
    
    // Warn user if combinations are excessive
    if (combinationCount * (maxTargets > 1 ? maxTargets : 1) > 1000) {
        const confirmContinue = confirm(`This search will evaluate up to ${combinationCount * maxTargets} parameter combinations, which may take some time. Continue?`);
        if (!confirmContinue) {
            if (container) {
                container.innerHTML = '<div class="d-flex flex-column justify-content-center align-items-center h-100"><p class="text-muted mb-4">Search cancelled. Consider reducing parameter steps or max targets for faster results.</p><i class="fas fa-search fa-5x text-muted mb-4"></i></div>';
            }
            searchState.isRunning = false;
            return;
        }
    }
    
    console.log("Sending iterative search request with parameters:", {
        parameterSpace, 
        targetType, 
        maxTargets, 
        optimizeEach
    });
    
    // Send to backend
    fetch('/evolution/iterative_search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            parameter_space: parameterSpace,
            target_type: targetType,
            max_targets: maxTargets,
            optimize_each: optimizeEach
        })
    })
    .then(response => {
        console.log("Received response with status:", response.status);
        
        if (!response.ok) {
            // Try to get the error message from the response
            return response.json().then(data => {
                throw new Error(data.error || 'Network response was not ok');
            }).catch(err => {
                // If we can't parse the JSON, throw the original error
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Received iterative search data:", data);
        
        // Check if the response contains an error
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Store results
        searchState.iterativeResults = data;
        
        // Update visualization
        updateIterativeVisualization();
        
        // Update target table
        updateTargetTable(data.results);
        
        // Show success message
        showSuccess(`Iterative search complete! Evaluated ${data.combinations_evaluated} combinations across ${data.total_targets} theoretical targets.`);
        
        searchState.isRunning = false;
    })
    .catch(error => {
        console.error('Error running iterative search:', error);
        showError(`Error running iterative search: ${error.message}`);
        searchState.isRunning = false;
        
        // Reset the visualization container to initial state
        if (container) {
            container.innerHTML = '<div class="d-flex flex-column justify-content-center align-items-center h-100"><p class="text-danger mb-4">Iterative search failed. Please try again with different parameters.</p><i class="fas fa-exclamation-triangle fa-5x text-danger mb-4"></i></div>';
        }
    });
}

/**
 * Update visualization for iterative search results
 */
function updateIterativeVisualization() {
    if (!searchState.iterativeResults) return;
    
    const container = document.getElementById('search-visualization');
    if (!container) return;
    
    // Create a multi-panel visualization for the targets
    const results = searchState.iterativeResults.results;
    
    if (results.length === 0) {
        container.innerHTML = '<div class="d-flex flex-column justify-content-center align-items-center h-100"><p class="text-muted mb-4">No results found for the selected targets.</p><i class="fas fa-search fa-5x text-muted mb-4"></i></div>';
        return;
    }
    
    // Generate a scatter plot with all targets and their best configurations
    createIterativeScatterPlot(container, results);
}

/**
 * Create a scatter plot showing all target values and the best configurations
 * @param {HTMLElement} container - The container for the plot
 * @param {Array} results - The iterative search results
 */
function createIterativeScatterPlot(container, results) {
    // Extract data for the scatter plot
    const targetTwists = [];
    const targetLoops = [];
    const actualTwists = [];
    const actualLoops = [];
    const errors = [];
    const descriptions = [];
    
    // Different colors for different particle types
    const colors = [];
    const colorMap = {
        'up': '#ff7f0e',      // orange for up-type quarks
        'down': '#1f77b4',    // blue for down-type quarks
        'electron': '#2ca02c', // green for electrons
        'muon': '#d62728',    // red for muons
        'tau': '#9467bd',     // purple for taus
        'neutrino': '#8c564b' // brown for neutrinos
    };
    
    results.forEach(result => {
        const target = result.target;
        const config = result.best_configuration;
        
        if (target && config) {
            // Target values
            targetTwists.push(target.twist_sum);
            targetLoops.push(target.loop_factor);
            
            // Actual values from best configuration
            const params = config.parameters;
            const twistSum = params.twist_x + params.twist_y + params.twist_z;
            actualTwists.push(twistSum);
            actualLoops.push(params.loop_factor);
            
            // Error and description
            errors.push(config.error);
            descriptions.push(target.theoretical_basis || 'No description available');
            
            // Color based on description
            let color = '#7f7f7f'; // default gray
            for (const [particleType, particleColor] of Object.entries(colorMap)) {
                if (target.theoretical_basis && target.theoretical_basis.includes(particleType)) {
                    color = particleColor;
                    break;
                }
            }
            colors.push(color);
        }
    });
    
    // Create plot data arrays
    const data = [
        // Target points
        {
            x: targetTwists,
            y: targetLoops,
            mode: 'markers',
            type: 'scatter',
            name: 'Target Values',
            marker: {
                size: 12,
                symbol: 'circle-open',
                line: {
                    width: 2,
                    color: colors
                },
                color: colors
            },
            hoverinfo: 'text',
            hovertext: descriptions.map((desc, i) => `Target: Twist=${targetTwists[i]}, Loop=${targetLoops[i]}<br>${desc}`)
        },
        // Best configuration points
        {
            x: actualTwists,
            y: actualLoops,
            mode: 'markers',
            type: 'scatter',
            name: 'Best Configurations',
            marker: {
                size: 8,
                symbol: 'circle',
                color: colors,
                opacity: 0.7
            },
            hoverinfo: 'text',
            hovertext: descriptions.map((desc, i) => 
                `Best Configuration: Twist=${actualTwists[i].toFixed(2)}, Loop=${actualLoops[i].toFixed(2)}<br>Error: ${errors[i].toFixed(4)}<br>${desc}`)
        },
        // Connect target to actual
        {
            x: targetTwists.flatMap((t, i) => [t, actualTwists[i], null]),
            y: targetLoops.flatMap((l, i) => [l, actualLoops[i], null]),
            mode: 'lines',
            type: 'scatter',
            name: 'Target-Actual Connections',
            line: {
                color: 'rgba(0,0,0,0.2)',
                width: 1,
                dash: 'dot'
            },
            hoverinfo: 'none',
            showlegend: false
        }
    ];
    
    // Plot layout
    const layout = {
        title: 'Iterative Search Results - Targets vs. Best Configurations',
        xaxis: {
            title: 'Twist Sum (correlates with charge)',
            zeroline: true,
            showgrid: true,
            range: [Math.min(...targetTwists, ...actualTwists) - 0.5, 
                   Math.max(...targetTwists, ...actualTwists) + 0.5]
        },
        yaxis: {
            title: 'Loop Factor (correlates with generation)',
            zeroline: true,
            showgrid: true,
            range: [Math.min(...targetLoops, ...actualLoops) - 0.5, 
                   Math.max(...targetLoops, ...actualLoops) + 0.5]
        },
        hovermode: 'closest',
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            orientation: 'h'
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 50
        },
        annotations: [
            {
                x: -1,
                y: 1,
                xref: 'paper',
                yref: 'paper',
                text: 'Lepton<br>Region',
                showarrow: false,
                font: {
                    color: '#2ca02c'
                }
            },
            {
                x: 0.33,
                y: 1,
                xref: 'paper',
                yref: 'paper',
                text: 'Down-type<br>Quark Region',
                showarrow: false,
                font: {
                    color: '#1f77b4'
                }
            },
            {
                x: 0.67,
                y: 1,
                xref: 'paper',
                yref: 'paper',
                text: 'Up-type<br>Quark Region',
                showarrow: false,
                font: {
                    color: '#ff7f0e'
                }
            }
        ]
    };
    
    // Add standard model lines
    const standardModelLines = [
        // Charge -1 (electron, muon, tau)
        {
            x: [-1, -1],
            y: [0, 3.5],
            mode: 'lines',
            type: 'scatter',
            name: 'Charge -1 (leptons)',
            line: {
                color: '#2ca02c',
                width: 1,
                dash: 'dash'
            },
            hoverinfo: 'text',
            hovertext: 'Charged Lepton Line: Charge = -1'
        },
        // Charge -1/3 (down, strange, bottom)
        {
            x: [-1/3, -1/3],
            y: [0, 3.5],
            mode: 'lines',
            type: 'scatter',
            name: 'Charge -1/3 (d-type quarks)',
            line: {
                color: '#1f77b4',
                width: 1,
                dash: 'dash'
            },
            hoverinfo: 'text',
            hovertext: 'Down-type Quark Line: Charge = -1/3'
        },
        // Charge 2/3 (up, charm, top)
        {
            x: [2/3, 2/3],
            y: [0, 3.5],
            mode: 'lines',
            type: 'scatter',
            name: 'Charge 2/3 (u-type quarks)',
            line: {
                color: '#ff7f0e',
                width: 1,
                dash: 'dash'
            },
            hoverinfo: 'text',
            hovertext: 'Up-type Quark Line: Charge = 2/3'
        },
        // Charge 0 (neutrinos)
        {
            x: [0, 0],
            y: [0, 3.5],
            mode: 'lines',
            type: 'scatter',
            name: 'Charge 0 (neutrinos)',
            line: {
                color: '#8c564b',
                width: 1,
                dash: 'dash'
            },
            hoverinfo: 'text',
            hovertext: 'Neutrino Line: Charge = 0'
        },
        // Generation lines
        {
            x: [-1.5, 1.5],
            y: [1, 1],
            mode: 'lines',
            type: 'scatter',
            name: '1st Generation',
            line: {
                color: 'rgba(0,0,0,0.2)',
                width: 1,
                dash: 'dot'
            },
            hoverinfo: 'text',
            hovertext: '1st Generation'
        },
        {
            x: [-1.5, 1.5],
            y: [2, 2],
            mode: 'lines',
            type: 'scatter',
            name: '2nd Generation',
            line: {
                color: 'rgba(0,0,0,0.2)',
                width: 1,
                dash: 'dot'
            },
            hoverinfo: 'text',
            hovertext: '2nd Generation'
        },
        {
            x: [-1.5, 1.5],
            y: [3, 3],
            mode: 'lines',
            type: 'scatter',
            name: '3rd Generation',
            line: {
                color: 'rgba(0,0,0,0.2)',
                width: 1,
                dash: 'dot'
            },
            hoverinfo: 'text',
            hovertext: '3rd Generation'
        }
    ];
    
    // Create the plot
    Plotly.newPlot(container, [...standardModelLines, ...data], layout, {responsive: true});
    
    // Handle click events to display details
    container.on('plotly_click', function(data) {
        const point = data.points[0];
        const pointIndex = point.pointIndex;
        
        // Only handle clicks on the target or best configuration points
        if (point.data.name === 'Target Values' || point.data.name === 'Best Configurations') {
            displayTargetDetails(results[pointIndex]);
        }
    });
}

/**
 * Display detailed information for a selected target
 * @param {Object} targetResult - The selected target result
 */
function displayTargetDetails(targetResult) {
    if (!targetResult) return;
    
    // Create or get the details panel
    let detailsPanel = document.getElementById('target-details-panel');
    if (!detailsPanel) {
        // Create the panel
        detailsPanel = document.createElement('div');
        detailsPanel.id = 'target-details-panel';
        detailsPanel.className = 'card mt-3';
        
        // Find where to insert
        const container = document.getElementById('search-visualization');
        if (container && container.parentNode) {
            container.parentNode.parentNode.appendChild(detailsPanel);
        }
    }
    
    // Get target and configuration
    const target = targetResult.target;
    const config = targetResult.best_configuration;
    
    // Prepare HTML for panel
    detailsPanel.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Target Details: ${target.theoretical_basis}</h5>
            <button type="button" class="btn-close" aria-label="Close" id="close-details-btn"></button>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <h6>Target Properties</h6>
                    <table class="table table-sm">
                        <tbody>
                            <tr>
                                <th>Twist Sum:</th>
                                <td>${target.twist_sum}</td>
                            </tr>
                            <tr>
                                <th>Loop Factor:</th>
                                <td>${target.loop_factor}</td>
                            </tr>
                            <tr>
                                <th>Physical Interpretation:</th>
                                <td>${target.theoretical_basis}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Best Configuration</h6>
                    <table class="table table-sm">
                        <tbody>
                            <tr>
                                <th>X Twist:</th>
                                <td>${config.parameters.twist_x.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th>Y Twist:</th>
                                <td>${config.parameters.twist_y.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th>Z Twist:</th>
                                <td>${config.parameters.twist_z.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th>Loop Factor:</th>
                                <td>${config.parameters.loop_factor.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th>Actual Twist Sum:</th>
                                <td>${(config.parameters.twist_x + config.parameters.twist_y + config.parameters.twist_z).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th>Error:</th>
                                <td>${config.error.toFixed(4)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Sub-SKB Visualization</h6>
                    <div id="target-skb-viz" style="height: 300px;"></div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener for close button
    document.getElementById('close-details-btn').addEventListener('click', function() {
        detailsPanel.style.display = 'none';
    });
    
    // Create Sub-SKB visualization
    if (config.sub_skb_data && config.sub_skb_data.x && config.sub_skb_data.x.length > 0) {
        const vizContainer = document.getElementById('target-skb-viz');
        if (vizContainer) {
            Plotly.newPlot(vizContainer, [{
                x: config.sub_skb_data.x.flat(),
                y: config.sub_skb_data.y.flat(),
                z: config.sub_skb_data.z.flat(),
                type: 'mesh3d',
                opacity: 0.8,
                color: getParticleColor(target.theoretical_basis),
                hoverinfo: 'text',
                hovertext: `X Twist: ${config.parameters.twist_x.toFixed(2)}<br>Y Twist: ${config.parameters.twist_y.toFixed(2)}<br>Z Twist: ${config.parameters.twist_z.toFixed(2)}<br>Loop Factor: ${config.parameters.loop_factor.toFixed(2)}`
            }], {
                title: `Sub-SKB Configuration`,
                margin: {
                    l: 0,
                    r: 0,
                    b: 0,
                    t: 30,
                    pad: 0
                },
                scene: {
                    camera: {
                        eye: {x: 1.5, y: 1.5, z: 1.5}
                    },
                    xaxis: {title: 'X'},
                    yaxis: {title: 'Y'},
                    zaxis: {title: 'Z'}
                }
            }, {responsive: true});
        }
    }
}

/**
 * Get color based on particle description
 * @param {string} description - The particle description
 * @returns {string} - Color code
 */
function getParticleColor(description) {
    if (!description) return '#7f7f7f'; // default gray
    
    if (description.includes('up') || description.includes('charm') || description.includes('top')) {
        return '#ff7f0e'; // orange for up-type quarks
    } else if (description.includes('down') || description.includes('strange') || description.includes('bottom')) {
        return '#1f77b4'; // blue for down-type quarks
    } else if (description.includes('electron')) {
        return '#2ca02c'; // green
    } else if (description.includes('muon')) {
        return '#d62728'; // red
    } else if (description.includes('tau')) {
        return '#9467bd'; // purple
    } else if (description.includes('neutrino')) {
        return '#8c564b'; // brown
    }
    
    return '#7f7f7f'; // default gray
}

/**
 * Update the target table with the results
 * @param {Array} results - The search results
 */
function updateTargetTable(results) {
    const tableBody = document.getElementById('target-table-body');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add new rows
    results.forEach((result, index) => {
        const target = result.target;
        const config = result.best_configuration;
        
        if (target && config) {
            const row = document.createElement('tr');
            
            // Calculate actual twist sum
            const actualTwistSum = (
                config.parameters.twist_x + 
                config.parameters.twist_y + 
                config.parameters.twist_z
            ).toFixed(2);
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${target.twist_sum}</td>
                <td>${target.loop_factor}</td>
                <td>${actualTwistSum}</td>
                <td>${config.parameters.loop_factor.toFixed(2)}</td>
                <td>${config.error.toFixed(4)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-target-btn" data-index="${index}">
                        View
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        }
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-target-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            displayTargetDetails(searchState.iterativeResults.results[index]);
        });
    });
}

/**
 * Export iterative search results as JSON
 */
function exportIterativeResults() {
    if (!searchState.iterativeResults) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(searchState.iterativeResults, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "skb_iterative_search_results.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
} 