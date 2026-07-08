// 텍스트 통계: 글자·단어·줄·바이트 수 등
import { $, debounce } from '../utils/dom.js';

export function computeStats(text) {
  const chars = [...text].length; // 코드 포인트 기준 (이모지 안전)
  const charsNoSpace = [...text.replace(/\s/g, '')].length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split('\n').length : 0;
  const nonEmptyLines = text.split('\n').filter((l) => l.trim()).length;
  const bytes = new TextEncoder().encode(text).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  return { chars, charsNoSpace, words, lines, nonEmptyLines, bytes, paragraphs };
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>텍스트 통계</h2>
      <p class="tool-desc">글자·단어·줄·바이트(UTF-8) 수를 실시간으로 계산합니다. 글자 수는 유니코드 코드 포인트 기준입니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="stats-input">텍스트</label>
      <textarea id="stats-input" class="code" rows="10" spellcheck="false" placeholder="여기에 텍스트 붙여넣기"></textarea>
    </div>
    <div class="card">
      <h3>통계</h3>
      <table class="result-table"><tbody id="stats-body"></tbody></table>
    </div>
  `;

  const input = $('#stats-input', container);
  const body = $('#stats-body', container);

  function run() {
    const s = computeStats(input.value);
    const fmt = (n) => n.toLocaleString('ko-KR');
    body.innerHTML = `
      <tr><th>글자 수 (공백 포함)</th><td class="mono">${fmt(s.chars)}</td></tr>
      <tr><th>글자 수 (공백 제외)</th><td class="mono">${fmt(s.charsNoSpace)}</td></tr>
      <tr><th>단어 수</th><td class="mono">${fmt(s.words)}</td></tr>
      <tr><th>줄 수</th><td class="mono">${fmt(s.lines)} (비어있지 않은 줄: ${fmt(s.nonEmptyLines)})</td></tr>
      <tr><th>문단 수</th><td class="mono">${fmt(s.paragraphs)}</td></tr>
      <tr><th>바이트 (UTF-8)</th><td class="mono">${fmt(s.bytes)}</td></tr>`;
  }

  input.addEventListener('input', debounce(run, 150));
  run();
}
