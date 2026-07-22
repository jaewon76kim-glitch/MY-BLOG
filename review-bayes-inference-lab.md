# Review: bayes-inference-lab (베이즈 추론 실험실)

- 리뷰어: 별도 Review 서브에이전트 (Build 서브에이전트와 무관, 독립 재검증)
- 검증 대상: `/home/hugok/MY-BLOG/apps/bayes-inference-lab/`
- 방법: 코드 직독 + Node.js로 모든 수치 독립 재계산(Build 보고서 수치를 베끼지 않음) + 정적 서버(curl) + `node --check` + 정적 분석(id/이벤트 매칭). 헤드리스 브라우저(Playwright)는 샌드박스에서 `sudo` 권한이 없어 브라우저 바이너리 설치가 실패했음(`npx playwright install chromium` → "Failed to install browsers", root 전환 시 터미널 인증 불가) — 따라서 실제 렌더링/콘솔 에러 확인은 **정적 분석으로 대체**했다. 이 사실을 명시한다.

---

## 1. 파일 완전성

- [x] 이상 없음, 직접 재현한 근거: `find apps/bayes-inference-lab -type f`로 9개 파일 전부 확인됨 —
  `index.html`, `css/style.css`, `js/bayes-math.js`, `js/base-rate-calculator.js`,
  `js/contingency-table.js`, `js/generative-classifier.js`, `js/number-game.js`,
  `js/mle-map-divergence.js`, `js/main.js`, `js/vendor/chart.umd.min.js`.
- [x] 이상 없음, 직접 재현한 근거: `diff apps/bayes-inference-lab/js/vendor/chart.umd.min.js apps/cnn-conv-lab/js/vendor/chart.umd.min.js` 결과 차이 없음(빈 diff). `md5sum` 두 파일 모두
  `3a1612b2a2ed332a6c1793fc73fa564a`로 완전히 동일. 파일 헤더에서 `Chart.js v4.4.4` 확인 — 신규 CDN이나
  다른 버전이 아님.

## 2. 제약 조건 준수

- [x] 이상 없음, 직접 재현한 근거: `grep -n 'type="module"' index.html` → 매치 0건. `grep -n "http" index.html` → 매치 0건(외부 CDN `<script src="https://...">` 없음). 모든 `<script>` 태그는 로컬 상대경로(`js/...`)만 사용.
- [x] 이상 없음, 직접 재현한 근거: 저장소가 실제 git repo임을 확인(`git rev-parse --show-toplevel` → `/home/hugok/MY-BLOG`, `git log`로 기존 커밋 3건 확인). `git status --porcelain` 결과 7줄 전부 `??`(추적되지 않는 신규 파일/폴더)이고 기존 추적 파일에 대한 `M`(수정) 항목은 0건. `git diff --stat`과 `git diff --stat --cached` 모두 출력 없음(빈 diff) — 기존 추적 파일이 전혀 수정되지 않았음을 Build 보고와 별개로 직접 확인.
- [x] 이상 없음, 직접 재현한 근거: spec 7절 금지 항목(연속확률변수 켤레사전분포, 실제 EM/GMM, iris 기반 나이브베이즈, 가설공간 자유 편집 UI, 몬테카를로/MCMC)에 대해 `grep -iE "gradient|epoch|iterat|converge|learning.?rate|mcmc|monte.?carlo|em algorithm|gaussian mixture|iris" js/*.js index.html` 실행 결과 매치 0건. 가설공간(`NUMBER_GAME_HYPOTHESES`)은 코드에 하드코딩된 11개 배열이며 UI에서 추가/삭제하는 기능 없음(number-game.js 확인).
- [x] 이상 없음, 직접 재현한 근거: 전체 js에서 `while`은 `base-rate-calculator.js`의 100명 격자 반올림 오차 보정용 2줄(`cells.length<100`/`>100`)뿐이고 수치 최적화·반복수렴 루프는 없음. 모든 계산 함수(`bayes-math.js`)가 `Math.pow`, 나눗셈, `Math.log` 등 단항 연산으로 즉시 종료됨을 직접 코드로 확인.

## 3. 브라우저 동작 (정적 서버)

- [x] 이상 없음, 직접 재현한 근거: `python3 -m http.server`로 서빙 후 curl로 10개 리소스(`index.html`, `css/style.css`, 8개 js 포함 vendor) 전부 HTTP 200 확인.
- [x] 이상 없음, 직접 재현한 근거: `node --check`를 7개 js 파일(bayes-math, base-rate-calculator, contingency-table, generative-classifier, number-game, mle-map-divergence, main) 전부에 실행, 전부 구문 오류 없이 통과.
- [x] 이상 없음, 직접 재현한 근거: Python 정규식으로 `index.html`의 모든 `id="..."`(54개)와 js의 모든 `getElementById('...')` 호출(43개)을 교차 대조 — JS가 참조하지만 HTML에 없는 id는 0건. 반대 방향으로도 HTML의 `input/button/select` 인터랙티브 요소 20개 중 JS 어디에서도 참조되지 않는 id는 0건(모두 이벤트 리스너 또는 값 조작 대상으로 등장).
- [ ] **헤드리스 브라우저 실제 로드 불가** — `npx playwright install chromium --with-deps` 시도 결과 샌드박스 내 `sudo` 인증 불가로 브라우저 바이너리 설치 실패. **대체 수단으로 정적 분석**을 수행: (a) `<script>` 로드 순서 확인 — `chart.umd.min.js → bayes-math.js → base-rate-calculator.js → contingency-table.js → generative-classifier.js → number-game.js → mle-map-divergence.js → main.js` 순서로, `Chart` 전역과 `bayes-math.js`의 공용 함수(`isPrimeNumber`, `hypothesisLikelihood` 등)가 이를 사용하는 모듈보다 먼저 로드됨을 확인. (b) HTML 태그 균형을 정규식으로 집계(`div` 60/60, `section` 5/5, `table/tr/td/th/thead/tbody` 각각 open=close, `button` 7/7 등 전부 일치) — 태그 불균형 없음.

## 4. 수학/로직 재검증 (가장 상세 — Node.js로 독립 재계산, Build 보고 수치를 베끼지 않고 직접 계산 후 대조)

### 섹션 1 (기저율 오류)
코드(`bayes-math.js`)의 `totalProbabilityPositive`/`bayesCancerGivenPositive`를 그대로 옮겨 Node에서 재구현해 계산:
```
bayes(0.8, 0.096, 0.01) = 0.07763975155279504  (p(양성)=0.10304)
```
지침 공식(`p(암|양성)=0.008/0.10304`)과 정확히 일치. 임의 값(0.9, 0.05, 0.02)으로도 계산 → `0.26865671641791045`(공식 재적용 시 사전확률/우도 변경에 정상 반응, 즉 슬라이더 바뀔 때마다 재계산되는 구조가 코드상 확인됨 — `brRenderAll`이 슬라이더 `input` 이벤트마다 `bayesCancerGivenPositive`를 다시 호출).
100명 격자 4칸(`breakdown100`)도 `100*p(암)*p(양성|암)`(진짜양성), `100*(1-p(암))*p(양성|암 아님)`(위양성) 등 공식 그대로 구현되어 있음을 코드에서 직접 확인.
**결론: 이상 없음.**

### 섹션 2 (조건부확률 방향성)
`contingencyConditionals` 로직을 Node로 재구현해 재계산:
```
프리셋1 (18,2,2,8): { pAgivenS: 0.9, pSgivenA: 0.9 }
프리셋2 (10,10,2,8): { pAgivenS: 0.5, pSgivenA: 0.8333333333333334 }
임의값(5,15,10,70): { pAgivenS: 0.25, pSgivenA: 0.3333333333333333 }
```
Build 보고 수치(0.9/0.9, 0.5/0.8333)와 정확히 일치. 임의 제3의 조합도 공식대로 정확히 재계산됨.
**결론: 이상 없음.**

### 섹션 3 (생성적 분류기 MAP)
`generativeClassifierPosteriors` 로직을 Node로 재구현:
```
기본값(0.75,0.25,0.50, 균등1/3): [0.5, 0.16666666666666666, 0.3333333333333333]
비균등 사전(0.5,0.3,0.2 사용): [0.6818..., 0.1364..., 0.1818...]  (정규화 합=1, 정상 재계산)
```
A=0.5, B≈0.16667, C≈0.33333로 Build 보고와 일치, A가 최댓값(MAP)도 코드(`mapIndex` 로직: posterior가 최대일 때 인덱스 갱신)에서 확인됨.
**결론: 이상 없음.**

### 섹션 4 (숫자게임 가설공간) — 가장 중점적으로 검증
가설공간 11개의 `|h|`를 Build 코드와 무관하게 1~100을 직접 순회하는 별도 스크립트로 재계산:
```
even:50, odd:50, mult3:33, mult4:25, mult5:20, le10:10, endsIn0:10, all:100, prime:25, square:10
```
전부 `number-game.js`의 `NUMBER_GAME_HYPOTHESES`에 하드코딩된 size 값과 정확히 일치(짝수/홀수 50·50, 3의 배수 33, 4의 배수 25, 5의 배수 20, 10 이하 10, 끝자리 0 10, 전체 100, 소수 25, 완전제곱 10). `h_two`(2의 거듭제곱, 1 제외)는 코드에서 `[2,4,8,16,32,64]`, `size:6`으로 명시 정의되어 있고, 원문의 "1,2,4,8,16,32,64로 6개"(실제론 7개)라는 오류를 "1 제외"로 흡수해 원문 계산과 일치시켰다는 지침의 의도가 코드에 정확히 반영됨을 확인.

우도 계산은 `hypothesisLikelihood(size,N,consistent)=(1/size)^N`을 별도로 Node에 재구현해 재계산:
```
D={16}: h_two(size6,N1)=0.16666666666666666, h_even(size50,N1)=0.02  → h_two 우세(근소) 확인
D={16,8,2,64}(N=4): p(D|h_two)=0.0007716049382716048, p(D|h_even)=1.6e-7
우도비 = 4822.53086419753
```
Build 보고 수치 "4822.53:1"과 소수점 둘째 자리까지 정확히 일치(독립 재계산 결과). 나머지 가설(3의 배수, 4의 배수, 5의 배수, 10 이하, 끝자리 0, 소수, 완전제곱)은 D={16,8,2,64} 중 최소 하나(예: 2, 64)를 포함하지 못하므로 전부 모순(p=0)이 되는 것을 `isConsistentWithHypothesis`의 predicate 정의(각 가설의 `predicate` 함수)로 직접 확인 — 예: `mult3`의 predicate(`n%3===0`)는 16에서 false이므로 D={16}만으로도 이미 모순.
**결론: 가설공간 숫자·우도비 주장 모두 이상 없음, 독립 재계산으로 재현됨.**

### 섹션 5 (MLE ↔ MAP 갈림길, N≈25.3 교차점) — 가장 중점적으로 검증
`mle-map-divergence.js`의 `mmCompute` 로직(코드에서 확인한 실제 상수: `h_two size=6, prior=0.1` / `h'(hprime) size=5, prior=0.001` / `h_even size=50, prior=0.05`, 놀라움(surprisal) 방식으로 부호 반전)을 그대로 Node에 재구현해 N=4,10,20,25,25.2,25.26,25.3,26,40,60에서 재계산:

```
N=4:  MLE승자=hprime, MAP승자=two   (totalMAP: two=9.4696, hprime=13.3455, even=18.6438)
N=10: MLE승자=hprime, MAP승자=two   (two=20.2202, hprime=23.0021)
N=20: MLE승자=hprime, MAP승자=two   (two=38.1378, hprime=39.0965)
N=25: MLE승자=hprime, MAP승자=two   (two=47.0966, hprime=47.1437)   ← 정수 슬라이더(step=1)에서 실제로 여기까지 두가 승리
N=25.2:                MAP승자=two   (two=47.4549, hprime=47.4656)
N=25.26:               MAP승자=hprime (two=47.5624, hprime=47.5622) ← 교차 직후
N=25.3:                MAP승자=hprime
N=26:                  MAP승자=hprime  (two=48.8883, hprime=48.7531)  ← 정수 슬라이더에서 여기서부터 h'가 승리
N=40,60:                MAP승자=hprime (h_even은 모든 구간에서 항상 최하위)
```
정확한 교차점을 방정식(`N*ln6 + (-ln0.1) = N*ln5 + (-ln0.001)`)으로 직접 풀면:
```
N_cross = (ln0.1 − ln0.001) / (ln6 − ln5) = 25.258506273026665
```
Build 보고의 "N≈25.3에서 교차"와 독립 재계산 결과(N≈25.26)가 사실상 일치(반올림 표현 차이 수준). HTML의 `#mm-N-slider`는 `min=1 max=60 step=1`(정수)이므로 슬라이더로 정확히 25.26을 만들 수는 없지만, 정수값 N=25(사전확률 반영 시 h_two 승리)와 N=26(h' 승리)에서 실제로 승자가 바뀌는 것을 확인했으므로 "N≈25.3에서 MAP가 MLE로 수렴"이라는 주장은 실제 UI 조작으로도 체감 가능한 사실임을 확인.

N=4에서 우도만(MLE)으로는 h'(|h'|=5)가 h_two(|h|=6)보다 항상 우세(작은 가설공간일수록 `(1/|h|)^N`이 커짐)하고, `priors.two=0.1 > priors.hprime=0.001`이라는 코드 상수 때문에 사전확률을 반영하면(MAP) h_two가 역전 승리한다는 것도 위 계산으로 직접 재현됨. "h_even은 항상 최하위"라는 것도 모든 N에서 `size=50`이 가장 커서 우도가 가장 낮으므로 자명하게 성립.

**"놀라움(surprisal)" 표시가 부호만 뒤집은 것인지** 코드 직독으로 확인: `mmCompute` 내부에서 `logD = -mmState.N * Math.log(h.size)`(이는 지침 공식 `log p(D|h) = -N*log|h|`와 정확히 동일한 식), `logPriorMAP = Math.log(mmState.priors[h.id])`(이는 `log p(h)`, N과 무관한 상수). 이어서 `surpriseD = -logD`, `surprisePrior = -logPriorMAP`로 정의되므로 각각 `-log p(D|h)`, `-log p(h)`이며 계산값 자체(절댓값)는 지침 공식과 정확히 같고 부호만 반전해 "작을수록 유력"으로 표시 방식만 바꾼 것이 코드로 확인됨. 다만 `logHypothesisLikelihood`(bayes-math.js, 모순 시 `-Infinity` 반환)를 재사용하지 않고 `mmCompute`가 `-N*Math.log(h.size)`를 인라인으로 중복 구현한 점은 기능상 문제는 없으나(항상 데이터가 각 가설과 부합한다고 가정하는 섹션 5 설계상 의도적으로 `consistent` 인자를 배제한 것으로 보임) 코드 재사용 관점에서는 사소한 중복.

**결론: 가설공간 숫자, 우도비, N≈25.3 교차점 주장 모두 독립 재계산 결과와 일치. Build 에이전트의 자체 보고가 정확했음을 확인.**

## 5. UI/CSS

- [x] 이상 없음, 직접 재현한 근거: `index.html`에 `#br-sens-slider`, `#br-fpr-slider`, `#br-prior-slider` 3개 슬라이더 존재, `base-rate-calculator.js`의 `brBindSlider`가 각각에 `input` 이벤트 리스너를 걸어 `brRenderAll()`(결과값 + 100명 격자 재렌더링) 호출하는 것을 코드로 확인.
- [x] 이상 없음, 직접 재현한 근거: `#ct-input-*` 4개 `<input type="number">`가 직접 수정 가능하고 `ctBindInput`이 `input` 이벤트로 재계산. `ct-preset1-btn`/`ct-preset2-btn`이 각각 `ctLoadPreset(18,2,2,8)`/`ctLoadPreset(10,10,2,8)` 호출 — 섹션 4 수치 재검증에서 이미 두 프리셋 값이 정확함을 확인함.
- [x] 이상 없음, 직접 재현한 근거: `#gc-class-controls`에 클래스별 이름(`text input`)/우도/사전확률 슬라이더 3세트가 `gcBuildControls`로 동적 생성되고, `#gc-chart`에 Chart.js 막대그래프(`gcRenderChart`)가 그려지며 `mapIndex`에 해당하는 막대만 `#ffd43b`(강조색)로 채색되는 것을 코드로 확인.
- [x] 이상 없음, 직접 재현한 근거: `#ng-number-grid`가 1~100 버튼 100개를 동적 생성하고 클릭 시 `ngState.data`에 push/splice(추가/제거) 후 `ngRenderAll()` 재호출. `#ng-chart`가 로그 스케일(`type:'logarithmic'`) 막대그래프이며 `consistentResults`(모순 제외)만 플롯하고, `#ng-hypothesis-list`에서는 모순 가설에 `ng-list-row-contradicted`(opacity 0.45) 클래스로 구분 표시. `#ng-preset-16-btn`/`#ng-preset-4nums-btn`/`#ng-clear-btn` 모두 `ngLoadPreset` 호출로 정상 동작 확인. (참고: 모순 가설을 차트 안에서 "회색 막대"로 표시하지 않고 차트에서 아예 제외 + 목록에서만 회색 처리하는 방식인데, 이는 spec이 아니라 **build 지침 자체가 명시적으로 허용한 대안**("목록에서만 '모순' 표기")이므로 문제로 간주하지 않음.)
- [x] 이상 없음, 직접 재현한 근거: `#mm-prior-toggle` 체크박스(on/off), `#mm-prior-two-slider`/`#mm-prior-hprime-slider`/`#mm-prior-even-slider` 3개 사전확률 슬라이더, `#mm-N-slider`(N)가 모두 존재하고 `initMleMapDivergence`에서 각각 이벤트 바인딩됨. `#mm-chart`가 Chart.js stacked bar로 `-log p(D|h)`(파란색)와 `-log p(h)`(빨간색, toggle off 시 0으로 표시)를 누적 표시하는 것을 코드로 확인 — 섹션 4에서 이미 이 계산값 자체를 독립 재계산해 정확함을 확인함.
- [x] 이상 없음, 직접 재현한 근거: `main.js`의 `NAV_SECTIONS`(5개)가 `#nav-tabs`(가로 탭)와 `#nav-select`(드롭다운) 양쪽에 렌더링되고, 탭 클릭/드롭다운 변경 시 `scrollIntoView`로 이동, 스크롤 시 `updateActiveNav`로 활성 탭 갱신되는 로직을 코드로 확인.
- [x] 이상 없음, 직접 재현한 근거: `style.css`에 `@media (max-width: 900px)`(`.br-layout`/`.ct-layout`/`.ng-layout`을 `flex-direction: column`으로 전환), `@media (max-width: 640px)`(`.nav-tabs` 숨김+`.nav-select` 표시, `.control-group` 45% 폭, 폰트 축소 등), `@media (max-width: 400px)`(`.control-group` 100% 폭, 격자 폰트 추가 축소) 3단계 브레이크포인트 확인. 375px는 640px 미만 400px 이상 구간에 해당하며 해당 구간 규칙(좌우 배치 column 전환 + control-group 45%→실질적으로 줄바꿈)이 적용되어 고정폭(px) 요소가 뷰포트를 초과하는 지점은 발견되지 않음(모든 폭 지정이 `%`, `1fr`, `max-width` 기반이며 헤드리스 브라우저로 실측은 못했음 — 위 3.의 한계 참고).

## 6. 발견된 문제 목록

발견된 **기능적 버그나 수치 오류는 0건**이다. 아래는 모두 경미한 관찰 사항(코드 스타일/견고성 수준)이며 구현 완료 조건이나 spec을 위반하지 않는다.

1. **[정보성/매우 낮음]** `main.js`의 초기화 순서상 `initNumberGame()`이 `initMleMapDivergence()`보다 먼저 호출되는데, `number-game.js`의 `ngRenderAll()`이 `typeof mmRenderAll === 'function'`이면 즉시 `mmRenderAll()`을 호출한다. 이때 아직 `initMleMapDivergence()`가 슬라이더 값/리스너를 설정하기 전이지만, `mmState`의 기본값(N=4, priors 등)이 HTML의 슬라이더 기본값과 이미 일치하므로 실질적 오작동은 없다. 페이지 최초 로드 시 섹션 5 차트가 한 번 더 불필요하게 렌더링되는 정도(중복 렌더 1회)의 비효율일 뿐.
2. **[정보성/매우 낮음]** `mle-map-divergence.js`의 `mmCompute`가 `bayes-math.js`의 `logHypothesisLikelihood`를 재사용하지 않고 `-N*Math.log(h.size)`를 인라인으로 다시 구현했다. 값은 동일하지만 코드 중복이며(섹션 5는 데이터 일치 여부를 검사하지 않고 항상 "부합"으로 가정하는 설계라 재사용이 애매하긴 함), 유지보수 관점의 사소한 관찰.
3. **[정보성]** 헤드리스 브라우저(Playwright)로 실제 콘솔 에러/렌더링을 확인하지 못했다(샌드박스 sudo 제한으로 브라우저 바이너리 설치 실패). 정적 분석(id 교차 검증, 스크립트 로드 순서, `node --check`, HTML 태그 균형)으로 대체했으며 이 범위 내에서는 문제를 발견하지 못했다. 실제 브라우저 렌더링(레이아웃 붕괴, CSS 우선순위 충돌 등 정적 분석으로 못 잡는 종류)은 100% 배제되었다고 단언할 수는 없다.

## 7. 수정 권고

- 기능/수치 오류가 없으므로 **필수 수정 권고 없음**.
- 선택 사항(원하는 경우에만): 위 6-1의 초기화 순서를 `initMleMapDivergence()` → `initNumberGame()`으로 바꾸거나, `number-game.js`가 `mmRenderAll`을 직접 호출하지 않고 `main.js`에서 두 init 함수 호출 후 한 번만 `mmRenderAll()`을 부르도록 정리하면 중복 렌더를 없앨 수 있다. 6-2는 `mmCompute`에서 `logHypothesisLikelihood(h.size, mmState.N, true)`를 호출하도록 바꾸면 중복을 제거할 수 있다. 두 항목 모두 현재 동작에는 영향이 없으므로 급하지 않음.
- 가능하다면(권한이 있는 환경에서) Playwright 등으로 실제 헤드리스 브라우저 로드 후 콘솔 에러/스크린샷 확인을 한 번 더 수행할 것을 권장(이번 리뷰의 유일한 미완 항목).

## 총평

전체 체크리스트 **통과**. 파일 완전성, 제약 조건 준수, 정적 서버 동작, id/이벤트 매칭, HTML 태그 균형 모두 이상 없음을 직접 재현해 확인했다. 특히 이 리뷰의 핵심인 섹션 4(가설공간 11개 `|h|` 값, D={16}/{16,8,2,64} 우도비 4822.53:1)와 섹션 5(N≈25.3 교차점, MLE/MAP 승자 전환)는 Build 에이전트의 코드와 무관하게 별도로 작성한 Node.js 스크립트로 처음부터 다시 계산했으며, 모든 수치가 Build 보고서의 주장과 일치했다. 발견된 문제는 기능에 영향 없는 정보성 관찰 3건뿐이며, 헤드리스 브라우저 실측이 샌드박스 제약으로 불가능했다는 한계를 명시한다.
