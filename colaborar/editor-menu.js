(function(){
'use strict';
const main=document.querySelector('main.editor');
const menu=document.getElementById('editor-menu');
const selector=document.getElementById('selectEdition');
menu.querySelector('.editor-edition-picker').append(selector.closest('label'),document.getElementById('newEdition'));
const sections=[
  ['Capa','coverSettings'],
  ['Abertura','openingSettings'],
  ['Editorial','editorialSection'],
  ['Episódios do Podcast','podcastSection'],
  ['Episódios Extra','extraSection'],
  ['Book Trailers','bookTrailersSection'],
  ['Book GIFs','bookGifsSection'],
  ['Novidades do Projeto','newsSection'],
  ['Ficheiro JSON','collaborationFiles']
];
const details=menu.querySelector('details');
const nav=menu.querySelector('nav');
const narrow=matchMedia('(max-width: 820px)');
function fitMenu(){details.open=!narrow.matches}
narrow.addEventListener('change',fitMenu);
fitMenu();
const panels=new Map(sections.map(([,id])=>[id,document.getElementById(id)]));
const buttons=new Map();
function showSection(id=''){
  if(main.inert)return;
  const selected=panels.get(id);
  for(const panel of panels.values())panel.hidden=!!selected&&panel!==selected;
  for(const [key,button] of buttons)button.setAttribute('aria-pressed',String(key===id));
  if(selected?.tagName==='DETAILS')selected.open=true;
  if(narrow.matches)details.open=false;
  const target=selected||main;
  target.tabIndex=-1;
  target.focus({preventScroll:true});
  target.scrollIntoView({block:'start'});
}
for(const [label,id] of [['Vista Completa',''],...sections]){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.setAttribute('aria-controls',id||[...panels.keys()].join(' '));
  button.setAttribute('aria-pressed',String(!id));
  button.onclick=()=>showSection(id);
  buttons.set(id,button);
  nav.append(button);
}
window.RevistaEditorMenu={showSection};
menu.hidden=false;
})();
