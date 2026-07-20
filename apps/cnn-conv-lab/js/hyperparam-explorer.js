/* hyperparam-explorer.js — 섹션 2: 스트라이드/패딩/풀링 파라미터 탐색기
 * h(커널 크기), s(스트라이드), p(패딩) 슬라이더 + n(입력 크기) 입력칸을 바탕으로
 * n' = floor((n + 2p - h)/s) + 1 을 실시간 재계산하고 캔버스에 시각화한다.
 */

var hpState = {
  n: 11,
  h: 3,
  s: 1,
  p: 0,
  poolSize: 2,
  poolStride: 2,
  poolMode: 'max', // 'max' | 'avg'
  image: null
};

var HP_CELL = 26;

function makeExplorerImage(n) {
  var img = [];
  for (var i = 0; i < n; i++) {
    var row = [];
    for (var j = 0; j < n; j++) {
      // 결정적(재현 가능한) 패턴: 물결 무늬
      var val = Math.round(128 + 100 * Math.sin(i * 0.6) * Math.cos(j * 0.5));
      row.push(Math.max(0, Math.min(255, val)));
    }
    img.push(row);
  }
  return img;
}

function hpMakeKernel(h) {
  // 박스 평균 커널 (h x h, 합이 1이 되도록) — 값 스케일이 크게 벗어나지 않아 시각화에 적합
  var k = [];
  var w = 1 / (h * h);
  for (var i = 0; i < h; i++) {
    var row = [];
    for (var j = 0; j < h; j++) row.push(w);
    k.push(row);
  }
  return k;
}

var hpInputCanvas, hpInputCtx, hpOutputCanvas, hpOutputCtx, hpPoolCanvas, hpPoolCtx;

function hpComputeAll() {
  var n = hpState.n, h = hpState.h, s = hpState.s, p = hpState.p;
  var nPrime = outputSize(n, h, s, p);
  var kernel = hpMakeKernel(h);
  var result = null;
  if (nPrime > 0) {
    result = convolve2DGeneral(hpState.image, kernel, s, p);
  }
  return { nPrime: nPrime, kernel: kernel, result: result };
}

function hpRenderFormula(nPrime) {
  var el = document.getElementById('hp-formula-text');
  if (!el) return;
  var n = hpState.n, h = hpState.h, s = hpState.s, p = hpState.p;
  el.innerHTML =
    "n' = ⌊(n + 2p - h) / s⌋ + 1 = ⌊(" + n + " + 2×" + p + " - " + h + ") / " + s + "⌋ + 1 = <strong>" + nPrime + '</strong>';
}

function hpDrawGrid(ctx, matrix, cell, colorFn, extraStroke) {
  var rows = matrix.length;
  var cols = matrix[0] ? matrix[0].length : 0;
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      ctx.fillStyle = colorFn(matrix[i][j], i, j);
      ctx.fillRect(j * cell, i * cell, cell, cell);
      ctx.strokeStyle = 'rgba(42,42,74,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(j * cell + 0.5, i * cell + 0.5, cell - 1, cell - 1);
      if (extraStroke) extraStroke(ctx, i, j, cell);
    }
  }
}

function hpRenderInput(padded, p) {
  var padN = padded.length;
  hpInputCanvas.width = padN * HP_CELL;
  hpInputCanvas.height = padN * HP_CELL;
  hpInputCtx.clearRect(0, 0, hpInputCanvas.width, hpInputCanvas.height);

  hpDrawGrid(hpInputCtx, padded, HP_CELL, function (v, i, j) {
    var isPad = (i < p || i >= padN - p || j < p || j >= padN - p);
    if (isPad) return '#3a3a55'; // 패딩: 회색 계열로 구분
    return 'rgb(' + v + ',' + v + ',' + v + ')';
  }, function (ctx, i, j, cell) {
    var isPad = (i < p || i >= padN - p || j < p || j >= padN - p);
    if (isPad) {
      ctx.strokeStyle = '#a0a0c0';
      ctx.lineWidth = 1;
      ctx.strokeRect(j * cell + 0.5, i * cell + 0.5, cell - 1, cell - 1);
    }
  });
}

function hpNormalizeForDisplay(matrix) {
  var flat = [];
  for (var i = 0; i < matrix.length; i++) flat = flat.concat(matrix[i]);
  if (flat.length === 0) return function () { return 0; };
  var minV = Math.min.apply(null, flat);
  var maxV = Math.max.apply(null, flat);
  var range = (maxV - minV) || 1;
  return function (v) {
    return Math.round(((v - minV) / range) * 255);
  };
}

function hpRenderOutput(output) {
  var rows = output.length;
  var cols = output[0] ? output[0].length : 0;
  hpOutputCanvas.width = Math.max(cols, 1) * HP_CELL;
  hpOutputCanvas.height = Math.max(rows, 1) * HP_CELL;
  hpOutputCtx.clearRect(0, 0, hpOutputCanvas.width, hpOutputCanvas.height);
  if (rows === 0 || cols === 0) return;
  var norm = hpNormalizeForDisplay(output);
  hpDrawGrid(hpOutputCtx, output, HP_CELL, function (v) {
    var g = norm(v);
    return 'rgb(' + g + ',' + g + ',' + g + ')';
  });
}

function hpRenderPool(pooled) {
  var rows = pooled.length;
  var cols = pooled[0] ? pooled[0].length : 0;
  hpPoolCanvas.width = Math.max(cols, 1) * HP_CELL;
  hpPoolCanvas.height = Math.max(rows, 1) * HP_CELL;
  hpPoolCtx.clearRect(0, 0, hpPoolCanvas.width, hpPoolCanvas.height);
  if (rows === 0 || cols === 0) return;
  var norm = hpNormalizeForDisplay(pooled);
  hpDrawGrid(hpPoolCtx, pooled, HP_CELL, function (v) {
    var g = norm(v);
    return 'rgb(' + g + ',' + g + ',' + g + ')';
  });
}

function hpRenderPoolInfo(poolOutSize, nPrime) {
  var el = document.getElementById('hp-pool-info');
  if (!el) return;
  var modeLabel = hpState.poolMode === 'max' ? '최대풀링' : '평균풀링';
  el.innerHTML = modeLabel + ' (윈도우 ' + hpState.poolSize + '×' + hpState.poolSize +
    ', 스트라이드 ' + hpState.poolStride + '): ' + nPrime + ' → ' + poolOutSize;
}

function hpRenderAll() {
  var calc = hpComputeAll();
  hpRenderFormula(calc.nPrime);

  if (!calc.result) {
    hpInputCanvas.width = hpState.n * HP_CELL;
    hpInputCanvas.height = hpState.n * HP_CELL;
    hpInputCtx.clearRect(0, 0, hpInputCanvas.width, hpInputCanvas.height);
    hpOutputCtx.clearRect(0, 0, hpOutputCanvas.width, hpOutputCanvas.height);
    hpPoolCtx.clearRect(0, 0, hpPoolCanvas.width, hpPoolCanvas.height);
    var warn = document.getElementById('hp-pool-info');
    if (warn) warn.textContent = '현재 설정으로는 출력 크기가 0 이하입니다. h/s/p를 조정하세요.';
    return;
  }

  hpRenderInput(calc.result.padded, hpState.p);
  hpRenderOutput(calc.result.output);

  var poolOutSize = outputSize(calc.nPrime, hpState.poolSize, hpState.poolStride, 0);
  if (poolOutSize > 0 && calc.result.output.length >= hpState.poolSize) {
    var pooled = pool2D(calc.result.output, hpState.poolSize, hpState.poolStride, hpState.poolMode);
    hpRenderPool(pooled);
    hpRenderPoolInfo(pooled.length + '×' + (pooled[0] ? pooled[0].length : 0), calc.nPrime);
  } else {
    hpPoolCtx.clearRect(0, 0, hpPoolCanvas.width, hpPoolCanvas.height);
    hpRenderPoolInfo('계산 불가(윈도우가 출력보다 큼)', calc.nPrime);
  }
}

function hpBindSlider(id, valId, stateKey, isInt) {
  var slider = document.getElementById(id);
  var valEl = document.getElementById(valId);
  slider.addEventListener('input', function () {
    var v = isInt ? parseInt(slider.value, 10) : parseFloat(slider.value);
    hpState[stateKey] = v;
    if (valEl) valEl.textContent = v;
    if (stateKey === 'n') {
      hpState.image = makeExplorerImage(hpState.n);
    }
    hpRenderAll();
  });
}

function initHyperparamExplorer() {
  hpState.image = makeExplorerImage(hpState.n);

  hpInputCanvas = document.getElementById('hp-input-canvas');
  hpOutputCanvas = document.getElementById('hp-output-canvas');
  hpPoolCanvas = document.getElementById('hp-pool-canvas');
  hpInputCtx = hpInputCanvas.getContext('2d');
  hpOutputCtx = hpOutputCanvas.getContext('2d');
  hpPoolCtx = hpPoolCanvas.getContext('2d');

  var nInput = document.getElementById('hp-n-input');
  nInput.value = hpState.n;
  nInput.addEventListener('input', function () {
    var v = parseInt(nInput.value, 10);
    if (isNaN(v) || v < 1) return;
    hpState.n = Math.min(v, 40);
    hpState.image = makeExplorerImage(hpState.n);
    hpRenderAll();
  });

  hpBindSlider('hp-h-slider', 'hp-h-val', 'h', true);
  hpBindSlider('hp-s-slider', 'hp-s-val', 's', true);
  hpBindSlider('hp-p-slider', 'hp-p-val', 'p', true);
  hpBindSlider('hp-pool-size-slider', 'hp-pool-size-val', 'poolSize', true);
  hpBindSlider('hp-pool-stride-slider', 'hp-pool-stride-val', 'poolStride', true);

  var maxBtn = document.getElementById('hp-pool-max-btn');
  var avgBtn = document.getElementById('hp-pool-avg-btn');
  maxBtn.addEventListener('click', function () {
    hpState.poolMode = 'max';
    maxBtn.classList.add('toggle-active');
    avgBtn.classList.remove('toggle-active');
    hpRenderAll();
  });
  avgBtn.addEventListener('click', function () {
    hpState.poolMode = 'avg';
    avgBtn.classList.add('toggle-active');
    maxBtn.classList.remove('toggle-active');
    hpRenderAll();
  });

  hpRenderAll();
}
