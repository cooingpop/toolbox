// 텍스트 Diff 비교: 라인 단위 LCS 기반 (공통 앞/뒤 트리밍으로 최적화)
import { $, escapeHtml, debounce } from '../utils/dom.js';

const MAX_DP_CELLS = 4_000_000; // LCS DP 테이블 상한 (초과 시 중간부를 통째 교체로 처리)

// 결과: [{type: 'same'|'del'|'add', line}]
export function diffLines(aText, bText) {
  const a = aText.split('\n');
  const b = bText.split('\n');

  // 공통 앞부분/뒷부분 트리밍
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const result = [];
  for (let i = 0; i < start; i++) result.push({ type: 'same', line: a[i] });

  let truncated = false;
  if ((midA.length + 1) * (midB.length + 1) > MAX_DP_CELLS) {
    // 너무 크면 중간부를 삭제+추가로 통째 처리
    truncated = true;
    for (const line of midA) result.push({ type: 'del', line });
    for (const line of midB) result.push({ type: 'add', line });
  } else if (midA.length || midB.length) {
    // LCS DP + 역추적
    const n = midA.length;
    const m = midB.length;
    const width = m + 1;
    const dp = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * width + j] = midA[i] === midB[j]
          ? dp[(i + 1) * width + j + 1] + 1
          : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) { result.push({ type: 'same', line: midA[i] }); i++; j++; }
      else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) { result.push({ type: 'del', line: midA[i] }); i++; }
      else { result.push({ type: 'add', line: midB[j] }); j++; }
    }
    while (i < n) { result.push({ type: 'del', line: midA[i++] }); }
    while (j < m) { result.push({ type: 'add', line: midB[j++] }); }
  }

  for (let i = endA; i < a.length; i++) result.push({ type: 'same', line: a[i] });
  return { ops: result, truncated };
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>텍스트 Diff 비교</h2>
      <p class="tool-desc">두 텍스트를 라인 단위로 비교합니다 (LCS 기반).</p>
    </div>
    <div class="card">
      <div class="row" style="align-items:stretch">
        <div class="grow">
          <label class="field-label" for="diff-a">원본 (A)</label>
          <textarea id="diff-a" class="code" rows="10" spellcheck="false" placeholder="이전 텍스트"></textarea>
        </div>
        <div class="grow">
          <label class="field-label" for="diff-b">변경본 (B)</label>
          <textarea id="diff-b" class="code" rows="10" spellcheck="false" placeholder="새 텍스트"></textarea>
        </div>
      </div>
      <div class="row" style="margin-top:10px">
        <label class="check-label"><input type="checkbox" id="diff-hide-same"> 동일한 줄 숨기기</label>
        <span class="grow"></span>
        <button class="btn" id="diff-clear">지우기</button>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <h3 class="grow" style="margin-bottom:0">비교 결과</h3>
        <span id="diff-stats" class="badge badge-muted"></span>
      </div>
      <div id="diff-notice"></div>
      <pre class="code" id="diff-output"></pre>
    </div>
  `;

  const inputA = $('#diff-a', container);
  const inputB = $('#diff-b', container);
  const output = $('#diff-output', container);
  const stats = $('#diff-stats', container);
  const notice = $('#diff-notice', container);
  const hideSame = $('#diff-hide-same', container);

  function run() {
    notice.innerHTML = '';
    if (!inputA.value && !inputB.value) {
      output.innerHTML = '<span class="hint">양쪽에 텍스트를 입력하세요.</span>';
      stats.textContent = '';
      return;
    }
    const { ops, truncated } = diffLines(inputA.value, inputB.value);
    const added = ops.filter((o) => o.type === 'add').length;
    const deleted = ops.filter((o) => o.type === 'del').length;
    stats.textContent = `+${added} / −${deleted}`;
    if (truncated) {
      notice.innerHTML = '<p class="hint">⚠️ 변경 영역이 매우 커서 중간 부분은 삭제+추가로 단순 표시했습니다.</p>';
    }
    const html = ops
      .filter((o) => !(hideSame.checked && o.type === 'same'))
      .map((o) => {
        const cls = o.type === 'add' ? 'diff-add' : o.type === 'del' ? 'diff-del' : 'diff-same';
        const sign = o.type === 'add' ? '+' : o.type === 'del' ? '−' : ' ';
        return `<span class="diff-line ${cls}">${sign} ${escapeHtml(o.line)}</span>`;
      })
      .join('\n');
    output.innerHTML = html || '<span class="hint">차이가 없습니다.</span>';
  }

  const debouncedRun = debounce(run, 250);
  inputA.addEventListener('input', debouncedRun);
  inputB.addEventListener('input', debouncedRun);
  hideSame.addEventListener('change', run);
  $('#diff-clear', container).addEventListener('click', () => {
    inputA.value = '';
    inputB.value = '';
    run();
    inputA.focus();
  });

  run();
}
