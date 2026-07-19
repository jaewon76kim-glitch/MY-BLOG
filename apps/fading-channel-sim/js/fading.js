// fading.js - 채널 생성: Clarke/Jakes sum-of-sinusoids 모델 + 나카가미 감마 샘플러
// (전역 변수 방식, type="module" 사용 안 함)
//
// 근거: build-fading-channel-sim-instructions.md "채널 생성 (fading.js) — 시간축 포락선"
//
// 설계 요약
// ---------
// - 레일리/라이시안: 두 개의 독립 저역통과 가우시안 프로세스 X(t), Y(t)를 sum-of-sinusoids(Clarke 모델)로
//   생성한다. 라이시안은 X(t)에 LOS 성분 sqrt(2K)를 더한다(σ=1 고정 시 K=A²/2σ²=λ/2 정의를 그대로
//   보존하는 값 — 2026-07-19 리뷰에서 발견된 sqrt(2K/(K+1)) 버그를 수정함, review-fading-channel-sim.md
//   참고). 전체 평균전력이 정확히 1이 되도록 해석적으로 알려진 기댓값 E[Xraw²+Yraw²] = 2K + 2 로 나누어
//   정규화한다.
// - 나카가미-m: Clarke 모델이 물리적으로 자연스럽지 않으므로, 감마분포 직접 샘플링(Marsaglia-Tsang)을
//   기반으로 한다. 다만 매 프레임 독립적으로 새 감마 표본을 뽑으면 시간축이 백색잡음처럼 보여
//   "페이딩 애니메이션" 느낌이 나지 않는다. 그렇다고 감마 표본들을 지수이동평균(EMA)으로 직접 평균내면
//   평균은 유지되지만 분산이 줄어들어 누적 히스토그램이 이론 PDF보다 좁아지는 문제가 생긴다
//   ("PDF와 아웃티지 정합성이 더 중요"라는 지침 요구와 충돌).
//   그래서 이 구현은 다음 방식을 쓴다:
//     1) Clarke 모델과 동일한 sum-of-sinusoids로 세 번째 독립 저역통과 가우시안 프로세스 Z(t)를 만든다
//        (평균 0, 분산 1, fD로 상관시간 조절 — Rayleigh/Rician의 X,Y와 동일한 메커니즘).
//     2) 표준정규 CDF Φ(Z(t))로 Z(t)를 균일분포 U(t)∈(0,1)로 변환한다(오차함수 근사 사용).
//     3) U(t)를 나카가미 정규화 CDF의 역함수(이분탐색, theory.js의 gammainc 이용)에 통과시켜
//        정규화 SNR 표본을 얻는다.
//   확률적분변환(inverse-CDF / PIT)이므로 한계분포(marginal)는 항상 정확히 Nakagami(m)이고
//   (theory.js의 근사 정확도 한도 내에서), 시간 상관은 Z(t)의 코히어런스 시간(1/fD)을 그대로 물려받아
//   "완만/빠른 페이딩"이 시각적으로 자연스럽게 재현된다.

var Fading = (function () {
  'use strict';

  var N_OSC = 24; // 오실레이터 개수 (지침: 16~32)

  // ---- Box-Muller 가우시안 난수 ----
  function gaussianRandom() {
    var u1 = Math.random();
    var u2 = Math.random();
    if (u1 < 1e-12) u1 = 1e-12;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // 오차함수 근사 (Abramowitz & Stegun 7.1.26)
  function erf(x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * x);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function normalCDF(z) {
    return 0.5 * (1 + erf(z / Math.SQRT2));
  }

  // ---- Clarke/Jakes 오실레이터 뱅크 ----
  // α_n = (2πn - π + θ)/(4N), θ는 랜덤 오프셋, φ_n은 균일분포 [0,2π) 위상(시작 시 1회 고정)
  function makeBank(N) {
    var theta = Math.random() * 2 * Math.PI;
    var alphas = new Array(N);
    var phis = new Array(N);
    for (var n = 1; n <= N; n++) {
      alphas[n - 1] = (2 * Math.PI * n - Math.PI + theta) / (4 * N);
      phis[n - 1] = Math.random() * 2 * Math.PI;
    }
    return { alphas: alphas, phis: phis, N: N };
  }

  function evalBankCos(bank, fD, t) {
    var sum = 0;
    for (var i = 0; i < bank.N; i++) {
      sum += Math.cos(2 * Math.PI * fD * Math.cos(bank.alphas[i]) * t + bank.phis[i]);
    }
    return Math.sqrt(2 / bank.N) * sum;
  }

  function evalBankSin(bank, fD, t) {
    var sum = 0;
    for (var i = 0; i < bank.N; i++) {
      sum += Math.sin(2 * Math.PI * fD * Math.cos(bank.alphas[i]) * t + bank.phis[i]);
    }
    return Math.sqrt(2 / bank.N) * sum;
  }

  // ---- 나카가미 감마 샘플러 (Marsaglia-Tsang, 참고/검증용 — 직접 몬테카를로 백업 경로) ----
  // shape < 1일 때는 boost 기법: Gamma(shape+1)에서 뽑고 U^(1/shape)를 곱한다.
  function sampleGamma(shape, scale) {
    if (shape < 1) {
      var u = Math.random();
      return sampleGamma(shape + 1, scale) * Math.pow(u, 1 / shape);
    }
    var d = shape - 1 / 3;
    var c = 1 / Math.sqrt(9 * d);
    while (true) {
      var x, v;
      do {
        x = gaussianRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      var u2 = Math.random();
      if (u2 < 1 - 0.0331 * x * x * x * x) return d * v * scale;
      if (Math.log(u2) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  // ---- 채널 생성기 (모델별 상태 보유) ----
  function createGenerator(model) {
    var bankX = makeBank(N_OSC);
    var bankY = makeBank(N_OSC);
    var bankZ = makeBank(N_OSC); // 나카가미 전용 구동 가우시안 프로세스

    function normConstRician(K) {
      // 노운센트럴 카이제곱의 K-factor 정의(K=λ/2, λ=A²/σ²)를 σ=1 기준으로 보존하려면
      // A = sqrt(2K)이어야 한다(기존 mu=sqrt(2K/(K+1))는 실질 K_eff=K/(K+1)을 만들어
      // K를 아무리 키워도 1에 수렴할 뿐인 버그였음 — review-fading-channel-sim.md 참고).
      // E[(Xc+A)^2 + Yc^2] = A^2 + 2 = 2K + 2로 정규화하면 결과의 실질 K-factor가 정확히 K가 된다.
      return 2 * K + 2;
    }

    // t: 경과 시간(초), fD: 도플러 확산(Hz), K_lin: 라이시안 K(선형), m: 나카가미 m
    function sample(t, fD, K_lin, m) {
      if (model === 'rayleigh') {
        var Xc = evalBankCos(bankX, fD, t);
        var Yc = evalBankSin(bankY, fD, t);
        var norm = 2; // K=0 → normConstRician(0) = 2
        return (Xc * Xc + Yc * Yc) / norm;
      }
      if (model === 'rician') {
        var A = Math.sqrt(2 * K_lin);
        var Xr = evalBankCos(bankX, fD, t) + A;
        var Yr = evalBankSin(bankY, fD, t);
        var normR = normConstRician(K_lin);
        return (Xr * Xr + Yr * Yr) / normR;
      }
      if (model === 'nakagami') {
        var Z = evalBankCos(bankZ, fD, t); // 평균0 분산1 저역통과 가우시안
        var u = normalCDF(Z);
        return Theory.nakagamiInverseCDF(u, m);
      }
      return 1;
    }

    return { sample: sample };
  }

  return {
    N_OSC: N_OSC,
    gaussianRandom: gaussianRandom,
    normalCDF: normalCDF,
    sampleGamma: sampleGamma,
    createGenerator: createGenerator
  };
})();
