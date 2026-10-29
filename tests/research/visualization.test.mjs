import test from 'node:test';
import assert from 'node:assert/strict';
import { buildViewModel, PIECE_COLORS } from '../../src/static/research/visualization.mjs';

const geometry = { pieces: [
  { name: 'A', maximal_simplices: [[0, 1, 2, 3, 4]] },
  { name: 'B', maximal_simplices: [[0, 1, 2, 3, 5]] },
  { name: 'C', maximal_simplices: [[0, 1, 2, 3, 6]] },
] };
const coordinates = Array.from({ length: 7 }, (_, vertex) => ({ vertex, position: [vertex, vertex % 2, vertex % 3, vertex / 2] }));

test('unmodeled candidate has sequences, labels, and no inferred geometry or animation', () => {
  const view = buildViewModel({ candidate: { pieces: [{ operations: ['Txy+', 'Txy+'] }, { operations: ['Lw-'] }, { operations: [] }] } });
  assert.equal(view.mode, 'undefined'); assert.match(view.title, /not yet defined/);
  assert.deepEqual(view.pieces.map(p => p.name), ['A', 'B', 'C']);
  assert.equal(view.pieces[0].sequence, 'Txy+ · Txy+'); assert.equal(view.pieces[2].sequence, '∅');
  assert.equal(new Set(Object.values(PIECE_COLORS)).size, 3); assert.equal(view.animation, null);
});
test('abstract vertices produce explicitly schematic graph, never 4D coordinates', () => {
  const view = buildViewModel({ geometry });
  assert.equal(view.mode, 'schematic'); assert.match(view.title, /SCHEMATIC/);
  assert.equal(view.vertices.length, 7); assert.equal(view.edges.length, 18);
  assert.equal(view.features.length, 0); assert.equal(view.coordinates, undefined);
});
test('calculated boundaries, overfull junctions and seams expose inspectable witnesses', () => {
  const view = buildViewModel({ geometry, result: { assembled: { boundary_tetrahedra: [[0, 1, 2, 4]], overfull_tetrahedra: [{ facet: [0, 1, 2, 3], incidence: 3 }] }, visualization: { seams: [{ face: [0, 1, 2, 3], pieces: ['A', 'B', 'C'], incidence: 3 }] } } });
  assert.deepEqual(view.features.map(f => f.type), ['boundary', 'overfull', 'seam']);
  assert.match(view.features[1].label, /incidence 3/); assert.equal(view.features[1].edgeKeys.size, 6);
});
test('supplied complete coordinates enable explicitly labeled projection', () => {
  const view = buildViewModel({ geometry: { ...geometry, embedding: { coordinates } } });
  assert.equal(view.mode, 'coordinates'); assert.match(view.explanation, /w coordinate is omitted/);
  assert.equal(view.animation, null); assert.match(view.animationExplanation, /unavailable/);
});
test('invalid or partial coordinate sets stay schematic', () => {
  assert.equal(buildViewModel({ geometry: { ...geometry, embedding: { coordinates: coordinates.slice(1) } } }).mode, 'schematic');
  assert.equal(buildViewModel({ geometry: { ...geometry, embedding: { coordinates: [...coordinates, coordinates[0]] } } }).mode, 'schematic');
  const invalid = structuredClone(coordinates); invalid[0].position[0] = NaN;
  assert.equal(buildViewModel({ geometry: { ...geometry, embedding: { coordinates: invalid } } }).mode, 'schematic');
});
test('coordinates at 1e10 remain supplied coordinates within the 1e12 display bound', () => {
  const large = coordinates.map(entry => ({ vertex: entry.vertex, position: entry.position.map(value => value * 1e10) }));
  const view = buildViewModel({ geometry: { ...geometry, embedding: { coordinates: large } } });
  assert.equal(view.mode, 'coordinates');
  assert.equal(view.coordinates.get('number:1')[0], 1e10);
  const outOfBounds = structuredClone(large); outOfBounds[0].position[0] = 1e13;
  assert.equal(buildViewModel({ geometry: { ...geometry, embedding: { coordinates: outOfBounds } } }).mode, 'schematic');
});
test('animation requires declared meaning and complete supplied discrete frames', () => {
  const embedding = { coordinates, frames: [{ value: 0, coordinates }, { value: 1, coordinates }], animation_kind: 'fourth_coordinate_slice', description: 'Researcher supplied slice coordinates' };
  const view = buildViewModel({ geometry: { ...geometry, embedding } });
  assert.equal(view.animation.frames.length, 2); assert.match(view.animationExplanation, /discretely/);
  assert.match(view.animation.label, /fourth-coordinate slices/);
  assert.equal(buildViewModel({ geometry: { ...geometry, embedding: { ...embedding, description: '' } } }).animation, null);
  assert.equal(buildViewModel({ geometry: { ...geometry, embedding: { ...embedding, frames: [{ value: 0, coordinates }, { value: 1, coordinates: [] }] } } }).animation, null);
});
test('integer and string vertex labels remain distinct', () => {
  const view = buildViewModel({ geometry: { pieces: [{ name: 'A', maximal_simplices: [[1, '1']] }] } });
  assert.equal(view.vertices.length, 2); assert.notEqual(view.vertices[0].key, view.vertices[1].key);
});

