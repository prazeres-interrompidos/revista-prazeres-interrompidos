/* Book GIFs: animações partilhadas com a coleção Filmes, numa moldura. */
(function(root){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const play='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
const pause='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor"/></svg>';
const sectionTitle='Book GIFs - Episódios do Nosso Arquivo';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let expanded=null,lastPage=null;
function canRender(item){return !!String(item.title||'').trim()&&!!String(item.author||'').trim()}
function markup(item){
 const match=root.RevistaFilmCatalog.match(item,'gif'),gif=match.item,title=String(item.title||'Book GIF');
 if(!gif)return '<div class="gif-shell"><div class="gif-frame gif-unavailable" role="group" aria-label="Book GIF: '+esc(title)+'"><p>'+(match.status==='ambiguous'?'GIF por selecionar.':'GIF ainda não disponível.')+'</p></div></div>';
 return '<div class="gif-shell" data-gif-title="'+esc(title)+'"><div class="gif-frame" role="group" aria-label="Book GIF: '+esc(title)+'" data-gif-page="'+esc(gif.pageUrl)+'" data-gif-poster="'+esc(gif.poster)+'"><img class="gif-image" src="'+esc(gif.poster)+'" data-gif-source="'+esc(gif.url)+'" data-gif-poster="'+esc(gif.poster)+'" alt="'+esc(title)+' — '+esc(item.author)+'" loading="lazy"></div><div class="trailer-toolbar gif-toolbar" role="group" aria-label="Controlos do Book GIF"><button class="trailer-control" type="button" data-gif-expand aria-label="Ampliar GIF" title="Ampliar GIF" data-tooltip="Ampliar GIF"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1"/></svg></button><button class="trailer-control" type="button" data-gif-toggle aria-label="Animar GIF" title="Animar GIF" data-tooltip="Animar GIF" aria-pressed="false">'+play+'</button></div></div>';
}
function animate(shell,on){
 const image=shell.querySelector('.gif-image');if(!image)return;
 const source=on?image.dataset.gifSource:image.dataset.gifPoster;
 if(image.getAttribute('src')!==source)image.src=source;
 shell.dataset.gifPlaying=on?'true':'false';
 const button=shell.querySelector('[data-gif-toggle]');
 if(button){const label=on?'Mostrar imagem fixa':'Animar GIF';button.innerHTML=on?pause:play;button.setAttribute('aria-label',label);button.title=label;button.dataset.tooltip=label;button.setAttribute('aria-pressed',String(on))}
}
const allowed=shell=>shell.dataset.gifIntent==='play'||(shell.dataset.gifIntent!=='pause'&&!reduced.matches);
function keepVisible(page){
 lastPage=page;
 requestAnimationFrame(()=>fitFrames(document));
 document.querySelectorAll('#book .gif-shell').forEach(shell=>{const sheet=shell.closest('[data-sheet-index]');const visible=sheet&&[page,page+1].includes(Number(sheet.dataset.sheetIndex));animate(shell,!!visible&&allowed(shell))});
}
function prepare(container){container.querySelectorAll('.gif-shell').forEach(shell=>animate(shell,allowed(shell)))}
function stop(){if(expanded){expanded.dataset.resume='false';expanded.close();expanded=null}document.querySelectorAll('.gif-shell').forEach(shell=>animate(shell,false))}
function expand(shell){
 const image=shell.querySelector('.gif-image');if(!image)return;
 const wasPlaying=shell.dataset.gifPlaying==='true';animate(shell,false);
 const dialog=document.createElement('dialog');dialog.className='gif-expanded';dialog.setAttribute('aria-label',shell.dataset.gifTitle||'Book GIF');
 const close=document.createElement('button');close.type='button';close.className='trailer-expanded-close';close.textContent='×';close.setAttribute('aria-label','Fechar GIF ampliado');close.onclick=()=>dialog.close();
 const frame=document.createElement('div');frame.className='gif-frame';const picture=document.createElement('img');picture.src=wasPlaying?image.dataset.gifSource:image.dataset.gifPoster;picture.alt=image.alt;frame.append(picture);dialog.append(frame,close);document.body.append(dialog);expanded=dialog;
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 dialog.addEventListener('close',()=>{dialog.remove();if(expanded===dialog)expanded=null;if(shell.isConnected)animate(shell,dialog.dataset.resume!=='false'&&!document.hidden&&wasPlaying)},{once:true});dialog.showModal();
}
const protectedShells=new WeakSet();
function protect(){document.querySelectorAll('.gif-shell').forEach(shell=>{if(protectedShells.has(shell))return;protectedShells.add(shell);for(const event of ['pointerdown','pointerup','pointermove','mousedown','mouseup','mousemove','touchstart','touchmove','touchend','keydown','click'])shell.addEventListener(event,e=>e.stopPropagation())})}
new MutationObserver(protect).observe(document.documentElement,{childList:true,subtree:true});protect();
document.addEventListener('click',event=>{const shell=event.target.closest?.('.gif-shell');if(!shell)return;if(event.target.closest('[data-gif-expand]')){event.preventDefault();event.stopPropagation();expand(shell)}else if(event.target.closest('[data-gif-toggle]')){event.preventDefault();event.stopPropagation();const on=shell.dataset.gifPlaying!=='true';shell.dataset.gifIntent=on?'play':'pause';animate(shell,on)}},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{if(lastPage!==null)keepVisible(lastPage);const reading=document.querySelector('#reading[open] #readingContent');if(reading)prepare(reading)}});
reduced.addEventListener('change',()=>{if(lastPage!==null)keepVisible(lastPage)});
function preparePDF(doc){
 doc.querySelectorAll('.gif-toolbar').forEach(el=>el.remove());
 doc.querySelectorAll('.gif-frame[data-gif-page]').forEach(frame=>{const image=frame.querySelector('img');if(image){image.src=frame.dataset.gifPoster;image.removeAttribute('loading')}const link=doc.createElement('a');link.href=frame.dataset.gifPage;link.dataset.pdfGif='true';link.setAttribute('aria-label','Ver '+(frame.getAttribute('aria-label')||'Book GIF'));frame.replaceWith(link);link.append(frame)});
}
function fitFrames(container){
 container.querySelectorAll('.gif-page .page-inner').forEach(inner=>{const shell=inner.querySelector('.gif-shell'),frame=inner.querySelector('.gif-frame'),folio=inner.querySelector('.folio');if(!shell||!frame||!folio)return;const toolbar=shell.querySelector('.gif-toolbar'),style=getComputedStyle(inner),frameStyle=getComputedStyle(frame);const decoration=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+(parseFloat(frameStyle[key])||0),0);const space=inner.clientHeight-(parseFloat(style.paddingBottom)||0)-folio.offsetHeight-shell.offsetTop-(toolbar?.offsetHeight||0)-decoration-20;frame.style.setProperty('--gif-image-height',Math.max(80,Math.min(360,space))+'px')});
}
root.RevistaGIFs={markup,canRender,hasText:root.RevistaTrailers.hasText,sectionTitle,keepVisible,prepare,stop,preparePDF,fitFrames};
})(window);
