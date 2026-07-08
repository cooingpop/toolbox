# 🧰 DevTools Hub

개발자·디자이너·프론트엔드가 매일 쓰는 유틸리티를 한 페이지에 모은 **순수 정적 웹 도구 모음**입니다.

🔗 **배포 URL:** https://cooingpop.github.io/toolbox/

## 🔒 프라이버시

**모든 처리는 브라우저 안에서만 이루어지며 어떤 데이터도 서버로 전송되지 않습니다.**
JWT 토큰, 해시 입력, 파일 등 모든 입력은 이 페이지를 벗어나지 않습니다.
네트워크 요청 없이 브라우저 네이티브 API(Web Crypto, Intl 등)만 사용합니다.

## 도구 목록

### 포맷 & 변환
- **JSON 포매터/뷰어** — JSON을 붙여넣고 Pretty(들여쓰기 2/4/tab)·Minify·Validate. 문법 오류 시 줄/열 위치를 알려줍니다.
- **XML 포매터** — 들여쓰기 정리·압축·유효성 검사. 주석·CDATA·XML 선언 보존.
- **JSON ↔ YAML 변환** — 양방향 변환 (자체 구현). 앵커·블록 스칼라·태그 등 미지원 문법은 명확히 안내.
- **SQL 포매터** — 주요 절(SELECT/FROM/WHERE/JOIN…) 기준 개행·들여쓰기, 키워드 대소문자 옵션, 서브쿼리 인식.

### 인코딩 & 디코딩
- **Base64 인코더/디코더** — 텍스트 ↔ Base64 양방향 변환(UTF-8 안전). URL-safe 옵션, 이미지 → data URI 지원.
- **URL 인코더/디코더** — 컴포넌트(`encodeURIComponent`) / 전체 URI(`encodeURI`) 모드 선택 후 실시간 변환.
- **JWT 디코더** — 토큰을 붙여넣으면 header/payload를 디코딩하고 `exp`/`iat`/`nbf`를 사람이 읽는 시각으로 표시. 시크릿 키 입력 시 HS256/384/512 서명 검증.
- **HTML 엔티티 인/디코더** — `&lt;` ↔ `<` 등 명명/숫자 엔티티 변환. 비ASCII 문자의 `&#x...;` 변환 옵션.
- **Hex ↔ 텍스트** — UTF-8 바이트 기준 16진수 변환. 공백·`0x` 접두어 허용.
- **Unicode 이스케이프/언이스케이프** — `\uXXXX`·`\u{XXXXX}` ↔ 문자. 이모지(서로게이트 쌍) 지원.

### 해시 & 생성
- **해시 생성기** — 텍스트 또는 파일의 SHA-1/256/384/512 해시를 동시에 출력 (Web Crypto).
- **UUID 생성기** — UUID v4를 1~100개 생성. 대문자·하이픈 제거 옵션.
- **비밀번호/랜덤 문자열 생성기** — `crypto.getRandomValues` 기반. 길이·문자셋·혼동 문자 제외 옵션 + 엔트로피 표시.
- **HMAC 생성기** — HMAC-SHA256/384/512/SHA-1을 hex와 Base64로 출력.
- **MD5 해시** — 순수 JS 자체 구현(RFC 1321). 체크섬·레거시 호환 용도 (암호학적으로는 안전하지 않음).

### 시간 & 날짜
- **Unix 타임스탬프 변환기** — 초/밀리초 자동 감지. ISO 8601·로컬·선택 타임존·상대 시간 표시, 날짜 → 타임스탬프 역변환.
- **Cron 표현식 해석기** — 표준 5필드(옵션: 초 포함 6필드) cron을 한국어로 설명하고 선택 타임존 기준 다음 실행 시각 5개를 계산. `*` 범위 리스트 스텝 이름(`MON`,`JAN`) 별칭(`@daily`) 지원.
- **타임존 변환기** — 기준 타임존의 시각을 여러 도시로 동시 변환. 도시 추가/제거, DST 자동 반영.
- **날짜 차이 계산기** — 두 날짜 사이를 총 일/시/분과 달력 기준(년·개월·일)으로 계산. D-day 포함.

### 텍스트 & 정규식
- **정규식 테스터** — 패턴·플래그(`gimsuy`)·테스트 문자열을 입력하면 실시간 매치 하이라이트 + 캡처 그룹 테이블 + 치환 미리보기.
- **케이스 변환기** — 입력을 camelCase/PascalCase/snake_case/kebab-case/CONSTANT_CASE/Title Case 등으로 동시 변환. 여러 줄 지원.
- **텍스트 Diff 비교** — 두 텍스트를 라인 단위로 비교(LCS). 추가/삭제 하이라이트, 동일 줄 숨기기.
- **텍스트 통계** — 글자(공백 포함/제외)·단어·줄·문단·UTF-8 바이트 수 실시간 계산.
- **줄 정렬/중복 제거** — sort(숫자 인식)/unique/reverse/trim/빈 줄 제거.
- **Lorem Ipsum 생성기** — 문단/문장/단어 단위 채움 텍스트 생성.

### 색상 & 디자인
- **색상 변환기** — HEX(`#RGB`/`#RRGGBB`/`#RRGGBBAA`) ↔ RGB(A) ↔ HSL(A) 실시간 상호 변환 + 프리뷰 스와치.
- **대비 검사기 (WCAG)** — 전경/배경색의 명도 대비비율과 AA/AAA 통과 여부 + 실시간 미리보기.
- **그라디언트 생성기** — 색상 정지점을 조절해 `linear/radial-gradient` CSS 코드 생성.
- **Cubic-bezier 이징 에디터** — 제어점을 드래그해 `cubic-bezier()` 타이밍 함수 생성 + 애니메이션 프리뷰.
- **box-shadow 생성기** — 슬라이더로 다중 레이어 그림자 조절 + 실시간 프리뷰 + CSS 출력.

### 기타
- **진법 변환기** — 2/8/10/16진수 상호 변환. BigInt로 자릿수 제한 없음, 음수·`0x` 접두어 지원.
- **QR 코드 생성기** — 텍스트·URL → QR 코드 (오류 복원 레벨·크기 옵션, PNG 다운로드). 유일하게 라이브러리를 사용: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT, `/vendor/`에 vendored).
- **이미지 리사이즈/압축** — Canvas API로 크기 조절 + JPEG/WebP/PNG 변환 + 품질 조절. 파일은 업로드되지 않음.

## 로컬 실행

ES 모듈을 사용하므로 `index.html`을 더블클릭(`file://`)으로 열면 동작하지 않습니다.
정적 서버로 열어주세요:

```bash
# 방법 1: Python
python -m http.server 8000

# 방법 2: Node
npx serve .
```

그다음 http://localhost:8000 접속. (VS Code Live Server 확장도 가능)

## 기술 스택

- **Vanilla JS (ES2020+)** — 프레임워크·빌드 스텝 없음. 외부 라이브러리는 QR 코드 생성용 단일 파일 1개(`vendor/qrcode.mjs`, MIT)뿐
- **브라우저 네이티브 API** — Web Crypto(`crypto.subtle`), `crypto.randomUUID()`, `Intl.DateTimeFormat`, `TextEncoder`/`TextDecoder` 등
- **GitHub Pages** — 정적 파일 그대로 배포 (상대경로 리소스 참조)

## 배포 (GitHub Pages)

1. 리포지토리 **Settings → Pages** → Source를 `main` 브랜치 `/ (root)`로 지정
2. 몇 분 후 `https://cooingpop.github.io/toolbox/` 접속

## 구조

```
index.html          # 셸: 사이드바 네비 + 도구 컨테이너
css/styles.css      # 디자인 토큰 + 공통 + 도구별 스타일
js/app.js           # 해시 라우팅, 테마 토글, 사이드바
js/tools/*.js       # 도구별 모듈 (export function init(container))
js/utils/           # DOM 헬퍼, 클립보드+토스트
vendor/             # 단일 파일 라이브러리 — qrcode.mjs (MIT) 1개
```

## 라이선스

MIT
