---
name: myblog-harness
description: MY-BLOG 프로젝트의 하네스(작업 규칙 CLAUDE.md, 기술 스택, 검증/리뷰 루프, Claude Code 권한 설정)를 한 번에 파악해야 할 때 사용한다. 새 세션이나 외부 서브에이전트(Gemini CLI 등)에게 이 프로젝트가 어떻게 돌아가는지 통째로 브리핑할 때, 혹은 하네스 자체를 점검·감사·수정할 때 이 스킬을 연다. 이 스킬은 CLAUDE.md와 ~/.claude/settings.json의 스냅샷이므로, 원본이 바뀌면 이 파일도 함께 갱신해야 하는 살아있는 문서다.
---

# MY-BLOG 하네스 요약

이 문서 하나로 "이 프로젝트에서 Claude Code가 어떤 규칙 아래, 어떤 기술 스택으로,
어떤 방식으로 검증받으며, 어떤 권한으로 작업하는지"를 파악할 수 있다.

**원본은 아래와 같고, 이 스킬은 그것들의 통합 스냅샷이다. 실제 동작이 이 문서와
다르면 원본이 맞다 — 발견 즉시 이 스킬 파일을 갱신할 것.**

- 작업 규칙 원본: `/home/hugok/MY-BLOG/CLAUDE.md`
- 권한/모델/샌드박스 원본: `~/.claude/settings.json` (전역, 이 프로젝트 전용 설정 파일은 없음)
- 카테고리 소스: `/home/hugok/MY-BLOG/js/home.js`의 `CATEGORIES` 배열

---

## 1. 프로젝트 개요

마크다운 기반 블로그 + 미니 웹앱 포트폴리오. GitHub Pages로 정적 호스팅
(`.nojekyll` 존재 → Jekyll 처리 안 함, 리포 그대로 서빙). 원격: `origin` →
`github.com/jaewon76kim-glitch/MY-BLOG`.

## 2. 기술 스택

- **빌드 도구 없음.** `package.json` 없음, npm/번들러 미사용. 순수 HTML + CSS + JS만 사용.
- 프론트엔드 라이브러리는 CDN 대신 **벤더링(`js/vendor/`, `apps/*/js/vendor/`)** 방식으로 저장:
  - `js/vendor/marked.min.js` — 마크다운 렌더링 (`js/post.js`에서 사용)
  - `js/vendor/highlight.min.js` — 코드 하이라이팅
  - `apps/doppler-sim/js/vendor/chart.umd.min.js` — 차트 (도플러 시뮬 앱 전용)
- 페이지 구성: `index.html`(글 목록/필터), `post.html`(글 상세, 마크다운 렌더링),
  `apps/{앱이름}/index.html`(독립 웹앱).
- 다크모드: `js/theme.js`를 `<head>`에서 최우선 로드해 깜빡임(FOUC) 방지.
- 데이터: 글 메타데이터는 `posts/index.json` 배열, 본문은 `posts/{slug}.md`
  (frontmatter: title/date/tags/description).
- 로컬 구동/확인: `python3 -m http.server`로 정적 서빙 후 curl/브라우저 확인
  (별도 dev server 스크립트 없음).

## 3. CLAUDE.md 규칙 전문 요약

### 3.1 웹앱 작업 사이클 (Plan → Build → Review → Embed)

사용자가 웹앱 주제를 요청하면:

1. **Plan** — 서브에이전트로 계획 작성. 주제는 `C:\Users\hugok\Claude\Projects\doc`
   하위 폴더(WSL: `/mnt/c/Users/hugok/Claude/Projects/doc/`) 중 하나의 최종 pdf/tex
   내용 기반. 어떤 웹앱을 만들지, 파일 구조를 `spec.md`로 저장하고 **사용자 승인**을 받는다.
2. **Build** — 서브에이전트로 구현. `/apps/{앱이름}/` 폴더에 독립적으로 생성.
   블로그의 다른 파일은 건드리지 않는다.
3. **Review** — Build와 **별도의** 서브에이전트로 검증. 브라우저 정상 동작 + 코드
   문제 확인 후 `review.md` 작성. 문제 있으면 수정.
4. **Embed** — `index.html`에 웹앱 카드(`.app-card`) 추가. 제목/설명/미리보기.
   `data-category` 속성을 카테고리 목록 중 하나로 지정(§3.3). 커밋한다.

### 3.2 서브에이전트 규칙

- 서브에이전트에게 작업을 넘길 때 **전용 지침 파일(.md)**을 만들어 전달한다.
- **Build 서브에이전트와 Review 서브에이전트는 반드시 분리**한다.
- 서브에이전트는 지침 파일에 명시된 범위만 수정한다.

### 3.3 카테고리 (고정 순서, `js/home.js`의 `CATEGORIES`와 반드시 일치)

```
위성통신, 머신러닝과_인공지능, OS, 해석역학과_장이론,
물리전자와_반도체공학, 무한과_극한, 독서, 소설, 유튜브_목록
```

- `doc/` 하위 폴더 이름이 곧 카테고리. 새 글(`posts/index.json`의 `category`)과
  새 웹앱 카드(`data-category`)는 반드시 이 중 하나를 지정.
- 목록에 없는 새 폴더를 다루면 이 목록(및 `js/home.js`)에 추가.
- 프로젝트 자체가 소재인 글(블로그 운영기 등)은 `기타`.

### 3.4 웹앱 규칙

- 모든 웹앱은 `/apps/{앱이름}/` 안에 자체 완결.
- 외부 라이브러리 최소화. **CDN은 허용**하되 이 리포 관례상 벤더링을 선호(§2).
- 모바일 대응 필수.

### 3.5 공통 규칙

- **승인 없이 구현을 시작하지 않는다.**
- 막히면 사용자에게 알린다.

### 3.6 post-article 스킬 (텍스트 글 전용 변형)

텍스트 글(포스트)을 올릴 때는 위 웹앱 사이클을 그대로 쓰지 않고
`.claude/skills/post-article/SKILL.md`를 따른다. 핵심 차이:

- **CLAUDE.md의 "서브에이전트 규칙"(§3.2)은 적용하지 않는다** — 글 하나는 파일
  1~2개(`posts/{slug}.md`, `posts/index.json`)만 건드리는 작은 작업이라 본 대화
  에이전트가 직접 Plan/Build/Review를 수행한다(여러 편을 동시에 쓰는 등 커지면
  예외적으로 서브에이전트 위임).
- Plan 단계 승인은 받되, `spec.md` 파일을 따로 만들 필요는 없음(대화 중 제시 +
  승인으로 충분).
- Embed(웹앱 카드 추가) 단계는 해당 없음 — `posts/index.json` 등록 자체가 게시.
- **예외적으로, 자체 점검(Review)을 통과하면 커밋+푸시까지 승인 없이 자동
  진행한다** (2026-07-18 사용자 명시적 지시 — 공통 규칙 §3.5의 "승인 없이 시작
  안 함"을 글 게시 워크플로우에 한해 뒤집는 유일한 예외).

## 4. 검증/리뷰 루프

이 프로젝트가 실제로 사용해 온 검증 패턴:

1. **웹앱 1차 검증 — `review.md` (체크리스트 기반, 별도 Review 서브에이전트)**
   파일 완전성 → 제약 조건 준수 → HTML/JS/CSS 구조 → 로직/수치 검증 →
   발견된 문제 → 수정 권고 순으로 항목별 체크(예: `review.md`의 doppler-sim
   검증 — 물리 공식을 Node.js로 재계산해 수치 검증까지 수행).
2. **2차 독립 리뷰 — `gemini-review.md` (새 관점, 1차와 중복 금지)**
   원래는 Gemini CLI 헤드리스 모드로 "제3자 관점"을 얻으려 했으나, 무료 API
   할당량 소진 등으로 Gemini CLI가 막히면 일반 Claude 서브에이전트가 대신
   **1차 리뷰(`review.md`)를 먼저 읽고, 거기 없는 새로운 문제만** 찾아
   `gemini-review.md`에 기록하는 방식으로 대체한다. 이 서브에이전트는
   읽기 전용(파일 수정 금지)이며, 본 대화 에이전트가 결과를 읽고 타당한
   지적만 골라 직접 수정한다.
   - Gemini CLI 상태 확인: `gemini --version`, 인증은
     `~/.gemini/settings.json`의 `security.auth.selectedType` (현재
     `gemini-api-key`, 무료 티어라 `generativelanguage.googleapis.com` 일일
     할당량 20회 제한에 걸릴 수 있음 — `gemini -p "..."` 실행 시
     `TerminalQuotaError`로 확인 가능).
3. **범용 리뷰/검증 스킬** (프로젝트 전용은 아니지만 이 리포에서도 사용 가능):
   - `/code-review` — 현재 diff의 정확성 버그 + 재사용/단순화/효율 개선점 검토
     (effort: low/medium/high/xhigh/ultra, `--fix`로 바로 적용 가능).
   - `/verify` — 변경한 기능을 실제로 브라우저/서버에서 구동해 end-to-end로
     동작 확인 (테스트/타입체크만으로는 부족한 "진짜 동작하는지"를 확인).
   - `/simplify` — 버그가 아닌 재사용성/단순화/효율 관점 정리 후 바로 적용.

## 5. 권한(Permissions) 설정

이 프로젝트 전용 `.claude/settings.json`은 없고, `~/.claude/settings.json`
전역 설정을 그대로 사용한다(2026-07-18 대규모 정리 완료 — 이 스킬 아래
"업데이트 필요" 참고).

- **model**: `claude-sonnet-5`
- **sandbox**: `enabled: true`
  - 네트워크 허용 도메인: `github.com`, `api.github.com`, `npmjs.org`,
    `registry.npmjs.org`
  - 파일시스템 쓰기 허용: `/home/hugok` 전체
- **추가 작업 디렉토리(additionalDirectories)**: `/home/hugok/.claude`,
  `/home/hugok/HUGOK`(+`common`, `doc`), `/home/hugok/.vscode/extensions`,
  `/mnt/e/HUGOK_docs`, `/home/hugok/MY-BLOG/.claude/skills`, `/tmp`
- **deny 규칙** (항상 차단): `rm -rf`류 전체, `chmod 777`류, `curl|sh`/`wget|sh`
  파이프 실행, `git push --force`/`-f`, `git reset --hard`
- **allow 규칙 중 이 프로젝트와 관련 있는 것들**:
  - `Bash(git *)`, `Bash(gh *)` — 커밋/PR 작업
  - `Bash(python3 *)` — 로컬 정적 서버(`http.server`)로 웹앱/글 확인
  - `Bash(node *)`, `Bash(npm *)`, `Bash(npx *)` — 필요 시 빌드/스크립트 확인용
    (이 리포 자체는 미사용이지만 doc 폴더 tex→pdf 변환 등에 씀)
  - `Read(/home/hugok/**)`, `Read(//mnt/c/Users/hugok/Claude/Projects/doc/**)`
    — 웹앱/글 소재가 되는 doc 폴더 tex/pdf 원본 읽기
  - `Edit(/.claude/skills/post-article/**)` — post-article 스킬 파일은
    승인 없이 직접 갱신 허용
  - `Skill(update-config)`, `Skill(claude-api)`, `Skill(artifact-design)` —
    확인 없이 바로 호출 허용
  - `Bash(gemini --version)`, `Bash(timeout 30 gemini -p "...")`,
    `Read(//home/hugok/.gemini/**)` — Gemini CLI 상태 점검용(§4.2)
- **GitHub MCP**: `~/.claude.json` → `mcpServers.github`에 전역(사용자 범위)
  등록. 모든 프로젝트(MY-BLOG 포함)에서 공유. 토큰은
  `GITHUB_PERSONAL_ACCESS_TOKEN` 환경변수로 주입. `settings.json`에는
  `mcpServers` 필드를 넣지 않는다(넣으면 오류).
- **Stop 훅**: 세션 종료 시 `python3 /home/hugok/.claude/hooks/usage_tracker.py` 실행.

## 6. 유지보수 메모

- 이 스킬은 CLAUDE.md/설정 파일의 **스냅샷**이다. 아래 경우 반드시 갱신할 것:
  - CLAUDE.md의 작업 사이클/카테고리/규칙이 바뀔 때
  - `~/.claude/settings.json`의 allow/deny/sandbox/hooks가 바뀔 때
  - `js/home.js`의 `CATEGORIES` 배열에 새 카테고리가 추가될 때
  - 검증 루프에 새로운 패턴(예: 다른 외부 CLI로 리뷰)이 추가될 때
- 권한/모델 설정을 직접 바꾸는 작업은 이 스킬이 아니라 `update-config` 스킬로
  한다. 이 스킬은 어디까지나 "현재 상태를 브리핑"하는 용도지 설정을 변경하는
  도구가 아니다.
