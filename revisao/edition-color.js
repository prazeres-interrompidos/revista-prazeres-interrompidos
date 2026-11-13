/* Colour of the dividers and the generated back cover, derived from the edition cover. */
(function(root){
'use strict';
const fallback='#532b35';
const cream=[247,237,218],black=[0,0,0],white=[255,255,255];
const valid=color=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color);
const eligible=edition=>followsNextPage(edition);
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
function sample(source,surface){
  if(!source)return Promise.resolve(null);
  const cacheKey=JSON.stringify([source,surface]);
  if(cacheKey===cachedSource)return cachedSample;
  cachedSource=cacheKey;
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
        if(surface)canvas.height=100;
        const context=canvas.getContext('2d',{willReadFrequently:true});
        if(surface){
          context.fillStyle=surface.paper;
          context.fillRect(0,0,canvas.width,canvas.height);
          context.globalAlpha=surface.opacity??1;
          context.filter=surface.filter||'none';
        }
        if(surface?.cover){
          const scale=Math.max(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight);
          const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
          context.drawImage(image,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
        }else context.drawImage(image,0,0,canvas.width,canvas.height);
        finish(dominant(context.getImageData(0,0,canvas.width,canvas.height).data));
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
const sectionDefinitions=[
  {key:'articles',label:'Episódios do Podcast'},
  {key:'extraArticles',label:'Episódios Extra'},
  {key:'bookTrailers',label:'Book Trailers'},
  {key:'bookGifs',label:'Book GIFs'},
  {key:'news',label:'Novidades do Projeto'}
];
// The edition identifier is authoritative. New drafts can use their month field.
function followsNextPage(edition){
  const id=String(edition?.id||'').match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if(id)return Number(id[1])*100+Number(id[2])>=202611;
  const months=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const label=String(edition?.month||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const match=label.match(/\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(\d{4})\b/);
  return !!match&&Number(match[2])*100+months.indexOf(match[1])+1>=202611;
}
function sectionSetting(edition,key){
  const saved=sectionDefinitions.some(section=>section.key===key)?edition?.sectionColors?.[key]:null;
  const color=valid(saved?.color)?saved.color:fallback;
  return {mode:eligible(edition)&&saved?.mode==='custom'&&valid(saved.color)?'custom':'auto',color};
}
const isDivider=page=>page.cls.split(/\s+/).some(cls=>cls==='section-divider'||cls==='news-transition');
function cssColor(value){
  if(valid(value))return value.toLowerCase();
  const match=String(value||'').match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*[\d.]+)?\s*\)$/);
  const channels=match&&match.slice(1,4).map(Number);
  return channels?.every(channel=>Number.isFinite(channel)&&channel>=0&&channel<=255)?hex(channels):null;
}
function firstTitleColor(pages,index){
  const first=pages[index+1],book=root.document?.getElementById('book');
  if(!book||!root.getComputedStyle)return '#272925';
  // A full-page poster can precede the first book title rendered as text.
  // Stay within the first item, so a title from the next book cannot supply its colour.
  for(let n=index+1;n<pages.length;n++){
    const page=pages[n];
    if(isDivider(page)||page.article!==first.article||page.news!==first.news)break;
    const sheet=book.querySelector('[data-sheet-index="'+n+'"]');
    const title=sheet?.querySelector('.meta-title,h2');
    if(!title?.textContent.trim())continue;
    const color=cssColor(root.getComputedStyle(title).color);
    if(color)return color;
  }
  // Image-only items use the same title colour defined by their page theme.
  const sheet=book.querySelector('[data-sheet-index="'+(index+1)+'"]');
  if(sheet){
    const style=root.getComputedStyle(sheet);
    const variable=first.themeClass?.split(/\s+/).includes('episode-themed')?'--wine':'--ink';
    return cssColor(style.getPropertyValue(variable).trim())||cssColor(style.color)||'#272925';
  }
  return '#272925';
}
function sections(edition,pages){
  if(!followsNextPage(edition))return Promise.resolve('');
  const dividers=[];
  pages.forEach((page,index)=>{
    if(!isDivider(page))return;
    const next=pages[index+1];
    if(!next)return;
    const className='section-next-page-'+index;
    page.themeClass=[page.themeClass,className].filter(Boolean).join(' ');
    dividers.push({index,className,setting:sectionSetting(edition,page.sectionKey)});
  });
  return Promise.all(dividers.map(async({index,className,setting})=>{
    if(setting.mode==='auto')await root.RevistaTheme?.ready();
    const color=setting.mode==='custom'?setting.color:firstTitleColor(pages,index);
    if(!valid(color))return '';
    const theme=palette(color),scope='.page.cover.'+className;
    return `${scope},${scope} .page-inner{background:${theme.background};color:${theme.ink};--section-rule:${theme.rule}}
${scope} :is(h2,.eyebrow,.folio){color:${theme.ink};border-color:${theme.rule}}
.index-item.index-section.section-color-link-${index}{color:${theme.background}}
.index-item.index-subitem.section-color-link-${index}{color:${theme.background}}
.index-item.section-color-link-${index} small{color:inherit}`;
  })).then(rules=>rules.join('\n'));
}
root.RevistaEditionColor={fallback,eligible,valid,dominant,palette,resolve,css,followsNextPage,sections,sectionDefinitions,sectionSetting};
})(typeof window==='undefined'?globalThis:window);
