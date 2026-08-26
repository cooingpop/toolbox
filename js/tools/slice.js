// 문자열 자르기: 앞/뒤 N자 취하기·제거, 범위 추출. 코드 포인트 기준이라 이모지가 깨지지 않는다.
import { $, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const MODES = [
  { id: 'takeFirst', label: '앞에서 N자만' },
  { id: 'takeLast', label: '뒤에서 N자만' },
  { id: 'dropFirst', label: '앞 N자 버리기' },
  { id: 'dropLast', label: '뒤 N자 버리기' },
  { id: 'range', label: '범위 (N번째 ~ M번째)' },
];

function sliceOne(chars, { mode, n, start, end }) {
  switch (mode) {
    case 'takeFirst': return chars.slice(0, n);
    case 'takeLast': return n === 0 ? [] : chars.slice(-n);
    case 'dropFirst': return chars.slice(n);
    case 'dropLast': return n === 0 ? chars : chars.slice(0, -n);
    case 'range': {
      // 1-based 포함 범위 (사람이 세는 방식)
      const from = Math.max(1, start) - 1;
      const to = end;
      return chars.slice(from, to);
    }
    default: return chars;
  }
}

export function sliceText(text, { mode = 'takeFirst', n = 10, start = 1, end = 10, perLine = false, ellipsis = false } = {}) {
  const apply = (segment) => {
    const chars = [...segment]; // 코드 포인트 단위 (이모지 1자)
    const out = sliceOne(chars, { mode, n, start, end });
    const truncated = out.length < chars.length;
    const joined = out.join('');
    return ellipsis && truncated && (mode === 'takeFirst' || mode === 'range') ? `${joined}…`
      : ellipsis && truncated && mode === 'takeLast' ? `…${joined}`
        : joined;
  };
  return perLine ? text.split('\n').map(apply).join('\n') : apply(text);
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>문자열 자르기</h2>
      <p class="tool-desc">긴 결과에서 앞·뒤 N자만 남기거나 잘라냅니다. 해시 앞 8자, 토큰 일부 추출 같은 작업에 쓰세요.
        글자는 코드 포인트 기준으로 세어 이모지가 반으로 쪼개지지 않습니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="slice-input">입력</label>
      <textarea id="slice-input" class="code" rows="6" spellcheck="false"
        placeholder="자를 텍스트를 붙여넣으세요"></textarea>
      <div class="row" style="margin-top:10px">
        <label>방식
          <select id="slice-mode">
            ${MODES.map((m) => `<option value="${m.id}">${m.label}</option>`).join('')}
          </select>
        </label>
        <label id="slice-n-wrap">N <input type="number" id="slice-n" min="0" max="100000" value="10" style="width:90px"></label>
        <label id="slice-range-wrap" hidden>
          <input type="number" id="slice-start" min="1" max="100000" value="1" style="width:80px"> ~
          <input type="number" id="slice-end" min="1" max="100000" value="10" style="width:80px">
        </label>
      </div>
      <div class="row">
        <label class="check-label"><input type="checkbox" id="slice-perline"> 줄마다 각각 적용</label>
        <label class="check-label"><input type="checkbox" id="slice-ellipsis"> 잘린 곳에 … 붙이기</label>
      </div>
      <div id="slice-error"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="slice-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#slice-output">복사</button>
      </div>
      <textarea id="slice-output" class="code" rows="6" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#slice-input', container);
  const output = $('#slice-output', container);
  const modeSelect = $('#slice-mode', container);
  const errorBox = $('#slice-error', container);

  const num = (id, fallback) => {
    const v = Number($(id, container).value);
    return Number.isInteger(v) && v >= 0 ? v : fallback;
  };

  function run() {
    errorBox.innerHTML = '';
    const mode = modeSelect.value;
    const isRange = mode === 'range';
    $('#slice-n-wrap', container).hidden = isRange;
    $('#slice-range-wrap', container).hidden = !isRange;

    const start = num('#slice-start', 1);
    const end = num('#slice-end', 1);
    if (isRange && end < start) {
      errorBox.innerHTML = '<p class="error-text">끝 위치가 시작 위치보다 작습니다.</p>';
      output.value = '';
      return;
    }
    output.value = sliceText(input.value, {
      mode,
      n: num('#slice-n', 0),
      start,
      end,
      perLine: $('#slice-perline', container).checked,
      ellipsis: $('#slice-ellipsis', container).checked,
    });
  }

  const debounced = debounce(run, 150);
  input.addEventListener('input', debounced);
  for (const id of ['#slice-n', '#slice-start', '#slice-end']) $(id, container).addEventListener('input', debounced);
  for (const id of ['#slice-mode', '#slice-perline', '#slice-ellipsis']) $(id, container).addEventListener('change', run);

  run();
  bindCopyButtons(container);
}
