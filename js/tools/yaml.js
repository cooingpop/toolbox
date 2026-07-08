// JSON ↔ YAML 변환기: 자체 구현 (외부 라이브러리 없음)
// 지원: 블록 맵/시퀀스, 인라인 플로우([], {}), 따옴표 문자열, 주석, 중첩
// 미지원(명확히 에러 처리): 앵커/별칭(&, *), 블록 스칼라(|, >), 태그(!!), 복합 키(? ), 다중 문서(---)
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

/* ==================== JSON → YAML ==================== */

const BOOL_NULL_LIKE = /^(true|false|null|~|yes|no|on|off)$/i;
const NUMBER_LIKE = /^[+-]?(\d+\.?\d*([eE][+-]?\d+)?|\.\d+|0x[0-9a-fA-F]+|0o[0-7]+)$/;

function needsQuote(s) {
  if (s === '') return true;
  if (/^\s|\s$/.test(s)) return true;
  if (BOOL_NULL_LIKE.test(s) || NUMBER_LIKE.test(s)) return true;
  if (/[\n\t"'#&*!|>%@`\\{}\[\],]/.test(s)) return true;
  if (/(^|\s)#/.test(s) || /:(\s|$)/.test(s)) return true;
  if (/^[-?:]($|\s)/.test(s)) return true;
  return false;
}

function scalarToYaml(v) {
  if (v === null) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  return needsQuote(v) ? JSON.stringify(v) : v;
}

function keyToYaml(k) {
  return needsQuote(k) || k.includes(':') ? JSON.stringify(k) : k;
}

export function jsonToYaml(value, indentSize = 2) {
  const lines = [];
  const pad = (n) => ' '.repeat(n * indentSize);

  // prefix: "key:" / "- key:" / "-" / "" — childLevel: 중첩 블록의 들여쓰기 레벨
  function walk(v, level, prefix, childLevel) {
    const head = prefix ? `${pad(level)}${prefix}` : pad(level);
    if (v === null || typeof v !== 'object') {
      lines.push(prefix ? `${head} ${scalarToYaml(v)}` : `${head}${scalarToYaml(v)}`);
      return;
    }
    if (Array.isArray(v)) {
      if (v.length === 0) { lines.push(`${head}${prefix ? ' ' : ''}[]`); return; }
      if (prefix) lines.push(head);
      const itemLevel = prefix ? childLevel : level;
      for (const item of v) walk(item, itemLevel, '-', itemLevel + 1);
      return;
    }
    const keys = Object.keys(v);
    if (keys.length === 0) { lines.push(`${head}${prefix ? ' ' : ''}{}`); return; }
    if (prefix === '-') {
      // 리스트 항목이 맵이면 첫 키를 "- key:" 형태로 같은 줄에
      keys.forEach((k, i) => {
        if (i === 0) walk(v[k], level, `- ${keyToYaml(k)}:`, level + 2);
        else walk(v[k], level + 1, `${keyToYaml(k)}:`, level + 2);
      });
      return;
    }
    if (prefix) lines.push(head);
    const keyLevel = prefix ? childLevel : level;
    for (const k of keys) walk(v[k], keyLevel, `${keyToYaml(k)}:`, keyLevel + 1);
  }

  walk(value, 0, '', 1);
  return lines.join('\n');
}

/* ==================== YAML → JSON ==================== */

class YamlError extends Error {
  constructor(lineNo, message) {
    super(lineNo ? `${lineNo}번째 줄: ${message}` : message);
  }
}

// 따옴표를 존중하며 인라인 주석 제거
function stripComment(text, lineNo) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (quote === '"' && c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#' && (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\t')) {
      return text.slice(0, i).trimEnd();
    }
  }
  if (quote) throw new YamlError(lineNo, '닫히지 않은 따옴표가 있습니다');
  return text.trimEnd();
}

function parsePlainScalar(text) {
  if (text === '' || text === '~' || text === 'null') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^[+-]?\d+$/.test(text)) {
    const n = Number(text);
    return Number.isSafeInteger(n) ? n : text;
  }
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(text) && /[.eE]/.test(text)) return Number(text);
  return text;
}

function parseQuoted(text, lineNo) {
  if (text[0] === '"') {
    try { return JSON.parse(text); } catch { throw new YamlError(lineNo, `잘못된 큰따옴표 문자열: ${text}`); }
  }
  // 작은따옴표: '' 는 ' 하나로
  if (!/^'.*'$/s.test(text)) throw new YamlError(lineNo, `잘못된 작은따옴표 문자열: ${text}`);
  return text.slice(1, -1).replaceAll("''", "'");
}

function checkUnsupported(text, lineNo) {
  if (/^[|>]/.test(text)) throw new YamlError(lineNo, '블록 스칼라(|, >)는 지원하지 않습니다');
  if (/^[&*]\S/.test(text)) throw new YamlError(lineNo, '앵커/별칭(&, *)은 지원하지 않습니다');
  if (/^!!/.test(text)) throw new YamlError(lineNo, '태그(!!)는 지원하지 않습니다');
}

// 인라인 플로우([...], {...}) 파서
function parseFlow(text, lineNo) {
  let pos = 0;
  const ws = () => { while (pos < text.length && ' \t'.includes(text[pos])) pos++; };
  const fail = (msg) => { throw new YamlError(lineNo, `${msg} (위치 ${pos + 1})`); };

  function scalarToken(stops) {
    const start = pos;
    if (text[pos] === '"' || text[pos] === "'") {
      const quote = text[pos];
      pos++;
      while (pos < text.length) {
        if (quote === '"' && text[pos] === '\\') pos += 2;
        else if (text[pos] === quote) {
          if (quote === "'" && text[pos + 1] === "'") { pos += 2; continue; }
          pos++;
          return parseQuoted(text.slice(start, pos), lineNo);
        } else pos++;
      }
      fail('닫히지 않은 따옴표');
    }
    while (pos < text.length && !stops.includes(text[pos])) pos++;
    return parsePlainScalar(text.slice(start, pos).trim());
  }

  function value() {
    ws();
    if (pos >= text.length) fail('값이 없습니다');
    if (text[pos] === '[') {
      pos++;
      const arr = [];
      ws();
      if (text[pos] === ']') { pos++; return arr; }
      for (;;) {
        arr.push(value());
        ws();
        if (text[pos] === ',') { pos++; continue; }
        if (text[pos] === ']') { pos++; return arr; }
        fail("',' 또는 ']'가 필요합니다");
      }
    }
    if (text[pos] === '{') {
      pos++;
      const obj = {};
      ws();
      if (text[pos] === '}') { pos++; return obj; }
      for (;;) {
        ws();
        const key = scalarToken(':,}');
        ws();
        if (text[pos] !== ':') fail("':'가 필요합니다");
        pos++;
        obj[String(key)] = value();
        ws();
        if (text[pos] === ',') { pos++; continue; }
        if (text[pos] === '}') { pos++; return obj; }
        fail("',' 또는 '}'가 필요합니다");
      }
    }
    return scalarToken(',]}');
  }

  const result = value();
  ws();
  if (pos < text.length) fail('플로우 값 뒤에 잉여 문자가 있습니다');
  return result;
}

function parseValueText(text, lineNo) {
  checkUnsupported(text, lineNo);
  if (text[0] === '[' || text[0] === '{') return parseFlow(text, lineNo);
  if (text[0] === '"' || text[0] === "'") return parseQuoted(text, lineNo);
  return parsePlainScalar(text);
}

// "key: value" 분리 — 따옴표 키 지원. 맵 엔트리가 아니면 null
function splitMapEntry(content, lineNo) {
  let keyEnd = -1;
  let pos = 0;
  if (content[0] === '"' || content[0] === "'") {
    const quote = content[0];
    pos++;
    while (pos < content.length) {
      if (quote === '"' && content[pos] === '\\') pos += 2;
      else if (content[pos] === quote) { pos++; break; }
      else pos++;
    }
    if (content[pos] !== ':') return null;
    keyEnd = pos;
  } else {
    // 플레인 키: 따옴표 밖에서 ': ' 또는 줄 끝 ':'
    for (let i = 0; i < content.length; i++) {
      if (content[i] === ':' && (i === content.length - 1 || content[i + 1] === ' ')) { keyEnd = i; break; }
      if (content[i] === '#') break;
    }
    if (keyEnd < 0) return null;
  }
  const rawKey = content.slice(0, keyEnd).trim();
  if (!rawKey) throw new YamlError(lineNo, '키가 비어 있습니다');
  const key = (rawKey[0] === '"' || rawKey[0] === "'") ? parseQuoted(rawKey, lineNo) : rawKey;
  return { key: String(key), valueText: content.slice(keyEnd + 1).trim() };
}

export function yamlToJson(text) {
  // 전처리: 빈 줄/주석 제거, 들여쓰기 계산
  const lines = [];
  const rawLines = text.split('\n');
  for (let i = 0; i < rawLines.length; i++) {
    const no = i + 1;
    let line = rawLines[i].replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\t/.test(line)) throw new YamlError(no, '들여쓰기에 탭은 사용할 수 없습니다 (스페이스만 허용)');
    if (/^---\s*$/.test(line.trim()) || /^\.\.\.\s*$/.test(line.trim())) {
      if (lines.length) throw new YamlError(no, '다중 문서(---)는 지원하지 않습니다');
      continue; // 문서 시작 마커는 무시
    }
    const indent = line.match(/^ */)[0].length;
    const content = stripComment(line.trim(), no);
    if (!content) continue;
    if (content.startsWith('? ')) throw new YamlError(no, '복합 키(? )는 지원하지 않습니다');
    lines.push({ indent, content, no });
  }
  if (!lines.length) return null;

  let idx = 0;

  function parseBlock() {
    const indent = lines[idx].indent;

    // 시퀀스
    if (lines[idx].content === '-' || lines[idx].content.startsWith('- ')) {
      const arr = [];
      while (idx < lines.length && lines[idx].indent === indent
        && (lines[idx].content === '-' || lines[idx].content.startsWith('- '))) {
        const line = lines[idx];
        const rest = line.content === '-' ? '' : line.content.slice(2).trim();
        if (rest === '') {
          idx++;
          arr.push(idx < lines.length && lines[idx].indent > indent ? parseBlock() : null);
        } else {
          checkUnsupported(rest, line.no);
          const entry = splitMapEntry(rest, line.no);
          if (entry) {
            // "- key: value" → 항목을 맵으로: 첫 키 라인을 키 컬럼 들여쓰기로 재해석
            const keyColumn = line.indent + (line.content.length - rest.length);
            lines[idx] = { indent: keyColumn, content: rest, no: line.no };
            arr.push(parseBlock());
          } else {
            arr.push(parseValueText(rest, line.no));
            idx++;
            if (idx < lines.length && lines[idx].indent > indent) {
              throw new YamlError(lines[idx].no, '예상보다 깊은 들여쓰기입니다');
            }
          }
        }
      }
      if (idx < lines.length && lines[idx].indent > indent) {
        throw new YamlError(lines[idx].no, '들여쓰기가 시퀀스와 맞지 않습니다');
      }
      return arr;
    }

    // 맵
    const firstEntry = splitMapEntry(lines[idx].content, lines[idx].no);
    if (firstEntry) {
      const obj = {};
      while (idx < lines.length && lines[idx].indent === indent) {
        const line = lines[idx];
        if (line.content === '-' || line.content.startsWith('- ')) break;
        const entry = splitMapEntry(line.content, line.no);
        if (!entry) throw new YamlError(line.no, `맵 항목("키: 값")이 아닙니다: ${line.content}`);
        if (entry.key in obj) throw new YamlError(line.no, `중복 키: ${entry.key}`);
        idx++;
        if (entry.valueText === '') {
          obj[entry.key] = idx < lines.length && lines[idx].indent > indent ? parseBlock() : null;
        } else {
          obj[entry.key] = parseValueText(entry.valueText, line.no);
          if (idx < lines.length && lines[idx].indent > indent) {
            throw new YamlError(lines[idx].no, '예상보다 깊은 들여쓰기입니다');
          }
        }
      }
      if (idx < lines.length && lines[idx].indent > indent) {
        throw new YamlError(lines[idx].no, '들여쓰기가 맵과 맞지 않습니다');
      }
      return obj;
    }

    // 단일 스칼라 문서
    const line = lines[idx];
    checkUnsupported(line.content, line.no);
    const value = parseValueText(line.content, line.no);
    idx++;
    if (idx < lines.length) throw new YamlError(lines[idx].no, '스칼라 문서 뒤에 추가 내용이 있습니다');
    return value;
  }

  const result = parseBlock();
  if (idx < lines.length) throw new YamlError(lines[idx].no, '문서 최상위 들여쓰기가 일치하지 않습니다');
  return result;
}

/* ==================== UI ==================== */

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>JSON ↔ YAML 변환</h2>
      <p class="tool-desc">JSON과 YAML을 상호 변환합니다.
        앵커(<code>&amp;</code>/<code>*</code>)·블록 스칼라(<code>|</code>/<code>&gt;</code>)·태그(<code>!!</code>)·다중 문서는 지원하지 않으며, 해당 문법 발견 시 명확히 안내합니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="yaml-input">입력 (JSON 또는 YAML)</label>
      <textarea id="yaml-input" class="code" rows="10" spellcheck="false"
        placeholder='{"name": "DevTools", "tags": ["a", "b"]}  또는  name: DevTools'></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-primary" id="yaml-to-yaml">JSON → YAML</button>
        <button class="btn btn-primary" id="yaml-to-json">YAML → JSON</button>
        <label>JSON 들여쓰기
          <select id="yaml-json-indent">
            <option value="2" selected>2</option>
            <option value="4">4</option>
          </select>
        </label>
        <span class="grow"></span>
        <button class="btn" id="yaml-clear">지우기</button>
      </div>
      <div id="yaml-error"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="yaml-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#yaml-output">복사</button>
      </div>
      <textarea id="yaml-output" class="code" rows="12" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#yaml-input', container);
  const output = $('#yaml-output', container);
  const errorBox = $('#yaml-error', container);

  function guard(fn) {
    errorBox.innerHTML = '';
    if (!input.value.trim()) {
      errorBox.innerHTML = '<p class="error-text">입력이 비어 있습니다.</p>';
      return;
    }
    try {
      fn();
    } catch (err) {
      errorBox.innerHTML = '<p class="error-text"></p>';
      errorBox.firstChild.textContent = err.message;
    }
  }

  $('#yaml-to-yaml', container).addEventListener('click', () => guard(() => {
    let parsed;
    try { parsed = JSON.parse(input.value); } catch (err) {
      throw new Error(`유효한 JSON이 아닙니다: ${err.message}`);
    }
    output.value = jsonToYaml(parsed);
  }));

  $('#yaml-to-json', container).addEventListener('click', () => guard(() => {
    const indent = Number($('#yaml-json-indent', container).value);
    output.value = JSON.stringify(yamlToJson(input.value), null, indent);
  }));

  $('#yaml-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    errorBox.innerHTML = '';
    input.focus();
  });

  bindCopyButtons(container);
}
