// Oscillator Visualization Code
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Plotly.js plots
    let t = Array.from({length: 1000}, (_, i) => i * 0.01);
    let gamma = 0.1;
    let t0 = 5;
    let omega = 2;
    let isPlaying = false;
    let animationId;
    let currentTime = 0;

    // Function to calculate the complex oscillator values
    function calculateOscillator(t, gamma, t0, omega) {
        const envelope = Math.exp(-gamma * Math.pow(t - t0, 2));
        const real = envelope * Math.cos(omega * t);
        const imag = envelope * Math.sin(omega * t);
        return { envelope, real, imag };
    }

    // Calculate initial values
    let values = t.map(time => calculateOscillator(time, gamma, t0, omega));
    let envelopes = values.map(v => v.envelope);
    let reals = values.map(v => v.real);
    let imags = values.map(v => v.imag);

    // Create 3D plot
    const plot3d = document.getElementById('plot3d');
    Plotly.newPlot(plot3d, [{
        type: 'scatter3d',
        mode: 'lines',
        x: t,
        y: reals,
        z: imags,
        line: {
            width: 4,
            color: PlotlyDefaults.colors.primary
        },
        name: 'Complex Path'
    }], PlotlyDefaults.getDefault3DLayout('3D Complex Path', 'Time', 'Real Part', 'Imaginary Part'));

    // Create spiral plot
    const spiralPlot = document.getElementById('spiral-plot');
    Plotly.newPlot(spiralPlot, [{
        type: 'scatter',
        mode: 'lines',
        x: reals,
        y: imags,
        line: {
            width: 3,
            color: PlotlyDefaults.colors.primary
        },
        name: 'Complex Plane'
    }], PlotlyDefaults.getDefaultLayout('Complex Plane Projection', 'Real Part', 'Imaginary Part'));

    // Create real part plot
    const realPlot = document.getElementById('real-plot');
    Plotly.newPlot(realPlot, [
        {
            type: 'scatter',
            mode: 'lines',
            x: t,
            y: reals,
            line: {
                width: 3,
                color: PlotlyDefaults.colors.realColor
            },
            name: 'Real Part'
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: t,
            y: envelopes,
            line: {
                width: 2,
                color: PlotlyDefaults.colors.envelopeColor,
                dash: 'dash'
            },
            name: 'Envelope'
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: t,
            y: envelopes.map(v => -v),
            line: {
                width: 2,
                color: PlotlyDefaults.colors.envelopeColor,
                dash: 'dash'
            },
            showlegend: false
        }
    ], PlotlyDefaults.getDefaultLayout('Real Component', 'Time', 'Amplitude'));

    // Create imaginary part plot
    const imagPlot = document.getElementById('imag-plot');
    Plotly.newPlot(imagPlot, [
        {
            type: 'scatter',
            mode: 'lines',
            x: t,
            y: imags,
            line: {
                width: 3,
                color: PlotlyDefaults.colors.imagColor
            },
            name: 'Imaginary Part'
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: t,
            y: envelopes,
            line: {
                width: 2,
                color: PlotlyDefaults.colors.envelopeColor,
                dash: 'dash'
            },
            name: 'Envelope'
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: t,
            y: envelopes.map(v => -v),
            line: {
                width: 2,
                color: PlotlyDefaults.colors.envelopeColor,
                dash: 'dash'
            },
            showlegend: false
        }
    ], PlotlyDefaults.getDefaultLayout('Imaginary Component', 'Time', 'Amplitude'));

    // Update parameter displays
    document.getElementById('gamma-value').textContent = gamma.toFixed(2);
    document.getElementById('t0-value').textContent = t0.toFixed(1);
    document.getElementById('omega-value').textContent = omega.toFixed(1);

    // Parameter change handlers
    document.getElementById('gamma').addEventListener('input', function(e) {
        gamma = parseFloat(e.target.value);
        document.getElementById('gamma-value').textContent = gamma.toFixed(2);
        updatePlots();
    });

    document.getElementById('t0').addEventListener('input', function(e) {
        t0 = parseFloat(e.target.value);
        document.getElementById('t0-value').textContent = t0.toFixed(1);
        updatePlots();
    });

    document.getElementById('omega').addEventListener('input', function(e) {
        omega = parseFloat(e.target.value);
        document.getElementById('omega-value').textContent = omega.toFixed(1);
        updatePlots();
    });

    // Animation controls
    const playPauseBtn = document.getElementById('play-pause');
    const timeSlider = document.getElementById('time-slider');
    const currentTimeDisplay = document.getElementById('current-time');

    playPauseBtn.addEventListener('click', function() {
        isPlaying = !isPlaying;
        this.innerHTML = isPlaying ? '<i class="fas fa-pause"></i> Pause' : '<i class="fas fa-play"></i> Play';
        
        if (isPlaying) {
            animate();
        } else {
            cancelAnimationFrame(animationId);
        }
    });

    timeSlider.addEventListener('input', function(e) {
        currentTime = parseFloat(e.target.value);
        currentTimeDisplay.textContent = `t = ${currentTime.toFixed(2)}`;
        updateAnimation(currentTime);
    });

    function animate() {
        currentTime += 0.05;
        if (currentTime > 10) currentTime = 0;
        
        timeSlider.value = currentTime;
        currentTimeDisplay.textContent = `t = ${currentTime.toFixed(2)}`;
        
        updateAnimation(currentTime);
        
        if (isPlaying) {
            animationId = requestAnimationFrame(animate);
        }
    }

    function updateAnimation(time) {
        const current = calculateOscillator(time, gamma, t0, omega);
        
        // Update 3D plot marker position
        // Save the camera state first
        const cameraState = plot3d.layout.scene.camera;
        
        Plotly.addTraces(plot3d, {
            type: 'scatter3d',
            mode: 'markers',
            x: [time],
            y: [current.real],
            z: [current.imag],
            marker: {
                size: 10,
                color: '#FFFFFF',  // White dot for better contrast
                line: {
                    color: PlotlyDefaults.colors.primary,
                    width: 2
                }
            },
            showlegend: false
        });
        
        // Remove old animation point, keep only the latest
        if (plot3d.data.length > 2) {
            Plotly.deleteTraces(plot3d, 1);
        }
        
        // Restore camera position
        Plotly.relayout(plot3d, {'scene.camera': cameraState});
        
        // Update spiral plot marker
        Plotly.addTraces(spiralPlot, {
            type: 'scatter',
            mode: 'markers',
            x: [current.real],
            y: [current.imag],
            marker: {
                size: 10,
                color: '#FFFFFF',
                line: {
                    color: PlotlyDefaults.colors.primary,
                    width: 2
                }
            },
            showlegend: false
        });
        
        // Remove old spiral marker, keep only the latest
        if (spiralPlot.data.length > 2) {
            Plotly.deleteTraces(spiralPlot, 1);
        }
        
        // Update real part plot marker
        Plotly.addTraces(realPlot, {
            type: 'scatter',
            mode: 'markers',
            x: [time],
            y: [current.real],
            marker: {
                size: 10,
                color: '#FFFFFF',
                line: {
                    color: PlotlyDefaults.colors.realColor,
                    width: 2
                }
            },
            showlegend: false
        });
        
        // Remove old real part marker, keep only the latest
        if (realPlot.data.length > 4) {
            Plotly.deleteTraces(realPlot, 3);
        }
        
        // Update imaginary part plot marker
        Plotly.addTraces(imagPlot, {
            type: 'scatter',
            mode: 'markers',
            x: [time],
            y: [current.imag],
            marker: {
                size: 10,
                color: '#FFFFFF',
                line: {
                    color: PlotlyDefaults.colors.imagColor,
                    width: 2
                }
            },
            showlegend: false
        });
        
        // Remove old imaginary part marker, keep only the latest
        if (imagPlot.data.length > 4) {
            Plotly.deleteTraces(imagPlot, 3);
        }
    }

    function updatePlots() {
        values = t.map(time => calculateOscillator(time, gamma, t0, omega));
        envelopes = values.map(v => v.envelope);
        reals = values.map(v => v.real);
        imags = values.map(v => v.imag);
        
        Plotly.update(plot3d, {
            y: [reals],
            z: [imags]
        }, {});
        
        Plotly.update(spiralPlot, {
            x: [reals],
            y: [imags]
        }, {});
        
        Plotly.update(realPlot, {
            y: [reals, envelopes, envelopes.map(v => -v)]
        }, {});
        
        Plotly.update(imagPlot, {
            y: [imags, envelopes, envelopes.map(v => -v)]
        }, {});
        
        updateAnimation(currentTime);
    }
}); 