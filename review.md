# Review: doppler-sim

## 검증 결과: PASS

---

## 체크리스트 결과

### 1. 파일 완전성

- [x] 모든 파일이 존재하는가
  - `apps/doppler-sim/index.html` (12,439 bytes)
  - `apps/doppler-sim/css/style.css` (7,219 bytes)
  - `apps/doppler-sim/js/sim.js` (4,671 bytes)
  - `apps/doppler-sim/js/renderer.js` (7,395 bytes)
  - `apps/doppler-sim/js/chart.js` (4,231 bytes)
  - `apps/doppler-sim/js/vendor/chart.umd.min.js` (205,749 bytes ≈ 201 KB)
- [x] `chart.umd.min.js` 파일 크기 100KB 이상: **201 KB** ✓

### 2. 제약 조건 준수

- [x] `type="module"` 없음: 인라인 주석에 "type=\"module\" 불사용" 명시, 실제 미사용 ✓
- [x] 외부 CDN URL 없음: `grep cdn/https://` 결과 없음 ✓
- [x] 블로그 다른 파일 미수정 확인:
  - `git status` 결과: `modified: CLAUDE.md` (블로그 소스 파일 아님, Claude Code 지침 파일)
  - `apps/doppler-sim/`, `.claude/`, `spec.md` 은 모두 신규 untracked 파일
  - 블로그 기존 파일(`index.html`, `post.html`, `/css`, `/js`)은 변경 없음 ✓

### 3. HTML 구조

- [x] `<meta charset="UTF-8">` (line 4) ✓
- [x] `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (line 5) ✓
- [x] 스크립트 로드 순서 (lines 137–141):
  ```
  chart.umd.min.js → sim.js → renderer.js → chart.js → 인라인 main
  ```
  ✓
- [x] JS가 참조하는 모든 id가 HTML에 존재:
  - `slider-altitude`, `slider-freq`, `slider-elmax` ✓
  - `val-altitude`, `val-freq`, `val-elmax`, `val-passtime` ✓
  - `btn-play`, `btn-reset`, `progress-bar` ✓
  - `sim-canvas`, `chart-doppler`, `chart-rtt` ✓
  - `sum-el`, `sum-range`, `sum-doppler`, `sum-rtt`, `sum-elapsed` ✓

### 4. JavaScript 논리 검증

**sim.js**

- [x] `slantRange(h_km, El_rad)` 공식:
  ```
  inner = (Re + h)^2 - (Re * cos(El))^2
  R = sqrt(inner) - Re * sin(El)
  ```
  지침 명세와 일치 ✓

- [x] `orbitalVelocity(h_km)` = `sqrt(MU / r)` (r = (R_E + h_km) * 1000 m) ✓

- [x] `elevationAt(t)` = `El_max_rad * sin(π * t)` ✓

- [x] 도플러 계산: `f_d = -f_carrier_hz * (dR_dt / C)`
  - `dR_dt`: 수치 미분 방식 (`(R_m - prevR) / simDtSec`) ✓
  - 부호 확인: R 감소(접근) → dR_dt 음수 → f_d 양수(청색편이) ✓

- [x] RTT 계산: `2 * R_km * 1000 / C * 1000` (ms 단위) ✓

- [x] GEO RTT 검증 (`slantRange(35786, π/2)` = 35786 km, RTT = **238.57 ms**) ✓ (238~242ms 범위)

- [x] `maxDoppler_kHz()` — LEO 550km, 12GHz 기준: **438.9 kHz** ✓ (200~600 kHz 범위)

**renderer.js**

- [x] `init(canvasEl)`: canvas, ctx 초기화 및 `resize()` 호출 ✓
- [x] `drawBackground()`, `drawHorizon()`, `drawSatellite(x, y, visible)`, `draw(simResult, El_max_deg)` 전부 존재 ✓
- [x] `draw(simResult, El_max_deg)` 시그니처로 main에서 호출됨 ✓

**chart.js**

- [x] `resetCharts(maxKhz, maxRTT_ms, dopplerCanvas, rttCanvas)` 존재 (main은 `initRTT` 변수를 2번째 인수로 전달, 기능 동일) ✓
- [x] `pushDoppler(timeSec, f_d_khz)`, `pushRTT(timeSec, rtt_ms)` 존재 ✓
- [x] `dopplerChart.destroy()` / `rttChart.destroy()` 후 재생성 (메모리 누수 방지) ✓
- [x] `if (typeof Chart !== 'undefined')` 체크 후 플러그인 등록 ✓

**index.html 인라인 main**

- [x] `DopplerRenderer.init()` → `DopplerSim.reset()` → `DopplerCharts.resetCharts()` 순서 ✓
- [x] `pauseSim()` 내에서 `cancelAnimationFrame(rafId)` 호출 ✓
- [x] 슬라이더 변경 시 `onParamChange()` → `pauseSim() + resetSim() + startPlay()` ✓

### 5. CSS 검증

- [x] 모바일 미디어 쿼리 `@media (max-width: 640px)` 존재 (line 367) ✓
- [x] 모바일에서 `.main-layout { flex-direction: column }` (line 369) ✓
- [x] `.chart-container { position: relative; min-height: 0 }` (lines 302, 304) ✓

### 6. 물리 수치 검증 (Node.js로 수계산 확인)

| 항목 | 이론값 | 코드 계산값 | 판정 |
|------|--------|-------------|------|
| 궤도 속도 (LEO 550km) | ~7583 m/s | **7589.0 m/s** | ✓ |
| 천정 RTT (LEO 550km) | ~3.67 ms | **3.67 ms** | ✓ |
| 지평선 경사거리 (LEO 550km) | ~2680 km (지침 근사치) | **2703.8 km** | ✓ (지침 수치가 근사) |
| 지평선 RTT (LEO 550km) | ~17.9 ms | **18.03 ms** | ✓ |
| maxDoppler (LEO 550km, 12GHz) | ~439 kHz | **438.9 kHz** | ✓ |
| GEO 경사거리 (El=90°) | 35786 km | **35786.0 km** | ✓ |
| GEO RTT (El=90°) | 238~242 ms | **238.57 ms** | ✓ |

---

## 발견된 문제

**경미한 코스메틱 문제 1건 (기능 무관)**

- `renderer.js` `drawBackground()` 함수 내 별 밝기에 `Math.random()` 사용 (line 62):
  ```javascript
  ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.3) + ')';
  ```
  매 프레임마다 호출되므로 별이 깜빡이는 시각적 노이즈 발생. 기능 동작에는 영향 없음.

---

## 수정 권고사항

**권고 (선택적 개선):**
- `drawBackground()` 별 alpha를 고정값 또는 배열 캐시로 변경하면 깜빡임 제거 가능.  
  예: 별 데이터 배열에 alpha 값을 미리 포함시켜 `Math.random()`을 초기화 시에만 호출.

기능적 버그 없음. 나머지 체크리스트 항목 전부 통과.

---

## 물리 수치 검증 요약

코드가 사용하는 공식들이 모두 물리적으로 올바르며, Node.js 수계산으로 지침 명세값과 일치함을 확인.  
GEO RTT 238.57ms, LEO maxDoppler 438.9kHz 모두 지침 허용 범위 내.
