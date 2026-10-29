/** Formal descriptions, not geometric or physical identities.
 * Port of topological_assessment/candidate_feed.py (2026-10-29).
 * All ranks use BigInt internally and decimal strings in serializable records.
 */
export const PLANES = Object.freeze(['xy', 'xz', 'xw', 'yz', 'yw', 'zw']);
export const AXES = Object.freeze(['x', 'y', 'z', 'w']);
export const ALPHABET = Object.freeze([
  ...PLANES.flatMap(p => [`T${p}+`, `T${p}-`]),
  ...AXES.flatMap(a => [`L${a}+`, `L${a}-`]),
  ...PLANES.flatMap(p => [`P${p}+`, `P${p}-`]),
]);
export const BASE = 32n;
export const CATALOG_VERSION = '4d-nod-symbolic/1';
export const LIMITS = Object.freeze({maxOperations: 4096, pageSize: 200, pageOperations: 20000, importRows: 1000, importOperations: 100000, importCharacters: 2000000, rankDigits: 30000});
const DIGITS = new Map(ALPHABET.map((code, i) => [code, BigInt(i)]));

export function nonnegativeInteger(value, name = 'rank') {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a nonnegative safe integer, BigInt, or decimal string.`);
    return BigInt(value);
  }
  if (typeof value === 'bigint') {
    if (value < 0n) throw new Error(`${name} must be nonnegative.`);
    return value;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value) || value.length > LIMITS.rankDigits) {
    throw new Error(`${name} must be a nonnegative decimal integer (at most ${LIMITS.rankDigits} digits per request).`);
  }
  return BigInt(value);
}

function operationBound(value) {
  const n = nonnegativeInteger(value, 'Maximum operations');
  if (n > BigInt(LIMITS.maxOperations)) throw new Error(`This browser request supports at most ${LIMITS.maxOperations} operations per piece; this is a resource limit, not a theoretical limit.`);
  return Number(n);
}

export function parseWord(value) {
  let tokens;
  if (typeof value === 'string') {
    const text = value.trim().replaceAll('−', '-');
    if (!text || text === '∅' || text.toLowerCase() === 'empty word') return [];
    tokens = text.split(/\s*(?:·|→)\s*/);
  } else if (Array.isArray(value)) {
    tokens = value.map(token => typeof token === 'string' ? token.trim().replaceAll('−', '-') : token);
  } else {
    throw new Error('A word must be a string or an array of operation labels.');
  }
  operationBound(tokens.length);
  if (tokens.some(token => !DIGITS.has(token))) throw new Error('Invalid operation label or separator. Use the 32 labels, separated by · or →.');
  return tokens;
}

export function formatWord(value) {
  const tokens = parseWord(value);
  return tokens.length ? tokens.map(t => t.replace('-', '−')).join(' · ') : '∅';
}

export function rankWord(value) {
  const tokens = parseWord(value);
  let offset = 0n, power = 1n, number = 0n;
  for (const token of tokens) {
    offset += power;
    power *= BASE;
    number = number * BASE + DIGITS.get(token);
  }
  return offset + number;
}

export function wordAt(value) {
  let rank = nonnegativeInteger(value), block = 1n, length = 0;
  while (rank >= block) {
    rank -= block;
    block *= BASE;
    length++;
    operationBound(length);
  }
  const tokens = new Array(length);
  for (let i = length - 1; i >= 0; i--) {
    tokens[i] = ALPHABET[Number(rank % BASE)];
    rank /= BASE;
  }
  return tokens;
}

export function wordId(value) { return `P${rankWord(value).toString().padStart(5, '0')}`; }
export function wordFromId(id) {
  if (typeof id !== 'string' || !/^P\d{5,}$/.test(id)) throw new Error('A piece ID must be P followed by at least five decimal digits.');
  const word = wordAt(id.slice(1));
  if (wordId(word) !== id) throw new Error('Noncanonical piece ID.');
  return word;
}
export function wordCount(maxOperations) {
  const n = operationBound(maxOperations);
  return (BASE ** BigInt(n + 1) - 1n) / (BASE - 1n);
}

export function pair(x, y) {
  x = nonnegativeInteger(x); y = nonnegativeInteger(y);
  const sum = x + y;
  return sum * (sum + 1n) / 2n + y;
}
export function integerSqrt(value) {
  const n = nonnegativeInteger(value);
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  let y = (x + n / x) >> 1n;
  while (y < x) { x = y; y = (x + n / x) >> 1n; }
  return x;
}
export function unpair(value) {
  const z = nonnegativeInteger(value);
  const diagonal = (integerSqrt(8n * z + 1n) - 1n) / 2n;
  const y = z - diagonal * (diagonal + 1n) / 2n;
  return [diagonal - y, y];
}
export function unboundedTripleAt(value) {
  const [a, tail] = unpair(value), [b, c] = unpair(tail);
  return [wordAt(a), wordAt(b), wordAt(c)];
}
export function unboundedTripleRank(words) {
  const triple = tripleFromWords(words);
  return pair(triple.pieces[0].word_rank, pair(triple.pieces[1].word_rank, triple.pieces[2].word_rank));
}
export function boundedTripleAt(value, maxOperations) {
  const rank = nonnegativeInteger(value), n = wordCount(maxOperations);
  if (rank >= n ** 3n) throw new Error('Rank is outside the bounded triple table.');
  return [wordAt(rank / (n * n)), wordAt(rank / n % n), wordAt(rank % n)];
}
export function boundedTripleRank(words, maxOperations) {
  const triple = tripleFromWords(words), n = wordCount(maxOperations);
  const ranks = triple.pieces.map(p => BigInt(p.word_rank));
  if (ranks.some(r => r >= n)) throw new Error('A piece exceeds the selected maximum operations.');
  return (ranks[0] * n + ranks[1]) * n + ranks[2];
}
export function candidateFromWord(value) {
  const operations = parseWord(value), rank = rankWord(operations);
  return {candidate_id: `P${rank.toString().padStart(5, '0')}`, word_rank: rank.toString(), operations};
}
export function tripleFromWords(values) {
  if (!Array.isArray(values) || values.length !== 3) throw new Error('A triple must contain exactly three words, ordered A, B, C.');
  const pieces = values.map(candidateFromWord);
  return {candidate_id: `TR-${pieces.map(p => p.candidate_id).join('-')}`, pieces};
}

/** Direct lookup for an exact word, canonical piece ID, or decimal rank. */
export function lookupWord(query) {
  if (typeof query === 'string' && /^P\d+$/.test(query.trim())) return candidateFromWord(wordFromId(query.trim()));
  if (typeof query === 'string' && /^\d+$/.test(query.trim())) return candidateFromWord(wordAt(query.trim()));
  return candidateFromWord(query);
}

/** Generate only a bounded page. maxOperations=null selects unbounded indexing. */
export function catalogPage({kind = 'words', start = '0', count = 25, maxOperations = null} = {}) {
  if (!['words', 'triples'].includes(kind)) throw new Error('Catalog kind must be words or triples.');
  if (!Number.isSafeInteger(count) || count < 1 || count > LIMITS.pageSize) throw new Error(`Page size must be 1–${LIMITS.pageSize}.`);
  const first = nonnegativeInteger(start);
  const total = maxOperations === null ? null : wordCount(maxOperations) ** (kind === 'words' ? 1n : 3n);
  if (total !== null && first >= total) throw new Error('Starting rank is outside the selected finite slice.');
  const rows = [];
  let operations = 0;
  for (let i = first; i < first + BigInt(count) && (total === null || i < total); i++) {
    const item = kind === 'words' ? candidateFromWord(wordAt(i)) : tripleFromWords(maxOperations === null ? unboundedTripleAt(i) : boundedTripleAt(i, maxOperations));
    operations += kind === 'words' ? item.operations.length : item.pieces.reduce((sum, piece) => sum + piece.operations.length, 0);
    if (operations > LIMITS.pageOperations) throw new Error(`This page exceeds the ${LIMITS.pageOperations.toLocaleString()}-operation display budget. Reduce the page size (down to one row for long sequences). This is a browser resource limit, not a theoretical bound.`);
    rows.push({row_rank: i.toString(), source_row: (i + 1n).toString(), item});
  }
  return {kind, indexing: kind === 'words' ? 'length-first' : maxOperations === null ? 'cantor-pairing' : 'bounded-cartesian-c-fastest', start: first.toString(), total: total === null ? null : total.toString(), maxOperations, rows};
}

/** Strict RFC4180-style parser, including BOM, CRLF, quoted commas and newlines. */
export function parseCsv(text) {
  if (typeof text !== 'string' || text.length > LIMITS.importCharacters) throw new Error(`CSV must be text of at most ${LIMITS.importCharacters} characters.`);
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  const finishField = () => { row.push(field); field = ''; closed = false; };
  const finishRow = () => {
    finishField();
    if (row.some(cell => cell !== '')) rows.push(row);
    row = [];
    if (rows.length > LIMITS.importRows + 1) throw new Error(`Import is limited to ${LIMITS.importRows} displayed rows per file.`);
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else field += ch;
    } else if (ch === ',') finishField();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else if (ch === '"' && field === '' && !closed) quoted = true;
    else {
      if (closed || ch === '"') throw new Error('Malformed CSV quoting.');
      field += ch;
    }
  }
  if (quoted) throw new Error('Unterminated CSV quote.');
  if (field || row.length || closed) finishRow();
  return rows;
}

export function readExplorerCsv(text) {
  const [headers = [], ...rows] = parseCsv(text);
  if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate headers.');
  const idx = name => headers.indexOf(name);
  if (idx('Row') < 0) throw new Error("CSV is missing the explorer's Row header.");
  const kind = idx('Ordered operation sequence') >= 0 ? 'words' : ['Piece A sequence', 'Piece B sequence', 'Piece C sequence'].every(name => idx(name) >= 0) ? 'triples' : null;
  if (!kind) throw new Error('CSV is not a recognized explorer words or triples page.');
  let operations = 0;
  return rows.map((row, i) => {
    try {
      if (row.length !== headers.length) throw new Error('Cell count does not match the header.');
      const source_row = row[idx('Row')];
      if (!/^\d+$/.test(source_row) || nonnegativeInteger(source_row) < 1n) throw new Error('Row must be a positive decimal integer.');
      const item = kind === 'words' ? candidateFromWord(row[idx('Ordered operation sequence')]) : tripleFromWords(['Piece A sequence', 'Piece B sequence', 'Piece C sequence'].map(name => row[idx(name)]));
      operations += kind === 'words' ? item.operations.length : item.pieces.reduce((sum, piece) => sum + piece.operations.length, 0);
      if (operations > LIMITS.importOperations) throw new Error(`CSV exceeds the ${LIMITS.importOperations.toLocaleString()}-operation import budget. Import a smaller displayed page.`);
      if (kind === 'words' && idx('Length') >= 0 && row[idx('Length')] !== '' && nonnegativeInteger(row[idx('Length')], 'Length') !== BigInt(item.operations.length)) throw new Error('Reported Length does not match sequence.');
      return {source_row, item};
    } catch (error) { throw new Error(`CSV record ${i + 2}: ${error.message}`); }
  });
}

export function exportExplorerCsv(pageOrRecords, kind) {
  const records = Array.isArray(pageOrRecords) ? pageOrRecords : pageOrRecords.rows;
  kind ??= Array.isArray(pageOrRecords) ? (records[0]?.item?.pieces ? 'triples' : 'words') : pageOrRecords.kind;
  if (!['words', 'triples'].includes(kind)) throw new Error('Export kind must be words or triples.');
  const headers = kind === 'words' ? ['Row', 'Ordered operation sequence', 'Length', 'Geometry / boundary status'] : ['Row', 'Piece A sequence', 'Piece B sequence', 'Piece C sequence', 'Gluing / closure / smoothness'];
  const rows = records.map((record, i) => {
    const row = record.source_row ?? String(i + 1), item = record.item ?? record;
    return kind === 'words' ? [row, formatWord(item.operations), String(item.operations.length), 'Not defined / not tested'] : [row, ...item.pieces.map(p => formatWord(p.operations)), 'Not specified / not tested'];
  });
  return '\uFEFF' + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
