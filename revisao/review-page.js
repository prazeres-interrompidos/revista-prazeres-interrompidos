/* Load only the edition selected by the review link; no editor or credentials. */
(function(){
'use strict';
const reviews=RevistaReviews,reader=document.getElementById('reviewReader'),notice=document.getElementById('reviewNotice'),updated=document.getElementById('reviewUpdated'),button=document.getElementById('refreshReview');
const key=new URLSearchParams(location.search).get('chave');let busy=false,started=false,lastUpdate='';
function script(path){return new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=path;node.onload=resolve;node.onerror=()=>reject(Error('Não foi possível carregar o leitor.'));document.body.append(node);});}
async function check(){
 if(busy)return;busy=true;button.disabled=true;
 try{
  if(!reviews.validKey(key))throw Error('A ligação de revisão está incompleta ou não é válida.');
  const address=new URL(reviews.file(key),document.baseURI);address.searchParams.set('t',Date.now());
  const response=await fetch(address,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(25000)});
  if(response.status===404){reader.hidden=true;notice.textContent='Esta ligação de revisão já não está disponível.';return;}
  if(!response.ok)throw Error('Não foi possível consultar a versão mais recente. Tente atualizar novamente.');
  const record=reviews.parseRecord(await response.json());
  if(record.status==='published'){const destination=new URL(reviews.base);destination.hash=new URLSearchParams({edicao:record.editionId,pagina:'1'}).toString();location.replace(destination.href);return;}
  if(record.updatedAt===lastUpdate){notice.textContent='Está a consultar a versão de revisão mais recente.';return;}
  window.EDITIONS=[record.edition];window.REVISTA_REVIEW=true;reader.hidden=false;
  if(!started){await script('revisao/app.js?v=cores-subtitulos-indice-20261113');started=true;}
  await window.RevistaFilmCatalog.load();
  editions=[record.edition];draftPreview=true;loadEdition(record.editionId);
  lastUpdate=record.updatedAt;updated.textContent='Última atualização: '+new Date(record.updatedAt).toLocaleString('pt-PT');
  notice.textContent='Esta edição está em preparação. A ligação acompanha as versões guardadas para revisão.';
 }catch(error){notice.textContent=error.message||'Não foi possível abrir esta revisão.';}
 finally{busy=false;button.disabled=false;}
}
button.onclick=check;setInterval(()=>{if(document.visibilityState==='visible')void check();},120000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void check();});
void check();
})();
