// 앱 셸: 라우팅(해시 기반), 사이드바(검색 포함), 테마 토글, 홈 그리드
import { $, $$, escapeHtml } from './utils/dom.js';

const THEME_KEY = 'devtools-hub-theme';

const CATEGORIES = [
  {
    name: '포맷 & 변환',
    tools: [
      { id: 'json', icon: '🧾', name: 'JSON 포매터', desc: 'Pretty / Minify / 검증 + 트리 뷰' },
      { id: 'xml', icon: '📐', name: 'XML 포매터', desc: '들여쓰기 정리 + 유효성 검사' },
      { id: 'yaml', icon: '🔁', name: 'JSON ↔ YAML 변환', desc: '양방향 변환 (자체 구현)' },
      { id: 'sql', icon: '🗃️', name: 'SQL 포매터', desc: '키워드 개행/들여쓰기 정리' },
    ],
  },
  {
    name: '인코딩 & 디코딩',
    tools: [
      { id: 'base64', icon: '🔤', name: 'Base64 인코더/디코더', desc: '텍스트·이미지 ↔ Base64 (UTF-8 안전)' },
      { id: 'url', icon: '🔗', name: 'URL 인코더/디코더', desc: '컴포넌트/전체 URI 모드' },
      { id: 'jwt', icon: '🎫', name: 'JWT 디코더', desc: 'header/payload 디코딩 + HMAC 서명 검증' },
      { id: 'entity', icon: '🏷️', name: 'HTML 엔티티', desc: '&lt; ↔ < 인코딩/디코딩' },
      { id: 'hex', icon: '🔢', name: 'Hex ↔ 텍스트', desc: 'UTF-8 바이트 기준 16진수 변환' },
      { id: 'unicode', icon: '✳️', name: 'Unicode 이스케이프', desc: '\\uXXXX ↔ 문자 변환' },
    ],
  },
  {
    name: '해시 & 생성',
    tools: [
      { id: 'hash', icon: '🔒', name: '해시 생성기', desc: 'SHA-1/256/384/512 동시 출력' },
      { id: 'uuid', icon: '🆔', name: 'UUID 생성기', desc: 'UUID v4, 개수·대소문자 옵션' },
      { id: 'password', icon: '🔑', name: '비밀번호 생성기', desc: '암호학적 난수, 길이·문자셋 옵션' },
      { id: 'hmac', icon: '🛡️', name: 'HMAC 생성기', desc: 'HMAC-SHA256/384/512, hex·Base64' },
      { id: 'md5', icon: '🧮', name: 'MD5 해시', desc: '순수 JS 구현 (체크섬·레거시용)' },
    ],
  },
  {
    name: '시간 & 날짜',
    tools: [
      { id: 'timestamp', icon: '⏱️', name: 'Unix 타임스탬프', desc: '초/밀리초 자동 감지, 타임존·상대시간' },
      { id: 'cron', icon: '⏰', name: 'Cron 표현식 해석기', desc: '자연어 설명 + 다음 실행 시각' },
      { id: 'timezone', icon: '🌍', name: '타임존 변환기', desc: '여러 도시 시각 동시 표시' },
      { id: 'datediff', icon: '📅', name: '날짜 차이 계산기', desc: '두 날짜 사이 일/시/분 + 달력 기준' },
    ],
  },
  {
    name: '텍스트 & 정규식',
    tools: [
      { id: 'regex', icon: '🎯', name: '정규식 테스터', desc: '매치 하이라이트 + 캡처 그룹' },
      { id: 'case', icon: '🔠', name: '케이스 변환기', desc: 'camel/snake/kebab/Pascal 등 동시 변환' },
      { id: 'diff', icon: '🔀', name: '텍스트 Diff 비교', desc: '라인 단위 diff (LCS)' },
      { id: 'textstats', icon: '📊', name: '텍스트 통계', desc: '글자·단어·줄·바이트 수' },
      { id: 'lines', icon: '📑', name: '줄 정렬/중복 제거', desc: 'sort / unique / reverse' },
      { id: 'lorem', icon: '📝', name: 'Lorem Ipsum 생성기', desc: '문단·문장·단어 단위 채움 텍스트' },
    ],
  },
  {
    name: '색상 & 디자인',
    tools: [
      { id: 'color', icon: '🎨', name: '색상 변환기', desc: 'HEX ↔ RGB(A) ↔ HSL(A) + OKLCH' },
      { id: 'contrast', icon: '🌓', name: '대비 검사기 (WCAG)', desc: '대비비율 + AA/AAA 통과 여부' },
      { id: 'gradient', icon: '🌈', name: '그라디언트 생성기', desc: 'CSS gradient 코드 + 프리뷰' },
      { id: 'bezier', icon: '〰️', name: 'Cubic-bezier 에디터', desc: '드래그 곡선 + CSS 타이밍 함수' },
      { id: 'boxshadow', icon: '🔲', name: 'box-shadow 생성기', desc: '다중 레이어 그림자 + 프리뷰' },
    ],
  },
  {
    name: '기타',
    tools: [
      { id: 'radix', icon: '🔟', name: '진법 변환기', desc: '2/8/10/16진수 상호 변환 (BigInt)' },
      { id: 'qrcode', icon: '🔳', name: 'QR 코드 생성기', desc: '텍스트·URL → QR (PNG 다운로드)' },
      { id: 'imageresize', icon: '🖼️', name: '이미지 리사이즈/압축', desc: 'Canvas 기반, JPEG/WebP/PNG' },
    ],
  },
];

const toolIndex = new Map();
for (const cat of CATEGORIES) {
  for (const tool of cat.tools) toolIndex.set(tool.id, { ...tool, category: cat.name });
}

const initialized = new Set();

/* ----- 테마 ----- */
function initTheme() {
  const button = $('#theme-toggle');
  // 라벨은 "지금 누르면 어떤 모드로 바뀌는지"를 안내
  const updateLabel = () => {
    const label = document.documentElement.dataset.theme === 'dark' ? '라이트모드로 전환' : '다크모드로 전환';
    button.setAttribute('aria-label', label);
    button.title = label;
  };
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* 프라이빗 모드 등 */ }
    updateLabel();
  });
  updateLabel();
}

/* ----- 사이드바 (검색 + 카테고리 그룹) ----- */
function renderSidebar() {
  const sidebar = $('#sidebar');
  sidebar.innerHTML = `
    <div class="nav-search">
      <input type="search" id="tool-search" placeholder="도구 검색  ( / )" autocomplete="off" aria-label="도구 검색">
    </div>
    <div id="nav-groups"></div>
    <p class="nav-empty" id="nav-empty" hidden>검색 결과가 없습니다</p>
  `;
  const groupsBox = $('#nav-groups', sidebar);
  for (const cat of CATEGORIES) {
    const group = document.createElement('div');
    group.className = 'nav-group';
    group.innerHTML = `<div class="nav-category">${escapeHtml(cat.name)}</div>`;
    for (const tool of cat.tools) {
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = `#${tool.id}`;
      link.dataset.tool = tool.id;
      link.dataset.search = `${tool.name} ${tool.desc} ${tool.id}`.toLowerCase();
      link.innerHTML = `<span class="nav-icon" aria-hidden="true">${tool.icon}</span><span class="nav-name"></span>`;
      link.querySelector('.nav-name').textContent = tool.name;
      group.appendChild(link);
    }
    groupsBox.appendChild(group);
  }

  // 검색 필터
  const search = $('#tool-search', sidebar);
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let any = false;
    for (const group of $$('.nav-group', sidebar)) {
      let visible = 0;
      for (const link of $$('.nav-link', group)) {
        const match = !q || link.dataset.search.includes(q);
        link.hidden = !match;
        if (match) visible++;
      }
      group.hidden = visible === 0;
      if (visible) any = true;
    }
    $('#nav-empty', sidebar).hidden = any;
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      search.value = '';
      search.dispatchEvent(new Event('input'));
      search.blur();
    }
    if (e.key === 'Enter') {
      const first = sidebar.querySelector('.nav-link:not([hidden])');
      if (first) { location.hash = `#${first.dataset.tool}`; search.blur(); }
    }
  });

  // "/" 또는 Ctrl/Cmd+K로 검색 포커스
  document.addEventListener('keydown', (e) => {
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
    if ((e.key === '/' && !editing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      $('#sidebar').classList.add('open'); // 모바일에서도 열리게
      $('#sidebar-backdrop').hidden = false;
      search.focus();
      search.select();
    }
  });
}

function initMobileNav() {
  const sidebar = $('#sidebar');
  const backdrop = $('#sidebar-backdrop');
  const toggle = $('#nav-toggle');
  const setOpen = (open) => {
    sidebar.classList.toggle('open', open);
    backdrop.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
}

/* ----- 홈 그리드 ----- */
function renderHome() {
  const grid = $('#home-grid');
  const frag = document.createDocumentFragment();
  for (const [id, tool] of toolIndex) {
    const card = document.createElement('a');
    card.className = 'home-card';
    card.href = `#${id}`;
    card.innerHTML = `
      <div class="card-head">
        <span class="card-icon" aria-hidden="true">${tool.icon}</span>
        <span class="card-title"></span>
      </div>
      <div class="card-desc"></div>
      <div class="card-cat"></div>`;
    card.querySelector('.card-title').textContent = tool.name;
    card.querySelector('.card-desc').textContent = tool.desc;
    card.querySelector('.card-cat').textContent = tool.category;
    frag.appendChild(card);
  }
  grid.appendChild(frag);
}

/* ----- 라우팅 ----- */
async function route() {
  const id = location.hash.slice(1) || 'home';
  const isTool = toolIndex.has(id);
  const viewId = isTool ? `view-${id}` : 'view-home';

  // 도구 섹션이 없으면 생성 + 모듈 지연 로드
  if (isTool && !initialized.has(id)) {
    initialized.add(id);
    const section = document.createElement('section');
    section.id = `view-${id}`;
    section.className = 'view';
    section.hidden = true;
    $('#main').appendChild(section);
    try {
      const mod = await import(`./tools/${id}.js`);
      mod.init(section);
    } catch (err) {
      section.innerHTML = `<p class="error-text">도구를 불러오지 못했습니다: ${escapeHtml(String(err))}</p>`;
      console.error(err);
    }
  }

  for (const view of $$('.view')) view.hidden = view.id !== viewId;
  for (const link of $$('.nav-link')) link.classList.toggle('active', link.dataset.tool === id);
  const tool = toolIndex.get(id);
  document.title = tool ? `${tool.name} — DevTools Hub` : 'DevTools Hub — 개발자 유틸리티 모음';
  $('#main').scrollTop = 0;
  window.scrollTo(0, 0);
}

initTheme();
renderSidebar();
initMobileNav();
renderHome();
window.addEventListener('hashchange', route);
route();
