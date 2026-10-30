/** Streaming CSV validation with a compact byte index, never an all-row catalog. */
import {LIMITS, candidateFromWord, tripleFromWords, nonnegativeInteger, parseCsv, importedCatalogPage} from './catalog.mjs';

export const CSV_STREAM_LIMITS = Object.freeze({
  importBytes: 250000000,
  importRows: 2000000,
  importOperations: 30000000,
  importCells: 64000000,
  importColumns: 64,
  recordBytes: 1000000,
});
const DEFAULT_CHUNK_BYTES = 1048576;
const OFFSET_BLOCK_SIZE = 65536;
const FIELD_START = 0, UNQUOTED = 1, QUOTED = 2, AFTER_QUOTE = 3;

function configuredLimits(overrides) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new Error('CSV limits must be an object.');
  const limits = {...CSV_STREAM_LIMITS};
  for (const [name, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(limits, name) || !Number.isSafeInteger(value) || value < 1 || value > limits[name]) throw new Error(`Invalid CSV limit ${name}; overrides may only reduce the supported limits.`);
    limits[name] = value;
  }
  return limits;
}

class OffsetIndex {
  constructor() { this.starts = []; this.ends = []; this.length = 0; }
  push(start, end) {
    const block = Math.floor(this.length / OFFSET_BLOCK_SIZE), offset = this.length % OFFSET_BLOCK_SIZE;
    if (offset === 0) {
      this.starts.push(new Uint32Array(OFFSET_BLOCK_SIZE));
      this.ends.push(new Uint32Array(OFFSET_BLOCK_SIZE));
    }
    this.starts[block][offset] = start;
    this.ends[block][offset] = end;
    this.length++;
  }
  range(index) {
    const block = Math.floor(index / OFFSET_BLOCK_SIZE), offset = index % OFFSET_BLOCK_SIZE;
    return [this.starts[block][offset], this.ends[block][offset]];
  }
}

function schemaFrom(headers) {
  if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate headers.');
  const positions = new Map(headers.map((name, index) => [name, index]));
  if (!positions.has('Row')) throw new Error("CSV is missing the explorer's Row header.");
  const kind = positions.has('Ordered operation sequence') ? 'words'
    : ['Piece A sequence', 'Piece B sequence', 'Piece C sequence'].every(name => positions.has(name)) ? 'triples' : null;
  if (!kind) throw new Error('CSV is not a recognized explorer words or triples table.');
  return {kind, positions, width: headers.length};
}

function canonicalRow(cells, schema, recordNumber) {
  try {
    if (cells.length !== schema.width) throw new Error('Cell count does not match the header.');
    const has = name => schema.positions.has(name), get = name => cells[schema.positions.get(name)];
    const source_row = get('Row');
    if (!/^\d+$/.test(source_row) || nonnegativeInteger(source_row) < 1n) throw new Error('Row must be a positive decimal integer.');
    const item = schema.kind === 'words' ? candidateFromWord(get('Ordered operation sequence'))
      : tripleFromWords(['A', 'B', 'C'].map(label => get(`Piece ${label} sequence`)));
    if (schema.kind === 'words' && has('Length') && get('Length') !== '' && nonnegativeInteger(get('Length'), 'Length') !== BigInt(item.operations.length)) throw new Error('Reported Length does not match sequence.');
    for (const name of schema.kind === 'words' ? ['ID', 'Candidate ID'] : ['Candidate ID']) {
      if (has(name) && get(name) !== item.candidate_id) throw new Error(`Reported ${name} does not match the operation sequences.`);
    }
    if (schema.kind === 'triples') for (const [index, label] of ['A', 'B', 'C'].entries()) {
      const name = `Piece ${label} ID`;
      if (has(name) && get(name) !== item.pieces[index].candidate_id) throw new Error(`Reported ${name} does not match its operation sequence.`);
    }
    const operations = schema.kind === 'words' ? item.operations.length : item.pieces.reduce((total, piece) => total + piece.operations.length, 0);
    return {record: {source_row, item}, operations};
  } catch (error) {
    throw new Error(`CSV record ${recordNumber}: ${error.message}`);
  }
}

function decodeRecord(bytes, start, decoder) {
  let text;
  try { text = decoder.decode(bytes); }
  catch { throw new Error(`CSV contains invalid UTF-8 near byte ${start}. Save it as UTF-8 CSV.`); }
  // A BOM is special only at the beginning of the entire file.
  if (start === 0) text = text.replace(/^\uFEFF/, '');
  // parseCsv removes a leading BOM itself; an ignored blank prefix prevents
  // it from treating a BOM at a later record boundary as a file-level marker.
  return parseCsv(start === 0 ? text : '\n' + text)[0];
}

/** Validate a Blob in bounded chunks; retain only headers and Uint32 byte offsets.
 * Nothing is ready until the final row validates. The Blob itself stays immutable.
 */
export async function indexCsv(blob, {onProgress, limits: overrides = {}, chunkBytes = DEFAULT_CHUNK_BYTES} = {}) {
  const limits = configuredLimits(overrides);
  if (!(blob instanceof Blob)) throw new Error('Choose a CSV File or Blob.');
  if (blob.size > limits.importBytes) throw new Error(`CSV exceeds the ${limits.importBytes.toLocaleString()}-byte file limit.`);
  if (!Number.isSafeInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > 4194304) throw new Error('CSV chunk size must be 1–4,194,304 bytes.');
  if (onProgress !== undefined && typeof onProgress !== 'function') throw new Error('CSV progress callback must be a function.');
  const offsets = new OffsetIndex(), decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
  const prefix = new Uint8Array(await blob.slice(0, 3).arrayBuffer());
  const bomBytes = prefix.length === 3 && prefix[0] === 239 && prefix[1] === 187 && prefix[2] === 191 ? 3 : 0;
  let recordBuffer = new Uint8Array(Math.min(65536, limits.recordBytes)), buffered = 0;
  let schema = null, state = FIELD_START, recordStart = 0, nonempty = false, pendingCR = false;
  let columns = 0, cells = 0, operations = 0;
  const append = bytes => {
    const needed = buffered + bytes.length;
    if (needed > limits.recordBytes) throw new Error(`CSV record exceeds the ${limits.recordBytes.toLocaleString()}-byte record limit.`);
    if (needed > recordBuffer.length) {
      const grown = new Uint8Array(Math.min(limits.recordBytes, Math.max(needed, recordBuffer.length * 2)));
      grown.set(recordBuffer.subarray(0, buffered)); recordBuffer = grown;
    }
    recordBuffer.set(bytes, buffered); buffered = needed;
  };
  const finishField = () => {
    if (++columns > limits.importColumns) throw new Error(`CSV rows may contain at most ${limits.importColumns} columns.`);
    if (++cells > limits.importCells) throw new Error(`CSV exceeds the ${limits.importCells.toLocaleString()}-cell import budget, including empty cells.`);
  };
  const finishRecord = end => {
    finishField();
    if (nonempty) {
      const fields = decodeRecord(recordBuffer.subarray(0, buffered), recordStart, decoder);
      if (!fields) throw new Error(`CSV record near byte ${recordStart} could not be decoded.`);
      if (schema === null) schema = schemaFrom(fields);
      else {
        if (offsets.length >= limits.importRows) throw new Error(`CSV exceeds the ${limits.importRows.toLocaleString()}-row import limit.`);
        const validated = canonicalRow(fields, schema, offsets.length + 2);
        operations += validated.operations;
        if (operations > limits.importOperations) throw new Error(`CSV exceeds the ${limits.importOperations.toLocaleString()}-operation import budget.`);
        offsets.push(recordStart, end);
      }
    }
    buffered = 0; columns = 0; nonempty = false; state = FIELD_START;
  };
  onProgress?.({bytes: 0, totalBytes: blob.size, rows: 0});
  for (let chunkStart = 0; chunkStart < blob.size; chunkStart += chunkBytes) {
    const chunkEnd = Math.min(blob.size, chunkStart + chunkBytes);
    const bytes = new Uint8Array(await blob.slice(chunkStart, chunkEnd).arrayBuffer());
    let segmentStart = 0;
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i], position = chunkStart + i;
      if (position < bomBytes) continue;
      if (pendingCR) {
        pendingCR = false;
        if (byte === 10) { recordStart = position + 1; segmentStart = i + 1; continue; }
      }
      if (state !== QUOTED && (byte === 10 || byte === 13)) {
        append(bytes.subarray(segmentStart, i));
        finishRecord(position);
        recordStart = position + 1; segmentStart = i + 1; pendingCR = byte === 13;
        continue;
      }
      if (position - recordStart + 1 > limits.recordBytes) throw new Error(`CSV record exceeds the ${limits.recordBytes.toLocaleString()}-byte record limit.`);
      if (state === QUOTED) {
        if (byte === 34) state = AFTER_QUOTE;
        else nonempty = true;
      } else if (state === AFTER_QUOTE && byte === 34) {
        state = QUOTED; nonempty = true;
      } else if (byte === 44) {
        finishField(); state = FIELD_START;
      } else if (state === FIELD_START && byte === 34) {
        state = QUOTED;
      } else {
        if (state === AFTER_QUOTE || byte === 34) throw new Error(`Malformed CSV quoting near byte ${position}.`);
        state = UNQUOTED; nonempty = true;
      }
    }
    append(bytes.subarray(segmentStart));
    onProgress?.({bytes: chunkEnd, totalBytes: blob.size, rows: offsets.length});
  }
  if (state === QUOTED) throw new Error('Unterminated CSV quote.');
  if (buffered || columns) finishRecord(blob.size);
  if (schema === null) throw new Error("CSV is missing the explorer's Row header.");
  // EOF may finish a record after the final chunk's progress notification.
  onProgress?.({bytes: blob.size, totalBytes: blob.size, rows: offsets.length});
  const total = offsets.length, kind = schema.kind;
  async function page({start = '0', count = 25} = {}) {
    if (!Number.isSafeInteger(count) || count < 1 || count > LIMITS.pageSize) throw new Error(`Page size must be 1–${LIMITS.pageSize}.`);
    const first = nonnegativeInteger(start, 'Starting imported row');
    if (first >= BigInt(total) && (total || first !== 0n)) throw new Error('Starting row is outside the imported catalog.');
    const records = [], firstNumber = Number(first), stop = Math.min(total, firstNumber + count);
    const pageDecoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
    let pageOperations = 0, pageCharacters = 0;
    for (let index = firstNumber; index < stop; index++) {
      const [begin, end] = offsets.range(index);
      const bytes = new Uint8Array(await blob.slice(begin, end).arrayBuffer());
      const fields = decodeRecord(bytes, begin, pageDecoder);
      const validated = canonicalRow(fields, schema, index + 2);
      pageOperations += validated.operations;
      if (pageOperations > LIMITS.pageOperations) throw new Error(`This page exceeds the ${LIMITS.pageOperations.toLocaleString()}-operation display budget. Reduce the page size (down to one row for long sequences).`);
      pageCharacters += JSON.stringify({row_rank: String(index), ...validated.record}).length;
      if (pageCharacters > LIMITS.pageCharacters) throw new Error(`This page exceeds the ${LIMITS.pageCharacters.toLocaleString()}-character display budget. Reduce the page size to preserve complete source labels.`);
      records.push(validated.record);
    }
    const result = importedCatalogPage(records, {count});
    return {...result, kind, start: first.toString(), total: String(total),
      rows: result.rows.map((row, index) => ({...row, row_rank: String(firstNumber + index)}))};
  }
  return Object.freeze({total, kind, operations, totalBytes: blob.size, page});
}
