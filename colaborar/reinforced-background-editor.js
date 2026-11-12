(function(){
'use strict';
const main=document.querySelector('main.editor'),choice=RevistaBackgroundChoice;
const target=panel=>all[current]?.[panel.dataset.backgroundKind]?.[Number(panel.dataset.backgroundIndex)];
function save(){if(typeof queueDraftSave==='function')queueDraftSave();}
function refresh(panel,article){
 const card=panel.parentElement;
 const checkbox=card.querySelector('[data-field="backgroundWithLetters"],[data-trailer-field="backgroundWithLetters"],[data-gif-field="backgroundWithLetters"]');
 if(checkbox)checkbox.checked=article.backgroundWithLetters===true;
 const image=card.querySelector('[data-trailer-artwork],[data-gif-artwork]'),label=card.querySelector('[data-trailer-background],[data-gif-background]');
 if(image){const src=article.backgroundWithLetters===true?article.bookCover:RevistaArtwork.valid(article)?article.automaticArtwork.image:'';image.hidden=!src;if(src)image.src=src;image.alt='Pré-visualização do fundo escolhido';}
 if(label)label.textContent=article.backgroundWithLetters===true?'Fundo com letras ativado.':'Fundo escolhido. Verifique o resultado na pré-visualização.';
 panel.querySelector('[data-background-restore]').hidden=!choice.canRestore(article);
 RevistaBackgroundControls.refresh(panel);save();
}
function mount(){
 for(const panel of main.querySelectorAll('.background-adjustments')){
  const article=target(panel);if(!article)continue;
  const existing=panel.querySelector('[data-background-reinforced-tools]');
  if(existing){existing.querySelector('[data-background-restore]').hidden=!choice.canRestore(article);continue;}
  const tools=document.createElement('div');tools.dataset.backgroundReinforcedTools='true';tools.className='reinforced-background-tools';
  tools.innerHTML='<button type="button" data-background-enhance>Tentar limpeza reforçada</button><button type="button" data-background-restore '+(choice.canRestore(article)?'':'hidden')+'>Repor fundo anterior</button><p data-background-reinforced-status role="status"></p>';
  panel.querySelector('[data-background-reset]').before(tools);
 }
}
function compare(button,panel,article){
 capture();const source=article.bookCover,edition=all[current],metadata=[article.title,article.author,article.publisher].filter(Boolean).join(' ');
 if(!source)return;
 const status=panel.querySelector('[data-background-reinforced-status]'),dialog=document.createElement('dialog');
 dialog.className='background-comparison';
 dialog.setAttribute('aria-labelledby','background-comparison-title');
 dialog.innerHTML='<h2 id="background-comparison-title">Comparar fundos</h2><p>Escolha o resultado que preserva melhor o desenho e a leitura. As imagens são mostradas sem transparência para facilitar a comparação.</p><p class="comparison-progress" role="status">A preparar a limpeza reforçada…</p><div class="comparison-images" hidden><figure><figcaption>Fundo atual</figcaption><img alt="Fundo atual antes da limpeza reforçada"><p data-current-colors hidden>O fundo atual usa apenas as cores da capa.</p></figure><figure><figcaption>Limpeza reforçada</figcaption><img alt="Proposta de limpeza reforçada"></figure></div><p>A transparência e os restantes ajustes do episódio serão mantidos.</p><div class="comparison-actions"><button type="button" class="primary" data-comparison-apply disabled>Usar limpeza reforçada</button><button type="button" data-comparison-keep autofocus>Manter fundo atual</button></div>';
 const progress=dialog.querySelector('.comparison-progress'),apply=dialog.querySelector('[data-comparison-apply]');
 let candidate=null,active=true,applied=false;
 const stillCurrent=()=>panel.isConnected&&target(panel)===article&&all[current]===edition&&article.bookCover===source;
 const notify=message=>{if(active)progress.textContent=message;};
 button.disabled=true;status.textContent='A tentar a limpeza reforçada…';
 dialog.querySelector('[data-comparison-keep]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{active=false;if(!applied&&stillCurrent())status.textContent='O fundo atual foi mantido.';dialog.remove();},{once:true});
 apply.onclick=()=>{
  if(!candidate||!stillCurrent()){notify('A capa foi alterada. Feche esta comparação e tente novamente.');apply.disabled=true;return;}
  capture();if(!choice.apply(article,source,candidate))return;
  applied=true;status.textContent='Limpeza reforçada aplicada. Pode repor o fundo anterior.';refresh(panel,article);dialog.close();
 };
 document.body.append(dialog);dialog.showModal();
 (async()=>{
  try{
   candidate=await RevistaArtwork.reinforced(source,metadata,notify);
   if(!active)return;
   if(!stillCurrent()){notify('A capa foi alterada. Feche esta comparação e tente novamente.');return;}
   const current=await RevistaTheme.preview(article);if(!active)return;
   const images=dialog.querySelectorAll('img');
   if(current?.motif)images[0].src=current.motif;
   else{images[0].hidden=true;dialog.querySelector('[data-current-colors]').hidden=false;dialog.querySelector('figure').style.background=current?.paper||'#faf7ef';}
   images[1].src=candidate.image;
   await Promise.all([...images].filter(image=>!image.hidden).map(image=>image.decode()));
   if(!active)return;
   dialog.querySelector('.comparison-images').hidden=false;apply.disabled=false;
   notify('Compare os dois resultados antes de escolher.');
  }catch(error){if(active)notify('Não foi possível concluir a limpeza reforçada. '+error.message);}
  finally{if(button.isConnected)button.disabled=false;}
 })();
}
main.addEventListener('click',event=>{
 const button=event.target.closest('[data-background-enhance],[data-background-restore]');if(!button)return;
 const panel=button.closest('.background-adjustments'),article=target(panel);if(!article)return;
 if(button.hasAttribute('data-background-enhance'))compare(button,panel,article);
 else{capture();if(choice.restore(article)){panel.querySelector('[data-background-reinforced-status]').textContent='Fundo anterior reposto.';refresh(panel,article);}}
});
new MutationObserver(mount).observe(main,{childList:true,subtree:true});mount();
})();
