/* Book Trailers: ficheiros partilhados com a página Filmes, sem duplicar vídeos. */
(function(root){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const play='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
const sectionTitle='Book Trailers - Episódios do Nosso Arquivo';
let active=null,expanded=null;
const videoCards=new WeakMap();
function imageURL(value){const s=String(value||'');if(/^data:image\/(png|jpeg|webp);base64,/.test(s))return s;try{const u=new URL(s,location.href);return s&&['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function hasText(trailer){return trailer.hasText===true||(trailer.hasText!==false&&!!String(trailer.text||'').trim())}
function backgroundRegion(trailer){const source=String(trailer.bookCover||'');let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619);if((hash>>>0)===4022900515&&source.length===124299)return [0,0,.54,.70];if(source==='assets/book-trailers/na-tua-mao.webp')return [0,0,.46,.70];return null}
function canRender(trailer){return !!String(trailer.title||'').trim()&&!!String(trailer.author||'').trim()}
function markup(trailer){
 const result=root.RevistaFilmCatalog.match(trailer),media=result.item;
 const cover=imageURL(trailer.bookCover)||(media?.poster||''),title=String(trailer.title||'Book Trailer');
 const stage=media?'<video class="trailer-video" controls playsinline preload="none" src="'+esc(media.url)+'" poster="'+esc(cover)+'" aria-label="Filme: '+esc(title)+'"></video>':'<div class="trailer-unavailable">'+(cover?'<img src="'+esc(cover)+'" alt="Capa de '+esc(title)+'">':'')+'<p>'+(result.status==='ambiguous'?'Vídeo por selecionar.':'Vídeo ainda não disponível.')+'</p></div>';
 return '<div class="trailer-shell"><div class="trailer-card" data-video-provider="catalog" data-video-cover="'+esc(cover)+'"'+(media?' data-film-id="'+esc(media.id)+'" data-video-url="'+esc(media.pageUrl)+'"':'')+' role="group" aria-label="Book Trailer: '+esc(title)+'"><div class="trailer-stage">'+stage+'</div></div>'+
 (media?'<div class="trailer-toolbar" role="group" aria-label="Controlos do Book Trailer"><button class="trailer-control" type="button" data-trailer-fullscreen aria-label="Aumentar vídeo" title="Aumentar vídeo" data-tooltip="Aumentar vídeo"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="1"/></svg></button><button class="trailer-control" type="button" data-trailer-restart aria-label="Reiniciar vídeo" title="Reiniciar vídeo" data-tooltip="Reiniciar vídeo"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button></div>':'')+'</div>';
}
function stop(){
 if(expanded){expanded.close();expanded=null}
 if(!active)return;
 const current=active;active=null;current.video.pause();
 try{current.video.currentTime=0}catch{}
 current.el.classList.remove('is-playing');
}
function restart(el){const video=el?.querySelector('video');if(!video)return;try{video.currentTime=0}catch{}video.play().catch(()=>{})}
function keepVisible(page){if(!active)return;const sheet=active.el.closest('[data-sheet-index]');if(sheet&&![page,page+1].includes(Number(sheet.dataset.sheetIndex)))stop()}
function expandPlayer(el){
 const video=el?.querySelector('video');if(!video)return;videoCards.set(video,el);
 const enlarge=()=>{
  const stage=video.parentNode,wasPlaying=!video.paused,dialog=document.createElement('dialog');
  dialog.className='trailer-shell trailer-expanded';dialog.setAttribute('aria-label',video.getAttribute('aria-label')||'Vídeo ampliado');
  const close=document.createElement('button');close.type='button';close.className='trailer-expanded-close';close.textContent='×';close.setAttribute('aria-label','Fechar vídeo ampliado');close.onclick=()=>dialog.close();
  dialog.append(video,close);document.body.append(dialog);expanded=dialog;
  dialog.addEventListener('close',()=>{const playing=!video.paused;if(stage.isConnected){stage.append(video);if(playing)video.play().catch(()=>{})}dialog.remove();if(expanded===dialog)expanded=null},{once:true});
  dialog.showModal();if(wasPlaying)video.play().catch(()=>{});
 };
 if(video.requestFullscreen)video.requestFullscreen().catch(enlarge);else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();else enlarge();
}
// Native controls receive their own events before the page-turning handlers.
const protectedShells=new WeakSet();
function protectPlayers(){document.querySelectorAll('.trailer-shell').forEach(shell=>{if(protectedShells.has(shell))return;protectedShells.add(shell);for(const event of ['pointerdown','pointerup','pointermove','mousedown','mouseup','mousemove','touchstart','touchmove','touchend','keydown','click'])shell.addEventListener(event,e=>e.stopPropagation())})}
new MutationObserver(protectPlayers).observe(document.documentElement,{childList:true,subtree:true});protectPlayers();
document.addEventListener('play',e=>{const video=e.target;if(!video.matches?.('.trailer-video'))return;if(active&&active.video!==video)stop();root.RevistaAudio?.pause?.();const el=video.closest('.trailer-card')||videoCards.get(video);if(!el)return;active={el,video};el.classList.add('is-playing')},true);
document.addEventListener('click',e=>{
 const shell=e.target.closest?.('.trailer-shell');if(!shell||shell.classList.contains('trailer-expanded')||e.target.matches?.('.trailer-video'))return;
 if(e.target.closest('[data-trailer-fullscreen]')){e.preventDefault();e.stopPropagation();expandPlayer(shell.querySelector('.trailer-card'))}
 else if(e.target.closest('[data-trailer-restart]')){e.preventDefault();e.stopPropagation();restart(shell.querySelector('.trailer-card'))}
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
document.addEventListener('pi-audio-play',stop);
function preparePDF(doc){
 doc.querySelectorAll('.trailer-toolbar').forEach(el=>el.remove());
 doc.querySelectorAll('.trailer-card[data-video-url]').forEach(el=>{
  const url=el.dataset.videoUrl,cover=el.dataset.videoCover,title=el.getAttribute('aria-label')||'Book Trailer';
  el.classList.add('trailer-pdf');el.querySelector('.trailer-stage').innerHTML='<a class="trailer-poster" href="'+esc(url)+'" data-pdf-video="true" aria-label="Ver '+esc(title)+'">'+(cover?'<img src="'+esc(cover)+'" alt="'+esc(title)+'">':'')+'<span class="trailer-play">'+play+'</span></a>';
 });
}
function sample(){return {title:'Na Tua Mão',author:'Hélder Teixeira Aguiar',publisher:'Gradiva',audio:'https://prazeres-interrompidos.github.io/podcast-prazeres-interrompidos/episodios/episodio-ece8baed06f1160adba8/',bookCover:'assets/book-trailers/na-tua-mao.webp',voice:'Isabel Solendo',textAuthor:'Octávio Nuno',section:'Episódios do Nosso Arquivo',hasText:true,text:'',sampleTextPlaceholder:true,bookArtworkRegion:{motifBox:[0,0,.46,.70]}}}
root.RevistaTrailers={markup,stop,keepVisible,sample,sectionTitle,hasText,backgroundRegion,canRender,preparePDF};
})(window);
