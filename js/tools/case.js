// 케이스 변환기: camel/Pascal/snake/kebab/CONSTANT/Title/Sentence/lower/UPPER 동시 변환
import { $, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

// 공백 / _ / - / camelCase 경계 / 연속 대문자 뒤 소문자(HTTPServer → HTTP, Server) 모두 인식
export function splitWords(text) {
  return text
    .trim()
    .split(/[\s_\-.]+/)
    .flatMap((chunk) => chunk.split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[0-9])(?=[A-Za-z])|(?<=[A-Za-z])(?=[0-9])/))
    .filter(Boolean);
}

const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

export const CONVERTERS = [
  { id: 'camel', label: 'camelCase', fn: (words) => words.map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w))).join('') },
  { id: 'pascal', label: 'PascalCase', fn: (words) => words.map(capitalize).join('') },
  { id: 'snake', label: 'snake_case', fn: (words) => words.map((w) => w.toLowerCase()).join('_') },
  { id: 'kebab', label: 'kebab-case', fn: (words) => words.map((w) => w.toLowerCase()).join('-') },
  { id: 'constant', label: 'CONSTANT_CASE', fn: (words) => words.map((w) => w.toUpperCase()).join('_') },
  { id: 'title', label: 'Title Case', fn: (words) => words.map(capitalize).join(' ') },
  { id: 'sentence', label: 'Sentence case', fn: (words) => words.map((w, i) => (i === 0 ? capitalize(w) : w.toLowerCase())).join(' ') },
  { id: 'lower', label: 'lower case', fn: (words) => words.map((w) => w.toLowerCase()).join(' ') },
  { id: 'upper', label: 'UPPER CASE', fn: (words) => words.map((w) => w.toUpperCase()).join(' ') },
];

export function init(container) {
  const rows = CONVERTERS.map(({ id, label }) => `
    <div class="output-row">
      <span class="output-label">${label}</span>
      <div class="output-box" id="case-${id}"></div>
      <button class="btn btn-sm" data-copy-target="#case-${id}">복사</button>
    </div>`).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>케이스 변환기</h2>
      <p class="tool-desc">공백·언더스코어·하이픈·camelCase 경계를 모두 인식해 여러 표기법으로 동시 변환합니다.
        여러 줄을 입력하면 줄 단위로 각각 변환됩니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="case-input">입력</label>
      <textarea id="case-input" class="code" rows="4" spellcheck="false" placeholder="my variable name  또는  myVariableName"></textarea>
    </div>
    <div class="card">
      <h3>결과</h3>
      ${rows}
    </div>
  `;

  const input = $('#case-input', container);

  function run() {
    const lines = input.value.split('\n');
    for (const { id, fn } of CONVERTERS) {
      const converted = lines
        .map((line) => {
          const words = splitWords(line);
          return words.length ? fn(words) : '';
        })
        .join('\n')
        .replace(/\n+$/, '');
      $(`#case-${id}`, container).textContent = converted;
    }
  }

  input.addEventListener('input', debounce(run, 150));
  bindCopyButtons(container);
}
