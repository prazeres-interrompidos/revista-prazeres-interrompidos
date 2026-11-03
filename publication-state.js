/* A capa e a leitura completa têm lançamentos independentes. */
(function(root){
'use strict';
const isReadable=e=>e?.released===true;
const isVisible=e=>isReadable(e)||e?.coverReleased===true;
function apply(edition,action,now=new Date().toISOString()){
 if(['launch-cover','launch-edition'].includes(action)&&!String(edition.cover||'').trim())throw Error('Adicione a capa da revista antes do lançamento.');
 if(action==='launch-cover'){edition.coverReleased=true;edition.coverReleasedAt??=now}
 else if(action==='launch-edition'){edition.coverReleased=true;edition.coverReleasedAt??=now;edition.released=true;edition.releasedAt=now}
 else if(action==='withdraw-edition'){if(isReadable(edition))edition.coverReleased=true;edition.released=false;delete edition.releasedAt}
 else if(action==='withdraw-cover'){if(isReadable(edition))throw Error('Retire primeiro o lançamento da revista.');edition.coverReleased=false;delete edition.coverReleasedAt}
 else throw Error('Ação de lançamento inválida.');
 return edition;
}
root.RevistaPublication={isReadable,isVisible,apply};
})(typeof window==='undefined'?globalThis:window);
