// UUID 생성기: crypto.randomUUID() 기반 v4, 개수·대소문자·하이픈 옵션
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

function generateUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // 구형 브라우저 폴백: getRandomValues로 v4 직접 조립
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>UUID 생성기</h2>
      <p class="tool-desc"><code>crypto.randomUUID()</code>로 UUID v4를 생성합니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <label>개수 <input type="number" id="uuid-count" min="1" max="100" value="5"></label>
        <label class="check-label"><input type="checkbox" id="uuid-upper"> 대문자</label>
        <label class="check-label"><input type="checkbox" id="uuid-nohyphen"> 하이픈 제거</label>
        <button class="btn btn-primary" id="uuid-generate">생성</button>
      </div>
      <div id="uuid-error"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="uuid-output" style="margin-bottom:0">결과 (한 줄에 하나)</label>
        <button class="btn btn-sm" data-copy-target="#uuid-output">전체 복사</button>
      </div>
      <textarea id="uuid-output" class="code" rows="8" readonly spellcheck="false"></textarea>
    </div>
  `;

  const countInput = $('#uuid-count', container);
  const output = $('#uuid-output', container);
  const errorBox = $('#uuid-error', container);

  function generate() {
    errorBox.innerHTML = '';
    const count = Number(countInput.value);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      errorBox.innerHTML = '<p class="error-text">개수는 1~100 사이의 정수여야 합니다.</p>';
      return;
    }
    const upper = $('#uuid-upper', container).checked;
    const noHyphen = $('#uuid-nohyphen', container).checked;
    const list = Array.from({ length: count }, () => {
      let id = generateUuid();
      if (noHyphen) id = id.replaceAll('-', '');
      return upper ? id.toUpperCase() : id;
    });
    output.value = list.join('\n');
  }

  $('#uuid-generate', container).addEventListener('click', generate);
  generate();

  bindCopyButtons(container);
}
