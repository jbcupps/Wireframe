/**
 * Modular Layout Manager for 4D Manifold Explorer
 * This file manages the responsive layout of the application, including
 * toggling sidebars, resizing plots, and ensuring a smooth user experience.
 */

// Track panel states
const panelStates = {
    leftSidebar: true,
    rightSidebar: false,
    bottomPanel: false
};

// Initialize the layout when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing modular layout...");
    
    // Move the original SKB controls to the new layout
    moveOriginalControls();
    
    // Set up toggle event listeners
    setupPanelToggles();
    
    // Initial plot resize
    resizePlot();
    
    // Listen for window resize events
    window.addEventListener('resize', debounce(resizePlot, 250));
    
    // Map old event listeners to new elements if needed
    mapEventListeners();
    
    // Handle the toggle invariants button
    updateInvariantsToggleButton();
});

/**
 * Moves original controls from the hidden layout to the new modular layout
 */
function moveOriginalControls() {
    // Move SKB controls
    const originalSkbControls = document.querySelector('.main-content[style="display: none;"] #skb-controls');
    const newSkbControls = document.querySelector('.explorer-sidebar-left .skb-controls');
    
    if (originalSkbControls && newSkbControls) {
        newSkbControls.innerHTML = originalSkbControls.innerHTML;
    }
    
    // Move hadron validator
    const originalValidator = document.querySelector('.main-content[style="display: none;"] #hadron-validation-panel');
    const newValidator = document.querySelector('.explorer-sidebar-left #hadron-validator');
    
    if (originalValidator && newValidator) {
        newValidator.innerHTML = originalValidator.innerHTML;
    }
    
    // Move the basic invariants content
    const originalBasicInvariants = document.querySelector('.main-content[style="display: none;"] #basic-invariants-content');
    const newBasicInvariants = document.querySelector('.explorer-sidebar-right #basic-invariants-content');
    
    if (originalBasicInvariants && newBasicInvariants) {
        newBasicInvariants.innerHTML = originalBasicInvariants.innerHTML;
    }
    
    // Move the advanced invariants content
    const originalAdvancedInvariants = document.querySelector('.main-content[style="display: none;"] #advanced-invariants-content');
    const newAdvancedInvariants = document.querySelector('.explorer-sidebar-right #advanced-invariants-content');
    
    if (originalAdvancedInvariants && newAdvancedInvariants) {
        newAdvancedInvariants.innerHTML = originalAdvancedInvariants.innerHTML;
    }
}

/**
 * Maps event listeners from the original controls to the new ones
 */
function mapEventListeners() {
    // Map the time slider
    const originalTimeSlider = document.getElementById('time');
    const newTimeSlider = document.getElementById('time-slider');
    
    if (originalTimeSlider && newTimeSlider) {
        // Copy attributes
        for (const attr of originalTimeSlider.attributes) {
            if (attr.name !== 'id' && attr.name !== 'class') {
                newTimeSlider.setAttribute(attr.name, attr.value);
            }
        }
        
        // Copy event listeners by cloning the element
        const newSlider = newTimeSlider.cloneNode(true);
        newTimeSlider.replaceWith(newSlider);
        
        // Add the input event listener to update the displayed value
        newSlider.addEventListener('input', function() {
            document.getElementById('time-value').textContent = this.value;
            
            // Trigger the original slider's change event for compatibility
            if (typeof updateVisualization === 'function') {
                updateVisualization();
            }
        });
    }
    
    // Map the loop factor slider
    const originalLoopSlider = document.getElementById('loop-factor');
    const newLoopSlider = document.getElementById('loop-factor-slider');
    
    if (originalLoopSlider && newLoopSlider) {
        // Copy attributes
        for (const attr of originalLoopSlider.attributes) {
            if (attr.name !== 'id' && attr.name !== 'class') {
                newLoopSlider.setAttribute(attr.name, attr.value);
            }
        }
        
        // Copy event listeners by cloning the element
        const newSlider = newLoopSlider.cloneNode(true);
        newLoopSlider.replaceWith(newSlider);
        
        // Add the input event listener to update the displayed value
        newSlider.addEventListener('input', function() {
            document.getElementById('loop-factor-value').textContent = this.value;
            
            // Trigger the original slider's change event for compatibility
            if (typeof updateVisualization === 'function') {
                updateVisualization();
            }
        });
    }
    
    // Map the merge toggle
    const originalMergeToggle = document.getElementById('merge');
    const newMergeToggle = document.getElementById('merge-toggle');
    
    if (originalMergeToggle && newMergeToggle) {
        // Copy attributes
        for (const attr of originalMergeToggle.attributes) {
            if (attr.name !== 'id' && attr.name !== 'class') {
                newMergeToggle.setAttribute(attr.name, attr.value);
            }
        }
        
        // Copy event listeners by cloning the element
        const newToggle = newMergeToggle.cloneNode(true);
        newMergeToggle.replaceWith(newToggle);
        
        // Add the change event listener
        newToggle.addEventListener('change', function() {
            // Trigger the original toggle's change event for compatibility
            if (typeof updateVisualization === 'function') {
                updateVisualization();
            }
        });
    }
    
    // Map the validate hadron button
    const originalValidateBtn = document.getElementById('validate-hadron-btn');
    if (originalValidateBtn) {
        const newValidateBtn = document.getElementById('validate-hadron-btn');
        if (newValidateBtn) {
            // Copy event listeners
            const newBtn = newValidateBtn.cloneNode(true);
            newValidateBtn.replaceWith(newBtn);
            
            // Add click event listener
            newBtn.addEventListener('click', function() {
                validateHadron();
                showPanel('bottom-panel');
            });
        }
    }
}

/**
 * Updates the invariants toggle button to work with the new layout
 */
function updateInvariantsToggleButton() {
    const invariantsToggle = document.getElementById('toggle-invariants-btn');
    const newToggle = document.createElement('button');
    newToggle.id = 'toggle-right-panel';
    newToggle.className = 'panel-toggle right-panel-toggle';
    newToggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
    
    if (invariantsToggle) {
        invariantsToggle.addEventListener('click', function() {
            togglePanel('right-sidebar');
        });
    }
    
    // Add fullscreen button functionality
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', function() {
            toggleFullscreen();
        });
    }
}

/**
 * Sets up event listeners for panel toggle buttons
 */
function setupPanelToggles() {
    // Setup toggle buttons for each panel
    const toggleButtons = {
        'controls-panel': '#toggle-controls-btn',
        'info-panel': '#toggle-info-btn',
        'population-panel': '#toggle-population-btn', 
        'selected-panel': '#toggle-selected-btn',
        'optimization-panel': '#toggle-optimization-btn',
        'topology-panel': '#toggle-topology-btn',
        'invariants-panel': '#toggle-invariants-btn',
        'stable-hadrons-panel': '#toggle-hadrons-btn',
        'ai-analysis-panel': '#toggle-ai-panel', // AI Analysis panel
        'standard-model-panel': '#toggle-sm-panel' // Standard Model panel
    };
    
    // Left sidebar toggle
    const leftToggle = document.getElementById('toggle-left-panel');
    if (leftToggle) {
        leftToggle.addEventListener('click', function() {
            togglePanel('left-sidebar');
        });
    }
    
    // Right sidebar (invariants) toggle
    const rightToggle = document.getElementById('toggle-right-panel');
    if (rightToggle) {
        rightToggle.addEventListener('click', function() {
            togglePanel('right-sidebar');
        });
    }
    
    // Bottom panel toggle
    const bottomToggle = document.getElementById('toggle-bottom-panel');
    if (bottomToggle) {
        bottomToggle.addEventListener('click', function() {
            togglePanel('bottom-panel');
        });
    }
    
    // Close buttons for panels
    const closeInvariants = document.getElementById('close-invariants-btn');
    if (closeInvariants) {
        closeInvariants.addEventListener('click', function() {
            togglePanel('right-sidebar');
        });
    }
    
    const closeBottom = document.getElementById('close-bottom-btn');
    if (closeBottom) {
        closeBottom.addEventListener('click', function() {
            togglePanel('bottom-panel');
        });
    }
}

/**
 * Toggles the visibility of a panel and updates the layout
 * @param {string} panelId - The ID of the panel to toggle
 */
function togglePanel(panelId) {
    let panel, toggle, state;
    
    switch(panelId) {
        case 'left-sidebar':
            panel = document.querySelector('.explorer-sidebar-left');
            toggle = document.getElementById('toggle-left-panel');
            state = 'leftSidebar';
            break;
        case 'right-sidebar':
            panel = document.querySelector('.explorer-sidebar-right');
            toggle = document.getElementById('toggle-right-panel');
            state = 'rightSidebar';
            break;
        case 'bottom-panel':
            panel = document.querySelector('.explorer-bottom');
            toggle = document.getElementById('toggle-bottom-panel');
            state = 'bottomPanel';
            break;
        default:
            return;
    }
    
    if (!panel) return;
    
    // Toggle the panel state
    panelStates[state] = !panelStates[state];
    
    // Apply appropriate class based on the panel type
    if (panelId === 'left-sidebar') {
        panel.classList.toggle('sidebar-collapsed', !panelStates[state]);
    } else if (panelId === 'right-sidebar') {
        panel.classList.toggle('sidebar-right-collapsed', !panelStates[state]);
    } else if (panelId === 'bottom-panel') {
        panel.classList.toggle('bottom-panel-collapsed', !panelStates[state]);
    }
    
    // Update toggle button icon if it exists
    if (toggle) {
        const icon = toggle.querySelector('i');
        if (icon) {
            if (panelId === 'left-sidebar') {
                icon.className = panelStates[state] ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
            } else if (panelId === 'right-sidebar') {
                icon.className = panelStates[state] ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            } else {
                icon.className = panelStates[state] ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            }
        }
    }
    
    // Resize the plot to fit the new layout
    setTimeout(resizePlot, 300); // Wait for transition to complete
}

/**
 * Toggles fullscreen mode for the plot
 */
function toggleFullscreen() {
    const mainContent = document.querySelector('.explorer-main');
    
    if (!document.fullscreenElement) {
        if (mainContent.requestFullscreen) {
            mainContent.requestFullscreen();
        } else if (mainContent.mozRequestFullScreen) { /* Firefox */
            mainContent.mozRequestFullScreen();
        } else if (mainContent.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            mainContent.webkitRequestFullscreen();
        } else if (mainContent.msRequestFullscreen) { /* IE/Edge */
            mainContent.msRequestFullscreen();
        }
        
        // Change button icon
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.title = 'Exit Fullscreen';
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
        
        // Change button icon back
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = 'Fullscreen';
        }
    }
    
    // Resize the plot after fullscreen change
    setTimeout(resizePlot, 300);
}

/**
 * Resizes the Plotly plot to fit its container
 */
function resizePlot() {
    const plot = document.getElementById('plot');
    if (plot && typeof Plotly !== 'undefined') {
        Plotly.Plots.resize(plot);
    }
}

/**
 * Creates a debounced function that delays invoking the provided function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The delay in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Checks if a panel is visible
 * @param {string} panelId - The ID of the panel to check
 * @returns {boolean} - Whether the panel is visible
 */
function isPanelVisible(panelId) {
    switch(panelId) {
        case 'left-sidebar':
            return panelStates.leftSidebar;
        case 'right-sidebar':
            return panelStates.rightSidebar;
        case 'bottom-panel':
            return panelStates.bottomPanel;
        default:
            return false;
    }
}

/**
 * Shows a panel if it's not already visible
 * @param {string} panelId - The ID of the panel to show
 */
function showPanel(panelId) {
    if (!isPanelVisible(panelId)) {
        togglePanel(panelId);
    }
}

/**
 * Hides a panel if it's currently visible
 * @param {string} panelId - The ID of the panel to hide
 */
function hidePanel(panelId) {
    if (isPanelVisible(panelId)) {
        togglePanel(panelId);
    }
}

// Add event listener for document fullscreenchange
document.addEventListener('fullscreenchange', function() {
    // Update fullscreen button icon
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.title = 'Exit Fullscreen';
        } else {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = 'Fullscreen';
        }
    }
    
    // Resize the plot
    resizePlot();
});

// Export functions for use in other scripts
window.layoutManager = {
    togglePanel: togglePanel,
    resizePlot: resizePlot,
    isPanelVisible: isPanelVisible,
    showPanel: showPanel,
    hidePanel: hidePanel,
    toggleFullscreen: toggleFullscreen
}; 