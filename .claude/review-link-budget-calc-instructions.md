# Review 서브에이전트 지침: link-budget-calc

## 목표

`/home/hugok/MY-BLOG/apps/link-budget-calc/` 의 구현을 검증하고
`/home/hugok/MY-BLOG/review-link-budget-calc.md` 를 작성한다.
`spec.md`(현재 저장된 버전, "위성 링크버짓 계산기" 스펙)를 기준 요구사항으로 삼는다.
이 서브에이전트는 읽기 전용으로 코드를 검증하되, `python3 -m http.server`로 로컬
서빙 후 `curl`로 200 응답과 스크립트 참조 경로가 실제로 서빙되는지 정도는 확인해도 좋다
(무거운 헤드리스 브라우저 실행은 생략).

## 검증 체크리스트

### 1. 파일 완전성

- [ ] 모든 파일이 존재하는가: `index.html`, `css/style.css`, `js/linkbudget.js`,
      `js/rain.js`, `js/charts.js`, `js/vendor/chart.umd.min.js`
- [ ] `js/vendor/chart.umd.min.js` 파일 크기가 100KB 이상인가 (정상 복사 확인,
      `apps/doppler-sim/js/vendor/chart.umd.min.js`와 `diff`로 동일한지도 확인)

### 2. 제약 조건 준수

- [ ] `type="module"` 속성이 없는가 (script 태그에서, doppler-sim과 동일 관례)
- [ ] 외부 CDN URL이 script src에 없는가 (모든 JS는 로컬 파일)
- [ ] 블로그 다른 파일(index.html, post.html, /css, /js, apps/doppler-sim/ 등)이
      수정되지 않았는가 — `git status`, `git diff --name-only`로 확인.
      `apps/link-budget-calc/` 외 변경(신규 추가 제외) 파일이 있으면 문제로 기록

### 3. HTML 구조

- [ ] `<meta viewport>`, `<meta charset="UTF-8">` 있는가
- [ ] 스크립트 로드 순서: `chart.umd.min.js` → `linkbudget.js` → `rain.js` →
      `charts.js` → 인라인 main
- [ ] JS가 참조하는 id(슬라이더, 버튼, 요약 카드 등)가 HTML에 실제로 존재하는가
      (특히 spec.md 4절의 입력 컨트롤 표에 나온 항목: 업/다운링크 토글, Pt, GT, GR,
      Tant, F, 궤도 프리셋, 앙각, 주파수 대역 프리셋, R0.01, hR, hS, Rs, 변조방식
      프리셋, Lrf, sigma_s)

### 4. JavaScript 논리 검증

**linkbudget.js**
- [ ] `eirp_dBW(Pt, GT)` = Pt + GT
- [ ] `gt_dB(GR, Tant, F_dB)`: Te = T0*(F_lin-1), Tsys = Tant+Te, G/T = GR - 10log10(Tsys)
- [ ] `freeSpaceLoss_dB(d_km, fc_GHz 또는 MHz)` = 20log10(d_km) + 20log10(fc_MHz) + 32.44
      (fc 단위 변환이 GHz→MHz로 올바르게 되는지 확인 — 자릿수 실수가 흔한 지점)
- [ ] `slantRange_km(h_km, elevation_deg)`가 기하학적으로 타당한 공식인가
      (예: d = sqrt(Re²sin²El + 2·Re·h + h²) − Re·sinEl)
- [ ] `esN0_dB(...)` = EIRP + G/T − Lfs − Arain − KB_dB − Rs_dB − Lrf
- [ ] `linkMargin_dB` = 계산된 Es/N0 − 요구 임계값
- [ ] `qFunction(x)` Abramowitz–Stegun 근사가 표준적인 형태인가 (x=0일 때 0.5 근방)
- [ ] `outageProbability(margin, sigma_s)` = Q(margin/sigma_s), sigma_s<=0 등 경계값 처리

**rain.js**
- [ ] ITU-R P.838 k,α 계수표 값이 임의로 지어낸 게 아니라 실제 권고안 근사치와
      자릿수가 맞는 범위인가 (12GHz 부근 k~0.018, α~1.2 정도가 합리적)
- [ ] 로그-로그 보간이 표 범위 밖 주파수에서 clamp되는가
- [ ] `slantPathLength_km`, `pathReductionFactor`, `rainAttenuation` 공식이
      spec.md 2.4절과 일치하는가

**charts.js**
- [ ] 워터폴 막대, 강우감쇠 곡선, 아웃티지 곡선 초기화/업데이트 함수가 모두 존재하는가
- [ ] Chart 인스턴스를 destroy 후 재생성하는가 (메모리 누수 방지, doppler-sim 관례)

### 5. CSS 검증

- [ ] 모바일 미디어 쿼리 존재 (`@media (max-width: 640px)` 등)
- [ ] `.chart-container`에 `position: relative`와 적절한 `min-height`/`height`
      있는가 (Chart.js 반응형 필수, doppler-sim에서 겪은 이슈)

### 6. 물리/수치 검증 (기준값)

기본 프리셋(다운링크, GEO h=35786km, 앙각 40°, Ku 12GHz, Pt=15dBW, GT=30dBi,
GR=40dBi, Tant=50K, F=1.5dB, R0.01=30mm/h, hR=3.5km, hS=0km, Rs=10Msps,
Lrf=1dB)에서 Python으로 미리 계산한 기준값:

```
EIRP_dBW        = 45.0
Te (K)          ≈ 119.64        Tsys (K) ≈ 169.64
G/T_dB          ≈ 17.70
slant range d_km ≈ 37778.3   (공식: sqrt(Re²sin²El + 2·Re·h + h²) − Re·sinEl, Re=6371km)
L_FS_dB         ≈ 205.57
Rs_dB(Hz)       = 70.0        (10Msps = 1e7 Hz)
KB_dB           ≈ -228.60
k,alpha(12GHz, H/V평균) ≈ 0.0178, 1.2085
gammaR (dB/km)  ≈ 1.085
LS_km ≈ 5.445   LG_km ≈ 4.171   r ≈ 0.910   LE_km ≈ 4.954
A_0.01_dB       ≈ 5.38
Es/N0_dB (최종) ≈ 9.36
```

- [ ] 브라우저(또는 Node로 모듈 함수를 직접 호출)에서 위 기본 프리셋 값을 넣었을 때
      각 중간값이 기준값과 ±5% (반올림/보간 오차 감안) 이내로 일치하는가
  - 특히 `L_FS_dB`, `A_0.01_dB`, 최종 `Es/N0_dB`는 반드시 확인 — 단위 실수(GHz/MHz,
    Hz/kHz 등)가 있으면 여기서 크게 어긋난다
- [ ] Es/N0 ≈ 9.36dB가 QPSK 요구 임계값 프리셋과 비교했을 때 링크마진 부호(양/음)가
      UI에 합리적으로 표시되는가 (요구 임계값이 얼마로 프리셋되어 있는지 index.html에서
      확인하고 마진 계산 검산)

## 결과 파일

검증 후 `/home/hugok/MY-BLOG/review-link-budget-calc.md` 를 다음 형식으로 작성한다:

```markdown
# Review: link-budget-calc

## 검증 결과: PASS / FAIL

## 체크리스트 결과
...

## 발견된 문제
(없으면 "없음")

## 수정 권고사항
(없으면 "없음")

## 물리/수치 검증
...
```

문제가 있으면 직접 수정하지 말고 review-link-budget-calc.md에 명확히 기록한다.
완료 후 "검증 완료"를 보고한다.
