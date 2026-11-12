/* Preserve verses and paragraph alignment as plain text in edition files and backups. */
(function(root){
'use strict';
const OPEN='[poema]',CLOSE='[/poema]';
const ALIGNMENT=/^\[alinhar=(left|center|right|justify)\]/;
const alignments=new Set(['left','center','right','justify']);
const ITALIC_OPEN='[italico]',ITALIC_CLOSE='[/italico]';
const inlinePattern=()=>/\[(\/?)(italico|negrito|sublinhado)\]/g;
const formats=[['bold','negrito','strong'],['italic','italico','em'],['underline','sublinhado','u']];
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
function inlineRuns(value,active={}){
  const text=String(value),runs=[];
  const style={italic:false,bold:false,underline:false,...active};
  let cursor=0;
  for(const marker of text.matchAll(inlinePattern())){
    if(marker.index>cursor)runs.push({text:text.slice(cursor,marker.index),...style});
    style[formats.find(format=>format[1]===marker[2])[0]]=!marker[1];
    cursor=marker.index+marker[0].length;
  }
  if(cursor<text.length)runs.push({text:text.slice(cursor),...style});
  return {runs,active:style};
}
function serializeInline(runs){
  let text='',active=[];
  for(const run of runs){
    if(!run.text)continue;
    const next=formats.filter(format=>run[format[0]]).map(format=>format[1]);
    let common=0;
    while(common<active.length&&active[common]===next[common])common++;
    text+=active.slice(common).reverse().map(tag=>'[/'+tag+']').join('');
    text+=next.slice(common).map(tag=>'['+tag+']').join('');active=next;
    text+=run.text;
  }
  return text+active.reverse().map(tag=>'[/'+tag+']').join('');
}
function serialize(parts){
  return parts.map(p=>{
    const text=p.runs?serializeInline(p.runs):p.text;
    return p.poem?OPEN+'\n'+text+'\n'+CLOSE+'\n':prefix(p.alignment)+text;
  }).join('');
}
function render(value,defaultAlignment){
  let active={};
  return blocks(value).map(block=>{
    const text=block.poem?block.text:block.text.replace(/\n$/,'');
    const parsed=inlineRuns(text,active);
    active=parsed.active;
    const html=parsed.runs.map(run=>formats.reduceRight((content,[key,,tag])=>run[key]?'<'+tag+'>'+content+'</'+tag+'>':content,escape(run.text))).join('');
    if(block.poem)return '<div class="poem">'+html+'</div>';
    if(!parsed.runs.some(run=>run.text.trim()))return '';
    const alignment=block.alignment||defaultAlignment;
    const style=alignments.has(alignment)?' style="text-align:'+alignment+'"':'';
    return '<p'+style+'>'+html+'</p>';
  }).join('');
}
function hasFormatting(value){
  return inlinePattern().test(String(value??''))||blocks(value).some(block=>block.poem||block.alignment);
}
function inlineTokens(runs){
  const text=runs.map(run=>run.text).join(''),tokens=[];
  let index=0,offset=0;
  // Keep a word together even when only some of its letters are italic.
  for(const token of text.match(/\S+\s*|\s+/g)||[]){
    const fragments=[];
    let remaining=token.length;
    while(remaining){
      const run=runs[index],length=Math.min(remaining,run.text.length-offset);
      fragments.push({...run,text:run.text.slice(offset,offset+length)});
      remaining-=length;offset+=length;
      if(offset===run.text.length){index++;offset=0}
    }
    tokens.push(fragments);
  }
  return tokens;
}
function paginate(value,fits,nextPage){
  const pages=[];
  let current=[],active={};
  function append(block,fragments){
    const candidate=current.slice();
    const tail=candidate[candidate.length-1];
    const runs=tail?.block===block?tail.runs.map(run=>({...run})):[];
    for(const fragment of fragments){
      const last=runs[runs.length-1];
      if(last&&formats.every(([key])=>!!last[key]===!!fragment[key]))last.text+=fragment.text;
      else runs.push({...fragment});
    }
    if(tail?.block===block)candidate[candidate.length-1]={...tail,runs};
    else candidate.push({...block,block,runs});
    return candidate;
  }
  for(const block of blocks(value)){
    const parsed=inlineRuns(block.text,active);
    active=parsed.active;
    for(const token of inlineTokens(parsed.runs)){
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
function italicSelection(value,start,end){
  const text=String(value),tokens=[];
  const markers=/\[\/?(?:italico|negrito|sublinhado)\]|^\[\/?poema\][ \t]*(?=\r?$)|^\[alinhar=(?:left|center|right|justify)\]|\r?\n/gm;
  let cursor=0,italic=false;
  for(const marker of text.matchAll(markers)){
    if(marker.index>cursor)tokens.push({text:text.slice(cursor,marker.index),start:cursor,italic});
    if(marker[0]===ITALIC_OPEN||marker[0]===ITALIC_CLOSE)italic=marker[0]===ITALIC_OPEN;
    else tokens.push({text:marker[0],start:marker.index,barrier:true});
    cursor=marker.index+marker[0].length;
  }
  if(cursor<text.length)tokens.push({text:text.slice(cursor),start:cursor,italic});
  const selected=tokens.filter(token=>!token.barrier&&token.start<end&&token.start+token.text.length>start)
    .filter(token=>token.text.slice(Math.max(0,start-token.start),Math.min(token.text.length,end-token.start)).trim());
  return {tokens,selected};
}
function selectionIsItalic(value,start,end){
  const {selected}=italicSelection(value,start,end);
  return selected.length>0&&selected.every(token=>token.italic);
}
function toggleItalic(value,start,end){
  if(start===end)return null;
  const {tokens,selected}=italicSelection(value,start,end);
  if(!selected.length)return null;
  const italic=!selected.every(token=>token.italic);
  let result='',active=false,first=null,last=null;
  function setActive(next){if(active!==next){result+=next?ITALIC_OPEN:ITALIC_CLOSE;active=next}}
  function append(text,style,chosen=false){
    if(!text)return;
    setActive(style);
    if(chosen&&first===null)first=result.length;
    result+=text;
    if(chosen)last=result.length;
  }
  for(const token of tokens){
    if(token.barrier){setActive(false);result+=token.text;continue}
    const left=Math.max(0,Math.min(token.text.length,start-token.start));
    const right=Math.max(left,Math.min(token.text.length,end-token.start));
    append(token.text.slice(0,left),token.italic);
    append(token.text.slice(left,right),italic,true);
    append(token.text.slice(right),token.italic);
  }
  setActive(false);
  return {value:result,start:first,end:last,italic};
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
root.RevistaPoetry={parse,serialize,render,hasFormatting,paginate,setAlignment,apply,remove,toggleItalic,selectionIsItalic};
})(typeof window==='undefined'?globalThis:window);
