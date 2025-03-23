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
            color: '#BB86FC'
        },
        name: 'Complex Path'
    }], {
        title: '3D Complex Path',
        scene: {
            xaxis: { title: 'Time' },
            yaxis: { title: 'Real Part' },
            zaxis: { title: 'Imaginary Part' }
        },
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font: {
            color: '#ffffff'
        }
    });

    // Create spiral plot
    const spiralPlot = document.getElementById('spiral-plot');
    Plotly.newPlot(spiralPlot, [{
        type: 'scatter',
        mode: 'lines',
        x: reals,
        y: imags,
        line: {
            width: 3,
            color: '#BB86FC'
        },
        name: 'Complex Plane'
    }], {
        title: 'Complex Plane Projection',
        xaxis: { title: 'Real Part' },
        yaxis: { title: 'Imaginary Part' },
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font: {
            color: '#ffffff'
        }
    });

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
                color: '#FF6E91'
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
                color: '#65FF8F',
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
                color: '#65FF8F',
                dash: 'dash'
            },
            showlegend: false
        }
    ], {
        title: 'Real Component',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Amplitude' },
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font: {
            color: '#ffffff'
        }
    });

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
                color: '#33C4FF'
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
                color: '#65FF8F',
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
                color: '#65FF8F',
                dash: 'dash'
            },
            showlegend: false
        }
    ], {
        title: 'Imaginary Component',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Amplitude' },
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font: {
            color: '#ffffff'
        }
    });

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
        
        // Update 3D plot marker
        Plotly.update(plot3d, {}, {
            'scene.camera': plot3d.layout.scene.camera
        });
        Plotly.addTraces(plot3d, {
            type: 'scatter3d',
            mode: 'markers',
            x: [time],
            y: [current.real],
            z: [current.imag],
            marker: {
                size: 8,
                color: '#BB86FC'
            },
            showlegend: false
        });
        if (plot3d.data.length > 2) {
            Plotly.deleteTraces(plot3d, 1);
        }

        // Update spiral plot marker
        Plotly.update(spiralPlot, {}, {});
        Plotly.addTraces(spiralPlot, {
            type: 'scatter',
            mode: 'markers',
            x: [current.real],
            y: [current.imag],
            marker: {
                size: 8,
                color: '#BB86FC'
            },
            showlegend: false
        });
        if (spiralPlot.data.length > 2) {
            Plotly.deleteTraces(spiralPlot, 1);
        }

        // Update real plot marker
        Plotly.update(realPlot, {}, {});
        Plotly.addTraces(realPlot, {
            type: 'scatter',
            mode: 'markers',
            x: [time],
            y: [current.real],
            marker: {
                size: 8,
                color: '#FF6E91'
            },
            showlegend: false
        });
        if (realPlot.data.length > 4) {
            Plotly.deleteTraces(realPlot, 3);
        }

        // Update imaginary plot marker
        Plotly.update(imagPlot, {}, {});
        Plotly.addTraces(imagPlot, {
            type: 'scatter',
            mode: 'markers',
            x: [time],
            y: [current.imag],
            marker: {
                size: 8,
                color: '#33C4FF'
            },
            showlegend: false
        });
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
            x: [t],
            y: [reals],
            z: [imags]
        });

        Plotly.update(spiralPlot, {
            x: [reals],
            y: [imags]
        });

        Plotly.update(realPlot, {
            'y': [reals, envelopes, envelopes.map(v => -v)]
        });

        Plotly.update(imagPlot, {
            'y': [imags, envelopes, envelopes.map(v => -v)]
        });

        // Update period annotation
        const period = (2 * Math.PI / omega).toFixed(2);
        document.querySelector('.period-annotation').innerHTML = 
            `\\(\\omega \\cdot \\text{const} = ${(omega * period).toFixed(2)}T\\), where \\(T = \\frac{2\\pi}{\\omega}\\)`;
        
        // Refresh MathJax
        if (window.MathJax) {
            MathJax.typesetPromise();
        }
    }
}); 