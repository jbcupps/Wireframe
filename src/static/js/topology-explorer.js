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
const twistValue = document.getElementById('twist-value');
const resolutionValue = document.getElementById('resolution-value');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reducedMotion;
let mesh;
let lineGroup;
let inspectionGroup;
let inspectionMarker;
let inspectionPoints = [];
let animationFrame;
let start = performance.now();
let hasFittedView = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#09101e');
scene.fog = new THREE.Fog('#09101e', 9, 18);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(4.2, 3.2, 5.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = playing;
controls.autoRotateSpeed = 0.55;

scene.add(new THREE.AmbientLight(0xffffff, 0.62));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(3, 4, 5);
scene.add(key);
const rim = new THREE.PointLight(accent, 1.8, 18);
rim.position.set(-3, 1.2, -2.5);
scene.add(rim);

const grid = new THREE.GridHelper(9, 12, '#28466e', '#162842');
grid.position.y = -2.65;
grid.material.transparent = true;
grid.material.opacity = 0.32;
scene.add(grid);

function parseColor(hex) {
    return new THREE.Color(hex);
}

function surfaceGeometry(fn, uSegments, vSegments, wire = false, { stitchMobiusSeam = false } = {}) {
    const positions = [];
    const colors = [];
    const indices = [];
    const color = parseColor(accent);
    const shadow = new THREE.Color('#27355f');
    const highlight = new THREE.Color('#eaf8ff');

    const uRowCount = stitchMobiusSeam ? uSegments : uSegments + 1;
    for (let i = 0; i < uRowCount; i += 1) {
        const u = i / uSegments;
        for (let j = 0; j <= vSegments; j += 1) {
            const v = j / vSegments;
            const p = fn(u, v);
            positions.push(p.x, p.y, p.z);
            const wave = 0.5 + 0.5 * Math.sin((u * 1.8 + v * 0.7) * Math.PI);
            const vertexColor = shadow.clone().lerp(color, 0.42 + wave * 0.48);
            vertexColor.lerp(highlight, Math.max(0, Math.sin((u - v) * Math.PI)) * 0.1);
            colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
        }
    }

    for (let i = 0; i < uSegments; i += 1) {
        for (let j = 0; j < vSegments; j += 1) {
            const atMobiusSeam = stitchMobiusSeam && i === uSegments - 1;
            const nextRow = atMobiusSeam ? 0 : i + 1;
            const a = i * (vSegments + 1) + j;
            const b = nextRow * (vSegments + 1) + (atMobiusSeam ? vSegments - j : j);
            const c = nextRow * (vSegments + 1) + (atMobiusSeam ? vSegments - j - 1 : j + 1);
            const d = a + 1;
            indices.push(a, b, d, b, c, d);
        }
    }

    // A Möbius strip identifies its final cross-section with the first one in
    // reverse order. Wrapping the final sampling row to that reversed row
    // creates the identification without overlapping, zero-area seam faces.

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.14,
        roughness: 0.31,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: wire ? 0.9 : 0.96,
        wireframe: wire,
    });
    return new THREE.Mesh(geometry, material);
}

function disposeObject(object) {
    object.traverse((child) => {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
        } else {
            child.material?.dispose();
        }
    });
}

function createInspectionPath(fn, twist, followsMobiusSeam = false) {
    const group = new THREE.Group();
    const points = [];
    const pathPointCount = followsMobiusSeam ? 180 : 181;
    for (let i = 0; i < pathPointCount; i += 1) {
        const u = i / 180;
        // At the Möbius seam, v maps to 1 - v.  This path starts and ends at
        // matching identified points, so it remains a single closed guide.
        const v = followsMobiusSeam
            ? 0.5 + 0.22 * Math.cos(u * Math.PI * 2)
            : 0.58 + 0.12 * Math.sin(u * Math.PI * 4);
        const point = fn(u, v, twist);
        points.push(new THREE.Vector3(point.x, point.y, point.z));
    }

    const line = new (followsMobiusSeam ? THREE.LineLoop : THREE.Line)(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }),
    );
    const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 16, 16),
        new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: accent, emissiveIntensity: 1.4 }),
    );
    marker.position.copy(points[0]);
    group.add(line, marker);
    inspectionMarker = marker;
    inspectionPoints = points;
    return group;
}

function mobiusPoint(u, v, twist) {
    const safeU = THREE.MathUtils.clamp(Number.isFinite(u) ? u : 0, 0, 1);
    const safeV = THREE.MathUtils.clamp(Number.isFinite(v) ? v : 0.5, 0, 1);
    const twistRatio = THREE.MathUtils.clamp(Number.isFinite(twist) ? twist : 0.65, 0, 2);
    const U = safeU * Math.PI * 2;
    const V = (safeV - 0.5) * 1.15;

    // Keep the endpoint rotation at exactly half a turn: theta(0) = 0 and
    // theta(1) = PI.  The sinusoidal term adds smooth, visible local twists
    // while preserving the Möbius edge identification for every slider value.
    const half = U * 0.5 + twistRatio * Math.PI * 0.8 * Math.sin(U * 2);
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

function getFocusObject() {
    return mesh || lineGroup || inspectionGroup;
}

function fitCameraToObject(force = false) {
    const focus = getFocusObject();
    if (!focus) return;

    const bounds = new THREE.Box3().setFromObject(focus);
    if (bounds.isEmpty()) return;

    const center = bounds.getCenter(new THREE.Vector3());
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.75);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.1));
    const requiredDistance = Math.max(
        radius / Math.sin(verticalFov / 2),
        radius / Math.sin(horizontalFov / 2),
    ) * 1.18;
    const currentDistance = camera.position.distanceTo(controls.target);

    if (force || !hasFittedView || currentDistance < requiredDistance) {
        const direction = camera.position.clone().sub(controls.target);
        if (direction.lengthSq() < 0.001) direction.set(4.2, 3.2, 5.6);
        direction.normalize();
        camera.position.copy(center).addScaledVector(direction, requiredDistance);
    }

    controls.target.copy(center);
    controls.minDistance = Math.max(1.2, radius * 0.8);
    controls.maxDistance = requiredDistance * 4;
    camera.near = Math.max(0.05, requiredDistance / 100);
    camera.far = Math.max(100, requiredDistance * 8);
    camera.updateProjectionMatrix();
    controls.update();
    hasFittedView = true;
}

function createGeometry() {
    const resolution = THREE.MathUtils.clamp(Number(resolutionControl.value) || 64, 32, 96);
    const twist = THREE.MathUtils.clamp(Number(twistControl.value) || 0, 0, 2);
    const wire = wireframeControl.checked;
    twistValue.textContent = twist.toFixed(2);
    resolutionValue.textContent = String(resolution);

    if (mesh) {
        scene.remove(mesh);
        disposeObject(mesh);
        mesh = undefined;
    }
    if (lineGroup) {
        scene.remove(lineGroup);
        disposeObject(lineGroup);
        lineGroup = undefined;
    }
    if (inspectionGroup) {
        scene.remove(inspectionGroup);
        disposeObject(inspectionGroup);
        inspectionGroup = undefined;
        inspectionMarker = undefined;
        inspectionPoints = [];
    }

    if (mode === 'curves') {
        lineGroup = createCurveGroup(twist);
        scene.add(lineGroup);
        fitCameraToObject();
        statusEl.textContent = `Four closed loop families at twist ${twist.toFixed(2)}. Pause to compare their winding.`;
        return;
    }

    if (mode === 'immersion') {
        lineGroup = createImmersionGroup(twist);
        scene.add(lineGroup);
        fitCameraToObject();
        statusEl.textContent = `A 4D frame projected into 3D at rotation ${twist.toFixed(2)}. Move the twist in small steps.`;
        return;
    }

    const fnByMode = {
        mobius: mobiusPoint,
        klein: kleinPoint,
        projective: projectivePoint,
        crosscap: crosscapPoint,
    };
    const fn = fnByMode[mode] || kleinPoint;
    const isMobius = mode === 'mobius';
    mesh = surfaceGeometry(
        (u, v) => fn(u, v, twist),
        resolution,
        Math.max(18, Math.floor(resolution * 0.68)),
        wire,
        { stitchMobiusSeam: isMobius },
    );
    scene.add(mesh);
    inspectionGroup = createInspectionPath(fn, twist, isMobius);
    scene.add(inspectionGroup);
    fitCameraToObject();
    statusEl.textContent = isMobius
        ? `One continuous Möbius strip with twist variation ${twist.toFixed(2)}. Follow the closed bright path, then drag to inspect it.`
        : `${config.title || mode} at twist ${twist.toFixed(2)}. Follow the bright path, then drag to inspect it.`;
}

function resize() {
    const bounds = viewer.getBoundingClientRect();
    const width = Math.max(320, bounds.width);
    const height = Math.max(360, bounds.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    fitCameraToObject();
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
        if (inspectionMarker && inspectionPoints.length) {
            const index = Math.floor((elapsed * 18) % inspectionPoints.length);
            inspectionMarker.position.copy(inspectionPoints[index]);
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
    playButton.textContent = playing ? 'Pause motion' : 'Play motion';
    playButton.setAttribute('aria-label', playing ? 'Pause motion' : 'Play motion');
    statusEl.textContent = playing ? 'Motion resumed. Drag at any time to take over the view.' : 'Motion paused. Compare the shape from this angle.';
});

resetButton.addEventListener('click', () => {
    fitCameraToObject(true);
    start = performance.now();
});

twistControl.addEventListener('input', createGeometry);
resolutionControl.addEventListener('input', createGeometry);
wireframeControl.addEventListener('change', createGeometry);
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => cancelAnimationFrame(animationFrame));
window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.code === 'Space') {
        event.preventDefault();
        playButton.click();
    }
    if (event.key.toLowerCase() === 'r') resetButton.click();
});

resize();
createGeometry();
if (reducedMotion) {
    playButton.textContent = 'Play motion';
    playButton.setAttribute('aria-label', 'Play motion');
    statusEl.textContent = 'Motion is paused to respect your reduced-motion preference. Drag to inspect the model.';
}
animate(performance.now());
