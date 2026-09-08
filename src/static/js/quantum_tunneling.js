// Quantum tunneling demonstration: finite-difference Crank–Nicolson evolution.
// Natural units: hbar = m = 1. Dirichlet boundaries are held at zero.
const scene = new THREE.Scene();
const sceneElement = document.getElementById('scene');
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
sceneElement.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.enableZoom = true;

const L = 10;
const N = 1000;
const dx = 2 * L / (N - 1);
const dt = 0.001;
const m = 1;
let V = 5;
let d = 1;
let p0 = 2;
const sigma = 1;
const x0 = -5;
const x = Array.from({ length: N }, (_, index) => -L + index * dx);

function getPotential(position, height, width) {
    return Math.abs(position) < width / 2 ? height : 0;
}

function normalizeWavefunction(values) {
    const norm = Math.sqrt(values.reduce((sum, value) => sum + value.re * value.re + value.im * value.im, 0) * dx);
    return values.map(value => ({ re: value.re / norm, im: value.im / norm }));
}

function initializePsi() {
    const amplitude = Math.pow(2 * Math.PI * sigma * sigma, -0.25);
    const values = x.map(position => {
        const envelope = amplitude * Math.exp(-Math.pow(position - x0, 2) / (4 * sigma * sigma));
        return { re: envelope * Math.cos(p0 * position), im: envelope * Math.sin(p0 * position) };
    });
    values[0] = { re: 0, im: 0 };
    values[N - 1] = { re: 0, im: 0 };
    return normalizeWavefunction(values);
}

let psi = initializePsi();

function multiply(left, right) {
    return { re: left.re * right.re - left.im * right.im, im: left.re * right.im + left.im * right.re };
}

function subtract(left, right) {
    return { re: left.re - right.re, im: left.im - right.im };
}

function divide(numerator, denominator) {
    const magnitudeSquared = denominator.re * denominator.re + denominator.im * denominator.im;
    return {
        re: (numerator.re * denominator.re + numerator.im * denominator.im) / magnitudeSquared,
        im: (numerator.im * denominator.re - numerator.re * denominator.im) / magnitudeSquared
    };
}

function probabilityNorm() {
    return psi.reduce((sum, value) => sum + value.re * value.re + value.im * value.im, 0) * dx;
}

// Solve (I + i dt H / 2) psi(t + dt) = (I - i dt H / 2) psi(t).
// H uses the centered second derivative; Thomas' algorithm solves the complex tridiagonal system.
function timeStep() {
    const count = N - 2;
    const kinetic = 1 / (2 * m * dx * dx);
    const offDiagonal = { re: 0, im: -(dt * kinetic) / 2 };
    const cPrime = new Array(count);
    const dPrime = new Array(count);

    for (let interiorIndex = 0; interiorIndex < count; interiorIndex += 1) {
        const gridIndex = interiorIndex + 1;
        const potential = getPotential(x[gridIndex], V, d);
        const beta = (dt / 2) * (2 * kinetic + potential);
        const diagonal = { re: 1, im: beta };
        const value = psi[gridIndex];
        const left = psi[gridIndex - 1];
        const right = psi[gridIndex + 1];
        const rhs = {
            re: value.re + beta * value.im + offDiagonal.im * (left.im + right.im),
            im: value.im - beta * value.re + (-offDiagonal.im) * (left.re + right.re)
        };

        if (interiorIndex === 0) {
            cPrime[interiorIndex] = divide(offDiagonal, diagonal);
            dPrime[interiorIndex] = divide(rhs, diagonal);
            continue;
        }

        const denominator = subtract(diagonal, multiply(offDiagonal, cPrime[interiorIndex - 1]));
        cPrime[interiorIndex] = interiorIndex === count - 1 ? { re: 0, im: 0 } : divide(offDiagonal, denominator);
        dPrime[interiorIndex] = divide(subtract(rhs, multiply(offDiagonal, dPrime[interiorIndex - 1])), denominator);
    }

    const next = Array.from({ length: N }, () => ({ re: 0, im: 0 }));
    next[N - 2] = dPrime[count - 1];
    for (let interiorIndex = count - 2; interiorIndex >= 0; interiorIndex -= 1) {
        next[interiorIndex + 1] = subtract(dPrime[interiorIndex], multiply(cPrime[interiorIndex], next[interiorIndex + 2]));
    }
    psi = next;
}

const reLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xd87d61 }));
const imLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x75a9ce }));
const probLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x7cab8a }));
scene.add(reLine, imLine, probLine);

const barrierGeometry = new THREE.BoxGeometry(1, 4, 1);
const barrierMaterial = new THREE.MeshBasicMaterial({ color: 0xb5bec9, transparent: true, opacity: 0.45 });
const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
scene.add(barrier);
scene.add(new THREE.AxesHelper(5));

function updateLines() {
    reLine.geometry.setFromPoints(psi.map((value, index) => new THREE.Vector3(x[index], -1, value.re)));
    imLine.geometry.setFromPoints(psi.map((value, index) => new THREE.Vector3(x[index], 0, value.im)));
    probLine.geometry.setFromPoints(psi.map((value, index) => new THREE.Vector3(x[index], 1, value.re * value.re + value.im * value.im)));
}

const plotDiv = document.getElementById('plot');
function updatePlot() {
    const probability = psi.map(value => value.re * value.re + value.im * value.im);
    const trace = { x, y: probability, type: 'scatter', mode: 'lines', line: { color: PlotlyDefaults.colors.realColor }, name: '|psi|²' };
    Plotly.react(plotDiv, [trace], PlotlyDefaults.getDefaultLayout('Probability Density |ψ|²', 'Position (x)', '|ψ|²'), PlotlyDefaults.getDefaultConfig());
}

function calculateProbabilities() {
    let left = 0;
    let inside = 0;
    let right = 0;
    psi.forEach((value, index) => {
        const probability = (value.re * value.re + value.im * value.im) * dx;
        if (x[index] < -d / 2) left += probability;
        else if (x[index] <= d / 2) inside += probability;
        else right += probability;
    });
    document.getElementById('p-left').textContent = left.toFixed(3);
    document.getElementById('p-inside').textContent = inside.toFixed(3);
    document.getElementById('p-right').textContent = right.toFixed(3);
    document.getElementById('p-total').textContent = probabilityNorm().toFixed(6);
}

let isPlaying = false;
let framesSincePlot = 0;
function animate() {
    requestAnimationFrame(animate);
    if (isPlaying) {
        timeStep();
        updateLines();
        calculateProbabilities();
        framesSincePlot = (framesSincePlot + 1) % 3;
        if (framesSincePlot === 0) updatePlot();
    }
    renderer.render(scene, camera);
}
animate();

function updateSliderValue(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    document.getElementById(valueId).textContent = slider.value;
    return slider;
}

const vSlider = updateSliderValue('V-slider', 'V-value');
const dSlider = updateSliderValue('d-slider', 'd-value');
const p0Slider = updateSliderValue('p0-slider', 'p0-value');

vSlider.addEventListener('input', event => { V = Number(event.target.value); document.getElementById('V-value').textContent = V; resetSimulation(); });
dSlider.addEventListener('input', event => { d = Number(event.target.value); document.getElementById('d-value').textContent = d; resetSimulation(); });
p0Slider.addEventListener('input', event => { p0 = Number(event.target.value); document.getElementById('p0-value').textContent = p0; resetSimulation(); });

document.getElementById('play-button').addEventListener('click', () => {
    isPlaying = !isPlaying;
    document.getElementById('play-button').textContent = isPlaying ? 'Pause' : 'Play';
});

function resetSimulation() {
    psi = initializePsi();
    barrier.scale.set(d, 1, Math.max(V / 5, 0.08));
    barrier.position.set(0, 0, V / 10);
    updateLines();
    updatePlot();
    calculateProbabilities();
}

function resizeScene() {
    const bounds = sceneElement.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(240, bounds.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}

const sceneResizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeScene);
if (sceneResizeObserver) sceneResizeObserver.observe(sceneElement);
window.addEventListener('resize', resizeScene, { passive: true });

resizeScene();
resetSimulation();
