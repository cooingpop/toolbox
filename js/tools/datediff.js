// 날짜 차이 계산기: 두 날짜 사이 총 일/시/분 + 달력 기준(년/개월/일) 분해
import { $ } from '../utils/dom.js';

// 월 더하기 (말일 클램프: 1/31 + 1개월 = 2/28·29)
function addMonths(date, n) {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + n, 1, date.getHours(), date.getMinutes());
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTarget));
  return target;
}

// 달력 기준 분해: from ≤ to 전제.
// "from에 통째 개월 수를 더한 앵커"를 넘지 않게 잡고 나머지를 일/시/분으로 계산 —
// 필드별 자리내림 방식은 1/31 → 3/1 같은 케이스에서 음수가 나와 이 방식을 쓴다.
export function calendarDiff(from, to) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  let anchor = addMonths(from, months);
  if (anchor > to) {
    months--;
    anchor = addMonths(from, months);
  }
  let ms = to - anchor;
  const days = Math.floor(ms / 86400000);
  ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000);
  return { years: Math.floor(months / 12), months: months % 12, days, hours, minutes };
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>날짜 차이 계산기</h2>
      <p class="tool-desc">두 날짜·시각 사이의 차이를 총 일/시/분과 달력 기준(년·개월·일)으로 계산합니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <div>
          <label class="field-label" for="dd-from">시작</label>
          <input type="datetime-local" id="dd-from" style="width:auto">
        </div>
        <div>
          <label class="field-label" for="dd-to">끝</label>
          <input type="datetime-local" id="dd-to" style="width:auto">
        </div>
        <button class="btn" id="dd-today" style="align-self:flex-end">끝 = 지금</button>
      </div>
      <div id="dd-error"></div>
    </div>
    <div class="card" id="dd-result" hidden>
      <h3>결과</h3>
      <table class="result-table"><tbody id="dd-body"></tbody></table>
    </div>
  `;

  const fromInput = $('#dd-from', container);
  const toInput = $('#dd-to', container);
  const errorBox = $('#dd-error', container);
  const resultCard = $('#dd-result', container);

  function run() {
    errorBox.innerHTML = '';
    if (!fromInput.value || !toInput.value) { resultCard.hidden = true; return; }
    const from = new Date(fromInput.value);
    const to = new Date(toInput.value);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) { resultCard.hidden = true; return; }

    const [a, b] = from <= to ? [from, to] : [to, from];
    const reversed = from > to;
    const ms = b - a;
    const totalMinutes = Math.floor(ms / 60000);
    const totalHours = Math.floor(ms / 3600000);
    const totalDays = Math.floor(ms / 86400000);
    const cal = calendarDiff(a, b);
    const fmt = (n) => n.toLocaleString('ko-KR');

    // 날짜만 세는 D-day (시각 무시)
    const dayA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const dayB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    const dDays = Math.round((dayB - dayA) / 86400000);

    const calParts = [];
    if (cal.years) calParts.push(`${cal.years}년`);
    if (cal.months) calParts.push(`${cal.months}개월`);
    if (cal.days) calParts.push(`${cal.days}일`);
    if (cal.hours) calParts.push(`${cal.hours}시간`);
    if (cal.minutes) calParts.push(`${cal.minutes}분`);

    resultCard.hidden = false;
    $('#dd-body', container).innerHTML = `
      ${reversed ? '<tr><th colspan="2">⚠️ 시작이 끝보다 늦어 두 값을 바꿔 계산했습니다.</th></tr>' : ''}
      <tr><th>달력 기준</th><td>${calParts.length ? calParts.join(' ') : '같은 시각'}</td></tr>
      <tr><th>날짜 차이 (D-day)</th><td class="mono">${fmt(dDays)}일</td></tr>
      <tr><th>총 일수</th><td class="mono">${fmt(totalDays)}일</td></tr>
      <tr><th>총 시간</th><td class="mono">${fmt(totalHours)}시간</td></tr>
      <tr><th>총 분</th><td class="mono">${fmt(totalMinutes)}분</td></tr>`;
  }

  fromInput.addEventListener('input', run);
  toInput.addEventListener('input', run);
  $('#dd-today', container).addEventListener('click', () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    toInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    run();
  });
}
