/* Player da revista: as ligações vêm sempre dos dados da edição aberta. */
(function(root){
'use strict';
const FEED='https://anchor.fm/s/9fd320a8/podcast/rss';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const http=(value,base=location.href)=>{if(typeof value!=='string'||!value.trim())return '';try{const u=new URL(value,base);return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const identity=url=>String(url).match(/\/podcast\/play\/(\d+)/)?.[1]||'';
const direct=url=>/\.(?:mp3|m4a|ogg|wav|aac)(?:[?#]|$)/i.test(url);
const clock=n=>Number.isFinite(n)&&n>=0?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'--:--';
const duration=s=>/^\d+(?::\d+){0,2}$/.test(s||'')?String(s).split(':').reduce((n,p)=>n*60+Number(p),0):0;
const key=a=>JSON.stringify([a?.audio||'',a?.title||'',a?.voice||'',a?.author||'']);
const states=new Map();let articles=[],rssPromise,active='',busy=false;
const audio=document.createElement('audio');audio.preload='none';audio.hidden=true;document.body.append(audio);
const playIcon='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4.5v11l9-5.5z" fill="currentColor"/></svg>';
const pauseIcon='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h3v12H6zm5 0h3v12h-3z" fill="currentColor"/></svg>';
function markup(article,index,extraClass=''){
 if(!http(article?.audio))return '';
 return '<div class="mini-player '+esc(extraClass)+'" role="group" aria-label="Áudio: '+esc(article.title)+'" data-episode-index="'+index+'" data-state="loading" aria-busy="true"><button type="button" class="mini-play" aria-label="Reproduzir episódio" disabled>'+playIcon+'</button><input class="mini-range" type="range" min="0" max="1000" value="0" step="1" aria-label="Posição no episódio" disabled><span class="mini-time">0:00 / --:--</span><a class="mini-fallback" href="'+esc(http(article.audio))+'" target="_blank" rel="noopener" hidden>Abrir episódio ↗</a><span class="mini-status" role="status" aria-live="polite"></span></div>';
}
async function readRSS(){
 if(!rssPromise)rssPromise=(async()=>{
  const response=await fetch(FEED,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Feed indisponível.');
  const xml=new DOMParser().parseFromString(await response.text(),'application/xml');if(xml.querySelector('parsererror'))throw Error('Feed inválido.');
  return [...xml.querySelectorAll('item')].map(item=>({url:http(item.querySelector('enclosure')?.getAttribute('url')),link:http(item.querySelector('link')?.textContent),guid:item.querySelector('guid')?.textContent||'',title:norm(item.querySelector('title')?.textContent),description:norm(item.querySelector('description')?.textContent),duration:duration(item.getElementsByTagNameNS('*','duration')[0]?.textContent)})).filter(item=>item.url);
 })().catch(error=>{rssPromise=null;throw error});
 return rssPromise;
}
function matchRSS(items,article){
 const url=http(article.audio),id=identity(url);
 const exact=items.filter(item=>item.url===url||item.link===url||item.guid===url||(id&&identity(item.url)===id));if(exact.length===1)return exact[0];
 const title=norm(article.title),voice=norm(article.voice),author=norm(article.author);if(title.length<4)return null;
 const found=items.filter(item=>item.title.includes(title)&&(!voice||(item.title+' '+item.description).includes(voice))&&(!author||(item.title+' '+item.description).includes(author))&&(voice||author||item.title===title));
 return found.length===1?found[0]:null;
}
async function fromPage(article){
 const url=http(article.audio),response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Página indisponível.');
 const doc=new DOMParser().parseFromString(await response.text(),'text/html');
 const node=doc.querySelector('audio[src],audio source[src],meta[property="og:audio"],meta[property="og:audio:url"],meta[name="twitter:player:stream"]');
 const source=http(node?.getAttribute('src')||node?.getAttribute('content'),url);if(!source||!direct(source))throw Error('Sem ligação MP3.');
 return {url:source,duration:0};
}
function resolve(article){
 const url=http(article.audio);if(!url)return Promise.reject(Error('Sem ligação áudio.'));
 if(direct(url))return Promise.resolve({url,duration:0});
 return Promise.any([readRSS().then(items=>{const item=matchRSS(items,article);if(!item)throw Error('Episódio não identificado no feed.');return item}),fromPage(article)]);
}
function prepareOne(index){
 const article=articles[index];if(!article?.audio)return;
 const id=key(article);if(states.has(id)){sync();return}
 const state={status:'loading',url:'',duration:0};states.set(id,state);sync();
 resolve(article).then(result=>{Object.assign(state,result,{status:'ready'});sync()}).catch(()=>{state.status='error';sync()});
}
function prepare(container){container?.querySelectorAll('.mini-player[data-episode-index]').forEach(el=>prepareOne(Number(el.dataset.episodeIndex)))}
function prepareVisible(book,page){book?.querySelectorAll('[data-sheet-index]').forEach(sheet=>{const n=Number(sheet.dataset.sheetIndex);if(n===page||n===page+1)prepare(sheet)})}
function sync(){
 document.querySelectorAll('.mini-player[data-episode-index]').forEach(el=>{
  const a=articles[Number(el.dataset.episodeIndex)];if(!a)return;const id=key(a),state=states.get(id),current=id===active,playing=current&&!audio.paused;
  const status=state?.status||'loading';el.dataset.state=status;el.setAttribute('aria-busy',String(status==='loading'||(current&&busy)));
  const button=el.querySelector('.mini-play');button.disabled=status!=='ready';button.setAttribute('aria-label',playing?'Pausar episódio':'Reproduzir episódio');button.setAttribute('aria-pressed',String(playing));button.innerHTML=playing?pauseIcon:playIcon;
  const total=current&&Number.isFinite(audio.duration)?audio.duration:state?.duration||0,time=current?audio.currentTime:0,percent=total?Math.max(0,Math.min(100,time/total*100)):0;
  const range=el.querySelector('.mini-range');range.disabled=!(current&&total);range.value=Math.round(percent*10);range.style.setProperty('--progress',percent+'%');range.setAttribute('aria-valuetext',clock(time)+' de '+clock(total));
  el.querySelector('.mini-time').textContent=clock(time)+' / '+(total?clock(total):'--:--');el.querySelector('.mini-fallback').hidden=status!=='error';
  const message=status==='loading'?'A preparar o áudio…':status==='error'?'Não foi possível carregar o áudio. Use «Abrir episódio».':'';
  const notice=el.querySelector('.mini-status');if(notice.textContent!==message)notice.textContent=message;
 });
}
function toggle(index){
 const a=articles[index],id=key(a),state=states.get(id);if(state?.status!=='ready')return;
 if(id===active&&!audio.paused){audio.pause();return}
 if(id!==active){audio.pause();active=id;audio.src=state.url}
 busy=true;sync();audio.play().catch(error=>{busy=false;if(error.name!=='NotAllowedError'&&error.name!=='AbortError')state.status='error';sync()});
}
function setArticles(list){audio.pause();audio.removeAttribute('src');audio.load();active='';busy=false;articles=list||[];sync()}
for(const event of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchmove','touchend','keydown'])document.addEventListener(event,e=>{if(e.target.closest?.('.mini-player'))e.stopPropagation()},true);
document.addEventListener('click',e=>{const player=e.target.closest?.('.mini-player');if(!player)return;e.stopPropagation();if(e.target.closest('.mini-play')){e.preventDefault();toggle(Number(player.dataset.episodeIndex))}},true);
document.addEventListener('input',e=>{if(!e.target.matches('.mini-range'))return;e.stopPropagation();const a=articles[Number(e.target.closest('.mini-player').dataset.episodeIndex)];if(key(a)===active&&Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value)/1000*audio.duration},true);
for(const event of ['play','pause','timeupdate','durationchange','loadedmetadata','ended'])audio.addEventListener(event,sync);
audio.addEventListener('waiting',()=>{busy=true;sync()});audio.addEventListener('playing',()=>{busy=false;sync()});audio.addEventListener('canplay',()=>{busy=false;sync()});
audio.addEventListener('error',()=>{if(!active)return;const state=states.get(active);if(state)state.status='error';busy=false;sync()});
root.RevistaAudio={markup,setArticles,prepare,prepareVisible};
})(window);
