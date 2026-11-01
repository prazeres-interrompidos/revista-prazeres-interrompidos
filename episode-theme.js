/* Tratamento visual opcional a partir da capa do livro de cada episódio. */
(function(root){
'use strict';
const sample=new URLSearchParams(location.search).get('amostra')==='cartaz';
const cache=new Map();let generation=0,pending=Promise.resolve(),chosen=new Set();
const style=document.createElement('style');style.id='episodeThemeStyles';document.head.append(style);
const luminance=rgb=>rgb.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const blend=(a,b,t)=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));
const hex=rgb=>'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function palette(data,width,height){
 const bins=new Map();
 for(let i=0;i<data.length;i+=4){if(data[i+3]<220)continue;const rgb=[data[i],data[i+1],data[i+2]],hi=Math.max(...rgb),lo=Math.min(...rgb),sat=hi?(hi-lo)/hi:0,light=(hi+lo)/510;
  if(sat<.22||light<.24||light>.82)continue;
  const x=(i/4)%width,y=Math.floor(i/4/width),edge=x<width*.25||x>width*.8||y>height*.65?1.5:1;
  const key=rgb.map(v=>Math.floor(v/32)).join(','),bin=bins.get(key)||{score:0,sum:[0,0,0],count:0};bin.score+=sat*sat*edge;bin.count++;rgb.forEach((v,k)=>bin.sum[k]+=v);bins.set(key,bin);
 }
 const best=[...bins.values()].sort((a,b)=>b.score-a.score)[0];let accent=best?best.sum.map(v=>Math.round(v/best.count)):[83,43,53];
 const paper=blend([250,247,239],accent,.025);while(contrast(accent,paper)<5.5||contrast(accent,[255,255,255])<5.5)accent=accent.map(v=>Math.floor(v*.94));
 return {accent,paper,border:blend(paper,accent,.24),track:blend(paper,accent,.22),player:blend(paper,accent,.07),hover:accent.map(v=>Math.floor(v*.8))};
}
function fingerprint(source){let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619);return hash>>>0}
function referenceFor(article){
 if(typeof article.bookCover==='string'&&article.bookCover.trim())return {source:article.bookCover};
 if(article.imageType==='cover'&&article.cover)return {source:article.cover};
 if(article.cover&&article.bookCoverRegion?.corners?.length===4)return {source:article.cover,region:article.bookCoverRegion};
 // Referência identificada visualmente para esta amostra, limitada ao cartaz verificado.
 if(article.title?.toLowerCase()==='quartas às 10'&&article.cover?.length===238695&&fingerprint(article.cover)===1211833466)return {source:article.cover,region:{corners:[[.467,.444],[.900,.463],[.897,.962],[.467,.910]],motifBox:[0,.44,.78,.50],removeCaption:true}};
 return null;
}
function extractBook(image,region){
 const canvas=document.createElement('canvas');canvas.width=360;canvas.height=552;const context=canvas.getContext('2d',{willReadFrequently:true});
 if(!region){canvas.height=Math.max(1,Math.min(720,Math.round(360*image.naturalHeight/image.naturalWidth)));context.drawImage(image,0,0,canvas.width,canvas.height);return canvas}
 const original=document.createElement('canvas');original.width=image.naturalWidth;original.height=image.naturalHeight;const raw=original.getContext('2d',{willReadFrequently:true});raw.drawImage(image,0,0);const pixels=raw.getImageData(0,0,original.width,original.height).data,out=context.createImageData(canvas.width,canvas.height),points=region.corners;
 if(!points.every(p=>p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1)))throw Error('Região da capa inválida.');
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const u=x/(canvas.width-1),v=y/(canvas.height-1),top=points[0].map((a,k)=>a*(1-u)+points[1][k]*u),bottom=points[3].map((a,k)=>a*(1-u)+points[2][k]*u),sx=Math.min(original.width-1,Math.round((top[0]*(1-v)+bottom[0]*v)*original.width)),sy=Math.min(original.height-1,Math.round((top[1]*(1-v)+bottom[1]*v)*original.height)),from=(sy*original.width+sx)*4,to=(y*canvas.width+x)*4;for(let k=0;k<4;k++)out.data[to+k]=pixels[from+k]}
 context.putImageData(out,0,0);original.width=original.height=1;return canvas;
}
function bookMotif(book,region){
 const box=region?.motifBox||[0,0,1,1],canvas=document.createElement('canvas');canvas.width=320;canvas.height=Math.max(1,Math.min(420,Math.round(320*book.height*box[3]/(book.width*box[2]))));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(book,book.width*box[0],book.height*box[1],book.width*box[2],book.height*box[3],0,0,canvas.width,canvas.height);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){const x=(i/4)%canvas.width,y=Math.floor(i/4/canvas.width),light=(pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722)/255;let alpha=Math.max(0,Math.min(1,(light-.025)/.20));if(region?.removeCaption&&x>canvas.width*.53&&y<canvas.height*.22)alpha=0;const fade=Math.max(0,Math.min(1,x/(canvas.width*.10),(canvas.width-1-x)/(canvas.width*.10),y/(canvas.height*.08),(canvas.height-1-y)/(canvas.height*.08)));pixels.data[i+3]=Math.round(pixels.data[i+3]*alpha*fade)}ctx.putImageData(pixels,0,0);const motif=canvas.toDataURL('image/webp',.8);canvas.width=canvas.height=1;return motif;
}
function imageTheme(reference){
 const key=reference.source+JSON.stringify(reference.region||null);if(cache.has(key))return cache.get(key);
 const promise=new Promise(resolve=>{
  const image=new Image();let finished=false;const fallback=()=>{if(finished)return;finished=true;clearTimeout(timer);resolve({...palette(new Uint8ClampedArray(0),1,1),motif:''})};
  const timer=setTimeout(fallback,10000);image.onload=()=>{if(finished)return;try{
   const book=extractBook(image,reference.region),sample=document.createElement('canvas');sample.width=64;sample.height=88;const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(book,0,0,64,88);const colors=palette(ctx.getImageData(0,0,64,88).data,64,88),motif=bookMotif(book,reference.region);book.width=book.height=sample.width=sample.height=1;
   finished=true;clearTimeout(timer);resolve({...colors,motif});
  }catch{fallback()}};image.onerror=fallback;if(!/^data:/i.test(reference.source))image.crossOrigin='anonymous';image.src=reference.source;
 });cache.set(key,promise);return promise;
}
function cssFor(index,theme){
 const vars=Object.entries({wine:theme.accent,'episode-paper':theme.paper,'episode-border':theme.border,'episode-track':theme.track,'episode-player':theme.player,'episode-hover':theme.hover}).map(([key,rgb])=>'--'+key+':'+hex(rgb)).join(';');
 return '.episode-theme-'+index+'{'+vars+';--episode-motif:'+(theme.motif?'url("'+theme.motif+'")':'none')+'}';
}
function start(pages,articles){
 const current=++generation;style.textContent='';style.dataset.ready='false';const sampleIndex=sample?articles.findIndex(a=>referenceFor(a)):-1;
 chosen=new Set(articles.map((a,i)=>typeof a.bookCover==='string'&&a.bookCover.trim()||i===sampleIndex?i:-1).filter(i=>i>=0));
 if(!chosen.size){pending=Promise.resolve();style.dataset.ready='true';return}
 for(const p of pages){const index=articles.indexOf(p.article);if(!chosen.has(index))continue;p.themeClass='episode-themed episode-theme-'+index;if(p.cls!=='poster-page')p.content='<div class="episode-decoration" aria-hidden="true"><span class="episode-motif episode-motif-left"></span><span class="episode-motif episode-motif-right"></span><span class="episode-motif-base"></span><span class="episode-edge"></span></div>'+p.content}
 pending=Promise.all([...chosen].map(async index=>[index,await imageTheme(referenceFor(articles[index]))])).then(themes=>{if(current!==generation)return;style.textContent=themes.map(([index,theme])=>cssFor(index,theme)).join('\n');style.dataset.ready='true'});
}
function layout(pages,book){
 book.querySelectorAll('.episode-themed .page-inner').forEach(inner=>{const decoration=inner.querySelector('.episode-decoration'),folio=inner.querySelector(':scope > .folio');if(!decoration||!folio)return;
 const occupied=[...inner.querySelectorAll(':scope > .eyebrow,:scope > h2,:scope > .text-block,:scope > .article-credits,:scope > .mini-player,:scope > .listen,:scope > .note')].reduce((bottom,el)=>Math.max(bottom,el.offsetTop+el.offsetHeight),0),free=Math.max(0,folio.offsetTop-occupied-14),height=free>=60?Math.min(240,free+80):0,bottom=Math.max(0,640-folio.offsetTop+9),index=Number(inner.parentElement.dataset.sheetIndex),value='--episode-motif-height:'+height+'px;--episode-motif-bottom:'+bottom+'px';
 decoration.setAttribute('style',value);pages[index].content=pages[index].content.replace('class="episode-decoration" aria-hidden="true"','class="episode-decoration" aria-hidden="true" style="'+value+'"');
 });
}
function reading(container,article,articles){container.classList.remove('episode-themed',...Array.from(container.classList).filter(c=>c.startsWith('episode-theme-')));const index=articles.indexOf(article);if(chosen.has(index))container.classList.add('episode-themed','episode-theme-'+index)}
root.RevistaTheme={start,layout,reading,ready:()=>pending,css:()=>style.textContent};
})(window);
