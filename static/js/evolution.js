/**
 * SKB Evolution Algorithm
 * 
 * This module implements an evolutionary algorithm to evolve Sub-SKBs (sub-Spacetime Klein Bottles)
 * to find topologically compatible configurations for forming stable hadrons.
 */

// Class to represent a Sub-SKB individual in the population
class SubSKB {
    constructor(params = null) {
        // Generate random parameters if none provided
        if (!params) {
            this.parameters = {
                // Twist parameters in 3D
                tx: this.randomInRange(-5, 5),
                ty: this.randomInRange(-5, 5),
                tz: this.randomInRange(-5, 5),
                // Spacetime curvature
                curvature: this.randomInRange(0, 2),
                // Topological genus parameter (determines number of holes)
                genus: Math.floor(this.randomInRange(0, 3)),
                // Orientability parameter (0 = orientable, 1 = non-orientable)
                orientability: Math.random() > 0.5 ? 1 : 0,
                // Manifold dimension parameter (typically 4 for SKBs)
                dimension: 4
            };
        } else {
            this.parameters = params;
        }
        
        // Calculate and cache topological properties
        this.properties = this.calculateTopologicalProperties();
        
        // Fitness is initially undefined until evaluated
        this.fitness = undefined;
    }
    
    // Helper for random number generation
    randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Calculate topological invariants based on the parameters
    calculateTopologicalProperties() {
        const { tx, ty, tz, curvature, genus, orientability, dimension } = this.parameters;
        
        // First Stiefel-Whitney class (w₁) - related to orientability
        // For orientable manifolds, w₁ = 0
        const w1 = orientability;
        
        // Euler characteristic calculation
        // For a surface of genus g: χ = 2 - 2g (orientable) or χ = 2 - g (non-orientable)
        let eulerCharacteristic;
        if (orientability === 0) {
            // Orientable case
            eulerCharacteristic = 2 - 2 * genus;
        } else {
            // Non-orientable case
            eulerCharacteristic = 2 - genus;
        }
        
        // Fundamental group representation (simplified)
        // This would normally be much more complex
        let fundamentalGroup;
        if (genus === 0 && orientability === 0) {
            fundamentalGroup = "Z"; // Sphere: trivial group
        } else if (genus === 1 && orientability === 0) {
            fundamentalGroup = "Z × Z"; // Torus: product of two cyclic groups
        } else if (orientability === 1 && genus === 1) {
            fundamentalGroup = "Z ⋊ Z"; // Klein bottle: semidirect product
        } else {
            fundamentalGroup = "Complex"; // More complex group structure
        }
        
        // Intersection form (quadratic form on the middle homology)
        // This is a significant simplification
        let intersectionForm;
        if (orientability === 0) {
            // For orientable 4-manifolds, the intersection form is a symmetric
            // bilinear form that can be represented by a matrix
            const eigenvalue1 = tx > 0 ? 1 : -1;
            const eigenvalue2 = ty > 0 ? 1 : -1;
            
            if (eigenvalue1 * eigenvalue2 > 0) {
                intersectionForm = "Positive Definite";
            } else if (eigenvalue1 * eigenvalue2 < 0) {
                intersectionForm = "Indefinite";
            } else {
                intersectionForm = "Degenerate";
            }
        } else {
            // For non-orientable 4-manifolds, the intersection form is more complex
            intersectionForm = "Non-orientable";
        }
        
        // Kirby-Siebenmann invariant (ks) - obstruction to smoothability
        // This is a simplification; in reality, this is much more complex
        const ks = (Math.abs(tx * ty * tz) > 3) ? 1 : 0;
        
        return {
            w1,
            eulerCharacteristic,
            fundamentalGroup,
            intersectionForm,
            ks
        };
    }
    
    // Clone this individual
    clone() {
        return new SubSKB({...this.parameters});
    }
    
    // Apply mutation to parameters
    mutate(mutationRate) {
        const newParams = {...this.parameters};
        
        // Helper function to maybe mutate a numeric parameter
        const maybeChange = (param, min, max, isInteger = false) => {
            if (Math.random() < mutationRate) {
                let change = this.randomInRange(-1, 1);
                if (isInteger) {
                    change = Math.round(change);
                }
                let newValue = this.parameters[param] + change;
                newValue = Math.max(min, Math.min(max, newValue));
                return newValue;
            }
            return this.parameters[param];
        };
        
        // Mutate continuous parameters
        newParams.tx = maybeChange('tx', -5, 5);
        newParams.ty = maybeChange('ty', -5, 5);
        newParams.tz = maybeChange('tz', -5, 5);
        newParams.curvature = maybeChange('curvature', 0, 2);
        
        // Mutate discrete parameters
        newParams.genus = maybeChange('genus', 0, 3, true);
        
        // Mutate binary parameters with small probability
        if (Math.random() < mutationRate / 2) {
            newParams.orientability = 1 - this.parameters.orientability; // Flip 0 to 1 or 1 to 0
        }
        
        return new SubSKB(newParams);
    }
    
    // Generate 3D visualization data
    generateVisualizationData(t = 0) {
        const { tx, ty, tz, curvature, genus } = this.parameters;
        
        // Number of points in u and v directions
        const nu = 50;
        const nv = 20;
        
        // Generate parametric grid
        const u = Array.from({length: nu}, (_, i) => i * 2 * Math.PI / (nu - 1));
        const v = Array.from({length: nv}, (_, i) => i * 2 * Math.PI / (nv - 1) - Math.PI);
        
        // Arrays to hold the 3D coordinates
        const x = [];
        const y = [];
        const z = [];
        
        // Generate the surface points
        for (let i = 0; i < nu; i++) {
            const row_x = [];
            const row_y = [];
            const row_z = [];
            
            for (let j = 0; j < nv; j++) {
                // Basic torus-like structure
                const r1 = 2 + curvature; // Major radius
                const r2 = 1; // Minor radius
                
                // Apply twists and genus deformation
                const theta = u[i] + tx * t / 5;
                const phi = v[j] + ty * t / 5;
                
                // Genus deformation - create "holes" by modifying the radius
                let r2_mod = r2;
                if (genus > 0) {
                    for (let g = 0; g < genus; g++) {
                        const goffset = 2 * Math.PI * g / genus;
                        r2_mod -= 0.2 * Math.exp(-5 * (theta - goffset) * (theta - goffset));
                    }
                }
                
                // Generate coordinates with twists
                let x_val, y_val, z_val;
                
                if (this.parameters.orientability === 0) {
                    // Orientable manifold (torus-like)
                    x_val = (r1 + r2_mod * Math.cos(phi)) * Math.cos(theta);
                    y_val = (r1 + r2_mod * Math.cos(phi)) * Math.sin(theta);
                    z_val = r2_mod * Math.sin(phi);
                } else {
                    // Non-orientable manifold (Klein bottle-like immersion)
                    if (theta < Math.PI) {
                        x_val = (r1 + r2_mod * Math.cos(phi)) * Math.cos(theta);
                        y_val = (r1 + r2_mod * Math.cos(phi)) * Math.sin(theta);
                        z_val = r2_mod * Math.sin(phi);
                    } else {
                        x_val = (r1 + r2_mod * Math.cos(phi)) * Math.cos(theta);
                        y_val = (r1 + r2_mod * Math.cos(phi)) * Math.sin(theta);
                        z_val = r2_mod * Math.sin(-phi); // Flip for twist
                    }
                }
                
                // Apply tz to create a more complex twist in z-direction
                z_val += 0.2 * Math.sin(tz * theta);
                
                row_x.push(x_val);
                row_y.push(y_val);
                row_z.push(z_val);
            }
            
            x.push(row_x);
            y.push(row_y);
            z.push(row_z);
        }
        
        return { x, y, z };
    }
}

// The evolutionary algorithm class
class EvolutionaryAlgorithm {
    constructor(options = {}) {
        // Set default options
        this.options = {
            populationSize: 20,
            mutationRate: 0.1,
            selectionPressure: 3, // Tournament size
            targetEulerCharacteristic: 0,
            targetOrientability: 'orientable', // 'orientable' or 'non-orientable'
            targetIntersectionForm: 'positive-definite', // 'positive-definite', 'negative-definite', or 'indefinite'
            w1Weight: 1.0, // Weight for Stiefel-Whitney compatibility
            eulerWeight: 1.0, // Weight for Euler characteristic matching
            qWeight: 1.0, // Weight for intersection form
            ...options
        };
        
        // Initialize population
        this.population = [];
        this.generation = 0;
        this.compatiblePairs = 0;
        this.bestFitness = 0;
        
        this.initializePopulation();
    }
    
    // Create initial random population
    initializePopulation() {
        this.population = [];
        for (let i = 0; i < this.options.populationSize; i++) {
            this.population.push(new SubSKB());
        }
        this.evaluatePopulation();
    }
    
    // Evaluate fitness for all individuals in the population
    evaluatePopulation() {
        // Calculate compatibility between all pairs
        let compatiblePairsCount = 0;
        
        for (let i = 0; i < this.population.length; i++) {
            let totalFitness = 0;
            let compatCount = 0;
            
            for (let j = 0; j < this.population.length; j++) {
                if (i !== j) {
                    const pairFitness = this.calculateCompatibility(
                        this.population[i], 
                        this.population[j]
                    );
                    
                    totalFitness += pairFitness;
                    
                    // Count as compatible if fitness is above threshold
                    if (pairFitness > 0.7) {
                        compatCount++;
                    }
                }
            }
            
            // Assign the average compatibility as fitness
            this.population[i].fitness = totalFitness / (this.population.length - 1);
            this.population[i].compatibleCount = compatCount;
        }
        
        // Count total compatible pairs (divide by 2 since we count each pair twice)
        compatiblePairsCount = this.population.reduce((sum, ind) => sum + ind.compatibleCount, 0) / 2;
        this.compatiblePairs = compatiblePairsCount;
        
        // Find best fitness
        this.bestFitness = Math.max(...this.population.map(ind => ind.fitness));
    }
    
    // Calculate topological compatibility between two Sub-SKBs
    calculateCompatibility(skb1, skb2) {
        const p1 = skb1.properties;
        const p2 = skb2.properties;
        
        // 1. Stiefel-Whitney compatibility
        // For orientable manifolds connected to non-orientable ones, w₁ can change
        // This is a simplified version of a complex topological calculation
        const w1Compatibility = (p1.w1 === p2.w1) ? 1.0 : 0.5;
        
        // 2. Euler characteristic compatibility
        // Ideally, we want the sum to match our target
        const sumEuler = p1.eulerCharacteristic + p2.eulerCharacteristic;
        const targetEuler = this.options.targetEulerCharacteristic;
        // Normalize: higher score for closer match
        const eulerDifference = Math.abs(sumEuler - targetEuler);
        const eulerCompatibility = 1.0 / (1.0 + eulerDifference);
        
        // 3. Intersection form compatibility
        // This is highly simplified; in reality, would involve complex calculations
        let qCompatibility = 0.5; // Default moderate compatibility
        
        const targetForm = this.options.targetIntersectionForm;
        if (targetForm === 'positive-definite') {
            if (p1.intersectionForm === 'Positive Definite' && p2.intersectionForm === 'Positive Definite') {
                qCompatibility = 1.0;
            } else if (p1.intersectionForm === 'Indefinite' || p2.intersectionForm === 'Indefinite') {
                qCompatibility = 0.3;
            }
        } else if (targetForm === 'negative-definite') {
            if (p1.intersectionForm === 'Negative Definite' && p2.intersectionForm === 'Negative Definite') {
                qCompatibility = 1.0;
            } else if (p1.intersectionForm === 'Indefinite' || p2.intersectionForm === 'Indefinite') {
                qCompatibility = 0.3;
            }
        } else { // indefinite
            if (p1.intersectionForm === 'Indefinite' || p2.intersectionForm === 'Indefinite') {
                qCompatibility = 0.8;
            }
        }
        
        // Combine scores with weights
        const fitness = (
            this.options.w1Weight * w1Compatibility +
            this.options.eulerWeight * eulerCompatibility +
            this.options.qWeight * qCompatibility
        ) / (this.options.w1Weight + this.options.eulerWeight + this.options.qWeight);
        
        return fitness;
    }
    
    // Tournament selection
    select() {
        const tournamentSize = this.options.selectionPressure;
        
        // Select tournamentSize random individuals
        const indices = [];
        for (let i = 0; i < tournamentSize; i++) {
            indices.push(Math.floor(Math.random() * this.population.length));
        }
        
        // Find the best one
        let bestIndex = indices[0];
        for (let i = 1; i < indices.length; i++) {
            if (this.population[indices[i]].fitness > this.population[bestIndex].fitness) {
                bestIndex = indices[i];
            }
        }
        
        return this.population[bestIndex];
    }
    
    // Run one generation of evolution
    evolve() {
        // Create new population with the same size
        const newPopulation = [];
        
        // Elitism: keep the best individual
        const sortedPop = [...this.population].sort((a, b) => b.fitness - a.fitness);
        newPopulation.push(sortedPop[0].clone());
        
        // Generate rest of the population through selection and mutation
        while (newPopulation.length < this.options.populationSize) {
            // Select parent
            const parent = this.select();
            
            // Create mutated offspring
            const offspring = parent.mutate(this.options.mutationRate);
            
            // Add to new population
            newPopulation.push(offspring);
        }
        
        // Replace population
        this.population = newPopulation;
        
        // Evaluate new population
        this.evaluatePopulation();
        
        // Increment generation counter
        this.generation++;
        
        return {
            generation: this.generation,
            bestFitness: this.bestFitness,
            compatiblePairs: this.compatiblePairs,
            population: this.population
        };
    }
    
    // Get current state of the algorithm
    getState() {
        return {
            generation: this.generation,
            populationSize: this.options.populationSize,
            bestFitness: this.bestFitness,
            compatiblePairs: this.compatiblePairs,
            population: this.population
        };
    }
    
    // Update algorithm options
    updateOptions(newOptions) {
        this.options = {
            ...this.options,
            ...newOptions
        };
        
        // If population size changed, adjust population
        if (newOptions.populationSize && newOptions.populationSize !== this.population.length) {
            if (newOptions.populationSize > this.population.length) {
                // Add new individuals
                const toAdd = newOptions.populationSize - this.population.length;
                for (let i = 0; i < toAdd; i++) {
                    this.population.push(new SubSKB());
                }
            } else {
                // Remove excess individuals (keep the best ones)
                this.population.sort((a, b) => b.fitness - a.fitness);
                this.population = this.population.slice(0, newOptions.populationSize);
            }
            
            this.evaluatePopulation();
        }
    }
}

// UI Controller for the evolutionary algorithm
class EvolutionUI {
    constructor() {
        this.algorithm = null;
        this.selectedIndividual = null;
        this.running = false;
        this.runInterval = null;
        
        // Initialize the UI
        this.initUI();
    }
    
    initUI() {
        // Initialize algorithm with default settings
        this.algorithm = new EvolutionaryAlgorithm();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update UI with initial state
        this.updateUI();
        
        // Initialize visualization
        this.initVisualization();
    }
    
    setupEventListeners() {
        // Algorithm control buttons
        document.getElementById('step-btn').addEventListener('click', () => this.step());
        document.getElementById('run-btn').addEventListener('click', () => this.toggleRun());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        
        // Parameter sliders
        document.getElementById('population-size-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('mutation-rate-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('selection-pressure-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        
        // Fitness function weights
        document.getElementById('w1-weight-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('euler-weight-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('q-weight-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        
        // Target values
        document.getElementById('target-euler-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('target-orientability').addEventListener('change', () => this.updateAlgorithmOptions());
        document.getElementById('target-q-form').addEventListener('change', () => this.updateAlgorithmOptions());
    }
    
    updateAlgorithmOptions() {
        const options = {
            populationSize: parseInt(document.getElementById('population-size-slider').value),
            mutationRate: parseFloat(document.getElementById('mutation-rate-slider').value),
            selectionPressure: parseInt(document.getElementById('selection-pressure-slider').value),
            targetEulerCharacteristic: parseInt(document.getElementById('target-euler-slider').value),
            targetOrientability: document.getElementById('target-orientability').value,
            targetIntersectionForm: document.getElementById('target-q-form').value,
            w1Weight: parseFloat(document.getElementById('w1-weight-slider').value),
            eulerWeight: parseFloat(document.getElementById('euler-weight-slider').value),
            qWeight: parseFloat(document.getElementById('q-weight-slider').value)
        };
        
        this.algorithm.updateOptions(options);
        
        // Update UI to reflect changes
        this.updateUI();
    }
    
    step() {
        // Run one generation
        const result = this.algorithm.evolve();
        
        // Update UI
        this.updateUI();
        
        // Update visualization
        this.updateVisualization();
        
        return result;
    }
    
    toggleRun() {
        if (this.running) {
            // Stop running
            clearInterval(this.runInterval);
            this.running = false;
            document.getElementById('run-icon').className = 'fas fa-play';
            document.getElementById('run-text').textContent = 'Run';
        } else {
            // Start running
            this.running = true;
            document.getElementById('run-icon').className = 'fas fa-pause';
            document.getElementById('run-text').textContent = 'Pause';
            
            this.runInterval = setInterval(() => {
                this.step();
            }, 500); // Step every 500ms
        }
    }
    
    reset() {
        // Stop running if active
        if (this.running) {
            clearInterval(this.runInterval);
            this.running = false;
            document.getElementById('run-icon').className = 'fas fa-play';
            document.getElementById('run-text').textContent = 'Run';
        }
        
        // Reset algorithm
        this.algorithm.initializePopulation();
        
        // Reset selected individual
        this.selectedIndividual = null;
        
        // Update UI
        this.updateUI();
        
        // Update visualization
        this.updateVisualization();
    }
    
    updateUI() {
        // Update generation info
        document.getElementById('generation-count').textContent = this.algorithm.generation;
        document.getElementById('population-size').textContent = this.algorithm.options.populationSize;
        document.getElementById('best-fitness').textContent = this.algorithm.bestFitness.toFixed(2);
        document.getElementById('compatible-count').textContent = this.algorithm.compatiblePairs;
        
        // Update population grid
        this.updatePopulationGrid();
        
        // Update selected individual details if any
        this.updateSelectedDetails();
    }
    
    updatePopulationGrid() {
        const grid = document.getElementById('population-grid');
        grid.innerHTML = '';
        
        // Sort population by fitness
        const sortedPop = [...this.algorithm.population].sort((a, b) => b.fitness - a.fitness);
        
        // Create cards for each individual
        sortedPop.forEach((individual, index) => {
            const card = document.createElement('div');
            card.className = 'population-card';
            
            // Add compatibility class based on compatible count
            if (individual.compatibleCount > this.algorithm.population.length / 3) {
                card.classList.add('compatible');
            } else if (individual.compatibleCount > 0) {
                card.classList.add('neutral');
            } else {
                card.classList.add('incompatible');
            }
            
            // Highlight if selected
            if (this.selectedIndividual === individual) {
                card.classList.add('highlighted');
            }
            
            // Add card content
            card.innerHTML = `
                <h4>Sub-SKB #${index + 1}</h4>
                <div class="property-row">
                    <span class="property-name">Fitness:</span>
                    <span class="property-value">${individual.fitness.toFixed(2)}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">Orientable:</span>
                    <span class="property-value">${individual.properties.w1 === 0 ? 'Yes' : 'No'}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">Compatible:</span>
                    <span class="property-value">${individual.compatibleCount}</span>
                </div>
            `;
            
            // Add click handler
            card.addEventListener('click', () => {
                this.selectIndividual(individual);
            });
            
            grid.appendChild(card);
        });
    }
    
    selectIndividual(individual) {
        this.selectedIndividual = individual;
        
        // Update UI
        this.updatePopulationGrid();
        this.updateSelectedDetails();
        
        // Update visualization to show selected individual
        this.updateVisualization();
    }
    
    updateSelectedDetails() {
        if (this.selectedIndividual) {
            document.getElementById('sub-skb-details').innerHTML = `
                <h4>Parameters:</h4>
                <div class="property-row">
                    <span class="property-name">tx:</span>
                    <span class="property-value">${this.selectedIndividual.parameters.tx.toFixed(2)}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">ty:</span>
                    <span class="property-value">${this.selectedIndividual.parameters.ty.toFixed(2)}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">tz:</span>
                    <span class="property-value">${this.selectedIndividual.parameters.tz.toFixed(2)}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">Curvature:</span>
                    <span class="property-value">${this.selectedIndividual.parameters.curvature.toFixed(2)}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">Genus:</span>
                    <span class="property-value">${this.selectedIndividual.parameters.genus}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">Orientability:</span>
                    <span class="property-value">${this.selectedIndividual.parameters.orientability === 0 ? 'Orientable' : 'Non-orientable'}</span>
                </div>
            `;
            
            // Show topological properties
            document.getElementById('selected-properties').style.display = 'block';
            document.getElementById('selected-w1').textContent = this.selectedIndividual.properties.w1 === 0 ? '0 (Orientable)' : '1 (Non-orientable)';
            document.getElementById('selected-euler').textContent = this.selectedIndividual.properties.eulerCharacteristic;
            document.getElementById('selected-pi1').textContent = this.selectedIndividual.properties.fundamentalGroup;
            document.getElementById('selected-q').textContent = this.selectedIndividual.properties.intersectionForm;
            document.getElementById('selected-ks').textContent = this.selectedIndividual.properties.ks === 0 ? '0 (Smoothable)' : '1 (Non-smoothable)';
            document.getElementById('selected-fitness').textContent = this.selectedIndividual.fitness.toFixed(3);
            
        } else {
            document.getElementById('sub-skb-details').innerHTML = '<p>Select a Sub-SKB from the population to see details</p>';
            document.getElementById('selected-properties').style.display = 'none';
        }
    }
    
    initVisualization() {
        // Initialize the 3D plot using Plotly
        const data = [];
        
        // Create empty surface plot
        const surface = {
            type: 'surface',
            x: [[0, 0], [0, 0]],
            y: [[0, 0], [0, 0]],
            z: [[0, 0], [0, 0]],
            colorscale: 'Viridis',
            showscale: false,
            contours: {
                x: { show: true, width: 1, color: 'rgba(255,255,255,0.3)' },
                y: { show: true, width: 1, color: 'rgba(255,255,255,0.3)' },
                z: { show: true, width: 1, color: 'rgba(255,255,255,0.3)' }
            }
        };
        
        data.push(surface);
        
        const layout = {
            title: 'Sub-SKB Visualization',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            scene: {
                xaxis: { title: 'X', showgrid: true, zeroline: false, showline: true, showticklabels: true, gridcolor: 'rgba(255,255,255,0.1)' },
                yaxis: { title: 'Y', showgrid: true, zeroline: false, showline: true, showticklabels: true, gridcolor: 'rgba(255,255,255,0.1)' },
                zaxis: { title: 'Z', showgrid: true, zeroline: false, showline: true, showticklabels: true, gridcolor: 'rgba(255,255,255,0.1)' },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                },
                aspectratio: { x: 1, y: 1, z: 1 }
            },
            margin: { l: 0, r: 0, b: 0, t: 30 },
            autosize: true
        };
        
        Plotly.newPlot('evolution-plot', data, layout, { responsive: true });
    }
    
    updateVisualization() {
        // Get data for visualization
        let visualData;
        
        if (this.selectedIndividual) {
            // Show selected individual
            visualData = this.selectedIndividual.generateVisualizationData();
        } else if (this.algorithm.population.length > 0) {
            // Show best individual
            const bestInd = [...this.algorithm.population].sort((a, b) => b.fitness - a.fitness)[0];
            visualData = bestInd.generateVisualizationData();
        } else {
            return; // No data to visualize
        }
        
        // Update the plot
        const update = {
            x: [visualData.x],
            y: [visualData.y],
            z: [visualData.z]
        };
        
        Plotly.update('evolution-plot', update, {}, [0]);
    }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const ui = new EvolutionUI();
    console.log("Evolutionary Programming interface loaded");
    
    // Store reference to UI globally for debugging
    window.evolutionUI = ui;
}); 