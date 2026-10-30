/** Generate finite research batches and export qualified evidence. */
import {catalogPage, formatWord, LIMITS} from './catalog.mjs';
import {assertNotebookBudget, validateNotebook} from './notebook.mjs';
import {batchRange} from './batch-meta.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  : JSON.stringify(value);

/** Does not mutate the source notebook or reuse its prior assessment reports. */
export function prepareBatch({start = '0', count = 10, maxOperations = 3, geometryMode = 'symbolic'} = {}, existingRecords = []) {
  const range = batchRange({start, count, maxOperations});
  if (!['symbolic', 'notebook'].includes(geometryMode)) throw new Error('Batch geometry mode must be symbolic or notebook.');
  assertNotebookBudget(existingRecords);
  if (existingRecords.length + count > 100) throw new Error('The batch would exceed the 100-record notebook limit. Export and remove records or reduce the batch size.');
  // Copy before generation: a running batch keeps its supplied model snapshot.
  const source = clone(existingRecords);
  const generated = catalogPage({kind: 'triples', start: range.start, count, maxOperations});
  if (generated.rows.length !== count) throw new Error('Batch generation did not return the complete requested range.');
  const desired = new Set(generated.rows.map(row => row.item.candidate_id));
  const geometries = new Map();
  if (geometryMode === 'notebook') {
    for (const record of source) {
      if (!record?.geometry || !desired.has(record.candidate?.candidate_id)) continue;
      // Validate only assignments that are candidates for this batch. Archived
      // reports do not supply geometry or become evidence for a new record.
      const normalized = validateNotebook({schema_version: '1', records: [{candidate: record.candidate, geometry: record.geometry, result: null, created_at: record.created_at} ]})[0];
      const key = normalized.candidate.candidate_id;
      const current = geometries.get(key);
      if (current && canonical(current) !== canonical(normalized.geometry)) throw new Error(`Ambiguous supplied geometry for ${key}. The notebook has different geometry inputs for this candidate; remove the ambiguity or run those saved records separately.`);
      geometries.set(key, normalized.geometry);
    }
  }
  const created_at = new Date().toISOString();
  const batch = {id: globalThis.crypto.randomUUID(), ...range, created_at};
  const prepared = generated.rows.map(row => {
    const geometry = geometries.get(row.item.candidate_id) ?? null;
    return {
      id: globalThis.crypto.randomUUID(), candidate: clone(row.item), geometry: clone(geometry), result: null, created_at,
      batch: {id: batch.id, start: batch.start, count: batch.count, row_rank: row.row_rank,
        indexing: batch.indexing, max_operations: batch.max_operations, created_at,
        geometry_source: geometry === null ? 'none' : 'notebook'},
    };
  });
  // The same validation path is used for generated and imported checkpoint data.
  const records = validateNotebook({schema_version: '1', records: prepared}, {restore: true});
  assertNotebookBudget([...existingRecords, ...records]);
  return {batch, records};
}

/** Prepare an exact selected list; list positions are never generated ranks.
 * Source descriptors are retained input provenance, not authenticated evidence.
 * Explicit source geometries/reports are deliberately not reused by this helper.
 */
export function prepareExplicitBatch({start = '0', label} = {}, explicitRecords, existingRecords = []) {
  if (!Array.isArray(explicitRecords) || explicitRecords.length < 1 || explicitRecords.length > 100) throw new Error('An explicit batch requires 1–100 selected candidate records.');
  const range = {...batchRange({start, count: explicitRecords.length, maxOperations: null}), indexing: 'explicit-list'};
  assertNotebookBudget(existingRecords);
  if (existingRecords.length + explicitRecords.length > 100) throw new Error('The batch would exceed the 100-record notebook limit. Export and remove records or reduce the batch size.');
  const created_at = new Date().toISOString();
  const clean = explicitRecords.map(record => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Explicit batch entries must supply a candidate and optional source provenance.');
    return {candidate: clone(record.candidate), geometry: null, result: null, created_at,
      ...(record.source == null ? {} : {source: clone(record.source)})};
  });
  const normalized = validateNotebook({schema_version: '1', records: clean}, {restore: true});
  const operations = normalized.reduce((total, record) => total + record.candidate.pieces.reduce((sum, piece) => sum + piece.operations.length, 0), 0);
  if (operations > LIMITS.pageOperations) throw new Error(`This batch exceeds the ${LIMITS.pageOperations.toLocaleString()}-operation display budget. Select fewer long candidates.`);
  const candidate_ids = normalized.map(record => record.candidate.candidate_id);
  const batch = {id: globalThis.crypto.randomUUID(), ...range, created_at, candidate_ids,
    ...(label === undefined ? {} : {label})};
  const prepared = normalized.map((record, index) => ({...record,
    batch: {id: batch.id, start: batch.start, count: batch.count,
      row_rank: (BigInt(batch.start) + BigInt(index)).toString(), indexing: 'explicit-list', max_operations: null,
      candidate_ids: [...candidate_ids], ...(label === undefined ? {} : {label}), created_at, geometry_source: 'none'},
  }));
  const records = validateNotebook({schema_version: '1', records: prepared}, {restore: true});
  if (records[0].batch.label !== undefined) batch.label = records[0].batch.label;
  assertNotebookBudget([...existingRecords, ...records]);
  return {batch, records};
}

/** completed includes qualified not_tested responses; pending includes retries. */
export function summarizeBatch(records = []) {
  const summary = {total: records.length, completed: 0, pending: 0, errors: 0, geometric: 0, symbolic: 0,
    assessed_geometry: 0, not_tested: 0, passed_checks: 0, failed_checks: 0, not_tested_checks: 0};
  for (const record of records) {
    if (record.geometry == null) summary.symbolic++; else summary.geometric++;
    const result = record.result;
    if (result && ['completed', 'not_tested'].includes(result.status)) {
      summary.completed++;
      if (result.status === 'not_tested') summary.not_tested++;
      else if (record.geometry != null) summary.assessed_geometry++;
      for (const check of result.checks || []) {
        if (check.status === 'passed') summary.passed_checks++;
        else if (check.status === 'failed') summary.failed_checks++;
        else summary.not_tested_checks++;
      }
    } else {
      summary.pending++;
      if (record.error) summary.errors++;
    }
  }
  return summary;
}

function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Spreadsheet apps may execute a formula even in a quoted CSV cell.
  if (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** CSV is an evidence summary, not an assertion of a valid manifold or particle. */
export function exportBatchCsv(records = []) {
  assertNotebookBudget(records);
  const normalized = validateNotebook({schema_version: '1', records}, {restore: true});
  const headers = ['Batch ID', 'Position / rank (zero-based)', 'Candidate ID', 'Piece A sequence', 'Piece B sequence', 'Piece C sequence',
    'Geometry source', 'Model ID', 'Model version', 'Assessment state', 'Passed checks', 'Failed checks', 'Not tested checks', 'Check evidence JSON', 'Error', 'Qualification',
    'Indexing', 'Source ID', 'Excel row'];
  const rows = normalized.map((record, i) => {
    const result = record.result, checks = result?.checks || [];
    const state = result?.status || (records[i]?.error ? 'error' : 'pending');
    const labels = status => checks.filter(check => check.status === status).map(check => check.label).join('; ');
    return [record.batch?.id, record.batch?.row_rank, record.candidate.candidate_id,
      ...record.candidate.pieces.map(piece => formatWord(piece.operations)), record.batch?.geometry_source || (record.geometry ? 'supplied' : 'none'),
      record.geometry?.model?.id, record.geometry?.model?.version, state,
      labels('passed'), labels('failed'), labels('not_tested'), result ? JSON.stringify(checks) : '', records[i]?.error || '',
      'Necessary checks only. No full manifold, smoothness or physical particle determination. Symbolic words do not construct this geometry.',
      record.batch?.indexing, record.source?.source_id, record.source?.excel_row];
  });
  return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
