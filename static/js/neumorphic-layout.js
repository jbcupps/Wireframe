/**
 * Neumorphic Layout Transformer
 * This script automatically applies neumorphic styling to common page elements
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the neumorphic layout transformation
    initNeumorphicLayout();
});

/**
 * Initialize the neumorphic layout transformation
 */
function initNeumorphicLayout() {
    // Apply neumorphic styling to common elements
    transformHeadings();
    transformButtons();
    transformInputs();
    transformCards();
    transformPanels();
    transformLists();
    transformTables();
    transformVisualizations();
    
    // Apply observer for dynamically loaded content
    observeContentChanges();
}

/**
 * Transform headings to neumorphic style
 */
function transformHeadings() {
    // Transform h1, h2, h3 headings
    const headings = document.querySelectorAll('h1:not(.neu-ignore), h2:not(.neu-ignore), h3:not(.neu-ignore)');
    
    headings.forEach(heading => {
        if (!heading.closest('.neu-ignore')) {
            heading.classList.add('neu-heading');
            
            // Add different effects based on heading level
            if (heading.tagName === 'H1') {
                heading.classList.add('neu-anim-fade');
            } else if (heading.tagName === 'H2') {
                heading.classList.add('neu-box');
            } else if (heading.tagName === 'H3') {
                heading.classList.add('neu-box-concave');
            }
        }
    });
}

/**
 * Transform buttons to neumorphic style
 */
function transformButtons() {
    // Transform standard buttons, excluding those with neu-ignore class
    const buttons = document.querySelectorAll('button:not(.neu-btn):not(.neu-ignore), .btn:not(.neu-btn):not(.neu-ignore)');
    
    buttons.forEach(button => {
        if (!button.closest('.neu-ignore')) {
            // Add neumorphic button class
            button.classList.add('neu-btn');
            
            // Add ripple effect
            button.classList.add('neu-ripple-effect');
            
            // If it's a primary/CTA button, add primary styling
            if (button.classList.contains('btn-primary') || button.classList.contains('cta-button')) {
                button.classList.add('neu-btn-primary');
            }
        }
    });
}

/**
 * Transform input elements to neumorphic style
 */
function transformInputs() {
    // Transform standard form controls
    const inputs = document.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not(.neu-input):not(.neu-ignore)');
    const textareas = document.querySelectorAll('textarea:not(.neu-input):not(.neu-ignore)');
    const selects = document.querySelectorAll('select:not(.neu-input):not(.neu-ignore)');
    
    // Combine all input-like elements
    const formControls = [...inputs, ...textareas, ...selects];
    
    formControls.forEach(control => {
        if (!control.closest('.neu-ignore')) {
            control.classList.add('neu-input');
            
            // Special handling for range inputs
            if (control.type === 'range') {
                control.classList.add('neu-range');
            }
        }
    });
    
    // Transform checkbox and radio inputs
    const toggles = document.querySelectorAll('input[type="checkbox"]:not(.neu-ignore), input[type="radio"]:not(.neu-ignore)');
    
    toggles.forEach(toggle => {
        if (!toggle.closest('.neu-ignore') && !toggle.closest('.neu-switch')) {
            // Get the parent label if it exists
            const label = toggle.closest('label');
            
            if (label) {
                if (toggle.type === 'checkbox') {
                    label.classList.add('neu-switch');
                    
                    // Create the slider element if it doesn't exist
                    if (!label.querySelector('.neu-switch-slider')) {
                        const slider = document.createElement('span');
                        slider.classList.add('neu-switch-slider');
                        
                        // Insert after the input
                        toggle.insertAdjacentElement('afterend', slider);
                    }
                }
            }
        }
    });
}

/**
 * Transform card elements to neumorphic style
 */
function transformCards() {
    // Transform cards and similar containers
    const cards = document.querySelectorAll('.card:not(.neu-card):not(.neu-ignore)');
    
    cards.forEach(card => {
        if (!card.closest('.neu-ignore')) {
            card.classList.add('neu-card');
            
            // Add hover effect
            card.classList.add('neu-scale');
            
            // Find card headers and footers
            const cardHeader = card.querySelector('.card-header');
            const cardFooter = card.querySelector('.card-footer');
            
            if (cardHeader) {
                cardHeader.classList.add('neu-card-header');
            }
            
            if (cardFooter) {
                cardFooter.classList.add('neu-box-concave');
            }
        }
    });
}

/**
 * Transform panel elements to neumorphic style
 */
function transformPanels() {
    // Transform panels, sections, and other container blocks
    const panels = document.querySelectorAll('.panel:not(.neu-box):not(.neu-ignore), section:not(.neu-box):not(.neu-ignore), .container-fluid:not(.neu-box):not(.neu-ignore)');
    
    panels.forEach(panel => {
        if (!panel.closest('.neu-ignore') && !panel.classList.contains('container')) {
            panel.classList.add('neu-box');
        }
    });
}

/**
 * Transform list elements to neumorphic style
 */
function transformLists() {
    // Transform unordered and ordered lists
    const lists = document.querySelectorAll('ul:not(.neu-ignore):not(.footer-links):not(.nav-links), ol:not(.neu-ignore)');
    
    lists.forEach(list => {
        if (!list.closest('.neu-ignore')) {
            list.classList.add('neu-staggered-list');
            
            // Add list item class to all li elements
            const items = list.querySelectorAll('li');
            items.forEach(item => {
                item.classList.add('neu-list-item');
            });
        }
    });
}

/**
 * Transform table elements to neumorphic style
 */
function transformTables() {
    // Transform standard tables
    const tables = document.querySelectorAll('table:not(.neu-ignore)');
    
    tables.forEach(table => {
        if (!table.closest('.neu-ignore')) {
            table.classList.add('neu-table');
            
            // Add box effect to the table header
            const thead = table.querySelector('thead');
            if (thead) {
                thead.classList.add('neu-box-concave');
            }
            
            // Add subtle styling to table rows
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                row.classList.add('neu-hover-pulse');
            });
        }
    });
}

/**
 * Transform visualization elements to neumorphic style
 */
function transformVisualizations() {
    // Add neumorphic styling to visualization containers
    const visualizations = document.querySelectorAll('.visualization-container:not(.neu-ignore), .plot-container:not(.neu-ignore), [id^="plotly"]:not(.neu-ignore)');
    
    visualizations.forEach(viz => {
        if (!viz.closest('.neu-ignore')) {
            viz.classList.add('neu-card');
            viz.classList.add('neu-anim-fade');
            
            // Add subtle tilt effect to visualizations
            viz.classList.add('neu-tilt');
        }
    });
    
    // Style control panels for visualizations
    const controlPanels = document.querySelectorAll('.control-panel:not(.neu-ignore), .parameter-controls:not(.neu-ignore)');
    
    controlPanels.forEach(panel => {
        if (!panel.closest('.neu-ignore')) {
            panel.classList.add('neu-box-concave');
            panel.classList.add('neu-anim-slide-up');
        }
    });
}

/**
 * Observe content changes to apply neumorphic styling to dynamically loaded elements
 */
function observeContentChanges() {
    // Create a mutation observer to watch for new elements
    const observer = new MutationObserver(mutations => {
        let shouldTransform = false;
        
        // Check if relevant nodes were added
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                shouldTransform = true;
            }
        });
        
        // Apply transformations if needed
        if (shouldTransform) {
            transformHeadings();
            transformButtons();
            transformInputs();
            transformCards();
            transformPanels();
            transformLists();
            transformTables();
            transformVisualizations();
        }
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { 
        childList: true,
        subtree: true
    });
}

/**
 * Add a neumorphic loader to the page
 * @param {string} targetSelector - The selector for the container to add the loader to
 * @param {string} message - Optional message to display with the loader
 */
function addNeumorphicLoader(targetSelector, message = 'Loading...') {
    const target = document.querySelector(targetSelector);
    
    if (target) {
        const loaderContainer = document.createElement('div');
        loaderContainer.classList.add('neu-loader-container');
        
        loaderContainer.innerHTML = `
            <div class="neu-loading"></div>
            <p class="neu-loader-message">${message}</p>
        `;
        
        target.appendChild(loaderContainer);
        
        return loaderContainer;
    }
    
    return null;
}

/**
 * Remove a neumorphic loader
 * @param {Element} loaderElement - The loader element to remove
 */
function removeNeumorphicLoader(loaderElement) {
    if (loaderElement && loaderElement.parentNode) {
        // Add fade out animation before removing
        loaderElement.style.opacity = '0';
        
        setTimeout(() => {
            loaderElement.parentNode.removeChild(loaderElement);
        }, 300);
    }
} 