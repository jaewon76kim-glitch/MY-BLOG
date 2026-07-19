// theory.js - 이론 PDF/아웃티지/특수함수 (전역 변수 방식, type="module" 사용 안 함)
//
// 근거: spec-fading-sim.md, 위성통신_소스.tex 316~450줄 요약
//   - 모든 수식은 정규화 SNR x = γ/γ̄ 기준 (γ̄ = 1로 두고 계산). 실제 dB 표시는 main.js에서
//     γ̄_dB + 10*log10(x)로 환산한다.
//   - 레일리: f(x) = exp(-x)                                    (K=0인 라이시안과 정확히 일치해야 함)
//   - 라이시안: f(x) = (K+1)*exp(-K)*exp(-(K+1)x)*I0(2*sqrt(K(K+1)x))
//   - 나카가미: f(x) = (1/Γ(m)) * m^m * x^(m-1) * exp(-m x)      (m=1일 때 레일리와 정확히 일치해야 함)
//   - 아웃티지: 레일리 1-e^-xth, 나카가미 P(m, m*xth), 라이시안 1-Q1(sqrt(2K), sqrt(2(K+1)*xth))

var Theory = (function () {
  'use strict';

  // ========================================================================
  // Bessel I0(x) — 급수전개(작은 x) + 점근식(큰 x)
  // ========================================================================

  // I0(x) 직접 계산 (오버플로 위험 있음 — 큰 x에서는 besselI0Scaled를 조합해서 쓸 것)
  function besselI0(x) {
    x = Math.abs(x);
    if (x < 15) {
      // Σ (x/2)^(2k) / (k!)^2
      var halfX = x / 2;
      var term = 1;
      var sum = 1;
      for (var k = 1; k < 40; k++) {
        term *= (halfX * halfX) / (k * k);
        sum += term;
        if (term < sum * 1e-16) break;
      }
      return sum;
    }
    // 점근식 I0(x) ≈ exp(x)/sqrt(2πx) * (1 + 1/(8x) + 9/(128x^2) + ...)
    var inv = 1 / x;
    var series = 1 + inv / 8 + 9 * inv * inv / 128 + 225 * inv * inv * inv / 3072;
    return Math.exp(x) / Math.sqrt(2 * Math.PI * x) * series;
  }

  // 스케일된 Bessel I0: exp(-x) * I0(x). 항상 (0, ~0.4] 범위에 들어와 오버플로가 없다.
  // 라이시안 PDF/Marcum-Q 적분에서 exp(x-K) 형태로 지수부를 미리 합칠 때 이 함수를 사용한다.
  function besselI0Scaled(x) {
    x = Math.abs(x);
    if (x < 15) {
      return Math.exp(-x) * besselI0(x);
    }
    var inv = 1 / x;
    var series = 1 + inv / 8 + 9 * inv * inv / 128 + 225 * inv * inv * inv / 3072;
    return series / Math.sqrt(2 * Math.PI * x);
  }

  // ========================================================================
  // Γ(m) — Lanczos 근사 (m >= 0.5에서 충분히 정확)
  // ========================================================================

  var LANCZOS_G = 7;
  var LANCZOS_COEF = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];

  function gammaFn(z) {
    if (z < 0.5) {
      // 반사공식: Γ(z)Γ(1-z) = π/sin(πz)
      return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
    }
    z -= 1;
    var x = LANCZOS_COEF[0];
    for (var i = 1; i < LANCZOS_G + 2; i++) {
      x += LANCZOS_COEF[i] / (z + i);
    }
    var t = z + LANCZOS_G + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  // ========================================================================
  // 정규화 하위 불완전감마함수 P(a, x) = γ(a,x)/Γ(a)
  // Numerical Recipes 패턴: x < a+1이면 급수전개, 아니면 연분수(상보 Q(a,x)=1-P) 사용
  // ========================================================================

  function gammaIncSeries(a, x) {
    // P(a,x)를 급수로 직접 계산 (x < a+1일 때 수렴이 빠름)
    if (x <= 0) return 0;
    var ap = a;
    var sum = 1 / a;
    var del = sum;
    for (var n = 1; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }

  function gammaIncCf(a, x) {
    // Q(a,x)를 연분수로 계산 (x >= a+1일 때 사용), Lentz 알고리즘
    var TINY = 1e-30;
    var b = x + 1 - a;
    var c = 1 / TINY;
    var d = 1 / b;
    var h = d;
    for (var i = 1; i < 500; i++) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < TINY) d = TINY;
      c = b + an / c;
      if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      var delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-14) break;
    }
    return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
  }

  function lnGamma(z) {
    return Math.log(gammaFn(z));
  }

  // 정규화 하위 불완전감마함수 P(a,x), a>0, x>=0. 항상 [0,1] 범위로 클램프.
  function gammainc(a, x) {
    if (x < 0 || a <= 0) return 0;
    if (x === 0) return 0;
    var result;
    if (x < a + 1) {
      result = gammaIncSeries(a, x);
    } else {
      result = 1 - gammaIncCf(a, x);
    }
    if (result < 0) result = 0;
    if (result > 1) result = 1;
    return result;
  }

  // ========================================================================
  // Marcum Q1(a,b) — 수치적분(Simpson) 방식
  //   Q1(a,b) = ∫_b^∞ x*exp(-(x²+a²)/2)*I0(ax) dx
  //   피적분함수를 besselI0Scaled로 다시 쓰면:
  //     x*exp(-(x²+a²)/2)*I0(ax) = x*exp(-(x-a)²/2) * besselI0Scaled(ax)
  //   지수부가 -(x-a)²/2 <= 0 이 되어(가우시안 형태) a,b가 모두 커도 오버플로가 없다.
  // ========================================================================

  function marcumQ1(a, b) {
    if (a < 0) a = 0;
    if (b < 0) b = 0;

    // a=0인 특수해: Q1(0,b) = exp(-b²/2) (레일리 케이스 검증용)
    if (a === 0) return Math.exp(-b * b / 2);

    function integrand(x) {
      if (x <= 0) return 0;
      return x * Math.exp(-(x - a) * (x - a) / 2) * besselI0Scaled(a * x);
    }

    // 피적분함수는 x=a 근방에서 폭이 ~1인 가우시안 형태이므로 [b, a+12] 구간이면 충분(꼬리 무시 가능)
    var upper = Math.max(b, a) + 12;
    if (upper <= b) return 0;

    var N = 1000; // Simpson 구간 수 (짝수)
    if (N % 2 !== 0) N++;
    var h = (upper - b) / N;
    var sum = integrand(b) + integrand(upper);
    for (var i = 1; i < N; i++) {
      var x = b + i * h;
      sum += (i % 2 === 0 ? 2 : 4) * integrand(x);
    }
    var result = sum * h / 3;
    if (result < 0) result = 0;
    if (result > 1) result = 1;
    return result;
  }

  // ========================================================================
  // K-factor ↔ m 근사 변환 (표시용 참고값)
  // ========================================================================

  function mFromK(K_lin) {
    return Math.pow(K_lin + 1, 2) / (2 * K_lin + 1);
  }

  // m>=1일 때만 실수 K가 존재(라이시안 m은 항상 >=1). 이분탐색으로 역변환.
  function kFromM(m) {
    if (m <= 1) return null; // m<1은 라이시안으로 표현 불가(레일리보다 심한 페이딩)
    var lo = 0, hi = 1000;
    for (var i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2;
      var mMid = mFromK(mid);
      if (mMid < m) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // ========================================================================
  // 이론 PDF (정규화 SNR x = γ/γ̄ 기준, γ̄=1)
  // ========================================================================

  function rayleighPDF(x) {
    if (x < 0) return 0;
    return Math.exp(-x);
  }

  function ricianPDF(x, K_lin) {
    if (x < 0) return 0;
    if (K_lin <= 0) return rayleighPDF(x);
    // (K+1)*exp(-K)*exp(-(K+1)x)*I0(2*sqrt(K(K+1)x))
    // 지수부를 합쳐서 계산: z = 2*sqrt(K(K+1)x), I0(z) = exp(z)*besselI0Scaled(z)
    // f(x) = (K+1) * exp(z - K - (K+1)x) * besselI0Scaled(z)
    var z = 2 * Math.sqrt(K_lin * (K_lin + 1) * x);
    var exponent = z - K_lin - (K_lin + 1) * x;
    return (K_lin + 1) * Math.exp(exponent) * besselI0Scaled(z);
  }

  function nakagamiPDF(x, m) {
    if (x <= 0) return x === 0 && m < 1 ? Infinity : 0;
    // (1/Γ(m)) * m^m * x^(m-1) * exp(-m x)  ==  exp(m*ln(m) + (m-1)*ln(x) - m*x - lnGamma(m))
    var logf = m * Math.log(m) + (m - 1) * Math.log(x) - m * x - lnGamma(m);
    return Math.exp(logf);
  }

  // ========================================================================
  // 이론 아웃티지 확률 O(xth) = Pr[x < xth]  (xth = γ_th/γ̄)
  // ========================================================================

  function rayleighOutage(xth) {
    if (xth <= 0) return 0;
    return 1 - Math.exp(-xth);
  }

  function nakagamiOutage(xth, m) {
    if (xth <= 0) return 0;
    return gammainc(m, m * xth);
  }

  function ricianOutage(xth, K_lin) {
    if (xth <= 0) return 0;
    if (K_lin <= 0) return rayleighOutage(xth);
    var a = Math.sqrt(2 * K_lin);
    var b = Math.sqrt(2 * (K_lin + 1) * xth);
    return 1 - marcumQ1(a, b);
  }

  // 나카가미 정규화 x 표본 생성용: 역CDF(분위함수) - 이분탐색으로 P(m, m*x)=u를 만족하는 x를 찾는다.
  function nakagamiInverseCDF(u, m) {
    if (u <= 0) return 0;
    if (u >= 1) u = 1 - 1e-12;

    var lo = 0;
    var hi = Math.max(4, 4 / m) * 4; // 초기 상한 추정
    var iter = 0;
    while (gammainc(m, m * hi) < u && iter < 60) {
      hi *= 2;
      iter++;
    }
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (gammainc(m, m * mid) < u) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  return {
    besselI0: besselI0,
    besselI0Scaled: besselI0Scaled,
    gammaFn: gammaFn,
    gammainc: gammainc,
    marcumQ1: marcumQ1,
    mFromK: mFromK,
    kFromM: kFromM,
    rayleighPDF: rayleighPDF,
    ricianPDF: ricianPDF,
    nakagamiPDF: nakagamiPDF,
    rayleighOutage: rayleighOutage,
    nakagamiOutage: nakagamiOutage,
    ricianOutage: ricianOutage,
    nakagamiInverseCDF: nakagamiInverseCDF
  };
})();
