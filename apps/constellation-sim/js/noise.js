// noise.js - Box-Muller AWGN 샘플러 + 몬테카를로 시뮬레이션 루프
// (전역 변수 방식, type="module" 사용 안 함)
//
// 근거: 위성통신_소스.tex 509절
//   - n ~ N(0, N0/2) (I/Q 각 축, 523행 부근 "실수 기저대역 등가" 정의를 복소평면 I/Q에 그대로 적용)
//   - Es/N0 환산: PSK는 Es=Eb(BPSK)/2Eb(QPSK) 등, QAM은 Es=Eb*log2(M) (spec 2.2, modulation.js와 동일 정의)

var NoiseSim = (function () {
  'use strict';

  // 표준정규분포 난수 한 쌍 생성 (Box-Muller 변환)
  function gaussianPair() {
    var u1 = Math.random();
    var u2 = Math.random();
    if (u1 < 1e-12) u1 = 1e-12; // log(0) 방지
    var r = Math.sqrt(-2 * Math.log(u1));
    var theta = 2 * Math.PI * u2;
    return [r * Math.cos(theta), r * Math.sin(theta)];
  }

  // 몬테카를로 시뮬레이션: numSymbols개의 무작위 송신 심볼에 AWGN을 더해 수신점을 만들고,
  // 최근접 판정으로 SER/BER을 실측한다.
  function runSimulation(modKey, ebn0_dB, numSymbols) {
    var cfg = Modulation.MODS[modKey];
    var constellation = Modulation.getConstellation(modKey);

    var ebn0_lin = Math.pow(10, ebn0_dB / 10);
    var esn0_lin = ebn0_lin * cfg.bitsPerSymbol;

    // 성상점이 평균 심볼에너지 Es=1로 정규화되어 있으므로 N0 = Es/(Es/N0) = 1/esn0_lin
    var N0 = 1 / esn0_lin;
    var sigma = Math.sqrt(N0 / 2); // n ~ N(0, N0/2), I/Q 각 축에 독립적으로 적용

    var points = [];
    var errorCount = 0;

    for (var i = 0; i < numSymbols; i++) {
      var txIndex = Math.floor(Math.random() * cfg.M);
      var tx = constellation[txIndex];

      var g = gaussianPair();
      var rx = { x: tx.x + sigma * g[0], y: tx.y + sigma * g[1] };

      var rxIndex = Modulation.nearestIndex(constellation, rx);
      var isError = rxIndex !== txIndex;
      if (isError) errorCount++;

      points.push({ x: rx.x, y: rx.y, txIndex: txIndex, rxIndex: rxIndex, error: isError });
    }

    var ser = errorCount / numSymbols;
    var ber = ser / cfg.bitsPerSymbol; // 그레이코딩 근사(고SNR)

    return {
      modKey: modKey,
      constellation: constellation,
      points: points,
      numSymbols: numSymbols,
      errorCount: errorCount,
      ser: ser,
      ber: ber
    };
  }

  return {
    gaussianPair: gaussianPair,
    runSimulation: runSimulation
  };
})();
