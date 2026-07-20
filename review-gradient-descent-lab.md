# Review: gradient-descent-lab

독립 Review 서브에이전트가 `/home/hugok/MY-BLOG/apps/gradient-descent-lab/`를 직접 코드를 읽고,
Node로 실제 소스(`regression.js`, `gradient-descent.js`)를 로드해 재계산하고, 정적 서버 + curl,
`node --check`, Playwright 헤드리스 브라우저로 검증했다. Build 에이전트의 자체 보고 수치는 참고만 하고
전부 독립적으로 재현했다.

## 1. 파일 완전성

- [x] `index.html`, `css/style.css`, `js/data.js`, `js/regression.js`, `js/gradient-descent.js`,
      `js/contour.js`, `js/main.js` — 전부 존재 확인 (`find apps/gradient-descent-lab -type f`).
- [x] `js/vendor/chart.umd.min.js`가 `apps/link-budget-calc/js/vendor/chart.umd.min.js`와 동일 파일인지
      `md5sum` + `diff`로 확인. 결과: 두 파일 md5 `3a1612b2a2ed332a6c1793fc73fa564a` 일치, `diff` 결과
      "FILES IDENTICAL" (바이트 단위 동일, 신규 CDN이나 다른 버전 아님).

이상 없음.

## 2. 제약 조건 준수

- [x] `type="module"` 미사용 확인 — `grep 'type="module"' index.html` 결과 없음.
- [x] 외부 CDN `<script src="https://...">` 없음 — `grep -nE '<script[^>]+src="https?://' index.html` 결과 없음.
      앱 폴더 전체(`index.html`, `css/style.css`, `js/*.js`, vendor 제외)에서 `https?://` 문자열 자체가
      전혀 없음(재확인 완료).
- [x] `git status --porcelain`, `git diff --stat`을 직접 재실행해 `apps/gradient-descent-lab/` 밖 파일이
      전혀 수정/삭제되지 않았는지 확인. `git diff --stat`은 빈 결과(추적 파일 변경 0건). `git status --porcelain`은
      전부 `??`(신규 미추적) 항목뿐이며, 그 목록은 `apps/gradient-descent-lab/*`, `.claude/build-...md`,
      `.claude/plan-agent-ml-instructions.md`, `.claude/review-gradient-descent-lab-instructions.md`,
      `spec-ml-sim.md`로만 구성됨 — 기존 블로그 파일(`index.html`, `js/home.js`, 다른 `apps/*` 등) 수정 없음.
- [x] spec 7절("구현 범위 외") 항목 재확인: `grep -rniE "polynomial|logistic|sigmoid|webgl|three\.js|minibatch|mini-batch|batch.?size|localStorage|FileReader|download"`로
      앱 소스 전체를 검색. `localStorage`는 `data.js` 주석("localStorage 불필요")에만 등장하고 실제 사용 없음.
      나머지는 전부 매치 없음 — 다항/다변량 회귀, 로지스틱 등고선, 미니배치 크기 슬라이더, 데이터 저장/불러오기,
      3D/WebGL 렌더링 전부 미구현 확인.

이상 없음.

## 3. 브라우저 동작 (정적 서버)

- [x] `python3 -m http.server`로 `apps/gradient-descent-lab/`를 서빙한 뒤 curl로 8개 리소스
      (`index.html`, `css/style.css`, `js/data.js`, `js/regression.js`, `js/gradient-descent.js`,
      `js/contour.js`, `js/main.js`, `js/vendor/chart.umd.min.js`) 전부 HTTP 200 확인.
- [x] `node --check`로 6개 JS 파일(`data.js`, `regression.js`, `gradient-descent.js`, `contour.js`,
      `main.js`, `js/vendor/chart.umd.min.js`) 전부 구문 오류 없음 확인.
- [x] `index.html`의 `getElementById(...)` 참조 15개(`btn-pause`, `btn-play`, `btn-reset`, `chk-batch`,
      `chk-sgd`, `contour-canvas`, `mse-chart`, `scatter-canvas`, `slider-eta`, `slider-lambda`,
      `stat-mse`, `stat-status`, `stat-step`, `val-eta`, `val-lambda`)와 HTML 내 실제 `id` 속성 15개를
      정렬 후 `comm -3`으로 대조 — 차집합 없음(1:1 완전 일치).
- [x] Playwright(1.61.1, 이미 스크래치패드에 설치되어 있음을 확인)로 실제 헤드리스 Chromium을 띄워
      로컬 정적 서버(`http://127.0.0.1:8935`)에서 `index.html` 로드. `pageerror`/`console.error` 리스너
      결과: **"No errors detected."** (콘솔 에러 0건, 데스크톱 1280×800 + 모바일 375×700 두 뷰포트 모두).
      추가로 실제 조작까지 수행: 등고선 클릭→시작점 지정, 재생/일시정지/리셋, 데이터 점 추가, SGD 체크박스
      토글, λ 슬라이더 이동, η를 최댓값으로 올려 발산 유도 — 전부 에러 없이 정상 동작, 상태 텍스트가
      "배치: 발산함 (η를 줄여보세요)"로 실제 갱신됨을 `textContent`로 직접 확인.

이상 없음. (정적 분석이 아니라 실제 헤드리스 브라우저 구동까지 완료했으므로 "불가능하면 정적 분석으로 대체" 조항은 해당 없음.)

## 4. 수학/로직 재검증 (가장 상세)

Node `vm` 모듈로 `regression.js`/`gradient-descent.js`를 **실제 파일 그대로** 로드해(재구현이 아님)
`Regression`, `GDEngine` 전역 객체를 직접 호출해 검증했다. 기본 데이터는 `data.js`의
`DEFAULT_POINTS`(9개 점, 정규식으로 파일에서 직접 추출)를 사용했다.

### 4.1 MSE와 그라디언트

`Regression.gradMSE(DEFAULT_POINTS, 1.3, 0.7, 0)` 코드 결과 `[-8.9155555..., -52.4266666...]`를
유한차분법(`ε=1e-6`)으로 구한 수치미분 `[-8.91555555782..., -52.42666667015...]`, 그리고 독립적으로
재구현한 해석적 그라디언트 `[-8.915555555555557, -52.42666666666666]`와 비교. 최대 절대오차
`3.49e-9`(유한차분 오차 범위 내) — **일치 확인**.

### 4.2 정규방정식(OLS) 2×2 역행렬 공식

손으로 만든 예제 `{(0,1),(1,3),(2,4)}`에 대해 손계산: `Sx=3, Sy=8, Sxx=5, Sxy=11, det=n·Sxx-Sx²=6`,
`w0=(Sxx·Sy-Sx·Sxy)/det=(40-33)/6=7/6≈1.166667`, `w1=(n·Sxy-Sx·Sy)/det=(33-24)/6=1.5`.
코드 `Regression.olsClosedForm()` 실제 반환값: `{w0: 1.1666666666666667, w1: 1.5}` — **정확히 일치**.

### 4.3 λ=0일 때 릿지 닫힌 형태 해 = OLS 해

기본 9개 데이터로 `Regression.olsClosedForm(DEFAULT_POINTS)` = `{w0: 1.783152403778366, w1: 1.5854363456929381}`,
`Regression.ridgeClosedForm(DEFAULT_POINTS, 0)` = `{w0: 1.783152403778366, w1: 1.5854363456929381}`.
`w0` 차이 `0`, `w1` 차이 `0` — **부동소수점 완전 일치(1e-9는 물론 정확히 0)**. Build 주장대로
`(XᵀX+λI)⁻¹Xᵀy`에서 λ=0을 대입하면 `(XᵀX)⁻¹Xᵀy`와 대수적으로 동일한 식이 되므로 당연한 결과이며 실측으로도 확인됨.

추가로 코드의 릿지 그라디언트(`gradMSE`의 `(2λ/n)w` 항, "MSE 기준" 스케일)와 `ridgeClosedForm`의
`(XᵀX+λI)⁻¹Xᵀy` 정지점이 실제로 서로 일치하는지 직접 유도 및 실측 검증:
`J(w)=MSE(w)+(λ/n)‖w‖²`의 그라디언트를 0으로 놓으면 `n·w0+Sx·w1+λw0=Sy`, `Sx·w0+(Sxx+λ)w1=Sxy` →
`(n+λ)w0+Sx·w1=Sy`, `Sx·w0+(Sxx+λ)w1=Sxy`인데, 이는 코드의 `ridgeClosedForm`이 쓰는
`a=n+λ, b=Sx, c=Sx, d=Sxx+λ` 행렬과 정확히 같다. 실측으로도 `λ∈{0,3,10}`에서
`Regression.gradMSE(DEFAULT_POINTS, ridge.w0, ridge.w1, λ)`를 계산하면 세 경우 모두 그라디언트 성분이
`1e-14`~`1e-15` 수준(부동소수점 잡음)으로 0에 수렴 — **그라디언트와 닫힌 형태 해가 실제로 일관됨을 확인**.
Build의 "MSE 기준 J(w) 구현, 그라디언트 일관성" 주장은 **사실로 확인됨**.

### 4.4 λ 증가 시 릿지 해의 노름(‖w‖) 감소

`Regression.ridgeClosedForm`을 λ = 0, 1, 5, 10, 20, 50, 200에 대해 직접 호출:

| λ | w0 | w1 | ‖w‖ |
|---|---|---|---|
| 0 | 1.7832 | 1.5854 | 2.3861 |
| 1 | 1.3286 | 1.6538 | 2.1214 |
| 5 | 0.7595 | 1.7195 | 1.8798 |
| 10 | 0.5663 | 1.7164 | 1.8074 |
| 20 | 0.4331 | 1.6718 | 1.7270 |
| 50 | 0.3188 | 1.5171 | 1.5503 |
| 200 | 0.1867 | 1.0171 | 1.0340 |

노름이 λ 증가에 따라 단조 감소(원점 방향 이동) — **확인**. Playwright 스크린샷(λ=0 vs λ=12.0)으로도
등고선 최저점(청록 원)이 λ 증가 시 좌측(원점 방향)으로 이동하고 OLS 별표(★)는 고정된 채로 있는 것을
시각적으로 재확인함(아래 UI 섹션 참고).

### 4.5 배치 GD → OLS 해 수렴

`w0=w1=0`에서 시작해 `Regression.gradMSE`로 `η=0.01`, 5000스텝 배치 GD를 직접 실행:
결과 `{w0: 1.7831524037610307, w1: 1.5854363456958303}`, OLS `{w0: 1.783152403778366, w1: 1.5854363456929381}`.
상대오차 `w0: 9.72e-12`, `w1: 1.82e-12` — **1% 오차 기준을 압도적으로 충족, 사실상 완전 수렴**.

### 4.6 헤시안 최대 고유값과 안정성 임계값 (Build 핵심 주장 재계산)

기본 9개 데이터에서 `n=9, Sx=40.4, Sxx=244.4`(독립적으로 직접 합산). `Hessian = (2/n)·[[n,Sx],[Sx,Sxx]]
= [[2, 8.9778], [8.9778, 54.3111]]`. 특성방정식 `λ²-tr·λ+det=0`으로 손으로도 풀 수 있음:
`tr=56.3111, det=2·54.3111-8.9778²=28.0217`, `disc=√(tr²-4·det)=√(3170.94-112.09)=√3058.85≈55.307`,
`λ_max=(56.3111+55.307)/2≈55.809`, `λ_min=(56.3111-55.307)/2≈0.502`.

**코드 계산 결과: 최대 고유값 = 55.80901067868462, 안정성 임계값 η<2/λ_max = 0.0358365...**

Build가 주장한 "최대 고유값 약 55.8, η<0.036" 수치와 **정확히 일치**(소수점 다섯 자리까지 재현됨).
기본 η 슬라이더 초기값(`index.html`의 `value="-1.699"`, 로그스케일이므로 `10^-1.699≈0.02`)이 이 임계값
0.0358보다 충분히 작게 설정되어 있음도 확인 — 안정적인 수렴 궤적을 보장하는 설계.

### 4.7 큰 η에서 실제 발산

**정적 재구현 검증**: `η=5.0`으로 30스텝 배치 GD를 `Regression.gradMSE`로 직접 실행한 결과, 3번째
스텝에서 이미 `|w0|`, `|w1|`가 `1e8`(코드의 `DIVERGE_THRESHOLD`)을 초과함(`w0≈-1.83e9`).

**실제 코드 경로 검증**: `GDEngine.play()`를 가짜 동기 `requestAnimationFrame`으로 구동해 실제
`stepOne()`/`tick()` 로직을 그대로 실행 — `η=5.0`에서 4스텝 만에 `pathState.status`가 실제로
`'diverged'`로 바뀌고 `state.running`이 자동으로 `false`(자동 일시정지)가 됨을 확인.

**브라우저 실측**: Playwright로 η 슬라이더를 최댓값(1.0)으로 올리고 재생한 결과, 실제 UI 상태 텍스트가
"배치: 발산함 (η를 줄여보세요) · SGD: 발산함 (η를 줄여보세요)"로 갱신됨을 확인. 스크린샷
(`shot-diverge.png`)에서도 경사하강 경로가 등고선 전체를 가로지르며 지그재그로 발산하는 모습과, 하단
MSE 차트가 스텝이 진행될수록 지수적으로 폭증(`~9e18`)하는 것을 시각적으로 확인.

### 4.8 SGD가 매 스텝 무작위 데이터 1개만 사용하는지

`Regression.gradMSESingle(DEFAULT_POINTS, idx, 1, 1, 0)`을 idx=0,1,2에 대해 호출한 결과가 서로 다르고,
`Regression.gradMSE`(전체 9개 배치)의 결과와도 다름을 확인(코드 상 명백히 별개 경로).
`GDEngine.play()`를 두 번 독립 실행(같은 시작점/η)해 SGD 경로를 비교한 결과 두 실행의 경로가
서로 다름(`run1 === run2: false`) — `Math.random()`을 실제로 매 스텝 호출해 인덱스를 뽑는다는 것을
직접 확인(고정 시드가 아님).

또한 `GDEngine.play()`를 배치+SGD 동시 활성화 상태로 50프레임 구동(내부 `STEPS_PER_FRAME=3`이므로
150스텝) 후 `batch.path`와 `sgd.path`가 스텝별로 서로 다른 지점을 지나감을 확인 — 배치는 매끄러운
결정론적 경로, SGD는 잡음 섞인 경로라는 spec 요구사항이 실제 코드에서 성립함을 재현.

**결론: 수학/로직 검증 항목 전부 이상 없음. 모든 수치를 Build 보고서에 의존하지 않고 독립적으로
재계산·재현했으며, 전부 일치했다.**

## 5. UI/CSS

- [x] 산점도 캔버스: `main.js`의 `bindScatterEvents()` — `click` 이벤트는 `handlePick(evt, false)`
      (기존 점 근처면 `DataStore.removeNear`로 삭제, 아니면 `DataStore.add`로 추가), `contextmenu` 이벤트는
      `evt.preventDefault()` 후 `handlePick(evt, true)`(삭제 시도만, 추가 안 함). 코드상 정상 바인딩 확인.
      Playwright로 실제 좌표 클릭 → 점 추가 동작도 확인.
- [x] 등고선 캔버스 클릭 → 시작점: `bindContourEvents()`가 `Contour.pixelToWorld(px, py, contourRange, ...)`로
      캔버스 픽셀을 `(w0,w1)` 좌표로 변환. `worldToPixel`/`pixelToWorld`가 서로 정확한 역함수인지 4개의
      임의 좌표로 왕복 변환 테스트(world→pixel→world) — 모든 케이스에서 원래 좌표와 오차 없이 일치.
- [x] η 슬라이더(로그스케일, `min="-3" max="0"`, `Math.pow(10, val)`로 변환), λ 슬라이더(`min="0" max="20"`),
      배치/SGD 체크박스 토글, 시작/일시정지/리셋 버튼 — `index.html`에 전부 존재하고 `main.js`의
      `bindControls()`에서 각각 `addEventListener` 바인딩 확인. Playwright로 슬라이더 조작·체크박스 토글·
      버튼 클릭까지 전부 실동작 확인.
- [x] 현재 스텝 수(`stat-step`)/현재 MSE(`stat-mse`)/수렴·발산 텍스트(`stat-status`) — `updateStatusText()`가
      매 프레임(`onFrame`)마다 갱신. Playwright로 재생 후 실제 DOM `textContent`가 갱신됨을 확인
      (예: `step=186 mse=0.2593`, 발산 시 `상태: 발산함`).
- [x] 데이터 점 변경 시 등고선 즉시 재계산 + 경로 리셋: `onDataChanged()`가
      `rebuildContourBackground()` → `GDEngine.pause()` → `GDEngine.setStart(...)`(경로 초기화) →
      `resetChart()` 순으로 호출 — 구현 규칙 5 그대로 구현됨을 소스에서 직접 확인.
- [x] 모바일 375px: `css/style.css`의 `@media (max-width: 900px) { .main-layout { flex-direction: column; } }`가
      두 캔버스를 세로로 쌓고, `.control-bar`는 `.main-layout` 뒤 별도 블록이라 자연히 그 아래 위치.
      375px는 640px/400px 브레이크포인트도 함께 적용됨. Playwright로 375×700 뷰포트를 실제로 렌더링해
      `scatter-canvas`(y≈106~326)와 `contour-canvas`(y≈370~590, 즉 산점도 아래)가 실제로 세로로 쌓인
      바운딩박스 좌표를 확인 — 레이아웃 깨짐 없음.
- [x] 재생 중일 때만 `requestAnimationFrame` 동작: `GDEngine.play()`는 `state.running=true`로 설정 후
      루프 시작, `pause()`는 `cancelAnimationFrame(state.rafId)` 호출 + `state.rafId=null`. Playwright로
      재생→일시정지 후 500ms 대기하며 `stat-step` 값이 변하지 않음을 확인(`step before pause-wait=5,
      after 500ms=5`) — 일시정지 시 루프가 실제로 멈춤을 실측 확인.

이상 없음.

## 6. 발견된 문제 목록

**발견된 문제 없음.** Build 에이전트가 주장한 4가지 핵심 사항(릿지 MSE 기준 구현과 그라디언트 일관성,
헤시안 최대 고유값 ≈55.8/안정성 임계값 η<0.036, 배치/SGD 동시 오버레이 비교, 콘솔 에러 없는 헤드리스
브라우저 동작) 전부 독립 재계산·재현으로 **사실 확인됨**. 파일 완전성, 제약 조건(CDN 없음, 블로그 타 파일
미수정, spec 7절 범위 외 기능 미구현), 정적 서버 리소스 200, JS 구문 오류 없음, DOM id 1:1 일치, UI 이벤트
바인딩, 반응형 레이아웃, 재생/일시정지 루프 제어까지 전부 통과.

심각도별 집계: **Critical 0건, Major 0건, Minor 0건.**

참고(결함 아님): Playwright 스크린샷에서 한글 텍스트가 사각형(tofu)으로 렌더링되는데, 이는 헤드리스
Chromium 실행 환경에 한글 폰트가 설치되어 있지 않아 발생하는 것으로, `textContent`로 직접 읽은 실제
DOM 텍스트(예: "배치: 발산함 (η를 줄여보세요)")는 정상이었으므로 앱 자체의 결함이 아니라 검증 환경의
폰트 제약임을 확인했다.

## 7. 수정 권고

없음. 현재 구현을 그대로 배포(Embed 단계 진행) 가능한 상태로 판단한다.

## 종합 결론

**전체 통과(PASS).** 파일 완전성·제약 조건 준수·브라우저 동작·수학/로직·UI/CSS 5개 카테고리 전부
직접 재현한 근거와 함께 이상 없음을 확인했으며, 발견된 문제는 0건이다.
