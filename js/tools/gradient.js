// 그라디언트 생성기: linear/radial CSS 코드 출력 + 실시간 프리뷰
import { $, escapeHtml } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

export function buildGradientCss(type, angle, stops) {
  const stopStr = stops.map(({ color, pos }) => `${color} ${pos}%`).join(', ');
  return type === 'linear'
    ? `linear-gradient(${angle}deg, ${stopStr})`
    : `radial-gradient(circle, ${stopStr})`;
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>그라디언트 생성기</h2>
      <p class="tool-desc">색상 정지점(stop)을 조절해 CSS <code>linear-gradient</code> / <code>radial-gradient</code> 코드를 만듭니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <label>유형
          <select id="gr-type">
            <option value="linear" selected>linear</option>
            <option value="radial">radial</option>
          </select>
        </label>
        <label id="gr-angle-wrap">각도 <input type="number" id="gr-angle" min="0" max="360" value="135" style="width:80px"> deg</label>
        <button class="btn" id="gr-add">+ 정지점 추가</button>
      </div>
      <div id="gr-stops"></div>
      <div id="gr-preview" style="height:140px;border-radius:8px;border:1px solid var(--border);margin-top:12px"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" style="margin-bottom:0">CSS 코드</label>
        <button class="btn btn-sm" data-copy-target="#gr-css">복사</button>
      </div>
      <pre class="code" id="gr-css"></pre>
    </div>
  `;

  const stopsBox = $('#gr-stops', container);
  const typeSelect = $('#gr-type', container);
  const angleWrap = $('#gr-angle-wrap', container);

  let stops = [
    { color: '#4f6bed', pos: 0 },
    { color: '#8397f9', pos: 100 },
  ];

  function renderStops() {
    stopsBox.innerHTML = stops.map((s, i) => `
      <div class="row" data-stop="${i}">
        <input type="color" value="${escapeHtml(s.color)}" data-stop-color="${i}" aria-label="정지점 ${i + 1} 색상">
        <input type="number" value="${s.pos}" min="0" max="100" data-stop-pos="${i}" aria-label="정지점 ${i + 1} 위치(%)"> %
        <button class="btn btn-sm" data-stop-remove="${i}" ${stops.length <= 2 ? 'disabled' : ''} aria-label="정지점 ${i + 1} 제거">✕</button>
      </div>`).join('');
  }

  function run() {
    angleWrap.style.display = typeSelect.value === 'linear' ? '' : 'none';
    const css = buildGradientCss(typeSelect.value, Number($('#gr-angle', container).value) || 0, stops);
    $('#gr-preview', container).style.background = css;
    $('#gr-css', container).textContent = `background: ${css};`;
  }

  typeSelect.addEventListener('change', run);
  $('#gr-angle', container).addEventListener('input', run);
  $('#gr-add', container).addEventListener('click', () => {
    stops.push({ color: '#16a34a', pos: 50 });
    stops.sort((a, b) => a.pos - b.pos);
    renderStops();
    run();
  });
  stopsBox.addEventListener('input', (e) => {
    const colorIdx = e.target.dataset.stopColor;
    const posIdx = e.target.dataset.stopPos;
    if (colorIdx !== undefined) stops[colorIdx].color = e.target.value;
    if (posIdx !== undefined) stops[posIdx].pos = Math.min(100, Math.max(0, Number(e.target.value) || 0));
    run();
  });
  stopsBox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-stop-remove]');
    if (!btn || btn.disabled) return;
    stops.splice(Number(btn.dataset.stopRemove), 1);
    renderStops();
    run();
  });

  renderStops();
  run();
  bindCopyButtons(container);
}
