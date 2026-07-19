# Review 서브에이전트 지침: fading-channel-sim

## 목표

`/home/hugok/MY-BLOG/apps/fading-channel-sim/`의 구현을 독립적으로 검증하고 review.md를 작성한다.
너는 이 앱을 만든 Build 에이전트가 아니다 — Build 에이전트의 자체 보고를 그대로 믿지 말고, 직접
코드를 읽고 계산을 재현해서 검증해라. 문제를 발견해도 직접 수정하지 말고 review.md에 기록만 한다.

## 배경 자료 (먼저 읽을 것)

- `/home/hugok/MY-BLOG/spec-fading-sim.md` (기획)
- `/home/hugok/MY-BLOG/.claude/build-fading-channel-sim-instructions.md` (Build 지침)

## 검증 체크리스트

### 1. 파일 완전성

- [ ] index.html, css/style.css, js/fading.js, js/theory.js, js/stats.js, js/charts.js, js/main.js,
      js/vendor/chart.umd.min.js 모두 존재하는가
- [ ] js/vendor/chart.umd.min.js가 기존 앱(link-budget-calc 등)의 사본과 바이트 단위로 동일한가(`diff`)

### 2. 제약 조건 준수

- [ ] `type="module"` 속성이 실사용되지 않는가
- [ ] 외부 CDN `<script src="http...">` 없음
- [ ] `git status`/`git diff --name-only`로 `apps/fading-channel-sim/` 밖 파일이 전혀 수정되지 않았는지 확인

### 3. 브라우저 동작(정적 서버)

- [ ] `python3 -m http.server`로 서빙 후 curl로 모든 리소스 200 확인
- [ ] `node --check`로 모든 js 파일 구문 오류 없음 확인
- [ ] index.html의 id 참조와 실제 DOM id가 1:1 일치하는지 정적 교차검증

### 4. 이론 공식 재검증 (Node로 theory.js를 직접 로드해 계산 — Build 보고를 그대로 믿지 말고 재현할 것)

- [ ] K=0일 때 라이시안 PDF와 레일리 PDF가 여러 γ 값에서 정확히 일치하는가
- [ ] m=1일 때 나카가미 PDF와 레일리 PDF가 여러 γ 값에서 정확히 일치하는가
- [ ] 레일리 이론 아웃티지: γ_th=γ̄(0dB)에서 `1-e^{-1}≈0.63212`가 나오는가
- [ ] Marcum-Q1(a,b)과 정규화 불완전감마 P(m,x)가 파라미터를 넓게(K: -10~20dB, m: 0.5~10, γ_th: -10~10dB) 스윕했을 때 항상 [0,1] 범위 안에 있고 NaN/Infinity가 없는가
- [ ] K↔m 변환식 `m≈(K+1)²/(2K+1)`이 코드에 그대로 구현되어 있는가

### 5. 채널 생성(fading.js) 검증

- [ ] Clarke/Jakes sum-of-sinusoids 또는 이와 동등한 방식으로 시간상관된 가우시안 프로세스를 생성하는가
- [ ] 몬테카를로 누적 히스토그램의 평균이 설정한 γ̄(정규화 기준 1.0)에 ±10% 이내로 수렴하는가(직접 시뮬레이션 재현해서 확인)
- [ ] 나카가미 시간축 생성 방식이 무엇이든(EMA/역CDF 변환 등), 그 결과 분포의 평균과 분산이 이론값
      (평균=1, 분산=1/m)에 가까운지 직접 계산해 확인 — 특히 m이 작을 때(예: m=0.5, 분산=2.0)와 클 때
      (예: m=5, 분산=0.2) 양쪽 다 확인
- [ ] 모델/K/m 전환 시 누적 통계(히스토그램/아웃티지)가 리셋되어 이전 모델 샘플과 섞이지 않는가 —
      리셋 정책이 build 보고서와 다르게 구현되어 있어도(예: γ̄/f_D/threshold 변경 시 리셋 여부가 다르게
      해석됨) 그 자체가 버그는 아니지만, **분포 모양이 바뀌는 경우(모델 전환, K/m 변경)에는 반드시 리셋되는지**는
      필수로 확인한다

### 6. UI/CSS

- [ ] 모델 전환 버튼 3개, K 슬라이더(Rician만 노출)/m 슬라이더(Nakagami만 노출) 토글이 올바른가
- [ ] 프리셋 4개(도심 NLOS/개활지 고앙각/도심협곡 저앙각/실내 다중경로)가 스펙에 맞는 K/m 값으로 설정되는가
- [ ] `@media (max-width: 900px)`, `640px`, `400px` 3단 반응형 존재
- [ ] 재생/일시정지 시 `requestAnimationFrame`/`cancelAnimationFrame`이 올바르게 쓰이는가

## 결과 파일

검증 후 `/home/hugok/MY-BLOG/review-fading-channel-sim.md`를 doppler-sim 때 쓴 형식(검증결과 PASS/FAIL,
체크리스트 결과, 발견된 문제, 수정 권고사항, 수치 검증)으로 작성한다. 문제가 있으면 직접 수정하지 말고
기록만 한다. 완료 후 "검증 완료"를 보고한다.
