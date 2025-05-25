// Spacetime Klein Bottle Explorer JavaScript
// Handles interactive visualization and controls for SKB exploration

class SKBExplorer {
    constructor() {
        this.plotDiv = 'skb-plot';
        this.isAnimating = false;
        this.animationId = null;
        this.currentTime = 0;
        this.animationSpeed = 0.05;
        
        // Default parameter values
        this.defaultParams = {
            kx: 0,
            ky: 0,
            kz: 0,
            kt: 0,
            loopFactor: 1,
            time: 0
        };
        
        this.initializeControls();
        this.initializePlot();
        this.updateVisualization();
    }
    
    initializeControls() {
        // Spatial twist controls
        ['kx', 'ky', 'kz'].forEach(param => {
            const slider = document.getElementById(param);
            const valueDisplay = document.getElementById(`${param}-value`);
            
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = parseFloat(e.target.value).toFixed(1);
                this.updateVisualization();
            });
        });
        
        // Time twist control
        const ktSlider = document.getElementById('kt');
        const ktValueDisplay = document.getElementById('kt-value');
        ktSlider.addEventListener('input', (e) => {
            ktValueDisplay.textContent = parseFloat(e.target.value).toFixed(1);
            this.updateVisualization();
        });
        
        // Loop factor control
        const loopFactorSlider = document.getElementById('loop-factor');
        const loopFactorValueDisplay = document.getElementById('loop-factor-value');
        loopFactorSlider.addEventListener('input', (e) => {
            loopFactorValueDisplay.textContent = e.target.value;
            this.updateVisualization();
        });
        
        // Time control
        const timeSlider = document.getElementById('time');
        const timeValueDisplay = document.getElementById('time-value');
        timeSlider.addEventListener('input', (e) => {
            this.currentTime = parseFloat(e.target.value);
            timeValueDisplay.textContent = this.currentTime.toFixed(2);
            this.updateVisualization();
        });
        
        // Animation controls
        const playPauseBtn = document.getElementById('play-pause-btn');
        playPauseBtn.addEventListener('click', () => {
            this.toggleAnimation();
        });
        
        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        resetBtn.addEventListener('click', () => {
            this.resetParameters();
        });
        
        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    initializePlot() {
        const layout = {
            ...PlotlyDefaults.getDefault3DLayout(),
            title: {
                text: 'Spacetime Klein Bottle',
                font: { size: 20 }
            },
            scene: {
                ...PlotlyDefaults.getDefault3DLayout().scene,
                aspectmode: 'cube',
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                }
            }
        };
        
        Plotly.newPlot(this.plotDiv, [], layout, PlotlyDefaults.getDefaultConfig());
    }
    
    getSKBParameters() {
        return {
            kx: parseFloat(document.getElementById('kx').value),
            ky: parseFloat(document.getElementById('ky').value),
            kz: parseFloat(document.getElementById('kz').value),
            kt: parseFloat(document.getElementById('kt').value),
            loop_factor: parseInt(document.getElementById('loop-factor').value),
            t: this.currentTime
        };
    }
    
    async updateVisualization() {
        const params = this.getSKBParameters();
        
        try {
            const response = await fetch('/get_skb_visualization', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update the plot
            if (data.plot && data.plot.data) {
                Plotly.react(this.plotDiv, data.plot.data, 
                    Plotly.relayout(this.plotDiv).layout || this.getDefaultLayout());
            }
            
            // Update topological properties
            if (data.properties) {
                this.updateProperties(data.properties);
            }
            
        } catch (error) {
            console.error('Error updating visualization:', error);
        }
    }
    
    updateProperties(properties) {
        // Update Euler characteristic
        if (properties.euler_characteristic !== undefined) {
            document.getElementById('euler').textContent = properties.euler_characteristic;
        }
        
        // Update Stiefel-Whitney classes
        if (properties.stiefel_whitney_classes) {
            const swDiv = document.getElementById('stiefel-whitney');
            swDiv.innerHTML = Object.entries(properties.stiefel_whitney_classes)
                .map(([key, value]) => `<div>${key}: ${value}</div>`)
                .join('');
        }
        
        // Update intersection form
        if (properties.intersection_form !== undefined) {
            document.getElementById('intersection-form').textContent = properties.intersection_form;
        }
        
        // Update Kirby-Siebenmann invariant
        if (properties.kirby_siebenmann !== undefined) {
            document.getElementById('kirby-siebenmann').textContent = properties.kirby_siebenmann;
        }
        
        // Update CTC stability
        if (properties.ctc_stability !== undefined) {
            const stabilityBadge = document.getElementById('ctc-stability');
            stabilityBadge.textContent = properties.ctc_stability ? 'Stable' : 'Unstable';
            stabilityBadge.className = properties.ctc_stability ? 'badge bg-success' : 'badge bg-warning';
        }
        
        // Update genus
        if (properties.genus !== undefined) {
            document.getElementById('genus').textContent = properties.genus;
        }
        
        // Update fundamental group
        if (properties.fundamental_group !== undefined) {
            document.getElementById('fundamental-group').textContent = properties.fundamental_group;
        }
    }
    
    toggleAnimation() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        
        if (this.isAnimating) {
            this.isAnimating = false;
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play Animation';
            playPauseBtn.classList.remove('btn-warning');
            playPauseBtn.classList.add('btn-primary');
            
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        } else {
            this.isAnimating = true;
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Animation';
            playPauseBtn.classList.remove('btn-primary');
            playPauseBtn.classList.add('btn-warning');
            
            this.animate();
        }
    }
    
    animate() {
        if (!this.isAnimating) return;
        
        // Update time parameter
        this.currentTime = (this.currentTime + this.animationSpeed) % (2 * Math.PI);
        
        // Update time slider and display
        const timeSlider = document.getElementById('time');
        const timeValueDisplay = document.getElementById('time-value');
        timeSlider.value = this.currentTime;
        timeValueDisplay.textContent = this.currentTime.toFixed(2);
        
        // Update visualization
        this.updateVisualization();
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    resetParameters() {
        // Reset all sliders to default values
        document.getElementById('kx').value = this.defaultParams.kx;
        document.getElementById('ky').value = this.defaultParams.ky;
        document.getElementById('kz').value = this.defaultParams.kz;
        document.getElementById('kt').value = this.defaultParams.kt;
        document.getElementById('loop-factor').value = this.defaultParams.loopFactor;
        document.getElementById('time').value = this.defaultParams.time;
        
        // Update value displays
        document.getElementById('kx-value').textContent = this.defaultParams.kx.toFixed(1);
        document.getElementById('ky-value').textContent = this.defaultParams.ky.toFixed(1);
        document.getElementById('kz-value').textContent = this.defaultParams.kz.toFixed(1);
        document.getElementById('kt-value').textContent = this.defaultParams.kt.toFixed(1);
        document.getElementById('loop-factor-value').textContent = this.defaultParams.loopFactor;
        document.getElementById('time-value').textContent = this.defaultParams.time.toFixed(2);
        
        // Reset current time
        this.currentTime = this.defaultParams.time;
        
        // Stop animation if running
        if (this.isAnimating) {
            this.toggleAnimation();
        }
        
        // Update visualization
        this.updateVisualization();
    }
    
    getDefaultLayout() {
        return {
            ...PlotlyDefaults.getDefault3DLayout(),
            title: {
                text: 'Spacetime Klein Bottle',
                font: { size: 20 }
            },
            scene: {
                ...PlotlyDefaults.getDefault3DLayout().scene,
                aspectmode: 'cube',
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                }
            }
        };
    }
}

// Initialize the explorer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.skbExplorer = new SKBExplorer();
});