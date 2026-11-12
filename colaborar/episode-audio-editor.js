/* Search the podcast catalogue from any section that accepts episode audio. */
'use strict';
const episodeAudioSections=[
 {list:'articles',field:'field',index:'index'},
 {list:'extraArticles',field:'field',index:'index',allowEpisodeTitle:true},
 {list:'bookTrailers',field:'trailerField',index:'trailerIndex',media:'film'},
 {list:'bookGifs',field:'gifField',index:'gifIndex',media:'gif'}
].map(section=>({...section,container:$('#'+section.list)}));
// Programmes listed on «As Escolhas de…» and in the published episode catalogue.
const choicesHosts=[
 'Adriana Santos','Ana Cristina Silva','Ana Oliveira Cardoso','Diana Santos',
 'Dulce de Souza Gonçalves','Eduardo Luciano','Hélder Teixeira Aguiar','Luís Dill',
 'Luís Filipe Borges','Menalton Braff','Miguel Leonardo','Pituka Nirobe',
 'Priscila Brito','Regina Garcia','Sara de Almeida Leite','Sivaldo Venerando','Tobias G. Alte'
];
const hostRubrics=choicesHosts.map(name=>'As Escolhas de '+name);
const episodeRubrics=[...RevistaEpisodeCatalog.rubrics,'Episódios Extra','Episódios do Nosso Arquivo'];
const episodeAudioRows=new WeakMap();
let episodeAudioEntries=[];
let episodeAudioState='idle';
let episodeAudioRequest=null;

function hasAssociatedEpisode(article){
 const link=RevistaEpisodeCatalog.pageUrl(article.audioEpisodeId);
 return Boolean(link&&article.audio===link);
}

function setAssociatedEpisode(article,input,id){
 article.audio=RevistaEpisodeCatalog.pageUrl(id);
 if(id)article.audioEpisodeId=id;
 else delete article.audioEpisodeId;
 delete article.audioManual;
 input.value=article.audio;
}

function audioFieldSelector(section,field){
 const name=section.field.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
 return 'input[data-'+name+'="'+field+'"]';
}

function setEditorField(field,value){
 field.value=value;
 field.dispatchEvent(new Event('input',{bubbles:true}));
}

function groupMetadataField(field){
 const label=field.closest('label');
 const group=document.createElement('div');
 label.before(group);
 group.append(label);
 return {group,label};
}

function mountEpisodeMetadata(grid,section){
 const rubric=grid.querySelector(audioFieldSelector(section,'section'));
 const author=grid.querySelector(audioFieldSelector(section,'textAuthor'));
 const {group:rubricGroup,label:customLabel}=groupMetadataField(rubric);
 const custom=document.createElement('div');
 customLabel.firstChild.textContent='Outra rubrica';
 custom.append(customLabel);
 const rubricLabel=document.createElement('label');
 rubricLabel.textContent='Rubrica (opcional)';
 const select=document.createElement('select');
 const option=value=>'<option value="'+esc(value)+'">'+esc(value)+'</option>';
 select.innerHTML='<option value="">Sem rubrica</option>'+episodeRubrics.map(option).join('')+
  '<optgroup label="Programas As Escolhas de…">'+hostRubrics.map(option).join('')+'</optgroup>'+
  '<option value="__custom__">Outra rubrica…</option>';
 const normalize=RevistaFilmCatalog.normalize;
 const currentRubric=[...episodeRubrics,...hostRubrics].find(value=>normalize(value)===normalize(rubric.value));
 select.value=currentRubric??(rubric.value?'__custom__':'');
 let customValue=select.value==='__custom__'?rubric.value:'';
 custom.hidden=select.value!=='__custom__';
 rubricLabel.append(select);
 rubricGroup.append(rubricLabel,custom);
 rubric.addEventListener('input',()=>{if(!custom.hidden)customValue=rubric.value});
 select.addEventListener('change',()=>{
  custom.hidden=select.value!=='__custom__';
  setEditorField(rubric,custom.hidden?select.value:customValue);
  if(!custom.hidden)rubric.focus();
 });

 const {group:authorGroup}=groupMetadataField(author);
 const authors=document.createElement('select');
 authors.setAttribute('aria-label','Escolher autor do texto');
 authors.innerHTML='<option value="">Escolher autor da lista…</option>'+[defaultTextAuthor,...choicesHosts].map(option).join('');
 authorGroup.append(authors);
 authors.addEventListener('change',()=>{
  if(authors.value)setEditorField(author,authors.value);
  authors.value='';
 });
}

function loadEpisodeAudioCatalogue(){
 if(episodeAudioRequest)return episodeAudioRequest;
 episodeAudioState='loading';
 episodeAudioRequest=RevistaEpisodeCatalog.load().then(entries=>{
  episodeAudioEntries=entries;
  episodeAudioState='ready';
 },()=>{
  episodeAudioState='error';
 }).finally(()=>{
  episodeAudioRequest=null;
  updateEpisodeAudio();
 });
 return episodeAudioRequest;
}

function episodeAudioRow(input,article,section){
 if(episodeAudioRows.has(input))return episodeAudioRows.get(input);
 const row=document.createElement('div');
 row.innerHTML='<p role="status"></p><div></div>';
 row.dataset.episodeAudio='';
 const grid=input.closest('.grid');
 mountEpisodeMetadata(grid,section);
 grid.after(row);
 const view={notice:row.firstElementChild,options:row.lastElementChild,message:null,controls:null};
 episodeAudioRows.set(input,view);
 row.addEventListener('click',event=>{
  if(event.target.matches('[data-episode-audio-retry]')){
   void loadEpisodeAudioCatalogue();
   updateEpisodeAudio();
  }
 });
 row.addEventListener('change',event=>{
  if(!event.target.matches('[data-episode-audio-choice]')||!RevistaEpisodeCatalog.pageUrl(event.target.value))return;
  setAssociatedEpisode(article,input,event.target.value);
  updateEpisodeAudio();
  if(typeof queueDraftSave==='function')queueDraftSave();
 });
 return view;
}

function audioLookupView(section,article){
 const saved=hasAssociatedEpisode(article);
 if(String(article.audio||'').trim()&&!saved)return {message:'Ligação de áudio introduzida manualmente.'};
 if(!String(article.title||'').trim()||(!section.allowEpisodeTitle&&!String(article.author||'').trim()))return {};

 if(episodeAudioState==='idle')void loadEpisodeAudioCatalogue();
 const link='<a href="'+esc(article.audio)+'" target="_blank" rel="noopener noreferrer">Abrir episódio ↗</a>';
 if(episodeAudioState==='loading')return {message:'A procurar o episódio no catálogo do podcast…'};
 if(episodeAudioState==='error')return {
  message:saved?'Ligação do episódio guardada. '+link:'Não foi possível consultar os episódios. Podes introduzir a ligação manualmente.',
  controls:'<button type="button" data-episode-audio-retry>Tentar novamente</button>'
 };

 const media=section.media&&RevistaFilmCatalog.match(article,section.media).item;
 const titles=media?[article.title,media.fullTitle]:[article.title];
 const matches=RevistaEpisodeCatalog.match(episodeAudioEntries,titles,article.author,section);
 const candidates=RevistaEpisodeCatalog.preferRubric(matches,article.section);
 const rubricChangesSelection=candidates.length<matches.length&&matches.some(episode=>episode.id===article.audioEpisodeId);
 const selected=candidates.find(episode=>episode.id===article.audioEpisodeId)||
  (candidates.length===1&&(!saved||rubricChangesSelection)?candidates[0]:null);
 if(!candidates.length)return saved?{message:'Ligação do episódio guardada. '+link}:{
  message:section.allowEpisodeTitle&&!String(article.author||'').trim()
   ?'Acrescenta o autor do livro ou usa o título completo do episódio para o encontrar.'
   :'Episódio não encontrado. Podes introduzir a ligação manualmente.',
  controls:'<button type="button" data-episode-audio-retry>Atualizar catálogo de episódios</button>'
 };

 const controls=candidates.length>1||!selected
  ?'<label>Episódio a utilizar<select data-episode-audio-choice><option value="" disabled>Selecionar episódio…</option>'+candidates.map(episode=>'<option value="'+esc(episode.id)+'">'+esc(episode.title)+'</option>').join('')+'</select></label>'
  :'';
 if(!selected)return {
  message:saved&&!rubricChangesSelection?'Ligação do episódio guardada. '+link:'Foram encontrados vários episódios para este título.',
  controls,clear:saved&&rubricChangesSelection
 };
 const selectedLink='<a href="'+esc(RevistaEpisodeCatalog.pageUrl(selected.id))+'" target="_blank" rel="noopener noreferrer">Abrir episódio ↗</a>';
 return {message:'Episódio associado: <strong>'+esc(selected.title)+'</strong>. '+selectedLink,controls,selectedId:selected.id,fill:!saved||selected.id!==article.audioEpisodeId};
}

function updateEpisodeAudio(){
 let changed=false;
 for(const section of episodeAudioSections){
  section.container.querySelectorAll(audioFieldSelector(section,'audio')).forEach(input=>{
   const article=all[current][section.list]?.[Number(input.dataset[section.index])];
   if(!article)return;
   const view=episodeAudioRow(input,article,section);
   const {message='',controls='',selectedId='',fill=false,clear=false}=audioLookupView(section,article);
   if(fill||clear){setAssociatedEpisode(article,input,selectedId);changed=true}
   if(view.message!==message){view.notice.innerHTML=message;view.message=message}
   if(view.controls!==controls){view.options.innerHTML=controls;view.controls=controls}
   const choice=view.options.querySelector('select');
   if(choice)choice.value=selectedId;
  });
 }
 if(changed&&typeof queueDraftSave==='function')queueDraftSave();
}

const episodeAudioObserver=new MutationObserver(updateEpisodeAudio);
for(const section of episodeAudioSections){
 // Capture the previous metadata before the section's normal input handler saves the form.
 section.container.addEventListener('input',event=>{
  const field=event.target.dataset[section.field];
  if(!['title','author','section','audio'].includes(field))return;
  const article=all[current][section.list]?.[Number(event.target.dataset[section.index])];
  if(!article)return;
  if(field==='audio'){
   delete article.audioEpisodeId;
   delete article.audioManual;
  }else if((field==='title'||field==='author')&&hasAssociatedEpisode(article)&&RevistaFilmCatalog.normalize(event.target.value)!==RevistaFilmCatalog.normalize(article[field])){
   const audio=event.target.closest('.grid').querySelector(audioFieldSelector(section,'audio'));
   setAssociatedEpisode(article,audio,'');
  }
  // Wait until the form's input handlers have copied the new value into the draft.
  setTimeout(updateEpisodeAudio,0);
 },true);
 episodeAudioObserver.observe(section.container,{childList:true});
}
window.addEventListener('pi-media-catalog',updateEpisodeAudio);
const previewBeforeEpisodeAudio=$('#preview').onclick;
$('#preview').onclick=async function(event){
 if(episodeAudioRequest)await episodeAudioRequest;
 return previewBeforeEpisodeAudio.call(this,event);
};
updateEpisodeAudio();
