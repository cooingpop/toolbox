// cURL → 코드 변환: curl 명령을 fetch / axios 코드로 (주요 플래그 서브셋)
import { $, escapeHtml, debounce } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

// 셸 스타일 토크나이저: 작은/큰따옴표, 백슬래시 개행 이어붙임
export function tokenizeShell(cmd) {
  const text = cmd.replace(/\\\r?\n/g, ' ');
  const tokens = [];
  let current = '';
  let quote = null;
  let started = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) { quote = null; }
      else if (quote === '"' && c === '\\' && '"\\$`'.includes(text[i + 1])) { current += text[++i]; }
      else current += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      started = true;
    } else if (/\s/.test(c)) {
      if (started || current) { tokens.push(current); current = ''; started = false; }
    } else if (c === '\\' && i + 1 < text.length) {
      current += text[++i];
    } else {
      current += c;
    }
  }
  if (quote) throw new Error('닫히지 않은 따옴표가 있습니다.');
  if (started || current) tokens.push(current);
  return tokens;
}

const IGNORED_FLAGS = new Set(['-s', '--silent', '-S', '--show-error', '-k', '--insecure', '-L', '--location',
  '--compressed', '-v', '--verbose', '-i', '--include', '-f', '--fail', '-g', '--globoff', '--http1.1', '--http2']);

export function parseCurl(cmd) {
  let tokens = tokenizeShell(cmd.trim());
  if (tokens[0] === 'curl') tokens = tokens.slice(1);
  if (!tokens.length) throw new Error('curl 명령을 입력하세요.');

  const req = { url: '', method: '', headers: {}, body: null, warnings: [], ignored: [] };
  const dataParts = [];
  let asGet = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = () => {
      i++;
      if (i >= tokens.length) throw new Error(`${t} 뒤에 값이 필요합니다.`);
      return tokens[i];
    };
    if (t === '-X' || t === '--request') req.method = next().toUpperCase();
    else if (t === '-H' || t === '--header') {
      const h = next();
      const idx = h.indexOf(':');
      if (idx > 0) req.headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii'].includes(t)) {
      dataParts.push(next());
    } else if (t === '--data-urlencode') {
      const v = next();
      const eq = v.indexOf('=');
      dataParts.push(eq >= 0 ? `${v.slice(0, eq)}=${encodeURIComponent(v.slice(eq + 1))}` : encodeURIComponent(v));
    } else if (t === '--json') {
      dataParts.push(next());
      req.headers['Content-Type'] = 'application/json';
      req.headers['Accept'] ??= 'application/json';
    } else if (t === '-u' || t === '--user') {
      req.headers['Authorization'] = `Basic ${btoa(next())}`;
    } else if (t === '-A' || t === '--user-agent') req.headers['User-Agent'] = next();
    else if (t === '-e' || t === '--referer') req.headers['Referer'] = next();
    else if (t === '-b' || t === '--cookie') req.headers['Cookie'] = next();
    else if (t === '-G' || t === '--get') asGet = true;
    else if (t === '-F' || t === '--form') {
      next();
      req.warnings.push('-F(multipart/form-data)는 지원하지 않아 해당 필드를 건너뛰었습니다. FormData로 직접 작성하세요.');
    } else if (t === '-o' || t === '--output' || t === '-c' || t === '--cookie-jar' || t === '--max-time' || t === '--connect-timeout' || t === '--retry') {
      next();
      req.ignored.push(t);
    } else if (IGNORED_FLAGS.has(t)) req.ignored.push(t);
    else if (t.startsWith('-') && t !== '-') {
      req.ignored.push(t);
      // 값이 따라오는 알 수 없는 플래그일 수 있으나 판단 불가 → 플래그만 무시
    } else if (!req.url) req.url = t;
    else req.warnings.push(`해석하지 못한 인자: ${t}`);
  }

  if (!req.url) throw new Error('URL을 찾지 못했습니다.');
  if (dataParts.length) {
    if (asGet) {
      req.url += (req.url.includes('?') ? '&' : '?') + dataParts.join('&');
    } else {
      req.body = dataParts.join('&');
      if (!req.method) req.method = 'POST';
      if (!Object.keys(req.headers).some((h) => h.toLowerCase() === 'content-type')) {
        req.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }
  }
  if (!req.method) req.method = 'GET';
  return req;
}

const q = (s) => `'${String(s).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

function bodyExpr(req) {
  const ct = Object.entries(req.headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? '';
  if (ct.includes('json')) {
    try { return `JSON.stringify(${JSON.stringify(JSON.parse(req.body), null, 2)})`; } catch { /* JSON 아니면 문자열로 */ }
  }
  return q(req.body);
}

export function toFetch(req) {
  const lines = [`const response = await fetch(${q(req.url)}, {`];
  lines.push(`  method: ${q(req.method)},`);
  const headerEntries = Object.entries(req.headers);
  if (headerEntries.length) {
    lines.push('  headers: {');
    for (const [k, v] of headerEntries) lines.push(`    ${q(k)}: ${q(v)},`);
    lines.push('  },');
  }
  if (req.body != null) lines.push(`  body: ${bodyExpr(req)},`);
  lines.push('});');
  lines.push('const data = await response.json();');
  return lines.join('\n');
}

export function toAxios(req) {
  const lines = ['const { data } = await axios({'];
  lines.push(`  method: ${q(req.method.toLowerCase())},`);
  lines.push(`  url: ${q(req.url)},`);
  const headerEntries = Object.entries(req.headers);
  if (headerEntries.length) {
    lines.push('  headers: {');
    for (const [k, v] of headerEntries) lines.push(`    ${q(k)}: ${q(v)},`);
    lines.push('  },');
  }
  if (req.body != null) lines.push(`  data: ${bodyExpr(req)},`);
  lines.push('});');
  return lines.join('\n');
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>cURL → 코드 변환</h2>
      <p class="tool-desc">curl 명령을 <code>fetch</code> / <code>axios</code> 코드로 변환합니다.
        지원: <code>-X -H -d --data-* --json -u -A -e -b -G</code>. 미지원 플래그는 무시하고 알려줍니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="curl-input">curl 명령</label>
      <textarea id="curl-input" class="code" rows="6" spellcheck="false"
        placeholder="curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{&quot;name&quot;:&quot;kim&quot;}'"></textarea>
      <div id="curl-error"></div>
      <div id="curl-warnings"></div>
    </div>
    <div class="card" id="curl-result" hidden>
      <div class="row">
        <h3 class="grow" style="margin-bottom:0">fetch</h3>
        <button class="btn btn-sm" data-copy-target="#curl-fetch">복사</button>
      </div>
      <pre class="code" id="curl-fetch"></pre>
      <div class="row" style="margin-top:14px">
        <h3 class="grow" style="margin-bottom:0">axios</h3>
        <button class="btn btn-sm" data-copy-target="#curl-axios">복사</button>
      </div>
      <pre class="code" id="curl-axios"></pre>
    </div>
  `;

  const input = $('#curl-input', container);
  const errorBox = $('#curl-error', container);
  const warnBox = $('#curl-warnings', container);
  const result = $('#curl-result', container);

  function run() {
    errorBox.innerHTML = '';
    warnBox.innerHTML = '';
    if (!input.value.trim()) { result.hidden = true; return; }
    try {
      const req = parseCurl(input.value);
      $('#curl-fetch', container).textContent = toFetch(req);
      $('#curl-axios', container).textContent = toAxios(req);
      result.hidden = false;
      const notes = [];
      if (req.ignored.length) notes.push(`무시한 플래그: ${[...new Set(req.ignored)].join(', ')}`);
      notes.push(...req.warnings);
      warnBox.innerHTML = notes.map((n) => `<p class="hint">⚠️ ${escapeHtml(n)}</p>`).join('');
    } catch (err) {
      result.hidden = true;
      errorBox.innerHTML = '<p class="error-text"></p>';
      errorBox.firstChild.textContent = err.message;
    }
  }

  input.addEventListener('input', debounce(run, 250));
  bindCopyButtons(container);
}
