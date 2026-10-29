import {ALPHABET,parseWord,formatWord,wordId,tripleFromWords,catalogPage,lookupWord,readExplorerCsv,exportExplorerCsv} from './catalog.mjs';
import {mountVisualization} from './visualization.mjs';
import {validateNotebook,assertNotebookBudget} from './notebook.mjs';

const $=id=>document.getElementById(id);
const labels=['A','B','C'], colors=['#62d6d0','#d6a3fa','#f0bd72'];
const KEY='4d-nod-research-notebook-v1';
let words=[[],[],[]], geometry=null, result=null, controls=[], page, records=[], activeRequest=null, revision=0, queueStopped=false, queueRunning=false;
let visual=mountVisualization($('visualization'),{geometry,result,candidate:tripleFromWords(words)});
const clone=value=>JSON.parse(JSON.stringify(value));
function notice(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
function guard(fn){return async(...args)=>{try{await fn(...args);}catch(e){notice(e.message,true);}};}
function on(id,fn,event='click'){$(id).addEventListener(event,guard(fn));}
function el(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function button(text,fn,label){const b=el('button',text);b.type='button';if(label)b.setAttribute('aria-label',label);b.addEventListener('click',guard(fn));return b;}
function candidate(){return tripleFromWords(words);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(records));}catch{notice('Browser storage is unavailable or full. Export the notebook JSON to retain your work.',true);}}
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
}
on('save-candidate',()=>{if(records.length>=100)throw Error('Notebook limit: 100 records. Export and remove records to make room.');if($('geometry-json').value.trim()!==(geometry?JSON.stringify(geometry,null,2):''))applyGeometryText();const next=[...records,{id:crypto.randomUUID(),candidate:candidate(),geometry:clone(geometry),result:clone(result),created_at:new Date().toISOString()}];assertNotebookBudget(next);records=next;persist();renderNotebook();notice('Saved in this browser. Export a JSON backup for durable retention.');});
on('export-session',()=>download('4d-nod-notebook.json',{schema_version:'1',exported_at:new Date().toISOString(),records},'application/json',true));
on('export-selected',()=>download('4d-nod-selected-candidate.csv',exportExplorerCsv([{source_row:'1',item:candidate()}],'triples'),'text/csv;charset=utf-8'));
on('session-file',async()=>{if(queueRunning)throw Error('Pause the queue before importing.');const text=await fileText('session-file',10000000);if(text===null)return;const incoming=validateNotebook(JSON.parse(text));const next=[...records,...incoming];assertNotebookBudget(next);records=next;persist();renderNotebook();notice(`Imported ${incoming.length} notebook records. Reports are archived for export; rerun to establish current evidence.`);},'change');
on('run-queue',async()=>{if(activeRequest)throw Error('Wait for the current assessment.');queueRunning=true;queueStopped=false;$('run-queue').disabled=true;$('stop-queue').disabled=false;$('assess').disabled=true;let done=0;
  try{for(const record of records){if(queueStopped)break;if(record.result)continue;activeRequest=new AbortController();$('queue-status').textContent=`Processing record ${records.indexOf(record)+1} of ${records.length}; ${done} completed this run.`;try{const report=await assessPayload({candidate:record.candidate,geometry:record.geometry},activeRequest.signal);assertNotebookBudget(records.map(r=>r===record?{...r,result:report}:r));record.result=report;delete record.error;done++;}catch(e){if(e.name==='AbortError')break;record.error=e.message;notice(`Queue paused: ${e.message}`,true);queueStopped=true;}finally{activeRequest=null;persist();renderNotebook();}}notice(`Queue ${queueStopped?'paused':'complete'}: ${done} records completed this run. Remaining records can be resumed.`);}finally{queueRunning=false;$('run-queue').disabled=false;$('stop-queue').disabled=true;$('assess').disabled=false;}
});on('stop-queue',()=>{queueStopped=true;activeRequest?.abort();});
try{const stored=localStorage.getItem(KEY);if(stored)records=validateNotebook({schema_version:'1',records:JSON.parse(stored)},{restore:true});}catch{notice('Saved browser notebook could not be loaded. Import a JSON backup to recover it.',true);}
renderPieces();loadPage();renderNotebook();
fetch('/api/research/controls').then(r=>{if(!r.ok)throw Error('Control endpoint unavailable.');return r.json();}).then(data=>{controls=data.controls;controls.forEach(c=>{const option=el('option',c.title);option.value=c.id;$('control-select').append(option);});}).catch(e=>notice(e.message,true));
