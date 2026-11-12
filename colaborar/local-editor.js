/* Local files and a separate browser draft; this page has no publisher. */
'use strict';
let collaborationDB,collaborationDraftTimer,collaborationLoading=true,collaborationPending=false,collaborationExported='';
const collaborationStorageKey='pi-collaboration-local-v1';
function collaborationDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open('pi-revista-colaboracao-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Feche outras janelas deste editor para recuperar o rascunho.'));});}
function collaborationTransaction(mode,action){return new Promise((resolve,reject)=>{const tx=collaborationDB.transaction('drafts',mode);let result;const request=action(tx.objectStore('drafts'));request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
function queueDraftSave(){if(collaborationLoading)return;collaborationPending=true;$('#draftState').textContent='A guardar a cópia neste navegador…';clearTimeout(collaborationDraftTimer);collaborationDraftTimer=setTimeout(saveDraft,600);}
async function saveDraft(){
 if(collaborationLoading)return false;clearTimeout(collaborationDraftTimer);capture();
 const signature=JSON.stringify(all),record={editions:all.map(RevistaJSON.draft),current,exported:collaborationExported};
 try{
  if(collaborationDB)await collaborationTransaction('readwrite',store=>store.put(record,'local'));
  else localStorage.setItem(collaborationStorageKey,JSON.stringify(record));
  if(signature===JSON.stringify(all)){collaborationPending=false;$('#draftState').textContent='Cópia guardada automaticamente neste navegador. No fim, use «Guardar JSON para devolver».';}return true;
 }catch{collaborationPending=true;$('#draftState').textContent='Não foi possível guardar neste navegador. Use «Guardar JSON para devolver» antes de sair.';return false;}
}
const collaborationRender=render;render=function(){collaborationRender();queueDraftSave();};
document.querySelector('main.editor').addEventListener('input',event=>{if(event.target.matches('input:not([type=file]),textarea,select')||event.target.isContentEditable){capture();queueDraftSave();}});
function collaborationExport(){capture();try{download('edicao-'+String(all[current].id).replace(/[^a-z0-9_-]/gi,'-')+'-colaboracao.json',RevistaJSON.exportEdition(all[current]),'application/json');collaborationExported=JSON.stringify(all);void saveDraft();status('JSON desta edição preparado. Envie este ficheiro à pessoa responsável pela revista.');}catch(error){status(error.message);}}
$('#backup').onclick=collaborationExport;
function collaborationChoose(editions){
 editions=editions.filter(edition=>edition.released!==true);
 if(!editions.length)throw Error('Esta cópia contém apenas revistas já publicadas. Peça o JSON da edição em preparação.');
 const dialog=document.createElement('dialog');dialog.className='json-exchange-dialog';dialog.setAttribute('aria-labelledby','collaborationImportTitle');
 dialog.innerHTML='<h2 id="collaborationImportTitle">Abrir uma edição JSON</h2><p>Escolha a edição em que vai trabalhar. A cópia local atual será substituída. Guarde-a em JSON antes de continuar se quiser conservá-la.</p><label>Edição no ficheiro<select></select></label><p id="collaborationImportSummary"></p><div class="json-exchange-actions"><button type="button" id="collaborationKeepJSON">Guardar cópia atual</button><button type="button" class="primary" id="collaborationOpenJSON">Abrir esta edição</button><button type="button" id="collaborationCancelJSON">Cancelar</button></div>';
 const select=dialog.querySelector('select'),summary=dialog.querySelector('#collaborationImportSummary');
 editions.forEach((edition,index)=>{const option=document.createElement('option');option.value=index;option.textContent=edition.month+' · N.º '+(edition.number||'');select.append(option);});
 function describe(){const edition=editions[Number(select.value)];summary.textContent='Será aberta apenas esta edição: '+edition.articles.length+' episódios, '+(edition.extraArticles?.length||0)+' extras, '+(edition.bookTrailers?.length||0)+' Book Trailers, '+(edition.bookGifs?.length||0)+' Book GIFs e '+(edition.news?.length||0)+' novidades.';}
 select.onchange=describe;describe();dialog.querySelector('#collaborationKeepJSON').onclick=collaborationExport;
 dialog.querySelector('#collaborationCancelJSON').onclick=()=>dialog.close();
 dialog.querySelector('#collaborationOpenJSON').onclick=()=>{all=[RevistaJSON.draft(editions[Number(select.value)])];current=0;render();capture();collaborationExported=JSON.stringify(all);void saveDraft();status('Edição aberta para colaboração. As alterações ficam neste navegador; no fim, guarde o JSON para devolver.');dialog.close();window.RevistaEditorMenu?.showSection('podcastSection');};
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
$('#import').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{collaborationChoose(RevistaJSON.read(await file.text()));}catch(error){status(error.message||'Não foi possível abrir este JSON.');}finally{event.target.value='';}};
window.onbeforeunload=event=>{capture();if(collaborationPending||JSON.stringify(all)!==collaborationExported){event.preventDefault();event.returnValue='Guarde o JSON antes de sair.';}};
async function startLocalEditor(){
 try{collaborationDB=await collaborationDatabase();}catch{/* Small drafts can fall back to this page's localStorage key. */}
 try{
  const saved=collaborationDB?await collaborationTransaction('readonly',store=>store.get('local')):JSON.parse(localStorage.getItem(collaborationStorageKey)||'null');
  if(saved?.editions){const copies=RevistaJSON.read(saved.editions);all=[RevistaJSON.draft(copies[Math.min(saved.current||0,copies.length-1)])];current=0;render();capture();collaborationExported=saved.exported||JSON.stringify(all);$('#draftState').textContent='Cópia local recuperada neste navegador. No fim, guarde o JSON para devolver.';}
  else{capture();collaborationExported=JSON.stringify(all);$('#draftState').textContent='Importe o JSON da edição para começar. A gravação automática será apenas neste navegador.';}
 }catch{$('#draftState').textContent='Não foi possível recuperar a cópia local. Importe o seu JSON para continuar.';}
 finally{collaborationLoading=false;document.querySelector('main.editor').inert=false;$('#newEdition').hidden=true;$('#selectEdition').disabled=true;}
}
