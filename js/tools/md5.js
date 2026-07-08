// MD5 해시: Web Crypto에 없어 RFC 1321 기준 순수 JS로 자체 구현 (UTF-8 입력)
// ⚠️ MD5는 암호학적으로 깨진 해시 — 체크섬/레거시 호환 용도로만 사용할 것.
import { $, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

/* eslint-disable no-bitwise */
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
// K[i] = floor(abs(sin(i+1)) * 2^32)
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000));

export function md5(input) {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);

  // 패딩: 0x80 + 0x00... + 원본 비트 길이(64비트 LE)
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 8) >> 6 << 6) + 64);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const M = new Uint32Array(16);
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(chunk + i * 4, true);
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F;
      let g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return [...out].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>MD5 해시</h2>
      <p class="tool-desc">텍스트 또는 파일의 MD5 해시를 계산합니다 (순수 JS 자체 구현).
        ⚠️ MD5는 암호학적으로 안전하지 않습니다 — 체크섬·레거시 호환 용도로만 사용하세요.</p>
    </div>
    <div class="card">
      <label class="field-label" for="md5-input">입력 텍스트 (UTF-8)</label>
      <textarea id="md5-input" class="code" rows="6" spellcheck="false" placeholder="해시를 생성할 텍스트"></textarea>
      <div class="row" style="margin-top:10px">
        <label class="btn" for="md5-file" style="margin-bottom:0">파일 해시…</label>
        <input type="file" id="md5-file" hidden>
        <span class="hint grow" id="md5-source" style="margin-top:0"></span>
        <button class="btn" id="md5-clear">지우기</button>
      </div>
    </div>
    <div class="card">
      <div class="output-row">
        <span class="output-label">MD5</span>
        <div class="output-box" id="md5-output"></div>
        <button class="btn btn-sm" data-copy-target="#md5-output">복사</button>
      </div>
    </div>
  `;

  const input = $('#md5-input', container);
  const output = $('#md5-output', container);
  const sourceInfo = $('#md5-source', container);
  const fileInput = $('#md5-file', container);
  let runId = 0;

  function runText() {
    runId++;
    sourceInfo.textContent = '';
    output.textContent = input.value ? md5(input.value) : '';
  }

  async function runFile(file) {
    if (!file) return;
    const id = ++runId;
    sourceInfo.textContent = `파일: ${file.name} 계산 중…`;
    try {
      const buffer = await file.arrayBuffer();
      if (id !== runId) return;
      output.textContent = md5(buffer);
      sourceInfo.textContent = `파일: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    } catch {
      if (id !== runId) return;
      sourceInfo.textContent = '파일을 읽지 못했습니다.';
    }
  }

  input.addEventListener('input', debounce(runText, 150));
  fileInput.addEventListener('change', () => runFile(fileInput.files[0]));
  $('#md5-clear', container).addEventListener('click', () => {
    input.value = '';
    fileInput.value = '';
    output.textContent = '';
    sourceInfo.textContent = '';
    input.focus();
  });

  bindCopyButtons(container);
}
