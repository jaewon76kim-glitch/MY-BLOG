# Review 서브에이전트 지침: doppler-sim

## 목표

`/home/hugok/MY-BLOG/apps/doppler-sim/` 의 구현을 검증하고 review.md를 작성한다.
코드를 읽고 정적 분석만 한다. 브라우저 실행은 생략한다.

## 검증 체크리스트

### 1. 파일 완전성

- [ ] 모든 파일이 존재하는가: index.html, css/style.css, js/sim.js, js/renderer.js, js/chart.js, js/vendor/chart.umd.min.js
- [ ] js/vendor/chart.umd.min.js 파일 크기가 100KB 이상인가 (정상 다운로드 확인)

### 2. 제약 조건 준수

- [ ] `type="module"` 속성이 없는가 (script 태그에서)
- [ ] 외부 CDN URL이 script src에 없는가 (모든 JS는 로컬 파일)
- [ ] 블로그 다른 파일(index.html, post.html, /css, /js 등)이 수정되지 않았는가
  - `git diff --name-only HEAD` 또는 `git status`로 확인
  - apps/doppler-sim/ 외 변경 파일이 있으면 문제로 기록

### 3. HTML 구조

- [ ] `<meta viewport>` 태그 있는가
- [ ] `<meta charset="UTF-8">` 있는가
- [ ] 스크립트 로드 순서: `chart.umd.min.js` → `sim.js` → `renderer.js` → `chart.js` → 인라인 main
- [ ] id 참조: 슬라이더 id, 버튼 id, 요약 카드 id 등 JS가 참조하는 id가 HTML에 실제로 존재하는가

### 4. JavaScript 논리 검증

**sim.js**
- [ ] `slantRange(h_km, El_rad)` 함수 공식 확인
  - `sqrt((Re+h)^2 - (Re*cos(El))^2) - Re*sin(El)` 형태인가
- [ ] `orbitalVelocity(h_km)` = `sqrt(MU / (Re+h))` (m 단위)
- [ ] `elevationAt(t)` = `El_max * sin(π*t)` 형태인가
- [ ] 도플러 계산: `f_d = -f_carrier * (dR_dt / C)` 형태인가
  - dR_dt: 수치 미분 방식인가
  - 부호 확인: 접근(R 감소) → f_d 양수
- [ ] RTT 계산: `2 * R_km * 1000 / C * 1000` ms 단위인가
- [ ] GEO(h=35786km, El=90°) RTT 계산:
  - slantRange(35786, π/2) = ? → RTT = ? ms → 약 238~242ms 범위인가
- [ ] `maxDoppler_kHz()` 함수가 LEO 550km, 12GHz 기준으로 현실적인 값(200~600 kHz)을 반환하는가

**renderer.js**
- [ ] `init(canvasEl)` 함수가 canvas와 ctx를 초기화하는가
- [ ] `drawBackground()`, `drawHorizon()`, `drawSatellite()`, `draw()` 함수 존재 확인
- [ ] `draw(simResult, El_max_deg)` 시그니처로 호출되는가

**chart.js**
- [ ] `resetCharts(maxKhz, initRTT, dopplerCanvas, rttCanvas)` 함수 존재
- [ ] `pushDoppler(timeSec, f_d_khz)`, `pushRTT(timeSec, rtt_ms)` 함수 존재
- [ ] Chart 인스턴스 destroy 후 재생성하는가 (메모리 누수 방지)
- [ ] `Chart` 전역 변수 존재 확인 후 사용하는가

**index.html 인라인 main**
- [ ] `DopplerSim`, `DopplerRenderer`, `DopplerCharts` 전역 변수를 순서대로 사용하는가
- [ ] `requestAnimationFrame` 루프에서 일시정지 시 `cancelAnimationFrame` 호출하는가
- [ ] 슬라이더 변경 시 `resetSim()` + `startPlay()` 호출하는가

### 5. CSS 검증

- [ ] 모바일 미디어 쿼리 존재: `@media (max-width: 640px)` 이하
- [ ] `flex-direction: column` 모바일 분기 있는가
- [ ] `.chart-container`에 `position: relative`와 `min-height: 0` 있는가 (Chart.js 반응형 필수)

### 6. 물리 수치 검증 (수계산)

LEO 550km, 12GHz, El_max=90° 기준:
- v = sqrt(3.986e14 / (6371+550)*1e3) = sqrt(3.986e14 / 6.921e6) ≈ 7583 m/s
- 천정(El=90°)에서 R = (6371+550) - 6371 = 550 km → RTT = 2*550*1e3 / 3e8 * 1e3 ≈ 3.67 ms
- 지평선(El=0°)에서 R = sqrt((6921)^2 - (6371)^2) = sqrt(6921^2 - 6371^2) ≈ 2680 km → RTT ≈ 17.9 ms
- maxDoppler_kHz (추정): f * π * Re * v / (2*(Re+h)) / C = 12e9 * π * 6.371e6 * 7583 / (2*6.921e6) / 3e8 ≈ 439 kHz

GEO 35786km, El=90°:
- R = 35786 km → RTT = 2*35786e3 / 3e8 * 1e3 ≈ 238.6 ms ✓

이 수치들이 코드에서 계산 가능한지 논리적으로 확인한다.

## 결과 파일

검증 후 `/home/hugok/MY-BLOG/review.md` 를 다음 형식으로 작성한다:

```markdown
# Review: doppler-sim

## 검증 결과: PASS / FAIL

## 체크리스트 결과
...

## 발견된 문제
(없으면 "없음")

## 수정 권고사항
(없으면 "없음")

## 물리 수치 검증
...
```

문제가 있으면 직접 수정하지 말고 review.md에 명확히 기록한다.
완료 후 "검증 완료" 를 보고한다.
