/* This reader only opens the copy posted by its parent editor. */
(function(){
'use strict';
if(new URLSearchParams(location.search).get('preview')!=='embedded'||window.parent===window){document.querySelector('main').hidden=true;document.getElementById('hint').textContent='Abra a pré-visualização a partir do editor de colaboração.';return;}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='pi-preview-edition')return;
 try{const copy=RevistaJSON.draft(event.data.edition);draftPreview=true;editions=[copy];void window.RevistaFilmCatalog.load().then(()=>loadEdition(copy.id));}catch{/* Ignore unrelated or malformed messages. */}
});
window.parent.postMessage({type:'pi-preview-ready'},location.origin);
})();
