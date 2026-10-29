/** Notebook input validation and bounded restoration of browser-local evidence.
 * Imported reports are always quarantined for export, never rendered as evidence.
 * Restoration binds a report to its saved input; this is not a report signature.
 */
import {tripleFromWords} from './catalog.mjs';

export const NOTEBOOK_LIMITS = Object.freeze({records: 100, bytes: 9000000, inputBytes: 524288});
const names = ['A', 'B', 'C'];
const encoder = new TextEncoder();
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const text = (value, max, nonempty = false) => typeof value === 'string' && value.length <= max && (!nonempty || Boolean(value.trim()));
const vertexKey = value => `${typeof value}:${JSON.stringify(value)}`;

function bytes(value) {
  let encoded;
  try { encoded = JSON.stringify(value); }
  catch { fail('Notebook data must be serializable JSON without circular references.'); }
  if (encoded === undefined) fail('Notebook data must be serializable JSON.');
  return encoder.encode(encoded).byteLength;
}

/** Use before changing in-memory records, not only after localStorage writes. */
export function assertNotebookBudget(records) {
  if (!Array.isArray(records) || records.length > NOTEBOOK_LIMITS.records) fail('Notebook limit: at most 100 records. Export and remove records to make room.');
  const size = bytes(records);
  if (size > NOTEBOOK_LIMITS.bytes) fail('Notebook exceeds its 9,000,000-byte UTF-8 budget. Export and remove records before adding more.');
  return size;
}

function finiteJson(value, {depthLimit = 32, itemLimit = 500000} = {}) {
  const stack = [[value, 0]]; let items = 0;
  while (stack.length) {
    const [item, depth] = stack.pop();
    if (depth > depthLimit || ++items > itemLimit) fail('Notebook JSON nesting or item count exceeds the resource limit.');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') continue;
    if (typeof item === 'number' && Number.isFinite(item)) continue;
    if (!object(item) && !Array.isArray(item)) fail('Notebook must contain finite JSON values only.');
    for (const child of Object.values(item)) stack.push([child, depth + 1]);
  }
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function candidate(raw) {
  if (!object(raw) || !Array.isArray(raw.pieces) || raw.pieces.length !== 3) fail('Notebook candidate must contain three ordered pieces A, B, C.');
  const normalized = tripleFromWords(raw.pieces.map((piece, i) => {
    if (!object(piece) || (own(piece, 'name') && piece.name !== names[i])) fail('Notebook candidate pieces must be ordered A, B, C.');
    return piece.operations;
  }));
  if (raw.candidate_id !== normalized.candidate_id) fail('Notebook candidate identity does not match its sequences.');
  raw.pieces.forEach((piece, i) => {
    const expected = normalized.pieces[i];
    if (own(piece, 'candidate_id') && piece.candidate_id !== expected.candidate_id) fail(`Notebook piece ${names[i]} identity does not match its sequence.`);
    if (own(piece, 'word_rank')) {
      if (!(typeof piece.word_rank === 'string' || Number.isSafeInteger(piece.word_rank)) || String(piece.word_rank) !== expected.word_rank) fail(`Notebook piece ${names[i]} rank does not match its sequence.`);
    }
  });
  return normalized;
}

function vertex(value) {
  if (!((typeof value === 'string' && value.length >= 1 && value.length <= 80) || Number.isSafeInteger(value))) fail('Vertex labels must be safe integers or nonempty strings of at most 80 characters.');
  return vertexKey(value);
}

function face(value, min = 1, max = 5, vertices = null) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`A face must have ${min === max ? min : `${min}–${max}`} distinct vertex labels.`);
  const keys = value.map(vertex);
  if (new Set(keys).size !== keys.length) fail('A simplex or face cannot repeat a vertex.');
  if (vertices && keys.some(key => !vertices.has(key))) fail('Face contains a vertex outside the supplied complex.');
  return keys.sort().join('|');
}

function coordinates(raw, vertices) {
  if (!Array.isArray(raw) || raw.length !== vertices.size) fail('Coordinates must supply exactly one record per complex vertex.');
  const seen = new Set(); let dimension = null;
  for (const item of raw) {
    if (!object(item)) fail('Coordinate records must be objects.');
    const key = vertex(item.vertex);
    if (!vertices.has(key) || seen.has(key)) fail('Coordinates contain an unknown or repeated vertex.');
    seen.add(key);
    if (!Array.isArray(item.position) || ![3, 4].includes(item.position.length) || !item.position.every(x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e12)) fail('Coordinates require three or four finite components of magnitude at most 10¹².');
    dimension ??= item.position.length;
    if (dimension !== item.position.length) fail('Coordinate dimensions must agree within a frame.');
  }
  return dimension;
}

function geometry(raw) {
  if (raw === null) return new Set();
  if (!object(raw) || String(raw.schema_version) !== '1') fail('Notebook geometry must use schema_version 1.');
  if (!object(raw.model) || !text(raw.model.id, 160, true) || !text(raw.model.version, 160, true)) fail('Geometry model must provide an id and version.');
  if (!Array.isArray(raw.pieces) || raw.pieces.length !== 3) fail('Geometry must contain three pieces A, B, C.');
  const vertices = new Set(); let count = 0;
  raw.pieces.forEach((piece, i) => {
    if (!object(piece) || piece.name !== names[i] || !Array.isArray(piece.maximal_simplices) || !piece.maximal_simplices.length) fail('Geometry requires nonempty maximal_simplices for pieces ordered A, B, C.');
    count += piece.maximal_simplices.length;
    if (count > 150) fail('Geometry exceeds the 150-maximal-simplex limit.');
    for (const simplex of piece.maximal_simplices) { face(simplex); simplex.forEach(v => vertices.add(vertexKey(v))); }
  });
  if (vertices.size > 250) fail('Geometry exceeds the 250-vertex limit.');
  const joining = raw.joining;
  if (!object(joining) || joining.method !== 'shared_vertex_labels' || !['closed', 'exterior_interface', 'unspecified'].includes(joining.target)) fail('Geometry requires explicit shared_vertex_labels joining and a boundary target.');
  for (const field of ['expected_exterior_faces', 'intended_seams']) if (own(joining, field) && (!Array.isArray(joining[field]) || joining[field].length > 750)) fail(`${field} must have at most 750 entries.`);
  const exterior = new Set(), seams = new Set();
  for (const item of joining.expected_exterior_faces || []) {
    const key = face(item, 1, 4, vertices);
    if (exterior.has(key)) fail('Expected exterior faces cannot repeat.');
    exterior.add(key);
  }
  for (const seam of joining.intended_seams || []) {
    if (!object(seam) || !Array.isArray(seam.pieces) || seam.pieces.length !== 2 || new Set(seam.pieces).size !== 2 || !seam.pieces.every(n => names.includes(n))) fail('An intended seam must name two different pieces A, B or C.');
    const key = face(seam.face, 4, 4, vertices);
    if (seams.has(key)) fail('Intended seam faces cannot repeat.');
    seams.add(key);
  }
  if (raw.embedding != null) {
    const embedding = raw.embedding;
    if (!object(embedding)) fail('Embedding must be an object.');
    const dimension = coordinates(embedding.coordinates, vertices);
    if (own(embedding, 'frames')) {
      if (!Array.isArray(embedding.frames) || embedding.frames.length < 2 || embedding.frames.length > 120) fail('Animation requires 2–120 supplied frames.');
      if (!['illustrative_phase', 'fourth_coordinate_slice', 'model_evolution'].includes(embedding.animation_kind) || !text(embedding.description, 8000, true)) fail('Animation requires its meaning and a description.');
      let previous = -Infinity;
      for (const frame of embedding.frames) {
        if (!object(frame) || typeof frame.value !== 'number' || !Number.isFinite(frame.value) || frame.value <= previous) fail('Frame values must be finite and strictly increasing.');
        previous = frame.value;
        if (coordinates(frame.coordinates, vertices) !== dimension) fail('Frame coordinates must match the embedding dimension.');
      }
    }
  }
  return vertices;
}

function boundedList(value, maximum, name) {
  if (!Array.isArray(value) || value.length > maximum) fail(`Unsafe stored report: ${name} exceeds its supported shape.`);
  return value;
}

function faceList(value, vertices, exact = true) {
  if (value == null) return;
  for (const item of boundedList(value, 1000, 'face list')) face(item, exact ? 4 : 1, 4, vertices);
}

function overfullList(value, vertices, exact = true) {
  if (value == null) return;
  for (const item of boundedList(value, 1000, 'overfull faces')) {
    if (!object(item) || !integer(item.incidence, 3, 150)) fail('Unsafe overfull-face incidence.');
    face(item.facet, exact ? 4 : 1, 4, vertices);
  }
}

function topology(value, vertices) {
  if (!object(value) || !integer(value.dimension, -1, 4) || !integer(value.component_count, 0, 250) || !integer(value.euler_characteristic, -100000, 100000)) fail('Unsafe stored topology metrics.');
  for (const key of ['betti_numbers_mod2', 'face_counts_by_dimension', 'boundary_ranks_mod2']) {
    if (key !== 'betti_numbers_mod2' && !own(value, key)) continue;
    if (!boundedList(value[key], 5, key).every(n => integer(n, 0, 100000))) fail('Unsafe stored simplex or homology counts.');
  }
  faceList(value.boundary_tetrahedra, vertices);
  faceList(value.boundary_facets, vertices, false);
  overfullList(value.overfull_tetrahedra, vertices);
  overfullList(value.overfull_facets, vertices, false);
}

function safeReport(report, normalized, inputGeometry, vertices) {
  try {
    if (!object(report) || report.schema_version !== '1' || !text(report.test_version, 160, true) || !['completed', 'not_tested'].includes(report.status)) return false;
    if (!object(report.input) || !own(report.input, 'candidate') || !own(report.input, 'geometry')) return false;
    if (canonical(candidate(report.input.candidate)) !== canonical(normalized) || canonical(report.input.geometry) !== canonical(inputGeometry)) return false;
    if (canonical(candidate(report.candidate)) !== canonical(normalized)) return false;
    if (!text(report.assessed_at, 80, true) || !Number.isFinite(Date.parse(report.assessed_at))) return false;
    if (typeof report.input_sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(report.input_sha256)) return false;
    if (canonical(report.model ?? null) !== canonical(inputGeometry?.model ?? null)) return false;
    for (const check of boundedList(report.checks, 50, 'checks')) {
      if (!object(check) || !text(check.id, 160, true) || !text(check.label, 320, true) || !['passed', 'failed', 'not_tested'].includes(check.status)) return false;
    }
    for (const key of ['missing_definitions', 'limitations']) if (own(report, key) && !boundedList(report[key], 100, key).every(item => text(item, 8000))) return false;
    if (inputGeometry === null) {
      return report.status === 'not_tested' && report.assembled == null && report.visualization == null && report.checks.every(check => check.status === 'not_tested');
    }
    if (report.status !== 'completed') return false;
    topology(report.assembled, vertices);
    if (own(report, 'pieces')) for (const piece of boundedList(report.pieces, 3, 'pieces')) {
      if (!object(piece) || !names.includes(piece.name)) return false;
      topology(piece.topology, vertices);
    }
    if (report.visualization != null) {
      const view = report.visualization;
      if (!object(view) || !['incidence_schematic', 'supplied_coordinates'].includes(view.kind)) return false;
      faceList(view.boundary_faces, vertices);
      overfullList(view.overfull_faces, vertices);
      for (const seam of boundedList(view.seams ?? [], 1000, 'seams')) {
        if (!object(seam) || !integer(seam.incidence, 1, 150) || !Array.isArray(seam.pieces) || seam.pieces.length < 2 || seam.pieces.length > 3 || !seam.pieces.every(n => names.includes(n)) || new Set(seam.pieces).size !== seam.pieces.length) return false;
        face(seam.face, 4, 4, vertices);
      }
      if (own(view, 'vertices')) for (const item of boundedList(view.vertices, 250, 'vertices')) {
        if (!object(item) || !text(item.id, 100, true) || !vertices.has(vertex(item.label)) || !Array.isArray(item.pieces) || item.pieces.length > 3 || !item.pieces.every(n => names.includes(n))) return false;
      }
      if (own(view, 'edges')) for (const edge of boundedList(view.edges, 1500, 'edges')) {
        if (!object(edge) || !Array.isArray(edge.pieces) || edge.pieces.length > 3 || !edge.pieces.every(n => names.includes(n))) return false;
        face(edge.vertices, 2, 2, vertices);
      }
      if (own(view, 'embedding') && canonical(view.embedding) !== canonical(inputGeometry.embedding)) return false;
    }
    return true;
  } catch { return false; }
}

/** Import quarantines every report. restore=true is only for this browser's saved records. */
export function validateNotebook(data, {restore = false} = {}) {
  if (!object(data) || data.schema_version !== '1') fail('Expected notebook schema_version 1.');
  assertNotebookBudget(data.records);
  finiteJson(data.records);
  const records = data.records.map(raw => {
    if (!object(raw)) fail('Notebook records must be objects.');
    const normalized = candidate(raw.candidate);
    const inputGeometry = raw.geometry ?? null;
    const payload = {candidate: normalized, geometry: inputGeometry};
    if (bytes(payload) > NOTEBOOK_LIMITS.inputBytes) fail('Notebook assessment input exceeds 512 KiB.');
    finiteJson(payload, {depthLimit: 24, itemLimit: 60000});
    const vertices = geometry(inputGeometry);
    const retained = restore && raw.result != null && safeReport(raw.result, normalized, inputGeometry, vertices);
    return {
      id: restore && text(raw.id, 100, true) ? raw.id : globalThis.crypto.randomUUID(),
      candidate: normalized,
      geometry: inputGeometry,
      result: retained ? raw.result : null,
      archived_result: retained ? raw.archived_result ?? null : raw.result ?? raw.archived_result ?? null,
      created_at: text(raw.created_at, 80, true) && Number.isFinite(Date.parse(raw.created_at)) ? raw.created_at : new Date().toISOString(),
    };
  });
  assertNotebookBudget(records);
  return records;
}
