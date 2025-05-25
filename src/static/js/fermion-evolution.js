/**
 * Fermion Evolution Visualization
 * Interactive demonstration of fermions as Klein bottle structures in the SKB framework
 */

class FermionEvolution {
    constructor() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.animationSpeed = 1.0;
        this.selectedParticle = 'up';
        this.evolutionType = 'beta_decay';
        this.twistAngle = 2.09; // 2π/3
        this.ctcStrength = 0.5;
        this.animationFrame = null;
        
        // Particle properties based on the paper
        this.particles = {
            up: {
                name: 'Up Quark',
                mass: 2.3, // MeV/c²
                charge: 2/3,
                twist: 2*Math.PI/3 + 0.10,
                color: '#ff4444',
                period: 1.2
            },
            down: {
                name: 'Down Quark', 
                mass: 4.8, // MeV/c²
                charge: -1/3,
                twist: 4*Math.PI/3 - 0.20,
                color: '#4444ff',
                period: 0.9
            },
            electron: {
                name: 'Electron',
                mass: 0.511, // MeV/c²
                charge: -1,
                twist: Math.PI,
                color: '#44ff44',
                period: 2.1
            },
            muon: {
                name: 'Muon',
                mass: 105.7, // MeV/c²
                charge: -1,
                twist: Math.PI + 0.3,
                color: '#ff44ff',
                period: 0.3
            },
            neutrino: {
                name: 'Neutrino',
                mass: 0.001, // MeV/c²
                charge: 0,
                twist: Math.PI/2,
                color: '#ffff44',
                period: 10.0
            }
        };
        
        this.initializeControls();
        this.initializeVisualization();
        this.setupTabSwitching();
    }
    
    initializeControls() {
        // Control elements
        this.particleSelect = document.getElementById('particleType');
        this.evolutionSelect = document.getElementById('evolutionType');
        this.twistSlider = document.getElementById('twistAngle');
        this.timeSlider = document.getElementById('timeParam');
        this.ctcSlider = document.getElementById('ctcStrength');
        this.speedSlider = document.getElementById('animationSpeed');
        this.playPauseBtn = document.getElementById('playPause');
        this.resetBtn = document.getElementById('reset');
        this.showEquationsBtn = document.getElementById('showEquations');
        
        // Value displays
        this.twistValue = document.getElementById('twistValue');
        this.timeValue = document.getElementById('timeValue');
        this.ctcValue = document.getElementById('ctcValue');
        this.speedValue = document.getElementById('speedValue');
        
        // Property displays
        this.currentMass = document.getElementById('currentMass');
        this.currentCharge = document.getElementById('currentCharge');
        this.currentSpin = document.getElementById('currentSpin');
        this.currentPeriod = document.getElementById('currentPeriod');
        this.currentEnergy = document.getElementById('currentEnergy');
        this.currentTopology = document.getElementById('currentTopology');
        
        // Event listeners
        this.particleSelect.addEventListener('change', () => this.onParticleChange());
        this.evolutionSelect.addEventListener('change', () => this.onEvolutionChange());
        this.twistSlider.addEventListener('input', () => this.onTwistChange());
        this.timeSlider.addEventListener('input', () => this.onTimeChange());
        this.ctcSlider.addEventListener('input', () => this.onCTCChange());
        this.speedSlider.addEventListener('input', () => this.onSpeedChange());
        this.playPauseBtn.addEventListener('click', () => this.toggleAnimation());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.showEquationsBtn.addEventListener('click', () => this.showEquations());
        
        // Initialize displays
        this.updateDisplays();
    }
    
    initializeVisualization() {
        this.createFermionPlot();
        this.createTimelinePlot();
    }
    
    createFermionPlot() {
        const container = document.getElementById('fermionPlot');
        
        // Generate Klein bottle surface for fermion
        const data = this.generateKleinBottleData();
        
        const layout = {
            ...getCommonPlotLayout(),
            title: '',
            scene: {
                xaxis: { title: 'X (space)', range: [-2, 2] },
                yaxis: { title: 'Y (space)', range: [-2, 2] },
                zaxis: { title: 'Z (space)', range: [-2, 2] },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                },
                aspectmode: 'cube',
                bgcolor: 'rgba(0,0,0,0)'
            },
            margin: { l: 0, r: 0, t: 0, b: 0 },
            showlegend: false
        };
        
        Plotly.newPlot(container, data, layout, {
            displayModeBar: false,
            responsive: true
        });
    }
    
    generateKleinBottleData() {
        const particle = this.particles[this.selectedParticle];
        const u_vals = [];
        const v_vals = [];
        const x_vals = [];
        const y_vals = [];
        const z_vals = [];
        const colors = [];
        
        const resolution = 40;
        const time = this.currentTime;
        const twist = this.twistAngle;
        const ctc = this.ctcStrength;
        
        // Generate Klein bottle parameterization with CTC effects
        for (let i = 0; i <= resolution; i++) {
            const u_row = [];
            const v_row = [];
            const x_row = [];
            const y_row = [];
            const z_row = [];
            const color_row = [];
            
            for (let j = 0; j <= resolution; j++) {
                const u = (i / resolution) * 2 * Math.PI;
                const v = (j / resolution) * 2 * Math.PI;
                
                // Klein bottle with CTC modulation
                const r = 2 + Math.cos(u/2) * Math.sin(v) - Math.sin(u/2) * Math.sin(2*v);
                const temporal_mod = 1 + ctc * Math.sin(time * 2 * Math.PI / particle.period);
                
                // Spatial coordinates with twist and time evolution
                const x = r * Math.cos(v) * temporal_mod;
                const y = r * Math.sin(v) * temporal_mod;
                const z = Math.cos(u/2) * Math.cos(v) + Math.sin(u/2) * Math.cos(2*v);
                
                // Apply twist angle rotation
                const x_twisted = x * Math.cos(twist) - z * Math.sin(twist);
                const z_twisted = x * Math.sin(twist) + z * Math.cos(twist);
                
                u_row.push(u);
                v_row.push(v);
                x_row.push(x_twisted);
                y_row.push(y);
                z_row.push(z_twisted);
                
                // Color based on curvature and charge density
                const curvature = Math.abs(Math.sin(u) * Math.cos(v));
                const charge_density = particle.charge * curvature;
                color_row.push(charge_density);
            }
            
            u_vals.push(u_row);
            v_vals.push(v_row);
            x_vals.push(x_row);
            y_vals.push(y_row);
            z_vals.push(z_row);
            colors.push(color_row);
        }
        
        // Create the surface trace
        const surface_trace = {
            type: 'surface',
            x: x_vals,
            y: y_vals,
            z: z_vals,
            surfacecolor: colors,
            colorscale: [
                [0, particle.color + '33'],
                [0.5, particle.color + '88'],
                [1, particle.color + 'ff']
            ],
            opacity: 0.8,
            showscale: false,
            hovertemplate: 
                'Position: (%{x:.2f}, %{y:.2f}, %{z:.2f})<br>' +
                'Charge Density: %{surfacecolor:.3f}<br>' +
                '<extra></extra>'
        };
        
        // Add CTC path trace
        const ctc_trace = this.generateCTCPath();
        
        // Add field lines for charged particles
        const field_traces = this.generateFieldLines();
        
        return [surface_trace, ctc_trace, ...field_traces];
    }
    
    generateCTCPath() {
        const particle = this.particles[this.selectedParticle];
        const t_vals = [];
        const x_vals = [];
        const y_vals = [];
        const z_vals = [];
        
        const resolution = 100;
        const radius = 1.5;
        
        for (let i = 0; i <= resolution; i++) {
            const t = (i / resolution) * 2 * Math.PI;
            const phase = this.currentTime * 2 * Math.PI / particle.period;
            
            // Closed timelike curve parameterization
            const x = radius * Math.cos(t + phase) * this.ctcStrength;
            const y = radius * Math.sin(t + phase) * this.ctcStrength;
            const z = 0.5 * Math.sin(2 * t + phase) * this.ctcStrength;
            
            t_vals.push(t);
            x_vals.push(x);
            y_vals.push(y);
            z_vals.push(z);
        }
        
        return {
            type: 'scatter3d',
            mode: 'lines',
            x: x_vals,
            y: y_vals,
            z: z_vals,
            line: {
                color: '#ffffff',
                width: 8,
                opacity: 0.9
            },
            name: 'CTC Path',
            hovertemplate: 'CTC: (%{x:.2f}, %{y:.2f}, %{z:.2f})<extra></extra>'
        };
    }
    
    generateFieldLines() {
        const particle = this.particles[this.selectedParticle];
        const traces = [];
        
        if (Math.abs(particle.charge) > 0.01) {
            // Generate electric field lines for charged particles
            const num_lines = 8;
            
            for (let i = 0; i < num_lines; i++) {
                const angle = (i / num_lines) * 2 * Math.PI;
                const x_vals = [];
                const y_vals = [];
                const z_vals = [];
                
                for (let r = 0.5; r <= 3; r += 0.1) {
                    const x = r * Math.cos(angle);
                    const y = r * Math.sin(angle);
                    const z = 0.2 * Math.sin(r * 2);
                    
                    x_vals.push(x);
                    y_vals.push(y);
                    z_vals.push(z);
                }
                
                traces.push({
                    type: 'scatter3d',
                    mode: 'lines',
                    x: x_vals,
                    y: y_vals,
                    z: z_vals,
                    line: {
                        color: particle.charge > 0 ? '#ff6666' : '#6666ff',
                        width: 2,
                        opacity: 0.6
                    },
                    showlegend: false,
                    hoverinfo: 'skip'
                });
            }
        }
        
        return traces;
    }
    
    createTimelinePlot() {
        const container = document.getElementById('evolutionTimeline');
        
        const time_data = this.generateTimelineData();
        
        const layout = {
            ...getCommonPlotLayout(),
            title: '',
            xaxis: { title: 'Time (units)', range: [0, 10] },
            yaxis: { title: 'Observable Properties' },
            margin: { l: 50, r: 20, t: 20, b: 50 },
            showlegend: true,
            legend: { x: 0.02, y: 0.98 }
        };
        
        Plotly.newPlot(container, time_data, layout, {
            displayModeBar: false,
            responsive: true
        });
    }
    
    generateTimelineData() {
        const particle = this.particles[this.selectedParticle];
        const time_points = [];
        const mass_vals = [];
        const energy_vals = [];
        const twist_vals = [];
        
        for (let t = 0; t <= 10; t += 0.1) {
            time_points.push(t);
            
            // Mass evolution based on CTC period modulation
            const mass_factor = 1 + 0.1 * Math.sin(t * 2 * Math.PI / particle.period);
            mass_vals.push(particle.mass * mass_factor);
            
            // Energy from mass-energy relation
            const energy = particle.mass * mass_factor * 0.511; // Convert to MeV
            energy_vals.push(energy);
            
            // Twist angle evolution
            const twist_evolution = particle.twist + 0.1 * Math.sin(t * 0.5);
            twist_vals.push(twist_evolution);
        }
        
        return [
            {
                x: time_points,
                y: mass_vals,
                type: 'scatter',
                mode: 'lines',
                name: 'Mass (MeV/c²)',
                line: { color: '#ff6b6b', width: 3 }
            },
            {
                x: time_points,
                y: energy_vals.map(e => e / 100), // Scale for visibility
                type: 'scatter',
                mode: 'lines',
                name: 'Energy/100 (MeV)',
                line: { color: '#4ecdc4', width: 3 }
            },
            {
                x: time_points,
                y: twist_vals,
                type: 'scatter',
                mode: 'lines',
                name: 'Twist Angle (rad)',
                line: { color: '#45b7d1', width: 3 },
                yaxis: 'y2'
            }
        ];
    }
    
    onParticleChange() {
        this.selectedParticle = this.particleSelect.value;
        this.twistAngle = this.particles[this.selectedParticle].twist;
        this.twistSlider.value = this.twistAngle;
        this.updateDisplays();
        this.updateVisualization();
    }
    
    onEvolutionChange() {
        this.evolutionType = this.evolutionSelect.value;
        this.updateVisualization();
    }
    
    onTwistChange() {
        this.twistAngle = parseFloat(this.twistSlider.value);
        this.updateDisplays();
        this.updateVisualization();
    }
    
    onTimeChange() {
        this.currentTime = parseFloat(this.timeSlider.value);
        this.updateDisplays();
        this.updateVisualization();
    }
    
    onCTCChange() {
        this.ctcStrength = parseFloat(this.ctcSlider.value);
        this.updateDisplays();
        this.updateVisualization();
    }
    
    onSpeedChange() {
        this.animationSpeed = parseFloat(this.speedSlider.value);
        this.updateDisplays();
    }
    
    updateDisplays() {
        const particle = this.particles[this.selectedParticle];
        
        // Update slider displays
        this.twistValue.textContent = (this.twistAngle / Math.PI).toFixed(2) + 'π';
        this.timeValue.textContent = this.currentTime.toFixed(1);
        this.ctcValue.textContent = this.ctcStrength.toFixed(2);
        this.speedValue.textContent = this.animationSpeed.toFixed(1) + 'x';
        
        // Update property displays
        const mass_factor = 1 + 0.1 * Math.sin(this.currentTime * 2 * Math.PI / particle.period);
        this.currentMass.textContent = (particle.mass * mass_factor).toFixed(3) + ' MeV/c²';
        this.currentCharge.textContent = particle.charge > 0 ? `+${particle.charge.toFixed(2)}e` : `${particle.charge.toFixed(2)}e`;
        this.currentSpin.textContent = '½ℏ';
        this.currentPeriod.textContent = particle.period.toFixed(1) + ' τ_c';
        
        const energy = particle.mass * mass_factor * 0.511;
        this.currentEnergy.textContent = energy.toFixed(1) + ' MeV';
        this.currentTopology.textContent = 'Klein Bottle (χ=0)';
    }
    
    updateVisualization() {
        // Update main fermion plot
        const fermion_data = this.generateKleinBottleData();
        Plotly.restyle('fermionPlot', {
            x: [fermion_data[0].x],
            y: [fermion_data[0].y],
            z: [fermion_data[0].z],
            surfacecolor: [fermion_data[0].surfacecolor]
        }, [0]);
        
        // Update CTC path
        if (fermion_data[1]) {
            Plotly.restyle('fermionPlot', {
                x: [fermion_data[1].x],
                y: [fermion_data[1].y],
                z: [fermion_data[1].z]
            }, [1]);
        }
        
        // Update timeline
        const timeline_data = this.generateTimelineData();
        Plotly.restyle('evolutionTimeline', {
            y: timeline_data.map(trace => trace.y)
        });
        
        // Add current time marker
        this.addTimeMarker();
    }
    
    addTimeMarker() {
        const marker_data = {
            x: [this.currentTime, this.currentTime],
            y: [0, 10],
            type: 'scatter',
            mode: 'lines',
            line: { color: '#ff0000', width: 2, dash: 'dash' },
            name: 'Current Time',
            showlegend: false,
            hoverinfo: 'skip'
        };
        
        Plotly.addTraces('evolutionTimeline', [marker_data]);
    }
    
    toggleAnimation() {
        if (this.isPlaying) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }
    
    startAnimation() {
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '⏸ Pause Evolution';
        this.playPauseBtn.classList.add('playing');
        
        const animate = () => {
            if (this.isPlaying) {
                this.currentTime += 0.1 * this.animationSpeed;
                if (this.currentTime > 10) {
                    this.currentTime = 0;
                }
                
                this.timeSlider.value = this.currentTime;
                this.updateDisplays();
                this.updateVisualization();
                
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }
    
    stopAnimation() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '▶ Play Evolution';
        this.playPauseBtn.classList.remove('playing');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    reset() {
        this.stopAnimation();
        this.currentTime = 0;
        this.twistAngle = this.particles[this.selectedParticle].twist;
        this.ctcStrength = 0.5;
        this.animationSpeed = 1.0;
        
        // Reset sliders
        this.timeSlider.value = 0;
        this.twistSlider.value = this.twistAngle;
        this.ctcSlider.value = 0.5;
        this.speedSlider.value = 1.0;
        
        this.updateDisplays();
        this.updateVisualization();
    }
    
    showEquations() {
        // Toggle equation visibility or show modal
        const mathPanel = document.querySelector('.math-panel');
        mathPanel.scrollIntoView({ behavior: 'smooth' });
        mathPanel.classList.add('fade-in');
    }
    
    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab
                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const fermionEvolution = new FermionEvolution();
    window.fermionEvolution = fermionEvolution; // Make globally accessible for debugging
}); 