// 타임존 변환기: 한 시각을 여러 타임존으로 동시 표시 (Intl 기반)
import { $, escapeHtml } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';
import { wallToInstant } from './cron.js';
import { TIMEZONES } from './timestamp.js';

const DEFAULT_ZONES = ['Asia/Seoul', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'];

function allZones() {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return TIMEZONES;
  }
}

function formatZoned(ms, timeZone) {
  const main = new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(ms));
  const offset = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')?.value ?? '';
  return { main, offset };
}

export function init(container) {
  const srcOptions = allZones().map((tz) => `<option value="${tz}"${tz === 'Asia/Seoul' ? ' selected' : ''}>${tz}</option>`).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>타임존 변환기</h2>
      <p class="tool-desc">기준 타임존의 시각을 여러 도시 시각으로 동시에 변환합니다. 서머타임(DST)이 자동 반영됩니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <div>
          <label class="field-label" for="tzc-datetime">날짜·시각</label>
          <input type="datetime-local" id="tzc-datetime" style="width:auto">
        </div>
        <div>
          <label class="field-label" for="tzc-source">기준 타임존</label>
          <select id="tzc-source">${srcOptions}</select>
        </div>
        <button class="btn btn-primary" id="tzc-now" style="align-self:flex-end">지금</button>
      </div>
      <div class="row">
        <label>도시 추가 <select id="tzc-add"><option value="">선택…</option>${srcOptions.replace(' selected', '')}</select></label>
      </div>
      <div id="tzc-error"></div>
    </div>
    <div class="card">
      <h3>변환 결과</h3>
      <div id="tzc-results"></div>
    </div>
  `;

  const dateInput = $('#tzc-datetime', container);
  const sourceSelect = $('#tzc-source', container);
  const addSelect = $('#tzc-add', container);
  const errorBox = $('#tzc-error', container);
  const resultsBox = $('#tzc-results', container);
  const zones = [...DEFAULT_ZONES];

  function setNow() {
    // 기준 타임존의 현재 벽시계 시각으로 채움
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: sourceSelect.value,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(Date.now()).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
    dateInput.value = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }

  function run() {
    errorBox.innerHTML = '';
    if (!dateInput.value) { resultsBox.innerHTML = '<p class="hint">날짜·시각을 입력하세요.</p>'; return; }
    const m = dateInput.value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) { resultsBox.innerHTML = ''; return; }
    const ms = wallToInstant(+m[1], +m[2], +m[3], +m[4], +m[5], 0, sourceSelect.value);
    if (ms === null) {
      errorBox.innerHTML = '<p class="error-text">해당 타임존에 존재하지 않는 시각입니다 (서머타임 전환 구간).</p>';
      resultsBox.innerHTML = '';
      return;
    }
    const rows = zones.map((tz) => {
      const { main, offset } = formatZoned(ms, tz);
      const isSource = tz === sourceSelect.value;
      return `<tr${isSource ? ' style="font-weight:700"' : ''}>
        <td class="mono">${escapeHtml(tz)}${isSource ? ' <span class="badge badge-muted">기준</span>' : ''}</td>
        <td>${escapeHtml(main)}</td>
        <td class="mono">${escapeHtml(offset)}</td>
        <td><button class="btn btn-sm" data-remove-tz="${escapeHtml(tz)}" aria-label="${escapeHtml(tz)} 제거">✕</button></td>
      </tr>`;
    }).join('');
    resultsBox.innerHTML = `
      <table class="result-table">
        <thead><tr><th>타임존</th><th>시각</th><th>오프셋</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  dateInput.addEventListener('input', run);
  sourceSelect.addEventListener('change', run);
  $('#tzc-now', container).addEventListener('click', () => { setNow(); run(); });
  addSelect.addEventListener('change', () => {
    if (addSelect.value && !zones.includes(addSelect.value)) {
      zones.push(addSelect.value);
      run();
    }
    addSelect.value = '';
  });
  resultsBox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-tz]');
    if (!btn) return;
    const i = zones.indexOf(btn.dataset.removeTz);
    if (i >= 0) { zones.splice(i, 1); run(); }
  });

  setNow();
  run();
  bindCopyButtons(container);
}
