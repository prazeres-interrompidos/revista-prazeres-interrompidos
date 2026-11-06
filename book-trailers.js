/* Book Trailers: apresentação local e reprodução através do player oficial. */
(function(root){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const play='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
let active=null;
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
function markup(trailer){const media=videoSource(trailer.youtube);if(!media)return '';const cover=imageURL(trailer.bookCover),title=String(trailer.title||'Book Trailer');return '<div class="trailer-card"'+(media.id?' data-video-id="'+media.id+'"':'')+' data-video-provider="'+media.provider+'" data-video-source="'+esc(media.embed)+'" data-video-url="'+esc(media.url)+'" role="group" aria-label="Book Trailer: '+esc(title)+'"><div class="trailer-stage"><button class="trailer-poster" type="button" data-trailer-play aria-label="'+(media.provider==='onedrive'?'Abrir leitor do Book Trailer: ':'Reproduzir Book Trailer: ')+esc(title)+'">'+(cover?'<img src="'+esc(cover)+'" alt="Capa de '+esc(title)+'">':'<span class="trailer-placeholder">Book<br>Trailers</span>')+'<span class="trailer-play">'+play+'</span></button></div></div>'}
function stop(){if(!active)return;const current=active;active=null;if(current.el.isConnected){current.el.innerHTML=current.poster;current.el.classList.remove('is-playing')}}
function start(el){stop();const media=videoSource(el.dataset.videoSource);if(!media)return;root.RevistaAudio?.pause?.();active={el,poster:el.innerHTML};el.classList.add('is-playing');const frame=document.createElement('iframe');frame.title=el.getAttribute('aria-label')||'Book Trailer';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';const url=new URL(media.embed);if(media.provider==='youtube')url.search=new URLSearchParams({autoplay:'1',playsinline:'1',rel:'0',controls:'1',hl:'pt',origin:location.origin}).toString();frame.src=url.href;el.querySelector('.trailer-stage').replaceChildren(frame);}
function keepVisible(page){if(!active)return;const sheet=active.el.closest('[data-sheet-index]');if(sheet&&![page,page+1].includes(Number(sheet.dataset.sheetIndex)))stop()}
for(const event of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchmove','touchend','keydown'])document.addEventListener(event,e=>{if(e.target.closest?.('.trailer-card'))e.stopPropagation()},true);
document.addEventListener('click',e=>{const el=e.target.closest?.('.trailer-card');if(!el)return;e.stopPropagation();if(e.target.closest('[data-trailer-play]')){e.preventDefault();start(el)}},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
document.addEventListener('pi-audio-play',stop);
function sample(){return {title:'Na Tua Mão',author:'Hélder Teixeira Aguiar',publisher:'Gradiva',youtube:'https://youtube.com/shorts/sQDyC6LcOww',audio:'https://prazeres-interrompidos.github.io/podcast-prazeres-interrompidos/episodios/episodio-ece8baed06f1160adba8/',bookCover:'assets/book-trailers/na-tua-mao.webp',voice:'Isabel Solendo',textAuthor:'Octávio Nuno',section:'Episódios do Nosso Arquivo',hasText:true,text:'',sampleTextPlaceholder:true,bookArtworkRegion:{motifBox:[0,0,.46,.70]}}}
root.RevistaTrailers={videoId,videoSource,markup,stop,keepVisible,sample,sectionTitle,hasText,backgroundRegion};
})(window);
