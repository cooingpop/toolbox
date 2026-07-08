// JWT 디코더: header/payload 디코딩 + exp/iat/nbf 해석 + HMAC(HS256/384/512) 서명 검증(선택)
import { $, escapeHtml, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

function base64UrlToBytes(b64url) {
  let b64 = b64url.replaceAll('-', '+').replaceAll('_', '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeSegment(segment) {
  const json = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(segment));
  return JSON.parse(json);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

const HMAC_ALGS = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

async function verifyHmac(token, secret, alg) {
  const [header, payload, signature] = token.split('.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: HMAC_ALGS[alg] },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`));
  return bytesToBase64Url(new Uint8Array(sig)) === signature;
}

function formatClaimTime(seconds) {
  const date = new Date(seconds * 1000);
  const abs = date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'medium' });
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'always' });
  const absDiff = Math.abs(diffSec);
  let rel;
  if (absDiff < 60) rel = rtf.format(diffSec, 'second');
  else if (absDiff < 3600) rel = rtf.format(Math.round(diffSec / 60), 'minute');
  else if (absDiff < 86400) rel = rtf.format(Math.round(diffSec / 3600), 'hour');
  else rel = rtf.format(Math.round(diffSec / 86400), 'day');
  return { abs, rel };
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>JWT 디코더</h2>
      <p class="tool-desc">JWT의 header와 payload를 디코딩합니다.
        🔒 <strong>모든 처리는 이 브라우저 안에서만 이루어지며, 토큰은 어디로도 전송되지 않습니다.</strong></p>
    </div>
    <div class="card">
      <label class="field-label" for="jwt-input">JWT 토큰</label>
      <textarea id="jwt-input" class="code" rows="5" spellcheck="false" placeholder="eyJhbGciOi...  형식: header.payload.signature"></textarea>
      <label class="field-label" for="jwt-secret" style="margin-top:10px">시크릿 키 (선택 — 입력하면 HS256/384/512 서명을 검증)</label>
      <input type="text" id="jwt-secret" class="code" autocomplete="off" placeholder="비워두면 디코딩만 합니다">
      <div class="row" style="margin-top:10px">
        <span id="jwt-verify-badge"></span>
        <span class="grow"></span>
        <button class="btn" id="jwt-clear">지우기</button>
      </div>
      <div id="jwt-error"></div>
    </div>
    <div class="card" id="jwt-result" hidden>
      <div class="row">
        <h3 class="grow" style="margin-bottom:0">Header</h3>
        <button class="btn btn-sm" data-copy-target="#jwt-header">복사</button>
      </div>
      <pre class="code" id="jwt-header"></pre>
      <div class="row" style="margin-top:14px">
        <h3 class="grow" style="margin-bottom:0">Payload</h3>
        <button class="btn btn-sm" data-copy-target="#jwt-payload">복사</button>
      </div>
      <pre class="code" id="jwt-payload"></pre>
      <div id="jwt-claims" style="margin-top:14px"></div>
    </div>
  `;

  const input = $('#jwt-input', container);
  const secret = $('#jwt-secret', container);
  const errorBox = $('#jwt-error', container);
  const result = $('#jwt-result', container);
  const badge = $('#jwt-verify-badge', container);
  let runId = 0;

  async function run() {
    const id = ++runId;
    errorBox.innerHTML = '';
    badge.innerHTML = '';
    const token = input.value.trim();
    if (!token) { result.hidden = true; return; }

    const parts = token.split('.');
    if (parts.length !== 3) {
      result.hidden = true;
      errorBox.innerHTML = '<p class="error-text">JWT는 점(.)으로 구분된 3개 부분(header.payload.signature)이어야 합니다.</p>';
      return;
    }

    let header, payload;
    try { header = decodeSegment(parts[0]); } catch {
      result.hidden = true;
      errorBox.innerHTML = '<p class="error-text">header를 디코딩할 수 없습니다. Base64URL 인코딩된 JSON이 아닙니다.</p>';
      return;
    }
    try { payload = decodeSegment(parts[1]); } catch {
      result.hidden = true;
      errorBox.innerHTML = '<p class="error-text">payload를 디코딩할 수 없습니다. Base64URL 인코딩된 JSON이 아닙니다.</p>';
      return;
    }

    result.hidden = false;
    $('#jwt-header', container).textContent = JSON.stringify(header, null, 2);
    $('#jwt-payload', container).textContent = JSON.stringify(payload, null, 2);

    // 시간 클레임 해석
    const claims = [];
    const now = Date.now() / 1000;
    const labels = { exp: '만료 시각 (exp)', iat: '발급 시각 (iat)', nbf: '활성 시작 (nbf)' };
    for (const key of ['exp', 'iat', 'nbf']) {
      if (typeof payload[key] === 'number') {
        const { abs, rel } = formatClaimTime(payload[key]);
        let status = '';
        if (key === 'exp') {
          status = payload[key] < now
            ? '<span class="badge badge-error">만료됨</span>'
            : '<span class="badge badge-success">유효 기간 내</span>';
        }
        if (key === 'nbf' && payload[key] > now) {
          status = '<span class="badge badge-error">아직 활성화되지 않음</span>';
        }
        claims.push(`<tr><th>${labels[key]}</th><td class="mono">${payload[key]}</td><td>${escapeHtml(abs)} (${escapeHtml(rel)}) ${status}</td></tr>`);
      }
    }
    $('#jwt-claims', container).innerHTML = claims.length
      ? `<table class="result-table"><tbody>${claims.join('')}</tbody></table>`
      : '';

    // 서명 검증 (선택)
    const alg = header.alg;
    if (!secret.value) {
      badge.innerHTML = '<span class="badge badge-muted">서명 미검증 (시크릿 키 미입력)</span>';
      return;
    }
    if (!HMAC_ALGS[alg]) {
      badge.innerHTML = `<span class="badge badge-muted">${escapeHtml(String(alg))} 검증은 지원 예정 (HS256/384/512만 지원)</span>`;
      return;
    }
    try {
      const valid = await verifyHmac(token, secret.value, alg);
      if (id !== runId) return; // 입력이 바뀌었으면 무시
      badge.innerHTML = valid
        ? '<span class="badge badge-success">✓ 서명 유효</span>'
        : '<span class="badge badge-error">✗ 서명 무효</span>';
    } catch {
      if (id !== runId) return;
      badge.innerHTML = '<span class="badge badge-error">서명 검증 중 오류가 발생했습니다</span>';
    }
  }

  const debouncedRun = debounce(run, 200);
  input.addEventListener('input', debouncedRun);
  secret.addEventListener('input', debouncedRun);
  $('#jwt-clear', container).addEventListener('click', () => {
    input.value = '';
    secret.value = '';
    result.hidden = true;
    errorBox.innerHTML = '';
    badge.innerHTML = '';
    input.focus();
  });

  bindCopyButtons(container);
}
