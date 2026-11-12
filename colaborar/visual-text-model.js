/* Visual editing bridge. The saved format stays compatible with existing editions. */
(function(root){
'use strict';
const alignments=new Set(['left','center','right','justify']);
const formats=[['bold','negrito','strong'],['italic','italico','em'],['underline','sublinhado','u']];
const escape=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function add(runs,text,style){
  if(!text)return;
  const last=runs.at(-1);
  if(last&&formats.every(([key])=>!!last[key]===!!style[key]))last.text+=text;
  else runs.push({text,italic:!!style.italic,bold:!!style.bold,underline:!!style.underline});
}
function parse(source){
  const lines=String(source||'').replace(/\r\n?/g,'\n').split('\n'),nodes=[];
  const style={italic:false,bold:false,underline:false};
  function inline(text){
    const runs=[];
    for(const token of text.split(/(\[\/?(?:italico|negrito|sublinhado)\])/g)){
      const marker=token.match(/^\[(\/?)(italico|negrito|sublinhado)\]$/);
      if(marker)style[formats.find(format=>format[1]===marker[2])[0]]=!marker[1];
      else add(runs,token,style);
    }
    return runs;
  }
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    if(/^\[poema\][ \t]*$/.test(line)){
      const end=lines.findIndex((item,i)=>i>index&&/^\[\/poema\][ \t]*$/.test(item));
      if(end>index+1){
        nodes.push({type:'poem',lines:lines.slice(index+1,end).map(inline)});
        index=end;continue;
      }
    }
    const match=line.match(/^\[alinhar=(left|center|right|justify)\]/);
    nodes.push({type:'paragraph',alignment:match?.[1]||null,runs:inline(match?line.slice(match[0].length):line)});
  }
  return nodes;
}
function inlineSource(runs){
  const merged=[];
  for(const run of runs)add(merged,run.text,run);
  return merged.map(run=>formats.reduceRight((content,[key,tag])=>run[key]?'['+tag+']'+content+'[/'+tag+']':content,run.text)).join('');
}
function serialize(nodes){
  return nodes.flatMap(node=>node.type==='poem'
    ?['[poema]',...(node.lines.length?node.lines:[[]]).map(inlineSource),'[/poema]']
    :[(node.alignment?'[alinhar='+node.alignment+']':'')+inlineSource(node.runs)]).join('\n');
}
function html(nodes,defaultAlignment='justify'){
  const inline=runs=>runs.map(run=>formats.reduceRight((content,[key,,tag])=>run[key]?'<'+tag+'>'+content+'</'+tag+'>':content,escape(run.text))).join('')||'<br>';
  return nodes.map(node=>node.type==='poem'
    ?'<div class="visual-poem" data-poem="true">'+node.lines.map(runs=>'<div data-verse="true">'+inline(runs)+'</div>').join('')+'</div>'
    :'<p style="text-align:'+(node.alignment||defaultAlignment)+'">'+inline(node.runs)+'</p>').join('');
}
const blocks=new Set(['P','DIV','H1','H2','H3','H4','H5','H6','LI','UL','OL','BLOCKQUOTE','PRE','SECTION','ARTICLE','TABLE','TR','TD']);
const ignored=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','IMG','SVG','TEMPLATE','NOSCRIPT','INPUT','BUTTON']);
function fromDOM(container){
  function collect(parent,inherited={italic:false,bold:false,underline:false,alignment:null}){
    const result=[];
    let runs=[],touched=false;
    function flush(force=false){
      if(touched||force)result.push({type:'paragraph',alignment:inherited.alignment,runs,element:parent});
      runs=[];touched=false;
    }
    function walk(node,style){
      if(node.nodeType===3){
        const value=node.nodeValue.replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ');
        // Ignore indentation between pasted HTML blocks, retaining spaces inside text.
        if(!value.trim()&&value.includes('\n')&&[...parent.childNodes].some(child=>blocks.has(child.tagName)))return;
        value.split('\n').forEach((part,i)=>{if(i)flush(true);add(runs,part,style);if(part||i)touched=true});
        return;
      }
      if(node.nodeType!==1||ignored.has(node.tagName))return;
      if(node.tagName==='BR'){
        if(node===parent.lastChild){touched=true;return;}
        flush(true);return;
      }
      const fontStyle=node.style?.fontStyle;
      const weight=node.style?.fontWeight,decoration=node.style?.textDecorationLine||node.style?.textDecoration||'';
      const next={
        italic:fontStyle==='normal'?false:fontStyle==='italic'||fontStyle==='oblique'||node.tagName==='EM'||node.tagName==='I'||style.italic,
        bold:weight==='normal'||/^\d+$/.test(weight)&&Number(weight)<600?false:weight==='bold'||weight==='bolder'||Number(weight)>=600||node.tagName==='STRONG'||node.tagName==='B'||style.bold,
        underline:decoration.includes('underline')||node.tagName==='U'||style.underline,
        alignment:alignments.has(node.style?.textAlign)?node.style.textAlign:alignments.has(node.getAttribute('align'))?node.getAttribute('align'):style.alignment
      };
      if(node.dataset.poem==='true'){
        flush();
        const verses=collect(node,{...next,alignment:null});
        result.push({type:'poem',lines:verses.flatMap(verse=>verse.type==='poem'?verse.lines:[verse.runs]),element:node});
      }else if(blocks.has(node.tagName)){
        flush();
        result.push(...collect(node,next));
      }else{
        for(const child of node.childNodes)walk(child,next);
      }
    }
    for(const child of parent.childNodes)walk(child,inherited);
    flush();
    if(!result.length)result.push({type:'paragraph',alignment:inherited.alignment,runs:[],element:parent});
    return result;
  }
  return collect(container);
}
root.RevistaVisualText={parse,serialize,html,fromDOM};
})(globalThis);
