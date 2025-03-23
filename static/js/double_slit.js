// Initialize Three.js components
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight * 0.6); // 60% of viewport height
document.getElementById('scene').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Define parameters (arbitrary units)
let d = 1;        // Slit separation
let lambda = 0.1; // Wavelength
const L = 10;     // Distance to screen
const X = 5;      // Half-width of screen
const Y = 5;      // Half-height of screen
const M = 100;    // Number of histogram bins
const binWidth = 2 * X / M;
const binCenters = Array.from({length: M}, (_, i) => -X + (i + 0.5) * binWidth);
let binCounts = new Array(M).fill(0);

// State variables
let currentMode = 'wave';
let isPlaying = false;
let simulationInterval;
const detectionGroup = new THREE.Group();
scene.add(detectionGroup);

// Create the barrier with slits
const barrierShape = new THREE.Shape();
barrierShape.moveTo(-X * 2, -Y * 2);
barrierShape.lineTo(X * 2, -Y * 2);
barrierShape.lineTo(X * 2, Y * 2);
barrierShape.lineTo(-X * 2, Y * 2);
barrierShape.lineTo(-X * 2, -Y * 2);

const slitWidth = 0.1;
const slitHeight = 1;
const slit1 = new THREE.Path();
slit1.moveTo(-d/2 - slitWidth/2, -slitHeight/2);
slit1.lineTo(-d/2 + slitWidth/2, -slitHeight/2);
slit1.lineTo(-d/2 + slitWidth/2, slitHeight/2);
slit1.lineTo(-d/2 - slitWidth/2, slitHeight/2);
slit1.lineTo(-d/2 - slitWidth/2, -slitHeight/2);

const slit2 = new THREE.Path();
slit2.moveTo(d/2 - slitWidth/2, -slitHeight/2);
slit2.lineTo(d/2 + slitWidth/2, -slitHeight/2);
slit2.lineTo(d/2 + slitWidth/2, slitHeight/2);
slit2.lineTo(d/2 - slitWidth/2, slitHeight/2);
slit2.lineTo(d/2 - slitWidth/2, -slitHeight/2);

barrierShape.holes.push(slit1, slit2);
const barrierGeometry = new THREE.ShapeGeometry(barrierShape);
const barrierMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
barrier.position.set(0, 0, 0);
scene.add(barrier);

// Create the detection screen
const screenGeometry = new THREE.PlaneGeometry(2 * X, 2 * Y);
const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const screen = new THREE.Mesh(screenGeometry, screenMaterial);
screen.position.set(0, 0, L);
scene.add(screen);

// Plotly plot reference
const plotDiv = document.getElementById('plot');

// Functions
function sampleX() {
    while (true) {
        const x = Math.random() * 2 * X - X;
        const P = Math.cos(Math.PI * d * x / (lambda * L)) ** 2;
        if (Math.random() < P) return x;
    }
}

function addParticle() {
    const x = sampleX();
    const y = 0; // Simplified; could add small random y for realism
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, L);
    detectionGroup.add(sphere);

    // Update histogram
    const binIndex = Math.floor((x + X) / (2 * X) * M);
    if (binIndex >= 0 && binIndex < M) binCounts[binIndex]++;
    if (currentMode === 'particle') updateHistogram();
}

function updateHistogram() {
    const data = [{
        x: binCenters,
        y: binCounts,
        type: 'bar',
        width: binWidth,
        marker: {
            color: PlotlyDefaults.colors.realColor
        }
    }];
    
    // Add theoretical curve overlay
    const xValues = Array.from({length: 100}, (_, i) => -X + i * (2 * X) / 99);
    const IValues = xValues.map(x => Math.cos(Math.PI * d * x / (lambda * L)) ** 2);
    data.push({
        x: xValues,
        y: IValues,
        type: 'scatter',
        mode: 'lines',
        name: 'Theoretical',
        line: {
            color: PlotlyDefaults.colors.imagColor
        }
    });

    Plotly.newPlot(plotDiv, data, PlotlyDefaults.getDefaultLayout('Detection Pattern', 'Position (x)', 'Count / Intensity'));
}

function computeTheoreticalI() {
    const xValues = Array.from({length: 100}, (_, i) => -X + i * (2 * X) / 99);
    const IValues = xValues.map(x => Math.cos(Math.PI * d * x / (lambda * L)) ** 2);
    const data = [{
        x: xValues,
        y: IValues,
        type: 'scatter',
        mode: 'lines',
        name: 'Intensity',
        line: {
            color: PlotlyDefaults.colors.imagColor
        }
    }];

    Plotly.newPlot(plotDiv, data, PlotlyDefaults.getDefaultLayout('Intensity Pattern', 'Position (x)', 'Intensity'));
}

function switchMode(mode) {
    currentMode = mode;
    if (mode === 'wave') {
        detectionGroup.visible = false;
        computeTheoreticalI();
        if (simulationInterval) clearInterval(simulationInterval);
    } else {
        detectionGroup.visible = true;
        updateHistogram();
        if (isPlaying) simulationInterval = setInterval(addParticle, 100);
    }
}

function resetSimulation() {
    while (detectionGroup.children.length > 0) {
        detectionGroup.remove(detectionGroup.children[0]);
    }
    binCounts.fill(0);
    if (currentMode === 'particle') updateHistogram();
    else computeTheoreticalI();
}

// UI event listeners
document.getElementById('d-slider').addEventListener('input', (e) => {
    d = parseFloat(e.target.value);
    document.getElementById('d-value').textContent = d.toFixed(1);
    resetSimulation();
});

document.getElementById('lambda-slider').addEventListener('input', (e) => {
    lambda = parseFloat(e.target.value);
    document.getElementById('lambda-value').textContent = lambda.toFixed(2);
    resetSimulation();
});

document.getElementById('mode-toggle').addEventListener('change', (e) => {
    switchMode(e.target.checked ? 'particle' : 'wave');
});

document.getElementById('play-button').addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying && currentMode === 'particle') {
        simulationInterval = setInterval(addParticle, 100);
    } else {
        clearInterval(simulationInterval);
    }
});

document.getElementById('reset-button').addEventListener('click', resetSimulation);

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height * 0.6);
});

// Initial setup
switchMode('wave');

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate(); 