// JSON ↔ CSV/TSV 변환: RFC 4180 스타일 따옴표 처리, 타입 추론 옵션
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

function quoteCell(value, delimiter) {
  const s = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export function jsonToCsv(data, { delimiter = ',' } = {}) {
  if (!Array.isArray(data)) throw new Error('최상위가 배열이어야 합니다 (예: [{"a":1},{"a":2}]).');
  if (data.length === 0) return '';
  // 키 합집합 (첫 등장 순서 유지)
  const keys = [];
  let plainValues = false;
  for (const row of data) {
    if (row !== null && typeof row === 'object' && !Array.isArray(row)) {
      for (const k of Object.keys(row)) if (!keys.includes(k)) keys.push(k);
    } else {
      plainValues = true;
    }
  }
  if (keys.length === 0) {
    // 스칼라 배열 → 단일 컬럼
    return ['value', ...data.map((v) => quoteCell(v, delimiter))].join('\n');
  }
  if (plainValues) throw new Error('객체와 스칼라가 섞인 배열은 변환할 수 없습니다.');
  const lines = [keys.map((k) => quoteCell(k, delimiter)).join(delimiter)];
  for (const row of data) {
    lines.push(keys.map((k) => quoteCell(row[k], delimiter)).join(delimiter));
  }
  return lines.join('\n');
}

// CSV 파서 (따옴표·이스케이프·CRLF 처리)
export function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
      } else { cell += c; i++; }
    } else if (c === '"' && cell === '') {
      inQuotes = true;
      i++;
    } else if (c === delimiter) {
      row.push(cell); cell = ''; i++;
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
      i++;
    } else { cell += c; i++; }
  }
  if (inQuotes) throw new Error('닫히지 않은 따옴표가 있습니다.');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function inferType(s) {
  if (s === '') return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^-?\d+$/.test(s) && Number.isSafeInteger(Number(s))) return Number(s);
  if (/^-?(\d+\.\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return Number(s);
  return s;
}

export function csvToJson(text, { delimiter = ',', typed = true } = {}) {
  const rows = parseCsv(text, delimiter);
  if (rows.length < 1) return [];
  const [header, ...body] = rows;
  return body.map((cells, ri) => {
    if (cells.length > header.length) {
      throw new Error(`${ri + 2}번째 줄의 컬럼 수(${cells.length})가 헤더(${header.length})보다 많습니다.`);
    }
    const obj = {};
    header.forEach((key, ci) => {
      const raw = cells[ci] ?? '';
      obj[key] = typed ? inferType(raw) : raw;
    });
    return obj;
  });
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>JSON ↔ CSV 변환</h2>
      <p class="tool-desc">객체 배열 JSON과 CSV/TSV를 상호 변환합니다. 따옴표·개행이 든 셀도 안전하게 처리하고,
        CSV → JSON 시 숫자/불리언/null 타입 추론을 지원합니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <label>구분자
          <select id="jc-delim">
            <option value="," selected>쉼표 (CSV)</option>
            <option value="&#9;">탭 (TSV)</option>
            <option value=";">세미콜론</option>
          </select>
        </label>
        <label class="check-label"><input type="checkbox" id="jc-typed" checked> CSV→JSON 타입 추론 (숫자/불리언/null)</label>
      </div>
      <label class="field-label" for="jc-input">입력 (JSON 배열 또는 CSV)</label>
      <textarea id="jc-input" class="code" rows="9" spellcheck="false"
        placeholder='[{"name":"kim","age":30},{"name":"lee","age":25}]&#10;또는&#10;name,age&#10;kim,30'></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-primary" id="jc-tocsv">JSON → CSV</button>
        <button class="btn btn-primary" id="jc-tojson">CSV → JSON</button>
        <span class="grow"></span>
        <button class="btn" id="jc-clear">지우기</button>
      </div>
      <div id="jc-error"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="jc-output" style="margin-bottom:0">결과</label>
        <span id="jc-stats" class="badge badge-muted"></span>
        <button class="btn btn-sm" data-copy-target="#jc-output">복사</button>
      </div>
      <textarea id="jc-output" class="code" rows="10" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#jc-input', container);
  const output = $('#jc-output', container);
  const errorBox = $('#jc-error', container);
  const stats = $('#jc-stats', container);
  const getDelim = () => $('#jc-delim', container).value;

  function guard(fn) {
    errorBox.innerHTML = '';
    stats.textContent = '';
    if (!input.value.trim()) {
      errorBox.innerHTML = '<p class="error-text">입력이 비어 있습니다.</p>';
      return;
    }
    try { fn(); } catch (err) {
      output.value = '';
      errorBox.innerHTML = '<p class="error-text"></p>';
      errorBox.firstChild.textContent = err.message;
    }
  }

  $('#jc-tocsv', container).addEventListener('click', () => guard(() => {
    let parsed;
    try { parsed = JSON.parse(input.value); } catch (err) { throw new Error(`유효한 JSON이 아닙니다: ${err.message}`); }
    output.value = jsonToCsv(parsed, { delimiter: getDelim() });
    stats.textContent = `${Array.isArray(parsed) ? parsed.length : 0}행`;
  }));

  $('#jc-tojson', container).addEventListener('click', () => guard(() => {
    const result = csvToJson(input.value, { delimiter: getDelim(), typed: $('#jc-typed', container).checked });
    output.value = JSON.stringify(result, null, 2);
    stats.textContent = `${result.length}행`;
  }));

  $('#jc-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    errorBox.innerHTML = '';
    stats.textContent = '';
    input.focus();
  });

  bindCopyButtons(container);
}
