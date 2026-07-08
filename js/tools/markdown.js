// Markdown 미리보기: 자체 구현 서브셋 렌더러 (XSS 안전 — 입력을 먼저 이스케이프)
// 지원: 제목, 굵게/기울임/취소선, 인라인·펜스 코드, 링크/이미지, 목록(중첩 1단), 인용, 표, 구분선
import { $, escapeHtml, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

function safeUrl(url) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|#|\/|\.)/i.test(trimmed) && !/^javascript:/i.test(trimmed)) return trimmed;
  return '#';
}

// 인라인 문법 (입력은 이미 HTML 이스케이프됨)
function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${escapeHtml(safeUrl(src))}" alt="${alt}">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${escapeHtml(safeUrl(href))}" rel="noopener">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
}

export function renderMarkdown(md) {
  const src = escapeHtml(md.replace(/\r\n/g, '\n'));
  const lines = src.split('\n');
  const out = [];
  let i = 0;
  let listStack = []; // {type:'ul'|'ol', indent}
  let para = [];

  const flushPara = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  const closeLists = (toIndent = -1) => {
    while (listStack.length && listStack[listStack.length - 1].indent >= toIndent + 1) {
      out.push(`</${listStack.pop().type}>`);
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // 펜스 코드 블록
    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      flushPara(); closeLists();
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; // 닫는 펜스
      out.push(`<pre class="code"><code${fence[1] ? ` data-lang="${fence[1]}"` : ''}>${code.join('\n')}</code></pre>`);
      continue;
    }
    // 빈 줄
    if (!line.trim()) { flushPara(); closeLists(); i++; continue; }
    // 제목
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushPara(); closeLists();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i++; continue;
    }
    // 구분선
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      flushPara(); closeLists();
      out.push('<hr>');
      i++; continue;
    }
    // 인용
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushPara(); closeLists();
      const quoteLines = [];
      while (i < lines.length) {
        const m = lines[i].match(/^&gt;\s?(.*)$/);
        if (!m) break;
        quoteLines.push(m[1]);
        i++;
      }
      out.push(`<blockquote>${inline(quoteLines.join(' '))}</blockquote>`);
      continue;
    }
    // 표
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      flushPara(); closeLists();
      const splitRow = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(splitRow(lines[i])); i++; }
      out.push('<table class="result-table"><thead><tr>'
        + header.map((h) => `<th>${inline(h)}</th>`).join('')
        + '</tr></thead><tbody>'
        + rows.map((r) => `<tr>${header.map((_, ci) => `<td>${inline(r[ci] ?? '')}</td>`).join('')}</tr>`).join('')
        + '</tbody></table>');
      continue;
    }
    // 목록 (중첩 1단: 들여쓰기 2칸 이상)
    const list = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (list) {
      flushPara();
      const indent = Math.min(1, Math.floor(list[1].length / 2));
      const type = /^\d+\.$/.test(list[2]) ? 'ol' : 'ul';
      const top = listStack[listStack.length - 1];
      if (!top || top.indent < indent) {
        listStack.push({ type, indent });
        out.push(`<${type}>`);
      } else if (top.indent > indent) {
        closeLists(indent);
      } else if (top.type !== type) {
        out.push(`</${listStack.pop().type}>`);
        listStack.push({ type, indent });
        out.push(`<${type}>`);
      }
      out.push(`<li>${inline(list[3])}</li>`);
      i++; continue;
    }
    // 문단 누적
    para.push(line.trim());
    i++;
  }
  flushPara();
  closeLists();
  return out.join('\n');
}

const SAMPLE = `# DevTools Hub Markdown

**굵게**, *기울임*, ~~취소선~~, \`인라인 코드\`, [링크](https://example.com)

## 목록
- 항목 하나
- 항목 둘
  - 중첩 항목
1. 순서 있는
2. 목록

> 인용문입니다.

| 이름 | 값 |
|------|-----|
| json | 포매터 |
| jwt  | 디코더 |

\`\`\`js
const x = "code block";
\`\`\`
`;

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>Markdown 미리보기</h2>
      <p class="tool-desc">Markdown을 실시간 렌더링합니다 (자체 구현 서브셋 — 제목·강조·코드·링크·이미지·목록·인용·표·구분선).
        각주·HTML 태그 등 확장 문법은 지원하지 않습니다.</p>
    </div>
    <div class="card">
      <div class="row" style="align-items:stretch">
        <div class="grow" style="min-width:280px">
          <label class="field-label" for="md-input">Markdown</label>
          <textarea id="md-input" class="code" rows="16" spellcheck="false"></textarea>
        </div>
        <div class="grow" style="min-width:280px">
          <span class="field-label">미리보기</span>
          <div class="md-preview" id="md-preview"></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="md-html" style="margin-bottom:0">HTML 출력</label>
        <button class="btn btn-sm" data-copy-target="#md-html">복사</button>
      </div>
      <textarea id="md-html" class="code" rows="6" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#md-input', container);
  const preview = $('#md-preview', container);
  const htmlOut = $('#md-html', container);

  function run() {
    const html = renderMarkdown(input.value);
    preview.innerHTML = html || '<p class="hint">왼쪽에 Markdown을 입력하세요.</p>';
    htmlOut.value = html;
  }

  input.addEventListener('input', debounce(run, 200));
  input.value = SAMPLE;
  run();
  bindCopyButtons(container);
}
