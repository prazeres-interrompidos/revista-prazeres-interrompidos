/* Catálogo comum: só metadados. Os vídeos continuam alojados na página Filmes. */
(function(root){
'use strict';
const origin='https://book-trailers-prazeres-interrompidos.oct-nuno.chatgpt.site';
const endpoint=origin+'/api/catalogo';
let entries=null,pending=null,lastError='',updatedAt='';
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function mediaURL(value,extension){
 try{
  const url=new URL(value);
  // Filmes uses a content hash so browsers fetch the new file after a replacement.
  const validVersion=!url.search||/^\?v=[a-f0-9]{16}$/.test(url.search);
  // Existing files use /media; new OneDrive imports use the hashed /api/media route.
  const validPath=new RegExp('^/media/[^/]+\\.'+extension+'$','i').test(url.pathname)||new RegExp('^/api/media/[a-f0-9]{64}\\.'+extension+'$','i').test(url.pathname);
  return url.origin===origin&&!url.username&&!url.password&&!url.hash&&validVersion&&validPath?url.href:'';
 }catch{return ''}
}
function validateCatalog(data){
 if(data?.version!==1||!Array.isArray(data.items)||data.items.length>10000)throw Error('O catálogo de filmes não é válido.');
 const ids=new Set();
 return data.items.map(item=>{
  if(!item||!['film','gif'].includes(item.kind)||typeof item.id!=='string'||!/^[a-z0-9-]+$/.test(item.id)||ids.has(item.id)||!normalize(item.title)||!normalize(item.author))throw Error('O catálogo de filmes não é válido.');
  ids.add(item.id);
  const url=mediaURL(item.url,item.kind==='film'?'mp4':'gif'),poster=mediaURL(item.poster,'(?:jpg|jpeg|png|webp)');
  const pageUrl=origin+'/livro/'+encodeURIComponent(item.id);
  if(!url||!poster||item.pageUrl!==pageUrl)throw Error('O catálogo contém uma ligação de vídeo inválida.');
  const title=String(item.title),subtitle=String(item.subtitle||'');
  return {id:item.id,title,subtitle,fullTitle:subtitle?title+' — '+subtitle:title,author:String(item.author),kind:item.kind,sourceFile:String(item.sourceFile||''),url,poster,pageUrl};
 });
}
async function load(force=false){
 if(pending)return pending;
 if(entries&&!force)return entries;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 pending=(async()=>{
  try{
   const response=await fetch(endpoint,{credentials:'omit',cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Não foi possível consultar os filmes.');
   const data=await response.json(),next=validateCatalog(data);
   entries=next;updatedAt=String(data.updatedAt||'');lastError='';return entries;
  }catch{lastError='Não foi possível consultar a coleção. Tente atualizar o catálogo.';return entries||[]}
  finally{clearTimeout(timer);pending=null;if(typeof root.dispatchEvent==='function')root.dispatchEvent(new Event('pi-media-catalog'))}
 })();
 return pending;
}
function match(trailer,kind='film'){
 const title=normalize(trailer?.title),author=normalize(trailer?.author);
 if(!title||!author)return {status:'incomplete',candidates:[]};
 if(entries===null)return {status:pending?'loading':'unavailable',candidates:[]};
 const authors=entries.filter(item=>item.kind===kind&&normalize(item.author)===author);
 let candidates=authors.filter(item=>normalize(item.fullTitle)===title);
 if(!candidates.length)candidates=authors.filter(item=>normalize(item.title)===title);
 const selected=candidates.find(item=>item.id===trailer[kind==='gif'?'gifId':'filmId']);
 if(selected)return {status:'matched',item:selected,candidates};
 if(candidates.length===1)return {status:'matched',item:candidates[0],candidates};
 return {status:candidates.length?'ambiguous':'missing',candidates};
}
function state(){return {loaded:entries!==null,loading:!!pending,error:lastError,updatedAt,count:entries?.length||0}}
root.RevistaFilmCatalog={endpoint,load,match,state,normalize,validateCatalog};
})(window);
