/* Start empty. No published-edition catalogue or owner draft is loaded. */
(async function(){
'use strict';
window.EDITIONS=[];
try{
 const scripts=JSON.parse(document.getElementById('editor-scripts').textContent);
 for(const src of scripts)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.body.append(script);});
 await startLocalEditor();
}catch{document.getElementById('editor-load-error').hidden=false;}
})();
