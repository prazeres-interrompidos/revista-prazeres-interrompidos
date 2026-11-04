/* Refresh catalogue metadata without downloading the other editions. */
'use strict';
let lastReaderCheck=0;
let readerCheckBusy=false;
async function checkPublishedEdition(){
  if(draftPreview||!edition||editionLoadBusy||document.visibilityState!=='visible'||readerCheckBusy||
      Date.now()-lastReaderCheck<120000||panel.open||$('#reading').open)return;
  lastReaderCheck=Date.now();
  readerCheckBusy=true;
  try{
    const entries=await RevistaEditions.catalog();
    if(editionLoadBusy||panel.open||$('#reading').open)return;
    const next=entries.find(entry=>entry.id===edition.id);
    if(next?.revision===loadedRevision){
      editions=entries.map(entry=>entry.id===edition.id?edition:entry);
      return;
    }
    if(await openPublishedEdition(edition.id,entries)){
      $('#hint').textContent='O conteúdo desta revista foi atualizado automaticamente.';
    }
  }catch{/* Keep the currently open edition available during a connection failure. */}
  finally{readerCheckBusy=false}
}
setInterval(checkPublishedEdition,120000);
document.addEventListener('visibilitychange',checkPublishedEdition);
