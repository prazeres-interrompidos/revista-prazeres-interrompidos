/* Preserve verses and paragraph alignment as plain text in edition files and backups. */
(function(root){
'use strict';
const OPEN='[poema]',CLOSE='[/poema]';
const ALIGNMENT=/^\[alinhar=(left|center|right|justify)\]/;
const alignments=new Set(['left','center','right','justify']);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const poemPattern=()=>/^\[poema\][ \t]*\n([\s\S]*?)\n\[\/poema\][ \t]*(?=\n|$)/gm;
const lines=text=>text.match(/[^\n]*\n|[^\n]+$/g)||[];
function parse(value){
  const text=String(value??'').replace(/\r\n?/g,'\n'),parts=[];
  let start=0;
  for(const match of text.matchAll(poemPattern())){
    if(match.index>start)parts.push({poem:false,text:text.slice(start,match.index)});
    parts.push({poem:true,text:match[1]});
    start=match.index+match[0].length;
  }
  if(start<text.length)parts.push({poem:false,text:text.slice(start)});
  return parts;
}
function blocks(value){
  return parse(value).flatMap(part=>part.poem?[part]:lines(part.text).map(line=>{
    const marker=line.match(ALIGNMENT);
    return {poem:false,alignment:marker?.[1],text:marker?line.slice(marker[0].length):line};
  }));
}
const prefix=alignment=>alignment?'[alinhar='+alignment+']':'';
function serialize(parts){
  return parts.map(p=>p.poem?OPEN+'\n'+p.text+'\n'+CLOSE+'\n':prefix(p.alignment)+p.text).join('');
}
function render(value,defaultAlignment){
  return blocks(value).map(block=>{
    if(block.poem)return '<div class="poem">'+escape(block.text)+'</div>';
    const text=block.text.replace(/\n$/,'');
    if(!text.trim())return '';
    const alignment=block.alignment||defaultAlignment;
    const style=alignments.has(alignment)?' style="text-align:'+alignment+'"':'';
    return '<p'+style+'>'+escape(text)+'</p>';
  }).join('');
}
function hasFormatting(value){
  return blocks(value).some(block=>block.poem||block.alignment);
}
function paginate(value,fits,nextPage){
  const pages=[];
  let current=[];
  function append(block,text){
    const candidate=current.slice();
    const tail=candidate[candidate.length-1];
    if(tail?.block===block)candidate[candidate.length-1]={...tail,text:tail.text+text};
    else candidate.push({...block,block,text});
    return candidate;
  }
  for(const block of blocks(value)){
    for(const token of block.text.match(/\S+\s*|\s+/g)||[]){
      let candidate=append(block,token);
      if(current.length&&!fits(serialize(candidate))){
        pages.push(serialize(current));
        current=[];
        nextPage();
        candidate=append(block,token);
      }
      current=candidate;
    }
  }
  if(current.length||!pages.length)pages.push(serialize(current));
  return pages;
}
function paragraphRange(text,start,end){
  const first=text.lastIndexOf('\n',start-1)+1;
  const newline=text.indexOf('\n',end>start&&text[end-1]==='\n'?end-1:end);
  return [first,newline<0?text.length:newline];
}
function setAlignment(text,start,end,alignment,defaultAlignment='justify'){
  if(!alignments.has(alignment))return null;
  const [first,last]=paragraphRange(text,start,end);
  const poems=Array.from(text.matchAll(poemPattern()));
  let offset=first,cursor=start,changed=false,eligible=false;
  const selected=text.slice(first,last);
  const replacement=lines(selected).map(line=>{
    const originalOffset=offset;
    offset+=line.length;
    const marker=line.match(ALIGNMENT)?.[0]||'';
    const prose=line.slice(marker.length);
    if(!prose.trim()||/^\[\/?poema\][ \t]*(?:\n|$)/.test(prose)||
      poems.some(poem=>originalOffset>=poem.index&&originalOffset<poem.index+poem[0].length))return line;
    eligible=true;
    const mark=alignment===defaultAlignment?'':prefix(alignment);
    changed||=mark!==marker;
    if(start===end)cursor=first+mark.length+Math.max(0,start-first-marker.length);
    return mark+prose;
  }).join('');
  if(!eligible)return null;
  return {value:changed?text.slice(0,first)+replacement+text.slice(last):text,
    start:start===end?cursor:first,end:start===end?cursor:first+replacement.length};
}
function apply(value,start,end){
  const text=String(value),[first,last]=paragraphRange(text,start,end);
  const selected=text.slice(first,last);
  if(!selected.trim()||/^\[\/?poema\][ \t]*$/m.test(selected))return null;
  for(const poem of text.matchAll(poemPattern())){
    if(first<poem.index+poem[0].length&&last>poem.index)return null;
  }
  const verse=selected.split('\n').map(line=>line.replace(ALIGNMENT,'')).join('\n');
  const content=first+OPEN.length+1;
  return {value:text.slice(0,first)+OPEN+'\n'+verse+'\n'+CLOSE+text.slice(last),start:content,end:content+verse.length};
}
function remove(value,start,end){
  const text=String(value);
  for(const match of text.matchAll(poemPattern())){
    const finish=match.index+match[0].length;
    if(start<=finish&&end>=match.index){
      return {value:text.slice(0,match.index)+match[1]+text.slice(finish),start:match.index,end:match.index+match[1].length};
    }
  }
  return null;
}
root.RevistaPoetry={parse,serialize,render,hasFormatting,paginate,setAlignment,apply,remove};
})(typeof window==='undefined'?globalThis:window);
