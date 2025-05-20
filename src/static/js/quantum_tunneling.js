// Three.js Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight * 0.6), 0.1, 1000);
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight * 0.6);
document.getElementById('scene').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.enableZoom = true;

// Simulation Parameters
const L = 10;       // Domain: [-L, L]
const N = 1000;     // Spatial grid points
const dx = 2 * L / (N - 1);
const dt = 0.001;   // Time step
let V = 5;          // Barrier height
let d = 1;          // Barrier width
let p0 = 2;         // Initial momentum
const sigma = 1;    // Gaussian width
const x0 = -5;      // Initial position

// Spatial Grid
const x = Array.from({length: N}, (_, i) => -L + i * dx);

// Potential Function
function getPotential(x, V, d) {
    return Math.abs(x) < d / 2 ? V : 0;
}

// Initialize Wave Function (Gaussian Wave Packet)
function initializePsi() {
    const norm = Math.pow(2 * Math.PI * sigma * sigma, -0.25);
    return x.map(xi => {
        const expTerm = Math.exp(-Math.pow(xi - x0, 2) / (4 * sigma * sigma));
        return {
            re: norm * expTerm * Math.cos(p0 * xi),
            im: norm * expTerm * Math.sin(p0 * xi)
        };
    });
}

let psi = initializePsi();

// Crank-Nicolson Setup
const h = 1; // Reduced Planck constant (set to 1 for simplicity)
const m = 1; // Mass (set to 1 for simplicity)
const a = 1 / (2 * dx * dx);  // Off-diagonal elements
const bBase = -1 / (dx * dx); // Base diagonal element

function timeStep() {
    const b = x.map(xi => bBase + getPotential(xi, V, d));
    const alpha = (dt / 2) * (1 / (2 * m)) / (dx * dx);

    // Right-hand side: (1 - i dt/2 H) ψ
    const rhs = psi.map((p, j) => {
        const Hpsi = (j > 0 ? a * psi[j - 1].re : 0) + b[j] * p.re + (j < N - 1 ? a * psi[j + 1].re : 0);
        const HpsiIm = (j > 0 ? a * psi[j - 1].im : 0) + b[j] * p.im + (j < N - 1 ? a * psi[j + 1].im : 0);
        return {
            re: p.re + (dt / 2) * HpsiIm,
            im: p.im - (dt / 2) * Hpsi
        };
    });

    // Solve (1 + i dt/2 H) ψ^{n+1} = rhs (simplified explicit update for demo)
    // For accuracy, implement Thomas algorithm here
    psi = rhs.map((r, j) => {
        const Hpsi = (j > 0 ? a * rhs[j - 1].re : 0) + b[j] * r.re + (j < N - 1 ? a * rhs[j + 1].re : 0);
        const HpsiIm = (j > 0 ? a * rhs[j - 1].im : 0) + b[j] * r.im + (j < N - 1 ? a * rhs[j + 1].im : 0);
        return {
            re: r.re - (dt / 2) * HpsiIm,
            im: r.im + (dt / 2) * Hpsi
        };
    });
}

// 3D Visualization
const reLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x0000ff }));
const imLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x00ff00 }));
const probLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff0000 }));
scene.add(reLine, imLine, probLine);

// Barrier
const barrierGeometry = new THREE.BoxGeometry(d, 4, V / 5);
const barrierMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 });
const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
barrier.position.set(0, 0, V / 10);
scene.add(barrier);

// Axes Helper
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Update 3D Lines
function updateLines() {
    const rePoints = psi.map((p, i) => new THREE.Vector3(x[i], -1, p.re));
    const imPoints = psi.map((p, i) => new THREE.Vector3(x[i], 0, p.im));
    const probPoints = psi.map((p, i) => new THREE.Vector3(x[i], 1, p.re * p.re + p.im * p.im));
    reLine.geometry.setFromPoints(rePoints);
    imLine.geometry.setFromPoints(imPoints);
    probLine.geometry.setFromPoints(probPoints);
}

// 2D Plot
const plotDiv = document.getElementById('plot');
function updatePlot() {
    const prob = psi.map(p => p.re * p.re + p.im * p.im);
    Plotly.newPlot(plotDiv, [{
        x,
        y: prob,
        type: 'scatter',
        mode: 'lines',
        line: { color: PlotlyDefaults.colors.realColor }
    }], PlotlyDefaults.getDefaultLayout('Probability Density |ψ|²', 'Position (x)', '|ψ|²'));
}

// Calculate Probabilities
function calculateProbabilities() {
    let pLeft = 0, pInside = 0, pRight = 0;
    psi.forEach((p, i) => {
        const prob = (p.re * p.re + p.im * p.im) * dx;
        if (x[i] < -d / 2) pLeft += prob;
        else if (x[i] <= d / 2) pInside += prob;
        else pRight += prob;
    });
    document.getElementById('p-left').textContent = pLeft.toFixed(3);
    document.getElementById('p-inside').textContent = pInside.toFixed(3);
    document.getElementById('p-right').textContent = pRight.toFixed(3);
}

// Animation
let isPlaying = false;
function animate() {
    requestAnimationFrame(animate);
    if (isPlaying) {
        timeStep();
        updateLines();
        updatePlot();
        calculateProbabilities();
    }
    renderer.render(scene, camera);
}
animate();

// Event Listeners
function updateSliderValue(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueId);
    valueSpan.textContent = slider.value;
    return slider;
}

const vSlider = updateSliderValue('V-slider', 'V-value');
const dSlider = updateSliderValue('d-slider', 'd-value');
const p0Slider = updateSliderValue('p0-slider', 'p0-value');

vSlider.addEventListener('input', (e) => {
    V = parseFloat(e.target.value);
    document.getElementById('V-value').textContent = V;
    resetSimulation();
});

dSlider.addEventListener('input', (e) => {
    d = parseFloat(e.target.value);
    document.getElementById('d-value').textContent = d;
    resetSimulation();
});

p0Slider.addEventListener('input', (e) => {
    p0 = parseFloat(e.target.value);
    document.getElementById('p0-value').textContent = p0;
    resetSimulation();
});

document.getElementById('play-button').addEventListener('click', () => {
    isPlaying = !isPlaying;
    document.getElementById('play-button').textContent = isPlaying ? 'Pause' : 'Play';
});

// Reset Simulation
function resetSimulation() {
    psi = initializePsi();
    barrier.scale.set(d, 1, V / 5);
    barrier.position.set(0, 0, V / 10);
    updateLines();
    updatePlot();
    calculateProbabilities();
}

// Window Resize Handler
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight * 0.6;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Initial Setup
resetSimulation();
updatePlot(); 