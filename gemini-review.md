# 2차 독립 리뷰 (review.md 대비 추가 발견 사항)

## 요약

`review.md`(doppler-sim 체크리스트, PASS 판정)와 겹치지 않는 관점 — 블로그 코어(index.html, post.html,
js/home.js, js/post.js, js/theme.js), CSS, posts/index.json, posts/*.md, .claude/skills/post-article/SKILL.md —
를 대상으로 리뷰했다. `review.md`가 지적했던 "별 반짝임(Math.random) 코스메틱 이슈"는
`apps/doppler-sim/js/renderer.js`의 현재 코드(`stars` 배열에 고정 alpha 사용, 61~68행)에서
이미 해결되어 있음을 확인했다 — 재지적하지 않는다.

새로 발견한 문제는 **4건**이며 기능을 깨뜨리는 심각한 버그(상)는 없다. 보안 관련 1건(중),
데이터 정합성 1건(하~중, UX에 실제로 드러남), 접근성 1건(하), 코드 품질/캡슐화 1건(하)이다.

## 발견된 문제

### [심각도: 중] marked로 렌더링한 마크다운 본문에 sanitize 단계가 없음

- 파일: `js/post.js:108-116`, `posts/*.md` (frontmatter는 아님, 본문만 해당)
- 문제 설명: `post.html`은 `marked.min.js` v15.0.12(`js/vendor/marked.min.js` 헤더 확인)를 사용해
  `marked.parse(content)`로 변환한 HTML을 그대로 `article.innerHTML = ...` 안에 삽입한다
  (`js/post.js:109`, `116`). `configureMarked()`(`js/post.js:86-88`)는 `gfm`, `breaks`만 설정할 뿐
  sanitize 옵션이나 DOMPurify 같은 별도 새니타이즈 단계를 전혀 거치지 않는다. marked v1+ 는
  자체 sanitize 옵션을 제거했고 기본적으로 마크다운 안에 섞인 raw HTML(`<script>`, `onerror=`
  등)을 이스케이프 없이 그대로 통과시킨다. 저장소 전체를 `grep -rn "sanitize\|DOMPurify"`로
  검색한 결과 어디에도 해당 로직이 없음을 확인했다.
- 재현/발생 조건: 현재는 `posts/*.md`가 전부 블로그 운영자 본인이 작성한 신뢰된 콘텐츠라
    실질 위험은 낮다. 다만 (a) 향후 외부 소스에서 마크다운을 복사/번역해 붙여넣거나,
    (b) 다른 사람이 PR로 글을 기여하는 절차가 생기거나, (c) 실수로 마크다운 안에
    `<script>`나 `<img onerror=...>` 같은 raw HTML을 남기는 경우, 별도 방어층 없이 그대로
    실행된다. 참고로 `js/home.js`와 `js/post.js`의 frontmatter 필드(title/description/tags)는
    `escapeHtml()`로 이스케이프되어 있어 안전하다 — 이 문제는 마크다운 **본문**에만 해당한다.
- 수정 제안: `js/vendor/`에 DOMPurify를 추가해 `marked.parse(content)` 결과를 `DOMPurify.sanitize(...)`로
  한 번 거른 뒤 `innerHTML`에 대입하거나, 최소한 `marked.use({ renderer: { html: () => '' } })` 같은
  방식으로 raw HTML 패스스루를 차단하는 것을 고려.

### [심각도: 하~중] 목록 페이지와 글 상세 페이지의 "읽기 N분" 표시가 서로 다름

- 파일: `posts/index.json:9` (ntn-sib19), `posts/index.json:54` (markdown-guide), `js/home.js:22-25`,
  `js/post.js:26-29`
- 문제 설명: 홈 화면 아카이브 목록(`js/home.js`)은 `posts/index.json`에 저장된 정적
  `wordCount` 필드로 `readingTime(wordCount) = Math.max(1, Math.round(wordCount/200))`를 계산하는
  반면, 글 상세 페이지(`js/post.js`)는 실제로 fetch한 마크다운 본문 텍스트를 공백 기준으로
  분리해 `readingTime(content)`를 그 자리에서 다시 계산한다 — 즉 같은 글에 대해 서로 다른
  두 값 소스가 존재한다. `posts/index.json`의 `wordCount`가 실제 본문과 어긋나는 글이 있어
  두 페이지에 표시되는 분(分) 수가 달라진다.
  - `ntn-sib19`: `index.json`에 `"wordCount": 328` → 목록 페이지 "읽기 2분". 실제 본문
    (`posts/ntn-sib19.md`, frontmatter 제외)을 공백 기준으로 세면 약 505 단어 →
    상세 페이지 "읽기 3분".
  - `markdown-guide`: `index.json`에 `"wordCount": 320` → 목록 페이지 "읽기 2분". 실제 본문
    (`posts/markdown-guide.md`)은 약 236 단어 → 상세 페이지 "읽기 1분".
  - 나머지 4개 글(`doppler-sim-devlog`, `ntn-doppler-precompensation`, `hello-world`,
    `today-i-learned`)은 우연히 반올림 결과가 같아서 눈에 띄지 않는다.
- 참고: `.claude/skills/post-article/SKILL.md`는 "wordCount는 대략치, 정확할 필요 없음"이라고
  명시하고 있어 이 자체가 스킬 문서상 "허용된" 근사치이긴 하다. 다만 실제로 사용자가
  목록에서 본 예상 소요 시간과 클릭 후 본문에서 보는 소요 시간이 달라지는 사용자 체감
  불일치가 실재하므로, review.md 관점(doppler-sim 검증)과 무관한 별개의 이슈로 기록해 둔다.
- 수정 제안: `posts/index.json`의 `wordCount`를 실제 본문 기준으로 재계산해 갱신하거나,
  두 페이지가 같은 계산 로직/소스를 공유하도록(예: 목록 페이지도 실제 본문을 fetch해서
  계산하거나, 반대로 상세 페이지도 index.json의 wordCount를 그대로 쓰도록) 통일.

### [심각도: 하] 필터 버튼에 토글 상태를 전달하는 ARIA 속성이 없고, 검색 결과 영역의 aria-live가 매 키 입력마다 전체 재낭독을 유발

- 파일: `js/home.js:49-77`(`renderCategoryFilter`), `js/home.js:91-121`(`renderTagFilter`),
  `index.html:90`(`#post-list` `aria-live="polite"`), `js/home.js:201-205`(검색 input 리스너)
- 문제 설명:
  1. `category-tab`, `tag-chip` 버튼은 활성 상태를 CSS 클래스 `.active`로만 표시하고
     `aria-pressed`(또는 `aria-selected`) 속성을 설정하지 않는다. 스크린리더 사용자는
     현재 어떤 카테고리/태그가 선택되어 있는지 인지할 방법이 없다.
  2. `#post-list`(`index.html:90`)는 `aria-live="polite"`이고, 검색창 `input` 이벤트마다
     디바운스 없이 즉시 `renderPosts()`가 전체 목록의 `innerHTML`을 다시 만든다
     (`js/home.js:202-205`, `renderPosts()` 자체는 `140-173`). 글자를 한 자씩 입력할
     때마다 스크린리더가 재구성된 목록 전체를 다시 읽어줄 수 있어 사용성이 떨어진다.
- 재현 조건: 스크린리더(NVDA/VoiceOver)로 카테고리 필터를 조작하거나 검색창에 타이핑하면서
  확인.
- 수정 제안: 버튼에 `aria-pressed`를 토글하고, 검색 input에 디바운스를 추가하거나
  결과 개수만 별도의 작은 `aria-live` 영역에 알리는 방식으로 변경.

### [심각도: 하] doppler-sim 메인 스크립트가 모듈 내부 state를 API 우회로 직접 변경

- 파일: `apps/doppler-sim/index.html:233`, `apps/doppler-sim/js/sim.js:133-135`
- 문제 설명: 속도 버튼 클릭 핸들러가 `DopplerSim.getState().speedMul = params.speedMul;`로
  `DopplerSim` 모듈의 내부 `state` 객체를 직접 변경한다. `sim.js`의 `getState()`(133-135행)는
  캡슐화를 위한 조회용 함수가 아니라 내부 `state` 객체 참조를 그대로 반환하고 있어서
  우연히 이 패턴이 동작한다. `reset()`, `step()` 등 다른 모든 상태 변경은 전용 함수를
  통하는데 이 한 곳만 `getState()`가 참조를 노출한다는 구현 디테일에 기대어 직접 대입한다.
  현재는 정상 동작하지만, 향후 `getState()`가 상태의 복사본을 반환하도록 리팩터링되면
  (캡슐화를 강화하는 자연스러운 변경) 속도 조절 기능이 조용히 깨진다.
- 수정 제안: `sim.js`에 `setSpeedMul(v)` 같은 명시적 setter를 추가하고, `index.html`의 인라인
  스크립트가 그 API를 호출하도록 변경.

## review.md와 중복 확인

- `review.md`는 `apps/doppler-sim` 단일 앱의 파일 완전성/제약조건/HTML 구조/물리 공식 체크리스트에
  한정되어 있었고, 블로그 코어(`index.html`, `post.html`, `js/home.js`, `js/post.js`, `js/theme.js`,
  `css/*`)와 `posts/index.json`/`posts/*.md`, `.claude/skills/post-article/SKILL.md`는 전혀 다루지
  않았다 — 이번 리뷰는 그 영역을 중심으로 봤다.
- `review.md`가 지적한 유일한 문제(`renderer.js`의 `Math.random()` 별 반짝임)는 현재 코드에서
  이미 고정 alpha 배열로 수정되어 있어 재지적하지 않았다.
- 물리 공식/수치 검증(GEO RTT, LEO maxDoppler 등)은 review.md에서 이미 Node.js로 충분히
  검증했으므로 다시 반복하지 않았고, `apps/doppler-sim/js/vendor/chart.umd.min.js`는 지침에 따라
  리뷰 대상에서 제외했다.
