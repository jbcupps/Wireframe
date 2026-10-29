import {ALPHABET,parseWord,formatWord,wordId,tripleFromWords,catalogPage,lookupWord,readExplorerCsv,exportExplorerCsv} from './catalog.mjs';
import {mountVisualization} from './visualization.mjs';
import {validateNotebook,assertNotebookBudget} from './notebook.mjs';
import {prepareBatch,summarizeBatch,exportBatchCsv} from './batch.mjs';
import {mountWorkbook} from './workbook.mjs';

const $=id=>document.getElementById(id);
const labels=['A','B','C'], colors=['#62d6d0','#d6a3fa','#f0bd72'];
const KEY='4d-nod-research-notebook-v1';
let words=[[],[],[]], geometry=null, result=null, controls=[], page, records=[], activeRequest=null, revision=0, queueStopped=false, queueRunning=false, activeBatchId=null;
let visual=mountVisualization($('visualization'),{geometry,result,candidate:tripleFromWords(words)});
let workbookUI=null;
const clone=value=>JSON.parse(JSON.stringify(value));
function notice(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
function guard(fn){return async(...args)=>{try{await fn(...args);}catch(e){notice(e.message,true);}};}
function on(id,fn,event='click'){$(id).addEventListener(event,guard(fn));}
function el(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function button(text,fn,label){const b=el('button',text);b.type='button';if(label)b.setAttribute('aria-label',label);b.addEventListener('click',guard(fn));return b;}
function candidate(){return tripleFromWords(words);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(records));$('storage-warning').hidden=true;return true;}catch{$('storage-warning').hidden=false;$('storage-warning').textContent='Browser storage is unavailable or full. New results are retained in this tab only. The queue has paused; export a checkpoint before leaving, then free storage before resuming.';notice('Checkpoint could not be saved. Export your notebook or batch JSON before leaving this tab.',true);return false;}}
function download(name,value,type='application/json',compact=false){const body=type==='application/json'?JSON.stringify(value,null,compact?0:2):value;const url=URL.createObjectURL(new Blob([body],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function fileText(id,max=2000000){const file=$(id).files[0];if(!file)return null;if(file.size>max)throw Error(`File exceeds the ${max.toLocaleString()} byte import limit.`);const text=await file.text();$(id).value='';return text;}
function invalidate(){revision++;result=null;$('export-result').disabled=true;renderResults();visual.update({geometry,result,candidate:candidate()});}
function renderPieces(){
  $('pieces').replaceChildren();
  words.forEach((word,i)=>{
    const card=el('article',undefined,'piece-card');card.style.setProperty('--piece',colors[i]);card.append(el('h3',`Piece ${labels[i]}`),el('code',wordId(word)));
    const ops=el('div',undefined,'ops');
    if(!word.length)ops.append(el('p','∅ · empty word','muted'));
    word.forEach((op,j)=>{const row=el('div',undefined,'op');row.append(el('code',`${j+1}. ${op.replace('-','−')}`));
      const move=direction=>{const k=j+direction;if(k<0||k>=word.length)return;[word[j],word[k]]=[word[k],word[j]];changed();};
      const up=button('↑',()=>move(-1),`Move ${labels[i]} operation ${j+1} up`);up.disabled=j===0;
      const down=button('↓',()=>move(1),`Move ${labels[i]} operation ${j+1} down`);down.disabled=j===word.length-1;
      row.append(up,down,button('⧉',()=>{if(word.length>=4096)throw Error('Session limit: 4,096 operations per piece.');word.splice(j+1,0,op);changed();},`Repeat ${labels[i]} operation ${j+1}`),button('×',()=>{word.splice(j,1);changed();},`Remove ${labels[i]} operation ${j+1}`));ops.append(row);});card.append(ops);
    const bar=el('div',undefined,'toolbar'),select=el('select');select.setAttribute('aria-label',`Operation for piece ${labels[i]}`);
    [['Twists','T'],['Axis loops','L'],['Plane loops','P']].forEach(([title,prefix])=>{const group=el('optgroup');group.label=title;ALPHABET.filter(op=>op.startsWith(prefix)).forEach(op=>{const o=el('option',op.replace('-','−'));o.value=op;group.append(o);});select.append(group);});
    bar.append(select,button('+ Add',()=>{if(word.length>=4096)throw Error('Session limit: 4,096 operations per piece.');word.push(select.value);changed();},`Add operation to piece ${labels[i]}`),button('Clear',()=>{words[i]=[];changed();},`Clear piece ${labels[i]}`));card.append(bar);
    const label=el('label',`Edit piece ${labels[i]} sequence`),input=el('textarea');input.rows=2;input.value=formatWord(word);input.setAttribute('aria-label',`Piece ${labels[i]} sequence`);input.maxLength=50000;label.append(input);card.append(label,button('Apply sequence',()=>{words[i]=parseWord(input.value);changed();},`Apply piece ${labels[i]} sequence`));$('pieces').append(card);
  });$('candidate-id').textContent=candidate().candidate_id;
}
function changed(){invalidate();renderPieces();}
function useItem(item,i){if(item.pieces){words=item.pieces.map(p=>[...p.operations]);}else words[i]=[...item.operations];changed();notice(`Loaded ${item.candidate_id}${item.pieces?'':` into piece ${labels[i]}`}.`);}
function renderCatalog(rows,kind){
  $('catalog-head').replaceChildren();const heading=el('tr');['Source row','Stable identity',kind==='words'?'Ordered sequence':'A / B / C sequences','Use'].forEach(t=>heading.append(el('th',t)));$('catalog-head').append(heading);$('catalog-body').replaceChildren();
  rows.forEach(row=>{const tr=el('tr'),item=row.item;tr.append(el('td',row.source_row));const id=el('td');id.append(el('code',item.candidate_id));tr.append(id);const seq=el('td');if(item.pieces)item.pieces.forEach((p,i)=>seq.append(el('div',`${labels[i]} · ${formatWord(p.operations)}`)));else seq.textContent=formatWord(item.operations);tr.append(seq);const actions=el('td');if(item.pieces)actions.append(button('Use triple',()=>useItem(item)));else labels.forEach((l,i)=>actions.append(button(l,()=>useItem(item,i),`Use ${item.candidate_id} for piece ${l}`)));tr.append(actions);$('catalog-body').append(tr);});
}
function loadPage(){
  const scope=$('catalog-scope').value,size=Number($('page-size').value);page=catalogPage({kind:$('catalog-kind').value,start:$('catalog-start').value,count:size,maxOperations:scope==='bounded'?Number($('catalog-bound').value):null});renderCatalog(page.rows,page.kind);
  $('catalog-summary').textContent=`${page.total===null?'Infinitely many formal descriptions':BigInt(page.total).toLocaleString()+' formal descriptions'} · ${page.indexing} · ${scope==='bounded'?'length 0–'+page.maxOperations:'no theoretical length bound'}`;
  $('catalog-range').textContent=`Showing source rows ${page.rows[0]?.source_row}–${page.rows.at(-1)?.source_row}`;$('catalog-bound').disabled=scope==='unbounded';$('catalog-prev').disabled=page.start==='0';$('catalog-next').disabled=page.total!==null&&BigInt(page.start)+BigInt(size)>=BigInt(page.total);$('catalog-prev').textContent=`← Previous ${size}`;$('catalog-next').textContent=`Next ${size} →`;
}
on('catalog-go',loadPage);on('catalog-kind',()=>{$('catalog-start').value='0';loadPage();},'change');on('catalog-scope',()=>{$('catalog-start').value='0';loadPage();},'change');
on('page-size',loadPage,'change');
on('catalog-prev',()=>{const n=BigInt($('page-size').value);$('catalog-start').value=String(BigInt(page.start)>n?BigInt(page.start)-n:0n);loadPage();});on('catalog-next',()=>{$('catalog-start').value=String(BigInt(page.start)+BigInt($('page-size').value));loadPage();});
on('search-word',()=>{const item=lookupWord($('catalog-search').value);page={kind:'words',rows:[{source_row:(BigInt(item.word_rank)+1n).toString(),item}]};renderCatalog(page.rows,'words');$('catalog-summary').textContent='Exact lookup · full 32-label vocabulary';$('catalog-range').textContent='1 matching word';$('catalog-prev').disabled=true;$('catalog-next').disabled=true;});
on('export-page',()=>download('4d-nod-displayed-page.csv',exportExplorerCsv(page),'text/csv;charset=utf-8'));
on('csv-file',async()=>{const text=await fileText('csv-file');if(text===null)return;const imported=readExplorerCsv(text);if(!imported.length)throw Error('CSV contains no candidate rows.');page={kind:imported[0].item.pieces?'triples':'words',rows:imported};renderCatalog(imported,page.kind);$('catalog-summary').textContent=`Imported ${imported.length} displayed rows. Source row numbers retained; identities recalculated from words.`;$('catalog-range').textContent='Imported page';$('catalog-prev').disabled=true;$('catalog-next').disabled=true;notice('CSV imported. Select a row to populate the builder.');},'change');
function validatePreview(value){
  if(value===null)return;
  if(new TextEncoder().encode(JSON.stringify(value)).length>524288)throw Error('Geometry exceeds the 512 KiB application limit.');
  if(!value||!Array.isArray(value.pieces)||value.pieces.length!==3)throw Error('Geometry must contain three pieces labeled A, B and C.');
  let count=0;const vertices=new Set();
  value.pieces.forEach((p,i)=>{if(p.name!==labels[i]||!Array.isArray(p.maximal_simplices))throw Error('Geometry pieces must be ordered A, B, C with maximal_simplices arrays.');for(const s of p.maximal_simplices){if(++count>150)throw Error('Geometry is limited to 150 maximal simplices per request.');if(!Array.isArray(s)||s.length<1||s.length>5)throw Error('Each simplex must have 1–5 vertices.');for(const v of s){if(!(typeof v==='string'&&v.length>0&&v.length<=80)&&!Number.isSafeInteger(v))throw Error('Vertex labels must be safe integers or strings of 1–80 characters.');vertices.add(JSON.stringify(v));}}});
  if(vertices.size>250)throw Error('Geometry is limited to 250 vertices.');
  if(value.embedding?.frames?.length>120)throw Error('Animation is limited to 120 explicit frames.');
}
function setGeometry(value){validatePreview(value);geometry=value;invalidate();$('geometry-json').value=value?JSON.stringify(value,null,2):'';$('geometry-status').textContent=value?'Explicit complex supplied':'Geometry not yet defined';$('control-description').textContent=value?.role||'';}
function applyGeometryText(){const text=$('geometry-json').value.trim();if(text.length>524288)throw Error('Geometry exceeds the application input limit.');setGeometry(text?JSON.parse(text):null);notice('Model data applied. Run assessment to validate the schema and geometry.');}
on('geometry-json',()=>{revision++;result=null;renderResults();$('export-result').disabled=true;$('geometry-status').textContent='Unapplied model edits';visual.update({geometry:null,result:null,candidate:candidate()});},'input');
on('apply-geometry',applyGeometryText);on('clear-geometry',()=>{setGeometry(null);$('control-description').textContent='';$('control-select').value='';});
on('geometry-file',async()=>{const text=await fileText('geometry-file',524288);if(text!==null)setGeometry(JSON.parse(text));},'change');
on('export-geometry',()=>{if(!geometry)throw Error('Supply geometry first.');download('4d-nod-geometry.json',geometry);});
on('load-control',()=>{const control=controls.find(c=>c.id===$('control-select').value);if(!control)throw Error('Choose a control first.');setGeometry(clone(control.geometry));$('control-description').textContent=control.description;notice('Control loaded independently of symbolic words. It is not a candidate-to-geometry mapping.');});
function evidenceText(value){return typeof value==='string'?value:JSON.stringify(value);}
function renderResults(){
  const target=$('results');target.replaceChildren();
  if(!result){const empty=el('div',undefined,'empty-state');empty.append(el('strong','Not tested'),el('p','No current assessment. Symbolic words alone do not define a geometry.'));target.append(empty);return;}
  target.append(el('p',`${result.test_version} · ${result.assessed_at||result.timestamp||''}`,'muted'));
  const identity=el('p',undefined,'identity');identity.append(el('strong','Assessed input: '),el('code',result.candidate?.candidate_id||'Independent control'));target.append(identity);
  if(result.candidate_mapping)target.append(el('p',evidenceText(result.candidate_mapping),'muted'));
  if(result.assembled){const a=result.assembled,stats=el('div',undefined,'metric-strip');[['Dimension',a.dimension],['Components',a.component_count],['Euler characteristic',a.euler_characteristic],['Betti numbers / F₂',JSON.stringify(a.betti_numbers_mod2)]].forEach(([name,value])=>{const d=el('div');d.append(el('strong',String(value)),el('span',name));stats.append(d);});target.append(stats);}
  (result.checks||[]).forEach(check=>{const row=el('div',undefined,'check');row.append(el('span',check.status==='passed'?'Passed this check':check.status==='failed'?'Failed this check':'Not tested / undetermined',`status-${check.status}`));const body=el('div');body.append(el('strong',check.label),el('p',evidenceText(check.evidence)));row.append(body);target.append(row);});
  if(result.missing_definitions?.length)target.append(el('p','Missing definitions: '+result.missing_definitions.join('; '),'muted'));
  const raw=el('details');raw.append(el('summary','Full evidence, witnesses, input, assumptions & versions'),el('pre',JSON.stringify(result,null,2)));target.append(raw);$('export-result').disabled=false;
}
async function assessPayload(payload,signal){const response=await fetch('/api/research/assess',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal});const data=await response.json();if(!response.ok)throw Error(data.error||`Assessment failed (${response.status}).`);return data;}
on('assess',async()=>{
  if(queueRunning)throw Error('Pause the notebook queue before running a separate assessment.');
  const text=$('geometry-json').value.trim();if(text!== (geometry?JSON.stringify(geometry,null,2):''))applyGeometryText();
  const snapshot={candidate:candidate(),geometry:clone(geometry)},atRevision=revision;activeRequest=new AbortController();$('assess').disabled=true;$('cancel-assessment').disabled=false;notice('Assessing one bounded input in Python…');
  try{const report=await assessPayload(snapshot,activeRequest.signal);if(revision!==atRevision){notice('Inputs changed during assessment. The previous-input report was discarded; run again for the current input.');return;}result=report;renderResults();visual.update({geometry,result,candidate:candidate()});notice('Assessment complete. Each check is reported separately; physical identity remains undetermined.');}catch(e){if(e.name==='AbortError')notice('Request interrupted. A bounded server calculation may finish; no result was attached.');else throw e;}finally{activeRequest=null;$('assess').disabled=false;$('cancel-assessment').disabled=true;}
});
on('cancel-assessment',()=>activeRequest?.abort());on('export-result',()=>download('4d-nod-assessment.json',result));
function renderNotebook(){
  $('notebook').replaceChildren();records.forEach((record,i)=>{const row=el('div',undefined,'notebook-row');row.append(el('span',String(i+1)),el('code',record.candidate.candidate_id),el('span',record.result?'assessed':record.error?`Error: ${record.error}`:'pending'));
    row.append(button('Load',()=>{words=record.candidate.pieces.map(p=>[...p.operations]);setGeometry(clone(record.geometry));renderPieces();result=clone(record.result||null);renderResults();visual.update({geometry,result,candidate:candidate()});notice(record.archived_result?'Notebook input loaded. Imported reports are archived; rerun to establish current evidence.':'Notebook record loaded. Evidence is bound to the saved input.');}),button('Remove',()=>{if(queueRunning)throw Error('Pause the queue before removing records.');records.splice(i,1);persist();renderNotebook();}));if(record.archived_result)row.append(button('Export archived report',()=>download('4d-nod-archived-report.json',record.archived_result)));$('notebook').append(row);});
  $('queue-status').textContent=`${records.length} / 100 saved records · ${records.filter(r=>r.result).length} completed. Queue resumes from unassessed records.`;
  renderBatch();
}
on('save-candidate',()=>{if(queueRunning)throw Error('Pause the queue before adding records.');if(records.length>=100)throw Error('Notebook limit: 100 records. Export and remove records to make room.');if($('geometry-json').value.trim()!==(geometry?JSON.stringify(geometry,null,2):''))applyGeometryText();const next=[...records,{id:crypto.randomUUID(),candidate:candidate(),geometry:clone(geometry),result:clone(result),created_at:new Date().toISOString()}];assertNotebookBudget(next);records=next;const saved=persist();renderNotebook();if(saved)notice('Saved in this browser. Export a JSON backup for durable retention.');});
on('export-session',()=>download('4d-nod-notebook.json',{schema_version:'1',exported_at:new Date().toISOString(),records},'application/json',true));
on('export-selected',()=>download('4d-nod-selected-candidate.csv',exportExplorerCsv([{source_row:'1',item:candidate()}],'triples'),'text/csv;charset=utf-8'));
on('session-file',async()=>{if(queueRunning)throw Error('Pause the queue before importing.');const text=await fileText('session-file',10000000);if(text===null)return;if(queueRunning)throw Error('Pause the queue before importing; a run started while the file was being read.');const incoming=validateNotebook(JSON.parse(text));const next=[...records,...incoming];assertNotebookBudget(next);records=next;activeBatchId=incoming.findLast(r=>r.batch)?.batch.id??activeBatchId;const saved=persist();renderNotebook();if(saved)notice(`Imported ${incoming.length} notebook records. Reports are archived for export; rerun to establish current evidence.`);},'change');

function batchRecords(){return records.filter(r=>r.batch?.id===activeBatchId);}
function renderBatch(){
  const groups=new Map();records.forEach(r=>{if(r.batch)groups.set(r.batch.id,r.batch);});
  if(!groups.has(activeBatchId))activeBatchId=[...groups.keys()].at(-1)??null;
  $('batch-select').replaceChildren();
  if(!groups.size){const o=el('option','No prepared batch');o.value='';$('batch-select').append(o);}
  for(const [id,b] of groups){const when=new Date(b.created_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});const o=el('option',`Ranks ${b.start}–${BigInt(b.start)+BigInt(b.count)-1n} · ${b.indexing} · ${when}`);o.value=id;$('batch-select').append(o);}
  $('batch-select').value=activeBatchId??'';
  const items=batchRecords(),summary=summarizeBatch(items);$('batch-results').replaceChildren();
  items.forEach(record=>{const row=el('tr');row.append(el('td',record.batch.row_rank));const identity=el('td');identity.append(el('code',record.candidate.candidate_id));record.candidate.pieces.forEach((p,i)=>identity.append(el('div',`${labels[i]} · ${formatWord(p.operations)}`,'batch-words')));row.append(identity);const m=record.geometry?.model;row.append(el('td',m?`${m.id} · ${m.version}`:'None · symbolic only'));const failures=record.result?.checks?.filter(c=>c.status==='failed')??[];const status=el('td');if(record.error)status.append(el('span',`Error: ${record.error}`,'batch-assessment-failed'));else if(!record.result)status.textContent='Pending';else if(!record.geometry)status.append(el('span','Not tested · symbolic','batch-assessment-symbolic'));else{status.append(el('span',`Checks completed · ${failures.length} failed`,failures.length?'batch-assessment-failed':''));failures.forEach(c=>status.append(el('p',c.label,'fine')));}row.append(status);const action=el('td');action.append(button('Load',()=>{words=record.candidate.pieces.map(p=>[...p.operations]);setGeometry(clone(record.geometry));renderPieces();result=clone(record.result);renderResults();visual.update({geometry,result,candidate:candidate()});notice(record.result?'Loaded the saved assessment and its exact input.':'Loaded pending input. No current evidence is attached.');}));row.append(action);$('batch-results').append(row);});
  $('batch-summary').textContent=items.length?`${summary.completed} / ${summary.total} completed · ${summary.pending} pending · ${summary.errors} errors · ${summary.geometric} with supplied geometry · ${summary.symbolic} symbolic. ${100-records.length} notebook slots available.`:`No prepared batch. ${100-records.length} / 100 notebook slots available.`;
  $('batch-progress').max=Math.max(1,summary.total);$('batch-progress').value=summary.completed;
  $('batch-resume').disabled=queueRunning||!!activeRequest||!summary.pending;
  $('batch-export-json').disabled=!items.length;$('batch-export-csv').disabled=!items.length;
  $('batch-select').disabled=queueRunning;$('batch-settings').disabled=queueRunning;
}
function exportBatch(){const items=batchRecords();if(!items.length)throw Error('Prepare or select a batch first.');download(`4d-nod-batch-${items[0].batch.start}.json`,{schema_version:'1',exported_at:new Date().toISOString(),records:items},'application/json',true);}
function generateBatch(){
  if(queueRunning||activeRequest)throw Error('Wait for or pause the current assessment before preparing a batch.');
  const generated=prepareBatch({start:$('batch-start').value.trim(),count:Number($('batch-count').value),maxOperations:$('batch-scope').value==='bounded'?Number($('batch-bound').value):null,geometryMode:$('batch-geometry').value},records);
  records.push(...generated.records);activeBatchId=generated.batch.id;const saved=persist();renderNotebook();$('batch-status').textContent=`Prepared ${generated.records.length} ordered triples. Next starting rank: ${generated.batch.next_rank}.`;if(saved)notice(`Prepared ${generated.records.length} candidates. Each geometry assignment is matched by its exact candidate ID.`);return saved;
}
function queueControls(running){queueRunning=running;$('run-queue').disabled=running;$('stop-queue').disabled=!running;$('assess').disabled=running;$('save-candidate').disabled=running;$('session-file').disabled=running;$('batch-pause').disabled=!running;renderBatch();workbookUI?.refreshControls();}
async function runRecords({batchId=null,autoExport=false}={}){
  if(queueRunning||activeRequest)throw Error('Another assessment is already running.');
  const targets=records.filter(r=>(batchId===null||r.batch?.id===batchId)&&!r.result);
  if(!targets.length){notice('No pending records in this selection.');return;}
  if(!persist())return;
  queueStopped=false;queueControls(true);let done=0,stopReason='';
  try{
    for(const record of targets){
      if(queueStopped)break;
      activeRequest=new AbortController();let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;activeRequest?.abort();},45000);
      const progress=`Processing record ${targets.indexOf(record)+1} of ${targets.length}; ${done} completed this run.`;$('queue-status').textContent=progress;$('batch-status').textContent=progress;
      try{
        const report=await assessPayload({candidate:record.candidate,geometry:record.geometry},activeRequest.signal);
        if(queueStopped)break;
        const completed={...record,result:report};delete completed.error;
        assertNotebookBudget(records.map(r=>r===record?completed:r));record.result=report;delete record.error;done++;
      }catch(error){
        if(error.name==='AbortError'&&!timedOut){queueStopped=true;stopReason='Interrupted; the pending input is ready to retry.';}
        else{stopReason=timedOut?'Request exceeded 45 seconds. Resume to retry this input.':error.message;queueStopped=true;const failed={...record,error:stopReason.slice(0,2000)};try{assertNotebookBudget(records.map(r=>r===record?failed:r));record.error=failed.error;}catch{/* Keep the checkpoint exportable when even an error message exceeds its budget. */}}
      }finally{clearTimeout(timeout);activeRequest=null;if(!persist()){queueStopped=true;stopReason='Browser checkpoint storage is unavailable. Export JSON before leaving.';}renderNotebook();}
    }
    const message=`Queue ${queueStopped?'paused':'complete'}: ${done} records completed this run.${stopReason?' '+stopReason:' Completed inputs were checkpointed; pending inputs can be resumed.'}`;
    $('batch-status').textContent=message;notice(message,!!stopReason);
    if(!queueStopped&&batchId&&autoExport){activeBatchId=batchId;exportBatch();$('batch-status').textContent+=' Checkpoint JSON download requested; if your browser blocks it, use Export batch checkpoint JSON.';}
  }finally{activeRequest=null;queueControls(false);renderNotebook();}
}
function pauseQueue(){queueStopped=true;activeRequest?.abort();}
on('run-queue',()=>runRecords());on('stop-queue',pauseQueue);
on('batch-generate',generateBatch);on('batch-run',async()=>{const autoExport=$('batch-auto-export').checked;if(generateBatch())await runRecords({batchId:activeBatchId,autoExport});});
on('batch-resume',()=>runRecords({batchId:activeBatchId,autoExport:$('batch-auto-export').checked}));on('batch-pause',pauseQueue);
on('batch-select',()=>{activeBatchId=$('batch-select').value;renderBatch();$('batch-status').textContent='Selected batch ready to inspect, export or resume.';},'change');
on('batch-scope',()=>{$('batch-bound').disabled=$('batch-scope').value==='unbounded';},'change');
on('batch-use-catalog',()=>{$('batch-scope').value=$('catalog-scope').value;$('batch-bound').value=$('catalog-bound').value;$('batch-start').value=$('catalog-start').value;$('batch-bound').disabled=$('batch-scope').value==='unbounded';notice('Copied numeric bounds. Batch ranks always index ordered triples, even when the catalog is showing individual words.');});
on('batch-import',()=>{$('session-file').click();});on('batch-export-json',exportBatch);on('batch-export-csv',()=>download('4d-nod-batch-results.csv',exportBatchCsv(batchRecords()),'text/csv;charset=utf-8'));
try{const stored=localStorage.getItem(KEY);if(stored)records=validateNotebook({schema_version:'1',records:JSON.parse(stored)},{restore:true});}catch{notice('Saved browser notebook could not be loaded. Import a JSON backup to recover it.',true);}
workbookUI=mountWorkbook({useItem,isQueueBusy:()=>queueRunning,notice,openNotebook:()=>{$('notebook-section').open=true;$('notebook-section').scrollIntoView({behavior:'smooth'});},
  showCatalog:source=>{page={kind:source.kind,rows:source.rows};renderCatalog(page.rows,page.kind);$('catalog-summary').textContent=`${source.filename} · ${source.sheet} · ${source.rows.length} displayed rows. Source rows are Excel row numbers.`;$('catalog-range').textContent='Uploaded workbook page';$('catalog-prev').disabled=true;$('catalog-next').disabled=true;notice('Spreadsheet page loaded into the catalog. Choose a piece or triple to populate the builder.');$('catalog').scrollIntoView({behavior:'smooth'});},
  saveTriples:source=>{if(queueRunning)throw Error('Pause the queue before adding spreadsheet triples.');if(source.kind!=='triples')throw Error('Only explicit three-piece rows can be added to the notebook.');const incoming=validateNotebook({schema_version:'1',records:source.rows.map(row=>({candidate:row.item,geometry:null,result:null,created_at:new Date().toISOString(),source:{type:'xlsx',filename:source.filename,sha256:source.sha256,sheet:source.sheet,excel_row:row.excel_row,source_id:row.source_id}}))});const next=[...records,...incoming];assertNotebookBudget(next);records=next;const saved=persist();renderNotebook();if(saved)notice(`Added ${incoming.length} spreadsheet triples to the notebook. Geometry is not defined. Open saved notebook and use Assess pending records, or export these inputs.`);}
});
renderPieces();loadPage();renderNotebook();
fetch('/api/research/controls').then(r=>{if(!r.ok)throw Error('Control endpoint unavailable.');return r.json();}).then(data=>{controls=data.controls;controls.forEach(c=>{const option=el('option',c.title);option.value=c.id;$('control-select').append(option);});}).catch(e=>notice(e.message,true));
