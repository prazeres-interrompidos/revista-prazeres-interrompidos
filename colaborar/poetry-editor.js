(function(){
'use strict';
const main=document.querySelector('main.editor'),model=RevistaVisualText;
const fields='textarea[data-field="text"],textarea[data-trailer-field="text"],textarea[data-gif-field="text"],textarea[data-news-field="text"],#editorialText,#editorial';
const states=new Set();
const alignments=[['left','Alinhar à esquerda','justifyLeft'],['center','Centrar','justifyCenter'],['right','Alinhar à direita','justifyRight'],['justify','Justificar','justifyFull']];
function icon(kind){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 18 18');svg.setAttribute('aria-hidden','true');
  if(kind==='italic'){
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d','M7 3h7M4 15h7M11 3 7 15');path.setAttribute('fill','none');svg.append(path);
  }else if(kind==='bold'||kind==='underline'){
    const text=document.createElementNS(ns,'text');text.textContent=kind==='bold'?'N':'S';
    for(const [key,value] of Object.entries({x:3,y:kind==='bold'?14:12,'font-size':14,'font-family':'Arial,sans-serif','font-weight':kind==='bold'?700:400,fill:'currentColor',stroke:'none'}))text.setAttribute(key,value);
    svg.append(text);
    if(kind==='underline'){
      const line=document.createElementNS(ns,'line');line.setAttribute('x1',3);line.setAttribute('x2',13);line.setAttribute('y1',15);line.setAttribute('y2',15);svg.append(line);
    }
  }else for(let i=0;i<4;i++){
    const width=kind==='justify'||i%2===0?14:9,x=kind==='center'?(18-width)/2:kind==='right'?16-width:2;
    const line=document.createElementNS(ns,'line');
    for(const [key,value] of Object.entries({x1:x,x2:x+width,y1:3+4*i,y2:3+4*i}))line.setAttribute(key,value);
    svg.append(line);
  }
  return svg;
}
function currentRange(state){
  const selection=getSelection();
  if(!selection.rangeCount)return null;
  const range=selection.getRangeAt(0);
  return state.surface.contains(range.commonAncestorContainer)?range:null;
}
function lines(surface){return [...surface.querySelectorAll('p,div')].filter(node=>!node.querySelector('p,div'));}
function bookmark(state){
  const range=currentRange(state);
  if(!range)return state.bookmark||{start:0,end:0};
  const offset=(node,position)=>{
    const part=document.createRange();part.selectNodeContents(state.surface);part.setEnd(node,position);
    return part.toString().length;
  };
  const rows=lines(state.surface);
  const linePoint=(node,position)=>{
    const index=rows.findIndex(row=>row.contains(node));if(index<0)return null;
    const part=document.createRange();part.selectNodeContents(rows[index]);part.setEnd(node,position);
    return {index,offset:part.toString().length};
  };
  return {start:offset(range.startContainer,range.startOffset),end:offset(range.endContainer,range.endOffset),startLine:linePoint(range.startContainer,range.startOffset),endLine:linePoint(range.endContainer,range.endOffset)};
}
function restore(state,saved){
  state.surface.focus();
  const selection=getSelection(),range=document.createRange(),rows=lines(state.surface);
  function point(offset,end,line){
    const container=line&&rows[line.index]||state.surface,texts=[];
    if(line&&rows[line.index])offset=line.offset;
    const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())texts.push(walker.currentNode);
    for(const text of texts){if(offset<text.length||offset===text.length&&end)return [text,offset];offset-=text.length;}
    return texts.length?[texts.at(-1),texts.at(-1).length]:[container,0];
  }
  const a=point(saved.start,false,saved.startLine),b=point(saved.end,true,saved.endLine);
  range.setStart(...a);range.setEnd(...b);selection.removeAllRanges();selection.addRange(range);
  state.range=range.cloneRange();state.bookmark=saved;
}
function activate(state){
  if(state.range&&state.surface.contains(state.range.commonAncestorContainer)){
    state.surface.focus();const selection=getSelection();selection.removeAllRanges();selection.addRange(state.range);
  }else restore(state,state.bookmark||{start:0,end:0});
}
function notify(state){
  state.source.dispatchEvent(new Event('input',{bubbles:true}));
  state.source.dispatchEvent(new Event('change',{bubbles:true}));
}
function sync(state,kind='format'){
  const value=model.serialize(model.fromDOM(state.surface));
  const saved=bookmark(state);
  if(value===state.source.value){state.bookmark=saved;return;}
  const previous=state.history[state.position],previousEnd=previous.bookmark.end;
  if(state.beforeBookmark)previous.bookmark=state.beforeBookmark;
  const now=Date.now(),group=/^(insertText|deleteContentBackward|deleteContentForward)$/.test(kind)&&state.lastKind===kind&&now-state.lastEdit<750&&state.position===state.history.length-1&&state.position>0&&state.beforeBookmark?.start===previousEnd;
  state.history.splice(state.position+1);
  const entry={source:value,bookmark:saved};
  if(group)state.history[state.position]=entry;
  else{state.history.push(entry);state.position++;}
  if(state.history.length>100){state.history.shift();state.position--;}
  state.lastKind=kind;state.lastEdit=now;state.beforeBookmark=null;
  state.source.value=value;state.lastSource=value;state.bookmark=saved;
  notify(state);update(state);
}
function reset(state){
  state.surface.innerHTML=model.html(model.parse(state.source.value),state.defaultAlignment);
  state.lastSource=state.source.value;state.edition=all[current];state.range=null;state.bookmark={start:0,end:0};
  state.history=[{source:state.source.value,bookmark:state.bookmark}];state.position=0;state.lastKind='';
  for(const button of Object.values(state.formats))button.setAttribute('aria-pressed','false');
}
function history(state,direction){
  const target=state.position+direction;
  if(target<0||target>=state.history.length)return;
  state.history[state.position].bookmark=bookmark(state);
  state.position=target;const entry=state.history[target];
  state.surface.innerHTML=model.html(model.parse(entry.source),state.defaultAlignment);
  state.source.value=entry.source;state.lastSource=entry.source;state.lastKind='';state.beforeBookmark=null;
  restore(state,entry.bookmark);notify(state);update(state);
}
function update(state){
  const range=currentRange(state);if(!range)return;
  state.range=range.cloneRange();state.bookmark=bookmark(state);
  for(const [command,button] of Object.entries(state.formats))button.setAttribute('aria-pressed',String(document.queryCommandState(command)));
}
function command(state,name){
  activate(state);state.beforeBookmark=bookmark(state);
  document.execCommand(name,false,null);sync(state,'format');update(state);
}
function selected(node,range){
  if(range.collapsed)return node.contains(range.startContainer);
  const contents=document.createRange();contents.selectNodeContents(node);
  return range.compareBoundaryPoints(Range.END_TO_START,contents)<0&&range.compareBoundaryPoints(Range.START_TO_END,contents)>0;
}
function poem(state,remove){
  activate(state);const range=currentRange(state);if(!range)return;
  const saved=bookmark(state),nodes=model.fromDOM(state.surface);
  const chosen=nodes.map(node=>selected(node.element,range));
  let changed=false,result=[],pending=[];
  const flush=()=>{if(pending.length){result.push({type:'poem',lines:pending});pending=[];}};
  nodes.forEach((node,i)=>{
    if(chosen[i]&&remove&&node.type==='poem'){
      flush();result.push(...node.lines.map(runs=>({type:'paragraph',alignment:null,runs})));changed=true;
    }else if(chosen[i]&&!remove&&node.type==='paragraph'){
      pending.push(node.runs);changed=true;
    }else{flush();result.push(node);}
  });flush();
  if(!changed){state.status.textContent=remove?'Coloque o cursor num poema para retirar o formato.':'Selecione os versos que pretende formatar como poema.';return;}
  state.beforeBookmark=saved;state.surface.innerHTML=model.html(result,state.defaultAlignment);
  restore(state,saved);sync(state,'poem');
  state.status.textContent=remove?'Formatação de poema retirada.':'Poema aplicado. Os versos e as estrofes são preservados.';
}
function decorate(){
  for(const state of states)if(!state.source.isConnected){states.delete(state);state.toolbar.remove();}
  main.querySelectorAll(fields).forEach(source=>{
    if(source.dataset.poetryReady)return;
    source.dataset.poetryReady='true';source.hidden=true;source.classList.add('visual-source');source.setAttribute('aria-hidden','true');source.tabIndex=-1;
    const label=source.closest('label'),surface=document.createElement('div');
    surface.className='visual-text-editor';surface.contentEditable='true';surface.spellcheck=true;
    surface.setAttribute('role','textbox');surface.setAttribute('aria-multiline','true');
    const name=[...label.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent).join('').trim();
    // Keep the visual field outside the label: rich editor actions must not focus the hidden source.
    const labelId=source.id?source.id+'-visual-label':'visual-label-'+(++decorate.count);
    const caption=document.createElement('span');caption.id=labelId;caption.textContent=name;
    const wrapper=document.createElement('div');wrapper.className='visual-text-field';label.before(wrapper);
    if(label.hasAttribute('data-news-text')){
      wrapper.dataset.newsText=label.dataset.newsText;label.removeAttribute('data-news-text');wrapper.hidden=label.hidden;label.hidden=false;
    }
    label.replaceChildren(caption,source);surface.setAttribute('aria-labelledby',labelId);
    const toolbar=document.createElement('div');toolbar.className='poetry-tools text-format-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Formatação do texto');wrapper.append(toolbar,label,surface);
    const status=document.createElement('span');status.className='poetry-help';status.setAttribute('role','status');status.textContent='Selecione o texto e escolha a formatação. O resultado aparece aqui.';
    const state={source,surface,toolbar,status,formats:{},defaultAlignment:source.id==='editorial'?'left':'justify'};
    surface.style.textAlign=state.defaultAlignment;
    states.add(state);
    function button(name,action,glyph){
      const control=document.createElement('button');control.type='button';control.title=name;
      if(glyph){control.className='alignment-button';control.setAttribute('aria-label',name);control.append(icon(glyph));}else control.textContent=name;
      control.addEventListener('mousedown',event=>event.preventDefault());control.onclick=action;toolbar.append(control);return control;
    }
    for(const [kind,name,action] of alignments)button(name,()=>command(state,action),kind);
    for(const [name,action,key] of [['Negrito','bold','B'],['Itálico','italic','I'],['Sublinhado','underline','U']]){
      const control=button(name,()=>command(state,action),action);control.classList.add('format-button');control.setAttribute('aria-pressed','false');control.title=name+' (Ctrl+'+key+')';control.setAttribute('aria-keyshortcuts','Control+'+key+' Meta+'+key);state.formats[action]=control;
    }
    button('Poema',()=>poem(state,false));button('Retirar formato de poema',()=>poem(state,true));toolbar.append(status);
    reset(state);
    surface.addEventListener('beforeinput',event=>{
      if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){event.preventDefault();history(state,event.inputType==='historyUndo'?-1:1);return;}
      state.beforeBookmark=bookmark(state);state.inputKind=event.inputType;
    });
    surface.addEventListener('input',event=>{if(!event.isComposing)sync(state,event.inputType||state.inputKind||'input');});
    surface.addEventListener('compositionend',()=>sync(state,'composition'));
    surface.addEventListener('keydown',event=>{
      if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
      const key=event.key.toLowerCase();
      const action={i:'italic',b:'bold',u:'underline'}[key];
      if(action){event.preventDefault();command(state,action);}
      if(key==='z'||key==='y'){event.preventDefault();history(state,key==='y'||event.shiftKey?1:-1);}
    });
    surface.addEventListener('paste',event=>{
      event.preventDefault();activate(state);state.beforeBookmark=bookmark(state);
      const clipboard=event.clipboardData,text=clipboard.getData('text/plain'),rich=clipboard.getData('text/html');
      let nodes;
      if(rich&&!/\[(?:\/?(?:italico|negrito|sublinhado|poema)|alinhar=)/.test(text)){
        const template=document.createElement('template');template.innerHTML=rich;nodes=model.fromDOM(template.content);
      }else nodes=model.parse(text);
      const selectedText=bookmark(state);
      if(selectedText.start===0&&selectedText.end===surface.textContent.length){
        // Replacing the whole text also replaces its block structure, including old poems.
        surface.innerHTML=model.html(nodes,state.defaultAlignment);
        const range=document.createRange();range.selectNodeContents(surface);range.collapse(false);
        const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
      }else{
        const range=currentRange(state),element=range?.startContainer.nodeType===1?range.startContainer:range?.startContainer.parentElement;
        const inPoem=element?.closest('[data-poem="true"]');
        let insert=model.html(nodes,state.defaultAlignment);
        if(inPoem){
          const verses=nodes.flatMap(node=>node.type==='poem'?node.lines:[node.runs]);
          insert=model.html([{type:'poem',lines:verses}]).replace(/^<div[^>]*>|<\/div>$/g,'');
        }
        document.execCommand('insertHTML',false,insert);
      }
      sync(state,'paste');update(state);
    });
    surface.addEventListener('drop',event=>event.preventDefault());
    for(const event of ['focus','keyup','mouseup','blur'])surface.addEventListener(event,()=>update(state));
  });
}
decorate.count=0;
document.addEventListener('selectionchange',()=>{for(const state of states)if(currentRange(state))update(state);});
const previousRender=render;
render=function(){previousRender();decorate();for(const state of states)if(state.edition!==all[current]||state.lastSource!==state.source.value)reset(state);};
new MutationObserver(decorate).observe(main,{childList:true,subtree:true});
decorate();
})();
