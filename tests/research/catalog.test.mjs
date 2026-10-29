import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHABET, parseWord, formatWord, rankWord, wordAt, wordId, wordFromId,
  wordCount, pair, unpair, boundedTripleAt, boundedTripleRank,
  unboundedTripleAt, unboundedTripleRank, candidateFromWord, tripleFromWords,
  lookupWord, catalogPage, readExplorerCsv, exportExplorerCsv, parseCsv,
} from '../../src/static/research/catalog.mjs';

test('exact prototype alphabet and exhaustive 33,825 length-first words', () => {
  assert.equal(ALPHABET.length, 32);
  assert.equal(new Set(ALPHABET).size, 32);
  assert.deepEqual(ALPHABET.slice(0, 4), ['Txy+', 'Txy-', 'Txz+', 'Txz-']);
  assert.deepEqual(ALPHABET.slice(12, 20), ['Lx+', 'Lx-', 'Ly+', 'Ly-', 'Lz+', 'Lz-', 'Lw+', 'Lw-']);
  assert.equal(ALPHABET[31], 'Pzw-');
  assert.equal(wordCount(3), 33825n);
  assert.equal(wordCount(3) ** 3n, 38700218390625n);
  const ids = new Set(), lengths = [0, 0, 0, 0];
  for (let rank = 0n; rank < wordCount(3); rank++) {
    const word = wordAt(rank), id = wordId(word);
    assert.equal(rankWord(word), rank);
    assert.deepEqual(wordFromId(id), word);
    ids.add(id); lengths[word.length]++;
  }
  assert.deepEqual(lengths, [1, 32, 1024, 32768]);
  assert.equal(ids.size, 33825);
  assert.equal(wordId([]), 'P00000');
  assert.equal(wordId(['Pzw-', 'Pzw-', 'Pzw-']), 'P33824');
});

test('order, repeated operations, directions and empty words remain distinct', () => {
  assert.deepEqual(parseWord('Txy− → Lw+ · Txy−'), ['Txy-', 'Lw+', 'Txy-']);
  assert.deepEqual(parseWord('Txy+ · Txy-'), ['Txy+', 'Txy-']);
  assert.notEqual(wordId(['Txy+', 'Lw-']), wordId(['Lw-', 'Txy+']));
  for (const empty of ['', '∅', 'empty word', ' EMPTY WORD ', []]) assert.deepEqual(parseWord(empty), []);
  assert.equal(formatWord([]), '∅');
  assert.throws(() => parseWord('Txy+,Lx+'));
  assert.throws(() => parseWord(['unknown']));
  assert.throws(() => parseWord([{}]));
  assert.throws(() => parseWord('Txy+ ·'));
});

test('large ranks never pass through floating point', () => {
  for (const rank of [9007199254740993n, 10n ** 90n + 12345n]) {
    const word = wordAt(rank.toString());
    assert.equal(rankWord(word), rank);
    assert.equal(candidateFromWord(word).word_rank, rank.toString());
    assert.deepEqual(lookupWord(wordId(word)).operations, word);
    assert.deepEqual(lookupWord(rank.toString()).operations, word);
  }
  assert.throws(() => wordAt(9007199254740992));
  for (const bad of [-1, 1.1, true, null, '-1', '1e9', '0x10', '']) assert.throws(() => wordAt(bad));
});

test('bounded Cartesian and unbounded Cantor order both round-trip, without identity conflation', () => {
  for (let rank = 0n; rank < 5000n; rank++) {
    assert.equal(unboundedTripleRank(unboundedTripleAt(rank)), rank);
    assert.equal(boundedTripleRank(boundedTripleAt(rank, 1), 1), rank);
  }
  for (const [x, y] of [[0n, 0n], [1n, 0n], [7n, 30n], [10n ** 50n, 10n ** 55n]]) assert.deepEqual(unpair(pair(x, y)), [x, y]);
  const final = boundedTripleAt(38700218390624n, 3);
  assert.deepEqual(final, Array.from({length: 3}, () => ['Pzw-', 'Pzw-', 'Pzw-']));
  assert.throws(() => boundedTripleAt(38700218390625n, 3));
  const words = [['Txy+', 'Lw-'], [], ['Txy+', 'Lw-']];
  const stable = tripleFromWords(words);
  assert.equal(tripleFromWords(boundedTripleAt(boundedTripleRank(words, 3), 3)).candidate_id, stable.candidate_id);
  assert.equal(tripleFromWords(unboundedTripleAt(unboundedTripleRank(words))).candidate_id, stable.candidate_id);
  assert.notEqual(boundedTripleRank(words, 3), unboundedTripleRank(words));
  assert.notEqual(tripleFromWords([[], ['Txy+'], []]).candidate_id, tripleFromWords([['Txy+'], [], []]).candidate_id);
});

test('pages are bounded, lazy, serializable and exact at the last row', () => {
  const page = catalogPage({kind: 'triples', maxOperations: 3, start: '38700218390624', count: 25});
  assert.equal(page.rows.length, 1);
  assert.equal(page.total, '38700218390625');
  assert.equal(page.rows[0].source_row, '38700218390625');
  assert.equal(page.indexing, 'bounded-cartesian-c-fastest');
  assert.doesNotThrow(() => JSON.stringify(page));
  assert.equal(catalogPage({kind: 'triples', start: '123456789012345678901234567890'}).rows.length, 25);
  assert.throws(() => catalogPage({count: 1000000}));
  assert.throws(() => catalogPage({count: 0}));
  assert.throws(() => catalogPage({maxOperations: 0, start: '1'}));
});

test('both explorer CSV formats normalize Unicode, preserve source rows separately, and round-trip', () => {
  const words = '\uFEFF"Row","Ordered operation sequence","Length","Geometry / boundary status"\r\n"9007199254740993","Txy− → Lw+ · Txy−","3","Not defined / not tested"\r\n"2","empty word","0","not tested"';
  const imported = readExplorerCsv(words);
  assert.equal(imported[0].source_row, '9007199254740993');
  assert.equal(imported[0].item.candidate_id, wordId(['Txy-', 'Lw+', 'Txy-']));
  assert.deepEqual(imported[1].item.operations, []);
  assert.deepEqual(readExplorerCsv(exportExplorerCsv(imported, 'words')), imported);
  const triples = 'Row,Piece A sequence,Piece B sequence,Piece C sequence,Gluing / closure / smoothness\n1,∅,Txy− · Txy−,Lw+ → Pxw−,"Not specified, not tested"';
  const result = readExplorerCsv(triples);
  assert.deepEqual(result[0].item.pieces.map(p => p.operations), [[], ['Txy-', 'Txy-'], ['Lw+', 'Pxw-']]);
  assert.deepEqual(readExplorerCsv(exportExplorerCsv(result, 'triples')), result);
  const page = catalogPage({kind: 'triples', maxOperations: 1, start: '4', count: 8});
  assert.deepEqual(readExplorerCsv(exportExplorerCsv(page)), page.rows.map(({source_row, item}) => ({source_row, item})));
});

test('CSV rejects malformed data instead of creating false identities', () => {
  for (const csv of [
    'Ordered operation sequence\n∅',
    'Row,Ordered operation sequence,Length\n1,Txy+,0',
    'Row,Ordered operation sequence\n0,∅',
    'Row,Ordered operation sequence\n1,unknown',
    'Row,Ordered operation sequence\n1,∅,extra',
    'Row,Row,Ordered operation sequence\n1,1,∅',
    'Row,Ordered operation sequence\n1,"∅',
    'Row,Ordered operation sequence\n1,"∅"junk',
  ]) assert.throws(() => readExplorerCsv(csv));
  assert.deepEqual(parseCsv('a,b\r\n"x, y","multi\nline and ""quote"""'), [['a', 'b'], ['x, y', 'multi\nline and "quote"']]);
});

test('aggregate resource budgets bound rendering and imports while very large IDs remain exact', () => {
  const lastRank = wordCount(4096) ** 3n - 1n;
  const page = catalogPage({kind: 'triples', count: 1, start: lastRank.toString(), maxOperations: 4096});
  assert.equal(page.rows.length, 1);
  assert.equal(page.rows[0].item.pieces[0].operations.length, 4096);
  assert.equal(boundedTripleRank(page.rows[0].item.pieces.map(p => p.operations), 4096), lastRank);
  assert.throws(() => catalogPage({kind: 'triples', count: 25, start: (lastRank - 24n).toString(), maxOperations: 4096}), /display budget/);
  const word = Array.from({length: 4096}, () => 'Txy+').join(' · ');
  const csv = ['Row,Ordered operation sequence', ...Array.from({length: 25}, (_, i) => `${i + 1},${word}`)].join('\n');
  assert.throws(() => readExplorerCsv(csv), /import budget/);
});
