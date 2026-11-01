/* Amostra automática do tratamento visual a partir do cartaz de um episódio. */
(function(root){
'use strict';
const sample=new URLSearchParams(location.search).get('amostra')==='cartaz';
const cache=new Map();let generation=0,pending=Promise.resolve(),chosen=-1;
const style=document.createElement('style');style.id='episodeThemeStyles';document.head.append(style);
const luminance=rgb=>rgb.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const blend=(a,b,t)=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));
const hex=rgb=>'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function palette(data,width,height){
 const bins=new Map();
 for(let i=0;i<data.length;i+=4){if(data[i+3]<220)continue;const rgb=[data[i],data[i+1],data[i+2]],hi=Math.max(...rgb),lo=Math.min(...rgb),sat=hi?(hi-lo)/hi:0,light=(hi+lo)/510;
  if(sat<.22||light<.1||light>.82)continue;
  const x=(i/4)%width,y=Math.floor(i/4/width),edge=x<width*.25||x>width*.8||y>height*.65?1.5:1;
  const key=rgb.map(v=>Math.floor(v/32)).join(','),bin=bins.get(key)||{score:0,sum:[0,0,0],count:0};bin.score+=sat*sat*edge;bin.count++;rgb.forEach((v,k)=>bin.sum[k]+=v);bins.set(key,bin);
 }
 const best=[...bins.values()].sort((a,b)=>b.score-a.score)[0];let accent=best?best.sum.map(v=>Math.round(v/best.count)):[83,43,53];
 const paper=blend([250,247,239],accent,.025);while(contrast(accent,paper)<5.5||contrast(accent,[255,255,255])<5.5)accent=accent.map(v=>Math.floor(v*.94));
 return {accent,paper,border:blend(paper,accent,.24),track:blend(paper,accent,.22),player:blend(paper,accent,.07),hover:accent.map(v=>Math.floor(v*.8))};
}
function imageTheme(source){
 if(cache.has(source))return cache.get(source);
 const promise=new Promise(resolve=>{
  const image=new Image();let finished=false;const fallback=()=>{if(finished)return;finished=true;clearTimeout(timer);resolve({...palette(new Uint8ClampedArray(0),1,1),motif:''})};
  const timer=setTimeout(fallback,10000);image.onload=()=>{if(finished)return;try{
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=88;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,64,88);const colors=palette(ctx.getImageData(0,0,64,88).data,64,88);
   canvas.width=160;canvas.height=Math.max(1,Math.round(160*image.naturalHeight/image.naturalWidth));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const motif=canvas.toDataURL('image/webp',.55);canvas.width=canvas.height=1;
   finished=true;clearTimeout(timer);resolve({...colors,motif});
  }catch{fallback()}};image.onerror=fallback;if(!/^data:/i.test(source))image.crossOrigin='anonymous';image.src=source;
 });cache.set(source,promise);return promise;
}
function cssFor(index,theme){
 const vars=Object.entries({wine:theme.accent,'episode-paper':theme.paper,'episode-border':theme.border,'episode-track':theme.track,'episode-player':theme.player,'episode-hover':theme.hover}).map(([key,rgb])=>'--'+key+':'+hex(rgb)).join(';');
 return '.episode-theme-'+index+'{'+vars+';--episode-motif:'+(theme.motif?'url("'+theme.motif+'")':'none')+'}';
}
function start(pages,articles){
 const current=++generation;style.textContent='';style.dataset.ready='false';chosen=sample?articles.findIndex(a=>a.cover&&a.imageType==='poster'):-1;
 if(chosen<0){pending=Promise.resolve();style.dataset.ready='true';return}
 for(const p of pages){if(p.article!==articles[chosen])continue;p.themeClass='episode-themed episode-theme-'+chosen;if(p.cls!=='poster-page')p.content='<div class="episode-decoration" aria-hidden="true"><span class="episode-motif episode-motif-left"></span><span class="episode-motif episode-motif-right"></span><span class="episode-edge"></span></div>'+p.content}
 pending=imageTheme(articles[chosen].cover).then(theme=>{if(current!==generation)return;style.textContent=cssFor(chosen,theme);style.dataset.ready='true'});
}
function reading(container,article,articles){container.classList.remove('episode-themed',...Array.from(container.classList).filter(c=>c.startsWith('episode-theme-')));if(sample&&chosen>=0&&article===articles[chosen])container.classList.add('episode-themed','episode-theme-'+chosen)}
root.RevistaTheme={start,reading,ready:()=>pending,css:()=>style.textContent};
})(window);
