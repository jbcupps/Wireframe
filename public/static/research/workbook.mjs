/** Bounded XLSX worksheet browsing. Source cells are rendered only as text. */
export function mountWorkbook({useItem,showCatalog,saveTriples,openNotebook,isQueueBusy,notice}) {
  const $=id=>document.getElementById(id), labels=['A','B','C'];
  let file=null,data=null,controller=null,serial=0,loading=false;
  const cell=(tag,value)=>{const node=document.createElement(tag);node.textContent=value??'';return node;};
  const guarded=fn=>async()=>{try{await fn();}catch(error){$('workbook-status').textContent=error.message;notice(error.message,true);}};
  function controls(){
    for(const id of ['workbook-sheet','workbook-start','workbook-go'])$(id).disabled=loading;
    $('workbook-prev').disabled=loading||!data||data.start===0;
    $('workbook-next').disabled=loading||!data||data.start+data.rows.length>=data.total_rows;
    $('workbook-catalog').disabled=loading||!data||data.kind==='reference'||!data.rows.length;
    $('workbook-save').disabled=loading||isQueueBusy()||data?.kind!=='triples'||!data?.rows.length;
  }
  function snapshot(){return {filename:file.name,sha256:data.sha256,sheet:data.sheet,kind:data.kind,rows:structuredClone(data.rows)};}
  function render(){
    $('workbook-controls').hidden=false;
    $('workbook-sheet').replaceChildren(...data.sheets.map(sheet=>{const option=cell('option',`${sheet.name} · ${Number(sheet.total_rows).toLocaleString()} rows`);option.value=sheet.name;return option;}));
    $('workbook-sheet').value=data.sheet;$('workbook-start').value=String(data.start+1);
    $('workbook-start').max=String(Math.max(1,data.total_rows));
    $('workbook-summary').textContent=`${file.name} · ${data.sheet} · ${data.total_rows.toLocaleString()} ${data.kind==='reference'?'reference':'candidate'} rows · showing ${data.rows.length?data.start+1:0}–${data.start+data.rows.length}. Excel row numbers are shown at left.`;
    const header=document.createElement('tr');header.append(cell('th','Excel row'),...data.columns.map(name=>cell('th',name)));if(data.kind!=='reference')header.append(cell('th','Use'));
    $('workbook-head').replaceChildren(header);$('workbook-body').replaceChildren();
    for(const row of data.rows){const tr=document.createElement('tr');tr.append(cell('td',row.excel_row),...row.cells.map(value=>cell('td',value)));
      if(row.item){const actions=document.createElement('td');const add=(title,index)=>{const button=cell('button',title);button.type='button';button.addEventListener('click',guarded(()=>useItem(row.item,index)));actions.append(button);};if(data.kind==='triples')add('Use triple');else labels.forEach((label,index)=>add(label,index));tr.append(actions);}
      $('workbook-body').append(tr);
    }
    controls();
  }
  async function load(nextFile=file,sheet=data?.sheet,start=0){
    if(!nextFile)throw Error('Choose an Excel workbook first.');
    if(!/\.xlsx$/i.test(nextFile.name))throw Error('Choose an .xlsx workbook. Older .xls files and macro-enabled workbooks are not supported.');
    if(nextFile.size>3000000)throw Error('Workbook exceeds the 3 MB upload limit.');
    if(!Number.isSafeInteger(start)||start<0)throw Error('First data row must be a positive whole number.');
    controller?.abort();controller=new AbortController();const requestController=controller,signal=controller.signal,requestSerial=++serial;
    loading=true;controls();$('workbook-status').textContent='Reading workbook and validating candidate identities…';
    let timedOut=false;const timer=setTimeout(()=>{timedOut=true;requestController.abort();},45000);
    try{
      const query=new URLSearchParams({start:String(start),count:'20'});if(sheet)query.set('sheet',sheet);
      const response=await fetch(`/api/research/workbook?${query}`,{method:'POST',headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'},body:nextFile,signal});
      const body=await response.json().catch(()=>{throw Error(`Workbook service returned an unreadable response (${response.status}).`);});
      if(!response.ok)throw Error(body.error||`Workbook upload failed (${response.status}).`);
      if(requestSerial!==serial)return;
      file=nextFile;data=body;render();$('workbook-status').textContent=`Workbook loaded. ${data.kind==='reference'?'This worksheet is reference text.':'Candidate IDs were validated from the supplied sequences.'} No geometry or assessment results were imported.`;
    }catch(error){if(requestSerial!==serial)return;if(error.name==='AbortError')throw Error(timedOut?'Workbook reading exceeded 45 seconds. Try again or use a smaller workbook.':'Workbook reading was interrupted.');throw error;}
    finally{clearTimeout(timer);if(requestSerial===serial){loading=false;controller=null;controls();if(data)$('workbook-sheet').value=data.sheet;}}
  }
  $('workbook-file').addEventListener('change',guarded(async()=>{const next=$('workbook-file').files[0];$('workbook-file').value='';if(next)await load(next,null,0);}));
  $('workbook-sheet').addEventListener('change',guarded(()=>load(file,$('workbook-sheet').value,0)));
  $('workbook-go').addEventListener('click',guarded(()=>load(file,data?.sheet,Number($('workbook-start').value)-1)));
  $('workbook-prev').addEventListener('click',guarded(()=>load(file,data.sheet,Math.max(0,data.start-20))));
  $('workbook-next').addEventListener('click',guarded(()=>load(file,data.sheet,data.start+20)));
  $('workbook-catalog').addEventListener('click',guarded(()=>showCatalog(snapshot())));
  $('workbook-save').addEventListener('click',guarded(()=>{if(isQueueBusy())throw Error('Pause the queue before adding spreadsheet triples.');saveTriples(snapshot());}));
  $('workbook-notebook').addEventListener('click',guarded(openNotebook));
  controls();return {refreshControls:controls};
}
