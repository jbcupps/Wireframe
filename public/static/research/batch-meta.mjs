/** Serializable provenance for bounded candidate batches; no geometry inference. */
import {nonnegativeInteger, wordCount, boundedTripleAt, unboundedTripleAt, tripleFromWords, LIMITS} from './catalog.mjs';

export const BATCH_LIMITS = Object.freeze({count: 100});

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
  const range = batchRange({start: raw.start, count: raw.count, maxOperations: raw.max_operations});
  if (raw.indexing !== range.indexing) throw new Error('Batch indexing does not match its operation bound.');
  const row = nonnegativeInteger(raw.row_rank, 'Batch row rank');
  if (row < BigInt(range.start) || row >= BigInt(range.next_rank)) throw new Error('Batch row rank is outside its declared range.');
  const expected = tripleFromWords(range.max_operations === null ? unboundedTripleAt(row) : boundedTripleAt(row, range.max_operations));
  if (candidate?.candidate_id !== expected.candidate_id) throw new Error('Batch row rank does not match the candidate identity.');
  if (!['none', 'notebook'].includes(raw.geometry_source)) throw new Error('Batch geometry source must be none or notebook.');
  if ((raw.geometry_source === 'none') !== (geometry == null)) throw new Error('Batch geometry source does not match the saved geometry input.');
  return {
    id: raw.id, start: range.start, count: range.count, row_rank: row.toString(),
    indexing: range.indexing, max_operations: range.max_operations,
    created_at: raw.created_at, geometry_source: raw.geometry_source,
  };
}
