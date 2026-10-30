/** Serializable provenance for bounded candidate batches; no geometry inference. */
import {nonnegativeInteger, wordCount, boundedTripleAt, unboundedTripleAt, tripleFromWords, LIMITS} from './catalog.mjs';

export const BATCH_LIMITS = Object.freeze({count: 100});
const largestWordRank = (wordCount(LIMITS.maxOperations) - 1n).toString();

function explicitManifest(raw, count) {
  if (!Array.isArray(raw) || raw.length !== count) throw new Error('An explicit-list batch requires one ordered candidate ID for every declared row.');
  return raw.map(identity => {
    if (typeof identity !== 'string' || !/^TR-P\d{5,}-P\d{5,}-P\d{5,}$/.test(identity)) throw new Error('Explicit-list manifests require canonical ordered triple IDs.');
    for (const piece of identity.slice(3).split('-')) {
      const digits = piece.slice(1);
      if ((digits.length > 5 && digits.startsWith('0')) || digits.length > largestWordRank.length
          || (digits.length === largestWordRank.length && digits > largestWordRank)) throw new Error('Explicit-list manifest piece IDs must be canonical and within the supported word bound.');
    }
    return identity;
  });
}

export function batchRange({start = '0', count = 10, maxOperations = 3} = {}) {
  if (!Number.isSafeInteger(count) || count < 1 || count > BATCH_LIMITS.count) throw new Error('Batch size must be an integer from 1 to 100.');
  const first = nonnegativeInteger(start, 'Batch starting rank');
  if (first.toString().length > LIMITS.rankDigits) throw new Error('Batch starting rank exceeds the decimal digit limit.');
  if (maxOperations !== null && (!Number.isSafeInteger(maxOperations) || maxOperations < 0 || maxOperations > LIMITS.maxOperations)) throw new Error('Maximum operations must be an integer from 0 to 4,096, or null for the unbounded index.');
  const end = first + BigInt(count);
  const total = maxOperations === null ? null : wordCount(maxOperations) ** 3n;
  if (total !== null && end > total) throw new Error(`The requested batch exceeds the bounded table of ${total} ordered triples. Choose a smaller batch or an earlier starting rank.`);
  return {
    start: first.toString(), count, next_rank: end.toString(),
    indexing: maxOperations === null ? 'cantor-pairing' : 'bounded-cartesian-c-fastest',
    max_operations: maxOperations,
  };
}

/** Verify the row/candidate association as well as the resource bounds. */
export function validateBatchMetadata(raw, candidate, geometry) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Batch provenance must be an object.');
  if (typeof raw.start !== 'string' || typeof raw.row_rank !== 'string' || !Object.prototype.hasOwnProperty.call(raw, 'count') || !Object.prototype.hasOwnProperty.call(raw, 'max_operations')) throw new Error('Batch provenance requires explicit decimal start and row ranks, count, and operation bound.');
  if (typeof raw.id !== 'string' || !/^[A-Za-z0-9._:-]{1,100}$/.test(raw.id)) throw new Error('Batch ID must contain 1–100 letters, digits, dots, underscores, colons or hyphens.');
  if (typeof raw.created_at !== 'string' || raw.created_at.length > 80 || !Number.isFinite(Date.parse(raw.created_at))) throw new Error('Batch creation time must be a valid date.');
  const explicit = raw.indexing === 'explicit-list';
  if (explicit && raw.max_operations !== null) throw new Error('Explicit-list batches must declare a null operation bound; their positions are not generated catalog ranks.');
  const range = batchRange({start: raw.start, count: raw.count, maxOperations: raw.max_operations});
  if (explicit) range.indexing = 'explicit-list';
  else if (raw.indexing !== range.indexing) throw new Error('Batch indexing does not match its operation bound.');
  const row = nonnegativeInteger(raw.row_rank, 'Batch row rank');
  if (row < BigInt(range.start) || row >= BigInt(range.next_rank)) throw new Error('Batch row rank is outside its declared range.');
  let candidate_ids, label;
  if (explicit) {
    candidate_ids = explicitManifest(raw.candidate_ids, range.count);
    if (candidate?.candidate_id !== candidate_ids[Number(row - BigInt(range.start))]) throw new Error('Explicit-list position does not match the candidate identity in its ordered manifest.');
    if (raw.label !== undefined) {
      if (typeof raw.label !== 'string' || !raw.label.trim() || raw.label.length > 160) throw new Error('Batch label must contain 1–160 characters.');
      label = raw.label.trim();
    }
  } else {
    const expected = tripleFromWords(range.max_operations === null ? unboundedTripleAt(row) : boundedTripleAt(row, range.max_operations));
    if (candidate?.candidate_id !== expected.candidate_id) throw new Error('Batch row rank does not match the candidate identity.');
  }
  if (!['none', 'notebook'].includes(raw.geometry_source)) throw new Error('Batch geometry source must be none or notebook.');
  if ((raw.geometry_source === 'none') !== (geometry == null)) throw new Error('Batch geometry source does not match the saved geometry input.');
  return {
    id: raw.id, start: range.start, count: range.count, row_rank: row.toString(),
    indexing: range.indexing, max_operations: range.max_operations,
    created_at: raw.created_at, geometry_source: raw.geometry_source,
    ...(explicit ? {candidate_ids, ...(label === undefined ? {} : {label})} : {}),
  };
}

/** Apply to combined notebooks too, including partially retained batch groups. */
export function assertBatchGroups(records) {
  const groups = new Map();
  for (const record of records) {
    if (record?.batch == null) continue;
    const batch = validateBatchMetadata(record.batch, record.candidate, record.geometry);
    const {row_rank, geometry_source, ...definition} = batch;
    const signature = JSON.stringify(definition), group = groups.get(batch.id);
    if (group && (group.signature !== signature || group.rows.has(row_rank))) throw new Error('Batch records must have consistent range metadata, labels and ordered manifests, and unique row ranks within each batch.');
    if (group) group.rows.add(row_rank);
    else groups.set(batch.id, {signature, rows: new Set([row_rank])});
  }
}
