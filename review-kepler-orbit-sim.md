# Review: kepler-orbit-sim

## 검증 결과: PASS (단, 지침서 자체의 완료조건 문구 오류 1건 발견 — 코드는 정상)

---

## "알려진 이슈" 독립 검증 결론

Build 에이전트의 주장을 그대로 믿지 않고 Node.js로 `orbit.js`를 직접 로드해 재계산했다(`vm.runInThisContext`로
`js/orbit.js` 원본 파일을 그대로 실행 — 별도로 옮겨 적은 공식이 아니라 코드 자체를 검증).

```
GEO a=42164km -> T = 86163.618 s   (86164s 대비 -0.382s, ±10s 이내)
LEO a=6928km  -> T = 5738.826 s = 95.6471 min
```

- `build-kepler-orbit-sim-instructions.md`의 완료조건 문구: "e=0, a=6928km(LEO)일 때 T가 약
  5560~5580초(약 92.7분) 범위" → **실제 계산값 5738.8초(95.65분)는 이 범위 밖**이다.
- 역산 확인: T=92.7분이 나오려면 `a≈6784.9km`(고도 약 407km, ISS급)여야 한다. 즉 92.7분은 고도
  550km(a=6928km) 궤도가 아니라 고도 약 400km 궤도의 주기다.
- 공개된 Starlink(고도 약550km) 궤도주기 공개값(약 95~96분)과 코드 계산값 95.65분이 정확히 일치한다.
- GEO 검증(T≈86164s 근방)도 정확히 재현되어 `T=2π√(a³/GM_E)` 공식 자체는 코드에 올바르게
  구현되어 있음을 확인했다.
- **결론: 코드(orbit.js)는 물리적으로 정확하다. 틀린 것은 지침서(`build-kepler-orbit-sim-instructions.md`)
  138~141행의 완료조건 문구("약 5560~5580초/92.7분")이다.** Build 에이전트의 자체 보고 주장은
  독립 재계산으로 확인되며 타당하다. 이 문구는 지침서 작성 시 고도 550km가 아니라 고도 약 400km급
  궤도(ISS류)의 주기를 착각해 적어 넣은 것으로 보인다. 코드를 지침서 문구에 맞춰 수정하는 것은
  물리적으로 틀린 방향이므로 하지 말아야 한다(향후 지침서 자체를 정정 권고).

---

## 체크리스트 결과

### 1. 파일 완전성

- [x] `index.html`, `css/style.css`, `js/orbit.js`, `js/renderer.js`, `js/main.js` 모두 존재
- [x] `js/groundtrack.js` 존재 — 선택 기능이지만 실제로 구현되어 있음(생략되지 않음). 검증 대상에 포함해 아래에서 확인.

### 2. 제약 조건 준수

- [x] `type="module"` 미사용 (주석에만 "type=\"module\" 사용 안 함"이라는 언급이 있을 뿐, 실제 속성 사용 없음) ✓
- [x] 외부 CDN 없음 (`grep -rnE 'https?://|cdn\.' index.html css/ js/` 결과 없음) ✓
- [x] `apps/kepler-orbit-sim/` 범위 준수: `git status`/`git diff --name-only` 확인 결과 —
  - `.claude/plan-agent-instructions.md`, `spec.md`가 modified 상태이나, **파일 mtime을 확인한 결과
    각각 22:24:47, 22:28:05에 수정되어 kepler-orbit-sim의 build 지침서 작성 시각(22:43:07)보다도
    이전이다.** 내용도 mlp-playground/fading-sim 관련(신경망 학습 놀이터 spec)으로 kepler-orbit-sim과
    무관함을 diff로 확인했다. 즉 **이 두 파일의 변경은 kepler-orbit-sim Build 에이전트의 작업이
    아니라 이전에 남아있던 무관한 dirty state**로 판단된다.
  - `apps/kepler-orbit-sim/` 자체는 새 파일들만 추가되었고 기존 블로그 파일(`index.html`, `post.html`,
    `/css`, `/js` 등 루트 파일)은 변경 없음 ✓

### 3. 브라우저 동작(정적 서버)

- [x] `python3 -m http.server 8934`로 서빙 후 curl 결과: `/`, `/index.html`, `/css/style.css`,
  `/js/orbit.js`, `/js/renderer.js`, `/js/groundtrack.js`, `/js/main.js` 모두 200 ✓
- [x] `node --check`로 4개 js 파일(`orbit.js`, `renderer.js`, `main.js`, `groundtrack.js`) 전부 구문 오류 없음 ✓
- [x] index.html의 id 참조와 실제 DOM id 1:1 일치 확인 — `main.js`가 참조하는 20개 id
  (`slider-a`, `slider-e`, `slider-i`, `val-a`, `val-e`, `val-i`, `btn-play`, `btn-reset`, `warn-box`,
  `sum-T`, `sum-vp`, `sum-va`, `sum-vt`, `sum-rpalt`, `sum-raalt`, `sum-ecc`, `sum-sma`,
  `val-presetbadge`, `orbit-canvas`, `groundtrack-canvas`)와 `index.html`에 정의된 id 목록이
  `comm` 비교 결과 정확히 일치(양쪽 diff 모두 빈 결과) ✓

### 4. 궤도역학 공식 재검증 (Node로 orbit.js 직접 로드)

- [x] `T = 2π√(a³/GM_E)`, `GM_E=3.986e14` 그대로 구현 확인(`orbit.js` 16~18행) ✓
- [x] e=0, a=42164km → **T = 86163.618초** (86164초 대비 -0.382초, ±10초 이내) ✓
- [x] e=0, a=6928km(LEO 프리셋) → **T = 5738.826초 = 95.6471분**.
  - 위 "알려진 이슈" 절 참고: 지침서의 "약 92.7분" 문구는 틀렸고, 코드가 계산한 95.65분이
    공개된 Starlink(550km) 궤도주기(약 95~96분)와 정확히 일치. **코드는 물리적으로 정확.**
- [x] 비스비바 방정식 `v(r,a)=√(GM_E(2/r-1/a))`이 a=r일 때 `√(GM_E/r)`과 정확히 같은 값을 냄:
  `v(r,a=r) = 7585.159328...`, `√(GM_E/r) = 7585.159328...` — **차이 0(bit-exact)** ✓
- [x] e=0.5, a=20000km 궤도에서 케플러 방정식(Newton-Raphson)으로 구한 위치들에 대해
  `r²·dν/dt`(각운동량)를 궤도상 7개 시점(t/T = 0.02, 0.15, 0.30, 0.50, 0.70, 0.85, 0.98)에서
  수치 미분으로 직접 계산 — 모두 `h ≈ 7.7324 × 10^10 m²/s`로 **소수점 5자리까지 일치**(요구된
  오차 1% 이내를 훨씬 상회하는 정밀도로 상수 확인). 케플러 제2법칙이 정확히 구현되었음을 확인 ✓
- [x] 근지점/원지점 반지름 `r_p=a(1-e)`, `r_a=a(1+e)`과 속도가 코드(`main.js` `updateNumericPanel`,
  `orbit.js` `rPerigee`/`rApogee`)에 올바르게 쓰임 — e=0.5, a=20000km 예시로 `r_p=10000km`,
  `r_a=30000km`, `v_p=7.732km/s`(근지점이 빠름), `v_a=2.577km/s`(원지점이 느림)로 케플러 2법칙과
  정합적인 결과 확인 ✓
- [x] 지상궤적 구현 존재(`groundtrack.js` + `main.js` `updateGroundTrack`) —
  `φ=asin(sin(i)·sin(u))`, `λ=atan2(cos(i)·sin(u), cos(u)) - ω_earth·t`
  (`ω_earth=2π/86164`, `orbit.js`의 `OMEGA_EARTH` 상수) 공식이 지침서/spec 그대로 구현됨을
  소스 확인(`main.js` 232~237행) ✓

### 5. UI/CSS

- [x] a 슬라이더(6478~45000km, LEO 기본값 6928km), e 슬라이더(0~0.8), LEO/MEO/GEO 프리셋 버튼 존재.
  프리셋 클릭 시 `a`, `e`가 각각 6928/26578/42164km, e=0으로 정확히 세팅됨(`main.js` PRESETS 객체
  및 클릭 핸들러 확인) ✓
- [x] 근지점 고도 음수(비현실적 궤도) 경고 처리 존재 — `rpAlt < 0`일 때 `warn-box`에 경고 문구 표시,
  아닐 때 숨김(`main.js` 221~226행). 예: a=6478km, e=0.8이면 `r_p=1295.6km`, 고도=-5082.4km로
  경고가 정상적으로 트리거되는 조건 확인 ✓
- [x] 하단 각주 "본문(위성통신 교재 8장 1절)은 원궤도 특수해를 다루며, 이 앱은 이를 일반 타원
  궤도로 확장했습니다"가 `index.html` `<footer class="app-footnote">`에 그대로 존재 ✓
  (spec.md 필수 요구사항과 문구 정확히 일치)
- [x] `@media (max-width: 900px)`, `640px`, `400px` 3단 반응형 모두 `style.css`에 존재
  (368행, 374행, 426행) ✓
- [x] 재생/일시정지/배속 컨트롤이 `requestAnimationFrame`/`cancelAnimationFrame`을 올바르게 사용:
  `play()`가 `requestAnimationFrame(loop)` 호출, `pause()`가 `cancelAnimationFrame(rafId)` 호출,
  `loop()` 내부에서 `if (!playing) return;`으로 재생 중일 때만 루프가 스스로 재귀 호출됨(`main.js`
  149~177행) ✓
- [x] a 또는 e 변경 시 애니메이션 리셋 후 재시작(`onOrbitParamChange` → `pause(); resetOrbit();
  renderStatic(); if (wasPlaying) play();`) — 규칙 5 충족 ✓

---

## 발견된 문제

**1건 — 지침서(문서) 오류, 코드 문제 아님**

- `/home/hugok/MY-BLOG/.claude/build-kepler-orbit-sim-instructions.md` 140~141행의 완료조건
  문구 "e=0, a=6928km(LEO)일 때 T가 약 5560~5580초(약 92.7분) 범위로 계산되는가"는 물리적으로
  틀렸다. 실제로는 5738.8초(95.65분)가 정답이며, 이는 92.7분이 아니라 고도 약 407km급 궤도의
  주기다. **코드(`orbit.js`)는 정확하며 수정할 필요가 없다.**

**부수 발견 (범위 밖, 참고용)**

- 저장소 루트에 `.claude/plan-agent-instructions.md`와 `spec.md`가 modified 상태로 남아 있으나,
  mtime과 내용 확인 결과 kepler-orbit-sim 작업과 무관한 이전 작업(mlp-playground 관련)의 dirty
  state로 판단된다. kepler-orbit-sim Build 에이전트가 야기한 문제는 아니다. 다만 저장소가 깨끗하지
  않은 상태이므로, 커밋 전에 사용자가 별도로 정리(커밋 또는 stash)할 필요가 있음을 참고로 남긴다.

---

## 수정 권고사항

- `build-kepler-orbit-sim-instructions.md` 140~141행("약 5560~5580초(약 92.7분)")을 실제 정답인
  "약 5730~5750초(약 95.6~95.8분)"로 정정 권고(문서 정정이며, 이번 리뷰 범위인 앱 코드 수정 대상은
  아님).
- 그 외 기능적 버그 없음. 나머지 체크리스트 항목 전부 통과.

---

## 주요 수치 검증 요약 (Node.js로 `orbit.js` 원본을 직접 실행해 재현)

| 항목 | 이론/기대값 | 코드 계산값 | 판정 |
|------|--------|-------------|------|
| GEO 궤도주기 (a=42164km) | 86164s ±10s | **86163.618s** | ✓ |
| LEO 궤도주기 (a=6928km, Starlink 550km급) | 공개값 약 95~96분 | **5738.826s = 95.647분** | ✓ (지침서의 "92.7분"은 틀림 — 아래 참고) |
| 비스비바(a=r) vs 원궤도 공식 | 완전 일치 필요 | **차이 0 (bit-exact)** | ✓ |
| 각운동량 h=r²·dν/dt (e=0.5, 7개 시점) | 오차 1% 이내로 상수 | **7.7324×10^10 (5자리 일치)** | ✓ |
| 근지점속도 vs 원지점속도 (e=0.5, a=20000km) | v_p > v_a | **v_p=7.732km/s > v_a=2.577km/s** | ✓ |
| DOM id 1:1 일치 | 20/20 | **20/20 일치** | ✓ |
| 정적 서버 리소스 200 | 7/7 | **7/7** | ✓ |
| js 구문 오류 | 0건 | **0건** (`node --check` ×4) | ✓ |

기능적 버그 없음. "알려진 이슈"는 독립 재계산으로 **지침서 문구가 틀렸고 코드가 맞다**고 최종
결론지었다.
