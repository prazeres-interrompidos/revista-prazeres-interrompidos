function openingDefaults(e){return {openingLabel:'ABERTURA',openingTitle:'Da voz\nà página.',openingSubtitle:'Um lugar para ler,\nregressar e descobrir.',openingNote:e.demo?'Este protótipo não contém episódios reais. Os espaços reservados às capas não representam livros publicados.':'Prazeres Interrompidos · Revista do Podcast mensal'}}
'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=s=>{try{const u=new URL(s,location.href);return ['http:','https:','file:'].includes(u.protocol)?u.href:''}catch{return ''}};
const safeImage=s=>/^data:image\/(png|jpeg|webp|gif);base64,/.test(s||'')?s:safeURL(s);
let draftPreview=false;
let editions=window.EDITIONS||[], edition, flip, pages=[], starts=[], newsStart=-1, newsIndex=[], readerArticles=[], audioArticles=[], themeArticles=[], contentsEntries=[], readingPage=0,fontSize=21,pageObserver;
try{if(new URLSearchParams(location.search).has('rascunho')&&!new URLSearchParams(location.search).has('preview')){const draft=JSON.parse(sessionStorage.getItem('pi-draft'));if(draft&&Array.isArray(draft.articles)){editions=[draft];draftPreview=true}}}catch{}
const panel=$('#panel');const openPanel=html=>{$('#panelContent').innerHTML=html;panel.showModal()};$('.close').onclick=()=>panel.close();
function prose(text){return window.RevistaPoetry.render(text)}
const textStyles=document.createElement('style');textStyles.textContent='.page.poster-page,.page:is(.uploaded-cover,.uploaded-back-cover):has(img.full-bleed-cover){border:0}.poster-page .page-inner{padding:0}.text-page .page-inner{padding:28px 34px 24px}.text-page .eyebrow{margin-bottom:14px;flex-shrink:0}.text-page h2{margin-bottom:16px;flex-shrink:0}.text-page .text-block{max-height:none;overflow:visible;white-space:normal;flex-shrink:0}.text-block.article-prose p,.article-prose p{font:inherit;line-height:inherit;margin:0 0 .65em;text-align:justify;text-align-last:auto;white-space:normal}.article-prose p:last-child{margin-bottom:0}.text-page .listen,.text-page .note{flex-shrink:0}.text-page .folio{margin-top:auto}';document.head.append(textStyles);
function articleCredits(a){return '<div class="article-credits" style="font:11px/1.5 Arial;white-space:normal;margin-top:12px;flex-shrink:0">'+[['Título do livro',a.title],['Autor',a.author],['Editora',a.publisher],['Voz do episódio',a.voice],['Rubrica',a.section],['Autor do texto',a.textAuthor]].filter(([,v])=>String(v??'').trim()).map(([label,value])=>'<div><strong>'+label+':</strong> '+esc(value)+'</div>').join('')+'</div>'}
function textPageHeading(article,continuation=false){return '<div class="eyebrow">'+esc(article.section||'LEITURAS')+(continuation?' · CONTINUAÇÃO':'')+'</div>'+(!continuation?'<h2>'+esc(article.title)+'</h2>':'')}
function splitText(text,article){
const host=document.createElement('div');host.className='page text-page';host.style.cssText='position:absolute;left:-10000px;top:0;visibility:hidden;width:460px';
host.innerHTML='<div class="page-inner">'+textPageHeading(article)+'<div class="text-block article-prose"></div><div class="folio"><span>PRAZERES INTERROMPIDOS</span><span>00</span></div></div>';document.body.append(host);
const inner=host.firstElementChild,block=host.querySelector('.text-block'),folio=host.querySelector('.folio');
const pageSpace=()=>640-parseFloat(getComputedStyle(inner).paddingBottom)-folio.offsetHeight-block.offsetTop;let available=pageSpace();
const chunks=window.RevistaPoetry.paginate(text,candidate=>{block.innerHTML=prose(candidate);return block.offsetHeight<=available},()=>{if(host.querySelector('h2'))host.querySelector('h2').remove();host.querySelector('.eyebrow').textContent=(article.section||'LEITURAS')+' · CONTINUAÇÃO';available=pageSpace()});
// Keep every text page filled. Move the closing credits, never the text,
// when the credits cannot fit below the final paragraph.
const creditMeasure=document.createElement('div');creditMeasure.innerHTML=article.isNews?'':articleCredits(article);inner.append(creditMeasure);const closingHeight=creditMeasure.offsetHeight+(article.isNews?40:72);creditMeasure.remove();
block.innerHTML=prose(chunks[chunks.length-1]);
if(block.offsetHeight+closingHeight>available)chunks.push('');
host.remove();return chunks}

function fitEditorialContent(entry,inner){
if(!entry||!inner)return;const block=inner.querySelector('.editorial-prose'),author=inner.querySelector('.editorial-author'),folio=inner.querySelector('.folio');
const authorSpace=author?author.offsetHeight+parseFloat(getComputedStyle(author).marginTop)+parseFloat(getComputedStyle(author).marginBottom):0;
const available=640-parseFloat(getComputedStyle(inner).paddingBottom)-folio.offsetHeight-authorSpace-block.offsetTop;
let size=16;while(block.offsetHeight>available&&size>1){size-=.25;block.style.fontSize=size+'px'}
entry.content=entry.content.replace('class="editorial-prose article-prose"','class="editorial-prose article-prose" style="font-size:'+size+'px"');
}
function balanceContentsEnd(sheets,canFit){
 if(sheets.length<2||sheets[sheets.length-1].length!==1)return sheets;
 const last=sheets[sheets.length-1],previous=sheets[sheets.length-2];
 // Evitar uma última página com uma entrada isolada; o título de uma secção
 // nunca fica separado do seu primeiro episódio.
 for(const minimum of [3,2]){let start=previous.length-(minimum-last.length);if(previous[start-1]?.kind==='section')start--;if(start<2)continue;const moved=previous.slice(start),candidate=[...moved,...last];if(canFit(candidate)){previous.splice(start);last.unshift(...moved);break}}
 return sheets;
}
function paginateContents(entries){
 // A paginação usa a altura real de cada título e autor, com espaço reservado
 // para o cabeçalho e o fólio. Um título de secção acompanha sempre o primeiro item.
 const host=document.createElement('div');host.className='page toc';host.style.cssText='position:absolute;left:-10000px;top:0;visibility:hidden;width:460px';document.body.append(host);
 const sheets=[[]];let inner,folio;
 const openSheet=first=>{host.innerHTML='<div class="page-inner"><div class="eyebrow">NESTA EDIÇÃO</div>'+(first?'<h2>Índice.</h2>':'')+'<div class="folio"><span>PRAZERES INTERROMPIDOS</span><span>0000</span></div></div>';inner=host.firstElementChild;folio=inner.lastElementChild};
 const rowFor=entry=>{const wrapper=document.createElement('div');wrapper.innerHTML=contentsEntry({...entry,start:999});return wrapper.firstElementChild};
 const fits=row=>row.offsetTop+row.getBoundingClientRect().height<=640-parseFloat(getComputedStyle(inner).paddingBottom)-folio.getBoundingClientRect().height-8;
 try{openSheet(true);entries.forEach((entry,i)=>{let sheet=sheets[sheets.length-1],row=rowFor(entry);inner.insertBefore(row,folio);const next=entry.kind==='section'&&entries[i+1]?.kind==='item'?rowFor(entries[i+1]):null;if(next)inner.insertBefore(next,folio);const room=fits(next||row);next?.remove();if(!room&&sheet.length){sheets.push(sheet=[]);openSheet(false);row=rowFor(entry);inner.insertBefore(row,folio)}sheet.push(entry)});return balanceContentsEnd(sheets,candidate=>{openSheet(false);let row;for(const entry of candidate){row=rowFor(entry);inner.insertBefore(row,folio)}return !row||fits(row)})}finally{host.remove()}
}
function contentsEntry(entry){const section=entry.kind!=='item';return '<button class="index-item '+(section?'index-section':'index-subitem')+'" data-page="'+entry.start+'"><span>'+(section?'<strong>'+esc(entry.title)+'</strong>':esc(entry.title))+(entry.subtitle?'<small>'+esc(entry.subtitle)+'</small>':'')+'</span><span>'+(entry.start+1)+'</span></button>'}
function episodePlayer(a,i,cls=''){return window.RevistaAudio?window.RevistaAudio.markup(a,i,cls):'<a class="listen" data-pdf-audio="true" href="'+esc(safeURL(a.audio))+'" target="_blank" rel="noopener">▶ Ouvir o episódio</a>'}
function lastPageMarkup(image,link,zoom=false){
  const style=zoom?'display:block;width:100%;height:auto':'position:absolute;inset:0;width:100%;height:100%;object-fit:fill';
  const markup=`<img src="${esc(image)}" alt="Imagem da última página" style="${style}">`;
  if(!link)return markup;
  const linkStyle=zoom?'display:block':'display:block;position:absolute;inset:0';
  return `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" data-pdf-last-page="true" style="${linkStyle}">${markup}</a>`;
}
function page(content,cls='',article=null,text=null){pages.push({content,cls,article,text});}
const editionColorStyle=document.createElement('style');
document.head.append(editionColorStyle);
let editionColorReady=Promise.resolve(),editionColorRevision=0;
function updateEditionColor(edition){
  const revision=++editionColorRevision;
  editionColorStyle.textContent='';
  editionColorReady=RevistaEditionColor.resolve(edition).then(theme=>{
    if(revision===editionColorRevision)editionColorStyle.textContent=RevistaEditionColor.css(theme);
  });
}
function sectionDivider(title){page('<div class="eyebrow">PRAZERES INTERROMPIDOS</div><div style="flex:1;display:flex;flex-direction:column;justify-content:center"><div style="width:64px;border-top:1px solid var(--section-rule,#d0af83);margin-bottom:30px"></div><h2 style="font:48px/1.08 Georgia;letter-spacing:-1px;margin:0 0 28px">'+esc(title).replace(/\n/g,'<br>')+'</h2></div>','cover section-divider')}
function showPublicationPreview(){
 window.RevistaAudio?.pause?.();window.RevistaAudio?.setArticles([]);window.RevistaTheme?.start([],[]);if(pageObserver)pageObserver.disconnect();if(flip){flip.destroy();flip=null}
 document.body.classList.add('publication-preview');$('#contents').disabled=true;$('#bookWrap').classList.remove('first-cover','last-cover');
 const visible=RevistaPublication.isVisible(edition),cover=visible?safeImage(edition.cover):'';
 $('#bookWrap').innerHTML='<div id="book"><article class="publication-cover-preview">'+(cover?'<img src="'+esc(cover)+'" alt="Capa da Revista do Podcast — '+esc(edition.month)+'">':'')+'<p class="release-badge">'+(visible?'EM BREVE':'EM PREPARAÇÃO')+'</p><h1>'+esc(edition.month)+'</h1><p>'+(visible?'A capa já está disponível. A leitura completa chega com o lançamento da revista.':'Estamos a preparar uma nova edição da Revista do Podcast.')+'</p><a href="edicoes.html">Ver as edições da revista ↗</a></article></div>';
 $('.demo').textContent=visible?'CAPA DISPONÍVEL · EM BREVE':'EM PREPARAÇÃO';history.replaceState(null,'','#edicao='+encodeURIComponent(edition.id)+'&pagina=1');
}
let loadedRevision='',editionLoadBusy=false;
async function openPublishedEdition(id,entries,resetPage=false){
  if(editionLoadBusy)return false;
  editionLoadBusy=true;
  try{
    const catalog=entries||await RevistaEditions.catalog();
    const selected=catalog.find(entry=>entry.id===id)||catalog[0];
    if(!selected){
      if(flip){flip.destroy();flip=null}
      editions=[];
      edition=null;
      pages=[];
      $('#contents').disabled=true;
      $('#hint').textContent='Não existem edições disponíveis.';
      return false;
    }
    if(selected.reader){location.assign(RevistaEditions.readerURL(selected));return false}
    const content=selected.released?await RevistaEditions.readEdition(selected):{
      ...selected,cover:selected.cover?new URL(selected.cover,RevistaEditions.base).href:''
    };
    if(resetPage)history.replaceState(null,'','#'+new URLSearchParams({edicao:selected.id,pagina:'1'}));
    editions=catalog.map(entry=>entry.id===selected.id?content:entry);
    loadEdition(selected.id);
    loadedRevision=selected.revision;
    return true;
  }catch{
    $('#hint').textContent='Não foi possível carregar a edição. Tente voltar a abrir a revista.';
    return false;
  }finally{editionLoadBusy=false}
}
function loadEdition(id){window.RevistaTrailers?.stop();edition=editions.find(e=>e.id===id)||editions.find(e=>draftPreview||RevistaPublication.isVisible(e))||editions[0];updateEditionColor(edition);pages=[];starts=[];newsStart=-1;newsIndex=[];contentsEntries=[];readerArticles=[...(edition.articles||[]),...(edition.extraArticles||[])];$('#editionLabel').textContent=`N.º ${edition.number} · ${edition.month}`;$('.demo').textContent=edition.demo?'EDIÇÃO EXPERIMENTAL':'EDIÇÃO MENSAL';
if(!draftPreview&&!RevistaPublication.isReadable(edition)){showPublicationPreview();return}document.body.classList.remove('publication-preview');$('#contents').disabled=false;
// Keep the first published edition's original framing.
const coverFit=edition.id==='2026-10'?'contain':'fill';
const coverClass=coverFit==='fill'?'full-bleed-cover':'';
if(edition.cover)page(`<img class="${coverClass}" src="${esc(safeImage(edition.cover))}" alt="Capa da revista — N.º ${esc(edition.number)} · ${esc(edition.month)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${coverFit};object-position:center;background:var(--paper)">`,'uploaded-cover');else page(`<div class="eyebrow"><span>REVISTA DO PODCAST</span><span>N.º ${esc(edition.number)} · ${esc(edition.month)}</span></div><h1 class="masthead">Prazeres<br>Interrompidos</h1><div class="cover-sub">Leituras que ficam.</div><div class="cover-art">${edition.cover?`<img class="cover-image" src="${esc(safeImage(edition.cover))}" alt="Capa da edição">`:'<span>pi</span>'}</div><h2>${esc(edition.headline)}</h2><p>${edition.demo?'Um ensaio de leitura.<br>Textos e capas demonstrativos.':'Uma edição do Projeto Internacional de Promoção<br>da Leitura, dos Livros e dos Escritores.'}</p>`,'cover');
const opening=Object.fromEntries(Object.entries(openingDefaults(edition)).map(([k,v])=>[k,k==='openingLabel'&&['ABERTURA · EDITORIAL','ABERTURA · NÚMERO EXPERIMENTAL'].includes(edition[k])?'ABERTURA':edition[k]??v]));const openingPart=(key,tag,cls='')=>opening[key]?`<${tag}${cls?` class="${cls}"`:''}>${esc(opening[key]).replace(/\r\n|\r|\n/g,'<br>')}</${tag}>`:'';
page(`${openingPart('openingLabel','div','eyebrow')}${openingPart('openingTitle','h2')}${openingPart('openingSubtitle','p','intro')}${RevistaPoetry.hasFormatting(edition.editorial)?'<div class="text-block article-prose">'+RevistaPoetry.render(edition.editorial,'left')+'</div>':'<div class="text-block">'+esc(edition.editorial)+'</div>'}${edition.director?`<p class="note"><strong>Diretor-Geral do Projeto:</strong> ${esc(edition.director)}</p>`:''}${openingPart('openingNote','p','note')}`);
let editorialStart=-1;
if(edition.hasEditorial===true){editorialStart=pages.length;contentsEntries.push({kind:'standalone',title:'Editorial',subtitle:'',start:editorialStart});page('<div class="eyebrow">PRAZERES INTERROMPIDOS</div><h2>Editorial</h2><div class="editorial-prose article-prose">'+prose(edition.editorialText)+'</div>'+(String(edition.editorialAuthor||'').trim()?'<p class="editorial-author"><strong>Autor do editorial:</strong> '+esc(edition.editorialAuthor)+'</p>':''),'editorial-page')}
const requestedTrailers=Array.isArray(edition.bookTrailers)?edition.bookTrailers:[];const publishedTrailers=requestedTrailers.filter(t=>window.RevistaTrailers?.videoSource(t.youtube)).map(t=>({...t,section:t.section||'Episódios do Nosso Arquivo'}));if(new URLSearchParams(location.search).get('amostra')==='trailers'){if(!publishedTrailers.length)publishedTrailers.push(window.RevistaTrailers.sample());else publishedTrailers.forEach((t,i)=>{if(window.RevistaTrailers.videoId(t.youtube)==='sQDyC6LcOww'&&!String(t.text||'').trim()){const example=window.RevistaTrailers.sample();publishedTrailers[i]={...t,voice:t.voice||example.voice,textAuthor:t.textAuthor||example.textAuthor,section:t.section||example.section,hasText:true,sampleTextPlaceholder:true};}});}themeArticles=[...readerArticles,...publishedTrailers];audioArticles=themeArticles;window.RevistaAudio?.setArticles(audioArticles);let trailerStart=-1;
const tocStart=pages.length;
const plannedNews=(edition.news||[]).filter(n=>n.image||(n.hasText!==false&&n.text?.trim()));
const plannedEpisodes=items=>items.map(a=>({kind:'item',title:a.title,subtitle:a.author||a.section||''}));
const indexPlan=[...(edition.hasEditorial===true?[{kind:'standalone',title:'Editorial',subtitle:''}]:[]),
 ...(edition.articles.length?[{kind:'section',title:'Episódios do Podcast',subtitle:''},...plannedEpisodes(edition.articles)]:[]),
 ...(edition.extraArticles?.length?[{kind:'section',title:'Episódios Extra',subtitle:''},...plannedEpisodes(edition.extraArticles)]:[]),
 ...(publishedTrailers.length?[{kind:'section',title:window.RevistaTrailers.sectionTitle,subtitle:''},...publishedTrailers.map(t=>({kind:'item',title:t.title||'Book Trailer',subtitle:t.author||''}))]:[]),
 ...(plannedNews.length?[{kind:'section',title:'Novidades do Projeto',subtitle:''},...plannedNews.map(n=>({kind:'item',title:n.title,subtitle:''}))]:[])];
const tocCount=paginateContents(indexPlan).length;for(let k=0;k<tocCount;k++)page('', 'toc');
const addEpisode=(a,i)=>{const isExtra=i>=edition.articles.length;starts.push(pages.length);contentsEntries.push({kind:'item',title:a.title,subtitle:a.author||a.section||'',start:pages.length});if(a.imageType==='poster'&&a.cover)page(`<img src="${esc(safeImage(a.cover))}" alt="Cartaz do episódio — ${esc(a.title)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;object-position:center">${a.hasText===false&&a.audio?episodePlayer(a,i,'poster-player')+`<a class="pdf-only poster-audio-link" data-pdf-audio="true" href="${esc(safeURL(a.audio))}" style="position:absolute;inset:0"></a>`:''}`,'poster-page',a);else if(!isExtra||a.cover)page(`<div class="eyebrow">${esc(a.section||'LEITURAS')} · ${String(i+1).padStart(2,'0')}</div><div class="book-slot">${a.cover?`<img src="${esc(safeImage(a.cover))}" alt="Capa original de ${esc(a.title)}">`:'<span>Espaço para<br>a capa original<small>DEMONSTRAÇÃO<br>SEM LIVRO ASSOCIADO</small></span>'}</div><h3 class="meta-title">${esc(a.title)}</h3><div class="metadata">Autor: ${esc(a.author)}<br>Editora: ${esc(a.publisher)}<br>Voz: ${esc(a.voice)}</div>${a.hasText===false&&a.audio?episodePlayer(a,i):''}`, '',a);
if(isExtra&&!a.cover&&a.hasText===false)page('<div class="eyebrow">EPISÓDIOS EXTRA</div><h2>'+esc(a.title)+'</h2>'+(a.voice?'<p>Voz do episódio: '+esc(a.voice)+'</p>':'')+(a.audio?episodePlayer(a,i):''),'',a);
const chunks=a.hasText===false?[]:splitText(a.text,a);chunks.forEach((t,k)=>page(`${textPageHeading(a,k>0)}<div class="text-block article-prose">${prose(t)}</div>${k===chunks.length-1?articleCredits(a):""}${k===chunks.length-1&&a.audio?episodePlayer(a,i):(k===chunks.length-1&&!a.audio?`<p class="note">${edition.demo?'Texto demonstrativo · Sem áudio associado.':'Sem ligação áudio disponível.'}</p>`:'')}`,'text-page',a,t));};
if(edition.articles.length){contentsEntries.push({kind:'section',title:'Episódios do Podcast',subtitle:'',start:pages.length});sectionDivider('Episódios\ndo Podcast');edition.articles.forEach(addEpisode)}
if(edition.extraArticles?.length){contentsEntries.push({kind:'section',title:'Episódios Extra',subtitle:'',start:pages.length});sectionDivider('Episódios\nExtra');edition.extraArticles.forEach((a,i)=>addEpisode(a,edition.articles.length+i))}

if(publishedTrailers.length){trailerStart=pages.length;contentsEntries.push({kind:'section',title:window.RevistaTrailers.sectionTitle,subtitle:'',start:trailerStart});sectionDivider('Book Trailers -\nEpisódios do\nNosso Arquivo');publishedTrailers.forEach(t=>{
 contentsEntries.push({kind:'item',title:t.title||'Book Trailer',subtitle:t.author||'',start:pages.length});
 page('<div class="eyebrow">EPISÓDIOS DO NOSSO ARQUIVO</div><h2>'+esc(t.title||'Book Trailer')+'</h2><p class="trailer-book-meta">'+[t.author,t.publisher].filter(Boolean).map(esc).join(' · ')+'</p>'+window.RevistaTrailers.markup(t),'trailer-page',t);pages[pages.length-1].trailer=t;
 if(window.RevistaTrailers.hasText(t)){const chunks=splitText(t.text,t);chunks.forEach((text,k)=>{const last=k===chunks.length-1,body=t.sampleTextPlaceholder&&!String(t.text||'').trim()?'<div class="trailer-text-placeholder"><span>Texto do episódio</span><p>Espaço reservado ao texto integral.</p></div>':prose(text);page(textPageHeading(t,k>0)+'<div class="text-block article-prose">'+body+'</div>'+(last?articleCredits(t):'')+(last&&t.audio?episodePlayer(t,audioArticles.indexOf(t)):'') ,'text-page trailer-text-page',t,text);});}
});}

const publishedNews=(edition.news||[]).filter(n=>n.image||(n.hasText!==false&&n.text?.trim()));
if(publishedNews.length){newsStart=pages.length;page('<div class="eyebrow">PRAZERES INTERROMPIDOS</div><div style="flex:1;display:flex;flex-direction:column;justify-content:center"><div style="width:64px;border-top:1px solid var(--section-rule,#d0af83);margin-bottom:30px"></div><h2 style="font:48px/1.08 Georgia;letter-spacing:-1px;margin:0 0 28px">Novidades<br>do Projeto</h2><p style="font:19px/1.6 Georgia;max-width:290px">O que há de novo no<br>Prazeres Interrompidos.</p></div>','cover news-transition');publishedNews.forEach(n=>{
const link=n.url&&safeURL(n.url)?'<a data-pdf-news="true" class="listen" href="'+esc(safeURL(n.url))+'" target="_blank" rel="noopener">Mais informações ↗</a>':'';
const newsFirstPage=pages.length;newsIndex.push({kind:'item',title:n.title,subtitle:'',start:newsFirstPage});if(n.image)page((link?'<a data-pdf-news="true" href="'+esc(safeURL(n.url))+'" target="_blank" rel="noopener" style="position:absolute;inset:0">':'')+'<img src="'+esc(safeImage(n.image))+'" alt="'+esc(n.title)+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill">'+(link?'</a>':''),'poster-page');
const first=pages.length;
if(n.hasText!==false&&n.text?.trim()){const chunks=splitText(n.text,{title:n.title,section:'NOVIDADES DO PROJETO',isNews:true});chunks.forEach((t,k)=>page(textPageHeading({title:n.title,section:'NOVIDADES DO PROJETO'},k>0)+'<div class="text-block article-prose">'+prose(t)+'</div>'+(k===chunks.length-1?link:''),'text-page'))}
for(let j=newsFirstPage;j<pages.length;j++)pages[j].news=n;
});}

const lastPageImage=edition.lastPageImage&&safeImage(edition.lastPageImage);
if((pages.length+Number(Boolean(lastPageImage)))%2===0)page(`<div class="eyebrow">FIM DAS LEITURAS</div><h2>Até à próxima<br>edição.</h2><p>A leitura continua no próximo número.</p>`);
if(lastPageImage){
  const link=/^https?:\/\//i.test(edition.lastPageLink||'')?safeURL(edition.lastPageLink):'';
  page(lastPageMarkup(lastPageImage,link),'poster-page');
  Object.assign(pages[pages.length-1],{lastPageImage,lastPageLink:link});
}
if(edition.backCover)page(`<img class="${coverClass}" src="${esc(safeImage(edition.backCover))}" alt="Contracapa da revista" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${coverFit};object-position:center;background:var(--paper)">`,'uploaded-back-cover');else page(`<div class="eyebrow">PRAZERES INTERROMPIDOS</div><div class="cover-art"><span>pi</span></div><h2>O prazer<br>de continuar<br>a ler.</h2><p>Projeto Internacional de Promoção da Leitura,<br>dos Livros e dos Escritores</p><p>Publicação mensal · ${esc(edition.month)}</p><p>${edition.demo?'Edição experimental<br>Conteúdos exclusivamente demonstrativos.':''}</p><a href="https://www.prazeresinterrompidos.pt" target="_blank" rel="noopener" style="font-size:11px">www.prazeresinterrompidos.pt ↗</a>`,'cover generated-back-cover');
const indexEntries=contentsEntries;if(newsStart>=0)indexEntries.push({kind:'section',title:'Novidades do Projeto',subtitle:'',start:newsStart});indexEntries.push(...newsIndex);
const indexSheets=paginateContents(indexEntries);
for(let toc=0;toc<tocCount;toc++)pages[tocStart+toc].content='<div class="eyebrow">NESTA EDIÇÃO</div>'+(toc===0?'<h2>Índice.</h2>':'')+indexSheets[toc].map(contentsEntry).join('');
window.RevistaTheme?.start(pages,themeArticles);
if(flip){flip.destroy();$('#bookWrap').innerHTML='<div id="book"></div>'}$('#book').innerHTML=pages.map((p,i)=>`<div class="page ${p.cls} ${p.themeClass||''}" data-sheet-index="${i}" ${i===0||i===pages.length-1?'data-density="hard"':''}><div class="page-inner">${p.content}<div class="folio" ${(p.cls==='uploaded-cover'||p.cls==='uploaded-back-cover'||p.cls==='poster-page')?'hidden style="display:none"':''}><span>${edition.demo?'EDIÇÃO EXPERIMENTAL':'PRAZERES INTERROMPIDOS'}</span><span>${String(i+1).padStart(2,'0')}</span></div></div></div>`).join('');
if(editorialStart>=0)fitEditorialContent(pages[editorialStart],$('#book .editorial-page .page-inner'));
const mobile=matchMedia('(pointer: coarse)').matches||innerWidth<=700;document.body.classList.toggle('touch-reader',mobile);$('#hint').textContent=mobile?'Deslize para os lados ou use as setas. Use A+ para ampliar a leitura.':'Folheie pelos cantos ou use as setas.';let initial=0;const params=new URLSearchParams(location.hash.slice(1));try{initial=params.get('edicao')===edition.id?Number(params.get('pagina')||1)-1:Number(localStorage.getItem('pi-page-'+edition.id)||0)}catch{}if(new URLSearchParams(location.search).get('amostra')==='trailers'&&!params.has('pagina')&&trailerStart>=0)initial=trailerStart;initial=Math.max(0,Math.min(pages.length-1,initial||0));
flip=mobile?createTouchReader($('#book'),initial):new St.PageFlip($('#book'),{width:460,height:640,size:'stretch',minWidth:260,maxWidth:460,minHeight:362,maxHeight:640,showCover:true,usePortrait:true,autoSize:true,mobileScrollSupport:true,flippingTime:matchMedia('(prefers-reduced-motion: reduce)').matches?0:700,maxShadowOpacity:.18,startPage:initial,clickEventForward:true,useMouseEvents:true,swipeDistance:35});
flip.on('flip',e=>update(e.data));flip.loadFromHTML($('#book').querySelectorAll('.page'));$('#total').textContent='/ '+pages.length;$('#pageNumber').max=pages.length;update(initial);if(pageObserver)pageObserver.disconnect();pageObserver=new ResizeObserver(scalePages);pageObserver.observe($('#book'));requestAnimationFrame(scalePages);
}
function createTouchReader(book,initial){
 let current=initial,callback=()=>{},start=null,suppressClickUntil=0;
 const sheets=[...book.children];book.classList.add('touch-book');
 function show(i){current=Math.max(0,Math.min(sheets.length-1,i));sheets.forEach((el,n)=>{el.hidden=n!==current;el.setAttribute('aria-hidden',String(n!==current))});scalePages();callback({data:current})}
 const down=e=>{if(e.isPrimary===false||e.button>0){start=null;return}start={x:e.clientX,y:e.clientY,id:e.pointerId}};
 const cancel=()=>{start=null};
 const up=e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.6){suppressClickUntil=Date.now()+400;show(current+(dx<0?1:-1))}};
 const click=e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}};
 book.addEventListener('pointerdown',down);book.addEventListener('pointerup',up);book.addEventListener('pointercancel',cancel);book.addEventListener('click',click,true);
 return {on:(name,fn)=>{if(name==='flip')callback=fn},loadFromHTML:()=>show(initial),getCurrentPageIndex:()=>current,turnToPage:show,flipNext:()=>show(current+1),flipPrev:()=>show(current-1),destroy:()=>{book.removeEventListener('pointerdown',down);book.removeEventListener('pointerup',up);book.removeEventListener('pointercancel',cancel);book.removeEventListener('click',click,true)}};
}
function scalePages(){document.querySelectorAll('.page-inner').forEach(el=>{const w=el.parentElement.getBoundingClientRect().width;if(w)el.style.transform=`scale(${w/460})`})}
function update(i){$('#bookWrap').classList.toggle('first-cover',i===0);$('#bookWrap').classList.toggle('last-cover',i===pages.length-1);$('#pageNumber').value=i+1;document.querySelectorAll('.prev').forEach(b=>b.disabled=i<=0);document.querySelectorAll('.next').forEach(b=>b.disabled=i>=pages.length-1);try{localStorage.setItem('pi-page-'+edition.id,i)}catch{}history.replaceState(null,'','#edicao='+encodeURIComponent(edition.id)+'&pagina='+(i+1));window.RevistaAudio?.prepareVisible($('#book'),i);window.RevistaTrailers?.keepVisible(i);}
function go(i){if(!flip)return;flip.turnToPage(Math.max(0,Math.min(pages.length-1,i)));update(flip.getCurrentPageIndex());panel.close()}
document.querySelectorAll('.prev').forEach(b=>b.onclick=()=>flip.flipPrev());document.querySelectorAll('.next').forEach(b=>b.onclick=()=>flip.flipNext());$('#pageNumber').onchange=e=>go(Number(e.target.value)-1);
document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)go(Number(b.dataset.page));const a=e.target.closest('[data-audio]');if(a)openAudio(audioArticles[Number(a.dataset.audio)])});
$('#contents').onclick=()=>openPanel('<h2>Índice da edição</h2><button class="index-item" data-page="0">Capa <span>1</span></button>'+contentsEntries.map(contentsEntry).join(''));
$('#archive').onclick=()=>{openPanel(`<div class="eyebrow">PUBLICAÇÃO MENSAL</div><h2>Arquivo de edições</h2>${editions.filter(e=>draftPreview||RevistaPublication.isVisible(e)).map(e=>`<button class="archive-card" data-edition="${esc(e.id)}">${esc(e.month)}<small>N.º ${esc(e.number)} · ${e.released===true||draftPreview?'Revista do Podcast':'Capa disponível · Em breve'}</small></button>`).join('')}<p>As edições publicadas permanecem disponíveis neste arquivo.</p>`);panel.querySelectorAll('[data-edition]').forEach(b=>b.onclick=()=>{panel.close();if(draftPreview)loadEdition(b.dataset.edition);else void openPublishedEdition(b.dataset.edition,undefined,true)})};
function openAudio(a){const url=safeURL(a.audio);if(!url)return;openPanel('<h2>'+esc(a.title)+'</h2><p>Voz: '+esc(a.voice)+'</p>'+episodePlayer(a,audioArticles.indexOf(a)));window.RevistaAudio?.prepare(panel)}
function showReading(){window.RevistaTrailers?.stop();const p=pages[readingPage];window.RevistaTheme?.reading($('#readingContent'),p.article,themeArticles);if(p.trailer){const t=p.trailer;$('#readingContent').innerHTML='<div class="episode-decoration" aria-hidden="true"><span class="episode-motif-base"></span></div><h2>'+esc(t.title||'Book Trailer')+'</h2><p class="trailer-book-meta">'+[t.author,t.publisher].filter(Boolean).map(esc).join(' · ')+'</p>'+window.RevistaTrailers.markup(t);$('#readingContent').style.fontSize=fontSize+'px';window.RevistaAudio?.prepare($('#readingContent'));return}if(p.news){const n=p.news;$('#readingContent').innerHTML='<h2>'+esc(n.title)+'</h2>'+(n.image?'<img src="'+esc(safeImage(n.image))+'" alt="'+esc(n.title)+'" style="display:block;width:100%;height:auto;max-height:none">':'')+(n.hasText!==false?'<div class="article-prose">'+prose(n.text)+'</div>':'')+(n.url?'<a class="listen" href="'+esc(safeURL(n.url))+'" target="_blank" rel="noopener">Mais informações ↗</a>':'');$('#readingContent').style.fontSize=fontSize+'px';return}$('#readingContent').innerHTML=`<div style="font:11px Arial">PÁGINA ${readingPage+1} / ${pages.length}</div>`+(p.article?`${p.article.imageType==='poster'&&p.article.cover?`<img src="${esc(safeImage(p.article.cover))}" alt="Cartaz do episódio — ${esc(p.article.title)}" style="display:block;width:100%;height:auto;max-height:none">`:''}<h2>${esc(p.article.title)}</h2><div style="font:13px/1.6 Arial">${esc(p.article.author)} · ${esc(p.article.publisher)}<br>Voz: ${esc(p.article.voice)}</div>${p.article.hasText!==false?`<div class="article-prose">${prose(p.article.text)}</div>${articleCredits(p.article)}`:''}${p.article.audio?episodePlayer(p.article,audioArticles.indexOf(p.article)):''}`:p.content);if(p.lastPageImage)$('#readingContent').innerHTML=lastPageMarkup(p.lastPageImage,p.lastPageLink,true);else if(p.cls==='uploaded-cover'||p.cls==='uploaded-back-cover')$('#readingContent').innerHTML=`<img src="${esc(safeImage(p.cls==='uploaded-back-cover'?edition.backCover:edition.cover))}" alt="${p.cls==='uploaded-back-cover'?'Contracapa':'Capa'} da revista" style="display:block;width:100%;max-height:none;height:auto">`;$('#readingContent').style.fontSize=fontSize+'px';window.RevistaAudio?.prepare($('#readingContent'))}
$('#zoom').onclick=()=>{readingPage=flip.getCurrentPageIndex();showReading();$('#reading').showModal()};$('#closeReading').onclick=()=>$('#reading').close();$('#reading').addEventListener('close',()=>window.RevistaTrailers?.stop());$('#larger').onclick=()=>{fontSize=Math.min(36,fontSize+2);showReading()};$('#smaller').onclick=()=>{fontSize=Math.max(16,fontSize-2);showReading()};$('#readingPrev').onclick=()=>{readingPage=Math.max(0,readingPage-1);showReading()};$('#readingNext').onclick=()=>{readingPage=Math.min(pages.length-1,readingPage+1);showReading()};$('#reading').addEventListener('close',()=>go(readingPage));
function immersive(on){document.body.classList.toggle('immersive',on);$('#fullscreen').innerHTML=on?'⛶ <span>Sair de ecrã completo</span>':'⛶ <span>Ecrã completo</span>';requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))}
$('#fullscreen').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();immersive(false);return}if(document.body.classList.contains('immersive')){immersive(false);return}try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();immersive(true)}catch{immersive(true)}};
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)immersive(false)});document.addEventListener('keydown',e=>{if(e.key==='Escape')immersive(false)});
document.addEventListener('keydown',e=>{if(!flip||e.target.matches('input,textarea')||panel.open||$('#reading').open)return;if(e.key==='ArrowRight')flip.flipNext();if(e.key==='ArrowLeft')flip.flipPrev()});
if(new URLSearchParams(location.search).get('preview')==='embedded'&&window.parent!==window){window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==window.parent||e.data?.type!=='pi-preview-edition')return;const draft=e.data.edition;if(!draft||!Array.isArray(draft.articles))return;draftPreview=true;editions=[draft];loadEdition(draft.id)});window.parent.postMessage({type:'pi-preview-ready'},location.origin);}else if(draftPreview)loadEdition(editions[0].id);else void openPublishedEdition(new URLSearchParams(location.hash.slice(1)).get('edicao'));


// Partilha da página atual e versão PDF com a mesma paginação do leitor.
const readerActions=document.createElement('div');
readerActions.className='controls';
readerActions.innerHTML='<button id="sharePage">↗ Partilhar esta página</button><span class="divider"></span><button id="downloadPDF">↓ Guardar revista em PDF</button><span id="exportState" role="status" style="font-size:12px"></span>';
document.querySelector('.controls').insertAdjacentElement('afterend',readerActions);
function pageShareData(){
 const url=new URL('index.html',location.href);url.search='';url.hash=new URLSearchParams({edicao:edition.id,pagina:String(Number($('#pageNumber').value)||1)}).toString();
 return {url:url.href,title:'Prazeres Interrompidos · N.º '+edition.number,text:edition.month+' · Página '+$('#pageNumber').value};
}
$('#sharePage').onclick=()=>{
 if(new URLSearchParams(location.search).has('preview')||new URLSearchParams(location.search).has('rascunho')){openPanel('<h2>Partilhar esta página</h2><p>Publique a edição antes de partilhar. Esta pré-visualização contém alterações que os leitores ainda não podem ver.</p>');return}
 const data=pageShareData(),u=encodeURIComponent(data.url),message=encodeURIComponent(data.title+' · '+data.text+' '+data.url);
 const networks=[['WhatsApp','https://wa.me/?text='+message],['Facebook','https://www.facebook.com/sharer/sharer.php?u='+u],['Telegram','https://t.me/share/url?url='+u+'&text='+encodeURIComponent(data.title+' · '+data.text)],['X','https://twitter.com/intent/tweet?url='+u+'&text='+encodeURIComponent(data.title+' · '+data.text)],['LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+u],['Email','mailto:?subject='+encodeURIComponent(data.title)+'&body='+message]];
 openPanel('<h2>Partilhar esta página</h2><p>'+esc(data.text)+'</p><div style="display:flex;flex-wrap:wrap;gap:12px">'+networks.map(([label,url])=>'<a style="padding:12px;border:1px solid #c8bdad" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+label+'</a>').join('')+'</div><p><button id="nativeShare" style="padding:12px" '+(!navigator.share?'hidden':'')+'>Mais aplicações…</button><button id="copyPageLink" style="padding:12px">Copiar ligação</button></p><input id="pageShareLink" aria-label="Ligação desta página" readonly style="width:100%;padding:10px" value="'+esc(data.url)+'"><p id="shareState" role="status"></p><p class="note">A ligação abre esta edição na página selecionada. Para Instagram e outras aplicações, use «Mais aplicações» quando disponível ou copie a ligação.</p>');
 $('#nativeShare').onclick=async()=>{try{await navigator.share(data)}catch(error){if(error.name!=='AbortError')$('#shareState').textContent='Copie a ligação para partilhar nesta aplicação.'}};
 $('#copyPageLink').onclick=async()=>{try{await navigator.clipboard.writeText(data.url);$('#shareState').textContent='Ligação copiada.'}catch{$('#pageShareLink').select();$('#shareState').textContent='Selecione e copie a ligação apresentada.'}};
};
let pdfFrame;
$('#downloadPDF').onclick=async()=>{
 const button=$('#downloadPDF'),notice=$('#exportState');button.disabled=true;notice.textContent='A preparar as páginas…';
 try{
 await Promise.all([window.RevistaTheme?.ready(),editionColorReady]);
 if(pdfFrame)pdfFrame.remove();pdfFrame=document.createElement('iframe');pdfFrame.title='Edição preparada para guardar em PDF';pdfFrame.style.cssText='position:fixed;left:-10000px;top:0;width:460px;height:640px;border:0';document.body.append(pdfFrame);
 const doc=pdfFrame.contentDocument;
 const styles=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l=>'<link rel="stylesheet" href="'+esc(l.href)+'">').join('')+'<style>'+textStyles.textContent+editionColorStyle.textContent+(window.RevistaTheme?.css()||'')+'</style>';
 const content=pages.map((p,i)=>'<section id="pdf-page-'+(i+1)+'" class="page '+esc(p.cls+(p.themeClass?' '+p.themeClass:''))+'"><div class="page-inner">'+p.content+((p.cls==='uploaded-cover'||p.cls==='uploaded-back-cover'||p.cls==='poster-page')?'':'<div class="folio"><span>'+(edition.demo?'EDIÇÃO EXPERIMENTAL':'PRAZERES INTERROMPIDOS')+'</span><span>'+String(i+1).padStart(2,'0')+'</span></div>')+'</div></section>').join('');
 doc.open();doc.write('<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Prazeres Interrompidos - '+esc(edition.month)+' - N.º '+esc(edition.number)+'</title>'+styles+'<style>@page{size:460px 640px;margin:0}html,body{margin:0;padding:0;width:460px;background:white}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{position:relative!important;display:block!important;width:460px!important;height:640px!important;margin:0!important;break-after:page;page-break-after:always;break-inside:avoid;border:0;box-shadow:none!important;overflow:hidden}.page:last-child{break-after:auto;page-break-after:auto}.page-inner{position:relative!important;width:460px!important;height:640px!important;transform:none!important}.index-item{color:inherit}.listen{text-decoration:none}a{color:inherit;text-decoration:none}</style></head><body>'+content+'</body></html>');doc.close();
 // Keep audio and index destinations clickable in the PDF.
 doc.querySelectorAll('.mini-player[data-episode-index]').forEach(el=>{const a=doc.createElement('a');a.className='listen'+(el.classList.contains('poster-player')?' poster-player':'');a.textContent='▶ Ouvir o episódio';a.href=safeURL(audioArticles[Number(el.dataset.episodeIndex)].audio);a.dataset.pdfAudio='true';el.replaceWith(a)});
 doc.querySelectorAll('[data-audio]').forEach(el=>{const a=document.createElement('a');a.className=el.className;a.textContent=el.textContent;a.href=safeURL(audioArticles[Number(el.dataset.audio)].audio);a.dataset.pdfAudio='true';el.replaceWith(a)});
 doc.querySelectorAll('[data-page]').forEach(el=>{const a=doc.createElement('a');a.className=el.className;a.innerHTML=el.innerHTML;a.setAttribute('href','#pdf-page-'+(Number(el.dataset.page)+1));el.replaceWith(a)});
 doc.querySelectorAll('.trailer-open-link').forEach(el=>el.remove());
 doc.querySelectorAll('.trailer-card[data-video-url]').forEach(el=>{const media=window.RevistaTrailers.videoSource(el.dataset.videoSource);if(!media)return;const url=media.url;el.classList.add('trailer-pdf');const button=el.querySelector('[data-trailer-play]');if(button){const link=doc.createElement('a');link.className=button.className;link.href=url;link.dataset.pdfVideo='true';link.setAttribute('aria-label','Ver Book Trailer no '+media.label);link.innerHTML=button.innerHTML;button.replaceWith(link)}});
 doc.querySelectorAll('a[href]').forEach(a=>{if(a.dataset.pdfAudio||a.dataset.pdfNews||a.dataset.pdfLastPage||a.dataset.pdfVideo||a.getAttribute('href').startsWith('#pdf-page-'))return;const span=doc.createElement('span');span.className=a.className;span.innerHTML=a.innerHTML;a.replaceWith(span)});
 await Promise.all(Array.from(doc.images).map(img=>img.complete?(img.naturalWidth?Promise.resolve():Promise.reject(Error('Uma imagem não carregou.'))):new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Uma imagem não carregou. Verifique as imagens e tente novamente.'))})));
 await doc.fonts.ready;
 await new Promise(resolve=>{if(doc.readyState==='complete')resolve();else pdfFrame.onload=resolve});
 notice.textContent='Escolha «Guardar como PDF» na janela de impressão, com escala 100%, sem cabeçalhos nem rodapés.';
 pdfFrame.contentWindow.focus();pdfFrame.contentWindow.print();
 }catch(error){notice.textContent='Não foi possível preparar o PDF. '+error.message}
 finally{button.disabled=false}
};





