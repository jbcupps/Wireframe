/**
 * methodical_search_visualizations.js
 * Custom Plotly visualization functions for the Methodical Search feature
 */

// Global visualization state
const visualizationState = {
    currentData: null,
    currentPlot: null,
    currentType: 'scatter',
    isInitialized: false,
    windowWidth: window.innerWidth
};

/**
 * Initialize the methodical search functionality
 * This should be called when the page loads
 */
function initMethodicalSearch() {
    console.log('Initializing Methodical Search visualization components');
    
    // Create an empty visualization to start
    createScatterPlot('visualization');
    
    // Initialize responsive behavior
    setupResponsiveHandling();
    
    // Initialize UI controls
    setupUIControls();
    
    visualizationState.isInitialized = true;
}

/**
 * Setup responsive handling for visualizations
 */
function setupResponsiveHandling() {
    // Handle window resize events
    window.addEventListener('resize', debounce(function() {
        const newWidth = window.innerWidth;
        
        // Only redraw if width changed significantly (prevents multiple redraws)
        if (Math.abs(newWidth - visualizationState.windowWidth) > 50) {
            visualizationState.windowWidth = newWidth;
            
            if (visualizationState.currentData && visualizationState.currentPlot) {
                console.log('Redrawing visualization due to window resize');
                
                // Redraw the current visualization with the current type
                if (visualizationState.currentType === 'scatter') {
                    createScatterPlot('visualization', visualizationState.currentData);
                } else if (visualizationState.currentType === 'surface') {
                    createSurfacePlot('visualization', visualizationState.currentData);
                } else if (visualizationState.currentType === 'parallel') {
                    createParallelCoordinatesPlot('visualization', visualizationState.currentData);
                }
            }
        }
    }, 250));
}

/**
 * Setup UI controls for the methodical search page
 */
function setupUIControls() {
    // Setup visualization type selector
    const visTypeSelect = document.getElementById('visualization-type');
    if (visTypeSelect) {
        visTypeSelect.addEventListener('change', function() {
            const selectedType = this.value;
            visualizationState.currentType = selectedType;
            
            if (visualizationState.currentData) {
                if (selectedType === 'scatter') {
                    createScatterPlot('visualization', visualizationState.currentData);
                } else if (selectedType === 'surface') {
                    createSurfacePlot('visualization', visualizationState.currentData);
                } else if (selectedType === 'parallel') {
                    createParallelCoordinatesPlot('visualization', visualizationState.currentData);
                }
            }
        });
    }
    
    // Setup parameter input ranges and their displays
    setupRangeInputs();
    
    // Setup search button behavior
    const searchButton = document.getElementById('run-search');
    if (searchButton) {
        searchButton.addEventListener('click', handleSearchButtonClick);
    }
    
    // Setup parameter generation button
    const generateParamsButton = document.getElementById('generate-params');
    if (generateParamsButton) {
        generateParamsButton.addEventListener('click', handleGenerateParamsClick);
    }
    
    // Setup particle selector
    const particleSelect = document.getElementById('particle-select');
    if (particleSelect) {
        particleSelect.addEventListener('change', handleParticleChange);
    }
}

/**
 * Setup range input elements and their value displays
 */
function setupRangeInputs() {
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    
    rangeInputs.forEach(input => {
        const valueDisplayId = input.id + '-value';
        const valueDisplay = document.getElementById(valueDisplayId);
        
        if (valueDisplay) {
            // Set initial value
            valueDisplay.textContent = input.value;
            
            // Update value on input change
            input.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
            });
        }
    });
}

/**
 * Handle particle selection change
 */
function handleParticleChange() {
    const particleSelect = document.getElementById('particle-select');
    const selectedParticle = particleSelect.value;
    
    // Update the UI with the selected particle data
    updateParticleInfo(selectedParticle);
}

/**
 * Handle generate parameters button click
 */
function handleGenerateParamsClick() {
    const paramData = collectParameterData();
    
    // Show loading indicator
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // API call to generate parameter space
    fetch('/api/methodical-search/generate-params', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(paramData)
    })
    .then(response => response.json())
    .then(data => {
        // Update UI with parameter space information
        document.getElementById('combo-count').textContent = data.combination_count;
        document.getElementById('computation-time').textContent = data.estimated_time;
    })
    .catch(error => {
        console.error('Error generating parameter space:', error);
    })
    .finally(() => {
        // Hide loading indicator
        document.getElementById('loading-overlay').style.display = 'none';
    });
}

/**
 * Handle search button click
 */
function handleSearchButtonClick() {
    const particleSelect = document.getElementById('particle-select');
    const distanceMetric = document.getElementById('distance-metric');
    
    const requestData = {
        particle: particleSelect.value,
        metric: distanceMetric.value,
        params: collectParameterData()
    };
    
    // Show loading indicator
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Run the search
    fetch('/api/methodical-search/run', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        // Save current data for reuse
        visualizationState.currentData = data.visualization_data;
        
        // Update visualization based on current type
        if (visualizationState.currentType === 'scatter') {
            createScatterPlot('visualization', data.visualization_data);
        } else if (visualizationState.currentType === 'surface') {
            createSurfacePlot('visualization', data.visualization_data);
        } else if (visualizationState.currentType === 'parallel') {
            createParallelCoordinatesPlot('visualization', data.visualization_data);
        }
        
        // Update results table
        updateResultsTable(data.results);
    })
    .catch(error => {
        console.error('Error running search:', error);
    })
    .finally(() => {
        // Hide loading indicator
        document.getElementById('loading-overlay').style.display = 'none';
    });
}

/**
 * Collect parameter data from UI inputs
 * @returns {Object} Parameter data object
 */
function collectParameterData() {
    return {
        twist_min: parseFloat(document.getElementById('twist-min').value),
        twist_max: parseFloat(document.getElementById('twist-max').value),
        twist_step: parseFloat(document.getElementById('twist-step').value),
        link_min: parseInt(document.getElementById('link-min').value),
        link_max: parseInt(document.getElementById('link-max').value),
        link_step: parseInt(document.getElementById('link-step').value),
        charge_scale: parseFloat(document.getElementById('charge-scale').value),
        base_mass: parseFloat(document.getElementById('base-mass').value),
        energy_scale: parseFloat(document.getElementById('energy-scale').value)
    };
}

/**
 * Update the particle information in the UI
 * @param {string} particleName - The name of the selected particle
 */
function updateParticleInfo(particleName) {
    fetch(`/api/particles/${particleName}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('target-mass').textContent = `${data.mass_mev} MeV`;
            document.getElementById('target-charge').textContent = data.charge;
            document.getElementById('target-structure').textContent = data.structure;
            
            // Update manifold structure
            const structureElement = document.getElementById('manifold-structure');
            structureElement.innerHTML = '';
            
            data.sub_skbs.forEach((subSkb, index) => {
                const div = document.createElement('div');
                div.innerHTML = `<strong>Sub-SKB ${index + 1}:</strong> ${subSkb}`;
                structureElement.appendChild(div);
            });
        })
        .catch(error => {
            console.error('Error fetching particle data:', error);
        });
}

/**
 * Update the results table with search results
 * @param {Array} results - The search results
 */
function updateResultsTable(results) {
    const tableBody = document.getElementById('results-table-body');
    tableBody.innerHTML = '';
    
    results.forEach((result, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${result.twist}</td>
            <td>${result.link}</td>
            <td>${result.calculated_charge.toFixed(2)}</td>
            <td>${result.calculated_mass.toFixed(1)}</td>
            <td>${(result.error * 100).toFixed(2)}%</td>
            <td>
                <button class="btn btn-outline highlight-btn" data-index="${index}">
                    <i class="fas fa-crosshairs"></i>
                </button>
            </td>
        `;
        
        // Highlight first row as the best match
        if (index === 0) {
            row.classList.add('active-row');
        }
        
        tableBody.appendChild(row);
    });
    
    // Add highlight button event listeners
    document.querySelectorAll('.highlight-btn').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            highlightResult(index);
        });
    });
}

/**
 * Highlight a specific result in the visualization
 * @param {number} index - The index of the result to highlight
 */
function highlightResult(index) {
    // Highlight row in table
    document.querySelectorAll('#results-table-body tr').forEach((row, i) => {
        if (i === index) {
            row.classList.add('active-row');
        } else {
            row.classList.remove('active-row');
        }
    });
    
    // Highlight point in visualization if needed
    // Implementation depends on the visualization type
}

/**
 * Utility function for debouncing
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Create a scatter plot visualization
 * @param {string} elementId - DOM element ID for the visualization
 * @param {Object} data - Visualization data
 */
function createScatterPlot(elementId, data) {
    try {
        console.log(`Creating scatter plot for ${elementId} with data:`, data ? 'custom data' : 'default data');
        
        // Default data if not provided
        const plotData = data || {
            x: [1, 0.5, 1.5, 0, 2, -0.5, 1, 0.5, -1, -1.5],
            y: [3, 2, 3, 2, 4, 2, 1, 0, 1, 3],
            z: [0.029, 0.614, 0.738, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0],
            sizes: [30, 25, 25, 15, 15, 10, 10, 10, 10, 10],
            colors: [
                'rgba(98, 0, 238, 0.9)', 
                'rgba(98, 0, 238, 0.8)',
                'rgba(98, 0, 238, 0.7)', 
                'rgba(98, 0, 238, 0.6)',
                'rgba(98, 0, 238, 0.5)',
                'rgba(98, 0, 238, 0.4)',
                'rgba(98, 0, 238, 0.4)',
                'rgba(98, 0, 238, 0.3)',
                'rgba(98, 0, 238, 0.3)',
                'rgba(98, 0, 238, 0.2)'
            ],
            text: [
                'Twist: 1.0, Link: 3<br>Charge: 1.00, Mass: 938.0 MeV<br>Error: 0.03%',
                'Twist: 0.5, Link: 2<br>Charge: 1.00, Mass: 932.5 MeV<br>Error: 0.61%',
                'Twist: 1.5, Link: 3<br>Charge: 1.00, Mass: 945.2 MeV<br>Error: 0.74%',
                'Twist: 0.0, Link: 2<br>Charge: 0.00, Mass: 900.0 MeV<br>Error: 1.20%',
                'Twist: 2.0, Link: 4<br>Charge: 2.00, Mass: 1000.0 MeV<br>Error: 1.50%',
                'Twist: -0.5, Link: 2<br>Charge: -0.50, Mass: 832.5 MeV<br>Error: 1.80%',
                'Twist: 1.0, Link: 1<br>Charge: 1.00, Mass: 738.0 MeV<br>Error: 2.10%',
                'Twist: 0.5, Link: 0<br>Charge: 0.50, Mass: 638.0 MeV<br>Error: 2.40%',
                'Twist: -1.0, Link: 1<br>Charge: -1.00, Mass: 738.0 MeV<br>Error: 2.70%',
                'Twist: -1.5, Link: 3<br>Charge: -1.50, Mass: 938.0 MeV<br>Error: 3.00%'
            ],
            particle: 'Proton'
        };

        // Create the scatter plot
        const plotlyData = [{
            x: plotData.x,
            y: plotData.y,
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: plotData.sizes,
                color: plotData.colors,
                line: {
                    color: 'rgba(3, 218, 198, 1)',
                    width: 2
                }
            },
            text: plotData.text,
            hoverinfo: 'text'
        }];

        // Plot layout with our design system
        const layout = {
            title: {
                text: 'Configuration Search Results',
                font: {
                    color: 'rgba(255, 255, 255, 0.87)',
                    size: 18
                }
            },
            xaxis: {
                title: {
                    text: 'Twist Number',
                    font: {
                        color: 'rgba(255, 255, 255, 0.87)',
                        size: 14
                    }
                },
                gridcolor: 'rgba(80, 80, 80, 0.2)',
                zerolinecolor: 'rgba(80, 80, 80, 0.5)',
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.6)'
                }
            },
            yaxis: {
                title: {
                    text: 'Linking Number',
                    font: {
                        color: 'rgba(255, 255, 255, 0.87)',
                        size: 14
                    }
                },
                gridcolor: 'rgba(80, 80, 80, 0.2)',
                zerolinecolor: 'rgba(80, 80, 80, 0.5)',
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.6)'
                }
            },
            plot_bgcolor: 'rgba(30, 30, 30, 1)',
            paper_bgcolor: 'rgba(30, 30, 30, 0)',
            font: {
                color: 'rgba(255, 255, 255, 0.6)'
            },
            margin: {
                l: 60,
                r: 30,
                t: 60,
                b: 60,
                pad: 10
            },
            autosize: true,
            hovermode: 'closest',
            showlegend: false
        };

        // Plot configuration
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d', 'resetScale2d'],
            displaylogo: false
        };

        // Get the element and make sure it exists
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with ID "${elementId}" not found.`);
            return;
        }

        // Make sure Plotly is available
        if (typeof Plotly === 'undefined') {
            console.error('Plotly library not found. Make sure it is loaded before calling this function.');
            return;
        }

        // Create the plot
        Plotly.newPlot(elementId, plotlyData, layout, config);
        console.log(`Scatter plot created successfully for ${elementId}`);
    } catch (error) {
        console.error('Error creating scatter plot:', error);
        // Display error message in the visualization container
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="error-message">Error creating visualization: ${error.message}</div>`;
        }
    }
}

/**
 * Create a surface plot visualization
 * @param {string} elementId - DOM element ID for the visualization
 * @param {Object} data - Visualization data
 */
function createSurfacePlot(elementId, data) {
    // If we don't have data, create dummy data
    if (!data) {
        // Create a grid of data
        const xValues = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
        const yValues = [-3, -2, -1, 0, 1, 2, 3, 4];
        
        // Create z-values (error %) as a function of x and y
        const zValues = [];
        for (let i = 0; i < yValues.length; i++) {
            const zRow = [];
            for (let j = 0; j < xValues.length; j++) {
                // Simulate error function with minimum near (1, 3)
                const x = xValues[j];
                const y = yValues[i];
                const error = Math.sqrt((x - 1) * (x - 1) + (y - 3) * (y - 3)) + 0.5 + Math.random() * 0.5;
                zRow.push(error);
            }
            zValues.push(zRow);
        }
        
        data = {
            x: xValues,
            y: yValues,
            z: zValues
        };
    }

    // Create the surface plot
    const plotlyData = [{
        z: data.z,
        x: data.x,
        y: data.y,
        type: 'surface',
        colorscale: [
            [0, 'rgba(3, 218, 198, 1)'],
            [0.5, 'rgba(50, 109, 168, 1)'],
            [1, 'rgba(98, 0, 238, 1)']
        ],
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: "rgba(255,255,255,0.5)",
                project: { z: true }
            }
        },
        showscale: true,
        colorbar: {
            title: {
                text: 'Error (%)',
                font: {
                    color: 'rgba(255, 255, 255, 0.87)',
                    size: 12
                }
            },
            tickfont: {
                color: 'rgba(255, 255, 255, 0.6)'
            }
        }
    }];

    // Plot layout with our design system
    const layout = {
        title: {
            text: '3D Error Surface',
            font: {
                color: 'rgba(255, 255, 255, 0.87)',
                size: 18
            }
        },
        scene: {
            xaxis: {
                title: {
                    text: 'Twist Number',
                    font: {
                        color: 'rgba(255, 255, 255, 0.87)',
                        size: 12
                    }
                },
                gridcolor: 'rgba(80, 80, 80, 0.2)',
                zerolinecolor: 'rgba(80, 80, 80, 0.5)',
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.6)'
                }
            },
            yaxis: {
                title: {
                    text: 'Linking Number',
                    font: {
                        color: 'rgba(255, 255, 255, 0.87)',
                        size: 12
                    }
                },
                gridcolor: 'rgba(80, 80, 80, 0.2)',
                zerolinecolor: 'rgba(80, 80, 80, 0.5)',
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.6)'
                }
            },
            zaxis: {
                title: {
                    text: 'Error (%)',
                    font: {
                        color: 'rgba(255, 255, 255, 0.87)',
                        size: 12
                    }
                },
                gridcolor: 'rgba(80, 80, 80, 0.2)',
                zerolinecolor: 'rgba(80, 80, 80, 0.5)',
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.6)'
                }
            },
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1 }
            },
            bgcolor: 'rgba(30, 30, 30, 1)'
        },
        paper_bgcolor: 'rgba(30, 30, 30, 0)',
        font: {
            color: 'rgba(255, 255, 255, 0.87)'
        },
        margin: {
            l: 0,
            r: 0,
            t: 50,
            b: 0,
            pad: 0
        },
        hoverlabel: {
            bgcolor: 'rgba(50, 50, 50, 0.9)',
            bordercolor: 'rgba(3, 218, 198, 1)',
            font: {
                color: 'rgba(255, 255, 255, 0.9)'
            }
        }
    };

    // Plot configuration
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['toImage', 'resetCameraLastSave'],
        displaylogo: false
    };

    // Create the plot
    Plotly.newPlot(elementId, plotlyData, layout, config);
}

/**
 * Create a parallel coordinates plot
 * @param {string} elementId - DOM element ID for the visualization
 * @param {Object} data - Visualization data
 */
function createParallelCoordinatesPlot(elementId, data) {
    // Default data if not provided
    const plotData = data || {
        x: [1, 0.5, 1.5, 0, 2, -0.5, 1, 0.5, -1, -1.5],
        y: [3, 2, 3, 2, 4, 2, 1, 0, 1, 3],
        z: [0.029, 0.614, 0.738, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0]
    };

    // Create extended data including calculated charge and mass
    const extendedData = {
        twist: plotData.x,
        link: plotData.y,
        error: plotData.z,
        charge: plotData.x.map(x => x * 0.33),  // Simulate charge calculation
        mass: plotData.y.map((y, i) => 700 + y * 100 - Math.abs(plotData.x[i] - 1) * 50)  // Simulate mass calculation
    };

    // Create the parallel coordinates plot
    const plotlyData = [{
        type: 'parcoords',
        line: {
            color: extendedData.error,
            colorscale: [
                [0, 'rgba(3, 218, 198, 1)'],
                [0.5, 'rgba(50, 109, 168, 1)'],
                [1, 'rgba(98, 0, 238, 1)']
            ],
            showscale: true,
            reversescale: true,
            colorbar: {
                title: {
                    text: 'Error (%)',
                    font: {
                        color: 'rgba(255, 255, 255, 0.87)',
                        size: 12
                    }
                },
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.6)'
                }
            }
        },
        dimensions: [
            {
                label: 'Twist',
                values: extendedData.twist,
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.8)'
                }
            },
            {
                label: 'Linking',
                values: extendedData.link,
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.8)'
                }
            },
            {
                label: 'Charge',
                values: extendedData.charge,
                tickformat: '.2f',
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.8)'
                }
            },
            {
                label: 'Mass (MeV)',
                values: extendedData.mass,
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.8)'
                }
            },
            {
                label: 'Error (%)',
                values: extendedData.error.map(e => e * 100),
                tickformat: '.2f',
                tickfont: {
                    color: 'rgba(255, 255, 255, 0.8)'
                }
            }
        ]
    }];

    // Plot layout with our design system
    const layout = {
        title: {
            text: 'Parallel Coordinates View',
            font: {
                color: 'rgba(255, 255, 255, 0.87)',
                size: 18
            }
        },
        paper_bgcolor: 'rgba(30, 30, 30, 0)',
        plot_bgcolor: 'rgba(30, 30, 30, 1)',
        font: {
            color: 'rgba(255, 255, 255, 0.87)'
        },
        margin: {
            l: 80,
            r: 80,
            t: 60,
            b: 40
        }
    };

    // Plot configuration
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d'],
        displaylogo: false
    };

    // Create the plot
    Plotly.newPlot(elementId, plotlyData, layout, config);
} 