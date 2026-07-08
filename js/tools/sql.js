// SQL 포매터: 기본 키워드 개행/들여쓰기 수준 (토크나이저 기반)
import { $ } from '../utils/dom.js';
import { bindCopyButtons } from '../utils/clipboard.js';

// 새 줄에서 시작하는 주요 절 (긴 것부터 매칭)
const CLAUSES = [
  'INSERT INTO', 'DELETE FROM', 'GROUP BY', 'ORDER BY', 'PARTITION BY',
  'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
  'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'CROSS JOIN', 'FULL JOIN', 'OUTER JOIN', 'JOIN',
  'UNION ALL', 'UNION', 'EXCEPT', 'INTERSECT',
  'SELECT', 'FROM', 'WHERE', 'HAVING', 'LIMIT', 'OFFSET', 'VALUES',
  'UPDATE', 'SET', 'ON', 'WITH', 'RETURNING',
];
// 새 줄 + 한 단계 들여쓰는 연결어
const INDENTED = ['AND', 'OR', 'WHEN', 'ELSE'];

const ALL_KEYWORDS = new Set([
  ...CLAUSES.flatMap((c) => c.split(' ')), ...INDENTED,
  'AS', 'IN', 'IS', 'NOT', 'NULL', 'LIKE', 'BETWEEN', 'EXISTS', 'DISTINCT',
  'CASE', 'END', 'THEN', 'ASC', 'DESC', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'DEFAULT', 'CONSTRAINT', 'INTO', 'BY',
]);

// 토큰: string / comment / word / punct
export function tokenize(sql) {
  const tokens = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) { j += 2; continue; } // '' 이스케이프
          break;
        }
        if (quote === "'" && sql[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', text: sql.slice(i, j + 1) });
      i = j + 1;
    } else if (c === '-' && sql[i + 1] === '-') {
      let j = sql.indexOf('\n', i);
      if (j < 0) j = sql.length;
      tokens.push({ type: 'comment', text: sql.slice(i, j).trimEnd() });
      i = j;
    } else if (c === '/' && sql[i + 1] === '*') {
      let j = sql.indexOf('*/', i + 2);
      j = j < 0 ? sql.length : j + 2;
      tokens.push({ type: 'comment', text: sql.slice(i, j) });
      i = j;
    } else if (/[A-Za-z_\u0080-\uFFFF]/.test(c)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_$\u0080-\uFFFF]/.test(sql[j])) j++;
      tokens.push({ type: 'word', text: sql.slice(i, j) });
      i = j;
    } else if (/[0-9]/.test(c)) {
      let j = i;
      while (j < sql.length && /[0-9.eE+-]/.test(sql[j]) && !(/[+-]/.test(sql[j]) && !/[eE]/.test(sql[j - 1]))) j++;
      tokens.push({ type: 'word', text: sql.slice(i, j) });
      i = j;
    } else {
      // 두 글자 연산자 우선
      const two = sql.slice(i, i + 2);
      if (['<=', '>=', '<>', '!=', '||', '::'].includes(two)) {
        tokens.push({ type: 'punct', text: two });
        i += 2;
      } else {
        tokens.push({ type: 'punct', text: c });
        i++;
      }
    }
  }
  return tokens;
}

export function formatSql(sql, { keywordCase = 'upper', indentStr = '  ' } = {}) {
  const tokens = tokenize(sql);
  if (!tokens.length) return '';

  // 여러 단어 절 병합을 위해 lookahead 매칭
  const isWord = (t, w) => t && t.type === 'word' && t.text.toUpperCase() === w;
  const merged = [];
  for (let i = 0; i < tokens.length; i++) {
    let matched = null;
    if (tokens[i].type === 'word') {
      for (const clause of CLAUSES) {
        const parts = clause.split(' ');
        if (parts.every((w, k) => isWord(tokens[i + k], w))) { matched = clause; break; }
      }
    }
    if (matched) {
      merged.push({ type: 'clause', text: matched });
      i += matched.split(' ').length - 1;
    } else {
      merged.push(tokens[i]);
    }
  }

  const caseWord = (text) => {
    if (!ALL_KEYWORDS.has(text.toUpperCase())) return text;
    if (keywordCase === 'upper') return text.toUpperCase();
    if (keywordCase === 'lower') return text.toLowerCase();
    return text;
  };

  const lines = [];
  let current = '';
  let depth = 0;
  const indents = []; // 괄호별 들여쓰기 스택

  const flush = () => { if (current.trim()) lines.push(current.trimEnd()); current = ''; };
  const newline = (level) => { flush(); current = indentStr.repeat(Math.max(0, level)); };
  const append = (text) => {
    if (current === '' || current.endsWith(' ') || /^[,);.]/.test(text) || current.endsWith('(') || text === '(') {
      // 여는 괄호 뒤·닫는 문장부호 앞에는 공백 없이
      if (text === '(' && current !== '' && !current.endsWith(' ') && !/[A-Za-z0-9_$)]$/.test(current)) current += ' ';
      current += text;
    } else {
      current += ' ' + text;
    }
  };

  for (let i = 0; i < merged.length; i++) {
    const t = merged[i];
    const upper = t.text.toUpperCase();

    if (t.type === 'clause') {
      newline(depth);
      append(keywordCase === 'lower' ? t.text.toLowerCase() : keywordCase === 'upper' ? t.text : t.text);
      continue;
    }
    if (t.type === 'comment') {
      newline(depth);
      append(t.text);
      newline(depth);
      continue;
    }
    if (t.type === 'word' && INDENTED.includes(upper)) {
      newline(depth + 1);
      append(caseWord(t.text));
      continue;
    }
    if (t.type === 'word' && upper === 'CASE') {
      append(caseWord(t.text));
      depth++;
      continue;
    }
    if (t.type === 'word' && upper === 'END') {
      depth = Math.max(0, depth - 1);
      newline(depth + 1);
      append(caseWord(t.text));
      continue;
    }
    if (t.type === 'punct') {
      if (t.text === '(') {
        // 서브쿼리면 개행 + 들여쓰기
        const next = merged[i + 1];
        if (next && (next.type === 'clause' ? next.text === 'SELECT' : isWord(next, 'SELECT'))) {
          append('(');
          depth++;
          indents.push('block');
          newline(depth);
        } else {
          append('(');
          indents.push('inline');
        }
        continue;
      }
      if (t.text === ')') {
        const kind = indents.pop();
        if (kind === 'block') {
          depth = Math.max(0, depth - 1);
          newline(depth);
        }
        append(')');
        continue;
      }
      if (t.text === ',') {
        append(',');
        // 최상위(괄호 안 inline 아님) 콤마는 개행
        if (!indents.includes('inline')) newline(depth + 1);
        continue;
      }
      if (t.text === ';') {
        append(';');
        newline(depth);
        continue;
      }
      append(t.text);
      continue;
    }
    append(t.type === 'word' ? caseWord(t.text) : t.text);
  }
  flush();
  return lines.join('\n');
}

export function init(container) {
  container.innerHTML = `
    <div class="tool-header">
      <h2>SQL 포매터</h2>
      <p class="tool-desc">주요 절(SELECT/FROM/WHERE/JOIN…) 기준으로 개행·들여쓰기를 정리합니다.
        문자열·주석·서브쿼리를 인식하는 기본 수준의 포매터입니다.</p>
    </div>
    <div class="card">
      <label class="field-label" for="sql-input">입력 SQL</label>
      <textarea id="sql-input" class="code" rows="8" spellcheck="false"
        placeholder="select u.id, u.name from users u left join orders o on o.user_id = u.id where u.active = 1 and o.total > 100 order by o.total desc"></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-primary" id="sql-format">포맷</button>
        <label>키워드
          <select id="sql-case">
            <option value="upper" selected>UPPER</option>
            <option value="lower">lower</option>
            <option value="keep">그대로</option>
          </select>
        </label>
        <label>들여쓰기
          <select id="sql-indent">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>
        <span class="grow"></span>
        <button class="btn" id="sql-clear">지우기</button>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <label class="field-label grow" for="sql-output" style="margin-bottom:0">결과</label>
        <button class="btn btn-sm" data-copy-target="#sql-output">복사</button>
      </div>
      <textarea id="sql-output" class="code" rows="12" readonly spellcheck="false"></textarea>
    </div>
  `;

  const input = $('#sql-input', container);
  const output = $('#sql-output', container);

  $('#sql-format', container).addEventListener('click', () => {
    const sel = $('#sql-indent', container).value;
    output.value = formatSql(input.value, {
      keywordCase: $('#sql-case', container).value,
      indentStr: sel === 'tab' ? '\t' : ' '.repeat(Number(sel)),
    });
  });
  $('#sql-clear', container).addEventListener('click', () => {
    input.value = '';
    output.value = '';
    input.focus();
  });

  bindCopyButtons(container);
}
