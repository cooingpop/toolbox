// HTML 엔티티 인코더/디코더: &lt; ↔ < 등. 디코딩은 브라우저 파서 활용
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const NAMED = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function encodeEntities(text, allNonAscii) {
  let result = text.replace(/[&<>"']/g, (c) => NAMED[c]);
  if (allNonAscii) {
    result = result.replace(/[\u{0080}-\u{10FFFF}]/gu, (c) => `&#x${c.codePointAt(0).toString(16).toUpperCase()};`);
  }
  return result;
}

export function decodeEntities(text) {
  // textarea 파싱 트릭: 스크립트 실행 없이 엔티티만 해석됨
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${text.replaceAll('<', '&lt;')}`, 'text/html');
  return doc.body.textContent;
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>HTML 엔티티 인코더/디코더</h2>
      <p class="tool-desc"><code>&amp;lt;</code> ↔ <code>&lt;</code> 등 HTML 엔티티를 변환합니다. 디코딩은 <code>&amp;amp;</code>·<code>&amp;#39;</code>·<code>&amp;#x1F9F0;</code> 등 명명/숫자 엔티티 모두 지원합니다.</p>
    </div>
    <div class="card">
      <div class="row" role="radiogroup" aria-label="변환 방향">
        <label class="check-label"><input type="radio" name="ent-mode" value="encode" checked> 인코딩</label>
        <label class="check-label"><input type="radio" name="ent-mode" value="decode"> 디코딩</label>
        <label class="check-label" id="ent-all-wrap"><input type="checkbox" id="ent-all"> 비ASCII 문자도 <code>&amp;#x...;</code>로</label>
      </div>
      <label class="field-label" for="ent-input">입력</label>
      <textarea id="ent-input" class="code" rows="6" spellcheck="false" placeholder='<div class="box">A &amp; B</div>'></textarea>
      <div class="row" style="margin-top:10px">
        <span class="grow"></span>
        <button class="btn" id="ent-clear">지우기</button>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="ent-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#ent-output">복사</button>
      </div>
      <textarea id="ent-output" class="code" rows="6" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#ent-input', container);
  const output = $('#ent-output', container);

  function run() {
    const mode = container.querySelector('input[name="ent-mode"]:checked').value;
    const text = input.value;
    if (!text) { output.value = ''; return; }
    output.value = mode === 'encode'
      ? encodeEntities(text, $('#ent-all', container).checked)
      : decodeEntities(text);
  }

  input.addEventListener('input', run);
  $('#ent-all', container).addEventListener('change', run);
  for (const radio of container.querySelectorAll('input[name="ent-mode"]')) {
    radio.addEventListener('change', run);
  }
  $('#ent-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    input.focus();
  });

  bindCopyButtons(container);
}
