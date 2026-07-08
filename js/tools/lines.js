// 줄 정렬/중복 제거: sort / unique / reverse / trim / 빈 줄 제거
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

export function processLines(text, opts) {
  let lines = text.split('\n');
  if (opts.trim) lines = lines.map((l) => l.trim());
  if (opts.removeEmpty) lines = lines.filter((l) => l.trim() !== '');
  if (opts.unique) {
    const seen = new Set();
    lines = lines.filter((l) => {
      const key = opts.caseInsensitive ? l.toLowerCase() : l;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (opts.sort === 'asc' || opts.sort === 'desc') {
    lines.sort((a, b) => (opts.caseInsensitive ? a.toLowerCase() : a).localeCompare(
      opts.caseInsensitive ? b.toLowerCase() : b, 'ko', { numeric: opts.numeric }));
    if (opts.sort === 'desc') lines.reverse();
  } else if (opts.sort === 'reverse') {
    lines.reverse();
  }
  return lines;
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>줄 정렬/중복 제거</h2>
      <p class="tool-desc">줄 단위로 정렬(sort)·중복 제거(unique)·역순(reverse)·공백 정리를 수행합니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="lines-input">입력 (줄 단위)</label>
      <textarea id="lines-input" class="code" rows="9" spellcheck="false" placeholder="banana
apple
banana
cherry"></textarea>
      <div class="row" style="margin-top:10px">
        <label>정렬
          <select id="lines-sort">
            <option value="none">안 함</option>
            <option value="asc" selected>오름차순</option>
            <option value="desc">내림차순</option>
            <option value="reverse">역순 (reverse)</option>
          </select>
        </label>
        <label class="check-label"><input type="checkbox" id="lines-unique" checked> 중복 제거</label>
        <label class="check-label"><input type="checkbox" id="lines-numeric" checked> 숫자 인식 정렬</label>
        <label class="check-label"><input type="checkbox" id="lines-ci"> 대소문자 무시</label>
      </div>
      <div class="row">
        <label class="check-label"><input type="checkbox" id="lines-trim"> 앞뒤 공백 제거</label>
        <label class="check-label"><input type="checkbox" id="lines-empty" checked> 빈 줄 제거</label>
        <button class="btn btn-primary" id="lines-run">실행</button>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="lines-output" style="margin-bottom:0">결과</label>
        <span id="lines-stats" class="badge badge-muted"></span>
        <button class="btn btn-sm" data-copy-target="#lines-output">복사</button>
      </div>
      <textarea id="lines-output" class="code" rows="9" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#lines-input', container);
  const output = $('#lines-output', container);
  const stats = $('#lines-stats', container);

  function run() {
    const before = input.value ? input.value.split('\n').length : 0;
    const result = processLines(input.value, {
      sort: $('#lines-sort', container).value,
      unique: $('#lines-unique', container).checked,
      numeric: $('#lines-numeric', container).checked,
      caseInsensitive: $('#lines-ci', container).checked,
      trim: $('#lines-trim', container).checked,
      removeEmpty: $('#lines-empty', container).checked,
    });
    output.value = result.join('\n');
    stats.textContent = `${before}줄 → ${result.length}줄`;
  }

  $('#lines-run', container).addEventListener('click', run);
  input.addEventListener('input', run);
  for (const el of container.querySelectorAll('select, input[type="checkbox"]')) {
    el.addEventListener('change', run);
  }

  bindCopyButtons(container);
}
