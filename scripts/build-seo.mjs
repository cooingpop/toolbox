// 레지스트리(js/registry.js)를 원본으로 SEO 산출물을 재생성한다.
//   - index.html의 정적 홈 그리드 (JS 미실행 크롤러용)
//   - index.html의 JSON-LD 구조화 데이터
//   - llms.txt (AI 에이전트용 요약)
// 사용법: node scripts/build-seo.mjs   (도구를 추가/수정한 뒤 실행하고 함께 커밋)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../js/registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://cooingpop.github.io/toolbox/';
const SITE_DESC = 'JSON 포매터, JWT 디코더, Cron 표현식 해석, 정규식 테스터 등 개발자 유틸리티를 브라우저에서 바로 사용하는 무료 온라인 도구 모음. 모든 처리는 브라우저 안에서만 이루어지며 데이터가 서버로 전송되지 않습니다.';

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const tools = CATEGORIES.flatMap((cat) => cat.tools.map((tool) => ({ ...tool, cat: cat.name })));

/* ---- 1. 정적 홈 그리드 ---- */
const grid = tools.map((tool) => `        <a class="home-card" href="#${tool.id}">
          <div class="card-head"><span class="card-icon" aria-hidden="true">${tool.icon}</span><span class="card-title">${esc(tool.name)}</span></div>
          <div class="card-desc">${esc(tool.desc)}</div>
          <div class="card-cat">${esc(tool.cat)}</div>
        </a>`).join('\n');

/* ---- 2. JSON-LD ---- */
const jsonld = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${BASE}#app`,
      name: 'DevTools Hub',
      url: BASE,
      description: SITE_DESC,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      inLanguage: 'ko',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: tools.map((tool) => `${tool.name} — ${tool.desc}`),
      image: `${BASE}assets/og-image.png`,
    },
    {
      '@type': 'ItemList',
      name: 'DevTools Hub 도구 목록',
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, i) => ({
        '@type': 'ListItem', position: i + 1, name: tool.name, url: `${BASE}#${tool.id}`,
      })),
    },
  ],
});

/* ---- 3. index.html 갱신 ---- */
const indexPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const gridBlock = `<div id="home-grid" class="home-grid">\n${grid}\n        </div>`;
const gridRe = /<div id="home-grid" class="home-grid">[\s\S]*?\n        <\/div>/;
if (!gridRe.test(html)) throw new Error('index.html에서 home-grid 블록을 찾지 못했습니다.');
html = html.replace(gridRe, () => gridBlock);

const ldRe = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
if (!ldRe.test(html)) throw new Error('index.html에서 JSON-LD 블록을 찾지 못했습니다.');
html = html.replace(ldRe, () => `<script type="application/ld+json">${jsonld}</script>`);

fs.writeFileSync(indexPath, html);

/* ---- 4. llms.txt ---- */
let llms = `# DevTools Hub

> 개발자·디자이너·프론트엔드용 무료 온라인 유틸리티 모음. 모든 처리는 브라우저 안에서만 이루어지며 어떤 데이터도 서버로 전송되지 않습니다 (JWT·해시·시크릿 키·파일 입력 포함). Vanilla JS + 브라우저 네이티브 API, 빌드 스텝·회원가입·설치 없음. PWA로 설치해 오프라인 사용 가능.
>
> Free online developer utilities (JSON formatter, JWT decoder, Base64, cron parser, regex tester, color converter, cURL-to-code, JSON diff, secret key generator and more). 100% client-side — no data ever leaves the browser. No signup, no install.

URL: ${BASE}

`;
for (const cat of CATEGORIES) {
  llms += `## ${cat.name} (${cat.en})\n\n`;
  for (const tool of cat.tools) llms += `- [${tool.name}](${BASE}#${tool.id}): ${tool.desc}\n`;
  llms += '\n';
}
llms += `## 프라이버시

- 모든 도구는 100% 클라이언트 사이드로 동작합니다. 네트워크 요청 없음.
- 소스 코드: https://github.com/cooingpop/toolbox (MIT)
`;
fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms);

console.log(`SEO 산출물 재생성 완료 — 도구 ${tools.length}개 (index.html 홈 그리드·JSON-LD, llms.txt)`);
