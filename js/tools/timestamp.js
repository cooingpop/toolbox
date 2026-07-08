// Unix 타임스탬프 변환기: 초/밀리초 자동 감지, ISO8601·타임존·상대시간
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

export const TIMEZONES = [
  'Asia/Seoul', 'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Singapore', 'Australia/Sydney',
];

export function relativeTime(targetMs, nowMs = Date.now()) {
  const diffSec = Math.round((targetMs - nowMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), 'month');
  return rtf.format(Math.round(diffSec / (86400 * 365)), 'year');
}

function formatInTz(ms, timeZone) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, weekday: 'short', timeZoneName: 'short',
  }).format(new Date(ms));
}

// 자릿수 기반 초/밀리초 자동 감지: 13자리 이상이면 밀리초로 본다
export function detectUnit(raw) {
  const digits = raw.replace(/^-/, '');
  return digits.length >= 13 ? 'ms' : 's';
}

export function init(container) {
  const tzOptions = TIMEZONES.map((tz) => `<option value="${tz}"${tz === 'Asia/Seoul' ? ' selected' : ''}>${tz}</option>`).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>Unix 타임스탬프 변환기</h2>
      <p class="tool-desc">타임스탬프 ↔ 날짜 양방향 변환. 초(10자리)/밀리초(13자리)를 자동으로 감지합니다.</p>
    </div>
    <div class="card">
      <h3>타임스탬프 → 날짜</h3>
      <div class="row">
        <input type="text" id="ts-input" class="code grow" inputmode="numeric" placeholder="예: 1720000000 또는 1720000000000">
        <button class="btn btn-primary" id="ts-now">지금</button>
      </div>
      <div class="row">
        <label>표시 타임존 <select id="ts-tz">${tzOptions}</select></label>
        <span class="hint" id="ts-unit" style="margin-top:0"></span>
      </div>
      <div id="ts-error"></div>
      <div id="ts-results" hidden>
        <div class="output-row"><span class="output-label">ISO 8601 (UTC)</span><div class="output-box" id="ts-iso"></div><button class="btn btn-sm" data-copy-target="#ts-iso">복사</button></div>
        <div class="output-row"><span class="output-label">로컬 시간</span><div class="output-box" id="ts-local"></div><button class="btn btn-sm" data-copy-target="#ts-local">복사</button></div>
        <div class="output-row"><span class="output-label">선택 타임존</span><div class="output-box" id="ts-tzout"></div><button class="btn btn-sm" data-copy-target="#ts-tzout">복사</button></div>
        <div class="output-row"><span class="output-label">상대 시간</span><div class="output-box" id="ts-relative"></div><button class="btn btn-sm" data-copy-target="#ts-relative">복사</button></div>
      </div>
    </div>
    <div class="card">
      <h3>날짜 → 타임스탬프</h3>
      <div class="row">
        <input type="datetime-local" id="date-input" step="1" style="width:auto">
        <span class="hint" style="margin-top:0">(입력한 날짜는 로컬 타임존 기준으로 해석)</span>
      </div>
      <div id="date-results" hidden>
        <div class="output-row"><span class="output-label">초 (s)</span><div class="output-box" id="date-sec"></div><button class="btn btn-sm" data-copy-target="#date-sec">복사</button></div>
        <div class="output-row"><span class="output-label">밀리초 (ms)</span><div class="output-box" id="date-ms"></div><button class="btn btn-sm" data-copy-target="#date-ms">복사</button></div>
      </div>
    </div>
  `;

  const input = $('#ts-input', container);
  const tzSelect = $('#ts-tz', container);
  const errorBox = $('#ts-error', container);
  const results = $('#ts-results', container);
  const unitInfo = $('#ts-unit', container);

  function run() {
    errorBox.innerHTML = '';
    unitInfo.textContent = '';
    const raw = input.value.trim();
    if (!raw) { results.hidden = true; return; }
    if (!/^-?\d+$/.test(raw)) {
      results.hidden = true;
      errorBox.innerHTML = '<p class="error-text">숫자만 입력하세요 (예: 1720000000).</p>';
      return;
    }
    const unit = detectUnit(raw);
    const ms = unit === 'ms' ? Number(raw) : Number(raw) * 1000;
    const date = new Date(ms);
    if (!Number.isFinite(ms) || Number.isNaN(date.getTime())) {
      results.hidden = true;
      errorBox.innerHTML = '<p class="error-text">표현 가능한 범위를 벗어난 타임스탬프입니다.</p>';
      return;
    }
    unitInfo.textContent = unit === 'ms' ? '밀리초(ms)로 감지됨' : '초(s)로 감지됨';
    results.hidden = false;
    $('#ts-iso', container).textContent = date.toISOString();
    $('#ts-local', container).textContent = formatInTz(ms, Intl.DateTimeFormat().resolvedOptions().timeZone);
    $('#ts-tzout', container).textContent = formatInTz(ms, tzSelect.value);
    $('#ts-relative', container).textContent = relativeTime(ms);
  }

  input.addEventListener('input', run);
  tzSelect.addEventListener('change', run);
  $('#ts-now', container).addEventListener('click', () => {
    input.value = String(Math.floor(Date.now() / 1000));
    run();
  });

  // 날짜 → 타임스탬프
  const dateInput = $('#date-input', container);
  const dateResults = $('#date-results', container);
  function runDate() {
    if (!dateInput.value) { dateResults.hidden = true; return; }
    const ms = new Date(dateInput.value).getTime();
    if (Number.isNaN(ms)) { dateResults.hidden = true; return; }
    dateResults.hidden = false;
    $('#date-sec', container).textContent = String(Math.floor(ms / 1000));
    $('#date-ms', container).textContent = String(ms);
  }
  dateInput.addEventListener('input', runDate);

  // 초기값: 현재 시각
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  runDate();

  bindCopyButtons(container);
}
