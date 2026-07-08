// 비밀번호/랜덤 문자열 생성기: crypto.getRandomValues + 편향 없는 rejection sampling
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const CHARSETS = [
  { id: 'lower', label: '소문자 (a-z)', chars: 'abcdefghijklmnopqrstuvwxyz', checked: true },
  { id: 'upper', label: '대문자 (A-Z)', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', checked: true },
  { id: 'digit', label: '숫자 (0-9)', chars: '0123456789', checked: true },
  { id: 'symbol', label: '기호 (!@#$...)', chars: '!@#$%^&*()-_=+[]{};:,.<>?/~', checked: false },
];

const AMBIGUOUS = new Set('0O1lI|`\'"');

// 모듈로 편향 없이 0..max-1 균등 난수
function randomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return v % max;
}

export function generatePassword(length, pool) {
  return Array.from({ length }, () => pool[randomInt(pool.length)]).join('');
}

export function init(container) {
  const checks = CHARSETS.map(({ id, label, checked }) =>
    `<label class="check-label"><input type="checkbox" id="pw-${id}" ${checked ? 'checked' : ''}> ${label}</label>`).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>비밀번호/랜덤 문자열 생성기</h2>
      <p class="tool-desc"><code>crypto.getRandomValues()</code> 기반 암호학적 난수로 생성합니다. 생성된 값은 화면 밖으로 나가지 않습니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <label>길이 <input type="number" id="pw-length" min="4" max="256" value="20"></label>
        <label>개수 <input type="number" id="pw-count" min="1" max="50" value="5"></label>
      </div>
      <div class="row">${checks}</div>
      <div class="row">
        <label class="check-label"><input type="checkbox" id="pw-noambiguous"> 혼동 문자 제외 (<code>0 O 1 l I |</code>)</label>
        <button class="btn btn-primary" id="pw-generate">생성</button>
      </div>
      <div id="pw-error"></div>
      <p class="hint" id="pw-strength"></p>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="pw-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#pw-output">전체 복사</button>
      </div>
      <textarea id="pw-output" class="code" rows="7" readonly spellcheck="false"></textarea>
    </div>
  `;

  const errorBox = $('#pw-error', container);
  const output = $('#pw-output', container);
  const strength = $('#pw-strength', container);

  function generate() {
    errorBox.innerHTML = '';
    strength.textContent = '';
    const length = Number($('#pw-length', container).value);
    const count = Number($('#pw-count', container).value);
    if (!Number.isInteger(length) || length < 4 || length > 256) {
      errorBox.innerHTML = '<p class="error-text">길이는 4~256 사이여야 합니다.</p>';
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      errorBox.innerHTML = '<p class="error-text">개수는 1~50 사이여야 합니다.</p>';
      return;
    }
    let pool = CHARSETS.filter(({ id }) => $(`#pw-${id}`, container).checked).map(({ chars }) => chars).join('');
    if ($('#pw-noambiguous', container).checked) {
      pool = [...pool].filter((c) => !AMBIGUOUS.has(c)).join('');
    }
    if (!pool) {
      errorBox.innerHTML = '<p class="error-text">문자셋을 하나 이상 선택하세요.</p>';
      return;
    }
    output.value = Array.from({ length: count }, () => generatePassword(length, pool)).join('\n');
    const bits = Math.round(length * Math.log2(pool.length));
    strength.textContent = `문자 풀 ${pool.length}종 × 길이 ${length} ≈ 엔트로피 ${bits}비트 ${bits >= 80 ? '(강함)' : bits >= 60 ? '(보통)' : '(약함 — 길이를 늘리세요)'}`;
  }

  $('#pw-generate', container).addEventListener('click', generate);
  generate();

  bindCopyButtons(container);
}
