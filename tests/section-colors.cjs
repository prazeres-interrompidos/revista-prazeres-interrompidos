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

test('voltar ao automático usa o fundo seguinte e conserva a cor manual guardada',async()=>{
 const edition={id:'2027-01',sectionColors:{articles:{mode:'auto',color:'#abcdef'}}};
 const css=await colors.sections(edition,[divider('articles'),paper()]);
 assert.match(css,/background:#faf7ef/);
 assert.doesNotMatch(css,/background:#abcdef/);
 assert.equal(edition.sectionColors.articles.color,'#abcdef');
});

test('uma cor inválida não entra no CSS e usa o automático',async()=>{
 const edition={id:'2026-12',sectionColors:{articles:{mode:'custom',color:'red;}body{display:none'}}};
 const css=await colors.sections(edition,[divider('articles'),paper()]);
 assert.match(css,/background:#faf7ef/);
 assert.doesNotMatch(css,/display:none/);
});

test('a cor manual não fica à espera do tratamento de imagens',async()=>{
 globalThis.RevistaTheme={ready:()=>new Promise(()=>{})};
 const edition={id:'2026-11',sectionColors:{news:{mode:'custom',color:'#112233'}}};
 const css=await colors.sections(edition,[{cls:'cover news-transition',sectionKey:'news'},{cls:'poster-page',news:{image:'imagem-indisponivel'}}]);
 assert.match(css,/background:#112233/);
 delete globalThis.RevistaTheme;
});
