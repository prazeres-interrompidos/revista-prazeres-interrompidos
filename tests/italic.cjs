const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../poetry.js');
const p=globalThis.RevistaPoetry;
const plain=text=>text.replace(/\[\/?italico\]/g,'');
const italicText=html=>[...html.matchAll(/<em>([\s\S]*?)<\/em>/g)].map(match=>match[1]).join('');

test('aplica e retira itálico mantendo a seleção e o texto original',()=>{
 const original='O prazer de ler.';
 const applied=p.toggleItalic(original,2,8);
 assert.equal(applied.value,'O [italico]prazer[/italico] de ler.');
 assert.equal(p.render(applied.value),'<p>O <em>prazer</em> de ler.</p>');
 assert(p.selectionIsItalic(applied.value,applied.start,applied.end));
 assert.equal(p.toggleItalic(applied.value,applied.start,applied.end).value,original);
 assert.equal(p.toggleItalic(original,2,2),null);
});

test('retira itálico só da palavra selecionada, conservando o restante',()=>{
 const source='[italico]um livro aberto[/italico]',start=source.indexOf('livro');
 const result=p.toggleItalic(source,start,start+5);
 assert.equal(p.render(result.value),'<p><em>um </em>livro<em> aberto</em></p>');
 assert.equal(plain(result.value),'um livro aberto');
});

test('uma seleção mista passa a itálico sem duplicar os marcadores',()=>{
 const source='um [italico]livro[/italico] aberto';
 const result=p.toggleItalic(source,0,source.length);
 assert.equal(p.render(result.value),'<p><em>um livro aberto</em></p>');
 assert.equal(p.toggleItalic(result.value,result.start,result.end).value,'um livro aberto');
});

test('itálico em vários parágrafos mantém alinhamentos, versos e estrofes',()=>{
 const source='[alinhar=center]Primeiro parágrafo.\nSegundo parágrafo.\n[poema]\nVerso um\n\nVerso dois\n[/poema]';
 const result=p.toggleItalic(source,0,source.length);
 assert.match(result.value,/^\[alinhar=center\]\[italico\]Primeiro/);
 assert(p.parse(result.value).some(part=>part.poem));
 const html=p.render(result.value);
 assert.match(html,/<p style="text-align:center"><em>Primeiro parágrafo\.<\/em><\/p>/);
 assert.match(html,/<div class="poem"><em>Verso um<\/em>\n\n<em>Verso dois<\/em><\/div>/);
 assert.equal(plain(result.value),source);
});

test('o texto continua escapado, incluindo conteúdo entre marcadores',()=>{
 const source='[italico]<script>alert("x")</script> & livros[/italico]';
 const html=p.render(source);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/<em>&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; livros<\/em>/);
 assert(p.hasFormatting(source));
});

test('a paginação conserva o itálico através de várias páginas',()=>{
 const source='Antes [italico]um dois três quatro cinco seis sete oito nove dez[/italico] depois.';
 const pages=p.paginate(source,candidate=>plain(candidate).length<=18,()=>{});
 assert(pages.length>2);
 assert.equal(pages.map(plain).join(''),plain(source));
 const html=pages.map(page=>p.render(page));
 for(const page of html)assert.equal((page.match(/<em>/g)||[]).length,(page.match(/<\/em>/g)||[]).length);
 assert.equal(html.map(italicText).join(''),'um dois três quatro cinco seis sete oito nove dez');
 assert(html.every(page=>!page.includes('[italico]')&&!page.includes('[/italico]')));
});

test('não divide uma palavra quando só algumas letras estão em itálico',()=>{
 const pages=p.paginate('Um a[italico]mor[/italico] basta.',candidate=>plain(candidate).length<=5,()=>{});
 assert(pages.some(page=>plain(page).trim()==='amor'));
 assert.equal(pages.map(plain).join(''),'Um amor basta.');
});

test('poemas conservam o itálico e todos os versos ao mudar de página',()=>{
 const verse='Primeiro verso\nSegundo verso\n\nTerceiro verso\nQuarto verso';
 const source='[poema]\n[italico]'+verse+'[/italico]\n[/poema]';
 const pages=p.paginate(source,candidate=>p.parse(candidate).filter(part=>part.poem).reduce((n,part)=>n+plain(part.text).length,0)<=25,()=>{});
 assert(pages.length>1);
 assert.equal(pages.flatMap(page=>p.parse(page).filter(part=>part.poem)).map(part=>plain(part.text)).join(''),verse);
 assert.equal(pages.map(page=>italicText(p.render(page))).join(''),verse);
});

test('os alinhamentos e a prosa existentes mantêm a apresentação',()=>{
 assert.equal(p.render('[alinhar=right]Primeiro\nSegundo'),'<p style="text-align:right">Primeiro</p><p>Segundo</p>');
 const source='Primeiro parágrafo.\nSegundo parágrafo.';
 assert.equal(p.paginate(source,()=>true,()=>{}).join(''),source);
 const italic='[italico]Texto[/italico]';
 const result=p.setAlignment(italic,0,italic.length,'center');
 assert.equal(p.render(result.value),'<p style="text-align:center"><em>Texto</em></p>');
});
