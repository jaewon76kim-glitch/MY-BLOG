# MY-BLOG

마크다운(.md) 파일을 읽어 정적 블로그 웹사이트로 렌더링하는 프로젝트.
외부 프레임워크나 빌드 도구 없이 순수 HTML, CSS, JavaScript만 사용한다.

## 프로젝트 목표

- `posts/` 디렉토리의 마크다운 파일을 읽어 브라우저에서 렌더링
- 깔끔하고 읽기 좋은 타이포그래피 중심 디자인
- 다크 모드 지원 (시스템 설정 + 수동 토글)
- 모바일 퍼스트 반응형 레이아웃
- 빌드 과정 없이 파일을 열거나 정적 서버로 바로 동작

## 기술 스택

- **HTML/CSS/JS 만 사용** — React, Vue, npm, 번들러 없음
- 마크다운 파싱: `marked.js` (CDN 대신 `js/vendor/marked.min.js`로 로컬 복사)
- 코드 하이라이팅: `highlight.js` (`js/vendor/highlight.min.js`로 로컬 복사)
- 라우팅: URL hash(`#/post/slug`) 기반 클라이언트 사이드 라우터 (직접 구현)

## 디렉토리 구조

```
MY-BLOG/
├── CLAUDE.md
├── index.html              # 진입점 (목록 + 단일 포스트 뷰를 하나의 SPA로)
├── css/
│   ├── style.css           # 전체 스타일 (변수, 레이아웃, 타이포그래피)
│   └── code.css            # 코드 블록 테마 (light/dark 대응)
├── js/
│   ├── main.js             # 앱 진입점, 라우터 초기화
│   ├── router.js           # 해시 기반 라우터
│   ├── posts.js            # posts/index.json 로드 및 포스트 메타 관리
│   ├── render.js           # 마크다운 → HTML 변환 및 DOM 업데이트
│   └── vendor/
│       ├── marked.min.js   # 마크다운 파서 (로컬 복사)
│       └── highlight.min.js # 코드 하이라이터 (로컬 복사)
└── posts/
    ├── index.json          # 포스트 목록 메타데이터 (수동 또는 스크립트로 관리)
    └── *.md                # 실제 블로그 포스트 파일
```

## 포스트 형식

마크다운 파일 상단에 YAML frontmatter를 사용한다 (간단한 파서 직접 구현):

```markdown
---
title: 포스트 제목
date: 2026-01-15
tags: [javascript, web]
description: 짧은 요약문
---

본문 내용...
```

`posts/index.json` 형식:

```json
[
  {
    "slug": "my-first-post",
    "title": "첫 번째 포스트",
    "date": "2026-01-15",
    "tags": ["javascript"],
    "description": "요약"
  }
]
```

## 라우팅

| URL 해시 | 뷰 |
|---|---|
| `#/` 또는 비어있음 | 포스트 목록 |
| `#/post/:slug` | 단일 포스트 (`posts/:slug.md` 로드) |
| `#/tag/:name` | 태그 필터 목록 |

## 디자인 원칙

- CSS 커스텀 프로퍼티(`--color-*`, `--font-*`)로 라이트/다크 테마 관리
- `prefers-color-scheme: dark` 미디어 쿼리 기본 적용, `:root[data-theme]` 토글 우선
- 본문 최대 너비 `680px`, 중앙 정렬
- 폰트: 시스템 폰트 스택 (외부 폰트 로드 없음)
- 모바일 기준점: `max-width: 640px`

## CSS 변수 규칙

```css
/* 반드시 :root에 정의하고 data-theme으로 오버라이드 */
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-muted: #6b7280;
  --color-accent: #2563eb;
  --color-border: #e5e7eb;
  --color-code-bg: #f3f4f6;
}
:root[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-text: #e2e8f0;
  /* ... */
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark 값 */ }
}
```

## 개발 방법

```bash
# Python 로컬 서버 (fetch가 file:// 프로토콜에서 동작 안 하므로 필수)
python3 -m http.server 8080

# 또는
npx serve .
```

`index.html`을 직접 file:// 로 열면 fetch가 막히므로 반드시 로컬 서버를 사용한다.

## 코딩 컨벤션

- JavaScript: ES2020+, 모듈(type="module"), async/await
- 클래스/ID 네이밍: kebab-case
- 파일 하나에 하나의 책임 (router.js는 라우팅만, render.js는 렌더링만)
- 전역 변수 최소화 — 모듈 export/import 사용
- 주석은 "왜"가 비자명할 때만 작성

## 금지 사항

- npm install, 번들러(webpack, vite 등), 프레임워크(React, Vue 등) 사용 금지
- CDN URL로 외부 스크립트 로드 금지 — vendor 디렉토리에 로컬 복사본 사용
- `<table>`, `<frame>` 같은 레이아웃용 HTML 요소 사용 금지 — flexbox/grid 사용
