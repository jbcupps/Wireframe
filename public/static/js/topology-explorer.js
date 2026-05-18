import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const config = window.TOPOLOGY_EXPLORER || {};
const mode = config.slug || document.getElementById('topology-viewer')?.dataset.mode || 'klein';
const accent = config.accent || '#00ddff';

const viewer = document.getElementById('topology-viewer');
const statusEl = document.getElementById('viewer-status');
const playButton = document.getElementById('play-toggle');
const resetButton = document.getElementById('reset-view');
const twistControl = document.getElementById('twist-control');
const resolutionControl = document.getElementById('resolution-control');
const wireframeControl = document.getElementById('wireframe-control');

let playing = true;
let mesh;
let lineGroup;
let animationFrame;
let start = performance.now();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#080914');

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(4.2, 3.2, 5.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;

scene.add(new THREE.AmbientLight(0xffffff, 0.62));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(3, 4, 5);
scene.add(key);
const rim = new THREE.PointLight(accent, 1.8, 18);
rim.position.set(-3, 1.2, -2.5);
scene.add(rim);

function parseColor(hex) {
    return new THREE.Color(hex);
}

function surfaceGeometry(fn, uSegments, vSegments, wire = false) {
    const positions = [];
    const colors = [];
    const indices = [];
    const color = parseColor(accent);

    for (let i = 0; i <= uSegments; i += 1) {
        const u = i / uSegments;
        for (let j = 0; j <= vSegments; j += 1) {
            const v = j / vSegments;
            const p = fn(u, v);
            positions.push(p.x, p.y, p.z);
            const shade = 0.58 + 0.42 * Math.sin((u + v) * Math.PI);
            colors.push(color.r * shade, color.g * shade, color.b * shade);
        }
    }

    for (let i = 0; i < uSegments; i += 1) {
        for (let j = 0; j < vSegments; j += 1) {
            const a = i * (vSegments + 1) + j;
            const b = (i + 1) * (vSegments + 1) + j;
            const c = b + 1;
            const d = a + 1;
            indices.push(a, b, d, b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.08,
        roughness: 0.36,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        wireframe: wire,
    });
    return new THREE.Mesh(geometry, material);
}

function mobiusPoint(u, v, twist) {
    const U = u * Math.PI * 2;
    const V = (v - 0.5) * 1.15;
    const half = U * (0.5 + twist * 0.35);
    const radius = 2.0;
    return {
        x: (radius + V * Math.cos(half)) * Math.cos(U),
        y: (radius + V * Math.cos(half)) * Math.sin(U),
        z: V * Math.sin(half),
    };
}

function kleinPoint(u, v, twist) {
    const U = u * Math.PI * 2;
    const V = v * Math.PI * 2;
    const wobble = twist * 0.18 * Math.sin(3 * U);
    const r = 2 + Math.cos(V + wobble);
    return {
        x: r * Math.cos(U),
        y: r * Math.sin(U),
        z: Math.sin(V) * Math.cos(U / 2) + 0.35 * Math.sin(2 * V) * Math.sin(U),
    };
}

function projectivePoint(u, v, twist) {
    const U = (u - 0.5) * Math.PI;
    const V = v * Math.PI * 2;
    const a = Math.cos(U);
    const b = Math.sin(U);
    const pinch = 1 + 0.2 * twist * Math.cos(2 * V);
    return {
        x: pinch * a * Math.cos(V) * (1 + b),
        y: pinch * a * Math.sin(V) * (1 + b),
        z: 1.5 * b + 0.35 * Math.sin(2 * V) * a * twist,
    };
}

function crosscapPoint(u, v, twist) {
    const U = u * Math.PI * 2;
    const V = v * Math.PI;
    const r = Math.sin(V);
    return {
        x: r * Math.sin(U * (1 + twist * 0.2)),
        y: Math.sin(V) * Math.cos(U) * Math.sin(U),
        z: Math.cos(V) + 0.55 * Math.cos(U) * Math.sin(2 * V),
    };
}

function createCurveGroup(twist) {
    const group = new THREE.Group();
    const materialA = new THREE.LineBasicMaterial({ color: accent, linewidth: 2 });
    const materialB = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 });
    for (let k = 0; k < 4; k += 1) {
        const points = [];
        for (let i = 0; i <= 260; i += 1) {
            const t = (i / 260) * Math.PI * 2;
            const p = 2 + 0.42 * Math.cos((k + 1) * t + twist);
            points.push(new THREE.Vector3(
                p * Math.cos(t),
                p * Math.sin(t),
                0.42 * Math.sin((k + 2) * t + k),
            ));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        group.add(new THREE.Line(geometry, k % 2 === 0 ? materialA : materialB));
    }
    return group;
}

function createImmersionGroup(twist) {
    const group = new THREE.Group();
    const vertices = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) for (const w of [-1, 1]) {
        const a = twist * Math.PI * 0.5;
        const xw = x * Math.cos(a) - w * Math.sin(a);
        const ww = x * Math.sin(a) + w * Math.cos(a);
        const scale = 1 / (2.6 - ww * 0.35);
        vertices.push(new THREE.Vector3(xw * scale * 2, y * scale * 2, z * scale * 2));
    }
    const edges = [];
    for (let i = 0; i < 16; i += 1) {
        for (let j = i + 1; j < 16; j += 1) {
            const bits = (i ^ j).toString(2).replaceAll('0', '').length;
            if (bits === 1) edges.push(vertices[i], vertices[j]);
        }
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(edges);
    group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: accent })));
    vertices.forEach((point) => {
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 12, 12),
            new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: accent, emissiveIntensity: 0.2 }),
        );
        marker.position.copy(point);
        group.add(marker);
    });
    return group;
}

function createGeometry() {
    const resolution = Number(resolutionControl.value);
    const twist = Number(twistControl.value);
    const wire = wireframeControl.checked;

    if (mesh) {
        scene.remove(mesh);
        mesh.geometry?.dispose();
        mesh.material?.dispose();
        mesh = undefined;
    }
    if (lineGroup) {
        scene.remove(lineGroup);
        lineGroup = undefined;
    }

    if (mode === 'curves') {
        lineGroup = createCurveGroup(twist);
        scene.add(lineGroup);
        statusEl.textContent = 'Closed loop families rendered. Drag to inspect winding and holonomy.';
        return;
    }

    if (mode === 'immersion') {
        lineGroup = createImmersionGroup(twist);
        scene.add(lineGroup);
        statusEl.textContent = '4D hypercube projected into 3D. Twist rotates through the hidden axis.';
        return;
    }

    const fnByMode = {
        mobius: mobiusPoint,
        klein: kleinPoint,
        projective: projectivePoint,
        crosscap: crosscapPoint,
    };
    const fn = fnByMode[mode] || kleinPoint;
    mesh = surfaceGeometry((u, v) => fn(u, v, twist), resolution, Math.max(18, Math.floor(resolution * 0.68)), wire);
    scene.add(mesh);
    statusEl.textContent = `${config.title || mode} ready. Drag, zoom, and adjust controls.`;
}

function resize() {
    const bounds = viewer.getBoundingClientRect();
    const width = Math.max(320, bounds.width);
    const height = Math.max(360, bounds.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}

function animate(now) {
    const elapsed = (now - start) / 1000;
    if (playing) {
        controls.autoRotate = true;
        if (mesh) {
            mesh.rotation.z = Math.sin(elapsed * 0.35) * 0.08;
        }
        if (lineGroup) {
            lineGroup.rotation.x = elapsed * 0.18;
            lineGroup.rotation.y = elapsed * 0.28;
        }
    } else {
        controls.autoRotate = false;
    }
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
}

playButton.addEventListener('click', () => {
    playing = !playing;
    playButton.textContent = playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
});

resetButton.addEventListener('click', () => {
    camera.position.set(4.2, 3.2, 5.6);
    controls.target.set(0, 0, 0);
    controls.update();
    start = performance.now();
});

twistControl.addEventListener('input', createGeometry);
resolutionControl.addEventListener('change', createGeometry);
wireframeControl.addEventListener('change', createGeometry);
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => cancelAnimationFrame(animationFrame));

resize();
createGeometry();
animate(performance.now());
