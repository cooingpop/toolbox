// 정규식 테스터: 매치 하이라이트, 캡처 그룹 테이블, 플래그 토글, 치환 미리보기
import { $, escapeHtml, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const FLAGS = [
  { flag: 'g', desc: '전체 매치' },
  { flag: 'i', desc: '대소문자 무시' },
  { flag: 'm', desc: '멀티라인 ^$' },
  { flag: 's', desc: '.이 개행 포함' },
  { flag: 'u', desc: '유니코드' },
  { flag: 'y', desc: 'sticky' },
];

const MAX_MATCHES = 2000;

export function collectMatches(regex, text) {
  const matches = [];
  if (regex.global || regex.sticky) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push(m);
      if (m[0] === '') regex.lastIndex++; // 빈 매치 무한루프 방지
      if (matches.length >= MAX_MATCHES) break;
    }
  } else {
    const m = regex.exec(text);
    if (m) matches.push(m);
  }
  return matches;
}

function highlight(text, matches) {
  let html = '';
  let cursor = 0;
  for (const m of matches) {
    if (m.index < cursor) continue;
    html += escapeHtml(text.slice(cursor, m.index));
    html += `<mark>${escapeHtml(m[0]) || '​'}</mark>`; // 빈 매치는 zero-width space로 표시
    cursor = m.index + m[0].length;
  }
  html += escapeHtml(text.slice(cursor));
  return html || '<span class="hint">테스트 문자열이 비어 있습니다.</span>';
}

export function init(container) {
  const flagChecks = FLAGS.map(({ flag, desc }) => `
    <label class="check-label" title="${desc}">
      <input type="checkbox" data-flag="${flag}" ${flag === 'g' ? 'checked' : ''}> <code>${flag}</code>
    </label>`).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>정규식 테스터</h2>
      <p class="tool-desc">JavaScript 정규식을 실시간으로 테스트합니다. 매치 하이라이트와 캡처 그룹을 보여줍니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="re-pattern">패턴</label>
      <div class="row">
        <input type="text" id="re-pattern" class="code grow" spellcheck="false" placeholder="예: (\\w+)@([\\w.]+)">
      </div>
      <div class="row">${flagChecks}</div>
      <div id="re-error"></div>
      <label class="field-label" for="re-text" style="margin-top:10px">테스트 문자열</label>
      <textarea id="re-text" class="code" rows="6" spellcheck="false" placeholder="여기에 매치할 텍스트 입력"></textarea>
      <label class="field-label" for="re-replace" style="margin-top:10px">치환 패턴 (선택 — 입력 시 치환 미리보기 표시, $1 $&lt;name&gt; 사용 가능)</label>
      <input type="text" id="re-replace" class="code" spellcheck="false" placeholder="예: $2의 $1">
    </div>
    <div class="card">
      <div class="row">
        <h3 class="grow" style="margin-bottom:0">매치 결과</h3>
        <span id="re-count" class="badge badge-muted"></span>
      </div>
      <pre class="code" id="re-highlight"></pre>
      <div id="re-groups" style="margin-top:12px"></div>
    </div>
    <div class="card" id="re-replace-card" hidden>
      <div class="row">
        <h3 class="grow" style="margin-bottom:0">치환 미리보기</h3>
        <button class="btn btn-sm" data-copy-target="#re-replaced">복사</button>
      </div>
      <pre class="code" id="re-replaced"></pre>
    </div>
  `;

  const patternInput = $('#re-pattern', container);
  const textInput = $('#re-text', container);
  const replaceInput = $('#re-replace', container);
  const errorBox = $('#re-error', container);
  const highlightBox = $('#re-highlight', container);
  const countBadge = $('#re-count', container);
  const groupsBox = $('#re-groups', container);
  const replaceCard = $('#re-replace-card', container);

  function getFlags() {
    return [...container.querySelectorAll('[data-flag]')]
      .filter((el) => el.checked)
      .map((el) => el.dataset.flag)
      .join('');
  }

  function run() {
    errorBox.innerHTML = '';
    const pattern = patternInput.value;
    const text = textInput.value;

    if (!pattern) {
      highlightBox.innerHTML = '<span class="hint">패턴을 입력하세요.</span>';
      countBadge.textContent = '';
      groupsBox.innerHTML = '';
      replaceCard.hidden = true;
      return;
    }

    let regex;
    try {
      regex = new RegExp(pattern, getFlags());
    } catch (err) {
      errorBox.innerHTML = '<p class="error-text"></p>';
      errorBox.firstChild.textContent = `잘못된 정규식: ${err.message}`;
      countBadge.textContent = '';
      return;
    }

    const matches = collectMatches(regex, text);
    countBadge.textContent = matches.length >= MAX_MATCHES
      ? `${MAX_MATCHES}개 이상 (표시 제한)` : `${matches.length}개 매치`;
    highlightBox.innerHTML = highlight(text, matches);

    // 캡처 그룹 테이블
    if (matches.length && (matches[0].length > 1 || matches[0].groups)) {
      const rows = [];
      matches.slice(0, 100).forEach((m, mi) => {
        for (let g = 1; g < m.length; g++) {
          rows.push(`<tr><td>#${mi + 1}</td><td>$${g}</td><td class="mono">${escapeHtml(m[g] ?? '(미매치)')}</td></tr>`);
        }
        if (m.groups) {
          for (const [name, val] of Object.entries(m.groups)) {
            rows.push(`<tr><td>#${mi + 1}</td><td>&lt;${escapeHtml(name)}&gt;</td><td class="mono">${escapeHtml(val ?? '(미매치)')}</td></tr>`);
          }
        }
      });
      groupsBox.innerHTML = `
        <table class="result-table">
          <thead><tr><th>매치</th><th>그룹</th><th>값</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>`;
    } else {
      groupsBox.innerHTML = matches.length ? '<p class="hint">캡처 그룹이 없습니다.</p>' : '';
    }

    // 치환 미리보기
    if (replaceInput.value && text) {
      try {
        $('#re-replaced', container).textContent = text.replace(regex, replaceInput.value);
        replaceCard.hidden = false;
      } catch {
        replaceCard.hidden = true;
      }
    } else {
      replaceCard.hidden = true;
    }
  }

  // catastrophic backtracking 대비: 디바운스로 입력 중 과도한 재실행 방지
  const debouncedRun = debounce(run, 250);
  patternInput.addEventListener('input', debouncedRun);
  textInput.addEventListener('input', debouncedRun);
  replaceInput.addEventListener('input', debouncedRun);
  for (const check of container.querySelectorAll('[data-flag]')) {
    check.addEventListener('change', run);
  }

  bindCopyButtons(container);
}
