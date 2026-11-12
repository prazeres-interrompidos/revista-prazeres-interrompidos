/* Episodes from the catalogue embedded on the project's home page. */
(function(root){
'use strict';
const base='https://prazeres-interrompidos.github.io/podcast-prazeres-interrompidos/';
const episodeId=/^episodio-[a-f0-9]{20}$/;
const normalize=root.RevistaFilmCatalog.normalize;
const rubrics=Object.freeze([
 'Episódios','Só Para Autores','As Escolhas de…','Jovens Leitores','África Minha',
 'Vozes das Américas','Livros Imaginários','Um Livro, Duas Leituras',
 'Na Biblioteca de…','Entrevistas do Podcast','Mensagem de Natal'
]);
const rubricKeys=rubrics.map(normalize);
const choicesRubric=normalize('As Escolhas de');
const withoutRoles=value=>String(value||'')
 .replace(/\(\s*(?:texto|desenhos|ilustração|ilustrações)\s*\)/giu,' ')
 .replace(/\b(?:texto|desenhos|ilustração|ilustrações)\s+de\s*:?\s*/giu,' ');

function pageUrl(id){return typeof id==='string'&&episodeId.test(id)?base+'episodios/'+id+'/':''}

function identifyRubric(title,fullKey){
 const heading=normalize(title.replace(/^\s*(?:Epis[óo]dio|Entrevista)\s+\d+\s*(?:\([^)]*\)\s*)?/i,''));
 const named=rubricKeys.slice(1).find(key=>heading===key||heading.startsWith(key+' '));
 if(named)return {rubric:named,heading};
 if(/^entrevista \d+\b/.test(fullKey))return {rubric:normalize('Entrevistas do Podcast'),heading};
 return {rubric:/^episodio \d+\b/.test(fullKey)?rubricKeys[0]:'',heading};
}

function parse(source){
 const payload=/^\s*window\.EPISODES\s*=\s*(\[[\s\S]*\])\s*;\s*$/.exec(source);
 if(!payload)throw Error('Catálogo de episódios inválido.');
 const rows=JSON.parse(payload[1]);
 const entries=new Map();
 for(const row of rows){
  if(!row||!pageUrl(row.id)||typeof row.title!=='string'||typeof row.audio!=='string'||!/^https:\/\//i.test(row.audio))continue;
  const bookDetails=row.title.replace(/^Epis[óo]dio\s+\d+\s*(?:\([^)]*\)\s*)?/i,'')
   .replace(/\s*\([^()]*\)\s*[.!]?\s*$/,'');
  const fullKey=normalize(row.title);
  entries.set(row.id,{id:row.id,title:row.title,fullKey,key:normalize(withoutRoles(bookDetails)),...identifyRubric(row.title,fullKey)});
 }
 if(!entries.size)throw Error('O catálogo não contém episódios com áudio.');
 return [...entries.values()];
}

async function load(){
 const response=await fetch(base+'assets/episodes.js',{credentials:'omit',cache:'no-cache',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Catálogo de episódios indisponível.');
 return parse(await response.text());
}

function match(entries,titles,author,{allowEpisodeTitle=false}={}){
 const name=normalize(withoutRoles(author));
 const titleKeys=titles.map(normalize).filter(Boolean);
 if(!name)return allowEpisodeTitle
  ?entries.filter(episode=>titleKeys.includes(episode.fullKey)||titleKeys.includes(episode.key))
  :[];
 const suffixes=titleKeys.flatMap(title=>[title+' '+name,title+' de '+name]);
 return entries.filter(episode=>{
  const details=' '+episode.key;
  return suffixes.some(suffix=>details.endsWith(' '+suffix))||
   (allowEpisodeTitle&&titleKeys.includes(episode.fullKey)&&details.endsWith(' '+name));
 });
}

function preferRubric(candidates,section){
 if(candidates.length<2)return candidates;
 const preferred=normalize(section);
 const specificHost=preferred.startsWith(choicesRubric+' ');
 if(!specificHost&&!rubricKeys.includes(preferred))return candidates;
 const matches=candidates.filter(episode=>specificHost
  ?episode.rubric===choicesRubric&&episode.heading.startsWith(preferred+' ')
  :episode.rubric===preferred);
 return matches.length?matches:candidates;
}

root.RevistaEpisodeCatalog={load,match,pageUrl,preferRubric,rubrics};
})(window);
