// box-shadow 생성기: 다중 레이어 + 실시간 프리뷰 + CSS 출력
import { $, escapeHtml } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

function shadowToCss(s) {
  const alpha = Math.round(s.opacity) / 100;
  const r = parseInt(s.color.slice(1, 3), 16);
  const g = parseInt(s.color.slice(3, 5), 16);
  const b = parseInt(s.color.slice(5, 7), 16);
  return `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildBoxShadow(shadows) {
  return shadows.map(shadowToCss).join(',\n            ');
}

const SLIDERS = [
  { key: 'x', label: 'X 오프셋', min: -60, max: 60, unit: 'px' },
  { key: 'y', label: 'Y 오프셋', min: -60, max: 60, unit: 'px' },
  { key: 'blur', label: '블러', min: 0, max: 120, unit: 'px' },
  { key: 'spread', label: '스프레드', min: -40, max: 60, unit: 'px' },
  { key: 'opacity', label: '불투명도', min: 0, max: 100, unit: '%' },
];

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>box-shadow 생성기</h2>
      <p class="tool-desc">슬라이더로 그림자를 조절하고 여러 레이어를 겹칠 수 있습니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <label>레이어 <select id="bs-layer"></select></label>
        <button class="btn btn-sm" id="bs-add">+ 레이어 추가</button>
        <button class="btn btn-sm" id="bs-remove">✕ 현재 레이어 삭제</button>
      </div>
      <div id="bs-controls"></div>
      <div style="display:flex;justify-content:center;padding:44px 0">
        <div id="bs-preview" style="width:180px;height:110px;border-radius:12px;background:var(--bg-elevated);border:1px solid var(--border)"></div>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" style="margin-bottom:0">CSS 코드</label>
        <button class="btn btn-sm" data-copy-target="#bs-css">복사</button>
      </div>
      <pre class="code" id="bs-css"></pre>
    </div>
  `;

  const shadows = [{ x: 0, y: 8, blur: 24, spread: 0, color: '#000000', opacity: 25, inset: false }];
  let current = 0;

  const layerSelect = $('#bs-layer', container);
  const controls = $('#bs-controls', container);

  function renderLayerSelect() {
    layerSelect.innerHTML = shadows.map((_, i) => `<option value="${i}"${i === current ? ' selected' : ''}>레이어 ${i + 1}</option>`).join('');
    $('#bs-remove', container).disabled = shadows.length <= 1;
  }

  function renderControls() {
    const s = shadows[current];
    controls.innerHTML = `
      ${SLIDERS.map(({ key, label, min, max, unit }) => `
        <div class="row">
          <label style="width:90px" for="bs-${key}">${label}</label>
          <input type="range" id="bs-${key}" class="grow" min="${min}" max="${max}" value="${s[key]}" data-bs-key="${key}">
          <span class="hint" style="margin-top:0;width:64px;text-align:right" id="bs-${key}-val">${s[key]}${unit}</span>
        </div>`).join('')}
      <div class="row">
        <label style="width:90px" for="bs-color">색상</label>
        <input type="color" id="bs-color" value="${escapeHtml(s.color)}">
        <label class="check-label"><input type="checkbox" id="bs-inset" ${s.inset ? 'checked' : ''}> inset (안쪽 그림자)</label>
      </div>`;
    for (const slider of controls.querySelectorAll('[data-bs-key]')) {
      slider.addEventListener('input', () => {
        const key = slider.dataset.bsKey;
        shadows[current][key] = Number(slider.value);
        $(`#bs-${key}-val`, container).textContent = slider.value + SLIDERS.find((d) => d.key === key).unit;
        render();
      });
    }
    $('#bs-color', container).addEventListener('input', (e) => { shadows[current].color = e.target.value; render(); });
    $('#bs-inset', container).addEventListener('change', (e) => { shadows[current].inset = e.target.checked; render(); });
  }

  function render() {
    const css = buildBoxShadow(shadows);
    $('#bs-preview', container).style.boxShadow = css.replaceAll('\n            ', ' ');
    $('#bs-css', container).textContent = `box-shadow: ${css};`;
  }

  layerSelect.addEventListener('change', () => {
    current = Number(layerSelect.value);
    renderControls();
  });
  $('#bs-add', container).addEventListener('click', () => {
    shadows.push({ x: 0, y: 2, blur: 8, spread: 0, color: '#000000', opacity: 15, inset: false });
    current = shadows.length - 1;
    renderLayerSelect();
    renderControls();
    render();
  });
  $('#bs-remove', container).addEventListener('click', () => {
    if (shadows.length <= 1) return;
    shadows.splice(current, 1);
    current = Math.max(0, current - 1);
    renderLayerSelect();
    renderControls();
    render();
  });

  renderLayerSelect();
  renderControls();
  render();
  bindCopyButtons(container);
}
