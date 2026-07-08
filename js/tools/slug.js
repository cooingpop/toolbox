// Slug 생성기: 제목 → URL slug. 한글은 국립국어원 로마자 표기법(개정) 기준으로 음절 단위 변환
import { $, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

// 개정 로마자 표기법 (음운 변동 미적용 — slug 용도로는 음절 단위 전자법이 예측 가능해서 낫다)
const CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const JONG = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];

export function romanizeHangul(text) {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const idx = code - 0xac00;
      out += CHO[Math.floor(idx / 588)] + JUNG[Math.floor((idx % 588) / 28)] + JONG[idx % 28];
    } else {
      out += ch;
    }
  }
  return out;
}

export function slugify(text, { separator = '-', hangul = 'romanize' } = {}) {
  let s = text;
  if (hangul === 'romanize') s = romanizeHangul(s);
  // 발음 구별 기호 제거 (é → e)
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s.toLowerCase();
  // 영숫자 외 → 구분자
  s = s.replace(/[^a-z0-9]+/g, separator);
  // 구분자 정리
  const sepEsc = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  s = s.replace(new RegExp(`${sepEsc}{2,}`, 'g'), separator)
    .replace(new RegExp(`^${sepEsc}+|${sepEsc}+$`, 'g'), '');
  return s;
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>Slug 생성기</h2>
      <p class="tool-desc">제목을 URL에 쓸 수 있는 slug로 변환합니다. 한글은 로마자(개정 표기법 기준)로 바꾸거나 제거할 수 있습니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="slug-input">제목</label>
      <textarea id="slug-input" class="code" rows="3" spellcheck="false" placeholder="개발자 도구 모음 사이트를 만들었습니다!"></textarea>
      <div class="row" style="margin-top:10px">
        <label>구분자
          <select id="slug-sep">
            <option value="-" selected>하이픈 (-)</option>
            <option value="_">언더스코어 (_)</option>
          </select>
        </label>
        <label>한글 처리
          <select id="slug-hangul">
            <option value="romanize" selected>로마자 변환</option>
            <option value="remove">제거</option>
          </select>
        </label>
      </div>
    </div>
    <div class="card">
      <div class="output-row">
        <span class="output-label">Slug</span>
        <div class="output-box" id="slug-output"></div>
        <button class="btn btn-sm" data-copy-target="#slug-output">복사</button>
      </div>
      <p class="hint" id="slug-len"></p>
    </div>
  `;

  const input = $('#slug-input', container);

  function run() {
    const slug = slugify(input.value, {
      separator: $('#slug-sep', container).value,
      hangul: $('#slug-hangul', container).value,
    });
    $('#slug-output', container).textContent = slug;
    $('#slug-len', container).textContent = slug ? `${slug.length}자` : '';
  }

  input.addEventListener('input', debounce(run, 150));
  $('#slug-sep', container).addEventListener('change', run);
  $('#slug-hangul', container).addEventListener('change', run);

  bindCopyButtons(container);
}
