/**
 * 4D Manifold Explorer - Main JavaScript
 * Common functionality for the application
 */

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeTooltips();
    initializeSliders();
    setupVisualizationResizing();
    setupAPIErrorHandling();
});

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize range sliders
 */
function initializeSliders() {
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
 * Handle visualization resizing
 */
function setupVisualizationResizing() {
    const containers = document.querySelectorAll('.visualization-container');
    if (containers.length === 0) return;
    
    // Debounce function for resize event
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // Function to resize Plotly graphs
    function resizePlotlyGraphs() {
        if (window.Plotly) {
            const graphs = document.querySelectorAll('.js-plotly-plot');
            graphs.forEach(graph => {
                window.Plotly.Plots.resize(graph);
            });
        }
    }
    
    // Set up resize listener with debounce
    window.addEventListener('resize', debounce(resizePlotlyGraphs, 250));
}

/**
 * Set up standardized API error handling
 */
function setupAPIErrorHandling() {
    window.handleAPIError = function(error, elementId) {
        console.error('API Error:', error);
        
        const errorElement = document.getElementById(elementId || 'error-message');
        if (errorElement) {
            let message = 'An error occurred. Please try again.';
            
            if (error.response && error.response.data && error.response.data.error) {
                message = error.response.data.error;
            } else if (error.message) {
                message = error.message;
            }
            
            errorElement.textContent = message;
            errorElement.classList.remove('d-none');
            
            // Hide after 5 seconds
            setTimeout(() => {
                errorElement.classList.add('d-none');
            }, 5000);
        }
    };
}

/**
 * Fetch data from API endpoints
 * @param {string} url - API endpoint URL
 * @param {Object} data - POST data (if null, will perform GET request)
 * @returns {Promise} - Promise resolving to response data
 */
function fetchAPI(url, data = null) {
    const options = {
        method: data ? 'POST' : 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    return fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        });
}

/**
 * Show loading indicator
 * @param {string} containerId - ID of container to show loader in
 * @param {boolean} isLoading - Whether to show or hide loader
 */
function showLoading(containerId, isLoading = true) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (isLoading) {
        // Add loading spinner if not exists
        if (!container.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay position-absolute w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.zIndex = '1000';
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            
            overlay.appendChild(spinner);
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
    } else {
        // Remove loading spinner if exists
        const overlay = container.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

/**
 * Format number with proper precision
 * @param {number} number - Number to format
 * @param {number} precision - Decimal precision
 * @returns {string} - Formatted number
 */
function formatNumber(number, precision = 2) {
    return Number.isInteger(number) ? 
        number.toString() : 
        number.toFixed(precision);
}

/**
 * Create a color scale value based on a normalized value (0-1)
 * @param {number} value - Normalized value between 0 and 1
 * @param {string} colorScale - Color scale name ('viridis', 'plasma', 'inferno', etc.)
 * @returns {string} - RGB color string
 */
function getColorFromScale(value, colorScale = 'viridis') {
    // Simple implementation of viridis color scale
    if (colorScale === 'viridis') {
        const r = Math.floor(70 + (value < 0.5 ? value * 2 * 160 : 160 - (value - 0.5) * 2 * 150));
        const g = Math.floor(value * 230);
        const b = Math.floor(140 + (value < 0.5 ? value * 2 * 110 : 110 - (value - 0.5) * 2 * 110));
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Default to grayscale
    const intensity = Math.floor(value * 255);
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
} 