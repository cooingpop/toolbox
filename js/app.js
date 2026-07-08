// 앱 셸: 라우팅(해시 기반), 사이드바, 테마 토글, 홈 그리드
import { $, $$ } from './utils/dom.js';

const THEME_KEY = 'devtools-hub-theme';

const CATEGORIES = [
  {
    name: '포맷 & 변환',
    tools: [
      { id: 'json', name: 'JSON 포매터', desc: 'Pretty / Minify / 검증 + 오류 위치 표시' },
    ],
  },
  {
    name: '인코딩 & 디코딩',
    tools: [
      { id: 'base64', name: 'Base64 인코더/디코더', desc: '텍스트·이미지 ↔ Base64 (UTF-8 안전)' },
      { id: 'url', name: 'URL 인코더/디코더', desc: '컴포넌트/전체 URI 모드' },
      { id: 'jwt', name: 'JWT 디코더', desc: 'header/payload 디코딩 + HMAC 서명 검증' },
    ],
  },
  {
    name: '해시 & 생성',
    tools: [
      { id: 'hash', name: '해시 생성기', desc: 'SHA-1/256/384/512 동시 출력' },
      { id: 'uuid', name: 'UUID 생성기', desc: 'UUID v4, 개수·대소문자 옵션' },
    ],
  },
  {
    name: '시간 & 날짜',
    tools: [
      { id: 'timestamp', name: 'Unix 타임스탬프', desc: '초/밀리초 자동 감지, 타임존·상대시간' },
      { id: 'cron', name: 'Cron 표현식 해석기', desc: '자연어 설명 + 다음 실행 시각' },
    ],
  },
  {
    name: '텍스트 & 정규식',
    tools: [
      { id: 'regex', name: '정규식 테스터', desc: '매치 하이라이트 + 캡처 그룹' },
      { id: 'case', name: '케이스 변환기', desc: 'camel/snake/kebab/Pascal 등 동시 변환' },
    ],
  },
  {
    name: '색상 & 디자인',
    tools: [
      { id: 'color', name: '색상 변환기', desc: 'HEX ↔ RGB(A) ↔ HSL(A) 실시간 변환' },
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
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* 프라이빗 모드 등 */ }
  });
}

/* ----- 사이드바 ----- */
function renderSidebar() {
  const sidebar = $('#sidebar');
  const frag = document.createDocumentFragment();
  for (const cat of CATEGORIES) {
    const heading = document.createElement('div');
    heading.className = 'nav-category';
    heading.textContent = cat.name;
    frag.appendChild(heading);
    for (const tool of cat.tools) {
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = `#${tool.id}`;
      link.textContent = tool.name;
      link.dataset.tool = tool.id;
      frag.appendChild(link);
    }
  }
  sidebar.appendChild(frag);
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
    card.innerHTML = `<div class="card-title"></div><div class="card-cat"></div>`;
    card.querySelector('.card-title').textContent = tool.name;
    card.querySelector('.card-cat').textContent = `${tool.category} · ${tool.desc}`;
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
      section.innerHTML = `<p class="error-text">도구를 불러오지 못했습니다: ${String(err)}</p>`;
      console.error(err);
    }
  }

  for (const view of $$('.view')) view.hidden = view.id !== viewId;
  for (const link of $$('.nav-link')) link.classList.toggle('active', link.dataset.tool === id);
  const tool = toolIndex.get(id);
  document.title = tool ? `${tool.name} — DevTools Hub` : 'DevTools Hub — 개발자 유틸리티 모음';
}

initTheme();
renderSidebar();
initMobileNav();
renderHome();
window.addEventListener('hashchange', route);
route();
