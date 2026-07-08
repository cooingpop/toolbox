// URL 인코더/디코더: 컴포넌트(encodeURIComponent) / 전체 URI(encodeURI) 모드
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>URL 인코더/디코더</h2>
      <p class="tool-desc">
        <strong>컴포넌트 모드</strong>는 쿼리 값 등 URL 일부(<code>encodeURIComponent</code>),
        <strong>전체 URI 모드</strong>는 URL 전체(<code>encodeURI</code>, <code>/?&amp;=</code> 등 구조 문자는 유지)를 처리합니다.
      </p>
    </div>
    <div class="card">
      <div class="row" role="radiogroup" aria-label="변환 방향">
        <label class="check-label"><input type="radio" name="url-mode" value="encode" checked> 인코딩</label>
        <label class="check-label"><input type="radio" name="url-mode" value="decode"> 디코딩</label>
        <span style="width:16px"></span>
        <label class="check-label"><input type="radio" name="url-scope" value="component" checked> 컴포넌트</label>
        <label class="check-label"><input type="radio" name="url-scope" value="full"> 전체 URI</label>
      </div>
      <label class="field-label" for="url-input">입력</label>
      <textarea id="url-input" class="code" rows="5" spellcheck="false"
        placeholder="https://example.com/검색?q=한글 값&page=1"></textarea>
      <div id="url-error"></div>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-primary" id="url-run">변환</button>
        <span class="grow"></span>
        <button class="btn" id="url-clear">지우기</button>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="url-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#url-output">복사</button>
      </div>
      <textarea id="url-output" class="code" rows="5" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#url-input', container);
  const output = $('#url-output', container);
  const errorBox = $('#url-error', container);

  function run() {
    errorBox.innerHTML = '';
    const text = input.value;
    if (!text) { output.value = ''; return; }
    const mode = container.querySelector('input[name="url-mode"]:checked').value;
    const scope = container.querySelector('input[name="url-scope"]:checked').value;
    try {
      if (mode === 'encode') {
        output.value = scope === 'component' ? encodeURIComponent(text) : encodeURI(text);
      } else {
        output.value = scope === 'component' ? decodeURIComponent(text) : decodeURI(text);
      }
    } catch {
      output.value = '';
      errorBox.innerHTML = '<p class="error-text">디코딩할 수 없는 문자열입니다. % 뒤에 유효한 16진수 2자리가 와야 합니다 (예: %20).</p>';
    }
  }

  input.addEventListener('input', run);
  for (const radio of container.querySelectorAll('input[type="radio"]')) {
    radio.addEventListener('change', run);
  }
  $('#url-run', container).addEventListener('click', run);
  $('#url-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    errorBox.innerHTML = '';
    input.focus();
  });

  bindCopyButtons(container);
}
