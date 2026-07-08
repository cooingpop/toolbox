// 진법 변환기: 2/8/10/16진수 상호 변환 (BigInt로 자릿수 제한 없음)
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const BASES = [
  { id: 'bin', base: 2, label: '2진수 (bin)', prefix: '0b', pattern: /^[01]+$/ },
  { id: 'oct', base: 8, label: '8진수 (oct)', prefix: '0o', pattern: /^[0-7]+$/ },
  { id: 'dec', base: 10, label: '10진수 (dec)', prefix: '', pattern: /^[0-9]+$/ },
  { id: 'hex', base: 16, label: '16진수 (hex)', prefix: '0x', pattern: /^[0-9a-fA-F]+$/ },
];

export function parseRadix(raw, base) {
  let text = raw.trim().replace(/[\s_,]/g, '');
  let negative = false;
  if (text.startsWith('-')) { negative = true; text = text.slice(1); }
  const def = BASES.find((b) => b.base === base);
  if (def.prefix && text.toLowerCase().startsWith(def.prefix)) text = text.slice(2);
  if (!text || !def.pattern.test(text)) return null;
  const value = [...text.toLowerCase()].reduce(
    (acc, c) => acc * BigInt(base) + BigInt(parseInt(c, base)), 0n);
  return negative ? -value : value;
}

export function init(container) {
  const rows = BASES.map(({ id, label }) => `
    <div class="output-row">
      <span class="output-label">${label}</span>
      <input type="text" id="radix-${id}" class="code grow" spellcheck="false" autocomplete="off">
      <button class="btn btn-sm" data-copy-target="#radix-${id}">복사</button>
    </div>`).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>진법 변환기</h2>
      <p class="tool-desc">아무 칸에나 입력하면 나머지 진법으로 즉시 변환됩니다. 큰 정수(BigInt)와 음수, <code>0x</code>/<code>0b</code> 접두어, 공백·언더스코어 구분을 지원합니다.</p>
    </div>
    <div class="card">
      ${rows}
      <div id="radix-error"></div>
      <div class="row" style="margin-top:8px">
        <span class="grow"></span>
        <button class="btn" id="radix-clear">지우기</button>
      </div>
    </div>
  `;

  const errorBox = $('#radix-error', container);
  const inputs = Object.fromEntries(BASES.map(({ id }) => [id, $(`#radix-${id}`, container)]));

  function update(sourceId) {
    errorBox.innerHTML = '';
    const def = BASES.find((b) => b.id === sourceId);
    const raw = inputs[sourceId].value;
    if (!raw.trim()) {
      for (const { id } of BASES) if (id !== sourceId) inputs[id].value = '';
      return;
    }
    const value = parseRadix(raw, def.base);
    if (value === null) {
      errorBox.innerHTML = `<p class="error-text">${def.label} 형식에 맞지 않는 문자가 있습니다.</p>`;
      return;
    }
    for (const { id, base } of BASES) {
      if (id === sourceId) continue;
      const abs = value < 0n ? -value : value;
      inputs[id].value = (value < 0n ? '-' : '') + abs.toString(base);
    }
  }

  for (const { id } of BASES) {
    inputs[id].addEventListener('input', () => update(id));
  }
  $('#radix-clear', container).addEventListener('click', () => {
    for (const { id } of BASES) inputs[id].value = '';
    errorBox.innerHTML = '';
    inputs.dec.focus();
  });

  bindCopyButtons(container);
}
