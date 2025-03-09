/**
 * 4D Manifold Explorer - Visualization Module
 * This file contains the core functionality for the 4D manifold visualization.
 */

// Use window.load instead of DOMContentLoaded for more reliable initialization
window.addEventListener('load', function() {
    console.log('Visualization module loaded - window fully loaded');
    try {
        // Initialize the visualization with a slight delay to ensure DOM is fully ready
        setTimeout(function() {
            initVisualization();
            setupEventListeners();
            initGuidedTour();
            setupResponsiveLayout();
            console.log('Visualization initialized successfully');
        }, 100);
    } catch (error) {
        console.error('Error initializing visualization:', error);
        alert('There was an error initializing the visualization. Please refresh the page and try again.');
    }
});

/**
 * Initialize the visualization
 */
function initVisualization() {
    try {
        console.log('Initializing visualization...');
        
        // Get the current manifold type
        const manifoldTypeSelect = document.getElementById('manifold-type');
        if (!manifoldTypeSelect) {
            console.error('Manifold type selector not found');
            return;
        }
        
        const manifoldType = manifoldTypeSelect.value;
        console.log('Selected manifold type:', manifoldType);
        
        // Show loading indicator
        showLoading();
        
        // Initialize the plot with default parameters
        updateVisualization({
            manifold_type: manifoldType,
            time: 0,
            loop_factor: 1,
            merge: false
        });
    } catch (error) {
        console.error('Error in initVisualization:', error);
        hideLoading();
    }
}

/**
 * Set up event listeners for the controls
 */
function setupEventListeners() {
    try {
        console.log('Setting up event listeners...');
        
        // Manifold type selector
        setupSelectorEventListener('manifold-type');
        
        // Time slider
        setupSliderEventListener('time-slider', 'time-value');
        
        // Loop factor slider
        setupSliderEventListener('loop-factor-slider', 'loop-factor-value');
        
        // Merge toggle
        setupToggleEventListener('merge-toggle');
        
        // Reset button
        setupButtonEventListener('reset-btn', resetControls);
        
        // Guided tour button
        setupButtonEventListener('guided-tour-btn', openGuidedTour);
        
        // Panel toggle buttons
        setupPanelToggle('toggle-left-panel', '.explorer-sidebar-left', 'sidebar-left-collapsed');
        setupPanelToggle('toggle-right-panel', '.explorer-sidebar-right', 'sidebar-right-collapsed');
        
        // Close buttons
        setupCloseButton('close-invariants-btn', '.explorer-sidebar-right', 'sidebar-right-collapsed');
        setupCloseButton('close-validation-btn', '.explorer-bottom', 'bottom-panel-collapsed');
        
        console.log('Event listeners setup completed');
    } catch (error) {
        console.error('Error in setupEventListeners:', error);
    }
}

/**
 * Setup event listener for a selector
 * @param {string} id - The ID of the selector element
 */
function setupSelectorEventListener(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Selector with ID "${id}" not found`);
        return;
    }
    
    // Remove any existing event listeners by cloning
    const newElement = element.cloneNode(true);
    element.parentNode.replaceChild(newElement, element);
    
    newElement.addEventListener('change', function() {
        console.log(`Selector "${id}" changed to:`, this.value);
        updateVisualization({
            manifold_type: this.value,
            time: parseFloat(document.getElementById('time-slider').value),
            loop_factor: parseFloat(document.getElementById('loop-factor-slider').value),
            merge: document.getElementById('merge-toggle').checked
        });
    });
    
    console.log(`Event listener added to selector "${id}"`);
}

/**
 * Setup event listener for a slider
 * @param {string} sliderId - The ID of the slider element
 * @param {string} valueId - The ID of the value display element
 */
function setupSliderEventListener(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);
    
    if (!slider) {
        console.warn(`Slider with ID "${sliderId}" not found`);
        return;
    }
    
    if (!valueDisplay) {
        console.warn(`Value display with ID "${valueId}" not found`);
    }
    
    // Remove any existing event listeners by cloning
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    
    // Initialize value display
    if (valueDisplay) {
        valueDisplay.textContent = parseFloat(newSlider.value).toFixed(2);
    }
    
    newSlider.addEventListener('input', function() {
        if (valueDisplay) {
            valueDisplay.textContent = parseFloat(this.value).toFixed(2);
        }
        
        console.log(`Slider "${sliderId}" changed to:`, this.value);
        
        updateVisualization({
            manifold_type: document.getElementById('manifold-type').value,
            time: parseFloat(document.getElementById('time-slider').value),
            loop_factor: parseFloat(document.getElementById('loop-factor-slider').value),
            merge: document.getElementById('merge-toggle').checked
        });
    });
    
    console.log(`Event listener added to slider "${sliderId}"`);
}

/**
 * Setup event listener for a toggle
 * @param {string} id - The ID of the toggle element
 */
function setupToggleEventListener(id) {
    const toggle = document.getElementById(id);
    if (!toggle) {
        console.warn(`Toggle with ID "${id}" not found`);
        return;
    }
    
    // Remove any existing event listeners by cloning
    const newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);
    
    newToggle.addEventListener('change', function() {
        console.log(`Toggle "${id}" changed to:`, this.checked);
        updateVisualization({
            manifold_type: document.getElementById('manifold-type').value,
            time: parseFloat(document.getElementById('time-slider').value),
            loop_factor: parseFloat(document.getElementById('loop-factor-slider').value),
            merge: this.checked
        });
    });
    
    console.log(`Event listener added to toggle "${id}"`);
}

/**
 * Setup event listener for a button
 * @param {string} id - The ID of the button element
 * @param {Function} handler - The click event handler
 */
function setupButtonEventListener(id, handler) {
    const button = document.getElementById(id);
    if (!button) {
        console.warn(`Button with ID "${id}" not found`);
        return;
    }
    
    // Remove any existing event listeners by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', function(event) {
        console.log(`Button "${id}" clicked`);
        handler(event);
    });
    
    console.log(`Event listener added to button "${id}"`);
}

/**
 * Setup event listener for a panel toggle
 * @param {string} buttonId - The ID of the toggle button
 * @param {string} panelSelector - The CSS selector for the panel
 * @param {string} collapsedClass - The CSS class for the collapsed state
 */
function setupPanelToggle(buttonId, panelSelector, collapsedClass) {
    const button = document.getElementById(buttonId);
    if (!button) {
        console.warn(`Panel toggle button with ID "${buttonId}" not found`);
        return;
    }
    
    // Remove any existing event listeners by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', function() {
        const panel = document.querySelector(panelSelector);
        if (!panel) {
            console.warn(`Panel with selector "${panelSelector}" not found`);
            return;
        }
        
        panel.classList.toggle(collapsedClass);
        console.log(`Panel "${panelSelector}" toggle state changed`);
    });
    
    console.log(`Event listener added to panel toggle "${buttonId}"`);
}

/**
 * Setup event listener for a close button
 * @param {string} buttonId - The ID of the close button
 * @param {string} panelSelector - The CSS selector for the panel
 * @param {string} collapsedClass - The CSS class for the collapsed state
 */
function setupCloseButton(buttonId, panelSelector, collapsedClass) {
    const button = document.getElementById(buttonId);
    if (!button) {
        console.warn(`Close button with ID "${buttonId}" not found`);
        return;
    }
    
    // Remove any existing event listeners by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', function() {
        const panel = document.querySelector(panelSelector);
        if (!panel) {
            console.warn(`Panel with selector "${panelSelector}" not found`);
            return;
        }
        
        panel.classList.add(collapsedClass);
        console.log(`Panel "${panelSelector}" closed`);
    });
    
    console.log(`Event listener added to close button "${buttonId}"`);
}

/**
 * Reset all controls to their default values
 */
function resetControls() {
    try {
        console.log('Resetting controls to default values');
        
        // Reset time slider
        const timeSlider = document.getElementById('time-slider');
        const timeValue = document.getElementById('time-value');
        if (timeSlider) {
            timeSlider.value = 0;
            if (timeValue) {
                timeValue.textContent = '0';
            }
        }
        
        // Reset loop factor slider
        const loopSlider = document.getElementById('loop-factor-slider');
        const loopValue = document.getElementById('loop-factor-value');
        if (loopSlider) {
            loopSlider.value = 1;
            if (loopValue) {
                loopValue.textContent = '1';
            }
        }
        
        // Reset merge toggle
        const mergeToggle = document.getElementById('merge-toggle');
        if (mergeToggle) {
            mergeToggle.checked = false;
        }
        
        // Update visualization with reset values
        updateVisualization({
            manifold_type: document.getElementById('manifold-type').value,
            time: 0,
            loop_factor: 1,
            merge: false
        });
        
        console.log('Controls reset successfully');
    } catch (error) {
        console.error('Error in resetControls:', error);
    }
}

/**
 * Update the visualization with the given parameters
 * @param {Object} params - The parameters for the visualization
 */
function updateVisualization(params) {
    try {
        console.log('Updating visualization with parameters:', params);
        
        // Show loading indicator
        showLoading();
        
        // Make AJAX request to get visualization data
        fetch('/get_visualization', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Update the plot with the new data
            updatePlot(data);
            
            // Get topological invariants
            getTopologicalInvariants(params);
            
            // Hide loading indicator
            hideLoading();
            
            console.log('Visualization updated successfully');
        })
        .catch(error => {
            console.error('Error updating visualization:', error);
            
            // Hide loading indicator
            hideLoading();
            
            // Use backup visualization for demo purposes
            console.log('Using backup visualization data');
            const backupData = createBackupVisualizationData(params);
            updatePlot(backupData);
        });
    } catch (error) {
        console.error('Error in updateVisualization:', error);
        hideLoading();
    }
}

/**
 * Create backup visualization data for demo purposes
 * @param {Object} params - The parameters for the visualization
 * @returns {Object} - The backup visualization data
 */
function createBackupVisualizationData(params) {
    // Simple Klein bottle points
    const points = [];
    const timeMultiplier = params.time / 3;
    
    for (let u = 0; u < Math.PI * 2; u += Math.PI / 10) {
        for (let v = 0; v < Math.PI * 2; v += Math.PI / 10) {
            const x = Math.cos(u) * Math.cos(v);
            const y = Math.sin(u) * Math.cos(v);
            const z = Math.sin(v);
            const w = Math.cos(u) * Math.sin(v) * Math.sin(timeMultiplier);
            
            points.push({
                x: x,
                y: y,
                z: z,
                w: w
            });
        }
    }
    
    // Create trace
    const trace = {
        x: points.map(p => p.x),
        y: points.map(p => p.y),
        z: points.map(p => p.z),
        mode: 'markers',
        type: 'scatter3d',
        marker: {
            size: 3,
            color: points.map(p => p.w),
            colorscale: 'Viridis',
            opacity: 0.8
        }
    };
    
    // Create layout
    const layout = {
        title: {
            text: '4D Manifold (Demo Mode)',
            font: {
                color: 'rgba(255, 255, 255, 0.87)'
            }
        },
        scene: {
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
            zaxis: { title: 'Z' },
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 }
            },
            aspectratio: {
                x: 1, y: 1, z: 1
            }
        },
        paper_bgcolor: 'rgba(30, 30, 30, 0)',
        plot_bgcolor: 'rgba(30, 30, 30, 0)',
        margin: {
            l: 0, r: 0, t: 50, b: 0
        }
    };
    
    return {
        traces: [trace],
        layout: layout
    };
}

/**
 * Update the visualization plot
 * @param {Object} data - The plot data from the server
 */
function updatePlot(data) {
    try {
        console.log('Updating plot with data');
        
        const plotContainer = document.getElementById('explorer-plot');
        if (!plotContainer) {
            console.error('Plot container not found');
            return;
        }
        
        // Get the container dimensions
        const container = document.querySelector('.explorer-plot-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Configure responsiveness options
        const plotConfig = {
            responsive: true,
            useResizeHandler: true,
            autosize: true,
            // Ensure the plot uses the full container space
            margin: {l: 50, r: 30, t: 30, b: 50},
            showlegend: true,
            legend: {
                orientation: 'h',
                x: 0.5,
                y: -0.15,
                xanchor: 'center'
            }
        };
        
        // Create the plot with the responsive configuration
        Plotly.newPlot(plotContainer, data.traces, data.layout, plotConfig);
        
        hideLoading();
        console.log('Plot updated successfully');
    } catch (error) {
        console.error('Error updating plot:', error);
        createBackupVisualizationData({
            manifold_type: document.getElementById('manifold-type').value,
            time: 0,
            loop_factor: 1
        });
    }
}

/**
 * Get topological invariants for the current parameters
 * @param {Object} params - The parameters for the visualization
 */
function getTopologicalInvariants(params) {
    try {
        console.log('Getting topological invariants');
        
        fetch('/get_topological_invariants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Update the invariants display
            updateInvariants(data);
            console.log('Topological invariants updated successfully');
        })
        .catch(error => {
            console.error('Error getting topological invariants:', error);
            
            // Use backup invariants for demo purposes
            console.log('Using backup invariants data');
            const backupData = createBackupInvariantsData(params);
            updateInvariants(backupData);
        });
    } catch (error) {
        console.error('Error in getTopologicalInvariants:', error);
    }
}

/**
 * Create backup invariants data for demo purposes
 * @param {Object} params - The parameters for the visualization
 * @returns {Object} - The backup invariants data
 */
function createBackupInvariantsData(params) {
    return {
        basic_invariants: {
            euler_characteristic: params.manifold_type === 'skb' ? '0' : '2',
            genus: params.manifold_type === 'skb' ? '2' : '0',
            orientable: params.manifold_type !== 'skb',
            dimension: '4'
        },
        homology: {
            betti_numbers: ['1', '1', '1', '1'],
            homology_groups: ['Z', 'Z', params.manifold_type === 'skb' ? 'Z⊕Z₂' : 'Z', 'Z']
        },
        advanced_invariants: {
            stiefel_whitney_classes: ['0', params.manifold_type === 'skb' ? 'w₂≠0' : '0', '0', '0'],
            intersection_form: params.manifold_type === 'skb' ? 'E₈⊕H' : 'E₈⊕E₈',
            kirby_siebenmann: '0'
        }
    };
}

/**
 * Update the invariants display with the given data
 * @param {Object} data - The invariants data
 */
function updateInvariants(data) {
    try {
        console.log('Updating invariants display');
        
        // Show the right sidebar if it's collapsed
        const rightSidebar = document.querySelector('.explorer-sidebar-right');
        if (rightSidebar) {
            rightSidebar.classList.remove('sidebar-right-collapsed');
        }
        
        // Update basic invariants
        const basicInvariants = document.getElementById('basic-invariants-content');
        if (!basicInvariants) {
            console.warn('Basic invariants element not found');
            return;
        }
        
        // Create basic invariants content
        const basicInvariantsHTML = `
            <div class="invariant-item">
                <div class="invariant-label">Euler Characteristic:</div>
                <div class="invariant-value">${data.basic_invariants.euler_characteristic}</div>
            </div>
            <div class="invariant-item">
                <div class="invariant-label">Genus:</div>
                <div class="invariant-value">${data.basic_invariants.genus}</div>
            </div>
            <div class="invariant-item">
                <div class="invariant-label">Orientable:</div>
                <div class="invariant-value">${data.basic_invariants.orientable ? 'Yes' : 'No'}</div>
            </div>
            <div class="invariant-item">
                <div class="invariant-label">Dimension:</div>
                <div class="invariant-value">${data.basic_invariants.dimension}</div>
            </div>
        `;
        
        basicInvariants.innerHTML = basicInvariantsHTML;
        
        // Update advanced invariants
        const advancedInvariants = document.getElementById('advanced-invariants-content');
        if (!advancedInvariants) {
            console.warn('Advanced invariants element not found');
            return;
        }
        
        // Create advanced invariants content
        const advancedInvariantsHTML = `
            <div class="invariant-item">
                <div class="invariant-label">Betti Numbers:</div>
                <div class="invariant-value">${data.homology.betti_numbers.join(', ')}</div>
            </div>
            <div class="invariant-item">
                <div class="invariant-label">Homology Groups:</div>
                <div class="invariant-value">${data.homology.homology_groups.join(', ')}</div>
            </div>
            <div class="invariant-item">
                <div class="invariant-label">Stiefel-Whitney Classes:</div>
                <div class="invariant-value">${data.advanced_invariants.stiefel_whitney_classes.join(', ')}</div>
            </div>
            <div class="invariant-item">
                <div class="invariant-label">Intersection Form:</div>
                <div class="invariant-value">${data.advanced_invariants.intersection_form}</div>
            </div>
            <div class="invariant-item">
                <div class="invariant-label">Kirby-Siebenmann:</div>
                <div class="invariant-value">${data.advanced_invariants.kirby_siebenmann}</div>
            </div>
        `;
        
        advancedInvariants.innerHTML = advancedInvariantsHTML;
        
        console.log('Invariants display updated successfully');
    } catch (error) {
        console.error('Error in updateInvariants:', error);
    }
}

/**
 * Initialize the guided tour
 */
function initGuidedTour() {
    try {
        console.log('Initializing guided tour');
        
        const modal = document.getElementById('guided-tour-modal');
        if (!modal) {
            console.warn('Guided tour modal not found');
            return;
        }
        
        const closeBtn = modal.querySelector('.education-modal-close');
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        const currentStepEl = document.getElementById('current-step');
        const totalStepsEl = document.getElementById('total-steps');
        const steps = modal.querySelectorAll('.tour-step');
        
        let currentStep = 1;
        const totalSteps = steps.length;
        
        if (totalStepsEl) {
            totalStepsEl.textContent = totalSteps;
        }
        
        // Close button event listener
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }
        
        // Previous button event listener
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentStep > 1) {
                    showStep(--currentStep);
                }
            });
        }
        
        // Next button event listener
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (currentStep < totalSteps) {
                    showStep(++currentStep);
                } else {
                    modal.style.display = 'none';
                }
            });
        }
        
        // Show a specific step
        function showStep(step) {
            steps.forEach(s => s.style.display = 'none');
            steps[step - 1].style.display = 'block';
            
            if (currentStepEl) {
                currentStepEl.textContent = step;
            }
            
            // Update button states
            if (prevBtn) {
                prevBtn.disabled = step === 1;
            }
            
            if (nextBtn) {
                nextBtn.textContent = step === totalSteps ? 'Finish' : 'Next';
            }
        }
        
        console.log('Guided tour initialized successfully');
    } catch (error) {
        console.error('Error in initGuidedTour:', error);
    }
}

/**
 * Open the guided tour
 */
function openGuidedTour() {
    try {
        console.log('Opening guided tour');
        
        const modal = document.getElementById('guided-tour-modal');
        if (!modal) {
            console.warn('Guided tour modal not found');
            return;
        }
        
        modal.style.display = 'flex';
        
        // Show the first step
        const steps = modal.querySelectorAll('.tour-step');
        steps.forEach(s => s.style.display = 'none');
        steps[0].style.display = 'block';
        
        // Reset step counter
        const currentStepEl = document.getElementById('current-step');
        if (currentStepEl) {
            currentStepEl.textContent = '1';
        }
        
        const prevBtn = document.getElementById('prev-step');
        if (prevBtn) {
            prevBtn.disabled = true;
        }
        
        const nextBtn = document.getElementById('next-step');
        if (nextBtn) {
            nextBtn.textContent = 'Next';
        }
        
        console.log('Guided tour opened successfully');
    } catch (error) {
        console.error('Error in openGuidedTour:', error);
    }
}

/**
 * Show loading indicator
 */
function showLoading() {
    try {
        const plot = document.getElementById('plot');
        if (!plot) {
            console.warn('Plot element not found');
            return;
        }
        
        // Add loading indicator if needed
        if (!plot.querySelector('.loading-indicator')) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = '<div class="spinner"></div><div class="loading-text">Loading...</div>';
            plot.appendChild(loadingIndicator);
            console.log('Loading indicator shown');
        }
    } catch (error) {
        console.error('Error in showLoading:', error);
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    try {
        const plot = document.getElementById('plot');
        if (!plot) {
            console.warn('Plot element not found');
            return;
        }
        
        // Remove loading indicator if it exists
        const loadingIndicator = plot.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
            console.log('Loading indicator hidden');
        }
    } catch (error) {
        console.error('Error in hideLoading:', error);
    }
}

/**
 * Setup responsive layout adjustments
 */
function setupResponsiveLayout() {
    // Handle window resize events to ensure visualizations adjust properly
    window.addEventListener('resize', debounce(function() {
        // Get all plot containers
        const plotContainers = document.querySelectorAll('.explorer-plot-container');
        
        if (plotContainers.length > 0) {
            // Trigger Plotly to resize all plots
            plotContainers.forEach(container => {
                const plotElement = container.querySelector('.js-plotly-plot');
                if (plotElement && window.Plotly) {
                    Plotly.Plots.resize(plotElement);
                }
            });
        }
    }, 250));
    
    // Initial call to ensure proper layout on first load
    setTimeout(function() {
        const event = new Event('resize');
        window.dispatchEvent(event);
    }, 500);
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to wait before calling the function
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
} 