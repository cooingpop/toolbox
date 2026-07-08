// Base64 인코더/디코더: UTF-8 안전, URL-safe 옵션, 이미지 → data URI
import { $ } from '../utils/dom.js';
import { bindCopyButtons, copyText } from '../utils/clipboard.js';

// TextEncoder 기반이라 한글·이모지도 안전하다. btoa 단독 사용 금지.
function bytesToBase64(bytes) {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeText(text, urlSafe) {
  let b64 = bytesToBase64(new TextEncoder().encode(text));
  if (urlSafe) b64 = b64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return b64;
}

export function decodeText(b64, urlSafe) {
  let normalized = b64.trim().replace(/\s+/g, '');
  if (urlSafe || /[-_]/.test(normalized)) {
    normalized = normalized.replaceAll('-', '+').replaceAll('_', '/');
  }
  while (normalized.length % 4 !== 0) normalized += '=';
  return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(normalized));
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>Base64 인코더/디코더</h2>
      <p class="tool-desc">텍스트 ↔ Base64 양방향 변환. UTF-8(한글·이모지) 안전, URL-safe 옵션, 이미지 → data URI 지원.</p>
    </div>
    <div class="card">
      <div class="row" role="radiogroup" aria-label="변환 방향">
        <label class="check-label"><input type="radio" name="b64-mode" value="encode" checked> 텍스트 → Base64</label>
        <label class="check-label"><input type="radio" name="b64-mode" value="decode"> Base64 → 텍스트</label>
        <label class="check-label"><input type="checkbox" id="b64-urlsafe"> URL-safe (<code>+/</code> → <code>-_</code>, 패딩 제거)</label>
      </div>
      <label class="field-label" for="b64-input">입력</label>
      <textarea id="b64-input" class="code" rows="6" spellcheck="false" placeholder="변환할 텍스트 또는 Base64 문자열"></textarea>
      <div id="b64-error"></div>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-primary" id="b64-run">변환</button>
        <button class="btn" id="b64-swap" title="출력을 입력으로 옮기고 방향 전환">↕ 방향 전환</button>
        <span class="grow"></span>
        <button class="btn" id="b64-clear">지우기</button>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="b64-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#b64-output">복사</button>
      </div>
      <textarea id="b64-output" class="code" rows="6" readonly spellcheck="false"></textarea>
    </div>
    <div class="card">
      <h3>이미지 → Base64 (data URI)</h3>
      <div class="drop-zone" id="b64-drop" tabindex="0" role="button" aria-label="이미지 파일 선택 또는 드래그">
        이미지를 드래그하거나 클릭해서 선택 (파일은 브라우저 밖으로 전송되지 않습니다)
      </div>
      <input type="file" id="b64-file" accept="image/*" hidden>
      <div id="b64-file-result" hidden style="margin-top:12px">
        <div class="row">
          <span class="hint grow" id="b64-file-info" style="margin-top:0"></span>
          <button class="btn btn-sm" id="b64-file-copy">data URI 복사</button>
        </div>
        <textarea id="b64-file-output" class="code" rows="4" readonly spellcheck="false"></textarea>
      </div>
    </div>
  `;

  const input = $('#b64-input', container);
  const output = $('#b64-output', container);
  const errorBox = $('#b64-error', container);
  const urlSafe = $('#b64-urlsafe', container);
  const getMode = () => container.querySelector('input[name="b64-mode"]:checked').value;

  function run() {
    errorBox.innerHTML = '';
    const text = input.value;
    if (!text) { output.value = ''; return; }
    try {
      output.value = getMode() === 'encode'
        ? encodeText(text, urlSafe.checked)
        : decodeText(text, urlSafe.checked);
    } catch {
      output.value = '';
      errorBox.innerHTML = '<p class="error-text">유효한 Base64 문자열이 아니거나 UTF-8 텍스트로 디코딩할 수 없습니다.</p>';
    }
  }

  $('#b64-run', container).addEventListener('click', run);
  input.addEventListener('input', run);
  urlSafe.addEventListener('change', run);
  for (const radio of container.querySelectorAll('input[name="b64-mode"]')) {
    radio.addEventListener('change', run);
  }

  $('#b64-swap', container).addEventListener('click', () => {
    const next = getMode() === 'encode' ? 'decode' : 'encode';
    container.querySelector(`input[name="b64-mode"][value="${next}"]`).checked = true;
    if (output.value) input.value = output.value;
    run();
  });

  $('#b64-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    errorBox.innerHTML = '';
    input.focus();
  });

  // 이미지 → data URI
  const drop = $('#b64-drop', container);
  const fileInput = $('#b64-file', container);
  const fileResult = $('#b64-file-result', container);
  const fileOutput = $('#b64-file-output', container);
  const fileInfo = $('#b64-file-info', container);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      fileResult.hidden = false;
      fileInfo.textContent = '이미지 파일만 지원합니다.';
      fileOutput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      fileResult.hidden = false;
      fileOutput.value = reader.result;
      fileInfo.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB → data URI ${(reader.result.length / 1024).toFixed(1)} KB`;
    };
    reader.readAsDataURL(file);
  }

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });
  $('#b64-file-copy', container).addEventListener('click', (e) => copyText(fileOutput.value, e.currentTarget));

  bindCopyButtons(container);
}
