import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBatch, prepareExplicitBatch, summarizeBatch, exportBatchCsv} from '../../src/static/research/batch.mjs';
import {batchRange} from '../../src/static/research/batch-meta.mjs';
import {validateNotebook, assertNotebookBudget, NOTEBOOK_LIMITS} from '../../src/static/research/notebook.mjs';
import {catalogPage, tripleFromWords, boundedTripleRank, parseCsv, wordFromId} from '../../src/static/research/catalog.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const sphere = {
  schema_version: '1', model: {id: 'three_piece_s4', version: '1.0'},
  pieces: [
    {name: 'A', maximal_simplices: [[1,2,3,4,5], [0,2,3,4,5]]},
    {name: 'B', maximal_simplices: [[0,1,3,4,5], [0,1,2,4,5]]},
    {name: 'C', maximal_simplices: [[0,1,2,3,5], [0,1,2,3,4]]},
  ], joining: {method: 'shared_vertex_labels', target: 'closed'},
};
const empty = tripleFromWords([[], [], []]);
function saved(candidate = empty, geometry = sphere) {
  return {id: 'saved', candidate: clone(candidate), geometry: clone(geometry), result: null, created_at: '2026-10-29T12:00:00.000Z'};
}
function report(record) {
  const geometry = record.geometry;
  return {schema_version: '1', test_version: '4d-nod-finite-complex/1.0.0', status: geometry ? 'completed' : 'not_tested',
    assessed_at: '2026-10-29T12:00:00.000Z', input_sha256: 'a'.repeat(64),
    input: {candidate: clone(record.candidate), geometry: clone(geometry)}, candidate: clone(record.candidate), model: geometry?.model ?? null,
    checks: geometry ? [
      {id:'dimension',label:'Dimension is four',status:'passed',evidence:{dimension:4}},
      {id:'facet_incidence',label:'Facet incidence',status:'failed',evidence:{facet:[0,1,2,3],incidence:3}},
      {id:'physical_identity',label:'Physical identity',status:'not_tested',evidence:'No observable derivation'},
    ] : [{id:'geometry',label:'Explicit geometry',status:'not_tested',evidence:'Not supplied'}],
    assembled: geometry ? {dimension:4,component_count:1,euler_characteristic:2,betti_numbers_mod2:[1,0,0,0,1],boundary_tetrahedra:[],overfull_tetrahedra:[]} : null,
    visualization: geometry ? {kind:'incidence_schematic',boundary_faces:[],overfull_faces:[],seams:[]} : null};
}

test('bounded batch has exact range provenance and creates independent symbolic snapshots', () => {
  const prepared = prepareBatch({start:'0',count:3,maxOperations:1}, []);
  assert.equal(prepared.batch.next_rank,'3');
  assert.equal(prepared.batch.count,3);
  assert.equal(prepared.batch.indexing,'bounded-cartesian-c-fastest');
  assert.deepEqual(prepared.records.map(r=>r.candidate),catalogPage({kind:'triples',start:'0',count:3,maxOperations:1}).rows.map(r=>r.item));
  assert.deepEqual(prepared.records.map(r=>r.batch.row_rank),['0','1','2']);
  assert(prepared.records.every(r=>r.geometry===null && r.result===null && r.batch.geometry_source==='none' && r.batch.id===prepared.batch.id));
  assert.equal(new Set(prepared.records.map(r=>r.id)).size,3);
  prepared.records[0].candidate.pieces[2].operations.push('Lx+');
  assert.deepEqual(prepared.records[1].candidate.pieces[2].operations,['Txy+']);
});

test('finite ranges never truncate and large ranks retain exact decimal identity', () => {
  assert.throws(()=>prepareBatch({start:'0',count:2,maxOperations:0}),/exceeds the bounded/);
  const last=prepareBatch({start:'38700218390624',count:1,maxOperations:3});
  assert.equal(last.batch.next_rank,'38700218390625');
  assert.throws(()=>prepareBatch({start:'38700218390624',count:2,maxOperations:3}),/exceeds/);
  const start='90071992547409931234567890';
  const large=prepareBatch({start,count:2,maxOperations:null});
  assert.equal(large.records[0].batch.row_rank,start);
  assert.equal(large.records[1].batch.row_rank,(BigInt(start)+1n).toString());
  assert.equal(large.batch.next_rank,(BigInt(start)+2n).toString());
  assert.equal(large.batch.indexing,'cantor-pairing');
  assert.deepEqual(large.records.map(r=>r.candidate),catalogPage({kind:'triples',start,count:2,maxOperations:null}).rows.map(r=>r.item));
});

test('only an exact ordered ID receives a saved geometry; copies do not imply a symbolic map', () => {
  const selected=tripleFromWords([[], [], ['Txy+']]);
  const swapped=tripleFromWords([['Txy+'], [], []]);
  const source=[saved(selected),saved(swapped)];
  source[0].result={status:'completed',invented:'old report never reused'};
  const before=clone(source);
  const prepared=prepareBatch({start:'0',count:3,maxOperations:1,geometryMode:'notebook'},source);
  assert.equal(prepared.records[0].geometry,null);
  assert.deepEqual(prepared.records[1].geometry,sphere);
  assert.equal(prepared.records[2].geometry,null);
  assert.equal(prepared.records[1].batch.geometry_source,'notebook');
  assert.equal(prepared.records[1].result,null);
  assert.deepEqual(source,before);
  source[0].geometry.model.version='changed after generation';
  assert.equal(prepared.records[1].geometry.model.version,'1.0');
  prepared.records[1].geometry.pieces[0].maximal_simplices[0][0]='changed';
  assert.equal(source[0].geometry.pieces[0].maximal_simplices[0][0],1);
  assert(prepareBatch({start:'0',count:3,maxOperations:1,geometryMode:'symbolic'},source).records.every(r=>r.geometry===null));
});

test('ambiguous candidate geometry stops atomically; identical duplicates are accepted', () => {
  const one=saved(),two=saved();two.geometry.model.version='2';
  const source=[one,two], before=JSON.stringify(source);
  assert.throws(()=>prepareBatch({count:1,geometryMode:'notebook'},source),/Ambiguous supplied geometry/);
  assert.equal(JSON.stringify(source),before);
  two.geometry=clone(sphere);
  two.geometry.model={version:'1.0',id:'three_piece_s4'};
  const prepared=prepareBatch({count:1,geometryMode:'notebook'},source);
  assert.deepEqual(prepared.records[0].geometry,two.geometry);
  two.candidate.pieces[0].candidate_id='P99999';
  assert.throws(()=>prepareBatch({count:1,geometryMode:'notebook'},source),/identity/);
});

test('batch checkpoints retain rank and geometry association; imports remap whole groups', () => {
  const batch=prepareBatch({count:3,geometryMode:'notebook'},[saved()]);
  batch.records[0].result=report(batch.records[0]);
  const source={schema_version:'1',records:batch.records};
  const restored=validateNotebook(clone(source),{restore:true});
  assert.equal(restored[0].batch.id,batch.batch.id);
  assert.equal(restored[0].result.status,'completed');
  assert.deepEqual(restored.map(r=>r.batch.row_rank),['0','1','2']);
  const interrupted=clone(source);interrupted.records[1].error='Stopped at the request resource bound';
  assert.equal(validateNotebook(interrupted,{restore:true})[1].error,'Stopped at the request resource bound');
  const imported=validateNotebook(clone(source)),again=validateNotebook(clone(source));
  assert.notEqual(imported[0].batch.id,batch.batch.id);
  assert.notEqual(imported[0].batch.id,again[0].batch.id);
  assert.equal(new Set(imported.map(r=>r.batch.id)).size,1);
  assert.equal(imported[0].result,null);assert.equal(imported[0].archived_result.status,'completed');
  const bad=clone(source);bad.records[1].batch.row_rank='2';
  assert.throws(()=>validateNotebook(bad),/does not match the candidate/);
  for(const mutate of [m=>m.indexing='cantor-pairing',m=>m.count=101,m=>m.geometry_source='none',m=>m.id='x'.repeat(101),m=>m.created_at='no date',m=>m.start='5']) {
    const changed=clone(source);mutate(changed.records[0].batch);assert.throws(()=>validateNotebook(changed));
  }
  const missing=clone(source);delete missing.records[0].batch.max_operations;
  assert.throws(()=>validateNotebook(missing),/requires explicit/);
  const duplicate=clone(source);duplicate.records.push(clone(duplicate.records[0]));
  assert.throws(()=>validateNotebook(duplicate),/unique row ranks/);
  const inconsistent=clone(source);inconsistent.records[1].batch.count=2;
  assert.throws(()=>validateNotebook(inconsistent),/consistent range metadata/);
});

test('summary separates supplied geometry, symbolic responses, pending and errors', () => {
  const {records}=prepareBatch({count:4,geometryMode:'notebook'},[saved()]);
  records[0].result=report(records[0]);records[1].result=report(records[1]);records[2].error='Resource limit';
  assert.deepEqual(summarizeBatch(records),{total:4,completed:2,pending:2,errors:1,geometric:1,symbolic:3,assessed_geometry:1,not_tested:1,passed_checks:1,failed_checks:1,not_tested_checks:2});
});

test('CSV includes all words, qualifications, versions and witnesses; formulas stay inert', () => {
  const unsafe=saved();unsafe.geometry.model.id=' =HYPERLINK("bad")';unsafe.geometry.model.version='@version';
  const {records}=prepareBatch({count:2,geometryMode:'notebook'},[unsafe]);
  records[0].result=report(records[0]);records[1].error='+error';
  const [header,first,second]=parseCsv(exportBatchCsv(records));
  assert.equal(header.length,19);
  assert.equal(header[1],'Position / rank (zero-based)');
  assert.equal(first[16],'bounded-cartesian-c-fastest');
  assert.equal(first[2],empty.candidate_id);
  assert.deepEqual(first.slice(3,6),['∅','∅','∅']);
  assert.equal(first[7],"' =HYPERLINK(\"bad\")");assert.equal(first[8],"'@version");
  assert.equal(first[9],'completed');assert.equal(first[10],'Dimension is four');assert.equal(first[11],'Facet incidence');assert.equal(first[12],'Physical identity');
  assert.match(first[13],/"incidence":3/);assert.match(first[15],/No full manifold, smoothness or physical particle determination/);
  assert.equal(second[9],'error');assert.equal(second[14],"'+error");
  const stale=clone(records);stale[0].geometry.model.version='changed';
  const staleRows=parseCsv(exportBatchCsv(stale));assert.equal(staleRows[1][9],'pending');assert.equal(staleRows[1][13],'');
});

test('count, operation, and total notebook budgets fail before any mutation', () => {
  for(const config of [{count:0},{count:101},{count:1.5},{count:'1'},{start:-1},{start:Number.MAX_SAFE_INTEGER+1},{maxOperations:-1},{maxOperations:4097},{geometryMode:'same-control-for-all'}]) assert.throws(()=>prepareBatch(config));
  const source=Array.from({length:99},()=>saved(empty,null));
  assert.throws(()=>prepareBatch({count:2},source),/100-record/);assert.equal(source.length,99);
  const big=[{padding:'x'.repeat(NOTEBOOK_LIMITS.bytes-100)}];
  assert.throws(()=>prepareBatch({count:1},big),/9,000,000-byte/);
  assert.equal(big[0].padding.length,NOTEBOOK_LIMITS.bytes-100);
  const longWord=Array(200).fill('Txy+');
  const start=boundedTripleRank([longWord,longWord,longWord],200).toString();
  assert.throws(()=>prepareBatch({start,count:40,maxOperations:200}),/operation display budget/);
  assert.equal(batchRange({start:'000',count:1,maxOperations:0}).start,'0');
});

function workbookExamples() {
  const words=['P00001','P00013','P00021','P01907','P01074','P15334'].map(wordFromId);
  const records=[];
  for(const a of words)for(const b of words)for(const c of words) {
    const index=records.length;
    records.push({candidate:tripleFromWords([a,b,c]),source:{type:'xlsx',filename:'4D_NOD_twist_loop_tables.xlsx',
      sha256:'a'.repeat(64),sheet:'Triple examples',excel_row:String(index+6),source_id:`C${String(index+1).padStart(4,'0')}`}});
  }
  return records;
}

test('explicit workbook examples retain exact noncontiguous candidates in 100/100/16 batches', () => {
  const source=workbookExamples(), prepared=[];
  for(const start of [0,100,200]) {
    const selected=source.slice(start,start+100);
    const result=prepareExplicitBatch({start:String(start),label:`Workbook examples ${start+1}–${start+selected.length}`},selected);
    prepared.push(result);
    assert.equal(result.batch.indexing,'explicit-list');
    assert.equal(result.batch.max_operations,null);
    assert.equal(result.batch.next_rank,String(start+selected.length));
    assert.deepEqual(result.batch.candidate_ids,selected.map(record=>record.candidate.candidate_id));
    assert.deepEqual(result.records.map(record=>record.candidate),selected.map(record=>record.candidate));
    assert.deepEqual(result.records.map(record=>record.source),selected.map(record=>record.source));
    assert.deepEqual(result.records.map(record=>record.batch.row_rank),selected.map((_,index)=>String(start+index)));
    assert(result.records.every(record=>record.geometry===null&&record.result===null&&record.archived_result===null));
    assert(result.records.every(record=>record.batch.geometry_source==='none'&&record.batch.id===result.batch.id));
    assert.doesNotThrow(()=>validateNotebook({schema_version:'1',records:result.records}));
  }
  assert.deepEqual(prepared.map(result=>result.records.length),[100,100,16]);
  assert.equal(new Set(prepared.map(result=>result.batch.id)).size,3);
  assert.equal(prepared[0].records[0].candidate.candidate_id,'TR-P00001-P00001-P00001');
  assert.equal(prepared[2].records.at(-1).candidate.candidate_id,'TR-P15334-P15334-P15334');
  assert.notEqual(boundedTripleRank(source[0].candidate.pieces.map(piece=>piece.operations),3),0n);
  assert.deepEqual(prepared.map(result=>[result.records[0].source.source_id,result.records.at(-1).source.source_id]),
    [['C0001','C0100'],['C0101','C0200'],['C0201','C0216']]);
  assert.deepEqual(prepared.map(result=>[result.records[0].source.excel_row,result.records.at(-1).source.excel_row]),
    [['6','105'],['106','205'],['206','221']]);
});

test('explicit preparation snapshots only supplied candidates and provenance, never old geometry or reports', () => {
  const source=workbookExamples().slice(0,2);
  source[0].geometry=clone(sphere);source[0].result={status:'completed',untrusted:'old'};
  source[0].archived_result={old:true};source[0].batch={id:'old-invalid-batch'};
  const before=clone(source),prepared=prepareExplicitBatch({start:'100',label:'  Selected examples  '},source);
  assert.deepEqual(source,before);
  assert.equal(prepared.batch.label,'Selected examples');
  assert(prepared.records.every(record=>record.geometry===null&&record.result===null&&record.archived_result===null));
  source[0].candidate.pieces[0].operations.push('Lx+');source[0].source.source_id='changed';
  assert.deepEqual(prepared.records[0].candidate.pieces[0].operations,['Txy+']);
  assert.equal(prepared.records[0].source.source_id,'C0001');
  prepared.batch.candidate_ids[0]=empty.candidate_id;
  assert.equal(prepared.records[0].batch.candidate_ids[0],'TR-P00001-P00001-P00001');
  prepared.records[0].batch.candidate_ids[1]=empty.candidate_id;
  assert.notEqual(prepared.records[1].batch.candidate_ids[1],empty.candidate_id);
});

test('explicit manifests bind each position, reject inconsistent groups across combined arrays, and allow partial checkpoints', () => {
  const {records}=prepareExplicitBatch({start:'100',label:'Selected source rows'},workbookExamples().slice(100,103));
  assert.doesNotThrow(()=>validateNotebook({schema_version:'1',records:[records[1]]},{restore:true}));
  for(const mutate of [
    m=>m.row_rank='99',m=>m.row_rank='103',m=>m.row_rank='101',m=>m.max_operations=3,
    m=>m.candidate_ids.pop(),m=>m.candidate_ids[0]=empty.candidate_id,
    m=>m.candidate_ids[1]='TR-P000001-P00000-P00000',m=>m.candidate_ids[1]='TR-P1-P00000-P00000',
    m=>m.label='',m=>m.label='x'.repeat(161),
  ]) {
    const bad=clone(records);mutate(bad[0].batch);
    assert.throws(()=>validateNotebook({schema_version:'1',records:bad}));
  }
  const changed=clone(records[1]);changed.batch.candidate_ids[0]=empty.candidate_id;
  // The changed row still matches its own position; the shared manifest differs.
  assert.doesNotThrow(()=>validateNotebook({schema_version:'1',records:[changed]},{restore:true}));
  assert.throws(()=>assertNotebookBudget([records[0],changed]),/consistent range metadata/);
  const changedLabel=clone(records[1]);changedLabel.batch.label='A different source list';
  assert.throws(()=>assertNotebookBudget([records[0],changedLabel]),/consistent range metadata/);
  assert.throws(()=>assertNotebookBudget([records[0],clone(records[0])]),/unique row ranks/);
  const repeated=prepareExplicitBatch({},[{candidate:empty},{candidate:empty}]).records;
  const duplicate=clone(repeated[0]);duplicate.batch.row_rank='1';
  assert.throws(()=>assertNotebookBudget([repeated[1],duplicate]),/unique row ranks/);
});

test('explicit imports remap batch IDs, quarantine reports, preserve source positions, and export honest CSV indexing', () => {
  const prepared=prepareExplicitBatch({start:'200',label:'Workbook examples 201–216'},workbookExamples().slice(200));
  prepared.records[0].result=report(prepared.records[0]);
  const document={schema_version:'1',records:prepared.records};
  const restored=validateNotebook(clone(document),{restore:true});
  assert.equal(restored[0].result.status,'not_tested');
  assert.equal(restored[0].batch.id,prepared.batch.id);
  const imported=validateNotebook(clone(document)),again=validateNotebook(clone(document));
  assert.notEqual(imported[0].batch.id,prepared.batch.id);
  assert.notEqual(imported[0].batch.id,again[0].batch.id);
  assert.equal(new Set(imported.map(record=>record.batch.id)).size,1);
  assert.equal(imported[0].result,null);assert.equal(imported[0].archived_result.status,'not_tested');
  assert.equal(imported[0].batch.row_rank,'200');
  assert.deepEqual(imported[0].batch.candidate_ids,prepared.batch.candidate_ids);
  assert.deepEqual(imported[0].source,prepared.records[0].source);
  const [headers,first]=parseCsv(exportBatchCsv(restored));
  assert.equal(headers[1],'Position / rank (zero-based)');
  assert.deepEqual(headers.slice(16),['Indexing','Source ID','Excel row']);
  assert.equal(first[1],'200');assert.equal(first[16],'explicit-list');
  assert.equal(first[17],'C0201');assert.equal(first[18],'206');
});

test('explicit selection, candidate, source, operation and combined notebook limits fail without mutation', () => {
  assert.throws(()=>prepareExplicitBatch({},[]),/1–100/);
  assert.throws(()=>prepareExplicitBatch({},Array(101).fill({candidate:empty})),/1–100/);
  assert.throws(()=>prepareExplicitBatch({start:-1},[{candidate:empty}]));
  const selected=workbookExamples().slice(0,2),existing=Array.from({length:99},()=>saved(empty,null));
  assert.throws(()=>prepareExplicitBatch({},selected,existing),/100-record/);
  assert.equal(existing.length,99);
  const invalid=clone(selected);invalid[0].candidate.candidate_id=empty.candidate_id;
  assert.throws(()=>prepareExplicitBatch({},invalid),/identity/);
  invalid[0]=clone(selected[0]);invalid[0].source.sha256='not-a-hash';
  assert.throws(()=>prepareExplicitBatch({},invalid),/provenance/);
  const long=tripleFromWords(Array.from({length:3},()=>Array(200).fill('Txy+')));
  assert.throws(()=>prepareExplicitBatch({},Array.from({length:40},()=>({candidate:long}))),/operation display budget/);
  const nearlyFull=[{padding:'x'.repeat(NOTEBOOK_LIMITS.bytes-100)}];
  assert.throws(()=>prepareExplicitBatch({},selected,nearlyFull),/9,000,000-byte/);
});
