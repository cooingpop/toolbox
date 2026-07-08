// Chmod 계산기: 체크박스 ↔ 8진수 ↔ 심볼릭(rwxr-xr-x) 상호 변환 (특수 비트 포함)
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

// perms: 12비트 정수 (특수 setuid/setgid/sticky 3비트 + rwx 9비트)
export function toSymbolic(perms) {
  const setuid = perms & 0o4000;
  const setgid = perms & 0o2000;
  const sticky = perms & 0o1000;
  const bits = [];
  for (let shift = 8; shift >= 0; shift--) bits.push((perms >> shift) & 1);
  const chars = [];
  for (let g = 0; g < 3; g++) {
    chars.push(bits[g * 3] ? 'r' : '-');
    chars.push(bits[g * 3 + 1] ? 'w' : '-');
    let x = bits[g * 3 + 2] ? 'x' : '-';
    if (g === 0 && setuid) x = bits[2] ? 's' : 'S';
    if (g === 1 && setgid) x = bits[5] ? 's' : 'S';
    if (g === 2 && sticky) x = bits[8] ? 't' : 'T';
    chars.push(x);
  }
  return chars.join('');
}

export function toOctal(perms) {
  return ((perms >> 9) ? String(perms >> 9) : '') + ((perms >> 6) & 7) + '' + ((perms >> 3) & 7) + '' + (perms & 7);
}

export function parseOctal(text) {
  const t = text.trim();
  if (!/^[0-7]{3,4}$/.test(t)) return null;
  return parseInt(t, 8);
}

const WHO = [
  { key: 'u', label: '소유자 (owner)' },
  { key: 'g', label: '그룹 (group)' },
  { key: 'o', label: '기타 (others)' },
];
const PERMS = [
  { key: 'r', label: '읽기 (4)' },
  { key: 'w', label: '쓰기 (2)' },
  { key: 'x', label: '실행 (1)' },
];
const SPECIAL = [
  { key: 'setuid', label: 'setuid (4)', bit: 0o4000 },
  { key: 'setgid', label: 'setgid (2)', bit: 0o2000 },
  { key: 'sticky', label: 'sticky (1)', bit: 0o1000 },
];

const PRESETS = [['644', '파일 기본'], ['755', '실행 파일/디렉터리'], ['600', '비밀 파일'], ['700', '개인 디렉터리'], ['664', '그룹 쓰기 파일'], ['775', '그룹 쓰기 디렉터리']];

export function init(container) {
  const grid = WHO.map((who, wi) => `
    <tr>
      <th>${who.label}</th>
      ${PERMS.map((perm, pi) => `<td style="text-align:center">
        <input type="checkbox" data-bit="${8 - (wi * 3 + pi)}" aria-label="${who.label} ${perm.label}">
      </td>`).join('')}
    </tr>`).join('');

  container.innerHTML = `
    <div class="tool-header">
      <h2>Chmod 계산기</h2>
      <p class="tool-desc">유닉스 파일 권한을 8진수(<code>755</code>) ↔ 심볼릭(<code>rwxr-xr-x</code>)으로 상호 변환합니다.</p>
    </div>
    <div class="card">
      <div class="row">
        <label>8진수 <input type="text" id="ch-octal" class="code" style="width:110px" maxlength="4" value="755" inputmode="numeric"></label>
        <span class="grow"></span>
        ${PRESETS.map(([v, label]) => `<button class="btn btn-sm" data-preset="${v}" title="${label}"><code>${v}</code></button>`).join('')}
      </div>
      <div id="ch-error"></div>
      <table class="result-table" style="max-width:420px">
        <thead><tr><th></th>${PERMS.map((p) => `<th style="text-align:center">${p.label}</th>`).join('')}</tr></thead>
        <tbody>${grid}</tbody>
      </table>
      <div class="row" style="margin-top:10px">
        ${SPECIAL.map((s) => `<label class="check-label"><input type="checkbox" data-special="${s.bit}"> ${s.label}</label>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="output-row"><span class="output-label">심볼릭</span><div class="output-box" id="ch-symbolic"></div><button class="btn btn-sm" data-copy-target="#ch-symbolic">복사</button></div>
      <div class="output-row"><span class="output-label">명령</span><div class="output-box" id="ch-cmd"></div><button class="btn btn-sm" data-copy-target="#ch-cmd">복사</button></div>
    </div>
  `;

  const octalInput = $('#ch-octal', container);
  const errorBox = $('#ch-error', container);
  let perms = 0o755;

  function renderFromPerms() {
    for (const box of container.querySelectorAll('[data-bit]')) {
      box.checked = Boolean((perms >> Number(box.dataset.bit)) & 1);
    }
    for (const box of container.querySelectorAll('[data-special]')) {
      box.checked = Boolean(perms & Number(box.dataset.special));
    }
    const octal = toOctal(perms);
    octalInput.value = octal;
    $('#ch-symbolic', container).textContent = toSymbolic(perms);
    $('#ch-cmd', container).textContent = `chmod ${octal} filename`;
  }

  function readChecks() {
    perms = 0;
    for (const box of container.querySelectorAll('[data-bit]')) {
      if (box.checked) perms |= 1 << Number(box.dataset.bit);
    }
    for (const box of container.querySelectorAll('[data-special]')) {
      if (box.checked) perms |= Number(box.dataset.special);
    }
    renderFromPerms();
  }

  for (const box of container.querySelectorAll('[data-bit], [data-special]')) {
    box.addEventListener('change', () => { errorBox.innerHTML = ''; readChecks(); });
  }
  octalInput.addEventListener('input', () => {
    errorBox.innerHTML = '';
    const parsed = parseOctal(octalInput.value);
    if (parsed === null) {
      errorBox.innerHTML = '<p class="error-text">0~7 숫자 3~4자리를 입력하세요 (예: 755, 4755).</p>';
      return;
    }
    perms = parsed;
    // 입력 중 커서 유지 위해 octal 값은 다시 쓰지 않고 나머지만 갱신
    for (const box of container.querySelectorAll('[data-bit]')) {
      box.checked = Boolean((perms >> Number(box.dataset.bit)) & 1);
    }
    for (const box of container.querySelectorAll('[data-special]')) {
      box.checked = Boolean(perms & Number(box.dataset.special));
    }
    $('#ch-symbolic', container).textContent = toSymbolic(perms);
    $('#ch-cmd', container).textContent = `chmod ${toOctal(perms)} filename`;
  });
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    perms = parseOctal(btn.dataset.preset);
    errorBox.innerHTML = '';
    renderFromPerms();
  });

  renderFromPerms();
  bindCopyButtons(container);
}
