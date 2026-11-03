/* Mixed prose and poetry: explicit ranges keep their line and stanza breaks. */
(function(root){
'use strict';
const OPEN='[poema]',CLOSE='[/poema]';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function parse(value){
 const text=String(value??'').replace(/\r\n?/g,'\n'),parts=[];
 const pattern=/^\[poema\][ \t]*\n([\s\S]*?)\n\[\/poema\][ \t]*(?=\n|$)/gm;let start=0,match;
 while((match=pattern.exec(text))){if(match.index>start)parts.push({poem:false,text:text.slice(start,match.index)});parts.push({poem:true,text:match[1]});start=pattern.lastIndex}
 if(start<text.length)parts.push({poem:false,text:text.slice(start)});return parts;
}
function serialize(parts){return parts.map(p=>p.poem?OPEN+'\n'+p.text+'\n'+CLOSE+'\n':p.text).join('')}
function render(value){return parse(value).map(p=>p.poem?'<div class="poem">'+escape(p.text)+'</div>':p.text.split('\n').filter(line=>line.trim()).map(line=>'<p>'+escape(line)+'</p>').join('')).join('')}
function paginate(value,fits,nextPage){
 const pages=[];let current=[];
 function append(piece){const candidate=current.map(p=>({...p}));const tail=candidate[candidate.length-1];if(tail&&tail.poem===piece.poem)tail.text+=piece.text;else candidate.push({...piece});return candidate}
 function flush(){pages.push(serialize(current));current=[];nextPage()}
 function put(piece){let candidate=append(piece);if(current.length&&!fits(serialize(candidate))){flush();candidate=append(piece)}current=candidate}
 for(const part of parse(value)){
  if(!part.poem){for(const token of part.text.match(/\S+\s*|\s+/g)||[])put({poem:false,text:token});continue}
  // Prefer whole stanzas; oversized stanzas continue at a verse boundary.
  const stanzas=part.text.match(/[^\n]*(?:\n(?![ \t]*\n)[^\n]*)*(?:\n[ \t]*\n+|$)/g)?.filter(Boolean)||[];
  for(const stanza of stanzas){const piece={poem:true,text:stanza};if(fits(serialize(append(piece)))){current=append(piece);continue}
   if(current.length)flush();
   if(fits(serialize([piece]))){current=[piece];continue}
   for(const line of stanza.match(/[^\n]*\n|[^\n]+$/g)||[])put({poem:true,text:line});
  }
 }
 if(current.length||!pages.length)pages.push(serialize(current));return pages;
}
function apply(value,start,end){
 const text=String(value),lineStart=text.lastIndexOf('\n',Math.max(0,start-1))+1;
 let lineEnd=text.indexOf('\n',end>start&&text[end-1]==='\n'?end-1:end);if(lineEnd<0)lineEnd=text.length;
 const selected=text.slice(lineStart,lineEnd);if(!selected.trim())return null;
 // Reject overlapping or nested ranges, including a caret inside a poem.
 let offset=0;for(const part of parse(text)){const raw=part.poem?OPEN+'\n'+part.text+'\n'+CLOSE:part.text;const finish=offset+raw.length;if(part.poem&&lineStart<finish&&lineEnd>offset)return null;offset=finish}
 if(/^\[\/?poema\]$/m.test(selected))return null;
 const replacement=OPEN+'\n'+selected+'\n'+CLOSE;
 return {value:text.slice(0,lineStart)+replacement+text.slice(lineEnd),start:lineStart+OPEN.length+1,end:lineStart+OPEN.length+1+selected.length};
}
function remove(value,start,end){
 const text=String(value),pattern=/^\[poema\][ \t]*\n([\s\S]*?)\n\[\/poema\][ \t]*(?=\n|$)/gm;let match;
 while((match=pattern.exec(text)))if(start<=pattern.lastIndex&&end>=match.index){return {value:text.slice(0,match.index)+match[1]+text.slice(pattern.lastIndex),start:match.index,end:match.index+match[1].length}}
 return null;
}
root.RevistaPoetry={parse,serialize,render,paginate,apply,remove};
})(typeof window!=='undefined'?window:globalThis);
