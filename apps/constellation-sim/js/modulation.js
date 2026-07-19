// modulation.js - 성상점 좌표 생성 + 이론 SER/BER 공식 + 최근접 판정
// (전역 변수 방식, type="module" 사용 안 함 — apps/link-budget-calc 관례 계승)
//
// 근거: 위성통신_소스.tex, \section{디지털 변조 성능: AWGN 위의 PSK와 QAM} (509절)
//   - Q함수 정의 (517절)
//   - BPSK 오류확률 Pb = Q(sqrt(2Eb/N0)) (530절)
//   - M-PSK 신호점 s_m = sqrt(Es)*e^{j2pi m/M} (541절)
//   - QPSK 정확식 (546절) — [Review] tex 원문 인자 sqrt(2Es/N0)는 오기로 판단,
//     sqrt(Es/N0)로 정정해 구현함(아래 theorySER 주석 및 review-constellation-sim.md 참조)
//   - M-PSK 근사식 (552절)
//   - M-QAM: sqrt(M)-PAM 오류율에서 유도 (564~570절)

var Modulation = (function () {
  'use strict';

  // ---- 변조방식 정의 ----
  // bitsPerSymbol = log2(M). tex 정의대로 Es = Eb * log2(M) (BPSK: Es=Eb, QPSK: Es=2Eb 등)
  var MODS = {
    BPSK:   { M: 2,  type: 'psk', bitsPerSymbol: 1 },
    QPSK:   { M: 4,  type: 'psk', bitsPerSymbol: 2 },
    '8PSK': { M: 8,  type: 'psk', bitsPerSymbol: 3 },
    '16QAM': { M: 16, type: 'qam', bitsPerSymbol: 4 },
    '64QAM': { M: 64, type: 'qam', bitsPerSymbol: 6 }
  };

  var MOD_ORDER = ['BPSK', 'QPSK', '8PSK', '16QAM', '64QAM'];

  // ---- 가우시안 Q함수 (tex 517절) ----
  // Abramowitz-Stegun 근사(26.2.17, |오차| < 7.5e-8). link-budget-calc의 qFunction과 동일 구현.
  function qFunction(x) {
    if (x < 0) return 1 - qFunction(-x);
    var t = 1 / (1 + 0.2316419 * x);
    var d = 0.3989422804014327 * Math.exp(-x * x / 2); // 1/sqrt(2*pi) * exp(-x^2/2)
    var poly = t * (0.319381530 +
      t * (-0.356563782 +
      t * (1.781477937 +
      t * (-1.821255978 +
      t * 1.330274429))));
    return d * poly;
  }

  // ---- 이상적 성상점 좌표 생성 (평균 심볼에너지 Es=1로 정규화) ----
  // Es/N0 비율만으로 잡음 표준편차를 정할 수 있도록, 모든 변조방식의 성상점을
  // 평균 심볼에너지 1이 되도록 정규화한다. SER/BER 공식은 Es/N0 비율에만 의존하므로
  // 이 정규화는 결과에 영향을 주지 않는다.
  function getConstellation(modKey) {
    var cfg = MODS[modKey];
    if (cfg.type === 'psk') {
      return pskPoints(cfg.M);
    }
    return qamPoints(cfg.M);
  }

  // tex 541절: s_m = sqrt(Es) * e^{j2pi m/M}, m=0..M-1. Es=1이므로 단위원 위에 등간격 배치.
  function pskPoints(M) {
    var pts = [];
    for (var m = 0; m < M; m++) {
      var theta = 2 * Math.PI * m / M;
      pts.push({ x: Math.cos(theta), y: Math.sin(theta), index: m });
    }
    return pts;
  }

  // tex 564절: M-QAM(M=2^k, k 짝수)은 I/Q축 각각에 독립적인 sqrt(M)-PAM을 싣는 정사각형 그리드.
  // 레벨: ±d, ±3d, ..., ±(sqrt(M)-1)d. 평균 심볼에너지 Es=1이 되도록
  // d = sqrt(3 / (2*(M-1)))로 정규화(표준 사각 QAM 평균에너지 공식 Es_avg = (2/3)(M-1)d^2의 역산).
  function qamPoints(M) {
    var L = Math.round(Math.sqrt(M));
    var d = Math.sqrt(3 / (2 * (M - 1)));
    var levels = [];
    for (var i = 0; i < L; i++) {
      levels.push((2 * i - (L - 1)) * d);
    }
    var pts = [];
    var idx = 0;
    for (var qi = 0; qi < L; qi++) {
      for (var ii = 0; ii < L; ii++) {
        pts.push({ x: levels[ii], y: levels[qi], index: idx });
        idx++;
      }
    }
    return pts;
  }

  // ---- 최근접 판정 (유클리드 거리 최소인 성상점의 인덱스) ----
  function nearestIndex(constellation, point) {
    var best = 0;
    var bestDist = Infinity;
    for (var i = 0; i < constellation.length; i++) {
      var dx = constellation[i].x - point.x;
      var dy = constellation[i].y - point.y;
      var dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  // ---- 이론 SER/BER 공식 (tex 509절 원문 그대로) ----
  function ebn0dBToLinear(ebn0_dB) {
    return Math.pow(10, ebn0_dB / 10);
  }

  // 심볼오류율(SER) 이론값. BPSK는 심볼=비트이므로 이 값이 곧 BER이기도 하다.
  function theorySER(modKey, ebn0_dB) {
    var cfg = MODS[modKey];
    var ebn0_lin = ebn0dBToLinear(ebn0_dB);
    var esn0_lin = ebn0_lin * cfg.bitsPerSymbol; // Es/N0 = (Eb/N0) * log2(M)

    if (modKey === 'BPSK') {
      // tex 530절: Pb = Q(sqrt(2Eb/N0)) (Es=Eb이므로 SER=BER)
      return qFunction(Math.sqrt(2 * ebn0_lin));
    }
    if (modKey === 'QPSK') {
      // [Review 수정] tex 546절 원문은 Ps = 2Q(sqrt(2Es/N0))[1 - (1/2)Q(sqrt(2Es/N0))]로
      // 되어 있으나, 이는 오기로 판단됨. QPSK는 I/Q 두 축에 독립 BPSK를 싣는 구조이므로
      // 각 축의 비트오류율은 Q(sqrt(2Eb/N0)) (BPSK와 동일, 잘 알려진 결과)이고
      // Es=2Eb -> sqrt(2Eb/N0)=sqrt(Es/N0)이다. 심볼오류율(두 비트 중 하나라도 오류)은
      // Ps = 1-(1-Q(sqrt(Es/N0)))^2 = 2Q(sqrt(Es/N0))[1-(1/2)Q(sqrt(Es/N0))].
      // 즉 인자가 sqrt(2Es/N0)가 아니라 sqrt(Es/N0)이어야 한다. 같은 tex 파일 552절의
      // M-PSK 근사식에 M=4를 대입한 결과(sin(pi/4)=sqrt(2)/2 -> sqrt(2Es/N0)*sqrt(2)/2
      // = sqrt(Es/N0))와도 정확히 일치하므로 이쪽이 맞다. 상세 근거는
      // review-constellation-sim.md 참조.
      var q = qFunction(Math.sqrt(esn0_lin));
      return 2 * q * (1 - 0.5 * q);
    }
    if (cfg.type === 'psk') {
      // tex 552절 M-PSK 근사식: Ps ≈ 2Q(sqrt(2Es/N0) * sin(pi/M))
      return 2 * qFunction(Math.sqrt(2 * esn0_lin) * Math.sin(Math.PI / cfg.M));
    }
    // tex 564~570절 M-QAM
    // sqrt(M)-PAM 오류율: P = 2(1-1/sqrt(M)) Q(sqrt(3Es/((M-1)N0)))
    // 전체 SER: 두 축(I,Q) 중 적어도 한 축에서 오류 -> Ps = 1-(1-P)^2
    var L = Math.sqrt(cfg.M);
    var pPam = 2 * (1 - 1 / L) * qFunction(Math.sqrt(3 * esn0_lin / (cfg.M - 1)));
    return 1 - Math.pow(1 - pPam, 2);
  }

  // 그레이코딩 근사로 SER -> BER 환산 (BER ≈ SER/log2(M), 고SNR 근사 — spec 2.4)
  function theoryBER(modKey, ebn0_dB) {
    var cfg = MODS[modKey];
    return theorySER(modKey, ebn0_dB) / cfg.bitsPerSymbol;
  }

  return {
    MODS: MODS,
    MOD_ORDER: MOD_ORDER,
    qFunction: qFunction,
    getConstellation: getConstellation,
    nearestIndex: nearestIndex,
    theorySER: theorySER,
    theoryBER: theoryBER
  };
})();
