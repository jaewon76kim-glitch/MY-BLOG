// stats.js - 몬테카를로 히스토그램 및 아웃티지 실측 비율 누적 (전역 변수 방식)
//
// 정규화 SNR x = γ/γ̄ 표본을 고정폭 빈(bin)에 누적한다. 아웃티지 실측 확률은 원표본 리스트를
// 따로 저장하지 않고, 누적된 히스토그램 빈으로부터 "임계값 미만 누적 비율"을 즉시 계산한다.
// 이렇게 하면 아웃티지 임계값 γ_th 슬라이더를 움직여도(분포 자체는 안 변하므로) 통계를 리셋할
// 필요가 없다 — 모델/파라미터(모델 종류, K, m) 변경 시에만 reset()을 호출한다.

var Stats = (function () {
  'use strict';

  var NBINS = 100;
  var XMAX = 10; // 정규화 SNR x 커버 범위 (0~10). 이 이상은 오버플로 빈에 누적.
  var BIN_WIDTH = XMAX / NBINS;

  var counts = new Array(NBINS + 1).fill(0); // 마지막 원소 = 오버플로 빈 (x >= XMAX)
  var total = 0;
  var sumX = 0;

  function reset() {
    counts = new Array(NBINS + 1).fill(0);
    total = 0;
    sumX = 0;
  }

  function addSample(x) {
    if (x < 0 || !isFinite(x)) x = 0;
    var idx = Math.floor(x / BIN_WIDTH);
    if (idx > NBINS - 1) idx = NBINS;
    counts[idx]++;
    total++;
    sumX += x;
  }

  // 히스토그램 밀도(정규화된 확률밀도): Σ density*BIN_WIDTH ≈ 1 (오버플로 빈 제외)
  function getHistogramDensity() {
    var out = [];
    for (var i = 0; i < NBINS; i++) {
      var center = (i + 0.5) * BIN_WIDTH;
      var density = total > 0 ? counts[i] / total / BIN_WIDTH : 0;
      out.push({ x: center, y: density });
    }
    return out;
  }

  // 임계값 xth 미만 누적 비율 (선형보간으로 빈 내부 위치 반영)
  function getOutageMeasured(xth) {
    if (total === 0) return 0;
    if (xth <= 0) return 0;
    var posInBins = xth / BIN_WIDTH;
    var idxFloor = Math.floor(posInBins);
    var below = 0;
    var full = Math.min(idxFloor, NBINS);
    for (var i = 0; i < full; i++) below += counts[i];
    if (idxFloor < NBINS) {
      var frac = posInBins - idxFloor;
      if (frac < 0) frac = 0;
      if (frac > 1) frac = 1;
      below += counts[idxFloor] * frac;
    } else {
      // xth가 히스토그램 커버 범위를 넘어감: 오버플로 빈 내부는 균등분포로 근사
      below = total; // 이 앱의 슬라이더 범위에서는 xth가 XMAX를 넘지 않도록 제한함
    }
    return below / total;
  }

  function getMean() {
    return total > 0 ? sumX / total : 0;
  }

  function getTotal() {
    return total;
  }

  return {
    NBINS: NBINS,
    XMAX: XMAX,
    BIN_WIDTH: BIN_WIDTH,
    reset: reset,
    addSample: addSample,
    getHistogramDensity: getHistogramDensity,
    getOutageMeasured: getOutageMeasured,
    getMean: getMean,
    getTotal: getTotal
  };
})();
