// HTTP 레퍼런스: 상태 코드 + MIME 타입 사전 (검색 필터)
import { $, escapeHtml, debounce } from '../utils/dom.js';

export const STATUS_CODES = [
  [100, 'Continue', '요청 일부를 받았으니 계속 보내라'],
  [101, 'Switching Protocols', '프로토콜 전환 승인 (예: WebSocket 업그레이드)'],
  [103, 'Early Hints', '최종 응답 전 리소스 프리로드 힌트'],
  [200, 'OK', '요청 성공'],
  [201, 'Created', '리소스 생성됨 (POST/PUT 성공)'],
  [202, 'Accepted', '요청 접수됨, 처리는 비동기로 진행'],
  [204, 'No Content', '성공했지만 응답 본문 없음'],
  [206, 'Partial Content', '범위 요청(Range)에 대한 부분 응답'],
  [301, 'Moved Permanently', '영구 이동 — SEO 링크 주스 이전됨'],
  [302, 'Found', '임시 이동 (GET으로 바뀔 수 있음)'],
  [303, 'See Other', '다른 URI를 GET으로 조회하라'],
  [304, 'Not Modified', '캐시 유효 — 본문 재전송 안 함'],
  [307, 'Temporary Redirect', '임시 이동 (메서드 유지)'],
  [308, 'Permanent Redirect', '영구 이동 (메서드 유지)'],
  [400, 'Bad Request', '문법 오류 등 잘못된 요청'],
  [401, 'Unauthorized', '인증 필요 (사실상 Unauthenticated)'],
  [403, 'Forbidden', '인증됐지만 권한 없음'],
  [404, 'Not Found', '리소스 없음'],
  [405, 'Method Not Allowed', '해당 메서드 미지원 (Allow 헤더 확인)'],
  [406, 'Not Acceptable', 'Accept 조건을 만족하는 표현 없음'],
  [408, 'Request Timeout', '요청 대기 시간 초과'],
  [409, 'Conflict', '리소스 상태 충돌 (동시 수정 등)'],
  [410, 'Gone', '영구 삭제됨 (404보다 명시적)'],
  [411, 'Length Required', 'Content-Length 필요'],
  [412, 'Precondition Failed', 'If-* 전제조건 실패'],
  [413, 'Payload Too Large', '요청 본문이 너무 큼'],
  [414, 'URI Too Long', 'URI가 너무 김'],
  [415, 'Unsupported Media Type', '지원하지 않는 Content-Type'],
  [416, 'Range Not Satisfiable', '요청한 범위가 유효하지 않음'],
  [418, "I'm a teapot", '만우절 RFC 2324 — 찻주전자는 커피를 내릴 수 없다'],
  [422, 'Unprocessable Content', '문법은 맞지만 의미상 처리 불가 (유효성 실패)'],
  [425, 'Too Early', '재전송 위험이 있어 처리 거부'],
  [428, 'Precondition Required', '조건부 요청(If-Match 등) 필요'],
  [429, 'Too Many Requests', '요청 횟수 제한 초과 (Retry-After 확인)'],
  [431, 'Request Header Fields Too Large', '헤더가 너무 큼'],
  [451, 'Unavailable For Legal Reasons', '법적 사유로 제공 불가'],
  [500, 'Internal Server Error', '서버 내부 오류'],
  [501, 'Not Implemented', '서버가 해당 기능 미구현'],
  [502, 'Bad Gateway', '게이트웨이/프록시가 잘못된 응답 수신'],
  [503, 'Service Unavailable', '과부하/점검으로 일시 불가'],
  [504, 'Gateway Timeout', '게이트웨이가 업스트림 응답 시간 초과'],
  [505, 'HTTP Version Not Supported', 'HTTP 버전 미지원'],
  [507, 'Insufficient Storage', '저장 공간 부족 (WebDAV)'],
  [508, 'Loop Detected', '무한 루프 감지 (WebDAV)'],
];

export const MIME_TYPES = [
  ['json', 'application/json'], ['html', 'text/html'], ['css', 'text/css'], ['js / mjs', 'text/javascript'],
  ['txt', 'text/plain'], ['csv', 'text/csv'], ['xml', 'application/xml'], ['yaml / yml', 'application/yaml'],
  ['md', 'text/markdown'], ['pdf', 'application/pdf'], ['zip', 'application/zip'], ['gz', 'application/gzip'],
  ['tar', 'application/x-tar'], ['png', 'image/png'], ['jpg / jpeg', 'image/jpeg'], ['gif', 'image/gif'],
  ['webp', 'image/webp'], ['avif', 'image/avif'], ['svg', 'image/svg+xml'], ['ico', 'image/x-icon'],
  ['mp3', 'audio/mpeg'], ['wav', 'audio/wav'], ['ogg', 'audio/ogg'], ['mp4', 'video/mp4'], ['webm', 'video/webm'],
  ['woff', 'font/woff'], ['woff2', 'font/woff2'], ['ttf', 'font/ttf'], ['otf', 'font/otf'],
  ['wasm', 'application/wasm'], ['webmanifest', 'application/manifest+json'],
  ['form (URL 인코딩)', 'application/x-www-form-urlencoded'], ['form (파일 업로드)', 'multipart/form-data'],
  ['바이너리 (기본값)', 'application/octet-stream'], ['SSE 스트림', 'text/event-stream'],
  ['JSON-LD', 'application/ld+json'], ['NDJSON', 'application/x-ndjson'], ['protobuf', 'application/x-protobuf'],
];

const codeClass = (code) => (code < 200 ? 'badge-muted' : code < 300 ? 'badge-success' : code < 400 ? 'badge-muted' : 'badge-error');

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>HTTP 레퍼런스</h2>
      <p class="tool-desc">HTTP 상태 코드와 자주 쓰는 MIME 타입 사전입니다. 코드·이름·설명으로 검색하세요.</p>
    </div>
    <div class="card">
      <input type="search" id="href-filter" class="code" placeholder="검색: 404, redirect, json, 캐시…" autocomplete="off" aria-label="레퍼런스 검색">
    </div>
    <div class="card">
      <h3>상태 코드 <span class="badge badge-muted" id="href-status-count"></span></h3>
      <table class="result-table"><tbody id="href-status"></tbody></table>
    </div>
    <div class="card">
      <h3>MIME 타입 <span class="badge badge-muted" id="href-mime-count"></span></h3>
      <table class="result-table"><tbody id="href-mime"></tbody></table>
    </div>
  `;

  const filter = $('#href-filter', container);

  function run() {
    const q = filter.value.trim().toLowerCase();
    const statusRows = STATUS_CODES.filter(([code, name, ko]) => !q || `${code} ${name} ${ko}`.toLowerCase().includes(q));
    const mimeRows = MIME_TYPES.filter(([ext, mime]) => !q || `${ext} ${mime}`.toLowerCase().includes(q));
    $('#href-status', container).innerHTML = statusRows.map(([code, name, ko]) => `
      <tr><td><span class="badge ${codeClass(code)}">${code}</span></td>
      <td class="mono">${escapeHtml(name)}</td><td>${escapeHtml(ko)}</td></tr>`).join('')
      || '<tr><td colspan="3" class="hint">검색 결과 없음</td></tr>';
    $('#href-mime', container).innerHTML = mimeRows.map(([ext, mime]) => `
      <tr><td>${escapeHtml(ext)}</td><td class="mono">${escapeHtml(mime)}</td></tr>`).join('')
      || '<tr><td colspan="2" class="hint">검색 결과 없음</td></tr>';
    $('#href-status-count', container).textContent = `${statusRows.length}개`;
    $('#href-mime-count', container).textContent = `${mimeRows.length}개`;
  }

  filter.addEventListener('input', debounce(run, 150));
  run();
}
