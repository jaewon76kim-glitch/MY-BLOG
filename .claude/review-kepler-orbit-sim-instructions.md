# Review 서브에이전트 지침: kepler-orbit-sim

## 목표

`/home/hugok/MY-BLOG/apps/kepler-orbit-sim/`의 구현을 독립적으로 검증하고 review.md를 작성한다.
너는 이 앱을 만든 Build 에이전트가 아니다 — Build 에이전트의 자체 보고를 그대로 믿지 말고, 직접
코드를 읽고 계산을 재현해서 검증해라. 문제를 발견해도 직접 수정하지 말고 review.md에 기록만 한다.

## 배경 자료 (먼저 읽을 것)

- `/home/hugok/MY-BLOG/spec-orbital-sim.md` (기획)
- `/home/hugok/MY-BLOG/.claude/build-kepler-orbit-sim-instructions.md` (Build 지침)

## 알려진 이슈 (검증 시 참고)

Build 에이전트가 다음을 보고했다: 지침서의 완료조건 문구가 "LEO(고도 550km) 궤도주기는 약
92.7분"이라고 적어놓았는데, 실제로 GM_E=3.986e14, a=6928km를 케플러 3법칙에 대입하면 T≈95.65분이
나오고(공개된 Starlink 궤도주기 약 95~96분과 일치), 92.7분은 오히려 고도 약 400km(ISS급) 궤도의
주기라 지침서 자체의 완료조건 문구가 틀렸다는 주장이다. **이 주장 자체를 네가 직접 계산해서
검증해라** — 지침서 문구와 Build 결과 중 어느 쪽이 물리적으로 맞는지 독립적으로 재확인하고, 실제로
GEO(a=42164km) 주기가 86164초 근방으로 나오는지도 함께 재계산해 이 앱의 T(a) 공식 자체가 맞는지
판단해라(코드가 잘못됐을 수도 있으니 지침서 주장을 무조건 신뢰하지 말 것).

## 검증 체크리스트

### 1. 파일 완전성

- [ ] index.html, css/style.css, js/orbit.js, js/renderer.js, js/main.js 존재 확인
- [ ] js/groundtrack.js 존재 여부 확인(선택 기능, 있으면 검증 대상에 포함)

### 2. 제약 조건 준수

- [ ] `type="module"` 미사용, 외부 CDN 없음
- [ ] `git status`/`git diff --name-only`로 `apps/kepler-orbit-sim/` 밖 파일이 전혀 수정되지 않았는지 확인

### 3. 브라우저 동작(정적 서버)

- [ ] `python3 -m http.server`로 서빙 후 curl로 모든 리소스 200 확인
- [ ] `node --check`로 모든 js 파일 구문 오류 없음 확인
- [ ] index.html의 id 참조와 실제 DOM id 1:1 일치 확인

### 4. 궤도역학 공식 재검증 (Node로 orbit.js를 직접 로드해 계산 — 위 "알려진 이슈" 항목 포함)

- [ ] `T = 2π√(a³/GM_E)`, `GM_E=3.986e14` 그대로 구현되어 있는가
- [ ] e=0, a=42164km → T ≈ 86164초(±10초) 확인
- [ ] e=0, a=6928km(LEO 프리셋) → T가 실제로 몇 초/몇 분으로 나오는지 직접 계산하고, 물리적으로 맞는
      값인지(실제 550km 고도 위성의 공개된 주기와 비교) 판단해 review.md에 명시
- [ ] 비스비바 방정식 `v(r,a)=√(GM_E(2/r-1/a))`이 a=r(원궤도)일 때 `√(GM_E/r)`과 정확히 같은 값을
      내는가
- [ ] e=0.5 궤도에서 케플러 방정식(Newton-Raphson)으로 구한 위치들에 대해 `r²·dν/dt`(각운동량)를
      직접 여러 시점에서 계산해 상수인지(오차 1% 이내) 재현·확인 — 이게 케플러 2법칙이 실제로 맞게
      구현됐다는 증거
- [ ] 근지점/원지점 반지름 `r_p=a(1-e)`, `r_a=a(1+e)`과 각 지점 속도가 코드에 올바르게 쓰이는가
- [ ] 지상궤적 구현이 있다면, `φ=asin(sin i·sin u)`, `λ=atan2(cos i·sin u, cos u) - ω_earth·t`
      (`ω_earth=2π/86164`) 공식이 그대로 쓰였는지 확인

### 5. UI/CSS

- [ ] a/e 슬라이더, LEO/MEO/GEO 프리셋 버튼이 존재하고 프리셋 클릭 시 a/e가 올바르게 세팅되는가
- [ ] 근지점 고도가 음수(비현실적 궤도)일 때의 경고 처리가 있다면 정상 동작하는가
- [ ] 하단에 "본문(8장 1절)은 원궤도 특수해를 다루며, 이 앱은 이를 일반 타원 궤도로 확장했습니다"
      각주가 실제로 존재하는가(spec 필수 요구사항)
- [ ] `@media (max-width: 900px)`, `640px`, `400px` 3단 반응형 존재
- [ ] 재생/일시정지/배속 컨트롤이 `requestAnimationFrame`/`cancelAnimationFrame`을 올바르게 쓰는가

## 결과 파일

검증 후 `/home/hugok/MY-BLOG/review-kepler-orbit-sim.md`를 doppler-sim 때 쓴 형식(검증결과 PASS/FAIL,
체크리스트 결과, 발견된 문제, 수정 권고사항, 수치 검증)으로 작성한다. "알려진 이슈" 항목에 대한
너의 독립적 판단(지침서 문구가 틀렸는지, 코드가 틀렸는지)을 review.md에 명확히 결론지어라. 문제가
있으면 직접 수정하지 말고 기록만 한다. 완료 후 "검증 완료"를 보고한다.
