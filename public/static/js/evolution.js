/**
 * SKB Evolution Algorithm
 * 
 * This module implements an evolutionary algorithm to evolve Sub-SKBs (sub-Spacetime Klein Bottles)
 * to find topologically compatible configurations for forming stable hadrons.
 */

// Class to represent a Sub-SKB individual in the population
class SubSKB {
    static nextId = 1;

    constructor(params = null) {
        // Generate unique ID
        this.id = SubSKB.nextId++;
        
        // Generate random parameters if none provided
        if (!params) {
            // Each individual now represents three sub-SKBs defined by twist numbers T_i
            this.twists = [
                Math.round(this.randomInRange(-3, 3)), // T1
                Math.round(this.randomInRange(-3, 3)), // T2
                Math.round(this.randomInRange(-3, 3))  // T3
            ];
            
            // Keep original parameters for backward compatibility and visualization
            this.parameters = {
                tx: this.twists[0],
                ty: this.twists[1],
                tz: this.twists[2],
                tt: this.randomInRange(-1, 1),
                curvature: this.randomInRange(0, 2),
                genus: Math.floor(this.randomInRange(0, 3)),
                orientability: Math.random() > 0.5 ? 1 : 0,
                dimension: 4
            };
        } else {
            if (params.twists) {
                this.twists = [...params.twists];
                // Sync with parameters for backward compatibility
                this.parameters = {
                    ...params,
                    tx: this.twists[0],
                    ty: this.twists[1],
                    tz: this.twists[2]
                };
            } else {
                // Handle legacy format
                this.parameters = params;
                this.twists = [
                    Math.round(params.tx),
                    Math.round(params.ty),
                    Math.round(params.tz)
                ];
            }
        }
        
        // Calculate charges for each sub-SKB
        this.charges = this.twists.map(t => t / 3);
        
        // Calculate total charge
        this.totalCharge = this.charges.reduce((sum, q) => sum + q, 0);
        
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
        // Clone the current twist values
        const newTwists = [...this.twists];
        
        // Mutate each twist with a random integer delta from normal distribution
        for (let i = 0; i < newTwists.length; i++) {
            if (Math.random() < mutationRate) {
                // Generate a random mutation from normal distribution
                // Box-Muller transform to get normally distributed numbers
                let u1 = Math.random();
                let u2 = Math.random();
                let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                
                // Scale for standard deviation of 1
                let delta = Math.round(z0);
                
                // Apply the mutation
                newTwists[i] += delta;
                
                // Constrain to reasonable range (-5 to 5)
                newTwists[i] = Math.max(-5, Math.min(5, newTwists[i]));
            }
        }
        
        // Create new parameters for backward compatibility
        const newParams = {...this.parameters};
        newParams.tx = newTwists[0];
        newParams.ty = newTwists[1];
        newParams.tz = newTwists[2];
        
        // Maybe mutate other parameters (with lower probability)
        if (Math.random() < mutationRate / 2) {
            newParams.tt = this.parameters.tt + this.randomInRange(-0.2, 0.2);
            newParams.tt = Math.max(-1, Math.min(1, newParams.tt));
        }
        
        if (Math.random() < mutationRate / 3) {
            newParams.curvature = this.parameters.curvature + this.randomInRange(-0.2, 0.2);
            newParams.curvature = Math.max(0, Math.min(2, newParams.curvature));
        }
        
        if (Math.random() < mutationRate / 4) {
            newParams.genus = Math.floor(this.randomInRange(0, 3));
        }
        
        if (Math.random() < mutationRate / 5) {
            newParams.orientability = 1 - this.parameters.orientability;
        }
        
        // Create a new individual with the mutated parameters
        const newIndividual = new SubSKB({
            ...newParams,
            twists: newTwists
        });
        
        return newIndividual;
    }
    
    // Generate 3D visualization data
    generateVisualizationData(parameters) {
        console.log("Generating visualization data with parameters:", parameters);
        
        // Extract parameters
        const { tx, ty, tz, tt, curvature, genus } = parameters;
        
        // Generate a klein bottle or torus based on genus
        if (genus < 1) {
            return this.generateKleinBottle(tx, ty, tz, tt, curvature);
        } else {
            return this.generateTorus(tx, ty, tz, tt, curvature);
        }
    }
    
    generateKleinBottle(tx, ty, tz, tt, curvature) {
        console.log("Generating Klein bottle visualization");
        const u = Array.from({ length: 30 }, (_, i) => (i / 29) * 2 * Math.PI);
        const v = Array.from({ length: 30 }, (_, i) => (i / 29) * 2 * Math.PI);
        
        const x = [];
        const y = [];
        const z = [];
        
        for (let i = 0; i < u.length; i++) {
            for (let j = 0; j < v.length; j++) {
                // Klein bottle parametric equations with twist modifications
                let r = 4 * (1 - Math.cos(u[i])/2) * curvature;
                
                // Apply twist parameters
                let xCoord = r * Math.cos(v[j]) * (1 + Math.sin(tx * u[i]) * 0.2);
                let yCoord = r * Math.sin(v[j]) * (1 + Math.cos(ty * u[i]) * 0.2);
                
                if (u[i] >= Math.PI) {
                    // The "twist" part of the Klein bottle
                    xCoord = r * Math.cos(v[j] + Math.PI) * (1 + Math.sin(tz * u[i]) * 0.2);
                    // Time twist effect
                    if (tt !== 0) {
                        yCoord *= (1 + 0.2 * Math.sin(tt * v[j]));
                    }
                }
                
                let zCoord = (u[i] < Math.PI ? 
                    -2 * (1 - Math.cos(u[i])) * Math.sin(u[i]) : 
                    -2 * (1 - Math.cos(u[i])) * Math.sin(u[i]) + 3);
                
                // Uniform scaling factor for better visualization
                const scaleFactor = 0.35; // Slightly smaller for better view
                xCoord *= scaleFactor;
                yCoord *= scaleFactor;
                zCoord *= scaleFactor;
                
                x.push(xCoord);
                y.push(yCoord);
                z.push(zCoord);
            }
        }
        
        return { x, y, z };
    }
    
    generateTorus(tx, ty, tz, tt, curvature) {
        console.log("Generating torus visualization");
        const u = Array.from({ length: 30 }, (_, i) => (i / 29) * 2 * Math.PI);
        const v = Array.from({ length: 30 }, (_, i) => (i / 29) * 2 * Math.PI);
        
        const x = [];
        const y = [];
        const z = [];
        
        // Adjust radius based on curvature while maintaining good proportions
        const R = 2 * curvature; // Major radius
        const r = 0.8 * curvature; // Minor radius
        
        for (let i = 0; i < u.length; i++) {
            for (let j = 0; j < v.length; j++) {
                // Apply twist parameters to create a more complex torus
                let twistedU = u[i] + tt * Math.sin(v[j]);
                let twistedV = v[j] + tx * Math.sin(u[i]);
                
                // Standard torus parametric equations with the twisted parameters
                let xCoord = (R + r * Math.cos(twistedV)) * Math.cos(twistedU);
                let yCoord = (R + r * Math.cos(twistedV)) * Math.sin(twistedU);
                let zCoord = r * Math.sin(twistedV) * (1 + tz * 0.1 * Math.sin(ty * twistedU));
                
                // Uniform scaling factor for better visualization
                const scaleFactor = 0.4; // Slightly smaller for better view
                xCoord *= scaleFactor;
                yCoord *= scaleFactor;
                zCoord *= scaleFactor;
                
                x.push(xCoord);
                y.push(yCoord);
                z.push(zCoord);
            }
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
            targetIntersectionForm: 'indefinite', // 'positive-definite', 'negative-definite', or 'indefinite'
            w1Weight: 1.0, // Weight for Stiefel-Whitney compatibility
            eulerWeight: 1.0, // Weight for Euler characteristic matching
            qWeight: 1.0, // Weight for intersection form
            twistWeight: 1.0, // Weight for twist alignment
            ctcWeight: 1.0, // Weight for CTC stability compatibility
            ...options
        };
        
        // Initialize population
        this.population = [];
        this.generation = 0;
        this.compatiblePairs = 0;
        this.bestFitness = 0;
        
        this.initializePopulation();
    }
    
    // Add reset method - this was missing but was being called
    reset() {
        console.log("Resetting evolutionary algorithm");
        this.population = [];
        this.generation = 0;
        this.compatiblePairs = 0;
        this.bestFitness = 0;
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
        // Modified to favor non-orientable combinations (w₁ = 1)
        // Gives perfect score if at least one Sub-SKB is non-orientable
        const w1Compatibility = (p1.w1 === 1 || p2.w1 === 1) ? 1.0 : 0.0;
        
        // 2. Euler characteristic compatibility
        // Ideally, we want the sum to match our target
        const sumEuler = p1.eulerCharacteristic + p2.eulerCharacteristic;
        const targetEuler = this.options.targetEulerCharacteristic;
        // Normalize: higher score for closer match
        const eulerDifference = Math.abs(sumEuler - targetEuler);
        const eulerCompatibility = 1.0 / (1.0 + eulerDifference);
        
        // 3. Intersection form compatibility
        // This is highly simplified; in reality, would involve complex calculations
        let qCompatibility;
        
        const targetForm = this.options.targetIntersectionForm;
        
        // Updated to prioritize indefinite intersection forms for hadron-like SKBs
        if (p1.intersectionForm === 'Indefinite' && p2.intersectionForm === 'Indefinite') {
            qCompatibility = 1.0; // Best compatibility when both are indefinite
            } else if (p1.intersectionForm === 'Indefinite' || p2.intersectionForm === 'Indefinite') {
            qCompatibility = 0.5; // Medium compatibility when one is indefinite
        } else {
            qCompatibility = 0.3; // Lower compatibility otherwise
        }
        
        // Apply additional weight based on targetForm preference
        if (targetForm === 'indefinite' && (p1.intersectionForm === 'Indefinite' || p2.intersectionForm === 'Indefinite')) {
            // Boost compatibility slightly when matching target
            qCompatibility += 0.2;
            // Cap at 1.0
            qCompatibility = Math.min(qCompatibility, 1.0);
        }
        
        // 4. Twist alignment compatibility
        // Calculate how well the twists align for CTC formation
        const dx = (skb1.parameters.tx - skb2.parameters.tx) ** 2;
        const dy = (skb1.parameters.ty - skb2.parameters.ty) ** 2;
        const dz = (skb1.parameters.tz - skb2.parameters.tz) ** 2;
        const sigma = 1.0; // Adjustable via options
        const twistCompatibility = Math.exp(-(dx + dy + dz) / (sigma * sigma));
        
        // 5. CTC stability compatibility
        // For stable CTCs, the time twists should cancel each other out (sum near zero)
        const epsilon = 0.1; // Adjustable via options
        const ctcCompatibility = Math.abs(skb1.parameters.tt + skb2.parameters.tt) < epsilon ? 1.0 : 0.0;
        
        // Combine scores with weights
        const fitness = (
            this.options.w1Weight * w1Compatibility +
            this.options.eulerWeight * eulerCompatibility +
            this.options.qWeight * qCompatibility +
            this.options.twistWeight * twistCompatibility +
            this.options.ctcWeight * ctcCompatibility
        ) / (this.options.w1Weight + this.options.eulerWeight + this.options.qWeight + 
             this.options.twistWeight + this.options.ctcWeight);
        
        return fitness;
    }
    
    // Calculate compatibility between three Sub-SKBs
    calculateTripleCompatibility(skb1, skb2, skb3) {
        // First check pairwise compatibility
        const comp12 = this.calculateCompatibility(skb1, skb2);
        const comp13 = this.calculateCompatibility(skb1, skb3);
        const comp23 = this.calculateCompatibility(skb2, skb3);
        
        // All pairs must be compatible
        if (comp12 < 0.5 || comp13 < 0.5 || comp23 < 0.5) {
            return {
                compatible: false,
                overallScore: 0,
                reason: "Not all pairs are compatible"
            };
        }
        
        // Check for merged stability based on properties
        const p1 = skb1.properties;
        const p2 = skb2.properties;
        const p3 = skb3.properties;
        
        // 1. Check if time twists balance each other (sum close to zero)
        const ttSum = skb1.parameters.tt + skb2.parameters.tt + skb3.parameters.tt;
        const ctcStable = Math.abs(ttSum) < 0.2;
        
        // 2. Check twist balance for spatial stability
        const txSum = skb1.parameters.tx + skb2.parameters.tx + skb3.parameters.tx;
        const tySum = skb1.parameters.ty + skb2.parameters.ty + skb3.parameters.ty;
        const tzSum = skb1.parameters.tz + skb2.parameters.tz + skb3.parameters.tz;
        const twistBalanced = (Math.abs(txSum) + Math.abs(tySum) + Math.abs(tzSum)) < 1.0;
        
        // 3. Topological compatibility
        const topologicallyCompatible = (
            // At least one should be non-orientable for SKB stability
            (p1.w1 === 1 || p2.w1 === 1 || p3.w1 === 1) &&
            // Intersection forms should have a specific pattern
            (p1.intersectionForm === 'Indefinite' || p2.intersectionForm === 'Indefinite' || p3.intersectionForm === 'Indefinite')
        );
        
        // Calculate an overall score
        const overallScore = (
            (ctcStable ? 1 : 0) * this.options.ctcWeight +
            (twistBalanced ? 1 : 0) * this.options.twistWeight +
            (topologicallyCompatible ? 1 : 0) * this.options.w1Weight
        ) / (this.options.ctcWeight + this.options.twistWeight + this.options.w1Weight);
        
        // Overall compatibility
        const compatible = ctcStable && twistBalanced && topologicallyCompatible;
        
        return {
            compatible,
            overallScore,
            ctcStable,
            twistBalanced,
            topologicallyCompatible,
            ttSum,
            txSum,
            tySum,
            tzSum
        };
    }
    
    // Find compatible triplets in the population
    findCompatibleTriplets() {
        const triplets = [];
        const population = this.population;
        const n = population.length;
        
        // Check all possible triplets
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                for (let k = j + 1; k < n; k++) {
                    const compatibility = this.calculateTripleCompatibility(
                        population[i], population[j], population[k]
                    );
                    
                    if (compatibility.compatible) {
                        triplets.push({
                            individuals: [population[i], population[j], population[k]],
                            compatibility,
                            indices: [i, j, k]
                        });
                    }
                }
            }
        }
        
        // Sort by overall score
        triplets.sort((a, b) => b.compatibility.overallScore - a.compatibility.overallScore);
        
        return triplets;
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
    evolve(frozenIndices = new Set()) {
        this.generation++;
        
        // Evaluate the current population
        this.evaluatePopulation();
        
        // Create a new population
        const newPopulation = [];
        
        // Keep track of which individuals are compatible
        const pairwiseCompatibilityMatrix = [];
        
        // Calculate all pairwise compatibilities
        for (let i = 0; i < this.population.length; i++) {
            pairwiseCompatibilityMatrix[i] = [];
            
            for (let j = 0; j < this.population.length; j++) {
                if (i === j) {
                    pairwiseCompatibilityMatrix[i][j] = 0;
                    continue;
                }
                
                const skb1 = this.population[i];
                const skb2 = this.population[j];
                
                // Calculate compatibility score
                const compatibilityScore = this.calculateCompatibility(skb1, skb2);
                pairwiseCompatibilityMatrix[i][j] = compatibilityScore;
                
                // Mark as compatible if score is high enough
                if (compatibilityScore > 0.5) {
                    this.population[i].compatibleCount++;
                }
            }
        }
        
        // Calculate number of compatible pairs
        this.compatiblePairs = 0;
        for (let i = 0; i < this.population.length; i++) {
            for (let j = i + 1; j < this.population.length; j++) {
                if (pairwiseCompatibilityMatrix[i][j] > 0.5) {
                    this.compatiblePairs++;
                }
            }
        }
        
        // First, directly copy over any frozen individuals (part of stable hadrons)
        frozenIndices.forEach(idx => {
            if (idx >= 0 && idx < this.population.length) {
                newPopulation.push(this.population[idx]);
            }
        });
        
        // Then fill the rest of the population through selection, crossover, mutation
        while (newPopulation.length < this.options.populationSize) {
            // Select parents
            const parent1 = this.select();
            const parent2 = this.select();
            
            // Clone the parents
            const offspring1 = parent1.clone();
            const offspring2 = parent2.clone();
            
            // Crossover
            if (Math.random() < 0.7) { // 70% chance of crossover
                this.crossover(offspring1, offspring2);
            }
            
            // Mutation
            offspring1.mutate(this.options.mutationRate);
            offspring2.mutate(this.options.mutationRate);
            
            // Add to new population if we have space
            if (newPopulation.length < this.options.populationSize) {
                newPopulation.push(offspring1);
            }
            
            if (newPopulation.length < this.options.populationSize) {
                newPopulation.push(offspring2);
            }
        }
        
        // Replace the old population
        this.population = newPopulation;
        
        // Keep track of the best fitness
        this.evaluatePopulation();
        this.bestFitness = Math.max(...this.population.map(ind => ind.fitness));
        
        return {
            generation: this.generation,
            bestFitness: this.bestFitness,
            compatiblePairs: this.compatiblePairs
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

    // Start evolution with current parameters
    startEvolution() {
        // Get parameters from UI
        const generations = parseInt(document.getElementById('generations-slider').value);
        const populationSize = parseInt(document.getElementById('population-size-slider').value);
        const mutationRate = parseFloat(document.getElementById('mutation-rate-slider').value);
        const selectionPressure = parseInt(document.getElementById('selection-pressure-slider').value);
        
        // Get weights
        const w1Weight = parseFloat(document.getElementById('w1-weight-slider').value);
        const eulerWeight = parseFloat(document.getElementById('euler-weight-slider').value);
        const qWeight = parseFloat(document.getElementById('q-weight-slider').value);
        const twistWeight = parseFloat(document.getElementById('twist-weight-slider').value);
        const ctcWeight = parseFloat(document.getElementById('ctc-weight-slider').value);
        
        // Get target values
        const targetOrientability = document.getElementById('target-orientability-select').value;
        const targetEuler = parseInt(document.getElementById('target-euler-slider').value);
        const targetQForm = document.getElementById('target-q-form-select').value;
        
        // Update options
        this.options = {
            ...this.options,
            populationSize,
            mutationRate,
            selectionPressure,
            targetEulerCharacteristic: targetEuler,
            targetOrientability,
            targetIntersectionForm: targetQForm,
            w1Weight,
            eulerWeight,
            qWeight,
            twistWeight,
            ctcWeight
        };
        
        // Reset and initialize
        this.reset();
        this.initializePopulation();
        
        // Run evolution for specified number of generations
        this.runEvolution(generations);
    }

    // Evaluate fitness for an individual
    evaluateFitness(individual) {
        // Target values for proton configuration
        const targetTwists = [2, 2, -1]; // Two up quarks (T=2) and one down quark (T=-1)
        const targetCharge = 1;          // Proton charge
        
        // Get actual values from the individual
        const { twists } = individual;
        const totalCharge = individual.totalCharge;
        
        // Weights for fitness components (can be made adjustable in the UI later)
        const w1 = 1.0; // Weight for twist matching
        const w2 = 1.0; // Weight for total charge matching
        
        // Calculate twist difference component - sum of squared differences 
        let twistDiff = 0;
        for (let i = 0; i < twists.length; i++) {
            twistDiff += Math.pow(twists[i] - targetTwists[i], 2);
        }
        
        // Calculate charge difference component - squared difference of total charges
        const chargeDiff = Math.pow(totalCharge - targetCharge, 2);
        
        // Calculate total fitness (negative because we're minimizing the differences)
        // Lower values of twistDiff and chargeDiff = better match = higher fitness
        const fitness = -(w1 * twistDiff + w2 * chargeDiff);
        
        return fitness;
    }

    // Perform crossover between two individuals
    crossover(parent1, parent2) {
        // For twist numbers, we blend them with a random alpha value and round to nearest integer
        const alpha = Math.random(); // Blend factor between 0 and 1
        
        // Blend twist values
        const offspring1Twists = parent1.twists.map((t, i) => 
            Math.round(alpha * t + (1 - alpha) * parent2.twists[i])
        );
        
        const offspring2Twists = parent1.twists.map((t, i) => 
            Math.round((1 - alpha) * t + alpha * parent2.twists[i])
        );
        
        // Blend other parameters
        const blendParam = (p1, p2) => alpha * p1 + (1 - alpha) * p2;
        
        // Create new parameters objects with blended values
        const offspring1Params = {
            tt: blendParam(parent1.parameters.tt, parent2.parameters.tt),
            curvature: blendParam(parent1.parameters.curvature, parent2.parameters.curvature),
            genus: Math.round(blendParam(parent1.parameters.genus, parent2.parameters.genus)),
            orientability: Math.random() > 0.5 ? parent1.parameters.orientability : parent2.parameters.orientability,
            dimension: 4,
            twists: offspring1Twists
        };
        
        const offspring2Params = {
            tt: blendParam(parent2.parameters.tt, parent1.parameters.tt),
            curvature: blendParam(parent2.parameters.curvature, parent1.parameters.curvature),
            genus: Math.round(blendParam(parent2.parameters.genus, parent1.parameters.genus)),
            orientability: Math.random() > 0.5 ? parent2.parameters.orientability : parent1.parameters.orientability,
            dimension: 4,
            twists: offspring2Twists
        };
        
        // Create and return the new individuals
        return [
            new SubSKB(offspring1Params),
            new SubSKB(offspring2Params)
        ];
    }
}

// UI Controller for the evolutionary algorithm
class EvolutionUI {
    constructor() {
        console.log("Initializing Evolution UI");
        this.algorithm = new EvolutionaryAlgorithm();
        this.selectedIndividual = null;
        this.selectedIndices = new Set();
        this.stableHadrons = [];
        this.frozenIndices = new Set();
        
        this.initEventListeners();
        
        // Delayed initialization to ensure DOM is ready
        setTimeout(() => {
            console.log("DOM should be fully loaded, testing plot functionality");
            // First try a simple test plot to check if Plotly works at all
            const plotWorks = this.testPlot();
            
            if (plotWorks) {
                console.log("Test plot successful, initializing real visualization");
                // Wait a bit more before trying the real 3D plot
                setTimeout(() => {
                    this.initVisualization();
                    // If we have data, update visualization
                    if (this.algorithm.population.length > 0) {
                        this.updateVisualization();
                    }
                }, 500);
            } else {
                console.error("Test plot failed! Not attempting 3D visualization");
                // Try to find the plot container and display an error message
                const plotContainer = document.getElementById('evolution-plot');
                if (plotContainer) {
                    plotContainer.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">' +
                        '<h3>Visualization Error</h3>' +
                        '<p>Failed to initialize the plot. Please check the console for errors.</p>' +
                        '</div>';
                }
            }
        }, 1000);
        
        this.updateUI();
        
        // Initial population generation
        document.getElementById('generate-btn').click();
    }
    
    initEventListeners() {
        // Algorithm control buttons
        document.getElementById('step-btn').addEventListener('click', () => this.step());
        document.getElementById('run-btn').addEventListener('click', () => this.toggleRun());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        document.getElementById('generate-btn').addEventListener('click', () => this.generatePopulation());
        
        // Added button for stable hadrons
        document.getElementById('find-hadrons-btn').addEventListener('click', () => this.findStableHadrons());
        
        // Parameter sliders
        document.getElementById('population-size-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('mutation-rate-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('selection-pressure-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        
        // Fitness function weights
        document.getElementById('w1-weight-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('euler-weight-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('q-weight-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('twist-weight-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        document.getElementById('ctc-weight-slider').addEventListener('input', () => this.updateAlgorithmOptions());
        
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
            qWeight: parseFloat(document.getElementById('q-weight-slider').value),
            twistWeight: parseFloat(document.getElementById('twist-weight-slider').value),
            ctcWeight: parseFloat(document.getElementById('ctc-weight-slider').value)
        };
        
        this.algorithm.updateOptions(options);
        
        // Update UI to reflect changes
        this.updateUI();
    }
    
    step() {
        // Run one generation
        console.log("Running one evolution step");
        
        // First, find compatible triplets before evolution
        this.findCompatibleTriplets();
        
        // Only evolve individuals that are not part of stable hadrons
        const result = this.algorithm.evolve(this.frozenIndices);
        
        // Check for new compatible triplets after evolution
        this.findCompatibleTriplets();
        
        // Update UI
        this.updateUI();
        
        // Update visualization
        this.updateVisualization();
        
        return result;
    }
    
    findCompatibleTriplets() {
        console.log("Checking for compatible triplets...");
        // Skip if no population
        if (!this.algorithm || this.algorithm.population.length < 3) {
            return;
        }
        
        // Find all compatible triplets
        const triplets = this.algorithm.findCompatibleTriplets();
        console.log(`Found ${triplets.length} compatible triplets`);
        
        // Check if any are new (not already in stableHadrons)
        for (const triplet of triplets) {
            // Check if this triplet is already saved
            const isNew = !this.stableHadrons.some(hadron => {
                const hadronIds = hadron.individuals.map(i => i.id);
                const tripletIds = triplet.individuals.map(i => i.id);
                return hadronIds.every(id => tripletIds.includes(id));
            });
            
            if (isNew) {
                console.log("Found new compatible triplet!", triplet);
                
                // Add to stable hadrons
                this.stableHadrons.push(triplet);
                
                // Mark indices as frozen
                triplet.indices.forEach(idx => this.frozenIndices.add(idx));
                
                // Update the UI to show new stable hadron
                this.updateStableHadronsDisplay();
            }
        }
        
        this.compatibleTriplets = triplets;
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
        console.log("Resetting evolution UI");
        // Stop running if active
        if (this.running) {
            clearInterval(this.runInterval);
            this.running = false;
            document.getElementById('run-icon').className = 'fas fa-play';
            document.getElementById('run-text').textContent = 'Run';
        }
        
        // Reset algorithm
        this.algorithm.reset();
        
        // Explicitly initialize a new population
        this.algorithm.initializePopulation();
        
        // Reset selected individual and other UI state
        this.selectedIndividual = null;
        this.selectedIndices.clear();
        this.stableHadrons = [];
        this.frozenIndices = new Set();
        
        console.log("Population size after reset:", this.algorithm.population.length);
        
        // Update UI
        this.updatePopulationGrid();  // Explicitly update the population grid
        this.updateUI();
        
        // Update visualization
        this.updateVisualization();
    }
    
    updateUI() {
        // Update visualizations
        this.updatePopulationGrid();
        this.updateVisualization();
        this.updateTopTripletsDisplay();
        this.updateStableHadronsDisplay();
        
        // Update selected individual details if any
        this.updateSelectedDetails();
        
        // Update generation info
        document.getElementById('generation-count').textContent = this.algorithm.generation;
        document.getElementById('population-size').textContent = this.algorithm.population.length;
        
        // Update best fitness
        const bestFitness = Math.max(...this.algorithm.population.map(i => i.fitness || -Infinity));
        document.getElementById('best-fitness').textContent = bestFitness.toFixed(2);
        
        // Update compatibility count
        const compatibleCount = this.algorithm.findCompatibleTriplets().length;
        document.getElementById('compatible-count').textContent = compatibleCount;
    }
    
    updatePopulationGrid(highlightIndices = []) {
        console.log("updatePopulationGrid called with highlightIndices:", highlightIndices);
        const grid = document.getElementById('population-grid');
        if (!grid) {
            console.error("Population grid element not found!");
            return;
        }
        console.log("Population grid found, clearing contents");
        grid.innerHTML = '';
        
        // Check if population exists
        if (!this.algorithm || !this.algorithm.population || this.algorithm.population.length === 0) {
            console.error("No population available to display!");
            grid.innerHTML = '<p>No population available. Click "Generate Population" to create one.</p>';
            return;
        }
        
        console.log(`Displaying ${this.algorithm.population.length} individuals in the population grid`);
        
        // Sort population by fitness
        const sortedPop = [...this.algorithm.population].sort((a, b) => b.fitness - a.fitness);
        
        // Create cards for each individual
        sortedPop.forEach((individual, index) => {
            const card = document.createElement('div');
            card.className = 'population-card';
            
            // Check if this individual is part of a stable hadron
            const isFrozen = Array.from(this.frozenIndices).some(
                idx => idx === this.algorithm.population.indexOf(individual)
            );
            
            // Check if this individual should be highlighted
            const isHighlighted = highlightIndices.includes(
                this.algorithm.population.indexOf(individual)
            );
            
            // Add compatibility class based on compatible count
            if (isFrozen) {
                card.classList.add('stable-hadron');
            } else if (individual.compatibleCount > this.algorithm.population.length / 3) {
                card.classList.add('compatible');
            } else if (individual.compatibleCount > 0) {
                card.classList.add('neutral');
            } else {
                card.classList.add('incompatible');
            }
            
            // Highlight if selected or specifically highlighted
            if (this.selectedIndividual === individual || isHighlighted) {
                card.classList.add('highlighted');
            }
            
            // Add card content
            card.innerHTML = `
                <h4>Sub-SKB #${index + 1}${isFrozen ? ' 🔒' : ''}</h4>
                <div class="property-row">
                    <span class="property-name">Fitness:</span>
                    <span class="property-value">${individual.fitness.toFixed(2)}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">Orientable:</span>
                    <span class="property-value">${individual.properties.w1 === 0 ? 'Yes' : 'No'}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">Q-Form:</span>
                    <span class="property-value ${individual.properties.intersectionForm === 'Indefinite' ? 'highlight-text' : ''}">${individual.properties.intersectionForm}</span>
                </div>
                <div class="property-row">
                    <span class="property-name">Compatible:</span>
                    <span class="property-value">${individual.compatibleCount}</span>
                </div>
            `;
            
            // Add click handler (only if not frozen)
            if (!isFrozen) {
            card.addEventListener('click', () => {
                this.selectIndividual(individual);
            });
            } else {
                card.style.cursor = 'default';
                card.title = 'This Sub-SKB is part of a stable hadron and cannot be modified.';
            }
            
            grid.appendChild(card);
        });
        
        console.log("Population grid updated successfully");
    }
    
    selectIndividual(individual) {
        console.log("Selecting individual:", individual);
        this.selectedIndividual = individual;
        
        // Update UI
        this.updatePopulationGrid();
        this.updateSelectedDetails();
        
        // Update visualization to show selected individual
        console.log("Updating visualization for selected individual");
        this.updateVisualization();
        
        // Scroll to visualization if needed
        const plotContainer = document.getElementById('evolution-plot');
        if (plotContainer) {
            plotContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    updateSelectedDetails() {
        const selectedDiv = document.getElementById('sub-skb-details');
        const propertiesDiv = document.getElementById('selected-properties');
        
        if (!this.selectedIndividual) {
            selectedDiv.innerHTML = '<p>Select a Sub-SKB from the population to see details</p>';
            if (propertiesDiv) propertiesDiv.style.display = 'none';
            return;
        }
        
        // Get the selected individual's properties
        const { parameters, properties, twists, charges, totalCharge, fitness } = this.selectedIndividual;
        
        // Update the details display with twist and charge information
        let details = `<h4>Selected Sub-SKB Configuration</h4>`;
        
        // Add sub-SKBs twist and charge info
        details += `<div class="topological-properties">`;
        
        // Helper function to get quark label
        const getQuarkLabel = (twistValue) => {
            if (twistValue === 2) return 'up';
            if (twistValue === -1) return 'down';
            return 'unknown';
        };
        
        // Display each sub-SKB
        for (let i = 0; i < twists.length; i++) {
            const twist = twists[i];
            const charge = charges[i];
            const label = getQuarkLabel(twist);
            
            details += `
                <div class="property-row">
                    <span class="property-name">Sub-SKB ${i + 1}</span>
                    <span class="property-value">T = ${twist}, Q = ${charge.toFixed(3)}, Label: ${label}</span>
                </div>
            `;
        }
        
        // Add total charge
        details += `
            <div class="property-row">
                <span class="property-name">Total Charge</span>
                <span class="property-value">Q = ${totalCharge.toFixed(3)}</span>
            </div>
        `;
        
        details += `</div>`;
        
        // Update the HTML
        selectedDiv.innerHTML = details;
        
        // Update detailed topological properties if the div exists
        if (propertiesDiv) {
            propertiesDiv.style.display = 'block';
            
            // Update legacy properties for backward compatibility
            document.getElementById('selected-w1').textContent = properties.w1;
            document.getElementById('selected-euler').textContent = properties.eulerCharacteristic;
            document.getElementById('selected-pi1').textContent = properties.fundamentalGroup;
            document.getElementById('selected-q').textContent = properties.intersectionForm;
            document.getElementById('selected-ks').textContent = properties.ks;
            document.getElementById('selected-fitness').textContent = fitness ? fitness.toFixed(3) : 'N/A';
        }
    }
    
    initVisualization() {
        console.log("Initializing 3D visualization");
        
        try {
            // Get the plot container
            const plotContainer = document.getElementById('evolution-plot');
            if (!plotContainer) {
                console.error("Plot container not found!");
                return;
            }
            
            console.log("Plot container dimensions:", plotContainer.offsetWidth, "x", plotContainer.offsetHeight);
            
            // Create an empty plot with proper layout
            const layout = {
                title: 'Sub-SKB Visualization',
                scene: {
                    xaxis: { title: 'X', range: [-2, 2] }, // Tighter initial range for better viewing
                    yaxis: { title: 'Y', range: [-2, 2] }, // Tighter initial range for better viewing 
                    zaxis: { title: 'Z', range: [-2, 2] }, // Tighter initial range for better viewing
                    aspectmode: 'cube',
                    camera: {
                        eye: { x: 1.25, y: 1.25, z: 1.25 } // Closer camera position to see wireframes better
                    }
                },
                paper_bgcolor: '#1e1e1e',
                plot_bgcolor: '#1e1e1e',
                font: { color: '#ffffff' },
                margin: { l: 0, r: 0, b: 0, t: 50, pad: 4 },
                autosize: true,
                showlegend: true
            };
            
            // Create an empty plot - will be filled by updateVisualization
            Plotly.newPlot('evolution-plot', [], layout);
            
            console.log("Empty visualization plot initialized");
        } catch (error) {
            console.error("Error initializing 3D visualization:", error);
        }
    }
    
    updateVisualization() {
        console.log("Updating visualization");
        
        // Get the visualization data for the top 3 highest compatibility sub-SKBs
        try {
            let skbsToShow = [];
            
            if (this.selectedIndividual) {
                // If an individual is selected, show it
                console.log("Generating visualization data for selected individual", this.selectedIndividual.id);
                skbsToShow.push(this.selectedIndividual);
            } else {
                // Find the top 3 highest compatibility sub-SKBs
                // First, find all compatibility scores between pairs of individuals
                const compatibilityScores = [];
                const population = this.algorithm.population;
                
                for (let i = 0; i < population.length; i++) {
                    for (let j = i + 1; j < population.length; j++) {
                        const compatScore = this.algorithm.calculateCompatibility(population[i], population[j]);
                        compatibilityScores.push({
                            skb1: population[i],
                            skb2: population[j],
                            score: compatScore.compatibilityScore
                        });
                    }
                }
                
                // Sort by compatibility score in descending order
                compatibilityScores.sort((a, b) => b.score - a.score);
                
                // Get the top 3 individuals involved in the highest compatibility pairs
                const topIndividuals = new Set();
                for (const pair of compatibilityScores) {
                    topIndividuals.add(pair.skb1);
                    topIndividuals.add(pair.skb2);
                    if (topIndividuals.size >= 3) break;
                }
                
                skbsToShow = Array.from(topIndividuals).slice(0, 3);
                console.log(`Generating visualization data for top ${skbsToShow.length} compatible individuals`);
            }
            
            if (skbsToShow.length === 0) {
                console.log("No data to visualize");
                return;
            }
            
            // Clear existing plot
            Plotly.purge('evolution-plot');
            
            // Prepare colors for the sub-SKBs
            const colors = ['#FF6E91', '#33C4FF', '#65FF8F']; // Pink, Blue, Green
            
            // Prepare data for the plot
            const plotData = [];
            
            // Variables to track min and max values to set appropriate axis ranges
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            
            // Generate visualization data for each sub-SKB
            for (let i = 0; i < skbsToShow.length; i++) {
                const skb = skbsToShow[i];
                const visualData = skb.generateVisualizationData(skb.parameters);
                
                // Track min and max values for auto-scaling
                visualData.x.forEach(val => {
                    minX = Math.min(minX, val);
                    maxX = Math.max(maxX, val);
                });
                
                visualData.y.forEach(val => {
                    minY = Math.min(minY, val);
                    maxY = Math.max(maxY, val);
                });
                
                visualData.z.forEach(val => {
                    minZ = Math.min(minZ, val);
                    maxZ = Math.max(maxZ, val);
                });
                
                // Add wireframe plot for this sub-SKB
                plotData.push({
                    type: 'scatter3d',
                    x: visualData.x,
                    y: visualData.y,
                    z: visualData.z,
                    mode: 'lines',
                    line: {
                        color: colors[i],
                        width: 2
                    },
                    opacity: 0.7,
                    name: `Sub-SKB ${i+1} (ID: ${skb.id})`,
                    showlegend: true
                });
            }
            
            // Add a small buffer to the axis ranges (20% padding)
            const addBuffer = (min, max) => {
                const range = max - min;
                const buffer = range * 0.2;
                return [min - buffer, max + buffer];
            };
            
            // Calculate appropriate axis ranges with padding
            const xRange = addBuffer(minX, maxX);
            const yRange = addBuffer(minY, maxY);
            const zRange = addBuffer(minZ, maxZ);
            
            // Ensure we have valid ranges (prevent NaN or infinite values)
            const validateRange = (range) => {
                if (!isFinite(range[0]) || !isFinite(range[1]) || range[0] === range[1]) {
                    return [-2, 2]; // Default if invalid - tighter range for better visibility
                }
                // Ensure range isn't too large or too small
                const rangeSize = Math.abs(range[1] - range[0]);
                if (rangeSize < 0.5) {
                    // Range is too small, expand it
                    const mid = (range[0] + range[1]) / 2;
                    return [mid - 1, mid + 1];
                }
                if (rangeSize > 10) {
                    // Range is too large, constrain it
                    const mid = (range[0] + range[1]) / 2;
                    return [mid - 5, mid + 5];
                }
                return range;
            };
            
            // Create plot layout with auto-calculated ranges
            const layout = {
                title: this.selectedIndividual ? 
                    `Sub-SKB Visualization (ID: ${this.selectedIndividual.id})` : 
                    'Top Compatible Sub-SKBs Visualization',
                scene: {
                    xaxis: { title: 'X', range: validateRange(xRange) },
                    yaxis: { title: 'Y', range: validateRange(yRange) },
                    zaxis: { title: 'Z', range: validateRange(zRange) },
                    aspectmode: 'cube',
                    camera: {
                        eye: { x: 1.5, y: 1.5, z: 1.5 } // Adjusted camera position for better view
                    }
                },
                paper_bgcolor: '#1e1e1e',
                plot_bgcolor: '#1e1e1e',
                font: { color: '#ffffff' },
                margin: { l: 0, r: 0, b: 0, t: 50, pad: 4 },
                autosize: true
            };
            
            // Create the plot
            Plotly.newPlot('evolution-plot', plotData, layout);
            
            console.log("Plot updated successfully with data in frame");
        } catch (error) {
            console.error("Error updating visualization:", error);
        }
    }
    
    updateStableHadronsDisplay() {
        const container = document.getElementById('stable-hadrons-container');
        const section = document.getElementById('stable-hadrons-section');
        const noHadronsMessage = document.getElementById('no-stable-hadrons-message');
        
        if (!container) return; // Safety check
        
        // Show/hide the section based on whether we have stable hadrons
        if (this.stableHadrons.length > 0) {
            section.style.display = 'block';
            noHadronsMessage.style.display = 'none';
        } else {
            noHadronsMessage.style.display = 'block';
            return; // Nothing to display
        }
        
        // Clear existing hadrons (except the message)
        const existingHadrons = container.querySelectorAll('.stable-hadron-card');
        existingHadrons.forEach(el => el.remove());
        
        // Create and append hadron cards
        this.stableHadrons.forEach((hadron, idx) => {
            const card = document.createElement('div');
            card.className = 'stable-hadron-card';
            card.style.marginBottom = '20px';
            card.style.padding = '15px';
            card.style.backgroundColor = 'var(--surface-light)';
            card.style.borderRadius = '8px';
            card.style.borderLeft = '3px solid var(--skb-merged)';
            
            // Create header with hadron number
            const header = document.createElement('h4');
            header.textContent = `Stable Hadron #${idx + 1}`;
            header.style.marginTop = '0';
            header.style.marginBottom = '10px';
            card.appendChild(header);
            
            // Create summary of compatibility
            const summary = document.createElement('div');
            summary.className = 'property-row';
            summary.innerHTML = `
                <span class="property-name">Compatibility Score:</span>
                <span class="property-value">${hadron.compatibility.overallScore.toFixed(2)}</span>
            `;
            card.appendChild(summary);
            
            // Create status indicators for stability conditions
            const stabilityContainer = document.createElement('div');
            stabilityContainer.style.margin = '10px 0';
            
            const createStatusIndicator = (label, isTrue) => {
                const indicator = document.createElement('div');
                indicator.style.display = 'flex';
                indicator.style.alignItems = 'center';
                indicator.style.marginBottom = '5px';
                
                const icon = document.createElement('span');
                icon.innerHTML = isTrue ? '✓' : '✗';
                icon.style.color = isTrue ? 'var(--evo-compatible)' : 'var(--evo-incompatible)';
                icon.style.marginRight = '10px';
                icon.style.fontWeight = 'bold';
                
                const text = document.createElement('span');
                text.textContent = label;
                
                indicator.appendChild(icon);
                indicator.appendChild(text);
                return indicator;
            };
            
            stabilityContainer.appendChild(createStatusIndicator('CTC Stability', hadron.compatibility.ctcStable));
            stabilityContainer.appendChild(createStatusIndicator('Twist Balance', hadron.compatibility.twistBalanced));
            stabilityContainer.appendChild(createStatusIndicator('Topological Compatibility', hadron.compatibility.topologicallyCompatible));
            
            card.appendChild(stabilityContainer);
            
            // Display Sub-SKBs that form this hadron
            const skbsContainer = document.createElement('div');
            skbsContainer.style.marginTop = '15px';
            
            const skbsHeader = document.createElement('h5');
            skbsHeader.textContent = 'Component Sub-SKBs';
            skbsHeader.style.marginBottom = '10px';
            skbsContainer.appendChild(skbsHeader);
            
            // Create a grid for the Sub-SKBs
            const skbsGrid = document.createElement('div');
            skbsGrid.style.display = 'grid';
            skbsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
            skbsGrid.style.gap = '10px';
            
            // Add each Sub-SKB to the grid
            hadron.individuals.forEach((skb, skbIdx) => {
                const skbCard = document.createElement('div');
                skbCard.style.padding = '10px';
                skbCard.style.backgroundColor = 'var(--surface)';
                skbCard.style.borderRadius = '5px';
                
                const skbHeader = document.createElement('h6');
                skbHeader.textContent = `Sub-SKB ${skbIdx + 1}`;
                skbHeader.style.margin = '0 0 5px 0';
                skbHeader.style.textAlign = 'center';
                skbCard.appendChild(skbHeader);
                
                // Add parameter values
                const paramsList = document.createElement('div');
                paramsList.className = 'parameters-list';
                
                // Display all parameters
                const addParam = (name, value, precision = 2) => {
                    const row = document.createElement('div');
                    row.className = 'property-row';
                    row.style.fontSize = '0.8rem';
                    row.style.padding = '2px 0';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'property-name';
                    nameSpan.textContent = name;
                    
                    const valueSpan = document.createElement('span');
                    valueSpan.className = 'property-value';
                    valueSpan.textContent = typeof value === 'number' ? value.toFixed(precision) : value;
                    
                    row.appendChild(nameSpan);
                    row.appendChild(valueSpan);
                    
                    return row;
                };
                
                // Add all parameters
                paramsList.appendChild(addParam('tx', skb.parameters.tx));
                paramsList.appendChild(addParam('ty', skb.parameters.ty));
                paramsList.appendChild(addParam('tz', skb.parameters.tz));
                paramsList.appendChild(addParam('tt', skb.parameters.tt));
                paramsList.appendChild(addParam('Curvature', skb.parameters.curvature));
                paramsList.appendChild(addParam('Genus', skb.parameters.genus, 0));
                paramsList.appendChild(addParam('Orientable', skb.parameters.orientability === 0 ? 'Yes' : 'No', 0));
                
                skbCard.appendChild(paramsList);
                skbsGrid.appendChild(skbCard);
            });
            
            skbsContainer.appendChild(skbsGrid);
            card.appendChild(skbsContainer);
            
            // Add "View Merged" button
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Merged Visualization';
            viewButton.style.marginTop = '15px';
            viewButton.style.width = '100%';
            viewButton.addEventListener('click', () => {
                // Logic to visualize the merged hadron
                this.visualizeStableHadron(hadron);
            });
            
            card.appendChild(viewButton);
            
            // Add the card to the container
            container.appendChild(card);
        });
    }
    
    visualizeStableHadron(hadron) {
        console.log("Visualizing stable hadron:", hadron);
        
        try {
            // Clear existing plot
            Plotly.purge('evolution-plot');
            
            // Prepare colors for the sub-SKBs
            const colors = ['#FF6E91', '#33C4FF', '#65FF8F']; // Pink, Blue, Green
            
            // Prepare data for the plot
            const plotData = [];
            
            // Variables to track min and max values for auto-scaling
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            
            // Generate visualization data for each sub-SKB in the hadron
            for (let i = 0; i < hadron.individuals.length; i++) {
                const skb = hadron.individuals[i];
                const visualData = skb.generateVisualizationData(skb.parameters);
                
                // Track min and max values for auto-scaling
                visualData.x.forEach(val => {
                    minX = Math.min(minX, val);
                    maxX = Math.max(maxX, val);
                });
                
                visualData.y.forEach(val => {
                    minY = Math.min(minY, val);
                    maxY = Math.max(maxY, val);
                });
                
                visualData.z.forEach(val => {
                    minZ = Math.min(minZ, val);
                    maxZ = Math.max(maxZ, val);
                });
                
                // Add a trace for each sub-SKB
                plotData.push({
                    type: 'scatter3d',
                    x: visualData.x,
                    y: visualData.y,
                    z: visualData.z,
                    mode: 'lines',
                    line: {
                        color: colors[i],
                        width: 2
                    },
                    opacity: 0.7,
                    name: `Sub-SKB ${hadron.indices[i] + 1} (ID: ${skb.id})`,
                    showlegend: true
                });
            }
            
            // Add a small buffer to the axis ranges for better viewing
            const addBuffer = (min, max) => {
                const range = max - min;
                const buffer = range * 0.2;
                return [min - buffer, max + buffer];
            };
            
            // Calculate appropriate ranges with padding
            const xRange = addBuffer(minX, maxX);
            const yRange = addBuffer(minY, maxY);
            const zRange = addBuffer(minZ, maxZ);
            
            // Ensure we have valid ranges
            const validateRange = (range) => {
                if (!isFinite(range[0]) || !isFinite(range[1]) || range[0] === range[1]) {
                    return [-2, 2]; // Default if invalid - tighter range for better visibility
                }
                // Ensure range isn't too large or too small
                const rangeSize = Math.abs(range[1] - range[0]);
                if (rangeSize < 0.5) {
                    // Range is too small, expand it
                    const mid = (range[0] + range[1]) / 2;
                    return [mid - 1, mid + 1];
                }
                if (rangeSize > 10) {
                    // Range is too large, constrain it
                    const mid = (range[0] + range[1]) / 2;
                    return [mid - 5, mid + 5];
                }
                return range;
            };
            
            // Create plot layout with auto-calculated ranges
            const layout = {
                title: `Stable Hadron Visualization (Compatibility: ${hadron.compatibilityScore.toFixed(3)})`,
                scene: {
                    xaxis: { title: 'X', range: validateRange(xRange) },
                    yaxis: { title: 'Y', range: validateRange(yRange) },
                    zaxis: { title: 'Z', range: validateRange(zRange) },
                    aspectmode: 'cube',
                    camera: {
                        eye: { x: 1.5, y: 1.5, z: 1.5 } // Set camera position for better view
                    }
                },
                paper_bgcolor: '#1e1e1e',
                plot_bgcolor: '#1e1e1e',
                font: { color: '#ffffff' },
                margin: { l: 0, r: 0, b: 0, t: 50, pad: 4 },
                autosize: true
            };
            
            // Create the plot
            Plotly.newPlot('evolution-plot', plotData, layout);
            
            // Highlight the component Sub-SKBs in the population grid
            this.updatePopulationGrid(hadron.indices);
            
            console.log("Stable hadron visualization completed");
        } catch (error) {
            console.error("Error visualizing stable hadron:", error);
        }
    }

    findStableHadrons() {
        console.log("Finding stable hadrons");
        const population = this.algorithm.population;
        const stableHadrons = [];
        this.frozenIndices = new Set();

        // First, calculate compatibility between all individuals
        const compatibilityMatrix = Array(population.length).fill().map(() => Array(population.length).fill(0));
        
        for (let i = 0; i < population.length; i++) {
            for (let j = i + 1; j < population.length; j++) {
                const compatibility = this.algorithm.calculateCompatibility(population[i], population[j]);
                compatibilityMatrix[i][j] = compatibility;
                compatibilityMatrix[j][i] = compatibility;
            }
        }
        
        // Find all triplets that are mutually compatible (all pairs have compatibility > 0.5)
        for (let i = 0; i < population.length; i++) {
            if (this.frozenIndices.has(i)) continue; // Skip already frozen individuals
            
            for (let j = i + 1; j < population.length; j++) {
                if (this.frozenIndices.has(j) || compatibilityMatrix[i][j] <= 0.5) continue;
                
                for (let k = j + 1; k < population.length; k++) {
                    if (this.frozenIndices.has(k)) continue;
                    
                    // Check if all three pairs are compatible
                    if (compatibilityMatrix[i][k] > 0.5 && compatibilityMatrix[j][k] > 0.5) {
                        // Calculate the overall compatibility/stability score for the triplet
                        const tripletScore = (compatibilityMatrix[i][j] + compatibilityMatrix[i][k] + compatibilityMatrix[j][k]) / 3;
                        
                        // This is a stable hadron! Save it
                        const stableHadron = {
                            indices: [i, j, k],
                            individuals: [population[i], population[j], population[k]],
                            compatibilityScore: tripletScore
                        };
                        
                        stableHadrons.push(stableHadron);
                        
                        // Mark these individuals as frozen
                        this.frozenIndices.add(i);
                        this.frozenIndices.add(j);
                        this.frozenIndices.add(k);
                        
                        console.log(`Found stable hadron with individuals ${i}, ${j}, ${k} and compatibility score ${tripletScore.toFixed(3)}`);
                        
                        // We can break here as i and j are now frozen
                        break;
                    }
                }
                
                if (this.frozenIndices.has(i)) break; // If i is now frozen, move to next i
            }
        }
        
        console.log(`Found ${stableHadrons.length} stable hadrons, freezing ${this.frozenIndices.size} individuals`);
        this.stableHadrons = stableHadrons;
        
        // Update UI to reflect the stable hadrons
        this.updateStableHadronsDisplay();
        this.updatePopulationGrid();
        
        return stableHadrons;
    }

    // Add a test function to check if Plotly works with the most basic plot
    testPlot() {
        console.log("=== PLOT DIAGNOSTIC TEST ===");
        console.log("Testing basic Plotly functionality");
        
        // Get the plot container
        const plotContainer = document.getElementById('evolution-plot');
        if (!plotContainer) {
            console.error("Plot container not found!");
            return false;
        }
        
        console.log("Plot container dimensions:", plotContainer.offsetWidth, "x", plotContainer.offsetHeight);
        console.log("Plot container visibility:", window.getComputedStyle(plotContainer).display);
        console.log("Plot container position:", plotContainer.getBoundingClientRect());
        
        // Check if Plotly is available
        if (typeof Plotly === 'undefined') {
            console.error("Plotly library is not available!");
            return false;
        }
        
        try {
            // Create the simplest possible 2D plot to test if Plotly works at all
            const x = [1, 2, 3, 4, 5];
            const y = [1, 2, 3, 4, 5];
            
            const data = [{
                x: x,
                y: y,
                type: 'scatter',
                mode: 'lines+markers',
                marker: {
                    color: 'rgb(255, 0, 0)',
                    size: 10
                },
                line: {
                    color: 'rgb(255, 0, 0)',
                    width: 2
                }
            }];
            
            const layout = {
                title: 'Test Plot',
                paper_bgcolor: '#1e1e1e',
                plot_bgcolor: '#1e1e1e',
                font: {
                    color: '#ffffff'
                },
                width: plotContainer.offsetWidth,
                height: plotContainer.offsetHeight,
                margin: {
                    l: 50,
                    r: 50,
                    b: 50,
                    t: 80,
                    pad: 4
                }
            };
            
            // Create a new plot from scratch
            Plotly.newPlot('evolution-plot', data, layout);
            
            console.log("Basic 2D test plot created successfully");
            return true;
        } catch (error) {
            console.error("Error creating test plot:", error);
            return false;
        }
    }

    // Generate a new population
    generatePopulation() {
        console.log("Generating new population");
        
        // First, reset the algorithm
        this.algorithm.reset();
        
        // Update algorithm options in case they've changed
        this.updateAlgorithmOptions();
        
        // Initialize and evaluate the population
        this.algorithm.initializePopulation();
        this.algorithm.evaluatePopulation();
        
        // Clear any selection
        this.selectedIndividual = null;
        this.selectedIndices.clear();
        
        // Reset frozen indices and stable hadrons
        this.frozenIndices = new Set();
        this.stableHadrons = [];
        
        // Update the UI and visualization
        this.updatePopulationGrid();
        this.updateVisualization();
        this.updateUI();
        
        console.log(`Generated population of ${this.algorithm.population.length} individuals`);
    }

    // New method to update top triplets display
    updateTopTripletsDisplay() {
        const container = document.getElementById('top-triplets-container');
        if (!container) return;
        
        // Clear the container
        container.innerHTML = '';
        
        // Sort population by fitness in descending order
        const sortedPopulation = [...this.algorithm.population]
            .sort((a, b) => (b.fitness || -Infinity) - (a.fitness || -Infinity));
        
        // Always take exactly the top 3 matches
        const topMatches = sortedPopulation.slice(0, 3);
        
        if (topMatches.length === 0) {
            container.innerHTML = '<p>No triplets found yet. Continue evolving the population.</p>';
            return;
        }
        
        // Create elements for each top match
        topMatches.forEach((individual, index) => {
            const matchCard = document.createElement('div');
            matchCard.className = 'stable-hadron-card';
            
            // Helper function to get quark label
            const getQuarkLabel = (twistValue) => {
                if (twistValue === 2) return 'up';
                if (twistValue === -1) return 'down';
                return 'unknown';
            };
            
            // Build content
            let content = `
                <h4>Triplet #${index + 1} (Fitness: ${individual.fitness ? individual.fitness.toFixed(3) : 'N/A'})</h4>
                <div class="topological-properties">
            `;
            
            // Add sub-SKB information
            for (let i = 0; i < individual.twists.length; i++) {
                const twist = individual.twists[i];
                const charge = individual.charges[i];
                const label = getQuarkLabel(twist);
                
                content += `
                    <div class="property-row">
                        <span class="property-name">Sub-SKB ${i + 1}</span>
                        <span class="property-value">T = ${twist}, Q = ${charge.toFixed(3)}, Label: ${label}</span>
                    </div>
                `;
            }
            
            // Add total charge
            content += `
                <div class="property-row">
                    <span class="property-name">Total Charge</span>
                    <span class="property-value">Q = ${individual.totalCharge.toFixed(3)}</span>
                </div>
            `;
            
            matchCard.innerHTML = content + '</div>';
            
            // Add click event to select this individual in the main visualization
            matchCard.addEventListener('click', () => {
                this.selectIndividual(individual);
            });
            
            container.appendChild(matchCard);
        });
    }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing Evolution UI");
    try {
        const ui = new EvolutionUI();
        console.log("Evolutionary Programming interface loaded");
        
        // Ensure we have a population by generating one
        setTimeout(() => {
            console.log("Ensuring initial population is generated");
            if (!ui.algorithm.population.length) {
                console.log("No population found, generating one");
                ui.generatePopulation();
            }
        }, 1500);
        
        // Store reference to UI globally for debugging
        window.evolutionUI = ui;
    } catch (error) {
        console.error("Error initializing Evolution UI:", error);
    }

    // Resize the main plot when the window size changes
    window.addEventListener('resize', function() {
        const plot = document.getElementById('evolution-plot');
        if (plot) {
            Plotly.Plots.resize(plot);
        }
    });
});
