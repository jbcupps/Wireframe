import test from 'node:test';
import assert from 'node:assert/strict';
import {tripleFromWords} from '../../src/static/research/catalog.mjs';
import {validateNotebook, assertNotebookBudget, NOTEBOOK_LIMITS} from '../../src/static/research/notebook.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const candidate = tripleFromWords([['Txy+', 'Lw-'], [], ['Pzw-']]);
const sphere = {
  schema_version: '1', model: {id: 'three_piece_s4', version: '1.0'},
  pieces: [
    {name: 'A', maximal_simplices: [[1,2,3,4,5], [0,2,3,4,5]]},
    {name: 'B', maximal_simplices: [[0,1,3,4,5], [0,1,2,4,5]]},
    {name: 'C', maximal_simplices: [[0,1,2,3,5], [0,1,2,3,4]]},
  ], joining: {method: 'shared_vertex_labels', target: 'closed'},
};
const branched = {
  ...clone(sphere), model: {id: 'branched_tetrahedron', version: '1.0'},
  pieces: ['A','B','C'].map((name, i) => ({name, maximal_simplices: [[0,1,2,3,4+i]]})),
};
function report(geometry = sphere) {
  return {
    schema_version: '1', test_version: '4d-nod-finite-complex/1.0.0', status: geometry ? 'completed' : 'not_tested',
    assessed_at: '2026-10-29T12:00:00.000Z', input_sha256: '0'.repeat(64),
    input: {candidate: clone(candidate), geometry: clone(geometry)}, candidate: clone(candidate), model: geometry?.model ?? null,
    checks: [{id: 'closure', label: 'Declared boundary target', status: geometry ? 'passed' : 'not_tested', evidence: 'test evidence'}],
    assembled: geometry ? {dimension: 4, component_count: 1, euler_characteristic: 2, betti_numbers_mod2: [1,0,0,0,1], boundary_tetrahedra: [], overfull_tetrahedra: []} : null,
    visualization: geometry ? {kind: 'incidence_schematic', boundary_faces: [], overfull_faces: [], seams: [{face: [0,1,2,3], pieces: ['B','C'], incidence: 2}]} : null,
  };
}
function record(geometry = sphere) {
  return {id: 'local-record', candidate: clone(candidate), geometry: clone(geometry), result: report(geometry), created_at: '2026-10-29T12:00:00.000Z'};
}
const notebook = records => ({schema_version: '1', records});

test('spreadsheet provenance survives import and restore without becoming geometry or evidence', () => {
  const source = {type: 'xlsx', filename: 'research.xlsx', sha256: 'a'.repeat(64), sheet: 'Triple examples', excel_row: '6', source_id: 'C0001'};
  const input = {...record(null), result: null, source};
  for (const restore of [false, true]) {
    const saved = validateNotebook(notebook([input]), {restore})[0];
    assert.deepEqual(saved.source, source);
    assert.equal(saved.geometry, null);
    assert.equal(saved.result, null);
    assert.deepEqual(saved.candidate, candidate);
  }
  for (const changed of [{sha256: 'bad'}, {excel_row: '0'}, {excel_row: '1048577'}, {source_id: 'x'.repeat(101)}, {sheet: ''}, {type: 'instructions'}]) {
    assert.throws(() => validateNotebook(notebook([{...input, source: {...source, ...changed}}])), /Spreadsheet provenance/);
  }
});

test('imports always quarantine reports, even when their input matches', () => {
  const original = record(), result = validateNotebook(notebook([original]))[0];
  assert.equal(result.result, null);
  assert.deepEqual(result.archived_result, original.result);
  assert.notEqual(result.id, original.id);
  assert.deepEqual(result.candidate, candidate);
  assert.deepEqual(result.geometry, sphere);
  assert.equal(result.created_at, original.created_at);
});

test('local restoration retains completed reports only for the exact canonical input', () => {
  const original = record();
  original.result.input.geometry = {joining: clone(sphere.joining), pieces: clone(sphere.pieces), model: {version: '1.0', id: 'three_piece_s4'}, schema_version: '1'};
  original.result.candidate.pieces.forEach((piece, i) => { piece.name = ['A','B','C'][i]; });
  const restored = validateNotebook(notebook([original]), {restore: true})[0];
  assert.deepEqual(restored.result, original.result);
  assert.equal(restored.archived_result, null);
  assert.equal(restored.id, original.id);
  const unmodeled = validateNotebook(notebook([record(null)]), {restore: true})[0];
  assert.equal(unmodeled.result.status, 'not_tested');
});

test('stale sphere report paired with branched geometry is archived on restore', () => {
  const stale = record(); stale.geometry = clone(branched);
  const restored = validateNotebook(notebook([stale]), {restore: true})[0];
  assert.equal(restored.result, null);
  assert.deepEqual(restored.archived_result, stale.result);
  assert.deepEqual(restored.geometry, branched);
});

test('oversized or malformed result faces and report fields never become current evidence', () => {
  for (const mutate of [
    r => { r.visualization.boundary_faces = [Array.from({length: 10000}, (_, i) => i)]; },
    r => { r.visualization.boundary_faces = Array.from({length: 1001}, () => [0,1,2,3]); },
    r => { r.assembled.boundary_tetrahedra = [[0,1,2]]; },
    r => { r.visualization.seams = [{face:[0,1,2,3], pieces:'ABC', incidence:2}]; },
    r => { r.visualization.overfull_faces = [{facet:[0,1,2,3], incidence:10000}]; },
    r => { r.assembled.betti_numbers_mod2 = [1,0,0,0,1,0]; },
    r => { r.checks = Array.from({length: 51}, () => ({id:'x',label:'x',status:'passed'})); },
    r => { r.checks[0].status = 'valid_particle'; },
    r => { r.checks[0].label = {}; },
    r => { r.candidate = tripleFromWords([[],[],[]]); },
  ]) {
    const original = record(); mutate(original.result);
    const restored = validateNotebook(notebook([original]), {restore:true})[0];
    assert.equal(restored.result, null);
    assert.deepEqual(restored.archived_result, original.result);
  }
});

test('candidate identities are checked at triple, piece and rank levels', () => {
  for (const mutate of [
    r => { r.candidate.candidate_id = 'TR-P00000-P00000-P00000'; },
    r => { r.candidate.pieces[0].candidate_id = 'P00000'; },
    r => { r.candidate.pieces[0].word_rank = '999'; },
    r => { r.candidate.pieces[0].name = 'B'; },
    r => { r.candidate.pieces[0].operations = ['evil']; },
  ]) {
    const original = record(); mutate(original);
    assert.throws(() => validateNotebook(notebook([original])));
  }
});

test('geometry format and resource limits are validated before loading a notebook', () => {
  for (const mutate of [
    g => { g.model = {}; },
    g => { g.pieces[0].name = 'C'; },
    g => { g.pieces[0].maximal_simplices = []; },
    g => { g.pieces[0].maximal_simplices = Array.from({length:151}, () => [0,1,2,3,4]); },
    g => { g.pieces[0].maximal_simplices = [[0,0,1]]; },
    g => { g.pieces[0].maximal_simplices = [[0,1,2,3,4,5]]; },
    g => { g.pieces[0].maximal_simplices = [[Number.MAX_SAFE_INTEGER+1]]; },
    g => { g.joining.method = 'execute_python'; },
    g => { g.joining.expected_exterior_faces = [[999]]; },
    g => { g.joining.intended_seams = [{pieces:['A','A'],face:[0,1,2,3]}]; },
    g => { g.embedding = {coordinates:[]}; },
  ]) {
    const original = record(); mutate(original.geometry);
    assert.throws(() => validateNotebook(notebook([original])));
  }
});

test('supplied coordinates and animation frames must be complete, finite and bounded', () => {
  const original = record();
  const coordinates = Array.from({length:6}, (_, vertex) => ({vertex, position:[vertex,0,0,1]}));
  original.geometry.embedding = {coordinates, animation_kind:'fourth_coordinate_slice', description:'Supplied samples', frames:[{value:0,coordinates:clone(coordinates)},{value:1,coordinates:clone(coordinates)}]};
  assert.doesNotThrow(() => validateNotebook(notebook([original])));
  for (const mutate of [
    g => { g.embedding.coordinates[0].position[0] = 1e13; },
    g => { g.embedding.coordinates[0].vertex = 1; },
    g => { g.embedding.frames[1].value = 0; },
    g => { g.embedding.frames[1].coordinates[0].position.pop(); },
    g => { g.embedding.frames = Array(121).fill(g.embedding.frames[0]); },
  ]) {
    const invalid = clone(original); mutate(invalid.geometry);
    assert.throws(() => validateNotebook(notebook([invalid])));
  }
});

test('budget measures UTF-8 bytes and leaves export-wrapper headroom', () => {
  const ascii = [{archived_result:'x'.repeat(1000)}], unicode = [{archived_result:'界'.repeat(1000)}];
  assert.equal(assertNotebookBudget(unicode) - assertNotebookBudget(ascii), 2000);
  const fixed = assertNotebookBudget([{value:''}]);
  assert.equal(assertNotebookBudget([{value:'x'.repeat(NOTEBOOK_LIMITS.bytes-fixed)}]), NOTEBOOK_LIMITS.bytes);
  assert.throws(() => assertNotebookBudget([{value:'x'.repeat(NOTEBOOK_LIMITS.bytes-fixed+1)}]), /byte/);
  assert.throws(() => assertNotebookBudget(Array.from({length:101}, () => ({}))), /100/);
  const wrapped = JSON.stringify({schema_version:'1',exported_at:new Date().toISOString(),records:[{value:'x'.repeat(NOTEBOOK_LIMITS.bytes-fixed)}]});
  assert.ok(new TextEncoder().encode(wrapped).byteLength < 10000000);
});

test('archived results stay quarantined across reload, and bad JSON/input depth is rejected', () => {
  const original = record(); original.archived_result = original.result; original.result = null;
  const restored = validateNotebook(notebook([original]), {restore:true})[0];
  assert.equal(restored.result, null);
  assert.deepEqual(restored.archived_result, original.archived_result);
  const deep = record(); let parent = deep.geometry;
  for (let i=0;i<30;i++) { parent.extra = {}; parent = parent.extra; }
  assert.throws(() => validateNotebook(notebook([deep])), /nesting/);
  const hugeInput = record(); hugeInput.geometry.model.notes = 'x'.repeat(524288);
  assert.throws(() => validateNotebook(notebook([hugeInput])), /512/);
  const nonfinite = record(); nonfinite.geometry.model.value = Infinity;
  assert.throws(() => validateNotebook(notebook([nonfinite])), /finite/);
});
