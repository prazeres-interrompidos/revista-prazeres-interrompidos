/* Tratamento visual opcional a partir da capa do livro de cada episódio. */
(function(root){
'use strict';
const sample=new URLSearchParams(location.search).get('amostra')==='cartaz';
const artworkMap={"1093108667:43799":{"source":"assets/book-artwork/corpo-verificado.webp"},"3812874389:76959":{"source":"assets/book-artwork/ines-verificado.webp"},"3510652349:148759":{"source":"assets/book-artwork/3510652349.webp"},"1343692005:43963":{"source":"assets/book-artwork/1343692005.webp"},"2918103637:87571":{"source":"assets/book-artwork/2918103637.webp"},"28891024:72755":{"source":"assets/book-artwork/28891024.webp"},"1750873742:148663":{"source":"assets/book-artwork/1750873742.webp"},"901162737:39871":{"source":"assets/book-artwork/901162737.webp"},"690810783:57667":{"motifBox":[0,0.285,1,0.53],"preserveFrame":true},"3076083755:167619":{"source":"assets/book-artwork/3076083755.webp"},"1381216907:74963":{"source":"assets/book-artwork/1381216907.webp"},"1182233264:150875":{"source":"assets/book-artwork/1182233264.webp"}};
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
 const paper=blend([250,247,239],accent,.025),darkestPaper=blend(paper,[0,0,0],.24);while(contrast(accent,paper)<5.5||contrast(accent,darkestPaper)<4.5||contrast(accent,[255,255,255])<5.5)accent=accent.map(v=>Math.floor(v*.94));
 return {accent,paper,border:blend(paper,accent,.24),track:blend(paper,accent,.22),player:blend(paper,accent,.07),hover:accent.map(v=>Math.floor(v*.8))};
}
function fingerprint(source){let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619);return hash>>>0}
function artworkReference(source,region){return {source,region,artwork:artworkMap[fingerprint(source)+':'+source.length]}}
function referenceFor(article){
 if(typeof article.bookCover==='string'&&article.bookCover.trim()){const ref=artworkReference(article.bookCover);ref.metadata=[article.title,article.author,article.publisher].filter(Boolean).join(' ');if(article.backgroundWithLetters===true){ref.withLetters=true;ref.artwork={source:article.bookCover}}else if(!ref.artwork){if(root.RevistaArtwork?.valid(article))ref.artwork={source:article.automaticArtwork.image};else {const box=root.RevistaTrailers?.backgroundRegion(article);if(box)ref.artwork={motifBox:box};else ref.automatic=true}}return ref;}
 if(article.imageType==='cover'&&article.cover)return artworkReference(article.cover);
 if(article.cover&&article.bookCoverRegion?.corners?.length===4)return artworkReference(article.cover,article.bookCoverRegion);
 // Referência identificada visualmente, limitada ao cartaz verificado.
 if(article.title?.toLowerCase()==='quartas às 10'&&article.cover?.length===238695&&fingerprint(article.cover)===1211833466)return artworkReference(article.cover,{corners:[[.467,.444],[.900,.463],[.897,.962],[.467,.910]],motifBox:[0,.44,.78,.50],removeCaption:true});
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
// Os ajustes afetam apenas a imagem de fundo; texto e leitores mantêm a sua apresentação.
function adjustments(article){const raw=article?.backgroundAdjustments||{},number=(key,fallback,min,max)=>{const value=Number(raw[key]);return Number.isFinite(value)&&raw[key]!==undefined?Math.max(min,Math.min(max,value)):fallback};return {transparency:number('transparency',76,0,100),brightness:number('brightness',100,50,150),contrast:number('contrast',100,50,150),sharpness:number('sharpness',0,0,100),color:raw.color==='grayscale'?'grayscale':'color'}}
function filterFor(settings){return 'brightness('+(settings.brightness/100)+') contrast('+(settings.contrast/100)+') saturate(1.12) grayscale('+(settings.color==='grayscale'?1:0)+')'}
function sharpen(pixels,width,height,strength){const source=new Uint8ClampedArray(pixels),amount=strength/100*.35;for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=(y*width+x)*4;for(let c=0;c<3;c++)pixels[i+c]=source[i+c]+amount*(4*source[i+c]-source[i-4+c]-source[i+4+c]-source[i-width*4+c]-source[i+width*4+c])}return pixels}
function bookMotif(book,region,sharpness=0){
 const box=region?.motifBox||[0,0,1,1],canvas=document.createElement('canvas');canvas.width=320;canvas.height=Math.max(1,Math.min(720,Math.round(320*book.height*(region?.preserveFrame?1:box[3]/box[2])/book.width)));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(book,book.width*box[0],book.height*box[1],book.width*box[2],book.height*box[3],region?.preserveFrame?canvas.width*box[0]:0,region?.preserveFrame?canvas.height*box[1]:0,region?.preserveFrame?canvas.width*box[2]:canvas.width,region?.preserveFrame?canvas.height*box[3]:canvas.height);
 // A transparência é uniforme e pertence à página. Retirar os tons escuros da
 // imagem criava buracos claros nos motivos e contornos brancos junto às margens.
 if(region?.removeCaption){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let y=0;y<canvas.height*.22;y++)for(let x=Math.ceil(canvas.width*.53);x<canvas.width;x++)pixels.data[(y*canvas.width+x)*4+3]=0;ctx.putImageData(pixels,0,0)}
 if(sharpness>0){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);sharpen(pixels.data,canvas.width,canvas.height,sharpness);ctx.putImageData(pixels,0,0)}
 const motif=canvas.toDataURL('image/webp',.8);canvas.width=canvas.height=1;return motif;
}
function loadImage(source){return new Promise(resolve=>{const image=new Image();let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value)},timer=setTimeout(()=>finish(null),10000);image.onload=()=>finish(image);image.onerror=()=>finish(null);if(!/^data:/i.test(source))image.crossOrigin='anonymous';image.src=source})}
function imageTheme(reference,sharpness=0){
 const key=JSON.stringify([reference,sharpness]);if(cache.has(key))return cache.get(key);
 const promise=(async()=>{const fallback={...palette(new Uint8ClampedArray(0),1,1),motif:''};try{
  const image=await loadImage(reference.source);if(!image)return fallback;
  const book=extractBook(image,reference.region),sample=document.createElement('canvas');sample.width=64;sample.height=88;const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(book,0,0,64,88);const colors=palette(ctx.getImageData(0,0,64,88).data,64,88);let motif='';
  if(reference.withLetters)motif=bookMotif(book,{keepInk:true},sharpness);
  else if(reference.artwork?.source){const cleanImage=await loadImage(reference.artwork.source);if(cleanImage){const clean=extractBook(cleanImage);motif=bookMotif(clean,null,sharpness);clean.width=clean.height=1}}
  else if(reference.artwork?.motifBox)motif=bookMotif(book,reference.artwork,sharpness);
  else if(reference.region?.removeCaption)motif=bookMotif(book,reference.region,sharpness);
  else if(reference.automatic&&root.RevistaArtwork){try{const prepared=await root.RevistaArtwork.prepare(reference.source,reference.metadata);const cleanImage=await loadImage(prepared.image);if(cleanImage){const clean=extractBook(cleanImage);motif=bookMotif(clean,null,sharpness);clean.width=clean.height=1}}catch(error){console.warn(error.message)}}
  book.width=book.height=sample.width=sample.height=1;return {...colors,motif};
 }catch{return fallback}})();cache.set(key,promise);return promise;
}
function cssFor(index,theme,article){
 const settings=adjustments(article);
 const vars=Object.entries({wine:theme.accent,'episode-paper':theme.paper,'episode-border':theme.border,'episode-track':theme.track,'episode-player':theme.player,'episode-hover':theme.hover}).map(([key,rgb])=>'--'+key+':'+hex(rgb)).join(';');
 return '.episode-theme-'+index+'{'+vars+';--episode-opacity:'+((100-settings.transparency)/100)+';--episode-filter:'+filterFor(settings)+';--episode-motif:'+(theme.motif?'url("'+theme.motif+'")':'none')+'}';
}
function start(pages,articles){
 const current=++generation;style.textContent='';style.dataset.ready='false';const sampleIndex=sample?articles.findIndex(a=>referenceFor(a)):-1;
 chosen=new Set(articles.map((a,i)=>typeof a.bookCover==='string'&&a.bookCover.trim()||i===sampleIndex?i:-1).filter(i=>i>=0));
 if(!chosen.size){pending=Promise.resolve();style.dataset.ready='true';return}
 for(const p of pages){const index=articles.indexOf(p.article);if(!chosen.has(index))continue;p.themeClass='episode-themed episode-theme-'+index;if(p.cls!=='poster-page')p.content='<div class="episode-decoration" aria-hidden="true"><span class="episode-motif-base"></span></div>'+p.content}
 pending=Promise.all([...chosen].map(async index=>[index,await imageTheme(referenceFor(articles[index]),adjustments(articles[index]).sharpness)])).then(themes=>{if(current!==generation)return;style.textContent=themes.map(([index,theme])=>cssFor(index,theme,articles[index])).join('\n');style.dataset.ready='true'});
}
function reading(container,article,articles){container.classList.remove('episode-themed',...Array.from(container.classList).filter(c=>c.startsWith('episode-theme-')));const index=articles.indexOf(article);if(chosen.has(index))container.classList.add('episode-themed','episode-theme-'+index)}
async function prepareArticle(article,notify){const ref=referenceFor(article);if(!ref?.automatic)return;const source=article.bookCover,result=await root.RevistaArtwork.prepare(source,ref.metadata,notify);if(article.bookCover===source&&article.backgroundWithLetters!==true){article.automaticArtwork=result;delete article.bookArtworkRegion;delete article.bookArtwork}}
async function preview(article){const ref=referenceFor(article);if(!ref)return null;const theme=await imageTheme(ref,adjustments(article).sharpness);return {motif:theme.motif,paper:hex(theme.paper)}}
root.RevistaTheme={start,reading,prepareArticle,adjustments,filterFor,preview,sharpen,isPrepared:article=>!!referenceFor(article)?.artwork,ready:()=>pending,css:()=>style.textContent};
})(window);
