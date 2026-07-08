// Cron 표현식 해석기: 자연어(한국어) 설명 + 다음 실행 시각 계산 (타임존 지원, 순수 JS)
import { $, escapeHtml, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';
import { TIMEZONES, relativeTime } from './timestamp.js';

/* ==================== 파서 ==================== */

const ALIASES = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

const MONTH_NAMES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DOW_NAMES = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const FIELD_DEFS = {
  second: { label: '초', min: 0, max: 59 },
  minute: { label: '분', min: 0, max: 59 },
  hour: { label: '시', min: 0, max: 23 },
  dom: { label: '일', min: 1, max: 31 },
  month: { label: '월', min: 1, max: 12, names: MONTH_NAMES },
  dow: { label: '요일', min: 0, max: 7, names: DOW_NAMES }, // 7은 일요일(0)로 정규화
};

export class CronError extends Error {
  constructor(fieldLabel, raw, reason) {
    super(fieldLabel ? `${fieldLabel} 필드의 "${raw}"이(가) 잘못되었습니다: ${reason}` : reason);
    this.field = fieldLabel;
  }
}

function parseValue(token, def) {
  if (def.names) {
    const named = def.names[token.toLowerCase()];
    if (named !== undefined) return named;
  }
  if (!/^\d+$/.test(token)) {
    throw new CronError(def.label, token, `숫자${def.names ? ' 또는 이름(예: ' + Object.keys(def.names).slice(0, 3).join(', ').toUpperCase() + ')' : ''}이어야 합니다`);
  }
  let value = Number(token);
  if (def.max === 7 && value === 7) value = 0; // 요일 7 = 일요일
  if (value < def.min || value > (def.max === 7 ? 6 : def.max)) {
    throw new CronError(def.label, token, `${def.min}~${def.max} 범위여야 합니다`);
  }
  return value;
}

// 한 필드("*/15", "1-5", "1,3,5", "MON-FRI" 등) → { set, any, singleStep, raw }
export function parseField(raw, def) {
  const effectiveMax = def.max === 7 ? 6 : def.max;
  const set = new Set();
  let any = false;
  let singleStep = null;

  const items = raw.split(',');
  if (items.some((s) => s === '')) throw new CronError(def.label, raw, '빈 항목이 있습니다 (쉼표 확인)');

  for (const item of items) {
    const stepMatch = item.match(/^(.+?)\/(\d+)$/);
    const base = stepMatch ? stepMatch[1] : item;
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    if (stepMatch && step < 1) throw new CronError(def.label, item, '스텝은 1 이상이어야 합니다');

    let start;
    let end;
    if (base === '*') {
      start = def.min;
      end = effectiveMax;
      if (items.length === 1 && !stepMatch) any = true;
      if (items.length === 1 && stepMatch) singleStep = step;
    } else if (base.includes('-')) {
      const [a, b] = base.split('-');
      if (!a || !b || base.split('-').length !== 2) throw new CronError(def.label, item, '범위는 "시작-끝" 형태여야 합니다');
      start = parseValue(a, def);
      end = parseValue(b, def);
      if (start > end) throw new CronError(def.label, item, '범위의 시작이 끝보다 큽니다');
    } else {
      start = parseValue(base, def);
      end = stepMatch ? effectiveMax : start; // "5/10"은 5부터 max까지 step 10 (vixie cron 규칙)
    }
    for (let v = start; v <= end; v += step) set.add(v);
  }

  if (set.size === 0) throw new CronError(def.label, raw, '매칭되는 값이 없습니다');
  if (any || set.size === effectiveMax - def.min + 1) any = true;
  return { set, any, singleStep, raw };
}

// 전체 표현식 → spec. withSeconds=true면 6필드(초 포함)
export function parseCron(expr, withSeconds = false) {
  let text = expr.trim().replace(/\s+/g, ' ');
  if (!text) throw new CronError(null, expr, 'cron 표현식을 입력하세요');

  const aliasUsed = ALIASES[text.toLowerCase()];
  if (aliasUsed) {
    text = aliasUsed;
    withSeconds = false;
  }

  const parts = text.split(' ');
  const expected = withSeconds ? 6 : 5;
  if (parts.length !== expected) {
    throw new CronError(null, expr,
      `필드가 ${expected}개여야 하는데 ${parts.length}개입니다 (형식: ${withSeconds ? '초 ' : ''}분 시 일 월 요일)`);
  }

  const [secRaw, minRaw, hourRaw, domRaw, monthRaw, dowRaw] = withSeconds
    ? parts
    : ['0', ...parts];

  return {
    second: parseField(secRaw, FIELD_DEFS.second),
    minute: parseField(minRaw, FIELD_DEFS.minute),
    hour: parseField(hourRaw, FIELD_DEFS.hour),
    dom: parseField(domRaw, FIELD_DEFS.dom),
    month: parseField(monthRaw, FIELD_DEFS.month),
    dow: parseField(dowRaw, FIELD_DEFS.dow),
    withSeconds,
    alias: aliasUsed ? text : null,
  };
}

/* ==================== 자연어(한국어) 설명 ==================== */

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

function sortedValues(field) {
  return [...field.set].sort((a, b) => a - b);
}

function isContiguous(values) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) return false;
  }
  return values.length > 1;
}

function listKo(values, suffix = '') {
  return values.map((v) => `${v}${suffix}`).join(', ');
}

function timeOfDayKo(h, m) {
  let hourText;
  if (h === 0) hourText = '자정(0시)';
  else if (h < 12) hourText = `오전 ${h}시`;
  else if (h === 12) hourText = '낮 12시';
  else hourText = `오후 ${h - 12}시`;
  return m === 0 ? hourText : `${hourText} ${m}분`;
}

function dowRangeKo(values) {
  if (values.length === 7) return null;
  if (isContiguous(values)) return `${DOW_KO[values[0]]}~${DOW_KO[values[values.length - 1]]}요일`;
  if (values.length === 1) return `${DOW_KO[values[0]]}요일`;
  return `${values.map((v) => DOW_KO[v]).join('·')}요일`;
}

function timeDescKo(spec) {
  const m = spec.minute;
  const h = spec.hour;
  const mins = sortedValues(m);
  const hours = sortedValues(h);

  if (m.any && h.any) return '매분';
  if (m.singleStep && h.any) return `${m.singleStep}분마다`;
  if (h.singleStep && mins.length === 1) {
    return `${h.singleStep}시간마다 ${mins[0]}분에`;
  }
  if (m.any && hours.length === 1) return `${timeOfDayKo(hours[0], 0)}대에 매분`;
  if (mins.length === 1 && h.any) {
    return mins[0] === 0 ? '매시 정각에' : `매시 ${mins[0]}분에`;
  }
  if (m.singleStep && !h.any && isContiguous(hours)) {
    return `${hours[0]}시부터 ${hours[hours.length - 1]}시까지 ${m.singleStep}분마다`;
  }
  if (mins.length === 1 && hours.length === 1) {
    return `${timeOfDayKo(hours[0], mins[0])}에`;
  }
  if (mins.length === 1 && hours.length <= 6) {
    return `${hours.map((hh) => timeOfDayKo(hh, mins[0])).join(', ')}에`;
  }
  // 일반 폴백
  return `${h.any ? '매시' : listKo(hours, '시')} ${listKo(mins, '분')}에`;
}

function dayDescKo(spec) {
  const domAny = spec.dom.any;
  const dowAny = spec.dow.any;
  const doms = sortedValues(spec.dom);
  const dows = sortedValues(spec.dow);

  if (domAny && dowAny) return '매일';
  if (!dowAny && domAny) return `매주 ${dowRangeKo(dows)}`;
  if (!domAny && dowAny) {
    if (spec.dom.singleStep) return `${spec.dom.singleStep}일마다 (매월 1일 기준)`;
    return `매월 ${listKo(doms)}일`;
  }
  // 둘 다 제한: 표준 cron은 OR로 동작
  return `매월 ${listKo(doms)}일 또는 ${dowRangeKo(dows)}`;
}

function monthDescKo(spec) {
  if (spec.month.any) return '';
  const months = sortedValues(spec.month);
  if (spec.month.singleStep) return `${spec.month.singleStep}개월마다`;
  if (isContiguous(months)) return `${months[0]}월~${months[months.length - 1]}월`;
  return `${listKo(months)}월`;
}

function secondSuffixKo(spec) {
  if (!spec.withSeconds) return '';
  const secs = sortedValues(spec.second);
  if (spec.second.any) return ' (매초)';
  if (spec.second.singleStep) return ` (${spec.second.singleStep}초마다)`;
  if (secs.length === 1 && secs[0] === 0) return '';
  return ` (${listKo(secs)}초)`;
}

export function describeCron(spec) {
  const parts = [monthDescKo(spec), dayDescKo(spec), timeDescKo(spec)].filter(Boolean);
  return `${parts.join(' ')}${secondSuffixKo(spec)} 실행`;
}

/* ==================== 다음 실행 시각 계산 (타임존 지원) ==================== */

const fmtCache = new Map();
function getFormatter(timeZone) {
  if (!fmtCache.has(timeZone)) {
    fmtCache.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }));
  }
  return fmtCache.get(timeZone);
}

function partsAt(ts, timeZone) {
  const parts = {};
  for (const { type, value } of getFormatter(timeZone).formatToParts(ts)) {
    if (type !== 'literal') parts[type] = Number(value);
  }
  return { y: parts.year, mo: parts.month, d: parts.day, h: parts.hour, mi: parts.minute, s: parts.second };
}

function offsetAt(ts, timeZone) {
  const p = partsAt(ts, timeZone);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
}

// 타임존의 벽시계 시각 → UTC 타임스탬프. DST 갭(존재하지 않는 시각)이면 null.
export function wallToInstant(y, mo, d, h, mi, s, timeZone) {
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, s);
  let ts = utcGuess - offsetAt(utcGuess, timeZone);
  ts = utcGuess - offsetAt(ts, timeZone);
  const p = partsAt(ts, timeZone);
  if (p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi && p.s === s) return ts;
  return null;
}

function dayMatches(spec, d, dow) {
  const domRestricted = !spec.dom.any;
  const dowRestricted = !spec.dow.any;
  if (domRestricted && dowRestricted) {
    // 표준 cron: 둘 다 제한이면 OR
    return spec.dom.set.has(d) || spec.dow.set.has(dow);
  }
  if (domRestricted) return spec.dom.set.has(d);
  if (dowRestricted) return spec.dow.set.has(dow);
  return true;
}

const MAX_SCAN_DAYS = 366 * 8; // 무한루프 방지 상한 (약 8년)

export function nextRuns(spec, count, timeZone, fromMs = Date.now()) {
  const results = [];
  const hours = sortedValues(spec.hour);
  const minutes = sortedValues(spec.minute);
  const seconds = spec.withSeconds ? sortedValues(spec.second) : [sortedValues(spec.second)[0] ?? 0];

  // 시작일: 기준 시각의 해당 타임존 날짜
  let { y, mo, d } = partsAt(fromMs, timeZone);

  for (let dayIdx = 0; dayIdx < MAX_SCAN_DAYS && results.length < count; dayIdx++) {
    if (spec.month.set.has(mo)) {
      const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
      if (dayMatches(spec, d, dow)) {
        const dayResults = [];
        for (const h of hours) {
          for (const mi of minutes) {
            for (const s of seconds) {
              const ts = wallToInstant(y, mo, d, h, mi, s, timeZone);
              if (ts !== null && ts > fromMs) dayResults.push(ts);
            }
          }
        }
        dayResults.sort((a, b) => a - b);
        for (const ts of dayResults) {
          results.push(ts);
          if (results.length >= count) break;
        }
      }
    }
    // 다음 날짜로 (달력 연산은 UTC Date로 안전하게)
    const next = new Date(Date.UTC(y, mo - 1, d + 1));
    y = next.getUTCFullYear();
    mo = next.getUTCMonth() + 1;
    d = next.getUTCDate();
  }
  return results;
}

/* ==================== UI ==================== */

const PRESETS = [
  '*/5 * * * *',
  '0 9 * * 1-5',
  '@daily',
  '30 4 1 * *',
  '0 0 * * 0',
  '0 */2 * * *',
];

export function init(container) {
  const tzOptions = TIMEZONES.map((tz) => `<option value="${tz}"${tz === 'Asia/Seoul' ? ' selected' : ''}>${tz}</option>`).join('');
  const presetBtns = PRESETS.map((p) => `<button class="btn btn-sm" data-preset="${p}"><code>${p}</code></button>`).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>Cron 표현식 해석기</h2>
      <p class="tool-desc">표준 5필드 cron(<code>분 시 일 월 요일</code>)을 한국어로 설명하고 다음 실행 시각을 계산합니다.
        <code>*</code>, 범위(<code>1-5</code>), 리스트(<code>1,3,5</code>), 스텝(<code>*/15</code>),
        이름(<code>MON</code>, <code>JAN</code>), 별칭(<code>@daily</code> 등)을 지원합니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="cron-input">Cron 표현식</label>
      <div class="row">
        <input type="text" id="cron-input" class="code grow" spellcheck="false" placeholder="*/15 9-18 * * 1-5" value="0 9 * * 1-5">
        <button class="btn btn-primary" id="cron-run">해석</button>
      </div>
      <div class="row">
        <label class="check-label"><input type="checkbox" id="cron-seconds"> 6필드 (초 포함: <code>초 분 시 일 월 요일</code>)</label>
        <label>타임존 <select id="cron-tz">${tzOptions}</select></label>
      </div>
      <div class="row">예시: ${presetBtns}</div>
      <div id="cron-error"></div>
    </div>
    <div class="card" id="cron-result" hidden>
      <h3>설명</h3>
      <p id="cron-desc" style="font-size:16px;font-weight:600"></p>
      <h3 style="margin-top:16px">다음 실행 시각 5개</h3>
      <div id="cron-next"></div>
    </div>
  `;

  const input = $('#cron-input', container);
  const secondsCheck = $('#cron-seconds', container);
  const tzSelect = $('#cron-tz', container);
  const errorBox = $('#cron-error', container);
  const resultCard = $('#cron-result', container);

  function run() {
    errorBox.innerHTML = '';
    const expr = input.value;
    if (!expr.trim()) { resultCard.hidden = true; return; }

    let spec;
    try {
      spec = parseCron(expr, secondsCheck.checked);
    } catch (err) {
      resultCard.hidden = true;
      errorBox.innerHTML = '<p class="error-text"></p>';
      errorBox.firstChild.textContent = err instanceof CronError ? err.message : String(err);
      return;
    }

    resultCard.hidden = false;
    $('#cron-desc', container).textContent = describeCron(spec);

    const tz = tzSelect.value;
    const runs = nextRuns(spec, 5, tz);
    if (!runs.length) {
      $('#cron-next', container).innerHTML = '<p class="error-text">약 8년 내에 매칭되는 실행 시각이 없습니다 (예: 존재하지 않는 날짜 조합).</p>';
      return;
    }
    const fmt = new Intl.DateTimeFormat('ko-KR', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const rows = runs.map((ts, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="mono">${escapeHtml(fmt.format(new Date(ts)))}</td>
        <td>${escapeHtml(relativeTime(ts))}</td>
      </tr>`).join('');
    $('#cron-next', container).innerHTML = `
      <table class="result-table">
        <thead><tr><th>#</th><th>실행 시각 (${escapeHtml(tz)})</th><th>상대 시간</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  input.addEventListener('input', debounce(run, 300));
  secondsCheck.addEventListener('change', run);
  tzSelect.addEventListener('change', run);
  $('#cron-run', container).addEventListener('click', run);
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    input.value = btn.dataset.preset;
    secondsCheck.checked = false;
    run();
  });

  run();
  bindCopyButtons(container);
}
