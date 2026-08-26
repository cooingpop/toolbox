// 도구 레지스트리 — 단일 원본.
// ⚠️ 여기를 수정한 뒤에는 `node scripts/build-seo.mjs`를 실행해
//    index.html의 정적 홈 그리드·JSON-LD와 llms.txt를 재생성하고 함께 커밋할 것.
// DOM 의존이 없어 Node에서도 import 가능 (위 스크립트가 사용).

export const CATEGORIES = [
  {
    name: '포맷 & 변환',
    en: 'Format & Convert',
    tools: [
      { id: 'json', icon: '🧾', name: 'JSON 포매터', nameEn: 'JSON Formatter', desc: 'Pretty / Minify / 검증 + 트리 뷰', descEn: 'Pretty / minify / validate + tree view' },
      { id: 'xml', icon: '📐', name: 'XML 포매터', nameEn: 'XML Formatter', desc: '들여쓰기 정리 + 유효성 검사', descEn: 'Indentation + validity check' },
      { id: 'yaml', icon: '🔁', name: 'JSON ↔ YAML 변환', nameEn: 'JSON ↔ YAML', desc: '양방향 변환 (자체 구현)', descEn: 'Two-way conversion' },
      { id: 'sql', icon: '🗃️', name: 'SQL 포매터', nameEn: 'SQL Formatter', desc: '키워드 개행/들여쓰기 정리', descEn: 'Clause newlines and indentation' },
      { id: 'jsoncsv', icon: '📊', name: 'JSON ↔ CSV 변환', nameEn: 'JSON ↔ CSV', desc: '객체 배열 ↔ CSV/TSV (따옴표 안전)', descEn: 'Array of objects ↔ CSV/TSV' },
      { id: 'jsondiff', icon: '🆚', name: 'JSON Diff', nameEn: 'JSON Diff', desc: '구조 기준 비교 (키 순서 무시)', descEn: 'Structural compare, key-order agnostic' },
      { id: 'curl', icon: '📡', name: 'cURL → 코드 변환', nameEn: 'cURL to Code', desc: 'curl 명령 → fetch / axios 코드', descEn: 'curl command → fetch / axios' },
    ],
  },
  {
    name: '인코딩 & 디코딩',
    en: 'Encode & Decode',
    tools: [
      { id: 'base64', icon: '🔤', name: 'Base64 인코더/디코더', nameEn: 'Base64 Encoder/Decoder', desc: '텍스트·이미지 ↔ Base64 (UTF-8 안전)', descEn: 'Text/image ↔ Base64, UTF-8 safe' },
      { id: 'url', icon: '🔗', name: 'URL 인코더/디코더', nameEn: 'URL Encoder/Decoder', desc: '컴포넌트/전체 URI 모드', descEn: 'Component / full URI modes' },
      { id: 'jwt', icon: '🎫', name: 'JWT 디코더', nameEn: 'JWT Decoder', desc: 'header/payload 디코딩 + HMAC 서명 검증', descEn: 'Decode + HMAC signature verify' },
      { id: 'entity', icon: '🏷️', name: 'HTML 엔티티', nameEn: 'HTML Entities', desc: '&lt; ↔ < 인코딩/디코딩', descEn: 'Encode/decode HTML entities' },
      { id: 'hex', icon: '🔢', name: 'Hex ↔ 텍스트', nameEn: 'Hex ↔ Text', desc: 'UTF-8 바이트 기준 16진수 변환', descEn: 'UTF-8 bytes ↔ hexadecimal' },
      { id: 'unicode', icon: '✳️', name: 'Unicode 이스케이프', nameEn: 'Unicode Escape', desc: '\\uXXXX ↔ 문자 변환', descEn: '\\uXXXX ↔ characters' },
    ],
  },
  {
    name: '해시 & 생성',
    en: 'Hash & Generate',
    tools: [
      { id: 'hash', icon: '🔒', name: '해시 생성기', nameEn: 'Hash Generator', desc: 'SHA-1/256/384/512 동시 출력', descEn: 'SHA-1/256/384/512 at once' },
      { id: 'uuid', icon: '🆔', name: 'UUID 생성기', nameEn: 'UUID Generator', desc: 'UUID v4, 개수·대소문자 옵션', descEn: 'UUID v4 with options' },
      { id: 'password', icon: '🔑', name: '비밀번호 생성기', nameEn: 'Password Generator', desc: '암호학적 난수, 길이·문자셋 옵션', descEn: 'Cryptographically secure random' },
      { id: 'secret', icon: '🗝️', name: '시크릿 키 생성기', nameEn: 'Secret Key Generator', desc: 'openssl rand 대체 — Hex/Base64 키', descEn: 'openssl rand replacement — hex/Base64 keys' },
      { id: 'hmac', icon: '🛡️', name: 'HMAC 생성기', nameEn: 'HMAC Generator', desc: 'HMAC-SHA256/384/512, hex·Base64', descEn: 'HMAC-SHA256/384/512, hex/Base64' },
      { id: 'md5', icon: '🧮', name: 'MD5 해시', nameEn: 'MD5 Hash', desc: '순수 JS 구현 (체크섬·레거시용)', descEn: 'Pure JS, checksum/legacy use' },
    ],
  },
  {
    name: '시간 & 날짜',
    en: 'Time & Date',
    tools: [
      { id: 'timestamp', icon: '⏱️', name: 'Unix 타임스탬프', nameEn: 'Unix Timestamp', desc: '초/밀리초 자동 감지, 타임존·상대시간', descEn: 's/ms auto-detect, timezone, relative' },
      { id: 'cron', icon: '⏰', name: 'Cron 표현식 해석기', nameEn: 'Cron Parser', desc: '자연어 설명 + 다음 실행 시각', descEn: 'Human description + next runs' },
      { id: 'timezone', icon: '🌍', name: '타임존 변환기', nameEn: 'Timezone Converter', desc: '여러 도시 시각 동시 표시', descEn: 'Multiple cities at once' },
      { id: 'datediff', icon: '📅', name: '날짜 차이 계산기', nameEn: 'Date Difference', desc: '두 날짜 사이 일/시/분 + 달력 기준', descEn: 'Days/hours/minutes + calendar breakdown' },
    ],
  },
  {
    name: '텍스트 & 정규식',
    en: 'Text & Regex',
    tools: [
      { id: 'regex', icon: '🎯', name: '정규식 테스터', nameEn: 'Regex Tester', desc: '매치 하이라이트 + 캡처 그룹', descEn: 'Match highlight + capture groups' },
      { id: 'case', icon: '🔠', name: '케이스 변환기', nameEn: 'Case Converter', desc: 'camel/snake/kebab/Pascal 등 동시 변환', descEn: 'camel/snake/kebab/Pascal and more' },
      { id: 'diff', icon: '🔀', name: '텍스트 Diff 비교', nameEn: 'Text Diff', desc: '라인 단위 diff (LCS)', descEn: 'Line-based diff (LCS)' },
      { id: 'textstats', icon: '📈', name: '텍스트 통계', nameEn: 'Text Statistics', desc: '글자·단어·줄·바이트 수', descEn: 'Chars, words, lines, bytes' },
      { id: 'lines', icon: '📑', name: '줄 정렬/중복 제거', nameEn: 'Line Sort/Unique', desc: 'sort / unique / reverse', descEn: 'sort / unique / reverse' },
      { id: 'lorem', icon: '📝', name: 'Lorem Ipsum 생성기', nameEn: 'Lorem Ipsum', desc: '문단·문장·단어 단위 채움 텍스트', descEn: 'Paragraphs, sentences, words' },
      { id: 'markdown', icon: '📄', name: 'Markdown 미리보기', nameEn: 'Markdown Preview', desc: '실시간 렌더 + HTML 출력', descEn: 'Live preview + HTML output' },
      { id: 'slice', icon: '✂️', name: '문자열 자르기', nameEn: 'Text Slice', desc: '앞/뒤 N자만 남기거나 잘라내기', descEn: 'Take or drop first/last N characters' },
      { id: 'slug', icon: '🐌', name: 'Slug 생성기', nameEn: 'Slug Generator', desc: '제목 → URL slug (한글 로마자 변환)', descEn: 'Title → URL slug, Hangul romanization' },
    ],
  },
  {
    name: '색상 & 디자인',
    en: 'Color & Design',
    tools: [
      { id: 'color', icon: '🎨', name: '색상 변환기', nameEn: 'Color Converter', desc: 'HEX ↔ RGB(A) ↔ HSL(A) + OKLCH', descEn: 'HEX ↔ RGB(A) ↔ HSL(A) + OKLCH' },
      { id: 'contrast', icon: '🌓', name: '대비 검사기 (WCAG)', nameEn: 'Contrast Checker', desc: '대비비율 + AA/AAA 통과 여부', descEn: 'Ratio + WCAG AA/AAA pass' },
      { id: 'gradient', icon: '🌈', name: '그라디언트 생성기', nameEn: 'Gradient Generator', desc: 'CSS gradient 코드 + 프리뷰', descEn: 'CSS gradient code + preview' },
      { id: 'bezier', icon: '〰️', name: 'Cubic-bezier 에디터', nameEn: 'Cubic-bezier Editor', desc: '드래그 곡선 + CSS 타이밍 함수', descEn: 'Drag curve + CSS timing function' },
      { id: 'boxshadow', icon: '🔲', name: 'box-shadow 생성기', nameEn: 'Box-shadow Generator', desc: '다중 레이어 그림자 + 프리뷰', descEn: 'Multi-layer shadows + preview' },
      { id: 'favicon', icon: '⭐', name: '파비콘 생성기', nameEn: 'Favicon Generator', desc: '이미지 → 16~512px PNG + ICO', descEn: 'Image → 16-512px PNG + ICO' },
    ],
  },
  {
    name: '기타',
    en: 'Misc',
    tools: [
      { id: 'radix', icon: '🔟', name: '진법 변환기', nameEn: 'Radix Converter', desc: '2/8/10/16진수 상호 변환 (BigInt)', descEn: 'Bin/oct/dec/hex, BigInt' },
      { id: 'qrcode', icon: '🔳', name: 'QR 코드 생성기', nameEn: 'QR Code Generator', desc: '텍스트·URL → QR (PNG 다운로드)', descEn: 'Text/URL → QR, PNG download' },
      { id: 'imageresize', icon: '🖼️', name: '이미지 리사이즈/압축', nameEn: 'Image Resize', desc: 'Canvas 기반, JPEG/WebP/PNG', descEn: 'Canvas-based, JPEG/WebP/PNG' },
      { id: 'httpref', icon: '📚', name: 'HTTP 레퍼런스', nameEn: 'HTTP Reference', desc: '상태 코드 + MIME 타입 사전', descEn: 'Status codes + MIME types' },
      { id: 'chmod', icon: '🔐', name: 'Chmod 계산기', nameEn: 'Chmod Calculator', desc: '755 ↔ rwxr-xr-x 상호 변환', descEn: '755 ↔ rwxr-xr-x' },
    ],
  },
];

// URL 입력 공유가 가능한 도구: id → 대표 입력 셀렉터 (해당 도구 섹션 내부 기준)
export const SHAREABLE = {
  json: '#json-input',
  xml: '#xml-input',
  yaml: '#yaml-input',
  sql: '#sql-input',
  jsoncsv: '#jc-input',
  jsondiff: '#jd-a',
  curl: '#curl-input',
  base64: '#b64-input',
  url: '#url-input',
  jwt: '#jwt-input',
  entity: '#ent-input',
  hex: '#hex-input',
  unicode: '#uni-input',
  hash: '#hash-input',
  hmac: '#hmac-message',
  md5: '#md5-input',
  timestamp: '#ts-input',
  cron: '#cron-input',
  regex: '#re-pattern',
  case: '#case-input',
  diff: '#diff-a',
  textstats: '#stats-input',
  lines: '#lines-input',
  markdown: '#md-input',
  slice: '#slice-input',
  slug: '#slug-input',
  color: '#color-input',
  radix: '#radix-dec',
  qrcode: '#qr-input',
  httpref: '#href-filter',
};
