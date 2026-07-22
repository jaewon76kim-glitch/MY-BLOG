/* base-rate-calculator.js — 섹션 1: 기저율 오류 · 베이즈 정리 계산기
 * 민감도 p(양성|암), 위양성률 p(양성|암 아님), 사전확률 p(암) 슬라이더를 조절하면
 * 전체 확률의 법칙과 베이즈 정리로 p(암|양성)을 실시간 재계산하고,
 * 100명 아이콘 격자(4색)로 시각화한다.
 */

var brState = {
  sensitivity: 0.8,      // p(양성|암)
  falsePositiveRate: 0.096, // p(양성|암 아님)
  priorCancer: 0.01      // p(암)
};

function brRenderFormula(calc) {
  var el = document.getElementById('br-formula-text');
  if (!el) return;
  var s = brState.sensitivity, f = brState.falsePositiveRate, p = brState.priorCancer;
  el.innerHTML =
    '<div class="formula-step">p(양성) = p(양성|암)·p(암) + p(양성|암 아님)·(1-p(암))</div>' +
    '<div class="formula-step">&nbsp;&nbsp;&nbsp;&nbsp;= ' + s.toFixed(3) + ' × ' + p.toFixed(3) + ' + ' +
    f.toFixed(3) + ' × ' + (1 - p).toFixed(3) + ' = <strong>' + calc.pPositive.toFixed(5) + '</strong></div>' +
    '<div class="formula-step">p(암|양성) = p(양성|암)·p(암) / p(양성)</div>' +
    '<div class="formula-step">&nbsp;&nbsp;&nbsp;&nbsp;= (' + s.toFixed(3) + ' × ' + p.toFixed(3) + ') / ' +
    calc.pPositive.toFixed(5) + ' = <strong class="br-result-inline">' +
    (calc.pCancerGivenPositive * 100).toFixed(2) + '%</strong></div>';
}

function brRenderResult(calc) {
  var el = document.getElementById('br-result-value');
  if (el) el.textContent = (calc.pCancerGivenPositive * 100).toFixed(2) + '%';
  var sub = document.getElementById('br-result-sub');
  if (sub) {
    sub.textContent = '민감도 ' + (brState.sensitivity * 100).toFixed(1) +
      '%로 높아도, 암의 사전확률이 낮으면(기저율) 양성 판정을 받아도 실제 암일 확률은 이렇게 낮을 수 있습니다.';
  }
}

function brRenderGrid() {
  var grid = document.getElementById('br-icon-grid');
  if (!grid) return;
  var b = breakdown100(brState.sensitivity, brState.falsePositiveRate, brState.priorCancer);
  var cells = [];
  for (var i = 0; i < b.truePos; i++) cells.push('tp');
  for (var i = 0; i < b.falsePos; i++) cells.push('fp');
  for (var i = 0; i < b.falseNeg; i++) cells.push('fn');
  for (var i = 0; i < b.trueNeg; i++) cells.push('tn');
  // 반올림 오차로 100개가 안 맞으면 tn으로 채움/제거
  while (cells.length < 100) cells.push('tn');
  while (cells.length > 100) cells.pop();

  grid.innerHTML = '';
  cells.forEach(function (kind) {
    var d = document.createElement('div');
    d.className = 'br-cell br-cell-' + kind;
    grid.appendChild(d);
  });

  var legend = document.getElementById('br-legend-counts');
  if (legend) {
    legend.innerHTML =
      '<span class="br-legend-item"><span class="br-swatch br-cell-tp"></span>진짜양성 ' + b.truePos + '명</span>' +
      '<span class="br-legend-item"><span class="br-swatch br-cell-fp"></span>위양성 ' + b.falsePos + '명</span>' +
      '<span class="br-legend-item"><span class="br-swatch br-cell-fn"></span>위음성 ' + b.falseNeg + '명</span>' +
      '<span class="br-legend-item"><span class="br-swatch br-cell-tn"></span>진짜음성 ' + b.trueNeg + '명</span>';
  }
}

function brRenderAll() {
  var calc = bayesCancerGivenPositive(brState.sensitivity, brState.falsePositiveRate, brState.priorCancer);
  brRenderFormula(calc);
  brRenderResult(calc);
  brRenderGrid();
}

function brBindSlider(id, valId, stateKey, decimals) {
  var slider = document.getElementById(id);
  var val = document.getElementById(valId);
  slider.value = brState[stateKey];
  if (val) val.textContent = brState[stateKey].toFixed(decimals);
  slider.addEventListener('input', function () {
    brState[stateKey] = parseFloat(slider.value);
    if (val) val.textContent = brState[stateKey].toFixed(decimals);
    brRenderAll();
  });
}

function initBaseRateCalculator() {
  brBindSlider('br-sens-slider', 'br-sens-val', 'sensitivity', 3);
  brBindSlider('br-fpr-slider', 'br-fpr-val', 'falsePositiveRate', 3);
  brBindSlider('br-prior-slider', 'br-prior-val', 'priorCancer', 3);

  var resetBtn = document.getElementById('br-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      brState.sensitivity = 0.8;
      brState.falsePositiveRate = 0.096;
      brState.priorCancer = 0.01;
      document.getElementById('br-sens-slider').value = brState.sensitivity;
      document.getElementById('br-sens-val').textContent = brState.sensitivity.toFixed(3);
      document.getElementById('br-fpr-slider').value = brState.falsePositiveRate;
      document.getElementById('br-fpr-val').textContent = brState.falsePositiveRate.toFixed(3);
      document.getElementById('br-prior-slider').value = brState.priorCancer;
      document.getElementById('br-prior-val').textContent = brState.priorCancer.toFixed(3);
      brRenderAll();
    });
  }

  brRenderAll();
}
