// 해시 생성기: Web Crypto로 SHA-1/256/384/512 동시 출력 (텍스트 + 파일)
import { $, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digestAll(data) {
  const results = {};
  await Promise.all(ALGORITHMS.map(async (alg) => {
    results[alg] = bytesToHex(await crypto.subtle.digest(alg, data));
  }));
  return results;
}

export function init(container) {
  const rows = ALGORITHMS.map((alg) => {
    const id = `hash-${alg.toLowerCase().replace('-', '')}`;
    return `
      <div class="output-row">
        <span class="output-label">${alg}</span>
        <div class="output-box" id="${id}"></div>
        <button class="btn btn-sm" data-copy-target="#${id}">복사</button>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>해시 생성기</h2>
      <p class="tool-desc">Web Crypto API로 SHA-1 / SHA-256 / SHA-384 / SHA-512 해시를 동시에 생성합니다.
        입력은 브라우저 밖으로 전송되지 않습니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="hash-input">입력 텍스트 (UTF-8)</label>
      <textarea id="hash-input" class="code" rows="6" spellcheck="false" placeholder="해시를 생성할 텍스트"></textarea>
      <div class="row" style="margin-top:10px">
        <label class="btn" for="hash-file" style="margin-bottom:0">파일 해시…</label>
        <input type="file" id="hash-file" hidden>
        <span class="hint grow" id="hash-source" style="margin-top:0"></span>
        <button class="btn" id="hash-clear">지우기</button>
      </div>
    </div>
    <div class="card">
      <h3>결과 (hex)</h3>
      ${rows}
    </div>
  `;

  const input = $('#hash-input', container);
  const sourceInfo = $('#hash-source', container);
  const fileInput = $('#hash-file', container);
  let runId = 0;

  function renderResults(results) {
    for (const alg of ALGORITHMS) {
      $(`#hash-${alg.toLowerCase().replace('-', '')}`, container).textContent = results ? results[alg] : '';
    }
  }

  async function runText() {
    const id = ++runId;
    sourceInfo.textContent = '';
    if (!input.value) { renderResults(null); return; }
    const results = await digestAll(new TextEncoder().encode(input.value));
    if (id === runId) renderResults(results);
  }

  async function runFile(file) {
    if (!file) return;
    const id = ++runId;
    sourceInfo.textContent = `파일: ${file.name} (${(file.size / 1024).toFixed(1)} KB) 계산 중…`;
    try {
      const buffer = await file.arrayBuffer();
      const results = await digestAll(buffer);
      if (id !== runId) return;
      renderResults(results);
      sourceInfo.textContent = `파일: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    } catch {
      if (id !== runId) return;
      sourceInfo.textContent = '파일을 읽지 못했습니다.';
    }
  }

  input.addEventListener('input', debounce(runText, 150));
  fileInput.addEventListener('change', () => runFile(fileInput.files[0]));
  $('#hash-clear', container).addEventListener('click', () => {
    input.value = '';
    fileInput.value = '';
    renderResults(null);
    sourceInfo.textContent = '';
    input.focus();
  });

  bindCopyButtons(container);
}
