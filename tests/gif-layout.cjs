const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function reader({imagesFail=false}={}){
 const requests=[],frames=[],styles=new Map(),writes=[],queued=[];
 const document={documentElement:{},querySelectorAll:selector=>selector==='.gif-page .page-inner'?frames:[],addEventListener(){}};
 const context={window:{RevistaTrailers:{hasText:()=>false},RevistaFilmCatalog:{match:item=>({item:{poster:'https://example.org/'+item.title+'.jpg',url:'https://example.org/'+item.title+'.gif',pageUrl:'https://example.org/livro/'+item.title}})}},document,matchMedia:()=>({matches:false,addEventListener(){}}),MutationObserver:class{observe(){}},ResizeObserver:class{observe(){}unobserve(){}},getComputedStyle:element=>element===frame?{paddingTop:'10px',paddingBottom:'10px',borderTopWidth:'7px',borderBottomWidth:'7px'}:{paddingBottom:'33px'},requestAnimationFrame:callback=>queued.push(callback),setTimeout,clearTimeout,Image:class{complete=false;naturalWidth=0;naturalHeight=0;set src(value){requests.push(value);queueMicrotask(()=>{if(imagesFail)this.onerror();else{this.naturalWidth=600;this.naturalHeight=900;this.complete=true;this.onload();}});}}};
 const frame={style:{setProperty:(key,value)=>{styles.set(key,value);writes.push(value);},getPropertyValue:key=>styles.get(key)||''}};
 const inner={clientWidth:0,clientHeight:0,querySelector:selector=>({'.gif-shell':{offsetTop:200,querySelector:()=>({offsetHeight:32})},'.gif-frame':frame,'.folio':{offsetHeight:24},'.gif-audio':{offsetHeight:40}}[selector])};frames.push(inner);
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../book-gifs.js'),'utf8'),context);
 return {gifs:context.window.RevistaGIFs,requests,document,inner,styles,writes,queued};
}
test('páginas ocultas não recebem a altura mínima e o GIF é dimensionado antes do próximo fotograma',()=>{
 const api=reader();api.gifs.fitFrames(api.document);assert.equal(api.writes.length,0);
 api.inner.clientHeight=640;api.inner.clientWidth=460;api.gifs.keepVisible(47);assert.equal(api.styles.get('--gif-image-height'),'257px');
 api.inner.clientHeight=0;api.inner.clientWidth=0;api.gifs.fitFrames(api.document);assert.equal(api.styles.get('--gif-image-height'),'257px');
 api.inner.clientHeight=640;api.inner.clientWidth=460;api.gifs.fitFrames(api.document);assert.equal(api.writes.length,1);
});
test('as dimensões da imagem fixa são conhecidas antes da criação da página sem descarregar a animação',async()=>{
 const api=reader(),item={title:'Livro',author:'Autora'};
 await Promise.all([api.gifs.preload([item,item]),api.gifs.preload([item])]);
 assert.deepEqual(api.requests,['https://example.org/Livro.jpg']);
 const markup=api.gifs.markup(item);assert.match(markup,/width="600" height="900"/);assert.match(markup,/loading="eager"/);assert(!markup.includes('loading="lazy"'));
 assert.match(markup,/src="https:\/\/example.org\/Livro.jpg"/);assert.match(markup,/data-gif-source="https:\/\/example.org\/Livro.gif"/);
});
test('uma imagem fixa indisponível não impede a abertura da revista',async()=>{
 const api=reader({imagesFail:true}),item={title:'Livro',author:'Autora'};await api.gifs.preload([item]);assert.match(api.gifs.markup(item),/class="gif-image"/);
});
