/* Book Trailers: controlos integrados no vídeo, dentro da moldura de telemóvel. */
(function(root){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const play='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
let active=null;
const videoCards=new WeakMap();
// Cópias públicas dos mesmos filmes OneDrive, já usadas no site Filmes.
// A associação usa a ligação exata, nunca apenas o título de um livro.
const filmOrigin='https://book-trailers-prazeres-interrompidos.oct-nuno.chatgpt.site';
const publishedFilms=new Map([
 ['IQQa4_anuA6STadQGGhfLKqYAVCCcjsb-2GpAvWUBugZ0Ao','na-tua-mao'],
 ['IQSt1qLO9mMQQoVrBQp0-J8EAV7mv198aVUXZlWPqHZq3os','ontem'],
 ['IQTWuKT6OQ1DT71bVAw4KvWyAbr8jsC8bikqWFyV04FJee8','mundo-ines'],
 ['IQTfVy0dWLK0TpXE6gFHmq_DAY6Dx7o3cTwEv6RUX41AAOs','bela'],
 ['IQRtDhdo8s3GRby2tvREMNGJAdJUwrwx21w_vdhLyE59Rmk','sono-esconde']
]);
function nativeFilm(media){try{const url=new URL(media.embed);const slug=url.hostname==='1drv.ms'&&url.pathname.split('/')[3]==='44724ba5c39d45e2'?publishedFilms.get(url.pathname.split('/')[4]):'';return slug?filmOrigin+'/media/'+slug+'.mp4':''}catch{return ''}}
function videoId(value){try{const url=new URL(String(value||'').trim());if(!['https:','http:'].includes(url.protocol))return '';const host=url.hostname.replace(/^(www\.|m\.)/,'');let id='';if(host==='youtu.be')id=url.pathname.split('/')[1];else if(host==='youtube.com'||host==='youtube-nocookie.com'){const parts=url.pathname.split('/').filter(Boolean);id=parts[0]==='watch'?url.searchParams.get('v'):['shorts','embed','live'].includes(parts[0])?parts[1]:''}return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:''}catch{return ''}}
// Só a ligação de «Incorporar» do OneDrive funciona fora do site do fornecedor.
// O HTML colado nunca é inserido: aproveitamos apenas o endereço validado do iframe.
function videoSource(value){
 let raw=String(value||'').trim();
 if(/^<iframe\b/i.test(raw)){const match=raw.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);if(!match)return null;raw=match[2]}
 raw=raw.replace(/&amp;/gi,'&');
 const id=videoId(raw);if(id)return {provider:'youtube',label:'YouTube',id,embed:'https://www.youtube-nocookie.com/embed/'+id,url:'https://www.youtube.com/watch?v='+id};
 try{
  const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  const short=u.hostname==='1drv.ms'&&/^\/v\/c\/[a-f0-9]{16}\/[A-Za-z0-9_-]+\/?$/i.test(u.pathname)&&Number(u.searchParams.get('width'))>0&&Number(u.searchParams.get('height'))>0;
  const full=u.hostname==='onedrive.live.com'&&/^\/embed\/?$/i.test(u.pathname)&&!!(u.searchParams.get('resid')||u.searchParams.get('id'));
  if(short||full)return {provider:'onedrive',label:'OneDrive',embed:u.href,url:u.href};
 }catch{}
 return null;
}
function imageURL(value){const s=String(value||'');if(/^data:image\/(png|jpeg|webp);base64,/.test(s))return s;try{const u=new URL(s,location.href);return s&&['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
const sectionTitle='Book Trailers - Episódios do Nosso Arquivo';
function hasText(trailer){return trailer.hasText===true||(trailer.hasText!==false&&!!String(trailer.text||'').trim())}
// Apenas recortes já verificados. Uma seleção manual antiga nunca certifica a ausência de letras.
function backgroundRegion(trailer){const source=String(trailer.bookCover||'');let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619);if((hash>>>0)===4022900515&&source.length===124299)return [0,0,.54,.70];if(source==='assets/book-trailers/na-tua-mao.webp')return [0,0,.46,.70];return null}
function markup(trailer){
 const media=videoSource(trailer.youtube);if(!media)return '';
 const cover=imageURL(trailer.bookCover),title=String(trailer.title||'Book Trailer'),native=nativeFilm(media);
 const poster=(cover?'<img src="'+esc(cover)+'" alt="Capa de '+esc(title)+'">':'<span class="trailer-placeholder">Book<br>Trailers</span>')+'<span class="trailer-play">'+play+'</span>';
 return '<div class="trailer-shell">'+
  '<div class="trailer-card"'+(media.id?' data-video-id="'+media.id+'"':'')+' data-video-provider="'+media.provider+'" data-video-source="'+esc(media.embed)+'" data-video-url="'+esc(media.url)+'" data-video-cover="'+esc(cover)+'" role="group" aria-label="Book Trailer: '+esc(title)+'">'+
   '<div class="trailer-stage">'+(native?'<video class="trailer-video" controls playsinline preload="metadata" src="'+esc(native)+'"'+(cover?' poster="'+esc(cover)+'"':'')+' aria-label="Filme: '+esc(title)+'"></video>':'<button class="trailer-poster" type="button" data-trailer-play aria-label="'+(media.provider==='onedrive'?'Abrir leitor do Book Trailer: ':'Reproduzir Book Trailer: ')+esc(title)+'">'+poster+'</button>')+'</div>'+
  '</div>'+
  '<div class="trailer-toolbar" role="group" aria-label="Controlos do Book Trailer">'+
   (native?'<button class="trailer-control" type="button" data-trailer-fullscreen aria-label="Aumentar vídeo" title="Aumentar vídeo" data-tooltip="Aumentar vídeo">':'<a class="trailer-control trailer-open-link" href="'+esc(media.url)+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir vídeo numa nova página" title="Abrir vídeo numa nova página" data-tooltip="Abrir vídeo numa nova página">')+
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>'+(native?'</button>':'</a>')+
   '<button class="trailer-control trailer-restart" type="button" data-trailer-restart aria-label="Reiniciar vídeo" title="Reiniciar vídeo" data-tooltip="Reiniciar vídeo">'+
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>'+
  '</div></div>'
}
function stop(){if(!active)return;const current=active;active=null;if(current.video){current.video.pause();try{current.video.currentTime=0}catch{}}else if(current.el.isConnected)current.el.innerHTML=current.poster;current.el.classList.remove('is-playing')}
function start(el){const video=el.querySelector('video');if(video){try{video.currentTime=0}catch{}video.play().catch(()=>{});return}stop();const media=videoSource(el.dataset.videoSource);if(!media)return;root.RevistaAudio?.pause?.();active={el,poster:el.innerHTML};el.classList.add('is-playing');const frame=document.createElement('iframe');frame.title=el.getAttribute('aria-label')||'Book Trailer';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';const url=new URL(media.embed);if(media.provider==='youtube')url.search=new URLSearchParams({autoplay:'1',playsinline:'1',rel:'0',controls:'1',hl:'pt',origin:location.origin}).toString();frame.src=url.href;el.querySelector('.trailer-stage').replaceChildren(frame);}
document.addEventListener('play',e=>{const video=e.target;if(!video.matches?.('.trailer-video'))return;if(active?.video!==video)stop();root.RevistaAudio?.pause?.();const el=video.closest('.trailer-card')||videoCards.get(video);if(!el)return;active={el,video};el.classList.add('is-playing')},true);
function keepVisible(page){if(!active)return;const sheet=active.el.closest('[data-sheet-index]');if(sheet&&![page,page+1].includes(Number(sheet.dataset.sheetIndex)))stop()}
function expandVideo(video){
 videoCards.set(video,video.closest('.trailer-card'));
 const enlarge=()=>{const stage=video.parentNode,dialog=document.createElement('dialog');dialog.className='trailer-shell trailer-expanded';dialog.setAttribute('aria-label',video.getAttribute('aria-label')||'Vídeo ampliado');const close=document.createElement('button');close.type='button';close.className='trailer-expanded-close';close.textContent='×';close.setAttribute('aria-label','Fechar vídeo ampliado');close.onclick=()=>dialog.close();dialog.append(video,close);document.body.append(dialog);dialog.addEventListener('close',()=>{stage.append(video);dialog.remove()},{once:true});dialog.showModal()};
 if(video.requestFullscreen)video.requestFullscreen().catch(enlarge);else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();else enlarge();
}
// Deixar os controlos internos receberem os eventos antes de os impedir de virar páginas.
const protectedShells=new WeakSet();
function protectPlayers(){document.querySelectorAll('.trailer-shell').forEach(shell=>{if(protectedShells.has(shell))return;protectedShells.add(shell);for(const event of ['pointerdown','pointerup','pointermove','mousedown','mouseup','mousemove','touchstart','touchmove','touchend','keydown','click'])shell.addEventListener(event,e=>e.stopPropagation())})}
new MutationObserver(protectPlayers).observe(document.documentElement,{childList:true,subtree:true});
protectPlayers();
document.addEventListener('click',e=>{
 const shell=e.target.closest?.('.trailer-shell');if(!shell)return;
 if(e.target.matches?.('.trailer-video')||shell.classList.contains('trailer-expanded'))return;
 e.stopPropagation();
 if(e.target.closest('[data-trailer-fullscreen]')){e.preventDefault();const video=shell.querySelector('video');if(video)expandVideo(video);return}
 if(e.target.closest('[data-trailer-play]')||e.target.closest('[data-trailer-restart]')){
  e.preventDefault();
  start(shell.querySelector('.trailer-card'));
 }
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
document.addEventListener('pi-audio-play',stop);
function preparePDF(doc){
 doc.querySelectorAll('.trailer-toolbar').forEach(el=>el.remove());
 doc.querySelectorAll('.trailer-card[data-video-url]').forEach(el=>{const media=videoSource(el.dataset.videoSource);if(!media)return;const cover=el.dataset.videoCover||el.querySelector('video')?.getAttribute('poster')||el.querySelector('img')?.getAttribute('src')||'',title=el.getAttribute('aria-label')||'Book Trailer';el.classList.add('trailer-pdf');el.querySelector('.trailer-stage').innerHTML='<a class="trailer-poster" href="'+esc(media.url)+'" data-pdf-video="true" aria-label="Ver Book Trailer no '+media.label+'">'+(cover?'<img src="'+esc(cover)+'" alt="'+esc(title)+'">':'<span class="trailer-placeholder">Book<br>Trailers</span>')+'<span class="trailer-play">'+play+'</span></a>';el.querySelector('.trailer-actions')?.remove()});
}
function sample(){return {title:'Na Tua Mão',author:'Hélder Teixeira Aguiar',publisher:'Gradiva',youtube:'https://youtube.com/shorts/sQDyC6LcOww',audio:'https://prazeres-interrompidos.github.io/podcast-prazeres-interrompidos/episodios/episodio-ece8baed06f1160adba8/',bookCover:'assets/book-trailers/na-tua-mao.webp',voice:'Isabel Solendo',textAuthor:'Octávio Nuno',section:'Episódios do Nosso Arquivo',hasText:true,text:'',sampleTextPlaceholder:true,bookArtworkRegion:{motifBox:[0,0,.46,.70]}}}
root.RevistaTrailers={videoId,videoSource,markup,stop,keepVisible,sample,sectionTitle,hasText,backgroundRegion,preparePDF};
})(window);
