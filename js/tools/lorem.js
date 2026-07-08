// Lorem Ipsum 생성기: 문단/문장/단어 단위
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua '
  + 'enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in '
  + 'reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt '
  + 'culpa qui officia deserunt mollit anim id est laborum').split(' ');

const CLASSIC_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';

const rand = (n) => Math.floor(Math.random() * n);
const pick = () => WORDS[rand(WORDS.length)];

function sentence(minWords = 6, maxWords = 14) {
  const count = minWords + rand(maxWords - minWords + 1);
  const words = Array.from({ length: count }, pick);
  // 중간에 쉼표 하나 정도
  if (count > 8) words[3 + rand(count - 6)] += ',';
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

function paragraph(minSentences = 3, maxSentences = 6) {
  const count = minSentences + rand(maxSentences - minSentences + 1);
  return Array.from({ length: count }, () => sentence()).join(' ');
}

export function generateLorem(unit, count, classicStart) {
  if (unit === 'words') {
    const words = Array.from({ length: count }, pick);
    if (classicStart) {
      const classic = CLASSIC_START.toLowerCase().replace(',', '').split(' ');
      for (let i = 0; i < Math.min(count, classic.length); i++) words[i] = classic[i];
    }
    const text = words.join(' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  if (unit === 'sentences') {
    const sentences = Array.from({ length: count }, () => sentence());
    if (classicStart) sentences[0] = CLASSIC_START + '.';
    return sentences.join(' ');
  }
  // paragraphs
  const paragraphs = Array.from({ length: count }, () => paragraph());
  if (classicStart) paragraphs[0] = CLASSIC_START + '. ' + paragraphs[0];
  return paragraphs.join('\n\n');
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>Lorem Ipsum 생성기</h2>
      <p class="tool-desc">디자인 시안·레이아웃 테스트용 채움 텍스트를 문단/문장/단어 단위로 생성합니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <label>단위
          <select id="lorem-unit">
            <option value="paragraphs" selected>문단</option>
            <option value="sentences">문장</option>
            <option value="words">단어</option>
          </select>
        </label>
        <label>개수 <input type="number" id="lorem-count" min="1" max="100" value="3"></label>
        <label class="check-label"><input type="checkbox" id="lorem-classic" checked> "Lorem ipsum dolor sit amet…"로 시작</label>
        <button class="btn btn-primary" id="lorem-generate">생성</button>
      </div>
      <div id="lorem-error"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="lorem-output" style="margin-bottom:0">결과</label>
        <span id="lorem-stats" class="badge badge-muted"></span>
        <button class="btn btn-sm" data-copy-target="#lorem-output">복사</button>
      </div>
      <textarea id="lorem-output" class="code" rows="12" readonly spellcheck="false"></textarea>
    </div>
  `;

  const output = $('#lorem-output', container);
  const errorBox = $('#lorem-error', container);

  function generate() {
    errorBox.innerHTML = '';
    const count = Number($('#lorem-count', container).value);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      errorBox.innerHTML = '<p class="error-text">개수는 1~100 사이여야 합니다.</p>';
      return;
    }
    const text = generateLorem(
      $('#lorem-unit', container).value,
      count,
      $('#lorem-classic', container).checked,
    );
    output.value = text;
    const words = text.trim().split(/\s+/).length;
    $('#lorem-stats', container).textContent = `${words.toLocaleString('ko-KR')} 단어 · ${[...text].length.toLocaleString('ko-KR')} 글자`;
  }

  $('#lorem-generate', container).addEventListener('click', generate);
  generate();

  bindCopyButtons(container);
}
