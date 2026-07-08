// 대비 검사기 (WCAG 2.x): 명도 대비비율 + AA/AAA 통과 여부
import { $, debounce } from '../utils/dom.js';
import { parseColor, formatAll } from './color.js';

// WCAG 상대 휘도
export function relativeLuminance({ r, g, b }) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const CRITERIA = [
  { label: '일반 텍스트 AA', min: 4.5 },
  { label: '일반 텍스트 AAA', min: 7 },
  { label: '큰 텍스트(18pt+) AA', min: 3 },
  { label: '큰 텍스트(18pt+) AAA', min: 4.5 },
  { label: 'UI 컴포넌트/그래픽 AA', min: 3 },
];

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>대비 검사기 (WCAG)</h2>
      <p class="tool-desc">전경색과 배경색의 명도 대비비율을 계산하고 WCAG 2.x AA/AAA 통과 여부를 표시합니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <div>
          <label class="field-label" for="ct-fg-text">전경색 (텍스트)</label>
          <div class="row" style="margin-bottom:0">
            <input type="color" id="ct-fg" value="#1a1d21" aria-label="전경색 피커">
            <input type="text" id="ct-fg-text" class="code" value="#1a1d21" style="width:160px" spellcheck="false">
          </div>
        </div>
        <div>
          <label class="field-label" for="ct-bg-text">배경색</label>
          <div class="row" style="margin-bottom:0">
            <input type="color" id="ct-bg" value="#ffffff" aria-label="배경색 피커">
            <input type="text" id="ct-bg-text" class="code" value="#ffffff" style="width:160px" spellcheck="false">
          </div>
        </div>
        <button class="btn" id="ct-swap" style="align-self:flex-end">⇄ 서로 바꾸기</button>
      </div>
      <div id="ct-error"></div>
      <div id="ct-preview" style="margin-top:12px;padding:20px;border-radius:8px;border:1px solid var(--border)">
        <span style="font-size:20px;font-weight:700">큰 텍스트 예시 Large Text</span><br>
        <span style="font-size:14px">일반 본문 텍스트 예시입니다. The quick brown fox jumps over the lazy dog.</span>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <h3 class="grow" style="margin-bottom:0">대비비율</h3>
        <span id="ct-ratio" style="font-size:24px;font-weight:800;font-family:var(--code-font)"></span>
      </div>
      <table class="result-table"><tbody id="ct-results"></tbody></table>
    </div>
  `;

  const fgPicker = $('#ct-fg', container);
  const fgText = $('#ct-fg-text', container);
  const bgPicker = $('#ct-bg', container);
  const bgText = $('#ct-bg-text', container);
  const errorBox = $('#ct-error', container);
  const preview = $('#ct-preview', container);

  function run() {
    errorBox.innerHTML = '';
    const fg = parseColor(fgText.value);
    const bg = parseColor(bgText.value);
    if (!fg || !bg) {
      errorBox.innerHTML = '<p class="error-text">인식할 수 없는 색상입니다. HEX/rgb()/hsl() 형식으로 입력하세요.</p>';
      return;
    }
    fgPicker.value = formatAll({ ...fg, a: 1 }).hex.slice(0, 7);
    bgPicker.value = formatAll({ ...bg, a: 1 }).hex.slice(0, 7);
    preview.style.color = formatAll(fg).rgb;
    preview.style.background = formatAll(bg).rgb;

    const ratio = contrastRatio(fg, bg);
    $('#ct-ratio', container).textContent = `${(Math.floor(ratio * 100) / 100).toFixed(2)} : 1`;
    $('#ct-results', container).innerHTML = CRITERIA.map(({ label, min }) => {
      const pass = ratio >= min;
      return `<tr><th>${label} (≥ ${min}:1)</th>
        <td><span class="badge ${pass ? 'badge-success' : 'badge-error'}">${pass ? '통과' : '미달'}</span></td></tr>`;
    }).join('');
  }

  const debouncedRun = debounce(run, 150);
  fgText.addEventListener('input', debouncedRun);
  bgText.addEventListener('input', debouncedRun);
  fgPicker.addEventListener('input', () => { fgText.value = fgPicker.value; run(); });
  bgPicker.addEventListener('input', () => { bgText.value = bgPicker.value; run(); });
  $('#ct-swap', container).addEventListener('click', () => {
    [fgText.value, bgText.value] = [bgText.value, fgText.value];
    run();
  });

  run();
}
