/**
 * Education Features for 4D Manifold Explorer
 * This file contains functions to handle the educational features of the application,
 * including tooltips, popups, and guided tour functionality.
 */

// Educational content database
const EDUCATION_CONTENT = {
    // Manifold basics
    "manifold_basics": {
        title: "What is a Manifold?",
        content: `
            <p>A manifold is a mathematical space that locally resembles Euclidean space. In physics, manifolds are used to model spacetime and other physical phenomena.</p>
            <p>The 4D manifolds in this explorer represent different models of spacetime with varying topological properties, which can have profound implications for particle physics.</p>
        `
    },
    // Manifold types
    "spacetime_klein_bottle": {
        title: "Spacetime Klein Bottle (SKB)",
        content: `
            <p>The Spacetime Klein Bottle is a non-orientable 4D manifold that combines the properties of a Klein bottle with time evolution.</p>
            <p>In this model:</p>
            <ul>
                <li>Electric charge corresponds to twisting in the X dimension</li>
                <li>Weak isospin corresponds to twisting in the Y dimension</li>
                <li>Color charge corresponds to twisting in the Z dimension</li>
                <li>Mass-energy corresponds to twisting in the time dimension</li>
            </ul>
        `
    },
    "4d_torus": {
        title: "4D Torus",
        content: `
            <p>The 4D Torus is an orientable manifold that represents spacetime with periodic boundary conditions in all four dimensions.</p>
            <p>This topology allows for conservation of quantum numbers and natural explanation for quantization of charge.</p>
        `
    },
    "projective_plane": {
        title: "Projective Plane",
        content: `
            <p>The 4D Projective Plane is a non-orientable manifold that has interesting implications for symmetry breaking in particle physics.</p>
            <p>Features include:</p>
            <ul>
                <li>Natural parity violation (explains weak interaction asymmetry)</li>
                <li>Single-sided nature creates inherent asymmetries</li>
                <li>Can model spontaneous symmetry breaking</li>
            </ul>
            <p>This manifold is particularly useful for understanding CP-violation and the origin of matter-antimatter asymmetry.</p>
        `
    },
    // Control parameters
    "twist_x": {
        title: "Twist X (Electric Charge)",
        content: `
            <p>The X-dimension twist parameter controls the electric charge property in the manifold model.</p>
            <p>Key points:</p>
            <ul>
                <li>Values of ±1/3 and ±2/3 correspond to quark charges</li>
                <li>Values of ±1 correspond to electron/positron charges</li>
                <li>Value of 0 corresponds to neutral particles</li>
            </ul>
            <p>This parameter is quantized due to the topological constraints of the manifold.</p>
        `
    },
    "twist_y": {
        title: "Twist Y (Weak Isospin)",
        content: `
            <p>The Y-dimension twist parameter controls weak isospin, which determines how particles interact via the weak nuclear force.</p>
            <p>Key points:</p>
            <ul>
                <li>Values of ±1/2 correspond to particles that interact with W bosons</li>
                <li>Value of 0 corresponds to right-handed fermions (not affected by weak force)</li>
                <li>Controls the "handedness" of particles</li>
            </ul>
            <p>This parameter helps explain why the weak force only affects left-handed particles.</p>
        `
    },
    "twist_z": {
        title: "Twist Z (Color Charge)",
        content: `
            <p>The Z-dimension twist parameter controls color charge, the property that allows quarks to interact via the strong nuclear force.</p>
            <p>Key points:</p>
            <ul>
                <li>Three possible states (Red, Green, Blue) plus their anti-states</li>
                <li>Combinations that sum to "white" (colorless) form stable particles</li>
                <li>Explains quark confinement and asymptotic freedom</li>
            </ul>
            <p>This parameter is essential for modeling hadron formation and stability.</p>
        `
    },
    "time_twist": {
        title: "Time Twist (Mass-Energy)",
        content: `
            <p>The Time twist parameter controls the mass-energy property of particles in the manifold model.</p>
            <p>Key points:</p>
            <ul>
                <li>Higher values correspond to heavier particles</li>
                <li>Related to the Compton wavelength of the particle</li>
                <li>Determines particle lifetime and decay rates</li>
            </ul>
            <p>This parameter connects the geometry of spacetime to the energy content of particles.</p>
        `
    },
    "loop_factor": {
        title: "Loop Factor (Quantum Numbers)",
        content: `
            <p>The Loop Factor controls how many times the manifold loops through itself before closing.</p>
            <p>Key points:</p>
            <ul>
                <li>Directly relates to quantum numbers (spin, baryon number, lepton number)</li>
                <li>Integer values correspond to bosons</li>
                <li>Half-integer values correspond to fermions</li>
                <li>Relates to the intrinsic angular momentum (spin) of particles</li>
            </ul>
            <p>This parameter is crucial for understanding the statistical properties of fundamental particles.</p>
        `
    },
    // Advanced topics
    "invariants": {
        title: "Topological Invariants",
        content: `
            <p>Topological invariants are properties that remain unchanged under continuous deformations of the manifold.</p>
            <p>Important invariants in this explorer:</p>
            <ul>
                <li><strong>Euler Characteristic:</strong> Relates to the number of particles and interactions</li>
                <li><strong>Stiefel-Whitney Classes:</strong> Indicate non-orientability and relate to parity violation</li>
                <li><strong>Intersection Form:</strong> Describes how submanifolds interact, related to particle interactions</li>
                <li><strong>Kirby-Siebenmann Invariant:</strong> Indicates if a manifold admits a smooth structure</li>
            </ul>
            <p>These invariants provide deep connections between topology and particle physics.</p>
        `
    },
    "hadron_formation": {
        title: "Hadron Formation",
        content: `
            <p>Hadron formation in manifold physics relates to how multiple sub-manifolds combine to form stable composite structures.</p>
            <p>Key concepts:</p>
            <ul>
                <li><strong>Linking Numbers:</strong> How sub-manifolds intertwine (relates to gluon exchange)</li>
                <li><strong>Charge Distribution:</strong> How electric charge is distributed across the composite structure</li>
                <li><strong>Color Neutrality:</strong> Requirement that the total color charge must be neutral</li>
                <li><strong>Stability Criteria:</strong> Topological conditions for stable hadron formation</li>
            </ul>
            <p>The Hadron Validator checks if a given configuration of sub-manifolds can form a stable hadron.</p>
        `
    }
};

// Initialize the education features when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing educational features...");
    
    // Setup the guided tour button
    setupGuidedTour();
    
    // Setup enhanced tooltips
    setupEnhancedTooltips();
});

/**
 * Sets up the guided tour functionality
 */
function setupGuidedTour() {
    const tourButton = document.getElementById('guided-tour-btn');
    if (!tourButton) {
        console.error("Guided tour button not found");
        return;
    }
    
    tourButton.addEventListener('click', function() {
        alert("Guided tour will be implemented soon!");
    });
}

/**
 * Sets up enhanced tooltips for elements with data-content attributes
 */
function setupEnhancedTooltips() {
    // Find all elements with data-content attribute
    const tooltipElements = document.querySelectorAll('[data-content]');
    
    tooltipElements.forEach(element => {
        // Create the tooltip container
        const tooltipContainer = document.createElement('span');
        tooltipContainer.className = 'enhanced-tooltip';
        
        // Create the info icon
        const infoIcon = document.createElement('i');
        infoIcon.className = 'fas fa-info-circle tooltip-icon';
        
        // Create the tooltip content
        const tooltipContent = document.createElement('div');
        tooltipContent.className = 'tooltip-content';
        tooltipContent.innerHTML = element.getAttribute('data-content');
        
        // Append elements
        tooltipContainer.appendChild(infoIcon);
        tooltipContainer.appendChild(tooltipContent);
        
        // Insert after the target element
        if (element.nextSibling) {
            element.parentNode.insertBefore(tooltipContainer, element.nextSibling);
        } else {
            element.parentNode.appendChild(tooltipContainer);
        }
    });
}

/**
 * Shows an educational modal with the specified content
 * @param {Object} options - The modal options
 * @param {string} options.title - The modal title
 * @param {string} options.content - The modal content (HTML)
 * @param {string} options.footer - The modal footer content (HTML)
 * @param {Function} options.onClose - Callback function when modal is closed
 * @param {Object} options.callbacks - Event callbacks for elements in the modal
 */
function showEducationalModal(options) {
    const modal = document.getElementById('education-modal');
    const title = document.getElementById('education-modal-title');
    const body = document.getElementById('education-modal-body');
    const footer = document.getElementById('education-modal-footer');
    
    // Set content
    title.textContent = options.title || 'Educational Content';
    body.innerHTML = options.content || '';
    footer.innerHTML = options.footer || '';
    
    // Set onClose callback
    modal.onClose = options.onClose || null;
    
    // Add event listeners for callbacks
    if (options.callbacks) {
        for (const [selector, callback] of Object.entries(options.callbacks)) {
            const elements = modal.querySelectorAll(selector);
            elements.forEach(el => {
                el.addEventListener('click', callback);
            });
        }
    }
    
    // Show the modal
    modal.style.display = 'block';
}

/**
 * Handle API requests for educational content
 * @param {string} contentKey - The key for the requested content
 * @returns {Promise} - A promise that resolves to the content
 */
function fetchEducationalContent(contentKey) {
    return new Promise((resolve, reject) => {
        // If content exists in local database, return it
        if (EDUCATION_CONTENT[contentKey]) {
            resolve(EDUCATION_CONTENT[contentKey]);
            return;
        }
        
        // Otherwise, fetch from server
        fetch(`/api/education_content/${contentKey}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                console.error('Error fetching educational content:', error);
                reject(error);
            });
    });
}

// Export functions for use in other scripts
window.educationFeatures = {
    showTooltip: function(element, contentKey) {
        const content = EDUCATION_CONTENT[contentKey];
        if (content) {
            showEducationalModal(content);
        }
    },
    startTour: setupGuidedTour,
    showModal: showEducationalModal,
    getContent: fetchEducationalContent
}; 