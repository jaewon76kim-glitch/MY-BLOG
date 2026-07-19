# Review: fading-channel-sim

## 검증 결과: FAIL → 수정 완료 (2026-07-19, 메인 대화 에이전트가 아래 권고안 그대로 적용 후 재검증)

`js/fading.js`의 Rician LOS 진폭을 `mu=sqrt(2K/(K+1))`/정규화 `mu²+2`에서 `A=sqrt(2*K_lin)`/정규화
`2*K_lin+2`로 수정(아래 "수정 권고사항" 1번 그대로). Node.js로 재현 검증한 결과:
- 분산: K=20dB에서 측정 0.01975 vs 이론(정확한 K 기준) 0.0197 — 수정 전 0.7334(약 37배 오차)이던 것이 정확히 일치로 개선
- 프리셋 "위성 개활지 고앙각 Ka대역"(K=15dB) 아웃티지: 임계값 0dB에서 실측 52.55% vs 이론 52.48%,
  -10dB에서 실측 0.000000% vs 이론 0.000003% — 수정 전 7.51% vs 0.000003%(280만 배 차이)이던 것이 해소됨
- Rayleigh(K=0)·Nakagami는 원래 문제 없었으므로 영향 없음(회귀 확인 불필요 — 코드 변경이 rician 분기에만 한정됨)

아래는 수정 전 최초 리뷰 원문(문제 발견 과정 기록용으로 그대로 보존):

## 검증 결과: FAIL (라이시안 채널 생성의 K-factor 정규화 오류로 핵심 기능 손상)

파일 구성·제약조건·정적 서빙·이론 특수함수(Bessel I0/Gamma/불완전감마/Marcum-Q)·레일리/나카가미 채널
생성·통계 리셋 정책·UI/CSS는 모두 정상이다. 그러나 **`js/fading.js`의 라이시안(Rician) 시간축 채널
생성기가 `theory.js`에 전달하는 것과 다른 실제 K-factor를 만들어내는 정규화 버그**가 있다. 이 때문에
이 앱의 핵심 기능인 "이론 PDF vs 몬테카를로 히스토그램 오버레이"와 "실측 아웃티지 vs 이론 아웃티지
비교"가 Rician 모델에서(K=0 제외) 항상 어긋난다. Node.js로 Monte Carlo 재현 검증한 결과, 프리셋
"위성 개활지 고앙각 Ka대역"(K=15dB)에서 임계값 -10dB 기준 이론 아웃티지는 0.000003%인데 실제
시뮬레이션 실측 아웃티지는 7.5%로, 약 280만 배 차이가 난다(아래 수치 검증 참조).

## 체크리스트 결과

### 1. 파일 완전성
- [x] `index.html`, `css/style.css`, `js/fading.js`, `js/theory.js`, `js/stats.js`, `js/charts.js`,
      `js/main.js`, `js/vendor/chart.umd.min.js` 모두 존재
- [x] `js/vendor/chart.umd.min.js`가 `apps/link-budget-calc`, `apps/doppler-sim`, `apps/constellation-sim`
      세 곳의 사본과 `diff` 결과 완전 동일(바이트 단위), md5sum `3a1612b2a2ed332a6c1793fc73fa564a`도 4곳 모두 동일

### 2. 제약 조건 준수
- [x] `type="module"` 실사용 없음 (주석에서만 "사용 안 함"이라 언급, 실제 `<script>` 태그 6개 전부 속성 없음)
- [x] 외부 CDN `<script src="http...">` 없음 — 모든 `<script src>`가 `js/...` 로컬 경로
- [x] `git status`/`git diff --name-only` 확인 결과 `apps/fading-channel-sim/` 관련 커밋 대상 파일 외에는
      이 앱의 Build 작업으로 인한 변경 없음.
      - 단, `spec.md`와 `.claude/plan-agent-instructions.md`가 modified 상태로 잡히지만, `stat` 타임스탬프
        확인 결과 두 파일 모두 `spec-fading-sim.md`(이 앱의 기획서)가 만들어지기 **이전**에 이미 수정되어
        있었다(mlp-playground/kepler-orbit-sim 등 저장소 내 별도 동시 작업의 흔적으로 보임). 즉
        fading-channel-sim Build 에이전트가 범위를 벗어나 건드린 것이 아니다 — 착오 없도록 기록만 해둔다.

### 3. 브라우저 동작(정적 서버)
- [x] `python3 -m http.server`로 서빙 후 curl로 `index.html`, `css/style.css`, `js/theory.js`,
      `js/fading.js`, `js/stats.js`, `js/charts.js`, `js/main.js`, `js/vendor/chart.umd.min.js` 전부 HTTP 200
- [x] `node --check`로 5개 js 파일(fading/theory/stats/charts/main) 모두 구문 오류 없음
- [x] index.html의 `id` 26개(모델 버튼 3, group-k/m, slider 5, val 5, btn-play/reset, sum-* 6, chart 2)와
      `js/main.js`의 `el[...]` DOM 참조 배열 26개 항목이 정확히 1:1 일치(정적 교차검증, 누락/오참조 없음)

### 4. 이론 공식 재검증 (Node로 theory.js 직접 로드, 재현 계산)
- [x] K=0일 때 라이시안 PDF와 레일리 PDF가 x∈{0.001,0.1,0.5,1,2,5,10}에서 정확히 일치(diff=0, 부동소수점
      완전 동일 — `ricianPDF`가 `K_lin<=0`일 때 `rayleighPDF`로 조기 반환하는 코드 경로 확인)
- [x] m=1일 때 나카가미 PDF와 레일리 PDF가 동일 x 목록에서 오차 ≤2.2e-16(부동소수점 반올림 수준)로 일치
- [x] 레일리 이론 아웃티지: `rayleighOutage(1)` = 0.6321205588285577 = `1-e^-1` 그대로(오차 0)
- [x] Marcum-Q1 기반 `ricianOutage`를 K: -10~20dB(7개 값) × γ_th: -10~10dB(5개 값) = 35개 조합,
      `nakagainOutage`를 m: 0.5~10(9개 값) × γ_th: -10~10dB(5개 값) = 45개 조합 스윕 — 전부 [0,1] 범위,
      NaN/Infinity 없음. `ricianPDF`도 K 7값×x 10값=70개 조합 스윕해 음수/NaN/Infinity 없음 확인
- [x] `mFromK`가 `(K+1)^2/(2K+1)` 그대로 구현됨(K_lin∈{0,0.5,1,2,5,10,100}에서 직접 계산값과 오차 0)

### 5. 채널 생성(fading.js) 검증
- [x] Clarke/Jakes sum-of-sinusoids(N=24 오실레이터, 지침 범위 16~32 내) 방식으로 시간상관 가우시안 프로세스
      X(t)/Y(t) 생성 확인 (`evalBankCos`/`evalBankSin`)
- [x] Rayleigh 몬테카를로 앙상블 평균(4만 샘플): 평균 1.0062, 분산 0.9826 (이론: 평균1, 분산1 — 지수분포) — 양호
- [x] **Rician: 리셋 필요 — 아래 "발견된 문제" 참조. 히스토그램 평균 자체는 정규화 설계상 항상 정확히
      1로 수렴하므로 "평균 ±10% 이내" 항목은 통과하지만, 분산(=분포 모양, 즉 실질 K-factor)이 슬라이더
      입력 K와 전혀 다르게 나온다.**
- [x] Nakagami 시간축 생성(확률적분변환: 저역통과 가우시안 → normalCDF → `nakagamiInverseCDF`) 검증:
      m=0.5(4만 샘플): 평균 0.9947, 분산 1.9441 (이론: 평균1, 분산2.0) — 양호
      m=1: 평균 1.0030, 분산 1.0032 (이론 1, 1) — 양호
      m=2: 평균 0.9976, 분산 0.4921 (이론 1, 0.5) — 양호
      m=5: 평균 1.0015, 분산 0.1993 (이론 1, 0.2) — 양호
- [x] 모델 전환/K 슬라이더/m 슬라이더 변경 시 `Stats.reset()` + `FadingCharts.resetPdfChart()` 호출 확인
      (main.js 82~90행, 101~118행, 154~180행). γ̄/f_D/th 슬라이더는 정규화 분포 자체를 바꾸지 않는다는
      이유로 리셋을 안 하는데(주석에 근거 명시), 분포 모양이 바뀌는 경우(모델/K/m)는 예외 없이 리셋되므로
      필수 요구사항은 충족

### 6. UI/CSS
- [x] 모델 전환 버튼 3개(`btn-model-rayleigh/rician/nakagami`), K 슬라이더는 `group-k`(Rician만 `display:flex`),
      m 슬라이더는 `group-m`(Nakagami만 `display:flex`)로 토글 — `applyModelVisibility()` 로직 확인
- [x] 프리셋 4개 모두 spec과 정확히 일치: urban-nlos(rayleigh,K=0dB) / sat-open-ka(rician,K=15dB) /
      sat-urban-low(rician,K=0dB) / indoor-multipath(nakagami,m=0.5)
- [x] `@media (max-width: 900px)`, `640px`, `400px` 3단 반응형 존재. 640px에서 `.main-layout`이
      `flex-direction: column`으로 전환(입력 패널 위/출력 아래) — 기존 doppler-sim/link-budget-calc와
      동일하게 900px는 차트 min-height만 조정하고 실제 스택 전환은 640px에서 일어남(기존 앱 관례와 일치,
      버그 아님)
- [x] 재생 시 `requestAnimationFrame(loop)`, 일시정지 시 `cancelAnimationFrame(rafId)` 정확히 사용, 재생
      중이 아니면 `loop()` 첫 줄에서 즉시 반환

## 발견된 문제

### 1. [심각] Rician 채널 생성기의 K-factor가 슬라이더 입력값과 다르게 구현됨 (`js/fading.js` 111~130행)

`createGenerator('rician').sample()`은 다음과 같이 계산한다(111~130행):

```js
function normConstRician(K) {
  var mu2 = (2 * K) / (K + 1);
  return mu2 + 2;
}
...
var mu = Math.sqrt((2 * K_lin) / (K_lin + 1));
var Xr = evalBankCos(bankX, fD, t) + mu;
var Yr = evalBankSin(bankY, fD, t);
var normR = normConstRician(K_lin);
return (Xr * Xr + Yr * Yr) / normR;
```

`evalBankCos`/`evalBankSin`이 만드는 raw X, Y는 평균 0, 분산 1(σ=1)의 저역통과 가우시안이다.
σ=1을 고정하고 LOS 진폭 A(=mu)를 더한 뒤 `E[(X+A)²+Y²] = A²+2`로 나누어 정규화하면, 결과 분포의
"실질" K-factor(비정규화 노운센트럴 카이제곱 분포에서 λ/2로 정의됨, λ=A²/σ²=A²)는
**`K_eff = A²/2 = K_lin/(K_lin+1)`이 되어, `theory.js`에 넘기는 입력 `K_lin` 그 자체와 다르다.**

물리적으로 올바르게 구현하려면(σ=1 고정 시) `A = sqrt(2*K)`, 정규화 분모는 `2*K+2`여야
`K_eff = K` 그대로 보존된다(`build-fading-channel-sim-instructions.md` 88행이 지시한
`X(t) += sqrt(2K/(K+1))` 자체가 이미 이 관계식과 맞지 않는 것으로 보인다 — Build 지침 문서 원문의
공식이 잘못되었거나, 정규화 분모를 다르게 잡았어야 한다).

**결과적으로 K를 아무리 크게(20dB=K_lin=100) 올려도 실제 생성되는 채널의 K_eff는 `K/(K+1)`이므로
1에 수렴할 뿐 결코 커지지 않는다.** 즉 "K가 클수록 라이시안이 AWGN에 가까워진다"(hint-box 문구,
스펙의 프리셋 2 설명 "사실상 AWGN에 근접")를 시뮬레이션 자체가 재현하지 못한다 — 슬라이더를 아무리
돌려도 몬테카를로 히스토그램은 거의 변하지 않고 항상 중간 정도로 퍼진 모양을 유지한다.

이는 spec-fading-sim.md §2 항목 3("이론 PDF vs 몬테카를로 히스토그램 오버레이... 이론-실측 일치를
직접 검증하는 것")과 항목 4(아웃티지 실측/이론 비교)가 명시한 **이 앱의 핵심 차별점 자체가 Rician
모델에서는(K=0 제외) 작동하지 않음**을 의미한다. Rayleigh(K=0의 특수해라 우연히 일치)와 Nakagami는
이 문제가 없다.

### 2. (참고, 문제 아님) `apps/fading-channel-sim/` 외부에서 감지된 git 변경

`spec.md`, `.claude/plan-agent-instructions.md`가 modified 상태이지만, 타임스탬프 확인 결과
`spec-fading-sim.md`보다 먼저 수정되어 있어 이 앱의 Build 작업과 무관한(동시 진행 중이던 다른
앱 — kepler-orbit-sim/mlp-playground 관련) 이전 상태로 판단된다. fading-channel-sim Build
에이전트가 범위를 벗어난 것은 아니다.

## 수정 권고사항

1. **[필수] `js/fading.js`의 Rician 정규화 수정.** σ=1로 고정된 raw `Xc,Yc`를 그대로 쓰려면:
   ```js
   var A = Math.sqrt(2 * K_lin);              // 기존 mu = sqrt(2K/(K+1)) 대신
   var Xr = evalBankCos(bankX, fD, t) + A;
   var Yr = evalBankSin(bankY, fD, t);
   var norm = 2 * K_lin + 2;                  // 기존 normConstRician(K) = mu²+2 대신
   return (Xr*Xr + Yr*Yr) / norm;
   ```
   이렇게 하면 `E[Xr²+Yr²]=norm`으로 정규화 평균이 여전히 1을 유지하면서, 결과 분포의 실질 K-factor가
   정확히 입력 `K_lin`과 일치한다(노운센트럴 카이제곱 K=λ/2, λ=A²=2K 이므로 K_eff=K).
   수정 후 반드시 이번 리뷰에서 쓴 것과 같은 Node 재현 테스트(다양한 K에서 앙상블 분산 비교, 큰 K에서
   분산이 0에 가까워지는지)로 재검증할 것을 권고한다.
2. **[권고]** 수정 후 프리셋 "위성 개활지 고앙각 Ka대역"(K=15dB)에서 재생 중 히스토그램이 실제로
   x=1 근방에 좁게 몰리는지, "실측 아웃티지"와 "이론 아웃티지" 숫자가 낮은 임계값에서 비슷한 자릿수로
   나오는지 브라우저에서 육안 확인할 것.

## 수치 검증

### 이론 함수 (theory.js, Node vm으로 직접 로드해 재현)

| 항목 | 결과 |
|---|---|
| K=0 Rician PDF vs Rayleigh PDF (x=0.001~10, 7점) | 모두 오차 0 (완전 일치) |
| m=1 Nakagami PDF vs Rayleigh PDF (x=0.001~10, 7점) | 모두 오차 ≤2.22e-16 (부동소수점 한계) |
| `rayleighOutage(1)` | 0.6321205588285577 (`1-e^-1`과 일치) |
| Rician outage(K=0) vs Rayleigh outage, xth={0.1,0.5,1,2,5} | 모두 완전 일치 |
| Nakagami outage(m=1) vs Rayleigh outage, xth={0.1,0.5,1,2,5} | 모두 일치(오차 ≤1e-16) |
| Marcum-Q1 기반 `ricianOutage` 스윕 (K:-10~20dB×7, xth:-10~10dB×5 = 35조합) | 전부 [0,1], NaN/Inf 0건 |
| `nakagamiOutage` 스윕 (m:0.5~10×9, xth:-10~10dB×5 = 45조합) | 전부 [0,1], NaN/Inf 0건 |
| `ricianPDF` 스윕 (K×7, x:0.001~50×10 = 70조합) | 전부 유한·비음수 |
| `mFromK(K_lin)` vs `(K+1)²/(2K+1)` 직접계산, K_lin∈{0,0.5,1,2,5,10,100} | 완전 일치 |

### 채널 생성 (fading.js, 독립 생성기 앙상블 4만~6만 샘플)

| 모델 | 파라미터 | 측정 평균 (이론 1) | 측정 분산 (이론값) |
|---|---|---|---|
| Rayleigh | — | 1.0062 | 0.9826 (이론 1) |
| Nakagami | m=0.5 | 0.9947 | 1.9441 (이론 2.0) |
| Nakagami | m=1 | 1.0030 | 1.0032 (이론 1.0) |
| Nakagami | m=2 | 0.9976 | 0.4921 (이론 0.5) |
| Nakagami | m=5 | 1.0015 | 0.1993 (이론 0.2) |
| Rician | K=0dB(K_lin=1) | 1.0000 | 0.8699 (이론 K=1: **0.75** / 이론 K_eff=0.5: 0.8889) |
| Rician | K=5dB(K_lin=3.16) | 0.9998 | 0.7999 (이론 K=3.16: **0.4228** / 이론 K_eff=0.76: 0.8136) |
| Rician | K=10dB(K_lin=10) | 0.9983 | 0.7584 (이론 K=10: **0.1736** / 이론 K_eff=0.909: 0.7732) |
| Rician | K=15dB(K_lin=31.6) | 0.9975 | 0.7502 (이론 K=31.6: **0.0604** / 이론 K_eff=0.969: 0.7577) |
| Rician | K=20dB(K_lin=100) | 0.9949 | 0.7334 (이론 K=100: **0.0197** / 이론 K_eff=0.990: 0.7525) |

Rician의 측정 분산은 슬라이더 입력 K에 대응하는 이론 분산과는 K가 커질수록 점점 더 크게 벌어지고
(K=20dB에서 0.7334 vs 0.0197, 약 37배), `K_eff=K/(K+1)`에 대응하는 이론 분산과는 항상 거의 일치한다
— fading.js가 실제로 만들어내는 것은 입력 K가 아니라 K_eff임을 확정적으로 보여준다.

### 아웃티지 실측 vs 이론 불일치 사례 (프리셋 "위성 개활지 고앙각 Ka대역", K=15dB)

| 임계값 γ_th/γ̄ | 이론 아웃티지 (theory.js, 입력 K=15dB 그대로) | 실측 아웃티지 (fading.js 몬테카를로 20만 샘플 재현) |
|---|---|---|
| 0 dB (xth=1) | 52.48% | 60.65% |
| **-10 dB (xth=0.1)** | **0.000003%** | **7.51%** |

임계값 -10dB에서 이론은 "깊은 페이드가 사실상 일어나지 않는다"(K가 크므로 AWGN에 근접)고 예측하지만,
실제 시뮬레이션은 7.5%의 상당한 아웃티지를 보인다 — 약 280만 배 차이. 이는 브라우저에서 실제로
재생해 보면 요약 카드의 "실측 아웃티지"와 "이론 아웃티지" 숫자가 극명하게 어긋나는 형태로 즉시
드러난다.

## 결론

파일 구조·정적 서빙·구문·DOM id 정합성·이론 특수함수(Bessel/Gamma/불완전감마/Marcum-Q)·Rayleigh/
Nakagami 채널 생성·통계 리셋 정책·프리셋 값·반응형 CSS·애니메이션 루프는 모두 지침대로 정확히
구현되어 있다. 그러나 Rician 채널 생성기의 K-factor 정규화 오류로 인해, 이 앱이 표방하는 핵심 기능
("이론 PDF/아웃티지와 몬테카를로 실측의 일치를 직접 검증")이 Rician 모델(K>0)에서 실제로는 성립하지
않는다. 이 문제는 반드시 수정이 필요하다고 판단해 전체 검증 결과를 **FAIL**로 기록한다.
