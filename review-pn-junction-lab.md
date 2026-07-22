# Review: pn-junction-lab (PN 접합 다이오드 실험실)

- 리뷰어: Build 에이전트와 분리된 독립 Review 서브에이전트
- 방법: Build 에이전트의 자체 보고 수치를 그대로 인용하지 않고, (1) 실제 저장소 코드를 직접 읽고,
  (2) Node.js `vm` 모듈로 실제 `semiconductor-constants.js`/`semiconductor-math.js`를 로드해
  `computeJunction()` 등 실함수를 직접 호출하고, (3) 별도로 처음부터 다시 짠 독립 재구현 스크립트로도
  같은 수치를 교차검산했다. 두 경로(실코드 실행 + 독립 재구현)가 모든 항목에서 소수점 이하 수치까지
  일치했다.
- 검증 스크립트: `/tmp/claude-1000/-home-hugok/c38d0faa-f47d-4f5e-afbd-efb25ef93edd/scratchpad/verify.js`
  (독립 재구현), `/tmp/claude-1000/-home-hugok/c38d0faa-f47d-4f5e-afbd-efb25ef93edd/scratchpad/load_real.js`
  (실제 코드 직접 로드·실행)

---

## 1. 파일 완전성 — 이상 없음

- `index.html`, `css/style.css`, `js/semiconductor-constants.js`, `js/semiconductor-math.js`,
  `js/band-diagram.js`, `js/depletion-profile.js`, `js/iv-curve.js`, `js/presets.js`, `js/main.js`,
  `js/vendor/chart.umd.min.js` 10개 파일 모두 `find`로 직접 존재 확인.
- `js/vendor/chart.umd.min.js`가 `apps/bayes-inference-lab/js/vendor/chart.umd.min.js`와 동일한지
  `md5sum`과 `diff`로 직접 확인: 두 파일의 md5(`3a1612b2a2ed332a6c1793fc73fa564a`)가 완전히 같고
  `diff` 결과 차이 없음(“NO DIFF”). 신규 CDN 다운로드가 아니라 기존 사본 재사용 확인됨.
- `semiconductor-constants.js`를 직접 읽어 지침(build-pn-junction-lab-instructions.md 46~59행)의
  상수와 한 줄씩 대조: `E_G=1.12`, `N_C_300=2.8e19`, `N_V_300=1.04e19`, `EPS_SI=1.036e-12`,
  `Q=1.602e-19`, `K_B_EV=8.617e-5`, `MU_N=1350`, `MU_P=480`, `TAU_N=TAU_P=1e-6` 전부 정확히 일치.

## 2. 제약 조건 준수 — 이상 없음

- `grep -c 'type="module"'` 결과 0건, `grep -riE 'cdn|googleapis|cloudflare|unpkg|jsdelivr'` 결과 0건
  (직접 grep 실행). 모든 `<script src="js/...">`는 로컬 상대경로.
- `git status --porcelain`, `git diff --stat`을 리포지토리 루트(`/home/hugok/MY-BLOG`)에서 직접
  실행: 추적 중이던 기존 파일 변경은 0건(`git diff --stat` 출력 없음). 신규 추가된 항목은 전부
  untracked 신규 파일/폴더(`apps/pn-junction-lab/`, `spec-pn-junction-lab.md`,
  `.claude/build-pn-junction-lab-instructions.md`, `.claude/review-pn-junction-lab-instructions.md`
  등 — 이번 작업 사이클과 무관한 `spec-least-action-lab.md`, `plan-agent-6/8-instructions.md`도
  untracked로 남아있으나 이는 이전 다른 작업의 잔여물이며 이번 Build와 무관). 블로그 기존 파일
  (`index.html`, 기존 `apps/*`, `js/home.js` 등) 수정 없음을 직접 재확인.
- spec 6절 구현 범위 외 항목(BJT, MOSFET, C-V 특성, 항복전압, LED/태양전지, 그레이디드 접합,
  실리콘 외 재료) — `index.html`/`js/*.js`/`css/style.css` 전체에 대해
  `grep -riE 'BJT|MOSFET|커패시턴스|C-V|항복전압|breakdown|LED|태양전지|solar cell|그레이디드|graded junction|저마늄|게르마늄|GaAs'`
  실행 결과 실질적 매치 0건(유일한 매치는 `.ctrl-btn:hover:not(:disabled)`의 "disabled" 안에 우연히
  포함된 부분 문자열 "bled"이며 실제 LED 관련 내용 아님). 구현 범위 위반 없음.
- 모든 계산 함수(`nI`, `vBi`, `depletionWidth`, `depletionSplit`, `maxField`, `fieldAt`,
  `potentialAt`, `pN0`, `nP0`, `saturationCurrent`, `diodeCurrent`)를 직접 읽은 결과 반복문/수치최적화
  없이 전부 닫힌 형태 수식(제곱근·로그·지수) 한 줄로 즉시 계산됨. `band-diagram.js`,
  `depletion-profile.js`의 곡선 렌더링도 `steps` 루프는 그래프 좌표 샘플링용일 뿐 물리량 자체는
  각 x마다 `fieldAt`/`potentialAt`을 닫힌 형태로 직접 평가하는 방식(반복 수렴/최적화 아님).

## 3. 브라우저 동작 (정적 서버) — 이상 없음 (일부는 정적 분석으로 대체, 아래 명시)

- `python3 -m http.server`로 `apps/pn-junction-lab/`를 직접 서빙한 뒤 curl로 10개 리소스 전부 확인:
  `index.html`, `css/style.css`, 7개 js 파일, `js/vendor/chart.umd.min.js` 모두 HTTP 200.
- `node --check`를 8개 js 파일(vendor 포함) 각각에 직접 실행: 전부 구문 오류 없이 통과(vendor 파일도
  포함해 확인함 — Build 보고서는 vendor를 언급하지 않았으나 리뷰어가 추가로 확인).
- id 참조 교차검증: `js/*.js`의 모든 `getElementById(...)` 호출 인자(37개, 중복 제거)를 추출하고
  `index.html`의 모든 `id="..."` 속성(41개, 중복 제거, section-1~4·control-panel·control-summary·
  preset-table 포함)과 `comm`으로 직접 비교 — JS가 참조하지만 HTML에 없는 id는 0건.
  또한 `classList.add/toggle/remove`, `className = '...'`, 템플릿 문자열 내 `class="..."`로 동적으로
  주입되는 모든 클래스(`primary`, `cp-collapsed`, `nav-tab-active`, `nav-tab`, `ctrl-btn`,
  `bd-legend-item`, `bd-swatch`)를 추출해 `css/style.css`에 정의된 클래스 목록과 대조 — CSS에
  없는 동적 클래스 0건.
- HTML 태그 균형: 주석을 제거한 뒤 여는/닫는 태그를 스택으로 직접 파싱하는 스크립트를 작성해
  `index.html` 전체를 검사 — 태그 불균형 0건(스택이 끝에 완전히 비워짐).
- **헤드리스 브라우저 실행은 이 환경에서 불가능했다**(`puppeteer` 미설치, Chromium/Chrome 바이너리
  없음을 `which`로 확인). 따라서 "실제 로드 시 콘솔 에러 없음"은 헤드리스 브라우저로 직접 검증하지
  못했고, 대신 (a) `node --check` 구문 검증, (b) id/class 참조 무결성 정적 대조, (c) 아래 4절의 실제
  함수 실행(Node vm으로 실제 코드를 로드해 `computeJunction` 등을 직접 호출)으로 런타임 로직 오류
  가능성까지 정적+동적 혼합 방식으로 대체 검증했다는 점을 명시한다. DOM API(`getContext('2d')`,
  Chart.js 생성자 호출 등)의 브라우저 특유 동작 자체는 미검증.

## 4. 물리/수학 재검증 — 가장 상세히 검증 (실제 코드 직접 실행 + 독립 재구현 교차검산)

모든 수치는 (A) Node `vm`으로 실제 리포지토리의 `semiconductor-constants.js`+`semiconductor-math.js`를
로드해 실함수를 호출한 결과와, (B) 지침 문서(build-pn-junction-lab-instructions.md)의 수식만 보고
처음부터 별도로 재구현한 스크립트의 결과, 두 가지로 **각각 독립 계산**했으며 모든 항목에서 두 결과가
일치했다.

- **n_i(T) 공식**: `nI(T) = sqrt(Nc(T)*Nv(T)) * exp(-E_G/(2*K_B_EV*T))` — 코드를 직접 읽어 확인.
  T=300K 직접 재계산: **6,670,308,207 ≈ 6.670×10⁹ cm⁻³**. 원문(§9, 610행) "$n_i \approx 10^{10}\,
  \text{cm}^{-3}$ 정도"라는 자릿수 진술과 부합(자릿수 일치, 6.67e9는 1e10의 약 0.67배로 "정도"
  표현에 부합하는 정상 범위). 버그 아님.

- **핵심 쟁점 — V_bi=0.7352V가 "0.6~0.7V" 범위를 벗어나는 문제**: **버그 아님. 근사 범위 진술 자체의
  한계로 판정.**
  - 원문(`물리전자와_반도체공학_소스.tex` 777행)을 직접 grep으로 재확인한 정확한 문구:
    "전형적인 실리콘 다이오드는 $V_{bi}\approx 0.6\text{--}0.7\,\text{V}$ 정도입니다." 이 문장은
    **특정 N_A, N_D 값에 대한 정밀한 계산 결과가 아니라, V_bi 공식을 유도한 직후에 붙인 일반적인
    감각치 진술**이다(N_A=1e17, N_D=1e15라는 구체적 도핑 조합은 원문 어디에도 명시되어 있지 않음 —
    이 조합은 spec/build 지침 작성 과정에서 예시로 선택한 것).
  - 코드에 구현된 공식 `V_bi = (k_BT/e) ln(N_A N_D / n_i²)`을 Node `vm`으로 실제 함수 `vBi()`를 직접
    호출해 재계산한 결과: `vBi(1e17, 1e15, 300) = 0.7352246503567902` — Build 보고 값(0.7352V)과
    소수점 이하까지 정확히 일치. 별도로 지침 수식만 보고 처음부터 재구현한 스크립트로도 동일하게
    0.7352246...이 나왔다(공식/코드 구현이 서로 다른 두 경로에서 완전히 재현됨 → 구현 버그 아님).
  - **범위 이탈의 원인 규명**: V_bi는 `n_i`에 로그로 반비례(`ln(1/n_i²)`)한다. 이 문서(§9)가 정의한
    실리콘 상수(E_G=1.12eV, N_C_300=2.8e19, N_V_300=1.04e19)로 계산하면 n_i(300)=6.67×10⁹인데,
    이는 흔히 교과서(Sze 등)에서 관용적으로 쓰는 n_i≈1.5×10¹⁰(cm⁻³)보다 작다. n_i를 바꿔가며 직접
    재계산해보면:
    - n_i=6.67×10⁹(이 원문의 실제 상수로 계산한 값) → V_bi=0.7352V
    - n_i=1.0×10¹⁰(원문이 말로 표현한 "~10^10" 그대로) → V_bi=0.7143V
    - n_i=1.5×10¹⁰(Sze 교과서 등에서 흔히 쓰는 관용값) → V_bi=0.6929V (0.6~0.7V 범위 안)
    즉 "0.6~0.7V" 라는 감각치는 n_i≈1.5×10¹⁰ 부근의 관용값을 암묵적으로 전제한 서술인 반면, 이
    프로젝트가 자기일관성을 위해 정확히 사용하기로 한 상수(E_G, N_C_300, N_V_300)로 계산하면 n_i가
    그보다 작아 V_bi가 자연히 위로 5%가량 밀려난다. 이는 **공식 구현 오류가 아니라, 원문의 "정도"라는
    표현 자체가 다른 관용적 n_i 값을 전제로 한 근사치이기 때문에 발생하는 정상적인 편차**이다.
  - 결론: **버그 아님(정상)**. 코드의 공식·상수는 지침과 정확히 일치하며, 독립 재계산도 완전히
    일치한다. "0.6~0.7V 정도"는 원문 스스로도 근사 표현("정도")으로 못박은 문장이고 특정 도핑 조합에
    구속된 값이 아니므로, 5% 초과는 심각도 없음(정보성 기록)으로 분류한다.
  - 추가 교차검증: 저농도 프리셋(N_A=N_D=1e15)은 실제 코드 실행 결과 `vBi(1e15,1e15,300)=
    0.616176395878812V` — Build 보고(0.6162V)와 일치하며 이 값은 "0.6~0.7V" 범위 안에 정확히
    들어온다. 이는 코드가 "도핑에 따라 값이 달라진다"는 정상적인 물리적 거동을 보이고 있음을
    추가로 뒷받침한다(범위 안/밖 여부가 도핑 조합에 의존하는 것은 정상).

- **W 공식**: `W = sqrt((2*EPS_SI*(V_bi-V)/Q)*(1/N_A+1/N_D))` — 코드(`depletionWidth`) 직접 읽어
  확인. 임의 도핑 조합 N_A=5×10¹⁶, N_D=2×10¹⁷, T=300K, V=0으로 실제 함수 직접 호출: V_bi=0.854273V,
  W=166.200nm. 독립 재구현 스크립트로도 동일 값 재현. 공식 정확히 구현됨.

- **전기적 중성 조건**: 위 임의 조합에서 `N_A·x_p = 6.648×10¹¹`, `N_D·x_n = 6.648×10¹¹` — 완전히
  일치(부동소수점 오차 이내). 비대칭 프리셋(N_A=1e18, N_D=1e15)에서도 `N_A·x_p = N_D·x_n =
  1.01335×10¹¹`로 일치(Build 보고 1.013×10¹¹와 일치, 실제 함수 직접 호출로 재확인).

- **E_max 두 표현식 일치**: `maxField(NA,xp)`와 `maxField(ND,xn)`을 실제 코드로 직접 호출해 비교 —
  임의 조합(5e16/2e17)에서 `Emax(from xp)=102800.37233625833`, `Emax(from xn)=102800.37233625833`로
  완전히 동일(자바스크립트 `===` 비교로도 `true`). 비대칭 프리셋에서도 `15669.829519135044` vs
  `15669.829519135043`로 사실상 동일(마지막 자리 부동소수점 잔차 수준).

- **E(x) 연속성**: `fieldAt()`을 x=0의 바로 아래(x=-1e-30, 좌극한 근사)와 x=0(우극한)에서 직접 호출해
  비교 — `-15004.299305317796` vs `-15004.299305317794`로 15자리 유효숫자 중 마지막 자리에서만 차이
  (부동소수점 표현 오차 수준, 수학적으로 연속). 코드상으로도 두 구간 수식이 x=0에서 같은 극한값을
  갖도록 유도되어 있음을 직접 확인(전기적 중성 조건 N_Ax_p=N_Dx_n으로부터 대수적으로 필연적).

- **φ(x) 검산**: `potentialAt()`을 실제 코드로 직접 호출, N_A=1e17, N_D=1e15, T=300K, **V=0.2V**(0이
  아닌 임의 바이어스로 검산해 V 의존성까지 확인)에서 `φ(x_n)=0.53522465035679`, `φ(-x_p)=0`,
  차이=`0.53522465035679`. 한편 `V_bi-V = 0.7352246503567901 - 0.2 = 0.5352246503567901` —
  두 값이 소수점 13자리까지 일치. 부호 규약(E=-dφ/dx)을 반영한 구현이 정확함을 확인.

- **도핑 스윕 단조성**: N=1e14~1e19(대칭 도핑)까지 6개 지점을 실제 코드로 직접 호출한 결과:
  `V_bi: 0.4971 → 0.6162 → 0.7352 → 0.8543 → 0.9733 → 1.0924` (단조 증가 확인),
  `W(nm): 3586.02 → 1262.50 → 436.10 → 148.65 → 50.18 → 16.81` (단조 감소 확인). Build 보고
  (0.497V→1.092V, 3586nm→16.8nm)와 일치.

- **p_n0, n_p0**: `pN0(ND,T)=ni²/ND`, `nP0(NA,T)=ni²/NA` — 코드 확인 결과 정확히 이 공식 그대로.

- **I0 공식과 아인슈타인 관계식**: `Dn(T)=K_B_EV*T*MU_N`, `Dp(T)=K_B_EV*T*MU_P`(아인슈타인 관계식
  D=(k_BT/e)μ에서 k_BT[eV]가 이미 e로 나눈 값이므로 그대로 곱함 — 단위 확인: eV(=V)×cm²/(V·s)=
  cm²/s, 올바름), `Ln=sqrt(Dn*TAU_N)`, `Lp=sqrt(Dp*TAU_P)`(단위: sqrt(cm²/s · s)=cm, 올바름).
  `I0=Q*A*(Dp*pn0/Lp + Dn*np0/Ln)` 차원 분석: C·cm²·(cm²/s·cm⁻³/cm) = C/s = A(암페어), 올바름.
  N_A=1e17,N_D=1e15,T=300,A=1e-4로 실제 코드 직접 호출: I0=2.5529161368705044e-15 A — 독립
  재구현과 완전히 일치.

- **I(V) 지수식과 단위 처리**: `I(V)=I0*(exp(V/(K_B_EV*T))-1)` — `K_B_EV*T`는 eV 단위이며 볼트와
  수치적으로 같은 스케일이므로 `eV/k_BT`의 e가 상쇄된다는 지침의 설명이 코드에 정확히 반영됨.
  실제 코드 직접 호출 결과: `I(-1V)/(-I0) = 1`(정확히 1, 부동소수점 완전 일치 — 역방향 포화 확인),
  `I(0.5V)/I0 = 251,162,711.26 ≈ 2.51×10⁸`(Build 보고 "≈2.5×10⁸"와 일치, 순방향 지수 폭증 확인).

- **Ec-Ei + Ei-Ev = E_G 항등식**: `ecMinusEi(T)+eiMinusEv(T)`를 T=250,300,350,400,450K 5개 지점에서
  실제 코드로 직접 호출 — 모든 온도에서 `1.12`로 정확히 E_G와 일치(diff=0, 부동소수점 오차조차 없음).
  이는 `ln(Nc/ni)+ln(Nv/ni) = ln(Nc·Nv/ni²) = ln(e^{Eg/kT}) = Eg/kT`이므로 kT를 곱하면 항상 Eg가
  되는 대수적 항등식이며, 코드가 이를 깨지 않음을 직접 확인했다.

- **프리셋 3개 표**: 실제 `computeJunction()`을 세 프리셋(대칭 1e17=1e17, 비대칭 1e18/1e15, 저농도
  1e15=1e15, T=300K, A=1e-4, V=0)에 대해 직접 호출한 결과:
  | 프리셋 | V_bi | W | x_p | x_n | I0 |
  |---|---|---|---|---|---|
  | 대칭(1e17=1e17) | 0.854273V | 148.654nm | 74.327nm | 74.327nm(=W/2) | 6.7216×10⁻¹⁷A |
  | 비대칭(1e18/1e15) | 0.794749V | 1014.368nm | 1.0134nm | 1013.355nm | 2.5150×10⁻¹⁵A |
  | 저농도(1e15=1e15) | 0.616176V | 1262.499nm | 631.250nm | 631.250nm(=W/2) | 6.7216×10⁻¹⁵A |
  대칭·비대칭 케이스는 Build 보고와 일치(대칭 x_p=x_n=74.33nm=W/2, 비대칭 x_p=1.01nm/x_n=1013.35nm,
  N_A·x_p=N_D·x_n=1.013×10¹¹). 저농도 V_bi=0.6162V도 일치. I0가 프리셋 간 자릿수 단위로 달라진다는
  spec의 주장(6.7×10⁻¹⁷ → 2.5×10⁻¹⁵ → 6.7×10⁻¹⁵, 약 2자릿수 차이)도 실측으로 확인됨.

## 5. UI/CSS — 정적 분석으로 확인 (헤드리스 브라우저 미가용, 3절에 명시)

- 슬라이더 5개(`na-slider`,`nd-slider`,`t-slider`,`v-slider`,`a-slider`) 모두 `index.html`에 존재,
  `main.js`의 `bindControls()`에서 각각 `input` 이벤트에 `renderAll()`을 바인딩해 슬라이더 조작 시
  `V_bi`/`n_i(T)`를 포함한 전체 재계산·재렌더가 즉시 일어나도록 연결되어 있음을 코드로 직접 확인.
- 섹션 1: `bd-before-btn`/`bd-after-btn` 토글이 `bdMode` 전역변수를 바꾸고 `bdRender()`를 재호출하는
  구조 확인. 밴드 휨은 `offset = calc.vbi - V`로 계산되어 V 슬라이더 변경 시 실시간 반영됨(코드상
  `renderAll()`이 `bdRender(calc)`를 매번 호출).
- 섹션 2: `dp-rho-canvas`/`dp-field-canvas`/`dp-potential-canvas` 3개 캔버스가 각각
  `dpRenderRho`/`dpRenderField`/`dpRenderPotential`로 렌더링되고, `dp-w-val`/`dp-xp-val`/
  `dp-xn-val`/`dp-emax-val`이 함께 갱신되는 구조 확인. 3개 그래프는 `.panel`(display:flex;
  flex-direction:column) 안에 배치되어 데스크톱에서도 항상 세로로 쌓이는 구조(CSS 직접 확인).
- 섹션 3: Chart.js(`new Chart(ctx, {...})`)로 라인차트 생성, 동작점은 별도 scatter 데이터셋으로
  마커 표시, `iv-linear-btn`/`iv-log-btn`이 `ivMode`를 바꾸고 `y.type`을 `'linear'`/`'logarithmic'`로
  전환하는 구조를 코드로 직접 확인.
- 섹션 4: `DOPING_PRESETS` 배열에 3개 프리셋(대칭/비대칭/저농도) 정의, 버튼 클릭 시
  `applyDopingPreset()`이 슬라이더 값을 갱신하고 `renderAll()`을 호출해 섹션 1~3이 함께 갱신되는
  구조 확인. `presetsRenderTable()`이 비교표(V_bi/W/x_p·x_n/I0)를 항상 표시.
- 상단 네비게이션: `nav-tabs`(가로 탭)와 `nav-select`(드롭다운)를 `initNav()`가 함께 생성하고
  `scrollIntoView`로 이동시키는 구조 확인. CSS에서 640px 이하는 `.nav-tabs{display:none}`,
  `.nav-select{display:block}`으로 전환됨을 직접 확인.
- 모바일 375px: CSS 미디어쿼리 3단계(900px/640px/400px)를 직접 읽어 확인. 375px는 640px·400px
  구간 모두에 해당 — `.control-group{min-width:100%}`(400px 이하)로 컨트롤이 완전히 세로 스택되고,
  `panel-toggle-btn`(JS로 `cp-collapsed` 클래스 토글)으로 컨트롤 패널을 접을 수 있는 구조가 CSS/JS
  양쪽에 정의되어 있음을 확인. 3단 그래프는 위에서 확인했듯 `.panel`의 flex-column 특성상 폭에 무관하게
  항상 세로 스택 유지. 단, 실제 브라우저에서 375px 뷰포트로 렌더링해 시각적으로 깨짐이 없는지는
  헤드리스 브라우저 부재로 **직접 렌더링 확인은 못 했고 CSS 규칙의 정적 대조로 대체**했다.

## 발견된 문제 목록

**중대(critical) 문제: 0건**
**높음(high) 문제: 0건**
**낮음/정보성(low/info) 항목: 2건**

1. **[정보성, 버그 아님]** N_A=1e17, N_D=1e15, T=300K일 때 V_bi=0.7352V가 원문의 "전형적으로
   0.6~0.7V 정도" 서술을 약 5% 초과함. 위 4절에서 상세 판정한 대로, 이는 코드/공식 오류가 아니라
   원문의 근사 서술(n_i≈1.5×10¹⁰을 암묵 전제)과 이 앱이 자기일관성을 위해 정확히 사용한 상수
   (n_i=6.67×10⁹)의 차이에서 비롯된 정상적 편차다. 수정 불필요. 다만 앱 UI/설명 문구에 "전형적으로
   0.6~0.7V 부근이지만 상수 선택에 따라 이 범위를 벗어날 수 있다"는 식의 코멘트를 추가하면 사용자
   혼동을 줄일 수 있어 보이나, 이는 개선 제안이지 결함은 아니다.
2. **[정보성, 검증 한계]** 이 환경에 헤드리스 브라우저(puppeteer/Chromium)가 설치되어 있지 않아
   "브라우저에서 실제 로드 시 콘솔 에러 없음"을 동적으로 확인하지 못했다. 대신 `node --check` 구문
   검증, id/class 참조 정적 대조, HTML 태그 균형 검사, 그리고 Node vm으로 실제 계산 함수를 직접
   호출하는 방식으로 대체 검증했다. 이는 코드 결함이 아니라 검증 환경의 제약이므로 별도 조치는
   불필요하나 완전한 브라우저 렌더링 검증을 원한다면 헤드리스 브라우저가 있는 환경에서 재확인을
   권장한다.

## 수정 권고

- 코드 수정이 필요한 항목 없음(중대/높음 문제 0건).
- (선택) 섹션 1 또는 컨트롤 패널 설명문에 V_bi의 "0.6~0.7V" 예시가 근사치이며 실제 계산값은 사용된
  상수(n_i)에 따라 이 범위를 벗어날 수 있다는 짧은 설명을 추가하는 것을 고려할 수 있음(필수 아님).
- (선택) 이후 리뷰 사이클에서 headless 브라우저(puppeteer 등)를 사용할 수 있는 환경이 준비되면
  실제 콘솔 에러 여부와 375px 렌더링 결과를 동적으로 한 번 더 확인할 것을 권장.

## 총평

전체 통과. 물리/수학 공식 9개 항목(n_i, V_bi, W, 전기적 중성조건, E_max 일치, E(x) 연속성, φ(x)
검산, 도핑 스윕 단조성, p_n0/n_p0, I0/아인슈타인 관계식, I(V) 지수식, Ec-Ei+Ei-Ev=E_G 항등식) 전부를
실제 코드 직접 실행 + 독립 재구현 교차검산으로 확인했고 모두 일치했다. 파일 완전성, 제약 조건(외부
CDN 없음, 블로그 다른 파일 미수정, 구현 범위 외 항목 없음), 브라우저 정적 서빙(200 응답), 구문 오류
없음, id/class 참조 무결성도 전부 확인됨. 유일하게 눈에 띈 V_bi=0.7352V 쟁점은 상세 검증 결과
**버그가 아니라 원문의 근사 서술("정도")과 이 앱이 사용한 정확한 상수 사이의 정상적인 차이**로
최종 판정한다.
