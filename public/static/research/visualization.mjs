/** Honest SVG views of supplied simplicial complexes. No symbolic-to-geometry map. */
export const PIECE_COLORS = Object.freeze({ A: '#62d6d0', B: '#d6a3fa', C: '#f0bd72' });
export const FEATURE_COLORS = Object.freeze({ boundary: '#b77800', overfull: '#d32765', seam: '#087f75' });
const vertexKey = value => `${typeof value}:${JSON.stringify(value)}`;
const edgeKey = (a, b) => [vertexKey(a), vertexKey(b)].sort().join('|');
const phaseNames = Object.freeze({ illustrative_phase: 'Illustrative phase', fourth_coordinate_slice: 'Supplied fourth-coordinate slices', model_evolution: 'Model-defined evolution' });

function coordinateMap(entries, vertices) {
  if (!Array.isArray(entries)) return null;
  const map = new Map();
  for (const entry of entries) {
    if (!entry || !Array.isArray(entry.position) || ![3, 4].includes(entry.position.length) ||
        !entry.position.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e12) || map.has(vertexKey(entry.vertex))) return null;
    map.set(vertexKey(entry.vertex), entry.position);
  }
  return vertices.every(vertex => map.has(vertex.key)) ? map : null;
}

/** Pure, testable interpretation of the data; all highlights come from assessment output. */
export function buildViewModel({ geometry, result, candidate } = {}) {
  const pieces = ['A', 'B', 'C'].map((name, i) => ({
    name, color: PIECE_COLORS[name],
    sequence: candidate?.pieces?.[i]?.operations?.join(' · ') || '∅',
  }));
  if (!geometry || !Array.isArray(geometry.pieces) || !geometry.pieces.length) {
    return { mode: 'undefined', title: 'Geometry not yet defined', explanation: 'Symbolic operations do not supply a geometry. Select a mathematical control or supply explicit piece data.', pieces, vertices: [], edges: [], features: [], animation: null };
  }
  const vertexMap = new Map(), edgeMap = new Map();
  for (const piece of geometry.pieces) {
    if (!piece || !Array.isArray(piece.maximal_simplices)) continue;
    for (const simplex of piece.maximal_simplices || []) {
      if (!Array.isArray(simplex)) continue;
      for (const label of simplex) {
        const key = vertexKey(label);
        if (!vertexMap.has(key)) vertexMap.set(key, { key, label, pieces: [] });
        const vertex = vertexMap.get(key);
        if (!vertex.pieces.includes(piece.name)) vertex.pieces.push(piece.name);
      }
      for (let i = 0; i < simplex.length; i++) for (let j = i + 1; j < simplex.length; j++) {
        const key = edgeKey(simplex[i], simplex[j]);
        if (!edgeMap.has(key)) edgeMap.set(key, { key, vertices: [vertexKey(simplex[i]), vertexKey(simplex[j])], pieces: [] });
        const edge = edgeMap.get(key);
        if (!edge.pieces.includes(piece.name)) edge.pieces.push(piece.name);
      }
    }
  }
  const vertices = [...vertexMap.values()], edges = [...edgeMap.values()];
  const features = [];
  const topology = result?.assembled;
  const calculated = result?.visualization;
  for (const face of calculated?.boundary_faces || topology?.boundary_tetrahedra || []) {
    features.push({ type: 'boundary', face, label: `Open boundary [${face.join(', ')}]` });
  }
  for (const item of calculated?.overfull_faces || topology?.overfull_tetrahedra || []) {
    features.push({ type: 'overfull', face: item.facet, label: `Overfull junction [${item.facet.join(', ')}] · incidence ${item.incidence}` });
  }
  for (const seam of calculated?.seams || []) {
    features.push({ type: 'seam', face: seam.face, label: `Shared face [${seam.face.join(', ')}] · pieces ${seam.pieces.join(' / ')} · incidence ${seam.incidence}` });
  }
  for (const feature of features) {
    feature.edgeKeys = new Set();
    for (let i = 0; i < feature.face.length; i++) for (let j = i + 1; j < feature.face.length; j++) feature.edgeKeys.add(edgeKey(feature.face[i], feature.face[j]));
  }
  const embedding = geometry.embedding || {};
  const initial = coordinateMap(embedding.coordinates, vertices);
  const frames = Array.isArray(embedding.frames) ? embedding.frames : [];
  const mappedFrames = frames.map(frame => ({ value: frame?.value, coordinates: coordinateMap(frame?.coordinates, vertices) }));
  const animation = phaseNames[embedding.animation_kind] && typeof embedding.description === 'string' && embedding.description.trim() &&
    mappedFrames.length > 1 && mappedFrames.every(frame => frame.coordinates && typeof frame.value === 'number' && Number.isFinite(frame.value)) ? {
      kind: embedding.animation_kind, label: phaseNames[embedding.animation_kind], description: embedding.description, frames: mappedFrames,
    } : null;
  const coordinates = initial || animation?.frames[0].coordinates;
  return {
    mode: coordinates ? 'coordinates' : 'schematic',
    title: coordinates ? 'Projection of supplied coordinates' : 'SCHEMATIC · vertex–edge connectivity',
    explanation: coordinates ? 'Orthographic projection onto the supplied x, y, z coordinates, with a rotatable 3D camera. The w coordinate is omitted; it is not assumed to be time. A wireframe does not establish an embedding or manifold.' :
      'Vertex labels carry no coordinates. This diagram lays out connectivity only; it is not the actual 4D shape.',
    pieces, vertices, edges, features, coordinates, animation,
    animationExplanation: animation ? `${animation.label}: ${animation.description}. Supplied frames are displayed discretely; no physical interpolation is inferred.` :
      'Animation unavailable: supply at least two complete coordinate frames, an animation kind, and a description. No phase or time evolution is inferred.',
  };
}

/** Mount accessible dependency-free SVG; returns destroy/update methods. */
export function mountVisualization(container, input = {}) {
  const doc = container.ownerDocument;
  let state = { ...input }, model, cleanup = [], timer = null, frameIndex = 0;
  let yaw = 0.3, pitch = -0.2, zoom = 1;
  const element = (tag, text, attrs = {}) => {
    const el = doc.createElement(tag);
    if (text != null) el.textContent = text;
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  const svgElement = (tag, attrs = {}) => {
    const el = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  const listen = (el, event, fn) => { el.addEventListener(event, fn); cleanup.push(() => el.removeEventListener(event, fn)); };
  const stopTimer = () => { if (timer != null) clearInterval(timer); timer = null; };
  function render() {
    stopTimer(); cleanup.forEach(fn => fn()); cleanup = []; frameIndex = 0;
    model = buildViewModel(state);
    container.replaceChildren();
    const title = element('h3', model.title), description = element('p', model.explanation, { class: 'viz-description' });
    container.append(title, description);
    const legend = element('div', null, { class: 'viz-piece-legend' });
    legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin:12px 0';
    for (const piece of model.pieces) {
      const item = element('div', null, { class: `viz-piece viz-piece-${piece.name}` });
      item.style.cssText = `border-left:4px solid ${piece.color};padding:4px 10px;max-width:100%;overflow-wrap:anywhere`;
      item.append(element('strong', `Piece ${piece.name}`), element('div', piece.sequence, { class: 'viz-sequence' }));
      legend.append(item);
    }
    container.append(legend, element('p', 'Colors identify labeled pieces A, B, and C; they are not QCD color charge. Sequence labels do not by themselves define this geometry.', { class: 'viz-caption' }));
    if (model.mode === 'undefined') {
      container.append(element('p', 'Geometry and physical assessments: not tested.', { role: 'status' }));
      return;
    }
    const toolbar = element('div', null, { class: 'viz-toolbar', role: 'group', 'aria-label': 'Camera controls' });
    toolbar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:12px 0';
    const svg = svgElement('svg', { viewBox: '0 0 760 440', role: 'img', tabindex: '0', 'aria-label': `${model.title}. Arrow keys orbit, plus and minus zoom, zero resets.` });
    svg.style.cssText = 'width:100%;height:auto;min-height:220px;max-height:480px;background:var(--viz-background,#f4f6fa);border:1px solid #cbd5e1;border-radius:12px;touch-action:none';
    const accessibleTitle = svgElement('title'); accessibleTitle.textContent = model.title; svg.append(accessibleTitle);
    const layer = svgElement('g'); svg.append(layer);
    const caption = element('p', `${model.vertices.length} vertices · ${model.edges.length} edges. Arrow keys orbit; + / − zoom; 0 resets. Drag to orbit.`, { class: 'viz-caption' });
    const inspection = element('div', null, { class: 'viz-inspection' });
    const faceLabel = element('label', 'Inspect calculated faces ');
    const select = element('select', null, { 'aria-label': 'Inspect calculated faces' });
    select.append(element('option', 'All calculated features', { value: '-1' }));
    model.features.forEach((feature, index) => select.append(element('option', feature.label, { value: index })));
    select.disabled = !model.features.length;
    select.style.cssText = 'max-width:100%';
    faceLabel.append(select); inspection.append(faceLabel);
    const faceInfo = element('p', model.features.length ? 'Amber: boundary · pink: overfull junction · teal: shared seam. Highlights show edges of calculated faces; perspective overlap is not an incidence test.' : 'No calculated faces to highlight. Run the assessment to inspect boundaries and junctions.', { role: 'status' });
    inspection.append(faceInfo);
    container.append(toolbar, svg, caption, inspection);
    let selected = -1;
    const originPositions = () => {
      const coords = model.animation ? model.animation.frames[frameIndex].coordinates : model.coordinates;
      if (coords) return model.vertices.map(vertex => coords.get(vertex.key).slice(0, 3));
      return model.vertices.map((vertex, i) => {
        const angle = i / Math.max(1, model.vertices.length) * Math.PI * 2;
        return [Math.cos(angle), Math.sin(angle), 0];
      });
    };
    function draw() {
      layer.replaceChildren();
      const positions = originPositions();
      const mins = [0, 1, 2].map(k => Math.min(...positions.map(p => p[k])));
      const maxs = [0, 1, 2].map(k => Math.max(...positions.map(p => p[k])));
      const center = mins.map((v, i) => (v + maxs[i]) / 2);
      const scale = 160 * zoom / Math.max(0.00001, ...maxs.map((v, i) => (v - mins[i]) / 2));
      const projected = new Map(model.vertices.map((vertex, i) => {
        const [x, y, z] = positions[i].map((v, k) => v - center[k]);
        const rx = Math.cos(yaw) * x + Math.sin(yaw) * z;
        const rz = -Math.sin(yaw) * x + Math.cos(yaw) * z;
        const ry = Math.cos(pitch) * y - Math.sin(pitch) * rz;
        return [vertex.key, [380 + rx * scale, 220 - ry * scale]];
      }));
      const active = selected < 0 ? model.features : [model.features[selected]];
      for (const edge of model.edges) {
        const p = projected.get(edge.vertices[0]), q = projected.get(edge.vertices[1]);
        if (!p || !q) continue;
        const feature = active.filter(f => f?.edgeKeys.has(edge.key)).sort((a, b) => ['seam', 'boundary', 'overfull'].indexOf(a.type) - ['seam', 'boundary', 'overfull'].indexOf(b.type)).at(-1);
        const line = svgElement('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: feature ? FEATURE_COLORS[feature.type] : edge.pieces.length === 1 ? PIECE_COLORS[edge.pieces[0]] || '#64748b' : '#8492a6', 'stroke-width': feature ? 3.4 : 1.5, opacity: feature ? 1 : 0.6 });
        const lineTitle = svgElement('title'); lineTitle.textContent = `Edge in pieces ${edge.pieces.join(', ')}${feature ? `; ${feature.label}` : ''}`;
        line.append(lineTitle); layer.append(line);
      }
      for (const vertex of model.vertices) {
        const [x, y] = projected.get(vertex.key);
        const circle = svgElement('circle', { cx: x, cy: y, r: 5, fill: '#fff', stroke: '#334155', 'stroke-width': 1.4 });
        const nodeTitle = svgElement('title'); nodeTitle.textContent = `Vertex ${JSON.stringify(vertex.label)} · pieces ${vertex.pieces.join(', ')}`; circle.append(nodeTitle); layer.append(circle);
        vertex.pieces.forEach((piece, i) => layer.append(svgElement('circle', { cx: x - 5 + i * 5, cy: y + 10, r: 2.2, fill: PIECE_COLORS[piece] || '#64748b' })));
        const label = svgElement('text', { x: x + 8, y: y - 7, 'font-size': 12, 'font-family': 'system-ui,sans-serif', fill: '#1e293b' });
        label.textContent = typeof vertex.label === 'string' ? `"${vertex.label}"` : String(vertex.label); layer.append(label);
      }
    }
    const camera = (label, action) => { const button = element('button', label, { type: 'button' }); listen(button, 'click', () => { action(); draw(); }); toolbar.append(button); };
    camera('Orbit left', () => { yaw -= 0.2; }); camera('Orbit right', () => { yaw += 0.2; });
    camera('Orbit up', () => { pitch -= 0.2; }); camera('Orbit down', () => { pitch += 0.2; });
    camera('Zoom in', () => { zoom = Math.min(4, zoom * 1.2); }); camera('Zoom out', () => { zoom = Math.max(0.25, zoom / 1.2); });
    camera('Reset camera', () => { yaw = 0.3; pitch = -0.2; zoom = 1; });
    listen(svg, 'keydown', event => {
      const actions = { ArrowLeft: () => yaw -= 0.2, ArrowRight: () => yaw += 0.2, ArrowUp: () => pitch -= 0.2, ArrowDown: () => pitch += 0.2, '+': () => zoom = Math.min(4, zoom * 1.2), '=': () => zoom = Math.min(4, zoom * 1.2), '-': () => zoom = Math.max(0.25, zoom / 1.2), '0': () => { yaw = 0.3; pitch = -0.2; zoom = 1; } };
      if (actions[event.key]) { event.preventDefault(); actions[event.key](); draw(); }
    });
    let pointer = null;
    listen(svg, 'pointerdown', event => { pointer = [event.clientX, event.clientY]; svg.setPointerCapture?.(event.pointerId); });
    listen(svg, 'pointermove', event => { if (!pointer) return; yaw += (event.clientX - pointer[0]) / 130; pitch += (event.clientY - pointer[1]) / 130; pointer = [event.clientX, event.clientY]; draw(); });
    listen(svg, 'pointerup', () => { pointer = null; }); listen(svg, 'pointercancel', () => { pointer = null; });
    listen(select, 'change', () => { selected = Number(select.value); faceInfo.textContent = selected < 0 ? 'All calculated faces. Amber: boundary · pink: overfull junction · teal: shared seam.' : model.features[selected].label; draw(); });
    const animationText = element('p', model.animationExplanation, { class: 'viz-caption' }); container.append(animationText);
    if (model.animation) {
      const controls = element('div', null, { class: 'viz-animation' }); controls.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap';
      const play = element('button', 'Play supplied frames', { type: 'button', 'aria-pressed': 'false' });
      const scrubber = element('input', null, { type: 'range', min: '0', max: model.animation.frames.length - 1, value: '0', step: '1', 'aria-label': 'Supplied phase or slice frame' });
      const position = element('output', '', { 'aria-live': 'off' });
      const updateFrame = () => { scrubber.value = String(frameIndex); position.textContent = `Frame ${frameIndex + 1} / ${model.animation.frames.length} · value ${model.animation.frames[frameIndex].value}`; draw(); };
      listen(play, 'click', () => {
        if (timer != null) { stopTimer(); play.textContent = 'Play supplied frames'; play.setAttribute('aria-pressed', 'false'); }
        else { play.textContent = 'Pause supplied frames'; play.setAttribute('aria-pressed', 'true'); timer = setInterval(() => { frameIndex = (frameIndex + 1) % model.animation.frames.length; updateFrame(); }, 800); }
      });
      listen(scrubber, 'input', () => { stopTimer(); play.textContent = 'Play supplied frames'; play.setAttribute('aria-pressed', 'false'); frameIndex = Number(scrubber.value); updateFrame(); });
      controls.append(play, scrubber, position); container.append(controls); updateFrame();
    }
    const fallback = element('details'); fallback.append(element('summary', 'Text alternative: vertex membership'));
    const table = element('table'); const head = element('tr'); head.append(element('th', 'Vertex'), element('th', 'Pieces')); table.append(head);
    model.vertices.forEach(vertex => { const row = element('tr'); row.append(element('td', JSON.stringify(vertex.label)), element('td', vertex.pieces.join(', '))); table.append(row); });
    fallback.append(table, element('p', 'The SVG view needs no WebGL. The table remains available when the graphical view is not usable.')); container.append(fallback);
    draw();
  }
  render();
  return { update(next) { state = { ...state, ...next }; render(); }, destroy() { stopTimer(); cleanup.forEach(fn => fn()); cleanup = []; container.replaceChildren(); } };
}
