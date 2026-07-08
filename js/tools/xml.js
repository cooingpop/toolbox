// XML 포매터: DOMParser로 검증 + 자체 워커로 들여쓰기 정리 / 압축
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const errNode = doc.querySelector('parsererror');
  if (errNode) {
    // 브라우저별 parsererror 본문에서 줄 정보 포함 메시지 추출
    throw new Error(errNode.textContent.trim().split('\n').slice(0, 3).join('\n'));
  }
  return doc;
}

function serializeNode(node, indentStr, depth, out) {
  const pad = indentStr.repeat(depth);
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      const attrs = [...node.attributes].map((a) => ` ${a.name}="${a.value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"`).join('');
      const children = [...node.childNodes].filter((c) => !(c.nodeType === Node.TEXT_NODE && !c.nodeValue.trim()));
      if (children.length === 0) {
        out.push(`${pad}<${node.nodeName}${attrs}/>`);
      } else if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
        out.push(`${pad}<${node.nodeName}${attrs}>${escapeText(children[0].nodeValue.trim())}</${node.nodeName}>`);
      } else {
        out.push(`${pad}<${node.nodeName}${attrs}>`);
        for (const child of children) serializeNode(child, indentStr, depth + 1, out);
        out.push(`${pad}</${node.nodeName}>`);
      }
      break;
    }
    case Node.TEXT_NODE: {
      const trimmed = node.nodeValue.trim();
      if (trimmed) out.push(pad + escapeText(trimmed));
      break;
    }
    case Node.CDATA_SECTION_NODE:
      out.push(`${pad}<![CDATA[${node.nodeValue}]]>`);
      break;
    case Node.COMMENT_NODE:
      out.push(`${pad}<!--${node.nodeValue}-->`);
      break;
    case Node.PROCESSING_INSTRUCTION_NODE:
      out.push(`${pad}<?${node.target} ${node.data}?>`);
      break;
    default:
      break;
  }
}

function escapeText(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function formatXml(text, indentStr) {
  const doc = parseXml(text);
  const out = [];
  // XML 선언은 파서가 버리므로 원문에서 보존
  const declMatch = text.match(/^\s*<\?xml[^?]*\?>/);
  if (declMatch) out.push(declMatch[0].trim());
  for (const node of doc.childNodes) serializeNode(node, indentStr, 0, out);
  return out.join('\n');
}

export function minifyXml(text) {
  parseXml(text); // 검증
  return text.replace(/>\s+</g, '><').trim();
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>XML 포매터</h2>
      <p class="tool-desc">XML의 들여쓰기를 정리하고 유효성을 검사합니다. 주석·CDATA·XML 선언을 보존합니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="xml-input">입력 XML</label>
      <textarea id="xml-input" class="code" rows="10" spellcheck="false"
        placeholder='<?xml version="1.0"?><root><item id="1">값</item></root>'></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-primary" id="xml-pretty">Pretty</button>
        <button class="btn" id="xml-minify">Minify</button>
        <button class="btn" id="xml-validate">Validate</button>
        <label>들여쓰기
          <select id="xml-indent">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>
        <span class="grow"></span>
        <button class="btn" id="xml-clear">지우기</button>
      </div>
      <div id="xml-status"></div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="xml-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#xml-output">복사</button>
      </div>
      <textarea id="xml-output" class="code" rows="12" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#xml-input', container);
  const output = $('#xml-output', container);
  const status = $('#xml-status', container);

  function guard(fn) {
    status.innerHTML = '';
    if (!input.value.trim()) {
      status.innerHTML = '<p class="error-text">입력이 비어 있습니다.</p>';
      return;
    }
    try {
      fn();
    } catch (err) {
      status.innerHTML = '<p class="error-text"></p>';
      status.firstChild.textContent = err.message;
    }
  }

  $('#xml-pretty', container).addEventListener('click', () => guard(() => {
    const sel = $('#xml-indent', container).value;
    output.value = formatXml(input.value, sel === 'tab' ? '\t' : ' '.repeat(Number(sel)));
  }));
  $('#xml-minify', container).addEventListener('click', () => guard(() => {
    output.value = minifyXml(input.value);
  }));
  $('#xml-validate', container).addEventListener('click', () => guard(() => {
    formatXml(input.value, '  ');
    status.innerHTML = '<p class="success-text">✓ 유효한 XML입니다.</p>';
  }));
  $('#xml-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    status.innerHTML = '';
    input.focus();
  });

  bindCopyButtons(container);
}
