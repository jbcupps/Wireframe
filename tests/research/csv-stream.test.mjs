import test from 'node:test';
import assert from 'node:assert/strict';
import {indexCsv, CSV_STREAM_LIMITS} from '../../src/static/research/csv-stream.mjs';
import {readExplorerCsv, candidateFromWord, wordAt, formatWord, LIMITS} from '../../src/static/research/catalog.mjs';

const encoder = new TextEncoder();
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
const row = cells => cells.map(quote).join(',');
const header = 'Row,Ordered operation sequence';
const basic = `${header}\r\n1,Txy+\r\n2,Lx+`;

test('UTF-8, BOM, escaped quotes, CRLF, quoted newlines and blank rows survive every small chunk size', async () => {
  const csv = '\uFEFF\r\n' + row(['Row', 'Ordered operation sequence', 'Length', 'Research notes']) + '\r\n'
    + row(['9007199254740993', 'Txy− → Lw+', '2', 'quoted, "text" 🌐\r\nnext line']) + '\r\n'
    + '""\n,,,\r\n' + row(['42', '∅', '0', 'last\nrow']) + '\r\n';
  const expected = readExplorerCsv(csv);
  for (let chunkBytes = 1; chunkBytes <= 19; chunkBytes++) {
    const index = await indexCsv(new Blob([csv]), {chunkBytes});
    assert.equal(index.total, 2);
    assert.equal(index.operations, 2);
    const page = await index.page();
    assert.deepEqual(page.rows.map(({source_row, item}) => ({source_row, item})), expected, `chunk size ${chunkBytes}`);
    assert.equal(page.rows[1].row_rank, '1');
  }
});

test('indexed byte ranges are exact after multibyte text and pages reread only requested records', async () => {
  class ObservedBlob extends Blob {
    reads = [];
    slice(start, end) {
      const part = super.slice(start, end), original = part.arrayBuffer.bind(part);
      part.arrayBuffer = async () => { this.reads.push([start, end]); return original(); };
      return part;
    }
  }
  const head = '\uFEFF' + row(['Row', 'Ordered operation sequence', 'Note']) + '\r\n';
  const first = row(['1', 'Txy−', '🌐, "quoted"\nline']);
  const second = row(['2', '∅', 'Ω']);
  const prefix = head + first + '\r\n\n""\r\n';
  const blob = new ObservedBlob([prefix + second + '\r\n']);
  const index = await indexCsv(blob, {chunkBytes: 7});
  assert.ok(blob.reads.every(([start, end]) => end - start <= 7));
  blob.reads = [];
  const page = await index.page({start: '1', count: 1});
  assert.deepEqual(blob.reads, [[encoder.encode(prefix).length, encoder.encode(prefix + second).length]]);
  assert.equal(page.rows[0].source_row, '2');
  assert.equal(page.rows[0].item.candidate_id, 'P00000');
  assert.equal(page.rows[0].row_rank, '1');
  assert.deepEqual(Object.keys(index).sort(), ['kind', 'operations', 'page', 'total', 'totalBytes']);
  assert.ok(Object.isFrozen(index));
});

test('whole-file validation rejects late bad identities and never produces a ready index', async () => {
  const lines = ['Row,ID,Ordered operation sequence,Length'];
  for (let i = 1; i <= 2000; i++) lines.push(`${i},P00001,Txy+,1`);
  lines.push('2001,P00002,Txy+,1');
  const progress = [];
  await assert.rejects(indexCsv(new Blob([lines.join('\n')]), {chunkBytes: 4096, onProgress: event => progress.push(event)}), /CSV record 2002: Reported ID/);
  assert.ok(progress.some(event => event.rows > 1000));
  assert.ok(progress.every(event => event.rows <= 2000));
});

test('provided word, triple and piece IDs and lengths use canonical catalog identities', async () => {
  for (const label of ['ID', 'Candidate ID']) {
    await assert.rejects(indexCsv(new Blob([`Row,Ordered operation sequence,${label}\n1,Txy+,P00002`])), /Reported .*ID/);
  }
  await assert.rejects(indexCsv(new Blob(['Row,Ordered operation sequence,Length\n1,Txy+,2'])), /Length/);
  const names = ['Row', 'Piece A sequence', 'Piece B sequence', 'Piece C sequence', 'Candidate ID', 'Piece A ID', 'Piece B ID', 'Piece C ID', 'Triple ID'];
  const values = ['77', 'Txy+', 'Lx+', '∅', 'TR-P00001-P00013-P00000', 'P00001', 'P00013', 'P00000', 'C0001'];
  const valid = await indexCsv(new Blob([row(names) + '\n' + row(values)]), {chunkBytes: 3});
  assert.equal(valid.kind, 'triples');
  assert.equal((await valid.page()).rows[0].item.candidate_id, values[4]);
  for (const position of [4, 5, 6, 7]) {
    const changed = [...values]; changed[position] = 'incorrect';
    await assert.rejects(indexCsv(new Blob([row(names) + '\n' + row(changed)])), /Reported .*ID/);
  }
});

test('strict quoting, malformed UTF-8 and misplaced BOMs cannot slip across chunk boundaries', async () => {
  for (const csv of [
    `${header}\n1,Txy+"bad`, `${header}\n1,"Txy+"bad`, `${header}\n1,"Txy+" `,
    `${header}\n1,"Txy+`, 'Row,Row,Ordered operation sequence\n1,1,Txy+',
    `${header}\n0,Txy+`, `${header}\n1,Txy+,extra`, `${header}\n\uFEFF1,Txy+`,
  ]) await assert.rejects(indexCsv(new Blob([csv]), {chunkBytes: 1}));
  const invalid = new Blob([header + ',Note\n1,Txy+,', new Uint8Array([0xc3, 0x28])]);
  await assert.rejects(indexCsv(invalid, {chunkBytes: 1}), /invalid UTF-8/);
  await assert.rejects(indexCsv(new Blob([new Uint8Array([0xff, 0xfe, 0, 82])])), /invalid UTF-8/);
  for (const csv of ['', '\uFEFF', '\r\n""\n,,']) await assert.rejects(indexCsv(new Blob([csv]), {chunkBytes: 1}), /Row header/);
});

test('file, row, operation, column, cell and record byte budgets can be tested without huge allocations', async () => {
  for (const [limits, pattern] of [
    [{importBytes: 10}, /file limit/], [{importRows: 1}, /row import limit/],
    [{importOperations: 1}, /operation import budget/], [{importColumns: 1}, /columns/],
    [{importCells: 5}, /cell import budget/], [{recordBytes: 10}, /record limit/],
  ]) await assert.rejects(indexCsv(new Blob([basic]), {limits, chunkBytes: 3}), pattern);
  const limits = {importBytes: encoder.encode(basic).length, importRows: 2, importOperations: 2,
    importColumns: 2, importCells: 6, recordBytes: encoder.encode(header).length};
  assert.equal((await indexCsv(new Blob([basic]), {limits, chunkBytes: 2})).total, 2);
  await assert.rejects(indexCsv(new Blob([`${header}\n,,\n1,Txy+`]), {limits: {importColumns: 2}}), /columns/);
  await assert.rejects(indexCsv(new Blob([`${header}\n\n\n1,Txy+`]), {limits: {importCells: 5}}), /cell import budget/);
  for (const options of [{limits: {importRows: 2000001}}, {limits: {misspelled: 1}}, {limits: null}, {chunkBytes: 0}, {chunkBytes: 4194305}]) {
    await assert.rejects(indexCsv(new Blob([basic]), options));
  }
  await assert.rejects(indexCsv('not a Blob'), /File or Blob/);
  assert.equal(CSV_STREAM_LIMITS.importBytes, 250000000);
  assert.equal(CSV_STREAM_LIMITS.importRows, 2000000);
  assert.equal(CSV_STREAM_LIMITS.importOperations, 30000000);
  assert.ok(CSV_STREAM_LIMITS.importCells >= 64000000);
});

test('raw record limits count UTF-8 bytes and exclude CRLF terminators', async () => {
  const head = `${header},Note`, data = `1,Txy+,${'Ω'.repeat(40)}`;
  const length = encoder.encode(data).length;
  const valid = await indexCsv(new Blob([head + '\r\n' + data + '\r\n']), {limits: {recordBytes: length}, chunkBytes: 5});
  assert.equal(valid.total, 1);
  await assert.rejects(indexCsv(new Blob([head + '\r\n' + data + 'x\r\n']), {limits: {recordBytes: length}, chunkBytes: 5}), /record limit/);
});

test('page bounds, exact source rows, and aggregate display limits stay separate from file capacity', async () => {
  const index = await indexCsv(new Blob([`${header}\n9007199254740993,Txy+\n2,empty word`]));
  assert.equal((await index.page({count: 1})).rows[0].source_row, '9007199254740993');
  assert.equal((await index.page({start: 1n, count: 200})).rows.length, 1);
  for (const options of [{start: -1}, {start: 2}, {start: 10n ** 80n}, {count: 0}, {count: 201}, {count: '2'}]) await assert.rejects(index.page(options));
  const empty = await indexCsv(new Blob(['Row,Piece A sequence,Piece B sequence,Piece C sequence']));
  assert.equal(empty.kind, 'triples');
  assert.equal(empty.total, 0);
  assert.deepEqual((await empty.page()).rows, []);
  await assert.rejects(empty.page({start: 1}));
  const longWord = Array(4096).fill('Txy+').join(' · ');
  const long = await indexCsv(new Blob([[header, ...Array.from({length: 5}, (_, i) => `${i + 1},${longWord}`)].join('\n')]));
  assert.equal((await long.page({count: 1})).rows[0].item.operations.length, 4096);
  await assert.rejects(long.page(), /operation display budget/);
  const longSource = '1'.repeat(LIMITS.rankDigits);
  const labels = await indexCsv(new Blob([[header, ...Array(20).fill(`${longSource},∅`)].join('\n')]));
  assert.equal((await labels.page({count: 1})).rows[0].source_row, longSource);
  await assert.rejects(labels.page(), /character display budget/);
});

test('all 33,825 configurations stream, retain exact endpoints, and report complete progress', async () => {
  const lines = ['Row,ID,Ordered operation sequence,Length,Geometry status'];
  for (let rank = 0; rank < 33825; rank++) {
    const item = candidateFromWord(wordAt(rank));
    lines.push([rank + 1, item.candidate_id, formatWord(item.operations), item.operations.length, 'Not constructed'].join(','));
  }
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')]), progress = [];
  const index = await indexCsv(blob, {chunkBytes: 65536, onProgress: event => progress.push(event)});
  assert.equal(index.total, 33825);
  assert.equal(index.operations, 100384);
  assert.equal(index.totalBytes, blob.size);
  assert.deepEqual(progress.at(-1), {bytes: blob.size, totalBytes: blob.size, rows: 33825});
  assert.ok(progress.every((event, i) => !i || (event.bytes >= progress[i - 1].bytes && event.rows >= progress[i - 1].rows)));
  assert.equal((await index.page({count: 1})).rows[0].item.candidate_id, 'P00000');
  const last = await index.page({start: '33824', count: 200});
  assert.equal(last.rows.length, 1);
  assert.equal(last.rows[0].source_row, '33825');
  assert.equal(last.rows[0].row_rank, '33824');
  assert.equal(last.rows[0].item.candidate_id, 'P33824');
});

test('worker protocol posts metadata and bounded pages, and rejects invalid late input atomically', async () => {
  const previousPost = globalThis.postMessage, previousHandler = globalThis.onmessage, messages = [];
  globalThis.postMessage = message => messages.push(message);
  try {
    await import('../../src/static/research/csv-worker.mjs');
    const handler = globalThis.onmessage;
    await handler({data: {id: 'open-1', type: 'open', file: new Blob([basic])}});
    const ready = messages.find(message => message.type === 'ready');
    assert.equal(ready.total, 2);
    assert.equal(ready.id, 'open-1');
    assert.ok(!Object.hasOwn(ready, 'rows') && !Object.hasOwn(ready, 'file'));
    await handler({data: {id: 'page-1', type: 'page', start: '1', count: 1}});
    assert.equal(messages.at(-1).page.rows[0].source_row, '2');
    await handler({data: {id: 'bad-page', type: 'page', start: 0, count: 201}});
    assert.equal(messages.at(-1).type, 'error');
    const before = messages.length;
    await handler({data: {id: 'open-bad', type: 'open', file: new Blob([basic + '\n3,unknown'])}});
    assert.ok(!messages.slice(before).some(message => message.type === 'ready'));
    assert.equal(messages.at(-1).type, 'error');
    await handler({data: {id: 'no-index', type: 'page'}});
    assert.match(messages.at(-1).message, /validate a CSV/);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    class DelayedBlob extends Blob {
      slice(start, end) {
        const part = super.slice(start, end), read = part.arrayBuffer.bind(part);
        part.arrayBuffer = async () => { await gate; return read(); };
        return part;
      }
    }
    const delayed = handler({data: {id: 'stale-open', type: 'open', file: new DelayedBlob([basic])}});
    await handler({data: {id: 'replacement', type: 'open', file: new Blob([basic])}});
    release(); await delayed;
    assert.ok(!messages.some(message => message.id === 'stale-open'));
    assert.equal(messages.at(-1).id, 'replacement');
  } finally {
    globalThis.postMessage = previousPost;
    globalThis.onmessage = previousHandler;
  }
});

test('optional 100,000-row stream performance smoke', {skip: process.env.CSV_STREAM_PERF !== '1'}, async () => {
  const lines = ['Row,ID,Ordered operation sequence,Length,Notes'];
  for (let i = 0; i < 100000; i++) lines.push(`${i + 1},P00001,Txy+,1,${'reference text '.repeat(7)}`);
  const blob = new Blob([lines.join('\n')]);
  assert.ok(blob.size > 8000000);
  const index = await indexCsv(blob);
  assert.equal(index.total, 100000);
  assert.equal((await index.page({start: '99999', count: 200})).rows[0].source_row, '100000');
});
