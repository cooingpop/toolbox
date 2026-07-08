// Cubic-bezier 이징 에디터: 드래그 가능한 곡선 + 프리셋 + CSS 출력 + 애니메이션 프리뷰
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const PRESETS = [
  { name: 'ease', v: [0.25, 0.1, 0.25, 1] },
  { name: 'linear', v: [0, 0, 1, 1] },
  { name: 'ease-in', v: [0.42, 0, 1, 1] },
  { name: 'ease-out', v: [0, 0, 0.58, 1] },
  { name: 'ease-in-out', v: [0.42, 0, 0.58, 1] },
  { name: 'bounce-out', v: [0.34, 1.56, 0.64, 1] },
];

const SIZE = 300; // SVG 논리 크기
const PAD = 40;   // y 오버슈트 여백

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>Cubic-bezier 이징 에디터</h2>
      <p class="tool-desc">제어점 두 개를 드래그해 <code>cubic-bezier()</code> 타이밍 함수를 만듭니다. y값은 0~1 범위를 벗어날 수 있습니다(오버슈트).</p>
    </div>
    <div class="card">
      <div class="row" style="align-items:flex-start">
        <svg id="bz-svg" viewBox="${-PAD} ${-PAD} ${SIZE + PAD * 2} ${SIZE + PAD * 2}"
          style="width:min(340px,100%);touch-action:none;background:var(--bg);border:1px solid var(--border);border-radius:8px" aria-label="베지어 곡선 에디터">
          <rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="none" stroke="var(--border)"/>
          <line id="bz-l1" stroke="var(--text-muted)" stroke-dasharray="4 3"/>
          <line id="bz-l2" stroke="var(--text-muted)" stroke-dasharray="4 3"/>
          <path id="bz-curve" fill="none" stroke="var(--accent)" stroke-width="3"/>
          <circle id="bz-p1" r="9" fill="var(--accent)" style="cursor:grab"/>
          <circle id="bz-p2" r="9" fill="var(--success)" style="cursor:grab"/>
        </svg>
        <div class="grow" style="min-width:220px">
          <div class="row">${PRESETS.map((p) => `<button class="btn btn-sm" data-preset="${p.v.join(',')}">${p.name}</button>`).join('')}</div>
          <div class="row">
            <label>x1 <input type="number" id="bz-x1" step="0.01" min="0" max="1" style="width:78px"></label>
            <label>y1 <input type="number" id="bz-y1" step="0.01" style="width:78px"></label>
          </div>
          <div class="row">
            <label>x2 <input type="number" id="bz-x2" step="0.01" min="0" max="1" style="width:78px"></label>
            <label>y2 <input type="number" id="bz-y2" step="0.01" style="width:78px"></label>
          </div>
          <div style="margin-top:8px">
            <div style="position:relative;height:44px;border:1px dashed var(--border);border-radius:8px">
              <div id="bz-ball" style="position:absolute;top:6px;left:6px;width:32px;height:32px;border-radius:50%;background:var(--accent)"></div>
            </div>
            <button class="btn btn-sm" id="bz-play" style="margin-top:8px">▶ 재생 (1.5s)</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" style="margin-bottom:0">CSS 코드</label>
        <button class="btn btn-sm" data-copy-target="#bz-css">복사</button>
      </div>
      <pre class="code" id="bz-css"></pre>
    </div>
  `;

  let [x1, y1, x2, y2] = PRESETS[0].v;
  const svg = $('#bz-svg', container);
  const curve = $('#bz-curve', container);
  const p1 = $('#bz-p1', container);
  const p2 = $('#bz-p2', container);
  const ball = $('#bz-ball', container);

  const toSvgX = (x) => x * SIZE;
  const toSvgY = (y) => SIZE - y * SIZE;

  function render() {
    curve.setAttribute('d', `M 0 ${SIZE} C ${toSvgX(x1)} ${toSvgY(y1)}, ${toSvgX(x2)} ${toSvgY(y2)}, ${SIZE} 0`);
    p1.setAttribute('cx', toSvgX(x1)); p1.setAttribute('cy', toSvgY(y1));
    p2.setAttribute('cx', toSvgX(x2)); p2.setAttribute('cy', toSvgY(y2));
    const l1 = $('#bz-l1', container);
    l1.setAttribute('x1', 0); l1.setAttribute('y1', SIZE);
    l1.setAttribute('x2', toSvgX(x1)); l1.setAttribute('y2', toSvgY(y1));
    const l2 = $('#bz-l2', container);
    l2.setAttribute('x1', SIZE); l2.setAttribute('y1', 0);
    l2.setAttribute('x2', toSvgX(x2)); l2.setAttribute('y2', toSvgY(y2));
    const fmt = (v) => String(Math.round(v * 100) / 100);
    $('#bz-x1', container).value = fmt(x1);
    $('#bz-y1', container).value = fmt(y1);
    $('#bz-x2', container).value = fmt(x2);
    $('#bz-y2', container).value = fmt(y2);
    $('#bz-css', container).textContent =
      `transition-timing-function: cubic-bezier(${fmt(x1)}, ${fmt(y1)}, ${fmt(x2)}, ${fmt(y2)});`;
  }

  // 드래그
  let dragging = null;
  function svgPoint(evt) {
    const pt = new DOMPoint(evt.clientX, evt.clientY);
    const { x, y } = pt.matrixTransform(svg.getScreenCTM().inverse());
    return {
      x: Math.min(1, Math.max(0, x / SIZE)),               // x는 CSS 규격상 0~1
      y: Math.min(1.6, Math.max(-0.6, (SIZE - y) / SIZE)), // y는 오버슈트 허용
    };
  }
  for (const [el, idx] of [[p1, 1], [p2, 2]]) {
    el.addEventListener('pointerdown', (e) => {
      dragging = idx;
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (dragging !== idx) return;
      const { x, y } = svgPoint(e);
      if (idx === 1) { x1 = x; y1 = y; } else { x2 = x; y2 = y; }
      render();
    });
    el.addEventListener('pointerup', () => { dragging = null; });
  }

  // 숫자 입력
  for (const id of ['x1', 'y1', 'x2', 'y2']) {
    $(`#bz-${id}`, container).addEventListener('change', (e) => {
      const v = Number(e.target.value);
      if (!Number.isFinite(v)) return;
      if (id === 'x1') x1 = Math.min(1, Math.max(0, v));
      if (id === 'y1') y1 = v;
      if (id === 'x2') x2 = Math.min(1, Math.max(0, v));
      if (id === 'y2') y2 = v;
      render();
    });
  }

  // 프리셋
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    [x1, y1, x2, y2] = btn.dataset.preset.split(',').map(Number);
    render();
  });

  // 애니메이션 프리뷰
  $('#bz-play', container).addEventListener('click', () => {
    ball.style.transition = 'none';
    ball.style.left = '6px';
    void ball.offsetWidth;
    ball.style.transition = `left 1.5s cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
    ball.style.left = 'calc(100% - 38px)';
  });

  render();
  bindCopyButtons(container);
}
