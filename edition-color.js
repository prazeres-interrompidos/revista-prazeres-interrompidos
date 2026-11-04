/* Colour of the dividers and the generated back cover, derived from the edition cover. */
(function(root){
'use strict';
const fallback='#532b35';
const cream=[247,237,218],black=[0,0,0],white=[255,255,255];
const valid=color=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color);
const eligible=edition=>edition?.id!=='2026-10';
const rgb=color=>color.slice(1).match(/../g).map(channel=>parseInt(channel,16));
const hex=channels=>'#'+channels.map(channel=>Math.round(channel).toString(16).padStart(2,'0')).join('');
function luminance(channels){
  return channels.reduce((sum,channel,index)=>{
    const c=channel/255;
    return sum+[.2126,.7152,.0722][index]*(c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  },0);
}
function contrast(a,b){
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
function dominant(pixels){
  const bins=new Map();
  let winner;
  for(let i=0;i<pixels.length;i+=4){
    if(pixels[i+3]<220)continue;
    const red=pixels[i],green=pixels[i+1],blue=pixels[i+2];
    const key=((red>>5)<<6)|((green>>5)<<3)|(blue>>5);
    let bin=bins.get(key);
    if(!bin){bin={count:0,red:0,green:0,blue:0};bins.set(key,bin)}
    bin.count++;
    bin.red+=red;
    bin.green+=green;
    bin.blue+=blue;
    if(!winner||bin.count>winner.count)winner=bin;
  }
  return winner?hex([winner.red,winner.green,winner.blue].map(value=>value/winner.count)):null;
}
function palette(color,automatic=false){
  let background=rgb(valid(color)?color:fallback);
  if(automatic){
    while(contrast(background,cream)<4.5)background=background.map(channel=>Math.floor(channel*.94));
  }
  const ink=contrast(background,cream)>=4.5?cream:contrast(background,black)>=4.5?black:white;
  return {
    background:hex(background),
    ink:hex(ink),
    rule:hex(background.map((channel,index)=>.45*channel+.55*ink[index]))
  };
}
let cachedSource='',cachedSample;
function sample(source){
  if(!source)return Promise.resolve(null);
  if(source===cachedSource)return cachedSample;
  cachedSource=source;
  cachedSample=new Promise(resolve=>{
    const image=new Image();
    const finish=color=>{
      clearTimeout(timer);
      image.onload=image.onerror=null;
      resolve(color);
    };
    const timer=setTimeout(()=>finish(null),5000);
    image.onload=()=>{
      try{
        const canvas=document.createElement('canvas');
        canvas.width=canvas.height=72;
        const context=canvas.getContext('2d',{willReadFrequently:true});
        context.drawImage(image,0,0,72,72);
        finish(dominant(context.getImageData(0,0,72,72).data));
      }catch{finish(null)}
    };
    image.onerror=()=>finish(null);
    if(/^data:image\/(png|jpeg|webp|gif);base64,/i.test(source)){image.src=source;return}
    try{
      const url=new URL(source,document.baseURI);
      if(!['http:','https:'].includes(url.protocol)){finish(null);return}
      image.crossOrigin='anonymous';
      image.src=url.href;
    }catch{finish(null)}
  });
  return cachedSample;
}
async function resolve(edition){
  if(!eligible(edition))return null;
  if(edition.sectionTheme?.mode==='custom'&&valid(edition.sectionTheme.color))return palette(edition.sectionTheme.color);
  const color=await sample(edition.cover);
  return color?palette(color,true):null;
}
function css(theme){
  if(!theme)return '';
  const scope='.page.cover:is(.section-divider,.news-transition,.generated-back-cover)';
  return `${scope}{background:${theme.background};color:${theme.ink};--section-rule:${theme.rule}}
${scope} :is(.eyebrow,.folio){border-color:var(--section-rule)}
${scope} .cover-art::before,${scope} .cover-art::after{border-color:var(--section-rule)}
${scope} .cover-art span{color:var(--section-rule)}`;
}
root.RevistaEditionColor={fallback,eligible,valid,dominant,palette,resolve,css};
})(typeof window==='undefined'?globalThis:window);
