/**
 * Standard Model Comparison Module for 4D Manifold Explorer
 * Provides functionality to compare SKB-based models with the Standard Model of particle physics.
 */

class StandardModelComparison {
    constructor() {
        this.standardModelData = null;
        this.comparisonResults = null;
        this.selectedParticle = null;
        this.tolerances = {
            charge: 0.1,    // Acceptable difference in charge (e)
            mass: 0.15,     // Acceptable relative difference in mass
            spin: 0.5       // Acceptable difference in spin
        };
        
        // Initialize the module
        this.initialize();
    }
    
    /**
     * Initialize the Standard Model Comparison module
     */
    initialize() {
        console.log("Initializing Standard Model Comparison module");
        
        // Load Standard Model data
        this.loadStandardModelData();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Load Standard Model particle data
     */
    loadStandardModelData() {
        // Fetch data from the server
        fetch('/api/particle/all')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.standardModelData = data;
                this.updateParticleSelector();
                console.log("Standard Model data loaded", data);
            })
            .catch(error => {
                console.error("Error loading Standard Model data:", error);
                
                // Fallback to hard-coded data if fetch fails
                this.loadFallbackData();
            });
    }
    
    /**
     * Load fallback particle data (in case API is unavailable)
     */
    loadFallbackData() {
        // Hard-coded Standard Model particle data
        this.standardModelData = {
            leptons: [
                { name: "electron", display_name: "Electron", charge: -1, mass_mev: 0.511, spin: 0.5 },
                { name: "electron-neutrino", display_name: "Electron Neutrino", charge: 0, mass_mev: 0.0000022, spin: 0.5 },
                { name: "muon", display_name: "Muon", charge: -1, mass_mev: 105.66, spin: 0.5 },
                { name: "muon-neutrino", display_name: "Muon Neutrino", charge: 0, mass_mev: 0.17, spin: 0.5 },
                { name: "tau", display_name: "Tau", charge: -1, mass_mev: 1776.8, spin: 0.5 },
                { name: "tau-neutrino", display_name: "Tau Neutrino", charge: 0, mass_mev: 15.5, spin: 0.5 }
            ],
            quarks: [
                { name: "up", display_name: "Up Quark", charge: 2/3, mass_mev: 2.16, spin: 0.5 },
                { name: "down", display_name: "Down Quark", charge: -1/3, mass_mev: 4.67, spin: 0.5 },
                { name: "charm", display_name: "Charm Quark", charge: 2/3, mass_mev: 1270, spin: 0.5 },
                { name: "strange", display_name: "Strange Quark", charge: -1/3, mass_mev: 93.4, spin: 0.5 },
                { name: "top", display_name: "Top Quark", charge: 2/3, mass_mev: 172500, spin: 0.5 },
                { name: "bottom", display_name: "Bottom Quark", charge: -1/3, mass_mev: 4180, spin: 0.5 }
            ],
            bosons: [
                { name: "photon", display_name: "Photon", charge: 0, mass_mev: 0, spin: 1 },
                { name: "z-boson", display_name: "Z Boson", charge: 0, mass_mev: 91188, spin: 1 },
                { name: "w-boson", display_name: "W Boson", charge: 1, mass_mev: 80379, spin: 1 },
                { name: "gluon", display_name: "Gluon", charge: 0, mass_mev: 0, spin: 1 },
                { name: "higgs", display_name: "Higgs Boson", charge: 0, mass_mev: 125180, spin: 0 }
            ],
            hadrons: [
                { name: "proton", display_name: "Proton", charge: 1, mass_mev: 938.27, spin: 0.5, composition: ["up", "up", "down"] },
                { name: "neutron", display_name: "Neutron", charge: 0, mass_mev: 939.57, spin: 0.5, composition: ["up", "down", "down"] },
                { name: "pion+", display_name: "Pion+ (π+)", charge: 1, mass_mev: 139.57, spin: 0, composition: ["up", "anti-down"] },
                { name: "pion0", display_name: "Pion0 (π0)", charge: 0, mass_mev: 134.98, spin: 0, composition: ["up", "anti-up"] },
                { name: "kaon+", display_name: "Kaon+ (K+)", charge: 1, mass_mev: 493.68, spin: 0, composition: ["up", "anti-strange"] },
                { name: "lambda", display_name: "Lambda (Λ)", charge: 0, mass_mev: 1115.68, spin: 0.5, composition: ["up", "down", "strange"] }
            ]
        };
        
        // Update UI with fallback data
        this.updateParticleSelector();
        console.log("Loaded fallback Standard Model data");
    }
    
    /**
     * Setup event listeners for UI controls
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Particle selector
            const selector = document.getElementById('standard-model-particle');
            if (selector) {
                selector.addEventListener('change', (e) => {
                    this.selectParticle(e.target.value);
                });
            }
            
            // Compare button
            const compareBtn = document.getElementById('compare-to-sm-btn');
            if (compareBtn) {
                compareBtn.addEventListener('click', () => this.compareToStandardModel());
            }
            
            // Tolerance inputs
            const chargeToleranceInput = document.getElementById('charge-tolerance');
            if (chargeToleranceInput) {
                chargeToleranceInput.addEventListener('change', (e) => {
                    this.tolerances.charge = parseFloat(e.target.value);
                });
            }
            
            const massToleranceInput = document.getElementById('mass-tolerance');
            if (massToleranceInput) {
                massToleranceInput.addEventListener('change', (e) => {
                    this.tolerances.mass = parseFloat(e.target.value);
                });
            }
        });
    }
    
    /**
     * Update the particle selector dropdown with available particles
     */
    updateParticleSelector() {
        if (!this.standardModelData) return;
        
        const selector = document.getElementById('standard-model-particle');
        if (!selector) return;
        
        // Clear existing options
        selector.innerHTML = '<option value="">Select a particle...</option>';
        
        // Add optgroups for each particle category
        const categories = [
            { key: 'leptons', label: 'Leptons' },
            { key: 'quarks', label: 'Quarks' },
            { key: 'bosons', label: 'Bosons' },
            { key: 'hadrons', label: 'Hadrons' }
        ];
        
        categories.forEach(category => {
            if (this.standardModelData[category.key] && this.standardModelData[category.key].length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category.label;
                
                this.standardModelData[category.key].forEach(particle => {
                    const option = document.createElement('option');
                    option.value = `${category.key}:${particle.name}`;
                    option.textContent = particle.display_name;
                    optgroup.appendChild(option);
                });
                
                selector.appendChild(optgroup);
            }
        });
    }
    
    /**
     * Handle particle selection
     * @param {string} value - Selected particle value (category:name)
     */
    selectParticle(value) {
        if (!value) {
            this.selectedParticle = null;
            this.updateParticleInfo(null);
            return;
        }
        
        const [category, name] = value.split(':');
        
        if (this.standardModelData && this.standardModelData[category]) {
            this.selectedParticle = this.standardModelData[category].find(p => p.name === name);
            this.updateParticleInfo(this.selectedParticle);
        }
    }
    
    /**
     * Update the particle information display
     * @param {Object} particle - Particle data object
     */
    updateParticleInfo(particle) {
        const infoContainer = document.getElementById('sm-particle-info');
        if (!infoContainer) return;
        
        if (!particle) {
            infoContainer.innerHTML = '<p>Select a Standard Model particle to view its properties</p>';
            return;
        }
        
        let html = `
            <div class="card">
                <div class="card-header">
                    <h5>${particle.display_name}</h5>
                </div>
                <div class="card-body">
                    <ul class="particle-properties">
                        <li><strong>Charge:</strong> ${particle.charge} e</li>
                        <li><strong>Mass:</strong> ${particle.mass_mev.toFixed(particle.mass_mev < 10 ? 4 : 2)} MeV/c<sup>2</sup></li>
                        <li><strong>Spin:</strong> ${particle.spin}</li>
        `;
        
        if (particle.composition) {
            html += `
                        <li><strong>Composition:</strong> ${particle.composition.join(', ')}</li>
            `;
        }
        
        html += `
                    </ul>
                </div>
            </div>
        `;
        
        infoContainer.innerHTML = html;
    }
    
    /**
     * Compare selected SKB configuration to Standard Model
     */
    compareToStandardModel() {
        const selectedSKB = window.evolutionUI?.selectedIndividual;
        
        if (!selectedSKB) {
            this.showComparisonMessage("Please select a Sub-SKB configuration first.");
            return;
        }
        
        if (!this.selectedParticle) {
            this.showComparisonMessage("Please select a Standard Model particle for comparison.");
            return;
        }
        
        // Show loading indicator
        this.showComparisonMessage("Comparing configurations...", true);
        
        setTimeout(() => {
            // Extract properties from SKB
            const skbProperties = this.extractSKBProperties(selectedSKB);
            
            // Compare with Standard Model particle
            const comparisonResults = this.computeComparison(skbProperties, this.selectedParticle);
            
            // Display results
            this.displayComparisonResults(comparisonResults);
            
        }, 100); // Small delay to allow UI to update
    }
    
    /**
     * Extract physical properties from SKB configuration
     * @param {Object} skb - SubSKB object
     * @returns {Object} - Physical properties
     */
    extractSKBProperties(skb) {
        // Map topological properties to physical properties
        
        // Electric charge
        const charge = skb.twist_x;
        
        // Estimate mass from twist_t and topological properties
        const massEstimate = Math.abs(skb.twist_t) * 100 * (1 + Math.abs(skb.euler_characteristic) * 0.1);
        
        // Estimate spin from loop_factor
        const spinEstimate = (skb.loop_factor % 1 === 0) ? 1 : 0.5;
        
        return {
            charge: charge,
            mass_mev: massEstimate,
            spin: spinEstimate,
            orientable: skb.orientable,
            euler_characteristic: skb.euler_characteristic,
            stiefel_whitney: skb.stiefel_whitney_class
        };
    }
    
    /**
     * Compute comparison between SKB and Standard Model particle
     * @param {Object} skbProperties - Properties extracted from SKB
     * @param {Object} smParticle - Standard Model particle data
     * @returns {Object} - Comparison results
     */
    computeComparison(skbProperties, smParticle) {
        // Calculate differences
        const chargeDiff = Math.abs(skbProperties.charge - smParticle.charge);
        
        // For mass, use relative difference
        const massRelDiff = smParticle.mass_mev > 0 ? 
            Math.abs(skbProperties.mass_mev - smParticle.mass_mev) / smParticle.mass_mev : 
            (skbProperties.mass_mev > 1 ? 1 : 0);
        
        const spinDiff = Math.abs(skbProperties.spin - smParticle.spin);
        
        // Calculate match scores (0-1, where 1 is perfect match)
        const chargeScore = Math.max(0, 1 - chargeDiff / Math.max(0.1, this.tolerances.charge));
        const massScore = Math.max(0, 1 - massRelDiff / this.tolerances.mass);
        const spinScore = Math.max(0, 1 - spinDiff / this.tolerances.spin);
        
        // Overall match score (weighted average)
        const overallScore = (
            chargeScore * 0.4 + 
            massScore * 0.4 + 
            spinScore * 0.2
        );
        
        // Determine if it's a match based on tolerances
        const isMatch = (
            chargeDiff <= this.tolerances.charge &&
            massRelDiff <= this.tolerances.mass &&
            spinDiff <= this.tolerances.spin
        );
        
        return {
            skbProperties: skbProperties,
            smParticle: smParticle,
            differences: {
                charge: chargeDiff,
                massRelative: massRelDiff,
                spin: spinDiff
            },
            scores: {
                charge: chargeScore,
                mass: massScore,
                spin: spinScore,
                overall: overallScore
            },
            isMatch: isMatch
        };
    }
    
    /**
     * Display comparison results
     * @param {Object} results - Comparison results
     */
    displayComparisonResults(results) {
        const resultsContainer = document.getElementById('comparison-results');
        if (!resultsContainer) return;
        
        // Clear loading indicator
        this.showComparisonMessage("");
        
        // Format score as percentage
        const formatScore = (score) => `${(score * 100).toFixed(1)}%`;
        
        // Create colored badge for score
        const scoreBadge = (score) => {
            let colorClass = 'badge-danger';
            if (score >= 0.8) colorClass = 'badge-success';
            else if (score >= 0.5) colorClass = 'badge-warning';
            
            return `<span class="badge ${colorClass}">${formatScore(score)}</span>`;
        };
        
        // Create the results HTML
        let html = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5>Comparison Results</h5>
                    <div class="overall-score">
                        <span class="mr-2">Overall Match:</span>
                        ${scoreBadge(results.scores.overall)}
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Property</th>
                                    <th>SKB Value</th>
                                    <th>Standard Model Value</th>
                                    <th>Difference</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Electric Charge</td>
                                    <td>${results.skbProperties.charge.toFixed(2)} e</td>
                                    <td>${results.smParticle.charge} e</td>
                                    <td>${results.differences.charge.toFixed(2)} e</td>
                                    <td>${scoreBadge(results.scores.charge)}</td>
                                </tr>
                                <tr>
                                    <td>Mass</td>
                                    <td>${results.skbProperties.mass_mev.toFixed(2)} MeV/c<sup>2</sup></td>
                                    <td>${results.smParticle.mass_mev.toFixed(2)} MeV/c<sup>2</sup></td>
                                    <td>${(results.differences.massRelative * 100).toFixed(1)}%</td>
                                    <td>${scoreBadge(results.scores.mass)}</td>
                                </tr>
                                <tr>
                                    <td>Spin</td>
                                    <td>${results.skbProperties.spin}</td>
                                    <td>${results.smParticle.spin}</td>
                                    <td>${results.differences.spin.toFixed(1)}</td>
                                    <td>${scoreBadge(results.scores.spin)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-3">
                        <h6>Interpretation:</h6>
                        <p>${this.generateInterpretation(results)}</p>
                    </div>
                    
                    <div class="mt-3">
                        <h6>SKB Topological Properties:</h6>
                        <ul>
                            <li><strong>Orientable:</strong> ${results.skbProperties.orientable ? 'Yes' : 'No'}</li>
                            <li><strong>Euler Characteristic:</strong> ${results.skbProperties.euler_characteristic}</li>
                            <li><strong>Stiefel-Whitney Class:</strong> ${results.skbProperties.stiefel_whitney || 'N/A'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        resultsContainer.innerHTML = html;
    }
    
    /**
     * Generate interpretation text based on comparison results
     * @param {Object} results - Comparison results
     * @returns {string} - Interpretation text
     */
    generateInterpretation(results) {
        if (results.isMatch) {
            return `This SKB configuration is a good match for a ${results.smParticle.display_name.toLowerCase()}. 
                    The topological properties align well with the expected quantum numbers for this particle type.
                    The ${results.skbProperties.orientable ? 'orientable' : 'non-orientable'} nature of this SKB is consistent with 
                    the expected behavior of this particle class.`;
        } else if (results.scores.overall >= 0.7) {
            return `This SKB configuration shows strong similarity to a ${results.smParticle.display_name.toLowerCase()}, 
                    but with some notable differences. With refinement of the parameters, particularly 
                    ${results.scores.charge < 0.8 ? 'electric charge (twist_x)' : 
                      results.scores.mass < 0.8 ? 'mass-energy (twist_t)' : 'spin (loop_factor)'}, 
                    it could potentially represent this particle type.`;
        } else if (results.scores.overall >= 0.4) {
            return `This SKB configuration shows moderate similarity to a ${results.smParticle.display_name.toLowerCase()}, 
                    but significant differences exist. The topological properties suggest it might better represent 
                    a different particle type or require substantial parameter adjustments.`;
        } else {
            return `This SKB configuration does not match a ${results.smParticle.display_name.toLowerCase()}. 
                    The topological properties are substantially different from what would be expected. 
                    Consider trying a different particle type for comparison or adjusting the SKB parameters significantly.`;
        }
    }
    
    /**
     * Show a message in the comparison status area
     * @param {string} message - Message to display
     * @param {boolean} isLoading - Whether to show loading spinner
     */
    showComparisonMessage(message, isLoading = false) {
        const statusDiv = document.getElementById('comparison-status');
        if (!statusDiv) return;
        
        if (!message) {
            statusDiv.innerHTML = '';
            return;
        }
        
        if (isLoading) {
            statusDiv.innerHTML = `<div class="alert alert-info">
                <i class="fas fa-spinner fa-spin mr-2"></i> ${message}
            </div>`;
        } else {
            statusDiv.innerHTML = `<div class="alert alert-info">
                <i class="fas fa-info-circle mr-2"></i> ${message}
            </div>`;
        }
    }
}

// Initialize the Standard Model Comparison module when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.standardModelComparison = new StandardModelComparison();
}); 