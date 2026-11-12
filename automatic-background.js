/* Preparação local da ilustração: OCR e reconstrução dos espaços ocupados por letras. */
(function(root){
'use strict';
const version=7,jobs=new Map();let workerPromise,queue=Promise.resolve(),databasePromise;
const fingerprint=source=>{let h=2166136261;for(let i=0;i<source.length;i++)h=Math.imul(h^source.charCodeAt(i),16777619);return (h>>>0)+':'+source.length};
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z]/g,'');
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]!==b[j-1]));row=next}return row[b.length]}
// Os limites das palavras são mais seguros do que o retângulo da linha inteira:
// o OCR pode juntar uma palavra à ilustração que fica por baixo dela.
function textBoxes(data,metadata,width,height,frameHeight=height){
 const tokens=String(metadata||'').split(/\s+/).map(normalize).filter(s=>s.length>=1),boxes=[];
 const matches=s=>s.length>=3&&tokens.some(t=>Math.min(s.length,t.length)/Math.max(s.length,t.length)>=.7&&distance(s,t)<=(t.length<=5?1:Math.min(4,Math.ceil(t.length*.34)))||(s.length>=5&&t.includes(s)));
 const boxFor=(b,pad,side=pad)=>[Math.max(0,b.x0-side),Math.max(0,b.y0-pad),Math.min(width,b.x1+side),Math.min(height,b.y1+pad)];
 for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){
  const words=(line.words||[]).map(w=>({...w,plain:normalize(w.text)})),anchors=words.filter(w=>{const h=w.bbox.y1-w.bbox.y0;return w.plain!=='VOL'&&h<=frameHeight*.22&&(matches(w.plain)||(w.plain.length>=3&&w.confidence>=60&&w.bbox.x1-w.bbox.x0>=h*1.6))});
  if(anchors.length){
   const shortAnchors=words.filter(w=>w.plain.length===2&&w.confidence>=60&&tokens.includes(w.plain)&&w.bbox.y1-w.bbox.y0<=frameHeight*.22);anchors.push(...shortAnchors);
   const anchor=anchors.reduce((a,b)=>(a.bbox.y1-a.bbox.y0)<(b.bbox.y1-b.bbox.y0)?a:b),h=anchor.bbox.y1-anchor.bbox.y0,aligned=[];
   for(const word of words){if(word.plain.length<2&&!(word.confidence>=60&&tokens.includes(word.plain)))continue;const b={...word.bbox},overlap=Math.min(b.y1,anchor.bbox.y1)-Math.max(b.y0,anchor.bbox.y0);if(overlap<h*.55)continue;
    if(b.y1-b.y0>h*1.55){b.y0=anchor.bbox.y0;b.y1=anchor.bbox.y1}
    if(b.y1-b.y0>frameHeight*.24||(b.x1-b.x0)*(b.y1-b.y0)>width*height*.18)continue;aligned.push(b);
   }
   aligned.sort((a,b)=>a.x0-b.x0);let merged;
   for(const b of aligned){if(merged&&b.x0-merged.x1<h*3){merged.x1=Math.max(merged.x1,b.x1);merged.y0=Math.min(merged.y0,b.y0);merged.y1=Math.max(merged.y1,b.y1)}else{if(merged)boxes.push(boxFor(merged,Math.max(1,h*.12),Math.max(1,h*.85)));merged={...b}}}
   if(merged)boxes.push(boxFor(merged,Math.max(1,h*.12),Math.max(1,h*.85)));
  }else for(const word of words){const b=word.bbox,h=b.y1-b.y0,w=b.x1-b.x0;
   if(word.plain==='VOL'&&word.confidence>=60){boxes.push(boxFor({x0:b.x0-h*1.5,y0:b.y0-h,x1:b.x1,y1:b.y1},Math.max(1,h*.12)));continue}
   if(word.plain.length>=3&&word.confidence>=60&&h<=frameHeight*.22&&w>=h*1.6)boxes.push(boxFor(b,Math.max(1,h*.12)));
  }
 }
 return boxes;
}
// Extra candidates are opt-in; the conservative automatic pass above stays unchanged.
function reinforcedTextBoxes(data,metadata,width,height,frameHeight=height,topOffset=0){
 const tokens=String(metadata||'').split(/\s+/).map(normalize).filter(Boolean),numbers=String(metadata||'').match(/\d{2,}/g)||[],boxes=textBoxes(data,metadata,width,height,frameHeight);
 for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])for(const word of line.words||[]){
  const plain=normalize(word.text),b=word.bbox;if(!b||![b.x0,b.y0,b.x1,b.y1].every(Number.isFinite))continue;
  const w=b.x1-b.x0,h=b.y1-b.y0;
  const single=(plain.length===1&&tokens.includes(plain)||/^[oO0][–—-]?$/.test(String(word.text).trim())&&tokens.includes('O'))&&word.confidence>=65&&h<=frameHeight*.08&&b.y0+topOffset<frameHeight*.5&&w<=h*3.5;
  const digits=String(word.text).replace(/\D/g,''),numeric=digits.length>=2&&word.confidence>=45&&(numbers.includes(digits)||numbers.join('')===digits);
  const known=single||numeric||plain.length>=2&&tokens.some(token=>token===plain||plain.length>=4&&Math.min(plain.length,token.length)/Math.max(plain.length,token.length)>=.65&&distance(plain,token)<=Math.min(3,Math.ceil(token.length*.25)));
  if(w<=0||h<=0||h>frameHeight*(known?.36:.18)||w*h>width*height*(known?.35:.08))continue;
  if(!(known&&word.confidence>=15||plain.length>=3&&word.confidence>=45&&w>=h*1.2))continue;
  const pad=Math.max(2,h*.2);
  boxes.push([Math.max(0,b.x0-pad),Math.max(0,b.y0-pad),Math.min(width,b.x1+pad),Math.min(height,b.y1+pad)]);
  if(single)for(const next of line.words||[]){const n=next.bbox;if(n&&/^[–—-]+$/.test(String(next.text).trim())&&n.x0>=b.x1&&n.x0-b.x1<h*2&&Math.abs((n.y0+n.y1-b.y0-b.y1)/2)<h)boxes.push([Math.max(0,b.x0-pad),Math.max(0,b.y0-pad),Math.min(width,n.x1+pad),Math.min(height,b.y1+pad)]);}
 }
 return boxes;
}
function adaptivePixels(pixels,width,height,light=false){
 const stride=width+1,integral=new Uint32Array(stride*(height+1)),gray=new Uint8Array(width*height),output=new Uint8ClampedArray(pixels.length);
 for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){
  const i=y*width+x;gray[i]=Math.round(pixels[i*4]*.299+pixels[i*4+1]*.587+pixels[i*4+2]*.114);row+=gray[i];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row;
 }}
 const radius=Math.max(12,Math.round(width/30));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const x0=Math.max(0,x-radius),x1=Math.min(width,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(height,y+radius+1);
  const mean=(integral[y1*stride+x1]-integral[y0*stride+x1]-integral[y1*stride+x0]+integral[y0*stride+x0])/((x1-x0)*(y1-y0));
  const i=y*width+x,value=(light?gray[i]>mean+12:gray[i]<mean-12)?0:255;
  output[i*4]=output[i*4+1]=output[i*4+2]=value;output[i*4+3]=255;
 }
 return output;
}
// Small publisher marks can be a closed letter next to a dash, rather than an OCR word.
function captionMarkBoxes(binary,width,height){
 const limit=Math.min(height,Math.ceil(height*.45)),visited=new Uint8Array(width*limit),components=[],boxes=[];
 for(let y=0;y<limit;y++)for(let x=0;x<width;x++){
  const start=y*width+x;if(visited[start]||binary[start*4]>0)continue;
  const pixels=[start];visited[start]=1;let x0=x,x1=x,y0=y,y1=y;
  for(let head=0;head<pixels.length;head++){
   const i=pixels[head],px=i%width,py=Math.floor(i/width);x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=px+dx,ny=py+dy;if(nx<0||nx>=width||ny<0||ny>=limit)continue;
    const n=ny*width+nx;if(!visited[n]&&binary[n*4]===0){visited[n]=1;pixels.push(n);}
   }
  }
  components.push({x0,x1,y0,y1,w:x1-x0+1,h:y1-y0+1,pixels});
 }
 for(const ring of components){
  if(ring.h<Math.max(7,height*.009)||ring.h>height*.06||ring.w<ring.h*.5||ring.w>ring.h*1.5)continue;
  const fill=ring.pixels.length/(ring.w*ring.h);if(fill<.15||fill>.8)continue;
  const shape=new Uint8Array(ring.w*ring.h),outside=new Uint8Array(shape.length),front=[];
  for(const pixel of ring.pixels)shape[(Math.floor(pixel/width)-ring.y0)*ring.w+pixel%width-ring.x0]=1;
  const add=i=>{if(!shape[i]&&!outside[i]){outside[i]=1;front.push(i);}};
  for(let x=0;x<ring.w;x++){add(x);add((ring.h-1)*ring.w+x);}
  for(let y=0;y<ring.h;y++){add(y*ring.w);add(y*ring.w+ring.w-1);}
  for(let head=0;head<front.length;head++){
   const i=front[head],x=i%ring.w,y=Math.floor(i/ring.w);if(x)add(i-1);if(x<ring.w-1)add(i+1);if(y)add(i-ring.w);if(y<ring.h-1)add(i+ring.w);
  }
  let hole=0;for(let i=0;i<shape.length;i++)if(!shape[i]&&!outside[i])hole++;
  if(hole<shape.length*.08)continue;
  const dash=components.find(part=>part.x0>ring.x1&&part.x0-ring.x1<ring.h*1.5&&part.h<=ring.h*.4&&part.w>=ring.h*.35&&part.w<=ring.h*2&&part.pixels.length/(part.w*part.h)>=.35&&Math.abs((part.y0+part.y1-ring.y0-ring.y1)/2)<ring.h*.3);
  if(!dash)continue;
  const pad=Math.max(2,ring.h*.25);boxes.push([Math.max(0,ring.x0-pad),Math.max(0,ring.y0-pad),Math.min(width,dash.x1+pad+1),Math.min(height,ring.y1+pad+1)]);
 }
 return boxes;
}
async function reinforcedPasses(ocr,canvas,original,metadata,notify){
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),strip=document.createElement('canvas'),drawing=strip.getContext('2d',{willReadFrequently:true}),boxes=[];
 const variants=[original,new ImageData(adaptivePixels(original.data,canvas.width,canvas.height),canvas.width,canvas.height),new ImageData(adaptivePixels(original.data,canvas.width,canvas.height,true),canvas.width,canvas.height)];
 const bands=[[0,.34],[.26,.66],[.58,1]];let pass=0;
 try{
  await ocr.setParameters({tessedit_pageseg_mode:'6'});
  for(const variant of variants){ctx.putImageData(variant,0,0);for(const [top,bottom]of bands){
   const y=Math.round(canvas.height*top),h=Math.min(canvas.height-y,Math.round(canvas.height*(bottom-top))),zoom=Math.max(1,Math.min(3,1400/canvas.width));
   strip.width=Math.round(canvas.width*zoom);strip.height=Math.round(h*zoom);drawing.drawImage(canvas,0,y,canvas.width,h,0,0,strip.width,strip.height);
   notify('A tentar a limpeza reforçada · análise '+(++pass)+' de 11…');
   const {data}=await ocr.recognize(strip,{}, {blocks:true,text:true});
   boxes.push(...reinforcedTextBoxes(data,metadata,strip.width,strip.height,canvas.height*zoom,y*zoom).map(b=>[b[0]/zoom,b[1]/zoom+y,b[2]/zoom,b[3]/zoom+y]));
  }}
  await ocr.setParameters({tessedit_pageseg_mode:'11'});
  for(const variant of variants.slice(1)){
   ctx.putImageData(variant,0,0);notify('A tentar a limpeza reforçada · análise '+(++pass)+' de 11…');
   const {data}=await ocr.recognize(canvas,{}, {blocks:true,text:true});boxes.push(...reinforcedTextBoxes(data,metadata,canvas.width,canvas.height));
  }
  notify('A verificar também as marcas pequenas junto às letras…');
  for(const variant of variants.slice(1))boxes.push(...captionMarkBoxes(variant.data,canvas.width,canvas.height));
 }finally{strip.width=strip.height=1;ctx.putImageData(original,0,0);await ocr.setParameters({tessedit_pageseg_mode:'11'});}
 return boxes;
}
function erase(pixels,width,height,boxes){const mask=new Uint8Array(width*height),rgb=pixels;for(const box of boxes){const [x0,y0,x1,y1]=box.map((n,i)=>i<2?Math.floor(n):Math.ceil(n));for(let y=Math.max(0,y0);y<Math.min(height,y1);y++)for(let x=Math.max(0,x0);x<Math.min(width,x1);x++)mask[y*width+x]=1}const unknown=mask.slice(),front=[];for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(mask[i]&&((x&& !mask[i-1])||(x<width-1&&!mask[i+1])||(y&&!mask[i-width])||(y<height-1&&!mask[i+width])))front.push(i)}for(const i of front)unknown[i]=2;let head=0;while(head<front.length){const i=front[head++],x=i%width,y=Math.floor(i/width),neighbors=[x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1].filter(n=>n>=0),known=neighbors.filter(n=>!unknown[n]);if(!known.length)continue;for(let c=0;c<3;c++)rgb[i*4+c]=known.reduce((sum,n)=>sum+rgb[n*4+c],0)/known.length;rgb[i*4+3]=255;unknown[i]=0;for(const n of neighbors)if(unknown[n]===1){unknown[n]=2;front.push(n)}}
 if(unknown.some(Boolean))throw Error('Não foi possível reconstruir esta ilustração sem letras.');
 if(width>72){const smallWidth=48,smallHeight=Math.max(1,Math.round(height*smallWidth/width)),small=new Uint8ClampedArray(smallWidth*smallHeight*4);for(let y=0;y<smallHeight;y++)for(let x=0;x<smallWidth;x++){const from=(Math.min(height-1,Math.round(y*height/smallHeight))*width+Math.min(width-1,Math.round(x*width/smallWidth)))*4;for(let c=0;c<4;c++)small[(y*smallWidth+x)*4+c]=pixels[from+c]}erase(small,smallWidth,smallHeight,boxes.map(b=>b.map(n=>n*smallWidth/width)));for(const i of front){const x=(i%width)*smallWidth/width,y=Math.floor(i/width)*smallHeight/height,x0=Math.min(smallWidth-1,Math.floor(x)),y0=Math.min(smallHeight-1,Math.floor(y)),x1=Math.min(smallWidth-1,x0+1),y1=Math.min(smallHeight-1,y0+1),u=x-x0,v=y-y0;for(let c=0;c<3;c++)rgb[i*4+c]=(small[(y0*smallWidth+x0)*4+c]*(1-u)+small[(y0*smallWidth+x1)*4+c]*u)*(1-v)+(small[(y1*smallWidth+x0)*4+c]*(1-u)+small[(y1*smallWidth+x1)*4+c]*u)*v}}
 // A difusão suaviza os contornos sem voltar a usar os píxeis das letras.
 for(let pass=0;pass<(width>72?90:900);pass++)for(let k=pass%2?front.length-1:0;pass%2?k>=0:k<front.length;k+=pass%2?-1:1){const i=front[k],x=i%width,y=Math.floor(i/width);if(!x||!y||x===width-1||y===height-1)continue;for(let c=0;c<3;c++)rgb[i*4+c]=(rgb[(i-1)*4+c]+rgb[(i+1)*4+c]+rgb[(i-width)*4+c]+rgb[(i+width)*4+c])/4}return pixels}
function database(){return databasePromise??=new Promise(resolve=>{try{const request=indexedDB.open('pi-revista-artwork-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('artwork');request.onsuccess=()=>resolve(request.result);request.onerror=request.onblocked=()=>resolve(null)}catch{resolve(null)}})}
async function cached(key,value){const db=await database();if(!db)return null;return new Promise(resolve=>{try{const tx=db.transaction('artwork',value?'readwrite':'readonly'),request=value?tx.objectStore('artwork').put(value,key):tx.objectStore('artwork').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null)}catch{resolve(null)}})}
function worker(){return workerPromise??=(async()=>{if(!root.Tesseract){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('Não foi possível iniciar a preparação automática do fundo.'));document.head.append(script)})}const instance=await root.Tesseract.createWorker('eng',1,{workerPath:new URL('vendor/tesseract-worker.min.js',location.href).href,corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',langPath:'https://tessdata.projectnaptha.com/4.0.0_fast',workerBlobURL:false});await instance.setParameters({tessedit_pageseg_mode:'11'});return instance})().catch(error=>{workerPromise=null;throw error})}
function loadImage(source){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Não foi possível abrir a capa para preparar o fundo.'));if(!source.startsWith('data:'))image.crossOrigin='anonymous';image.src=source})}
async function prepare(source,metadata='',notify=()=>{},options={}){const reinforced=options.reinforced===true,key=version+':'+fingerprint(source)+(reinforced?':reinforced-v4:'+fingerprint(metadata):'');if(jobs.has(key))return jobs.get(key);const job=(async()=>{const saved=await cached(key);if(saved?.image)return saved;notify('A preparar automaticamente o fundo sem letras…');const result=await (queue=queue.catch(()=>{}).then(async()=>{const image=await loadImage(source),canvas=document.createElement('canvas'),scale=Math.min(1,1200/image.naturalWidth,1800/image.naturalHeight);canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);const original=ctx.getImageData(0,0,canvas.width,canvas.height),ocr=await worker();await ocr.setParameters({tessedit_pageseg_mode:'11'});let boxes=[];for(const threshold of [null,110,175]){if(threshold!==null){const binary=new ImageData(new Uint8ClampedArray(original.data),canvas.width,canvas.height);for(let i=0;i<binary.data.length;i+=4){const value=original.data[i]*.299+original.data[i+1]*.587+original.data[i+2]*.114<threshold?0:255;binary.data[i]=binary.data[i+1]=binary.data[i+2]=value}ctx.putImageData(binary,0,0)}const {data}=await ocr.recognize(canvas,{}, {blocks:true,text:true});boxes.push(...textBoxes(data,metadata,canvas.width,canvas.height));notify('A retirar as letras e a preparar os motivos da capa…')}
 // Em digitalizações pequenas, separar a cor das letras recupera o nome do autor
 // sem transformar os desenhos de traço em grandes áreas a apagar.
 if(canvas.width<500){const channel=document.createElement('canvas');channel.width=canvas.width*3;channel.height=canvas.height*3;const channelContext=channel.getContext('2d',{willReadFrequently:true}),binary=new ImageData(new Uint8ClampedArray(original.data),canvas.width,canvas.height);for(let i=0;i<binary.data.length;i+=4){const value=original.data[i+1]>=150?255:0;binary.data[i]=binary.data[i+1]=binary.data[i+2]=value}ctx.putImageData(binary,0,0);channelContext.drawImage(canvas,0,0,channel.width,channel.height);const {data}=await ocr.recognize(channel,{}, {blocks:true,text:true});boxes.push(...textBoxes(data,metadata,channel.width,channel.height).map(b=>b.map(n=>n/3)));channel.width=channel.height=1}
 // A análise da capa inteira pode confundir a ilustração com as letras pequenas do rodapé.
 // Repetir em faixas sobrepostas e ampliadas permite detetar títulos e legendas separados.
 const strip=document.createElement('canvas'),stripContext=strip.getContext('2d',{willReadFrequently:true});
 for(const [top,bottom] of [[0,.45],[.35,.75],[.65,1]]){const y=Math.round(canvas.height*top),h=Math.min(canvas.height-y,Math.round(canvas.height*(bottom-top))),zoom=Math.max(1,Math.min(3,1000/canvas.width));strip.width=Math.round(canvas.width*zoom);strip.height=Math.round(h*zoom);ctx.putImageData(original,0,0);stripContext.drawImage(canvas,0,y,canvas.width,h,0,0,strip.width,strip.height);const {data}=await ocr.recognize(strip,{}, {blocks:true,text:true});const found=textBoxes(data,metadata,strip.width,strip.height,canvas.height*zoom);boxes.push(...found.map(b=>[b[0]/zoom,b[1]/zoom+y,b[2]/zoom,b[3]/zoom+y]));notify('A verificar também as letras do topo e do rodapé da capa…')}
 strip.width=strip.height=1;
 if(reinforced)boxes.push(...await reinforcedPasses(ocr,canvas,original,metadata,notify));
 if(!boxes.length)throw Error('Não foi possível identificar as letras desta capa. O fundo fica apenas com as suas cores até ser possível prepará-lo.');
 const clean=document.createElement('canvas');clean.width=360;clean.height=Math.max(1,Math.round(360*canvas.height/canvas.width));const output=clean.getContext('2d',{willReadFrequently:true});ctx.putImageData(original,0,0);output.drawImage(canvas,0,0,clean.width,clean.height);const pixels=output.getImageData(0,0,clean.width,clean.height);erase(pixels.data,clean.width,clean.height,boxes.map(b=>b.map(n=>n*clean.width/canvas.width)));output.putImageData(pixels,0,0);const value={version,...(reinforced?{processing:'reinforced-v1'}:{}),source:fingerprint(source),image:clean.toDataURL('image/webp',.88)};canvas.width=canvas.height=clean.width=clean.height=1;await cached(key,value);return value}));notify(reinforced?'Limpeza reforçada preparada. Compare os resultados.':'Fundo preparado automaticamente. Verifique o resultado.');return result})();jobs.set(key,job);job.catch(()=>jobs.delete(key));return job}
function valid(article){return [4,version].includes(article?.automaticArtwork?.version)&&article.automaticArtwork.source===fingerprint(article.bookCover||'')&&/^data:image\/webp;base64,/.test(article.automaticArtwork.image||'')}
root.RevistaArtwork={prepare,reinforced:(source,metadata,notify)=>prepare(source,metadata,notify,{reinforced:true}),valid,fingerprint,version,textBoxes,reinforcedTextBoxes,adaptivePixels,captionMarkBoxes,erase};
})(typeof window==='undefined'?globalThis:window);
