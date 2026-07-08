// JSON Diff: 구조 기준 비교 (키 순서 무시), 경로별 추가/삭제/변경 목록
import { $, escapeHtml, debounce } from '../utils/dom.js';

export function diffJson(a, b, path = '$', out = []) {
  if (a === b) return out;
  const typeA = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
  const typeB = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;

  if (typeA !== typeB || (typeA !== 'object' && typeA !== 'array')) {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, type: 'changed', before: a, after: b });
    return out;
  }
  if (typeA === 'array') {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (i >= a.length) out.push({ path: `${path}[${i}]`, type: 'added', after: b[i] });
      else if (i >= b.length) out.push({ path: `${path}[${i}]`, type: 'removed', before: a[i] });
      else diffJson(a[i], b[i], `${path}[${i}]`, out);
    }
    return out;
  }
  // object: 키 순서 무시
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const childPath = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
    if (!(key in a)) out.push({ path: childPath, type: 'added', after: b[key] });
    else if (!(key in b)) out.push({ path: childPath, type: 'removed', before: a[key] });
    else diffJson(a[key], b[key], childPath, out);
  }
  return out;
}

const fmt = (v) => {
  const s = JSON.stringify(v);
  return s.length > 120 ? s.slice(0, 117) + '…' : s;
};

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>JSON Diff</h2>
      <p class="tool-desc">두 JSON을 <strong>구조 기준</strong>으로 비교합니다. 키 순서·들여쓰기 차이는 무시하고
        실제로 추가/삭제/변경된 값만 경로와 함께 보여줍니다.</p>
    </div>
    <div class="card">
      <div class="row" style="align-items:stretch">
        <div class="grow">
          <label class="field-label" for="jd-a">JSON A (이전)</label>
          <textarea id="jd-a" class="code" rows="9" spellcheck="false" placeholder='{"name":"kim","age":30}'></textarea>
          <div id="jd-error-a"></div>
        </div>
        <div class="grow">
          <label class="field-label" for="jd-b">JSON B (이후)</label>
          <textarea id="jd-b" class="code" rows="9" spellcheck="false" placeholder='{"age":31,"name":"kim","email":"k@x.io"}'></textarea>
          <div id="jd-error-b"></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <h3 class="grow" style="margin-bottom:0">차이점</h3>
        <span id="jd-stats" class="badge badge-muted"></span>
      </div>
      <div id="jd-result"><p class="hint">양쪽에 JSON을 입력하세요.</p></div>
    </div>
  `;

  const inputA = $('#jd-a', container);
  const inputB = $('#jd-b', container);
  const result = $('#jd-result', container);
  const stats = $('#jd-stats', container);

  function run() {
    $('#jd-error-a', container).innerHTML = '';
    $('#jd-error-b', container).innerHTML = '';
    stats.textContent = '';
    if (!inputA.value.trim() || !inputB.value.trim()) {
      result.innerHTML = '<p class="hint">양쪽에 JSON을 입력하세요.</p>';
      return;
    }
    let a;
    let b;
    let bad = false;
    try { a = JSON.parse(inputA.value); } catch (err) {
      $('#jd-error-a', container).innerHTML = `<p class="error-text">유효하지 않은 JSON: ${escapeHtml(err.message)}</p>`;
      bad = true;
    }
    try { b = JSON.parse(inputB.value); } catch (err) {
      $('#jd-error-b', container).innerHTML = `<p class="error-text">유효하지 않은 JSON: ${escapeHtml(err.message)}</p>`;
      bad = true;
    }
    if (bad) { result.innerHTML = ''; return; }

    const diffs = diffJson(a, b);
    if (!diffs.length) {
      result.innerHTML = '<p class="success-text">✓ 두 JSON은 구조적으로 동일합니다 (키 순서 차이만 있을 수 있음).</p>';
      stats.textContent = '차이 없음';
      return;
    }
    const badge = { added: '<span class="badge badge-success">추가</span>', removed: '<span class="badge badge-error">삭제</span>', changed: '<span class="badge badge-muted">변경</span>' };
    const rows = diffs.slice(0, 500).map((d) => `
      <tr>
        <td>${badge[d.type]}</td>
        <td class="mono">${escapeHtml(d.path)}</td>
        <td class="mono">${d.type === 'added' ? '' : escapeHtml(fmt(d.before))}</td>
        <td class="mono">${d.type === 'removed' ? '' : escapeHtml(fmt(d.after))}</td>
      </tr>`).join('');
    result.innerHTML = `
      <table class="result-table">
        <thead><tr><th></th><th>경로</th><th>이전 (A)</th><th>이후 (B)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${diffs.length > 500 ? '<p class="hint">차이가 많아 처음 500개만 표시했습니다.</p>' : ''}`;
    stats.textContent = `${diffs.length}건`;
  }

  const debouncedRun = debounce(run, 300);
  inputA.addEventListener('input', debouncedRun);
  inputB.addEventListener('input', debouncedRun);
}
