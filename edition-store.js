/* The public catalogue is small. Article data is fetched only for the selected edition. */
(function(root){
'use strict';
const base='https://prazeres-interrompidos.github.io/revista-prazeres-interrompidos/';
const key=id=>Array.from(new TextEncoder().encode(id),byte=>byte.toString(16).padStart(2,'0')).join('');
const editionPath=id=>'editions/'+key(id)+'.js';
const coverPath=id=>'covers/'+key(id)+'.svg';
const signature=data=>JSON.stringify(data);
function parseEdition(source){
  const match=source.match(/^\s*window\.EDITIONS\s*=\s*([\s\S]*?)\s*;?\s*$/);
  const entries=match&&JSON.parse(match[1]);
  if(!Array.isArray(entries)||entries.length!==1||typeof entries[0]?.id!=='string'||!Array.isArray(entries[0].articles)){
    throw Error('O ficheiro da edição não é válido.');
  }
  return entries[0];
}
function parseCatalog(source){
  const catalog=JSON.parse(source);
  if(catalog.version!==1||!Array.isArray(catalog.editions))throw Error('O catálogo das edições não é válido.');
  const ids=new Set();
  for(const entry of catalog.editions){
    if(typeof entry?.id!=='string'||!entry.id||ids.has(entry.id))throw Error('Identificador inválido no catálogo.');
    if(!entry.reader&&(entry.file!==editionPath(entry.id)||! /^[a-f0-9]{40}$/.test(entry.revision)))throw Error('Referência inválida no catálogo.');
    ids.add(entry.id);
  }
  return catalog.editions;
}
async function fetchText(url,fetcher=fetch){
  const response=await fetcher(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('Não foi possível carregar os ficheiros da revista.');
  return response.text();
}
function catalog(fetcher=fetch){return fetchText(new URL('catalog.json',base),fetcher).then(parseCatalog)}
function fileURL(entry){
  const url=new URL(entry.file,base);
  url.searchParams.set('v',entry.revision);
  return url;
}
function validateEdition(source,entry){
  const edition=parseEdition(source);
  if(edition.id!==entry.id||Boolean(edition.released)!==Boolean(entry.released))throw Error('A edição ainda está a ser atualizada.');
  return edition;
}
function readEdition(entry,fetcher=fetch){
  return fetchText(fileURL(entry),fetcher).then(source=>validateEdition(source,entry));
}
function readerURL(entry){
  const url=new URL(entry.reader||base,base);
  if(url.protocol!=='https:')throw Error('Endereço inválido da edição.');
  url.hash=new URLSearchParams({edicao:entry.id,pagina:'1'}).toString();
  return url.href;
}
function coverOnly(edition){
  const {id,number,month,headline,cover,coverReleased,coverReleasedAt}=edition;
  return {id,number,month,headline,cover,articles:[],coverReleased,coverReleasedAt,released:false};
}
function record(edition,revision,cover){
  const {id,number,month,headline,released,coverReleased}=edition;
  return {id,number,month,headline,released:released===true,coverReleased:coverReleased===true,cover,file:editionPath(id),revision};
}
function coverSvg(cover){
  if(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(cover||''))return null;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><image href="'+cover+'" width="600" height="900" preserveAspectRatio="xMidYMid meet"/></svg>\n';
}
root.RevistaEditions={base,editionPath,coverPath,parseEdition,parseCatalog,catalog,readEdition,validateEdition,signature,readerURL,coverOnly,record,coverSvg};
})(typeof window==='undefined'?globalThis:window);
