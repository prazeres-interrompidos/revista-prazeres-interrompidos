/* Exchange one edition as the same JSON array used by existing backups. */
(function(root){
'use strict';
const publicationFields=['released','releasedAt','coverReleased','coverReleasedAt','reviewSharing'];
const lists=['articles','extraArticles','bookTrailers','bookGifs','news'];
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function validate(edition){
 if(!isRecord(edition)||typeof edition.id!=='string'||!edition.id.trim()||typeof edition.month!=='string'||!edition.month.trim()||!Array.isArray(edition.articles))throw Error('A cópia não contém uma edição válida.');
 for(const list of lists){
  if(edition[list]===undefined&&list!=='articles')continue;
  if(!Array.isArray(edition[list])||!edition[list].every(isRecord))throw Error('A secção «'+list+'» da cópia não é válida.');
  if(list==='articles'||list==='extraArticles')for(const article of edition[list])if(!['title','author','publisher','voice','text'].every(field=>typeof article[field]==='string'))throw Error('A cópia contém um artigo inválido.');
  if(list==='bookTrailers'||list==='bookGifs')for(const article of edition[list])for(const field of ['title','author','publisher','voice','text'])if(article[field]!==undefined&&typeof article[field]!=='string')throw Error('A cópia contém um artigo inválido.');
 }
 return edition;
}
function read(value){
 let editions;try{editions=typeof value==='string'?JSON.parse(value):value;}catch{throw Error('O ficheiro não é um JSON válido. Escolha uma cópia exportada por este editor.');}
 if(!Array.isArray(editions)||!editions.length)throw Error('Escolha uma cópia JSON exportada por este editor.');
 editions.forEach(validate);if(new Set(editions.map(e=>e.id)).size!==editions.length)throw Error('A cópia tem identificadores de edição repetidos.');
 return structuredClone(editions);
}
function draft(edition){
 validate(edition);const copy=structuredClone(edition);
 publicationFields.forEach(field=>delete copy[field]);copy.released=false;copy.coverReleased=false;
 return copy;
}
function exportEdition(edition){return JSON.stringify([draft(edition)],null,2);}
function integrate(editions,incoming){
 validate(incoming);const index=editions.findIndex(e=>e.id===incoming.id),copy=draft(incoming);
 if(index>=0)for(const field of publicationFields){if(Object.hasOwn(editions[index],field))copy[field]=structuredClone(editions[index][field]);else delete copy[field];}
 const result=editions.slice();if(index>=0)result[index]=copy;else result.unshift(copy);
 return {editions:result,index:index>=0?index:0};
}
root.RevistaJSON={read,draft,exportEdition,integrate};
})(globalThis);
