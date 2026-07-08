// Unicode 이스케이프/언이스케이프: \uXXXX, \u{XXXXX}
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

export function escapeUnicode(text, { allChars = false, braces = false } = {}) {
  let result = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const needs = allChars || cp > 0x7f;
    if (!needs) { result += ch; continue; }
    if (braces) {
      result += `\\u{${cp.toString(16).toUpperCase()}}`;
    } else if (cp > 0xffff) {
      // 서로게이트 쌍으로 분해
      result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}\\u${ch.charCodeAt(1).toString(16).padStart(4, '0').toUpperCase()}`;
    } else {
      result += `\\u${cp.toString(16).padStart(4, '0').toUpperCase()}`;
    }
  }
  return result;
}

export function unescapeUnicode(text) {
  return text.replace(/\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\u/g, (m, braced, four) => {
    if (braced !== undefined) {
      const cp = parseInt(braced, 16);
      if (cp > 0x10ffff) throw new Error(`코드 포인트 범위 초과: \\u{${braced}}`);
      return String.fromCodePoint(cp);
    }
    if (four !== undefined) return String.fromCharCode(parseInt(four, 16));
    throw new Error(`잘못된 이스케이프: "${text.slice(text.indexOf(m), text.indexOf(m) + 8)}..." — \\uXXXX(4자리 16진수) 또는 \\u{X...} 형식이어야 합니다`);
  });
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>Unicode 이스케이프/언이스케이프</h2>
      <p class="tool-desc">문자를 <code>\\uXXXX</code>(또는 <code>\\u{XXXXX}</code>) 형태로 변환하거나 되돌립니다. BMP 밖 문자(이모지 등)는 기본적으로 서로게이트 쌍으로 표현됩니다.</p>
    </div>
    <div class="card">
      <div class="row" role="radiogroup" aria-label="변환 방향">
        <label class="check-label"><input type="radio" name="uni-mode" value="escape" checked> 이스케이프</label>
        <label class="check-label"><input type="radio" name="uni-mode" value="unescape"> 언이스케이프</label>
        <label class="check-label"><input type="checkbox" id="uni-all"> ASCII도 모두 변환</label>
        <label class="check-label"><input type="checkbox" id="uni-braces"> <code>\\u{...}</code> 형식 (ES2015+)</label>
      </div>
      <label class="field-label" for="uni-input">입력</label>
      <textarea id="uni-input" class="code" rows="6" spellcheck="false" placeholder="한글 🧰  또는  \\uD55C\\uAE00"></textarea>
      <div id="uni-error"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="uni-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#uni-output">복사</button>
      </div>
      <textarea id="uni-output" class="code" rows="6" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#uni-input', container);
  const output = $('#uni-output', container);
  const errorBox = $('#uni-error', container);

  function run() {
    errorBox.innerHTML = '';
    const text = input.value;
    if (!text) { output.value = ''; return; }
    const mode = container.querySelector('input[name="uni-mode"]:checked').value;
    try {
      output.value = mode === 'escape'
        ? escapeUnicode(text, {
          allChars: $('#uni-all', container).checked,
          braces: $('#uni-braces', container).checked,
        })
        : unescapeUnicode(text);
    } catch (err) {
      output.value = '';
      errorBox.innerHTML = '<p class="error-text"></p>';
      errorBox.firstChild.textContent = err.message;
    }
  }

  input.addEventListener('input', run);
  for (const el of container.querySelectorAll('input[type="radio"], input[type="checkbox"]')) {
    el.addEventListener('change', run);
  }

  bindCopyButtons(container);
}
