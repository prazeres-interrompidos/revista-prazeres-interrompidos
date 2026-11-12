const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../poetry.js');
const p=globalThis.RevistaPoetry;
const plain=text=>text.replace(/\[\/?(?:italico|negrito|sublinhado)\]/g,'');
test('negrito, itálico e sublinhado podem ser combinados',()=>{
 const source='[negrito][italico][sublinhado]Livro[/sublinhado][/italico][/negrito]';
 assert.equal(p.render(source),'<p><strong><em><u>Livro</u></em></strong></p>');
 assert(p.hasFormatting('[negrito]Livro[/negrito]'));
 assert(p.hasFormatting('[sublinhado]Livro[/sublinhado]'));
});
test('a paginação conserva negrito e sublinhado em todas as páginas',()=>{
 const words='Um dois três quatro cinco seis sete oito nove dez onze doze.';
 const pages=p.paginate('[negrito][sublinhado]'+words+'[/sublinhado][/negrito]',value=>plain(value).length<=15,()=>{});
 assert(pages.length>2);
 assert.equal(pages.map(plain).join(''),words);
 for(const page of pages)assert.match(p.render(page),/^<p><strong><u>[^]*<\/u><\/strong><\/p>$/);
});
test('poemas conservam estrofes e HTML continua a ser escapado',()=>{
 const source='[poema]\n[negrito]Um verso\n\n[sublinhado]<livro>[/sublinhado][/negrito]\n[/poema]';
 const html=p.render(source);
 assert.match(html,/Um verso\n\n/);
 assert.match(html,/<strong><u>&lt;livro&gt;<\/u><\/strong>/);
 assert.doesNotMatch(html,/<livro>/);
});
