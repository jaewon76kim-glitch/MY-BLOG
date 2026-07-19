# Review: link-budget-calc

## 검증 결과: PASS

## 체크리스트 결과

### 1. 파일 완전성
- [x] `index.html`, `css/style.css`, `js/linkbudget.js`, `js/rain.js`, `js/charts.js`, `js/vendor/chart.umd.min.js` 모두 존재
- [x] `js/vendor/chart.umd.min.js` 크기 205,749 bytes (100KB 이상), `apps/doppler-sim/js/vendor/chart.umd.min.js`와 `diff` 결과 완전 동일 (바이트 단위 동일 사본)

### 2. 제약 조건 준수
- [x] `type="module"` 속성 없음 (코드에는 "type=\"module\" 불사용"이라는 주석만 존재, 실제 `<script>` 태그 5개 모두 속성 없이 로컬 파일 로드)
- [x] 외부 CDN URL 없음 — 모든 `<script src>`가 `js/vendor/...`, `js/linkbudget.js` 등 로컬 경로
- [x] `git status`/`git diff --name-only` 확인 결과 `apps/doppler-sim/`, 블로그 루트 `index.html`/`post.html`/`css/`/`js/`는 전혀 변경되지 않음. `apps/link-budget-calc/`는 신규 추가(untracked)로 문제 없음
  - 단, 범위 밖에서 변경된 파일이 있어 "발견된 문제"에 별도 기록함 (아래 참조)

### 3. HTML 구조
- [x] `<meta charset="UTF-8">`, `<meta name="viewport" ...>` 존재 (index.html 4~5행)
- [x] 스크립트 로드 순서: `chart.umd.min.js` → `linkbudget.js` → `rain.js` → `charts.js` → 인라인 main (256~260행) — 지침과 일치
- [x] JS(`el[...]` DOM 참조 목록)가 참조하는 id 51개 전부 HTML에 실존함(교차 검증 완료, 업/다운링크 토글, Pt/GT/GR/Tant/F 슬라이더, 궤도·주파수·강우지역·변조방식 프리셋, R0.01/hR/hS/Rs/Lrf/sigma_s 슬라이더, 요약카드·게이지·차트 캔버스 id 모두 확인)

### 4. JavaScript 논리 검증

**linkbudget.js**
- [x] `eirp_dBW` = Pt + GT
- [x] `gt_dB`/`sysNoiseTemp_K`: Te=T0(F_lin−1), Tsys=Tant+Te, G/T=GR−10log10(Tsys) — 수식 그대로 구현
- [x] `freeSpaceLoss_dB(d_km, fc_GHz)`: 내부에서 `f_MHz = fc_GHz*1000`으로 GHz→MHz 변환 후 20log10(d)+20log10(f_MHz)+32.44 — 단위 변환 정확
- [x] `slantRange_km`: 코드의 `sqrt((Re+h)² − (Re·cosEl)²) − Re·sinEl`은 대수적으로 지침의 `sqrt(Re²sin²El + 2·Re·h + h²) − Re·sinEl`과 동일한 식(전개하면 일치) — 기하학적으로 타당
- [x] `esN0_dB` = EIRP+GT−Lp−Arain−KB_DB−Rs_dB−Lrf_dB (KB_DB는 모듈 상수로 내부 반영)
- [x] `linkMargin_dB` = EsN0 − EsN0min
- [x] `qFunction`: Abramowitz–Stegun 26.2.17 표준형, x=0에서 0.500000 (Node로 직접 실행 확인)
- [x] `outageProbability`: sigma_s<=0일 때 margin>=0→0, margin<0→1로 경계처리, 정상 케이스는 Q(margin/sigma) — 확인됨(아래 수치검증 참조)

**rain.js**
- [x] ITU-R P.838 k,α 표: 12GHz 근방 kH=0.0188/aH=1.217, kV=0.0168/aV=1.200 등 실제 권고안 근사치와 자릿수·값 모두 합리적 범위(1/2/4/6/7/8/10/12/15/20/25/30/35/40GHz 전 구간에서 실제 공표된 P.838-3 계수와 유사한 값). 임의로 지어낸 값으로 보이지 않음
- [x] `interpLogLog`가 표 최소/최대 주파수(1GHz, 40GHz) 밖에서는 양 끝값으로 clamp(38~39행)
- [x] `slantPathLength_km` = (hR−hS)/sinθ, `pathReductionFactor`는 ITU-R P.618-13 공식 `1/(1+0.78√(LG·γR/f) − 0.38(1−e^(−2LG)))` 그대로 구현(수평 축소계수까지만 적용한다는 주석 명시, spec 2.4절과 일치), `rainAttenuation`이 LS→LG→r→LE→A0.01 순서로 정확히 연쇄 계산

**charts.js**
- [x] `initWaterfall`, `initRainCurve`, `initOutageCurve` / `updateWaterfall`, `updateRainCurve`, `updateOutageCurve` 모두 존재
- [x] 각 `init*` 함수에서 기존 Chart 인스턴스가 있으면 `destroy()` 후 `null` 처리하고 재생성(56~60행, 121~125행, 190~194행) — doppler-sim 관례와 일치, 메모리 누수 방지 확인

### 5. CSS 검증
- [x] 모바일 미디어 쿼리 3단계 존재: `@media (max-width: 900px)`, `@media (max-width: 640px)`, `@media (max-width: 400px)`
- [x] `.chart-container`에 `position: relative`, `min-height: 220px`(워터폴은 260px, 모바일은 180/220px로 축소) 지정됨 — Chart.js 반응형 요건 충족

### 6. 로컬 서빙 확인
- [x] `python3 -m http.server`로 `apps/link-budget-calc/`를 서빙 후 `curl`로 확인 — `index.html`, `css/style.css`, `js/linkbudget.js`, `js/rain.js`, `js/charts.js`, `js/vendor/chart.umd.min.js` 전부 HTTP 200 응답

## 발견된 문제

1. **범위 밖 파일 변경(경미, 이 앱과 무관)**: `git status` 확인 결과 `.claude/skills/myblog-harness/SKILL.md`가 수정(modified)되어 있고 `.claude/settings.json`이 새로 추가(untracked)되어 있음. 두 파일 모두 내용을 보면 "Tailscale + tmux 원격 접속 구성"에 관한 것으로, link-budget-calc 빌드와는 무관한 이전/별도 세션의 작업 흔적으로 보임. `apps/doppler-sim/`, 블로그 루트 `index.html`/`post.html`/`css/`/`js/` 등 실제 블로그 콘텐츠 파일은 전혀 건드리지 않았으므로 앱 자체의 무결성에는 영향 없음. 다만 지침 2번 항목("apps/link-budget-calc/ 외 변경 파일이 있으면 문제로 기록")에 따라 기록함.
   - 참고: `spec.md`도 modified 상태이지만, 이는 이전 앱(doppler-sim) 스펙을 이번 앱(link-budget-calc) 스펙으로 덮어쓴 것으로 Plan 단계의 정상적인 산출물이며 문제로 보지 않음.

2. **워터폴 차트 라벨/색상 불일치(경미, cosmetic)**: index.html의 워터폴 스텝 배열에서 `{ label: '−k_B', delta: -LinkBudget.KB_DB }`로 push함. `KB_DB`가 음수(약 −228.6)이므로 `-KB_DB`는 +228.6이 되어 실제로는 "증가(초록색 COLOR_UP)" 막대로 그려짐. 수식상으로는 정확함(Es/N0 = ... − KB_DB이고 KB_DB가 음수이므로 결과적으로 크게 더해지는 게 맞음 — 열잡음 기준 전력이 매우 작기 때문에 dB 워터폴에서 흔히 나타나는 정상적 현상)이나, 라벨에 "−" 기호가 붙어 있어 사용자가 "손실"로 오인할 수 있음. 계산 결과 자체는 문제 없음.

## 수정 권고사항

1. (경미) `.claude/skills/myblog-harness/SKILL.md`, `.claude/settings.json` 변경이 link-budget-calc 작업과 무관하다면, 별도 커밋으로 분리하거나 이번 앱 커밋 범위에서 제외할 것을 권고. (Embed/커밋 단계에서 확인 필요)
2. (경미, 선택사항) 워터폴 차트의 `−k_B` 라벨을 "+1/k_B" 또는 "잡음전력 기준(+228.6dB)" 등으로 바꾸거나, 툴팁에 부가 설명을 달아 사용자가 부호를 오인하지 않도록 하면 좋음. 기능/정확성에는 영향 없으므로 필수 수정 사항은 아님.

## 물리/수치 검증

Node.js `vm` 모듈로 `linkbudget.js`, `rain.js`를 직접 로드해 기본 다운링크 프리셋(GEO, El=40°, Ku 12GHz, Pt=15dBW, GT=30dBi, GR=40dBi, Tant=50K, F=1.5dB, R0.01=30mm/h, hR=3.5km, hS=0km, Rs=10Msps, Lrf=1dB)으로 계산한 결과와 지침의 기준값을 비교:

| 항목 | 계산값 | 기준값 | 판정 |
|---|---|---|---|
| EIRP_dBW | 45.000 | 45.0 | 일치 |
| Te (K) | 119.636 | ≈119.64 | 일치 |
| Tsys (K) | 169.636 | ≈169.64 | 일치 |
| G/T_dB | 17.705 | ≈17.70 | 일치 |
| slant range (km) | 37778.344 | ≈37778.3 | 일치 |
| L_FS_dB | 205.568 | ≈205.57 | 일치 |
| Rs_dB(Hz) | 70.000 | 70.0 | 일치 |
| KB_DB | −228.599 | ≈−228.60 | 일치 |
| k (12GHz) | 0.01780 | ≈0.0178 | 일치 |
| alpha (12GHz) | 1.2085 | ≈1.2085 | 일치 |
| gammaR (dB/km) | 1.0852 | ≈1.085 | 일치 |
| LS_km | 5.4450 | ≈5.445 | 일치 |
| LG_km | 4.1711 | ≈4.171 | 일치 |
| r | 0.9098 | ≈0.910 | 일치 |
| LE_km | 4.9538 | ≈4.954 | 일치 |
| A_0.01_dB | 5.3761 | ≈5.38 | 일치 |
| **Es/N0_dB (최종)** | **9.3595** | **≈9.36** | **일치** |

모든 중간값이 기준값과 오차 0.1% 이내로 일치(GHz/MHz, Hz/kHz 단위 실수 없음 확인). 워터폴 스텝의 누적합(45+17.7−205.57−5.38+228.6−70−1≈9.35)도 `esN0_dB` 함수 결과와 일치해 시각화-수치 간 정합성 확인.

**링크마진/부호 검증**: index.html의 변조방식 프리셋에서 QPSK(active 기본값)의 `data-esn0="6.5"`(dB)이고, main 스크립트 `state.EsN0min` 초기값도 6.5로 일치. 계산된 Es/N0≈9.36dB 기준 링크마진 = 9.36 − 6.5 = **+2.86dB (양수)**. `updateGauge()` 로직상 margin≥0이면 "충분" + `positive` 클래스(초록)로 표시되므로 UI 표시가 물리적으로 타당함을 확인. Node로 재현한 `LinkMargin_dB = 2.8595`도 이와 일치.

**qFunction 검증**: Q(0)=0.500000, Q(1)=0.158655(표준 0.1587과 일치), Q(-1)=0.841345, Q(3)=0.001350(표준 0.00135와 일치) — Abramowitz–Stegun 근사가 정상적으로 구현됨을 확인.

**outageProbability 경계값 검증**: sigma_s=0일 때 margin≥0→outage=0, margin<0→outage=1; sigma_s<0(음수, UI 슬라이더로는 도달 불가능한 방어 코드)도 동일하게 1 반환 — 코드대로 정상 동작.
