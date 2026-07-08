// JSON 포매터/뷰어: Pretty / Minify / Validate + 오류 위치(줄/열) 표시
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

function positionToLineCol(text, pos) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') { line++; col = 1; } else { col++; }
  }
  return { line, col };
}

// 브라우저별 SyntaxError 메시지에 위치 정보가 없는 경우가 많아(최신 Chromium 등)
// 미니 JSON 스캐너로 첫 오류 인덱스를 직접 찾는다. 유효하면 -1.
export function findJsonErrorIndex(text) {
  let i = 0;
  const fail = (at) => { throw { at }; };
  const ws = () => { while (i < text.length && ' \t\n\r'.includes(text[i])) i++; };

  function string() {
    i++; // 여는 따옴표
    while (i < text.length) {
      const c = text[i];
      if (c === '"') { i++; return; }
      if (c === '\\') {
        i++;
        if ('"\\/bfnrt'.includes(text[i])) { i++; }
        else if (text[i] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail(i);
          i += 5;
        } else fail(i);
      } else if (text.charCodeAt(i) < 0x20) fail(i);
      else i++;
    }
    fail(i); // 닫는 따옴표 없음
  }

  function number() {
    const m = text.slice(i).match(/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/);
    if (!m) fail(i);
    i += m[0].length;
  }

  function object() {
    i++; ws();
    if (text[i] === '}') { i++; return; }
    for (;;) {
      ws();
      if (text[i] !== '"') fail(i);
      string(); ws();
      if (text[i] !== ':') fail(i);
      i++; value(); ws();
      if (text[i] === ',') { i++; continue; }
      if (text[i] === '}') { i++; return; }
      fail(i);
    }
  }

  function array() {
    i++; ws();
    if (text[i] === ']') { i++; return; }
    for (;;) {
      value(); ws();
      if (text[i] === ',') { i++; continue; }
      if (text[i] === ']') { i++; return; }
      fail(i);
    }
  }

  function value() {
    ws();
    if (i >= text.length) fail(i);
    const c = text[i];
    if (c === '{') return object();
    if (c === '[') return array();
    if (c === '"') return string();
    if (c === '-' || (c >= '0' && c <= '9')) return number();
    if (text.startsWith('true', i)) { i += 4; return; }
    if (text.startsWith('false', i)) { i += 5; return; }
    if (text.startsWith('null', i)) { i += 4; return; }
    fail(i);
  }

  try {
    value();
    ws();
    if (i < text.length) fail(i); // 값 뒤에 잉여 문자
    return -1;
  } catch (e) {
    return typeof e.at === 'number' ? Math.min(e.at, text.length) : -1;
  }
}

function describeError(err, text) {
  const msg = String(err.message || err);
  const idx = findJsonErrorIndex(text);
  if (idx >= 0) {
    const { line, col } = positionToLineCol(text, idx);
    return `유효하지 않은 JSON입니다 — ${line}번째 줄, ${col}번째 열 부근\n(${msg})`;
  }
  return `유효하지 않은 JSON입니다.\n(${msg})`;
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>JSON 포매터/뷰어</h2>
      <p class="tool-desc">JSON을 정렬(Pretty)·압축(Minify)·검증합니다. 문법 오류 시 줄/열 위치를 알려줍니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="json-input">입력 JSON</label>
      <textarea id="json-input" class="code" rows="10" spellcheck="false"
        placeholder='{"name": "DevTools Hub", "tools": ["json", "base64"]}'></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-primary" id="json-pretty">Pretty</button>
        <button class="btn" id="json-minify">Minify</button>
        <button class="btn" id="json-validate">Validate</button>
        <label>들여쓰기
          <select id="json-indent">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>
        <span class="grow"></span>
        <button class="btn" id="json-clear">지우기</button>
      </div>
      <div id="json-status"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="json-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#json-output">복사</button>
      </div>
      <textarea id="json-output" class="code" rows="12" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#json-input', container);
  const output = $('#json-output', container);
  const status = $('#json-status', container);

  function parseInput() {
    const text = input.value;
    if (!text.trim()) {
      status.innerHTML = '<p class="error-text">입력이 비어 있습니다.</p>';
      return undefined;
    }
    try {
      const parsed = JSON.parse(text);
      status.innerHTML = '';
      return parsed;
    } catch (err) {
      status.innerHTML = '<p class="error-text"></p>';
      status.firstChild.textContent = describeError(err, text);
      return undefined;
    }
  }

  $('#json-pretty', container).addEventListener('click', () => {
    const parsed = parseInput();
    if (parsed === undefined) return;
    const sel = $('#json-indent', container).value;
    const indent = sel === 'tab' ? '\t' : Number(sel);
    output.value = JSON.stringify(parsed, null, indent);
  });

  $('#json-minify', container).addEventListener('click', () => {
    const parsed = parseInput();
    if (parsed === undefined) return;
    output.value = JSON.stringify(parsed);
  });

  $('#json-validate', container).addEventListener('click', () => {
    const parsed = parseInput();
    if (parsed === undefined) return;
    status.innerHTML = '<p class="success-text">✓ 유효한 JSON입니다.</p>';
  });

  $('#json-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    status.innerHTML = '';
    input.focus();
  });

  bindCopyButtons(container);
}
