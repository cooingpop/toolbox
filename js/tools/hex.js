// Hex ↔ 텍스트 변환기: UTF-8 바이트 기준
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

export function textToHex(text, { upper = false, space = true } = {}) {
  const bytes = new TextEncoder().encode(text);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  const joined = hex.join(space ? ' ' : '');
  return upper ? joined.toUpperCase() : joined;
}

export function hexToText(hex) {
  const cleaned = hex.replace(/0[xX]/g, '').replace(/[\s,:]+/g, '');
  if (!cleaned) return '';
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) throw new Error('16진수가 아닌 문자가 포함되어 있습니다 (0-9, a-f만 허용).');
  if (cleaned.length % 2 !== 0) throw new Error(`자릿수가 홀수(${cleaned.length}자리)입니다. 바이트당 2자리여야 합니다.`);
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>Hex ↔ 텍스트</h2>
      <p class="tool-desc">텍스트를 UTF-8 바이트의 16진수 표현으로, 또는 그 반대로 변환합니다.
        Hex 입력은 공백·쉼표·<code>0x</code> 접두어를 무시합니다.</p>
    </div>
    <div class="card">
      <div class="row" role="radiogroup" aria-label="변환 방향">
        <label class="check-label"><input type="radio" name="hex-mode" value="encode" checked> 텍스트 → Hex</label>
        <label class="check-label"><input type="radio" name="hex-mode" value="decode"> Hex → 텍스트</label>
        <label class="check-label"><input type="checkbox" id="hex-upper"> 대문자</label>
        <label class="check-label"><input type="checkbox" id="hex-space" checked> 바이트 사이 공백</label>
      </div>
      <label class="field-label" for="hex-input">입력</label>
      <textarea id="hex-input" class="code" rows="6" spellcheck="false" placeholder="Hello 한글  또는  48 65 6c 6c 6f"></textarea>
      <div id="hex-error"></div>
      <div class="row" style="margin-top:10px">
        <span class="grow"></span>
        <button class="btn" id="hex-clear">지우기</button>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="hex-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#hex-output">복사</button>
      </div>
      <textarea id="hex-output" class="code" rows="6" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#hex-input', container);
  const output = $('#hex-output', container);
  const errorBox = $('#hex-error', container);

  function run() {
    errorBox.innerHTML = '';
    const text = input.value;
    if (!text.trim()) { output.value = ''; return; }
    const mode = container.querySelector('input[name="hex-mode"]:checked').value;
    try {
      if (mode === 'encode') {
        output.value = textToHex(text, {
          upper: $('#hex-upper', container).checked,
          space: $('#hex-space', container).checked,
        });
      } else {
        output.value = hexToText(text);
      }
    } catch (err) {
      output.value = '';
      errorBox.innerHTML = '<p class="error-text"></p>';
      errorBox.firstChild.textContent = err.message.includes('decode')
        ? '유효한 UTF-8 바이트 시퀀스가 아닙니다.' : err.message;
    }
  }

  input.addEventListener('input', run);
  $('#hex-upper', container).addEventListener('change', run);
  $('#hex-space', container).addEventListener('change', run);
  for (const radio of container.querySelectorAll('input[name="hex-mode"]')) {
    radio.addEventListener('change', run);
  }
  $('#hex-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    errorBox.innerHTML = '';
    input.focus();
  });

  bindCopyButtons(container);
}
