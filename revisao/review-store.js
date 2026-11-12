/* One read-only review per edition; image blobs are reused by content hash. */
(function(root){
'use strict';
const base='https://prazeres-interrompidos.github.io/revista-prazeres-interrompidos/';
const validKey=value=>/^[a-f0-9]{32}$/.test(value||'');
const manifestPath='reviews/catalog.json';
const file=key=>{if(!validKey(key))throw Error('Ligação de revisão inválida.');return 'reviews/'+key+'.json';};
const url=key=>{file(key);return base+'revisao/?chave='+key;};
function key(){const bytes=new Uint8Array(16);root.crypto.getRandomValues(bytes);return [...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function hash(value){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const fingerprint=source=>{let h=2166136261;for(let i=0;i<source.length;i++)h=Math.imul(h^source.charCodeAt(i),16777619);return (h>>>0)+':'+source.length;};
function parseManifest(value){
 if(value===null)return [];
 const data=typeof value==='string'?JSON.parse(value):value;
 if(data?.version!==1||!Array.isArray(data.reviews))throw Error('A lista de revisões online não é válida.');
 const ids=new Set(),keys=new Set();
 for(const entry of data.reviews){
  if(typeof entry?.editionId!=='string'||!validKey(entry.key)||ids.has(entry.editionId)||keys.has(entry.key)||!Array.isArray(entry.assets)||entry.assets.some(path=>!/^reviews\/assets\/[a-f0-9]{64}\.(jpg|png|webp|gif)$/.test(path)))throw Error('A lista de revisões online não é válida.');
  ids.add(entry.editionId);keys.add(entry.key);
 }
 return data.reviews;
}
function parseRecord(value){
 const record=typeof value==='string'?JSON.parse(value):value;
 if(record?.version!==1||!['review','published'].includes(record.status)||typeof record.editionId!=='string')throw Error('Esta versão de revisão não é válida.');
 if(record.status==='review'&&(!record.edition||record.edition.id!==record.editionId||!Array.isArray(record.edition.articles)))throw Error('Esta versão de revisão não é válida.');
 return record;
}
function publicEdition(edition){const result=structuredClone(edition);delete result.reviewSharing;return result;}
function protectedAssets(editions){
 const paths=new Set();
 function visit(value){if(typeof value==='string'&&value.startsWith(base+'reviews/assets/'))paths.add(value.slice(base.length));else if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')Object.values(value).forEach(visit);}
 editions.forEach(visit);return paths;
}
async function prepare(edition){
 const assets=new Map(),jobs=new Map();
 async function visit(value){
  if(typeof value==='string'){
   const match=value.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/);if(!match)return value;
   if(jobs.has(value))return jobs.get(value);
   const job=(async()=>{const content=match[2].replace(/\s/g,''),bytes=Uint8Array.from(atob(content),c=>c.charCodeAt(0)),path='reviews/assets/'+await hash(bytes)+'.'+(match[1]==='jpeg'?'jpg':match[1]);assets.set(path,{path,content,encoding:'base64'});return base+path;})();jobs.set(value,job);return job;
  }
  if(Array.isArray(value)){const out=[];for(const item of value)out.push(await visit(item));return out;}
  if(value&&typeof value==='object'){
   const out={};for(const [name,item]of Object.entries(value))if(!['reviewSharing','previousArtworkBackground'].includes(name))out[name]=await visit(item);
   if(typeof value.bookCover==='string'&&out.bookCover!==value.bookCover&&out.automaticArtwork?.source===fingerprint(value.bookCover))out.automaticArtwork.source=fingerprint(out.bookCover);
   return out;
  }
  return value;
 }
 const snapshot=await visit(edition),assetPaths=new Set([...assets.keys(),...protectedAssets([snapshot])]);
 return {edition:snapshot,signature:await hash(JSON.stringify(snapshot)),assets:[...assets.values()],assetPaths:[...assetPaths].sort()};
}
async function stage(editions,remote,{onlyIds,protectedEditions=[]}={}){
 const entries=new Map(remote.map(entry=>[entry.editionId,structuredClone(entry)])),writes=[],deletions=new Set(),results=[],now=new Date().toISOString();
 for(const edition of editions){
  if(onlyIds&&!onlyIds.includes(edition.id))continue;
  const previous=entries.get(edition.id);if(!edition.reviewSharing&&!(edition.released===true&&previous))continue;
  const local=edition.reviewSharing||{key:previous.key};
  if(previous&&local.key!==previous.key)throw Error('Já existe outra ligação de revisão para esta edição. Recupere a cópia de rascunho que a criou.');
  if(previous&&local.revision&&previous.revision!==local.revision)throw Error('A revisão foi atualizada noutra janela. O rascunho foi preservado.');
  if(edition.released===true&&previous){
   if(previous.signature!=='published'){
    writes.push({path:file(previous.key),content:JSON.stringify({version:1,status:'published',editionId:edition.id,updatedAt:now})+'\n',editionId:edition.id});
    entries.set(edition.id,{...previous,signature:'published',updatedAt:now,assets:[]});
   }
   results.push({editionId:edition.id,...entries.get(edition.id),enabled:false});continue;
  }
  if(local.enabled!==true){
   if(previous){deletions.add(file(previous.key));entries.delete(edition.id);}
   results.push({editionId:edition.id,key:local.key,enabled:false,savedAt:'',revision:''});continue;
  }
  if(!validKey(local.key))throw Error('A ligação de revisão desta edição não é válida.');
  const prepared=await prepare(edition);
  if(previous?.signature!==prepared.signature){
   writes.push(...prepared.assets,{path:file(local.key),content:JSON.stringify({version:1,status:'review',editionId:edition.id,updatedAt:now,edition:prepared.edition})+'\n',editionId:edition.id});
   entries.set(edition.id,{editionId:edition.id,key:local.key,signature:prepared.signature,updatedAt:now,assets:prepared.assetPaths});
  }
  results.push({editionId:edition.id,...entries.get(edition.id),enabled:true});
 }
 const remaining=[...entries.values()],protectedPaths=protectedAssets(protectedEditions),referenced=new Set(remaining.flatMap(entry=>entry.assets));
 for(const entry of remote)for(const path of entry.assets)if(!referenced.has(path)&&!protectedPaths.has(path))deletions.add(path);
 return {entries:remaining,writes,deletions:[...deletions],results,changed:JSON.stringify(remaining)!==JSON.stringify(remote)};
}
root.RevistaReviews={base,manifestPath,validKey,file,url,key,parseManifest,parseRecord,publicEdition,prepare,stage,isReviewDraft:edition=>edition.released!==true&&edition.reviewSharing?.enabled===true};
})(globalThis);
