// 앱 셸: 라우팅(해시 기반), 사이드바, 상단바 검색, 테마/언어 토글,
//        즐겨찾기·최근 사용, URL 입력 공유, PWA 등록
import { $, $$, escapeHtml } from './utils/dom.js';
import { copyText } from './utils/clipboard.js';
import { bindCharCounters } from './utils/counter.js';
import { CATEGORIES, SHAREABLE } from './registry.js';

const THEME_KEY = 'devtools-hub-theme';
const LANG_KEY = 'devtools-hub-lang';
const FAVS_KEY = 'devtools-hub-favs';
const RECENT_KEY = 'devtools-hub-recent';

const toolIndex = new Map();
for (const cat of CATEGORIES) {
  for (const tool of cat.tools) toolIndex.set(tool.id, { ...tool, category: cat.name, categoryEn: cat.en });
}

const initialized = new Set();
let lang = 'ko';
try { lang = localStorage.getItem(LANG_KEY) || 'ko'; } catch { /* */ }

const tName = (t) => (lang === 'en' ? t.nameEn : t.name);
const tDesc = (t) => (lang === 'en' ? t.descEn : t.desc);
const tCat = (t) => (lang === 'en' ? t.categoryEn : t.category);

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* */ }
  },
};

/* ----- 테마 ----- */
function initTheme() {
  const button = $('#theme-toggle');
  const updateLabel = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    const label = lang === 'en'
      ? (dark ? 'Switch to light mode' : 'Switch to dark mode')
      : (dark ? '라이트모드로 전환' : '다크모드로 전환');
    button.setAttribute('aria-label', label);
    button.title = label;
  };
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* */ }
    updateLabel();
  });
  updateLabel();
  return updateLabel;
}

/* ----- 언어 토글 (셸 수준: 사이드바·홈·검색. 도구 내부 UI는 한국어) ----- */
const I18N = {
  ko: {
    searchPlaceholder: '도구 검색  ( / )',
    homeTitle: 'DevTools Hub — 무료 온라인 개발자 도구 모음',
    homeDesc: '개발자·디자이너·프론트엔드가 매일 쓰는 유틸리티 모음. 모든 처리는 브라우저 안에서만 이루어지며 어떤 데이터도 서버로 전송되지 않습니다. 설치·회원가입 없이 무료로 사용하세요.',
    favorites: '⭐ 즐겨찾기',
    recent: '🕘 최근 사용',
    docTitle: 'DevTools Hub — 무료 온라인 개발자 도구 모음 | JSON 포매터, JWT 디코더, Cron 해석기',
    share: '🔗 입력 공유 링크',
    shared: '공유 링크가 복사되었습니다',
    langButton: 'EN',
    langLabel: 'Switch to English',
  },
  en: {
    searchPlaceholder: 'Search tools  ( / )',
    homeTitle: 'DevTools Hub — Free Online Developer Utilities',
    homeDesc: 'Everyday utilities for developers and designers. Everything runs 100% in your browser — no data ever leaves your device. Free, no signup, no install. (Tool UIs are in Korean for now.)',
    favorites: '⭐ Favorites',
    recent: '🕘 Recent',
    docTitle: 'DevTools Hub — Free Online Developer Utilities',
    share: '🔗 Share input link',
    shared: 'Share link copied',
    langButton: '한',
    langLabel: '한국어로 전환',
  },
};
const t = (key) => I18N[lang][key];

function applyLanguage() {
  // 사이드바
  for (const group of $$('.nav-group')) {
    const catName = group.dataset.category;
    const cat = CATEGORIES.find((c) => c.name === catName);
    if (cat) group.querySelector('.nav-category').textContent = lang === 'en' ? cat.en : cat.name;
  }
  for (const link of $$('.nav-link')) {
    const tool = toolIndex.get(link.dataset.tool);
    if (tool) link.querySelector('.nav-name').textContent = tName(tool);
  }
  // 홈 (정적 카드 텍스트 교체)
  $('#view-home h1').textContent = t('homeTitle');
  $('#view-home .tool-header .tool-desc').textContent = t('homeDesc');
  for (const card of $$('#home-grid .home-card')) {
    const tool = toolIndex.get(card.getAttribute('href').slice(1));
    if (!tool) continue;
    card.querySelector('.card-title').textContent = tName(tool);
    card.querySelector('.card-desc').textContent = tDesc(tool);
    card.querySelector('.card-cat').textContent = tCat(tool);
  }
  // 소개 푸터: 언어에 맞는 문단만 표시
  const aboutTitle = $('#about-title');
  if (aboutTitle) aboutTitle.textContent = lang === 'en' ? 'About DevTools Hub' : 'DevTools Hub 소개';
  for (const p of $$('.home-about [data-lang]')) p.hidden = p.dataset.lang !== lang;
  // 검색
  $('#tool-search').placeholder = t('searchPlaceholder');
  // 언어 버튼
  const langBtn = $('#lang-toggle');
  langBtn.textContent = t('langButton');
  langBtn.title = t('langLabel');
  langBtn.setAttribute('aria-label', t('langLabel'));
  document.documentElement.lang = lang;
  renderQuickSection();
}

function initLang(updateThemeLabel) {
  $('#lang-toggle').addEventListener('click', () => {
    lang = lang === 'ko' ? 'en' : 'ko';
    store.set(LANG_KEY, lang);
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* */ }
    applyLanguage();
    updateThemeLabel();
    updateTitle();
  });
}

/* ----- 사이드바 ----- */
function renderSidebar() {
  const sidebar = $('#sidebar');
  const frag = document.createDocumentFragment();
  for (const cat of CATEGORIES) {
    const group = document.createElement('div');
    group.className = 'nav-group';
    group.dataset.category = cat.name;
    group.innerHTML = '<div class="nav-category"></div>';
    group.querySelector('.nav-category').textContent = cat.name;
    for (const tool of cat.tools) {
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = `#${tool.id}`;
      link.dataset.tool = tool.id;
      link.innerHTML = `<span class="nav-icon" aria-hidden="true">${tool.icon}</span><span class="nav-name"></span>`;
      link.querySelector('.nav-name').textContent = tool.name;
      group.appendChild(link);
    }
    frag.appendChild(group);
  }
  sidebar.appendChild(frag);
}

/* ----- 상단바 도구 검색 (드롭다운 결과) ----- */
function initSearch() {
  const input = $('#tool-search');
  const panel = $('#search-results');
  const allTools = [...toolIndex.values()];
  let items = [];
  let active = -1;

  const close = () => {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    items = [];
    active = -1;
  };
  const highlight = () => {
    panel.querySelectorAll('.search-item').forEach((el, i) => el.classList.toggle('active', i === active));
  };
  const render = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { close(); return; }
    items = allTools.filter((tool) =>
      `${tool.name} ${tool.desc} ${tool.nameEn} ${tool.descEn} ${tool.id} ${tool.category} ${tool.categoryEn}`.toLowerCase().includes(q)).slice(0, 8);
    if (!items.length) {
      panel.innerHTML = `<div class="search-empty">${lang === 'en' ? 'No results' : '검색 결과가 없습니다'}</div>`;
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      active = -1;
      return;
    }
    panel.innerHTML = items.map((tool, i) => `
      <a href="#${tool.id}" class="search-item" role="option" data-index="${i}">
        <span class="nav-icon" aria-hidden="true">${tool.icon}</span>
        <span class="si-body"><span class="si-name"></span><span class="si-cat"></span></span>
      </a>`).join('');
    panel.querySelectorAll('.search-item').forEach((el, i) => {
      el.querySelector('.si-name').textContent = tName(items[i]);
      el.querySelector('.si-cat').textContent = tCat(items[i]);
    });
    active = 0;
    highlight();
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const go = (index) => {
    if (index < 0 || !items[index]) return;
    location.hash = `#${items[index].id}`;
    input.value = '';
    close();
    input.blur();
  };

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; close(); input.blur(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      highlight();
    } else if (e.key === 'Enter') { e.preventDefault(); go(active); }
  });
  panel.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.search-item');
    if (!item) return;
    e.preventDefault();
    go(Number(item.dataset.index));
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
  document.addEventListener('keydown', (e) => {
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
    if ((e.key === '/' && !editing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      input.focus();
      input.select();
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

/* ----- 즐겨찾기 + 최근 사용 ----- */
function getFavs() { return store.get(FAVS_KEY, []).filter((id) => toolIndex.has(id)); }

function toggleFav(id) {
  const favs = getFavs();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
  store.set(FAVS_KEY, favs);
  updateStars();
  renderQuickSection();
}

function trackRecent(id) {
  const recent = store.get(RECENT_KEY, []).filter((r) => r !== id && toolIndex.has(r));
  recent.unshift(id);
  store.set(RECENT_KEY, recent.slice(0, 6));
  renderQuickSection();
}

function updateStars() {
  const favs = new Set(getFavs());
  for (const btn of $$('#home-grid .fav-star')) {
    const id = btn.dataset.fav;
    btn.classList.toggle('on', favs.has(id));
    btn.textContent = favs.has(id) ? '★' : '☆';
    btn.title = favs.has(id) ? (lang === 'en' ? 'Remove from favorites' : '즐겨찾기 해제') : (lang === 'en' ? 'Add to favorites' : '즐겨찾기 추가');
  }
}

function chipHtml(id) {
  const tool = toolIndex.get(id);
  return `<a class="quick-chip" href="#${id}"><span aria-hidden="true">${tool.icon}</span><span class="qc-name"></span></a>`;
}

function renderQuickSection() {
  const box = $('#home-quick');
  if (!box) return;
  const favs = getFavs();
  const recent = store.get(RECENT_KEY, []).filter((id) => toolIndex.has(id));
  if (!favs.length && !recent.length) { box.innerHTML = ''; return; }
  let html = '';
  if (favs.length) html += `<div class="quick-row"><span class="quick-label">${t('favorites')}</span>${favs.map(chipHtml).join('')}</div>`;
  if (recent.length) html += `<div class="quick-row"><span class="quick-label">${t('recent')}</span>${recent.map(chipHtml).join('')}</div>`;
  box.innerHTML = html;
  // 이름은 textContent로 안전하게
  const ids = [...favs, ...recent];
  box.querySelectorAll('.qc-name').forEach((el, i) => { el.textContent = tName(toolIndex.get(ids[i])); });
}

function initFavorites() {
  // 정적 홈 카드에 별 버튼 주입
  for (const card of $$('#home-grid .home-card')) {
    const id = card.getAttribute('href').slice(1);
    if (!toolIndex.has(id)) continue;
    const star = document.createElement('button');
    star.className = 'fav-star';
    star.dataset.fav = id;
    star.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFav(id);
    });
    card.appendChild(star);
  }
  updateStars();
  renderQuickSection();
}

/* ----- URL 입력 공유 ----- */
function encodeShare(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeShare(b64url) {
  let b64 = b64url.replaceAll('-', '+').replaceAll('_', '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function injectShareButton(id, section) {
  if (!SHAREABLE[id]) return;
  const header = section.querySelector('.tool-header');
  if (!header || header.querySelector('.share-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm share-btn';
  btn.textContent = t('share');
  btn.addEventListener('click', () => {
    const input = section.querySelector(SHAREABLE[id]);
    const value = input ? input.value : '';
    const url = `${location.origin}${location.pathname}#${id}${value ? `?i=${encodeShare(value)}` : ''}`;
    if (url.length > 8000) {
      copyText('', btn);
      return;
    }
    copyText(url, btn);
  });
  header.appendChild(btn);
}

function applySharedInput(id, section, payload) {
  if (!payload || !SHAREABLE[id]) return;
  try {
    const params = new URLSearchParams(payload);
    const encoded = params.get('i');
    if (!encoded) return;
    const input = section.querySelector(SHAREABLE[id]);
    if (!input) return;
    input.value = decodeShare(encoded);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } catch { /* 잘못된 공유 페이로드는 무시 */ }
}

/* ----- 라우팅 ----- */
function parseHash() {
  const raw = location.hash.slice(1);
  const qIdx = raw.indexOf('?');
  return qIdx < 0 ? { id: raw || 'home', payload: '' } : { id: raw.slice(0, qIdx), payload: raw.slice(qIdx + 1) };
}

function updateTitle() {
  const { id } = parseHash();
  const tool = toolIndex.get(id);
  document.title = tool ? `${tName(tool)} — DevTools Hub` : t('docTitle');
}

async function route() {
  const { id, payload } = parseHash();
  const isTool = toolIndex.has(id);
  const viewId = isTool ? `view-${id}` : 'view-home';

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
      injectShareButton(id, section);
      bindCharCounters(section);
    } catch (err) {
      section.innerHTML = `<p class="error-text">도구를 불러오지 못했습니다: ${escapeHtml(String(err))}</p>`;
      console.error(err);
    }
  }
  if (isTool && payload) {
    applySharedInput(id, $(`#view-${id}`), payload);
  }
  if (isTool) trackRecent(id);

  for (const view of $$('.view')) view.hidden = view.id !== viewId;
  for (const link of $$('.nav-link')) link.classList.toggle('active', link.dataset.tool === id);
  updateTitle();
  window.scrollTo(0, 0);
}

/* ----- PWA ----- */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) return;
  navigator.serviceWorker.register('./sw.js').catch(() => { /* 등록 실패해도 사이트는 정상 동작 */ });
}

const updateThemeLabel = initTheme();
renderSidebar();
initSearch();
initMobileNav();
initFavorites();
initLang(updateThemeLabel);
applyLanguage();
window.addEventListener('hashchange', route);
route();
registerServiceWorker();
