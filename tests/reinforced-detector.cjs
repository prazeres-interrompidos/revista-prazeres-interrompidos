const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../automatic-background.js');
const artwork=globalThis.RevistaArtwork;
const word=(text,confidence,bbox)=>({text,confidence,bbox});
const data=words=>({blocks:[{paragraphs:[{lines:[{words}]}]}]});

test('o reforço identifica uma letra isolada e o traço adjacente sem mudar o automático',()=>{
 const input=data([word('o',90,{x0:24,y0:235,x1:39,y1:253}),word('–',70,{x0:45,y0:241,x1:58,y1:244})]);
 assert.deepEqual(artwork.textBoxes(input,'Descolonizar O Sujeito Poético',593,876),[]);
 const boxes=artwork.reinforcedTextBoxes(input,'Descolonizar O Sujeito Poético',593,876);
 assert(boxes.some(box=>box[0]<24&&box[2]>58));
 assert.deepEqual(artwork.reinforcedTextBoxes(input,'Outro livro',593,876),[]);
});
test('o reforço recupera títulos grandes conhecidos e rejeita desenhos pouco fiáveis',()=>{
 const input=data([word('DESCOLONIZAR',80,{x0:24,y0:20,x1:350,y1:240})]);
 assert.equal(artwork.textBoxes(input,'Descolonizar O Sujeito Poético',593,876).length,0);
 assert(artwork.reinforcedTextBoxes(input,'Descolonizar O Sujeito Poético',593,876).length>0);
 const uncertain=data([word('AAAA',20,{x0:20,y0:40,x1:60,y1:60})]);
 assert.deepEqual(artwork.reinforcedTextBoxes(uncertain,'',593,876),[]);
});
test('letras isoladas detetadas em recortes inferiores não são tratadas como o topo',()=>{
 const input=data([word('O',90,{x0:24,y0:40,x1:39,y1:58})]);
 assert.deepEqual(artwork.reinforcedTextBoxes(input,'O livro',593,350,876,526),[]);
});
test('datas do título e palavras muito grandes têm apoio do título e autor conhecidos',()=>{
 const input=data([word('RÚSSIA',90,{x0:20,y0:20,x1:570,y1:320})]);
 assert(artwork.reinforcedTextBoxes(input,'Rússia Revolução e Guerra Civil 1917-1921',593,876).length>0);
 const dates=data([word('1917-1921',90,{x0:140,y0:350,x1:400,y1:390})]);
 assert.equal(artwork.textBoxes(dates,'Rússia 1917-1921',593,876).length,0);
 assert(artwork.reinforcedTextBoxes(dates,'Rússia 1917-1921',593,876).length>0);
 assert.deepEqual(artwork.reinforcedTextBoxes(dates,'Outro título',593,876),[]);
});
test('o contraste local encontra letras claras e escuras sem modificar os píxeis originais',()=>{
 for(const light of [false,true]){
  const pixels=new Uint8ClampedArray(13*13*4);
  for(let i=0;i<13*13;i++){pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=light?20:230;pixels[i*4+3]=255;}
  const center=(6*13+6)*4;pixels[center]=pixels[center+1]=pixels[center+2]=light?245:10;
  const original=pixels.slice(),result=artwork.adaptivePixels(pixels,13,13,light);
  assert.equal(result[center],0);assert.equal(result[0],255);assert.deepEqual(pixels,original);
 }
});
test('a análise das marcas pequenas distingue um anel com traço de pontos decorativos',()=>{
 const width=100,height=160,binary=new Uint8ClampedArray(width*height*4);binary.fill(255);
 const ink=(x,y)=>{binary[(y*width+x)*4]=0;binary[(y*width+x)*4+1]=0;binary[(y*width+x)*4+2]=0;};
 for(let y=25;y<=33;y++)for(let x=10;x<=17;x++)if(x===10||x===17||y===25||y===33)ink(x,y);
 for(let y=29;y<=30;y++)for(let x=21;x<=28;x++)ink(x,y);
 ink(60,15);ink(80,25);
 const boxes=artwork.captionMarkBoxes(binary,width,height);
 assert.equal(boxes.length,1);assert(boxes[0][0]<10&&boxes[0][2]>28);
 const empty=new Uint8ClampedArray(binary.length);empty.fill(255);assert.deepEqual(artwork.captionMarkBoxes(empty,width,height),[]);
});
