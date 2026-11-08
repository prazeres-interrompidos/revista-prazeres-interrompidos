const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const origin = 'https://book-trailers-prazeres-interrompidos.oct-nuno.chatgpt.site';
const film = (id, title, author, subtitle = '') => ({id,title,author,subtitle,kind:'film',sourceFile:title+', '+author+'.mp4',url:origin+'/media/'+id+'.mp4',poster:origin+'/media/'+id+'.jpg',pageUrl:origin+'/livro/'+id});
function client(items) {
  let calls = 0, fail = false;
  const context = {window:{},URL,AbortController,setTimeout,clearTimeout,MutationObserver:class {observe(){}},location:{href:'https://prazeres-interrompidos.github.io/revista-prazeres-interrompidos/'},document:{documentElement:{},querySelectorAll:()=>[],addEventListener(){}},fetch:async()=>{calls++;return {ok:!fail,json:async()=>({version:1,items})}}};
  vm.createContext(context);
  for (const file of ['trailer-catalog.js','book-trailers.js']) vm.runInContext(fs.readFileSync(require.resolve('../'+file),'utf8'),context);
  return {catalog:context.window.RevistaFilmCatalog,player:context.window.RevistaTrailers,calls:()=>calls,fail:()=>{fail=true}};
}
test('Título e autor coincidem apesar de acentos, maiúsculas e pontuação',async()=>{
  const c=client([film('ines','O Novo Mundo da Inês','Sara de Almeida Leite','Mais Tolerância, Por Favor!')]);await c.catalog.load();
  const result=c.catalog.match({title:'O NOVO MUNDO DA INES - Mais Tolerancia, Por Favor!',author:'Sara de Almeida Leite'});
  assert.equal(result.item.id,'ines');
  assert.equal(c.catalog.match({title:'O Novo Mundo da Inês',author:'Outro autor'}).status,'missing');
});
test('Volumes e vídeos duplicados exigem uma correspondência ou escolha explícita',async()=>{
  const c=client([film('v1','Obras','Autora','Volume 1'),film('v2','Obras','Autora','Volume 2')]);await c.catalog.load();
  assert.equal(c.catalog.match({title:'Obras',author:'Autora'}).status,'ambiguous');
  assert.equal(c.catalog.match({title:'Obras — Volume 2',author:'Autora'}).item.id,'v2');
  assert.equal(c.catalog.match({title:'Obras',author:'Autora',filmId:'v1'}).item.id,'v1');
  assert.equal(c.catalog.match({title:'Outro livro',author:'Autora',filmId:'v1'}).status,'missing');
});
test('Um GIF não é escolhido como filme',async()=>{
  const gif=film('gif','Livro','Autora');gif.kind='gif';gif.url=origin+'/media/gif.gif';
  const c=client([gif]);await c.catalog.load();assert.equal(c.catalog.match({title:'Livro',author:'Autora'}).status,'missing');
});
test('Rejeita destinos de ficheiros fora do alojamento partilhado e IDs duplicados',()=>{
  const c=client([]),item=film('livro','Livro','Autora');
  for(const url of ['javascript:alert(1)','https://outro.example/video.mp4',origin+'/media/livro.mp4?token=abc'])assert.throws(()=>c.catalog.validateCatalog({version:1,items:[{...item,url}]}));
  assert.throws(()=>c.catalog.validateCatalog({version:1,items:[item,item]}));
});
test('Consultas simultâneas partilham um pedido e uma falha mantém o catálogo conhecido',async()=>{
  const c=client([film('livro','Livro','Autora')]);await Promise.all([c.catalog.load(),c.catalog.load()]);assert.equal(c.calls(),1);
  c.fail();await c.catalog.load(true);assert(c.catalog.state().error);assert.equal(c.catalog.match({title:'Livro',author:'Autora'}).item.id,'livro');
});
test('O leitor usa o mesmo MP4 da coleção sem depender da ligação manual antiga',async()=>{
  const c=client([film('livro','Livro','Autora')]);await c.catalog.load();
  const html=c.player.markup({title:'Livro',author:'Autora',youtube:'https://1drv.ms/ligacao-antiga'});
  assert(html.includes('<video class="trailer-video" controls playsinline preload="none"'));
  assert(html.includes('src="'+origin+'/media/livro.mp4"'));
  assert(html.includes('data-video-url="'+origin+'/livro/livro"'));
  assert(!html.includes('1drv.ms'));
});
