const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../edition-color.js');
const colors=globalThis.RevistaEditionColor;
const divider=key=>({cls:'cover section-divider',sectionKey:key});
const paper=()=>({cls:'text-page'});

test('as opções começam em novembro de 2026 e continuam nos anos seguintes',()=>{
 for(const id of ['2026-09','2026-10','2025-12'])assert.equal(colors.eligible({id,month:'novembro 2026'}),false,id);
 for(const id of ['2026-11','2026-12','2027-01','2028-11'])assert.equal(colors.eligible({id}),true,id);
 assert.equal(colors.eligible({id:'nova-edicao-123',month:'Novembro 2026'}),true);
 assert.equal(colors.eligible({id:'nova-edicao-123',month:'março de 2027'}),true);
 assert.equal(colors.eligible({id:'nova-edicao-123',month:'outubro 2026'}),false);
 assert.equal(colors.eligible({id:'desconhecida'}),false);
});

test('cada secção conserva a própria cor mesmo quando a ordem muda',async()=>{
 const edition={id:'2026-11',sectionColors:{articles:{mode:'custom',color:'#123456'},extraArticles:{mode:'custom',color:'#aabbcc'}}};
 const before=structuredClone(edition);
 const css=await colors.sections(edition,[divider('extraArticles'),paper(),divider('articles'),paper()]);
 assert.match(css,/\.section-next-page-0[^\n]*background:#aabbcc/);
 assert.match(css,/\.section-next-page-2[^\n]*background:#123456/);
 assert.deepEqual(edition,before);
});

test('outubro ignora cores personalizadas importadas e não altera as páginas',async()=>{
 const pages=[divider('articles'),paper()],before=structuredClone(pages);
 assert.equal(await colors.sections({id:'2026-10',sectionColors:{articles:{mode:'custom',color:'#ff0000'}}},pages),'');
 assert.deepEqual(pages,before);
 assert.equal(await colors.resolve({id:'2026-10',sectionTheme:{mode:'custom',color:'#ff0000'}}),null);
});

test('voltar ao automático usa a cor do título e conserva a cor manual guardada',async()=>{
 const edition={id:'2027-01',sectionColors:{articles:{mode:'auto',color:'#abcdef'}}};
 const css=await colors.sections(edition,[divider('articles'),paper()]);
 assert.match(css,/background:#272925/);
 assert.doesNotMatch(css,/background:#abcdef/);
 assert.equal(edition.sectionColors.articles.color,'#abcdef');
});

test('uma cor inválida não entra no CSS e usa o automático',async()=>{
 const edition={id:'2026-12',sectionColors:{articles:{mode:'custom',color:'red;}body{display:none'}}};
 const css=await colors.sections(edition,[divider('articles'),paper()]);
 assert.match(css,/background:#272925/);
 assert.doesNotMatch(css,/display:none/);
});

test('a cor manual não fica à espera do tratamento de imagens',async()=>{
 globalThis.RevistaTheme={ready:()=>new Promise(()=>{})};
 const edition={id:'2026-11',sectionColors:{news:{mode:'custom',color:'#112233'}}};
 const css=await colors.sections(edition,[{cls:'cover news-transition',sectionKey:'news'},{cls:'poster-page',news:{image:'imagem-indisponivel'}}]);
 assert.match(css,/background:#112233/);
 delete globalThis.RevistaTheme;
});

function mockSheets(t,sheets){
 const before={document:globalThis.document,getComputedStyle:globalThis.getComputedStyle};
 globalThis.document={getElementById:()=>({querySelector:selector=>sheets[Number(selector.match(/"(\d+)"/)[1])]})};
 globalThis.getComputedStyle=element=>({color:element.color,getPropertyValue:name=>element.variables?.[name]||''});
 t.after(()=>{for(const key of Object.keys(before)){if(before[key]===undefined)delete globalThis[key];else globalThis[key]=before[key]}});
}
const mockSheet=(titleColor,variables={})=>({variables,color:'rgb(39, 41, 37)',querySelector:()=>titleColor?{textContent:'Título do livro',color:titleColor}:null});

test('o automático usa a letra do primeiro título após o cartaz e repete-a no índice',async t=>{
 const first={},second={};
 mockSheets(t,{1:mockSheet(null,{'--wine':'#aaaaaa'}),2:mockSheet('rgb(21, 67, 89)'),3:mockSheet('rgb(255, 0, 0)')});
 const css=await colors.sections({id:'2026-11'},[divider('articles'),{cls:'poster-page',article:first},{cls:'text-page',article:first},{cls:'text-page',article:second}]);
 assert.match(css,/background:#154359/);
 assert.match(css,/\.index-item\.index-section\.section-color-link-0>span:first-child\{color:#154359\}/);
 assert.doesNotMatch(css,/#aaaaaa|#ff0000/);
});

test('um cartaz sem texto usa a cor de título do próprio tema sem copiar o livro seguinte',async t=>{
 const first={},second={};
 mockSheets(t,{1:mockSheet(null,{'--wine':'#3b6451'}),2:mockSheet('rgb(255, 0, 0)')});
 const css=await colors.sections({id:'2026-12'},[divider('articles'),{cls:'poster-page',themeClass:'episode-themed episode-theme-0',article:first},{cls:'text-page',article:second}]);
 assert.match(css,/background:#3b6451/);
 assert.doesNotMatch(css,/#ff0000/);
});

test('uma escolha manual é repetida exatamente no índice',async()=>{
 const css=await colors.sections({id:'2027-01',sectionColors:{news:{mode:'custom',color:'#a1b2c3'}}},[{cls:'cover news-transition',sectionKey:'news'},paper()]);
 assert.match(css,/background:#a1b2c3/);
 assert.match(css,/section-color-link-0>span:first-child\{color:#a1b2c3\}/);
});
