(function(){
'use strict';
const service=RevistaEditionColor;
const panel=document.createElement('div');
panel.className='edition-color-settings';
panel.innerHTML=`
  <h2>Cores dos separadores</h2>
  <p>Pode escolher uma cor diferente para cada secção. Em «Automática», o separador usa a cor das letras do primeiro título da secção. No índice, o nome da secção usa a mesma cor do separador.</p>
  <div class="section-color-list">${service.sectionDefinitions.map(({key,label})=>`
    <div class="section-color-card" data-section-color="${key}">
      <h3>${label}</h3>
      <label>Cor do separador — ${label}
        <select data-section-mode="${key}">
          <option value="auto">Automática — cor do primeiro título</option>
          <option value="custom">Escolher cor</option>
        </select>
      </label>
      <div data-section-choice="${key}" hidden>
        <div class="section-color-inputs">
          <label>Escolher cor — ${label}<input type="color" data-section-picker="${key}" value="#532b35"></label>
          <label>Código da cor — ${label}<input type="text" data-section-code="${key}" value="#532B35" maxlength="7" pattern="#[0-9a-fA-F]{6}" spellcheck="false" placeholder="#532B35"></label>
        </div>
        <div class="section-color-swatch" data-section-swatch="${key}" aria-hidden="true">Título do separador</div>
      </div>
    </div>`).join('')}</div>
  <h2>Cor da contracapa automática</h2>
  <label>Modo de cor da contracapa
    <select id="sectionColorMode">
      <option value="auto">Automática — cor da capa</option>
      <option value="custom">Escolher cor</option>
    </select>
  </label>
  <label id="sectionColorChoice" hidden>Cor escolhida para a contracapa
    <input id="sectionColorPicker" type="color" value="#532b35">
  </label>
  <div class="section-color-swatch" id="sectionColorSwatch" aria-hidden="true">Contracapa automática</div>
  <p id="sectionColorStatus" role="status"></p>`;
$('#coverSettings').append(panel);
const mode=$('#sectionColorMode'),picker=$('#sectionColorPicker'),choice=$('#sectionColorChoice');
const swatch=$('#sectionColorSwatch'),notice=$('#sectionColorStatus');
let revision=0;
function showPalette(theme,target=swatch){
  const colors=theme||service.palette(service.fallback);
  target.style.backgroundColor=colors.background;
  target.style.color=colors.ink;
}
function refreshSection(key,edition){
  const setting=service.sectionSetting(edition,key);
  panel.querySelector('[data-section-mode="'+key+'"]').value=setting.mode;
  panel.querySelector('[data-section-choice="'+key+'"]').hidden=setting.mode!=='custom';
  panel.querySelector('[data-section-picker="'+key+'"]').value=setting.color;
  const code=panel.querySelector('[data-section-code="'+key+'"]');
  code.value=setting.color.toUpperCase();
  code.setCustomValidity('');
  showPalette(service.palette(setting.color),panel.querySelector('[data-section-swatch="'+key+'"]'));
}
async function refresh(){
  const edition={...all[current],id:$('#id').value,month:$('#month').value},request=++revision;
  panel.hidden=!service.eligible(edition);
  if(panel.hidden)return;
  for(const {key} of service.sectionDefinitions)refreshSection(key,edition);
  mode.value=edition.sectionTheme?.mode==='custom'?'custom':'auto';
  choice.hidden=mode.value!=='custom';
  const saved=edition.sectionTheme?.color;
  picker.value=service.valid(saved)?saved:service.fallback;
  if(mode.value==='auto')notice.textContent=edition.cover?'A analisar a cor da capa…':'O fundo cor de vinho é usado enquanto não houver capa.';
  const theme=await service.resolve(edition);
  if(request!==revision)return;
  showPalette(theme);
  if(!service.valid(saved)&&theme)picker.value=theme.background;
  notice.textContent=mode.value==='custom'?'Cor escolhida '+picker.value.toUpperCase():
    theme?'Cor sugerida '+theme.background.toUpperCase():
    edition.cover?'Não foi possível obter a cor da capa. Pode escolher uma cor.':'O fundo cor de vinho é usado enquanto não houver capa.';
}
for(const {key} of service.sectionDefinitions){
  const sectionMode=panel.querySelector('[data-section-mode="'+key+'"]');
  const sectionPicker=panel.querySelector('[data-section-picker="'+key+'"]');
  const sectionCode=panel.querySelector('[data-section-code="'+key+'"]');
  function save(mode,color){
    const edition=all[current];
    if(!service.eligible(edition))return;
    if(!edition.sectionColors||typeof edition.sectionColors!=='object'||Array.isArray(edition.sectionColors))edition.sectionColors={};
    edition.sectionColors[key]={mode,color};
    queueDraftSave();
  }
  sectionMode.onchange=()=>{
    save(sectionMode.value,sectionPicker.value);
    refreshSection(key,all[current]);
  };
  sectionPicker.oninput=()=>{
    save('custom',sectionPicker.value);
    sectionCode.value=sectionPicker.value.toUpperCase();
    sectionCode.setCustomValidity('');
    showPalette(service.palette(sectionPicker.value),panel.querySelector('[data-section-swatch="'+key+'"]'));
  };
  sectionCode.oninput=()=>{
    const color=sectionCode.value.trim();
    sectionCode.setCustomValidity(service.valid(color)?'':'Use # seguido de seis algarismos ou letras de A a F.');
    if(!service.valid(color))return;
    save('custom',color);
    sectionPicker.value=color;
    showPalette(service.palette(color),panel.querySelector('[data-section-swatch="'+key+'"]'));
  };
}
mode.onchange=()=>{
  const edition=all[current];
  if(!service.eligible(edition))return;
  edition.sectionTheme={mode:mode.value,color:picker.value};
  queueDraftSave();
  void refresh();
};
picker.oninput=()=>{
  if(!service.eligible(all[current]))return;
  all[current].sectionTheme={mode:'custom',color:picker.value};
  queueDraftSave();
  showPalette(service.palette(picker.value));
  notice.textContent='Cor escolhida '+picker.value.toUpperCase();
};
const renderEdition=render;
render=function(){renderEdition();void refresh()};
$('#id').addEventListener('input',refresh);
$('#month').addEventListener('input',refresh);
void refresh();
})();
