# Review: constellation-sim

## 검증 결과: PASS (수정 1건 적용)

## 체크리스트 결과

### 1. 파일 완전성
- [x] `index.html`, `css/style.css`, `js/modulation.js`, `js/noise.js`, `js/charts.js`, `js/vendor/chart.umd.min.js` 모두 존재
- [x] `js/vendor/chart.umd.min.js` 205,749 bytes, `apps/link-budget-calc/js/vendor/chart.umd.min.js`와 `diff` 결과 완전 동일(바이트 단위 동일 사본)

### 2. 제약 조건 준수
- [x] `type="module"` 속성 실사용 없음(인라인 주석에 "type=\"module\" 불사용" 문구만 존재)
- [x] 외부 CDN `<script src="http...">` 없음 — 모든 스크립트가 로컬 `js/...` 경로
- [x] 수정은 `js/modulation.js` 한 파일에만 가함. `git`이 아닌 파일시스템으로 확인한 결과 `apps/constellation-sim/` 밖 파일(index.html, css/, js/home.js, posts/, 다른 apps/* 등)은 전혀 건드리지 않음

### 3. 브라우저 동작 (정적 서버)
- [x] `python3 -m http.server`로 `apps/constellation-sim/`를 서빙 후 `curl`로 확인 — `index.html`, `css/style.css`, `js/modulation.js`, `js/noise.js`, `js/charts.js`, `js/vendor/chart.umd.min.js` 전부 HTTP 200
- [ ] 실제 Chrome/Chromium 등 브라우저나 puppeteer/jsdom이 이 실행 환경에 설치되어 있지 않아, 콘솔 에러 유무를 브라우저에서 직접 확인하지는 못함. 대신 (a) Node `vm` 모듈로 `modulation.js`/`noise.js`를 로드해 런타임 에러 없이 전체 함수가 정상 동작함을 확인, (b) HTML의 DOM id 참조 13개 전부가 실제 요소와 1:1 일치함을 정적으로 교차검증(아래 4번), (c) `charts.js`의 Chart.js 사용 패턴(`initXxxChart`에서 기존 인스턴스 `destroy()` 후 재생성)이 이미 브라우저에서 검증된 `link-budget-calc`/`doppler-sim`과 동일한 관례임을 확인 — 이 세 가지로 브라우저 동작을 간접적으로 강하게 뒷받침함.

### 4. 코드 문법 / DOM id 일치
- [x] `node --check`로 `js/modulation.js`, `js/noise.js`, `js/charts.js`, `js/vendor/chart.umd.min.js` 4개 파일 모두 문법 오류 없음 확인
- [x] index.html의 `el[...]` 배열에 나열된 13개 id(`val-ebn0`, `slider-ebn0`, `val-nsym`, `slider-nsym`, `btn-resim`, `const-title`, `sum-ser-meas`, `sum-ser-theory`, `sum-ber-meas`, `sum-ber-theory`, `sum-error-count`, `chart-constellation`, `chart-ber-curve`)와 HTML에 실존하는 id 13개가 정확히 1:1로 일치(정렬 비교로 교차검증, 여분/누락 없음)
- [x] `js/charts.js`가 참조하는 전역(`Modulation`, `ConstellationCharts`)과 index.html의 스크립트 로드 순서(Chart.js → modulation → noise → charts → 인라인 main)가 의존관계와 일치

### 5. CSS / 모바일 반응형
- [x] `@media (max-width: 900px)`, `(max-width: 640px)`, `(max-width: 400px)` 3단계 미디어쿼리 존재
- [x] 640px 이하에서 `.main-layout`이 세로(column)로 전환, `.input-panel`이 `flex-wrap`으로 가로 배치되며 폭 100%로 확장 — 좁은 화면에서 사이드바가 잘리지 않음
- [x] `.chart-container`에 `position: relative` + 단계별 `min-height`(320px → 280px → 240px) 지정되어 Chart.js `maintainAspectRatio:false` 요건 충족, 차트가 찌그러지지 않음
- [x] `input[type=range]`에 `touch-action: manipulation` 지정되어 모바일 터치 조작 대응

## 발견된 문제 및 수정 — QPSK 이론식 오류 (핵심)

**문제**: `js/modulation.js`의 `theorySER()`가 QPSK에 대해 원본 tex(`/mnt/c/Users/hugok/Claude/Projects/doc/위성통신/위성통신_소스.tex` 546행 부근, `\subsection*{M-PSK의 오류확률...}` 절)의 식을 그대로 옮겨

```
P_s,QPSK = 2·Q(√(2·Es/N0))·[1 − 0.5·Q(√(2·Es/N0))]
```

로 구현되어 있었음(수정 전 코드: `qFunction(Math.sqrt(2 * esn0_lin))`).

**검증**: tex 원문을 직접 확인함(546행 부근에 위 식이 실제로 그대로 적혀 있음을 확인). 이 식을 그대로 쓰면 "Gray 코딩 QPSK는 BPSK와 동일 Eb/N0에서 동일 BER을 가진다"는 잘 알려진 결과와 모순된다는 지침의 지적을 Node로 직접 재현·확인했다.

- 수정 전 이론값(QPSK BER, EbN0=8dB) ≈ BPSK BER의 1/500 수준으로 나와(수치로도 재현), 명백히 틀림.
- 직접 유도: QPSK = I/Q축에 독립 BPSK 2개. 각 축 비트오류율 = `Q(√(2Eb/N0))`(BPSK와 동일). `Es=2Eb`이므로 `√(2Eb/N0)=√(Es/N0)`. 심볼오류율(두 비트 중 하나라도 오류) = `1−(1−Q(√(Es/N0)))² = 2Q(√(Es/N0))[1−0.5Q(√(Es/N0))]`. 즉 인자는 `√(2Es/N0)`가 아니라 `√(Es/N0)`.
- 같은 tex 파일 552행 부근의 일반 M-PSK 근사식 `Ps ≈ 2Q(√(2Es/N0)·sin(π/M))`에 M=4를 대입하면 `sin(π/4)=√2/2`이므로 `√(2Es/N0)·(√2/2)=√(Es/N0)` — 위 유도와 정확히 일치. **즉 같은 tex 파일 안에서 "QPSK 정확식"(546행)과 "M-PSK 근사식"(552행, M=4 대입)이 서로 모순되며, 근사식 쪽(및 표준 교재 결과)이 옳고 546행의 "정확식"이 오기(誤記)로 판단됨.**

**수정 내역**: `apps/constellation-sim/js/modulation.js`의 `theorySER()` 중 QPSK 분기에서 `qFunction(Math.sqrt(2 * esn0_lin))` → `qFunction(Math.sqrt(esn0_lin))`로 인자를 수정하고, 근거를 상세 주석으로 남김(파일 상단 헤더 주석과 QPSK 분기 주석 모두 갱신). **이 오류는 `theoryBER`이 `theorySER`을 호출해 파생되므로 BER 곡선(`js/charts.js`의 BER-vs-Eb/N0 그래프)과 요약 카드의 QPSK 이론값에도 함께 반영되어 자동으로 고쳐짐.** 그 외 시뮬레이션 로직(`noise.js`의 몬테카를로, 성상점 좌표)은 애초에 이 tex 오류의 영향을 받지 않았음(최근접 판정 기반 실측이라 이론식과 무관하게 항상 정확).

**수정 후 수치 재검증** (Node `vm` 모듈로 `modulation.js`/`noise.js` 직접 로드):

| Eb/N0 (dB) | BPSK BER (이론) | QPSK BER (수정 후 이론) | 비율(QPSK/BPSK) |
|---|---|---|---|
| 0 | 7.865e-2 | 7.556e-2 | 0.961 |
| 4 | 1.250e-2 | 1.242e-2 | 0.994 |
| 6 | 2.388e-3 | 2.386e-3 | 0.999 |
| 8 | 1.910e-4 | 1.909e-4 | 0.9999 |
| 10 | 3.876e-6 | 3.876e-6 | 1.0000 |

→ 고SNR로 갈수록 QPSK/BPSK BER 비율이 1에 정확히 수렴 — "동일 Eb/N0에서 동일 BER"이라는 표준 결과와 부합(저SNR에서 소폭 차이 나는 것은 SER→BER 환산이 고SNR 근사이기 때문으로 정상).

수정된 QPSK 정확식과 M-PSK 근사식(M=4 대입)을 비교하면 SNR이 높아질수록 두 값이 급격히 수렴함(EbN0=12dB에서 차이 8e-17 수준) — 근사식이 고SNR에서 정확식에 수렴하는 정상적 거동.

몬테카를로 실측(N=2,000,000 심볼)과 수정된 이론 SER 비교: EbN0=2dB에서 상대오차 0.15%, 6dB에서 0.37%, 10dB에서 3.21%(표본이 적을 때 통계적 변동, 정상 범위) — 이론식이 실측과 잘 맞음을 확인.

## 4번 항목 — 나머지 SER/BER 공식 교차검증

- **BPSK** `Pb = Q(√(2Eb/N0))`: tex 530행 원문과 일치, 표준식. EbN0=0dB일 때 이론값 0.078650 — 잘 알려진 표준값(0.0786)과 일치 확인.
- **M-PSK 근사식**(8PSK 등) `Ps ≈ 2Q(√(2Es/N0)·sin(π/M))`: tex 552행 원문과 일치, 표준 근사식. 8PSK 몬테카를로(N=1,000,000) 비교: EbN0=4dB 상대오차 0.24%, 10dB 1.24% — 이론과 실측이 잘 맞음. EbN0=16dB에서는 이론 SER≈3.3e-9로 1M 표본에서는 오류 이벤트가 0회 나오는 것이 통계적으로 정상(표본 부족일 뿐 공식 문제 아님).
- **M-QAM**: `√M`-PAM 오류율 `P = 2(1−1/√M)Q(√(3Es/((M−1)N0)))`, 전체 SER `1−(1−P)²` — tex 564~570행 원문과 정확히 일치, 표준 사각 QAM 공식. `Es/N0` 정의(`esn0_lin = ebn0_lin × log2(M)`, 즉 `Es=Eb·log2(M)`)가 성상점 정규화(모든 변조방식에서 평균 심볼에너지가 정확히 1.000000이 되도록 `d = √(3/(2(M−1)))`로 정규화됨을 직접 계산해 확인)와 시뮬레이션(`noise.js`의 `N0 = 1/esn0_lin`) 양쪽에서 일관되게 쓰이고 있음을 확인. 16QAM/64QAM 몬테카를로(N=1,000,000) 비교: 대부분 상대오차 1% 이내, 64QAM EbN0=16dB에서만 6.05%인데 이론 SER≈1.3e-3(약 1300회 오류 이벤트) 수준에서 통계적으로 정상적인 변동 범위.
- 결론: BPSK, M-PSK 근사, M-QAM 세 공식 모두 tex 원문과 표준 결과에 부합하며 추가 수정 불필요. **오직 QPSK "정확식"(tex 546행)만 tex 원문 자체의 오기였고, 이는 이번 리뷰에서 수정함.**

## tex 원본 소스에 대한 정오표 (참고용, 이 서브에이전트는 tex 파일 자체를 고치지 않음 — 범위 밖)

`/mnt/c/Users/hugok/Claude/Projects/doc/위성통신/위성통신_소스.tex` 546행 부근:

```
P_{s,QPSK} = 2Q(√(2Es/N0)) [1 − (1/2)Q(√(2Es/N0))]
```

위 식의 인자는 `√(2Es/N0)`가 아니라 `√(Es/N0)`이어야 옳다. 근거는 위 "발견된 문제" 절 참조 — 같은 문서 552행의 일반 M-PSK 근사식에 M=4를 대입한 결과와 비교하면 이 모순이 바로 드러난다. tex 원본은 이 서브에이전트의 수정 범위 밖이므로 건드리지 않았으며, 원저자(사용자) 확인 및 tex 원본 수정이 필요함을 여기 기록해 둔다.

## 결론

`apps/constellation-sim/` 폴더 안의 파일만 검토·수정했으며, `js/modulation.js`의 QPSK 이론식 인자 오류(`√(2Es/N0)` → `√(Es/N0)`) 1건을 수정했다. 이 외 파일 구조, DOM id, 문법, 모바일 반응형, 나머지 변조방식(BPSK/M-PSK 근사/M-QAM) 공식은 모두 정상으로 확인되어 추가 수정 없음.
