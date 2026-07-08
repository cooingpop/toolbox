// HMAC 생성기: Web Crypto HMAC-SHA256/384/512/SHA-1, hex + Base64 출력
import { $, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

const ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'];

export async function hmac(message, key, hash) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message)));
  return {
    hex: [...sig].map((b) => b.toString(16).padStart(2, '0')).join(''),
    base64: btoa(String.fromCharCode(...sig)),
  };
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>HMAC 생성기</h2>
      <p class="tool-desc">Web Crypto API로 HMAC을 계산합니다. 메시지와 키 모두 브라우저 밖으로 전송되지 않습니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="hmac-message">메시지</label>
      <textarea id="hmac-message" class="code" rows="5" spellcheck="false" placeholder="서명할 메시지"></textarea>
      <div class="row" style="margin-top:10px">
        <div class="grow">
          <label class="field-label" for="hmac-key">시크릿 키</label>
          <input type="text" id="hmac-key" class="code" autocomplete="off" placeholder="secret">
        </div>
        <div>
          <label class="field-label" for="hmac-alg">알고리즘</label>
          <select id="hmac-alg">${ALGORITHMS.map((a) => `<option${a === 'SHA-256' ? ' selected' : ''}>${a}</option>`).join('')}</select>
        </div>
      </div>
      <div id="hmac-hint"></div>
    </div>
    <div class="card">
      <h3>결과</h3>
      <div class="output-row"><span class="output-label">Hex</span><div class="output-box" id="hmac-hex"></div><button class="btn btn-sm" data-copy-target="#hmac-hex">복사</button></div>
      <div class="output-row"><span class="output-label">Base64</span><div class="output-box" id="hmac-b64"></div><button class="btn btn-sm" data-copy-target="#hmac-b64">복사</button></div>
    </div>
  `;

  const message = $('#hmac-message', container);
  const key = $('#hmac-key', container);
  const alg = $('#hmac-alg', container);
  const hint = $('#hmac-hint', container);
  let runId = 0;

  async function run() {
    const id = ++runId;
    hint.innerHTML = '';
    if (!key.value) {
      hint.innerHTML = message.value ? '<p class="hint">시크릿 키를 입력하면 HMAC이 계산됩니다.</p>' : '';
      $('#hmac-hex', container).textContent = '';
      $('#hmac-b64', container).textContent = '';
      return;
    }
    const result = await hmac(message.value, key.value, alg.value);
    if (id !== runId) return;
    $('#hmac-hex', container).textContent = result.hex;
    $('#hmac-b64', container).textContent = result.base64;
  }

  const debouncedRun = debounce(run, 150);
  message.addEventListener('input', debouncedRun);
  key.addEventListener('input', debouncedRun);
  alg.addEventListener('change', run);

  bindCopyButtons(container);
}
