// 시크릿 키 생성기: crypto.getRandomValues 바이트를 hex/Base64/Base64URL로 동시 출력
// (openssl rand -hex 32 등을 터미널 없이 대체)
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

export function randomBytes(count) {
  return crypto.getRandomValues(new Uint8Array(count));
}

export function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function bytesToBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

// 라벨 · 변환 함수 · 동등한 openssl 명령
const FORMATS = [
  {
    id: 'hex',
    label: 'Hex',
    encode: bytesToHex,
    cmd: (n) => `openssl rand -hex ${n}`,
    note: 'JWT 시크릿, API 키, DB 암호화 키에 가장 흔한 형식',
  },
  {
    id: 'b64',
    label: 'Base64',
    encode: bytesToBase64,
    cmd: (n) => `openssl rand -base64 ${n}`,
    note: '같은 바이트를 더 짧게 표현 (Rails secret_key_base, Django SECRET_KEY 등)',
  },
  {
    id: 'b64url',
    label: 'Base64URL',
    encode: bytesToBase64Url,
    cmd: (n) => `openssl rand -base64 ${n} | tr '+/' '-_' | tr -d '='`,
    note: 'URL·쿠키·JWT에 그대로 넣을 수 있는 형식 (+/= 없음)',
  },
];

const PRESETS = [
  { bytes: 16, label: '16B', title: '128비트 — 짧은 토큰·IV' },
  { bytes: 24, label: '24B', title: '192비트' },
  { bytes: 32, label: '32B', title: '256비트 — JWT 시크릿·AES-256 키 (권장)' },
  { bytes: 48, label: '48B', title: '384비트' },
  { bytes: 64, label: '64B', title: '512비트 — HMAC-SHA512 키' },
];

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>시크릿 키 생성기</h2>
      <p class="tool-desc">암호학적 난수 바이트를 만들어 Hex · Base64 · Base64URL로 동시에 보여줍니다.
        <code>openssl rand -hex 32</code>를 터미널 없이 대체하는 용도입니다.
        세 값은 <strong>같은 바이트</strong>의 다른 표현이며, <code>crypto.getRandomValues()</code>(CSPRNG)로 생성됩니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <label><strong>바이트 수</strong>
          <input type="number" id="sk-bytes" min="8" max="256" value="32" style="width:90px">
        </label>
        <input type="range" id="sk-range" min="8" max="128" step="1" value="32" aria-label="바이트 수 슬라이더" style="flex:1;min-width:140px">
        <span class="grow"></span>
        <button class="btn btn-primary" id="sk-generate">새로 생성</button>
      </div>
      <div class="row">
        <span class="hint" style="margin:0">빠른 선택</span>
        ${PRESETS.map((p) => `<button class="btn btn-sm" data-bytes="${p.bytes}" title="${p.title}">${p.label}</button>`).join('')}
      </div>
      <div id="sk-error"></div>
      <p class="hint" id="sk-entropy"></p>
    </div>
    <div class="card">
      ${FORMATS.map((f) => `
        <div class="output-row">
          <span class="output-label">${f.label}</span>
          <div class="output-box" id="sk-${f.id}"></div>
          <button class="btn btn-sm" data-copy-target="#sk-${f.id}">복사</button>
        </div>
        <p class="hint sk-note">${f.note} · 동등한 명령: <code id="sk-cmd-${f.id}"></code></p>
      `).join('')}
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="sk-env" style="margin-bottom:0">.env 스니펫</label>
        <label>변수명 <input type="text" id="sk-envname" value="SECRET_KEY" style="width:180px"></label>
        <label>형식
          <select id="sk-envformat">
            ${FORMATS.map((f) => `<option value="${f.id}"${f.id === 'hex' ? ' selected' : ''}>${f.label}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn-sm" data-copy-target="#sk-env">복사</button>
      </div>
      <div class="output-box" id="sk-env"></div>
      <p class="hint">⚠️ 생성된 키는 환경 변수·시크릿 매니저에 보관하고 저장소에 커밋하지 마세요.
        이 페이지의 값은 브라우저 밖으로 전송되지 않지만, 화면·클립보드 노출에는 주의하세요.</p>
    </div>
  `;

  const bytesInput = $('#sk-bytes', container);
  const rangeInput = $('#sk-range', container);
  const errorBox = $('#sk-error', container);
  let current = null; // 마지막으로 생성된 바이트

  function renderEnv() {
    if (!current) return;
    const format = FORMATS.find((f) => f.id === $('#sk-envformat', container).value);
    const name = ($('#sk-envname', container).value.trim() || 'SECRET_KEY');
    $('#sk-env', container).textContent = `${name}=${format.encode(current)}`;
  }

  function generate() {
    errorBox.innerHTML = '';
    const count = Number(bytesInput.value);
    if (!Number.isInteger(count) || count < 8 || count > 256) {
      errorBox.innerHTML = '<p class="error-text">바이트 수는 8~256 사이의 정수여야 합니다.</p>';
      return;
    }
    current = randomBytes(count);
    const lengths = [];
    for (const format of FORMATS) {
      const encoded = format.encode(current);
      $(`#sk-${format.id}`, container).textContent = encoded;
      $(`#sk-cmd-${format.id}`, container).textContent = format.cmd(count);
      lengths.push(`${format.label} ${encoded.length}자`);
    }
    // 슬라이더 범위(8~128) 밖이면 슬라이더는 끝값에 머문다
    rangeInput.value = String(Math.min(Math.max(count, 8), 128));
    $('#sk-entropy', container).textContent =
      `${count}바이트 = ${count * 8}비트 엔트로피${count < 16 ? ' (16바이트 이상 권장)' : ''} · ${lengths.join(' · ')}`;
    renderEnv();
  }

  $('#sk-generate', container).addEventListener('click', generate);
  bytesInput.addEventListener('input', generate);
  rangeInput.addEventListener('input', () => {
    bytesInput.value = rangeInput.value;
    generate();
  });
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bytes]');
    if (!btn) return;
    bytesInput.value = btn.dataset.bytes;
    generate();
  });
  $('#sk-envname', container).addEventListener('input', renderEnv);
  $('#sk-envformat', container).addEventListener('change', renderEnv);

  generate();
  bindCopyButtons(container);
}
