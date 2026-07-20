// main.js - 두 캔버스(산점도, 등고선) 이벤트 바인딩 및 전체 조립.
// 전역 스코프에서 즉시 실행 (type="module" 미사용, CDN 미사용).

(function () {
  'use strict';

  // ---------- DOM 참조 ----------
  var scatterCanvas = document.getElementById('scatter-canvas');
  var contourCanvas = document.getElementById('contour-canvas');
  var scatterCtx = scatterCanvas.getContext('2d');
  var contourCtx = contourCanvas.getContext('2d');

  var elEta = document.getElementById('slider-eta');
  var elEtaVal = document.getElementById('val-eta');
  var elLambda = document.getElementById('slider-lambda');
  var elLambdaVal = document.getElementById('val-lambda');
  var chkBatch = document.getElementById('chk-batch');
  var chkSgd = document.getElementById('chk-sgd');
  var btnPlay = document.getElementById('btn-play');
  var btnPause = document.getElementById('btn-pause');
  var btnReset = document.getElementById('btn-reset');
  var statStep = document.getElementById('stat-step');
  var statMse = document.getElementById('stat-mse');
  var statStatus = document.getElementById('stat-status');

  // 오프스크린 배경 캔버스 (등고선 색상 밴드 - 데이터/λ 변경 시에만 재계산)
  var bgCanvas = document.createElement('canvas');
  var bgCtx = bgCanvas.getContext('2d');

  // ---------- 상태 ----------
  var currentEta = Math.pow(10, parseFloat(elEta.value));
  var currentLambda = parseFloat(elLambda.value);
  var contourRange = null;
  var contourGrid = null;
  var startPoint = { w0: 0, w1: 0 };
  var mseChart = null;
  var dpr = window.devicePixelRatio || 1;

  // ---------- 캔버스 크기 조정(레티나 대응) ----------
  function fitCanvas(canvas, ctx) {
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }

  // ---------- 산점도 ----------
  var SCATTER_PAD = { left: 42, right: 16, top: 14, bottom: 30 };

  function scatterRange() {
    var data = DataStore.getAll();
    if (data.length === 0) return { x: [0, 10], y: [0, 10] };
    var xs = data.map(function (p) { return p.x; });
    var ys = data.map(function (p) { return p.y; });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    var xPad = Math.max(1, (xMax - xMin) * 0.15);
    var yPad = Math.max(1, (yMax - yMin) * 0.15);
    return { x: [xMin - xPad, xMax + xPad], y: [yMin - yPad, yMax + yPad] };
  }

  function scatterWorldToPixel(x, y, range, w, h) {
    var plotW = w - SCATTER_PAD.left - SCATTER_PAD.right;
    var plotH = h - SCATTER_PAD.top - SCATTER_PAD.bottom;
    var px = SCATTER_PAD.left + ((x - range.x[0]) / (range.x[1] - range.x[0])) * plotW;
    var py = SCATTER_PAD.top + (1 - (y - range.y[0]) / (range.y[1] - range.y[0])) * plotH;
    return [px, py];
  }

  function scatterPixelToWorld(px, py, range, w, h) {
    var plotW = w - SCATTER_PAD.left - SCATTER_PAD.right;
    var plotH = h - SCATTER_PAD.top - SCATTER_PAD.bottom;
    var x = range.x[0] + ((px - SCATTER_PAD.left) / plotW) * (range.x[1] - range.x[0]);
    var y = range.y[0] + (1 - (py - SCATTER_PAD.top) / plotH) * (range.y[1] - range.y[0]);
    return [x, y];
  }

  function currentDisplayW() {
    // 회귀직선을 그릴 때 사용할 (w0,w1): 활성화된 경로 중 하나의 현재 값, 없으면 시작점
    var gs = GDEngine.getState();
    if (gs) {
      if (chkBatch.checked) return [gs.batch.w0, gs.batch.w1];
      if (chkSgd.checked) return [gs.sgd.w0, gs.sgd.w1];
    }
    return [startPoint.w0, startPoint.w1];
  }

  function drawScatter() {
    var style = getComputedStyle(document.documentElement);
    var panelColor = (style.getPropertyValue('--panel') || '#1a1a2e').trim();
    var borderColor = (style.getPropertyValue('--border') || '#2a2a4a').trim();
    var textMuted = (style.getPropertyValue('--text-muted') || '#a0a0c0').trim();
    var dataColor = (style.getPropertyValue('--data-point-color') || '#ffd43b').trim();
    var lineColor = (style.getPropertyValue('--regression-line-color') || '#4fc3f7').trim();

    var size = fitCanvas(scatterCanvas, scatterCtx);
    var w = size.w, h = size.h;
    scatterCtx.clearRect(0, 0, w, h);
    scatterCtx.fillStyle = panelColor;
    scatterCtx.fillRect(0, 0, w, h);

    var range = scatterRange();
    var plotW = w - SCATTER_PAD.left - SCATTER_PAD.right;
    var plotH = h - SCATTER_PAD.top - SCATTER_PAD.bottom;

    // 축 테두리
    scatterCtx.strokeStyle = borderColor;
    scatterCtx.lineWidth = 1;
    scatterCtx.strokeRect(SCATTER_PAD.left, SCATTER_PAD.top, plotW, plotH);

    // 눈금
    scatterCtx.fillStyle = textMuted;
    scatterCtx.font = '10px "Segoe UI", system-ui, sans-serif';
    var TICKS = 5;
    scatterCtx.textAlign = 'center';
    scatterCtx.textBaseline = 'top';
    for (var i = 0; i <= TICKS; i++) {
      var xv = range.x[0] + (i / TICKS) * (range.x[1] - range.x[0]);
      var pxv = scatterWorldToPixel(xv, range.y[0], range, w, h)[0];
      scatterCtx.beginPath();
      scatterCtx.moveTo(pxv, SCATTER_PAD.top + plotH);
      scatterCtx.lineTo(pxv, SCATTER_PAD.top + plotH + 4);
      scatterCtx.strokeStyle = borderColor;
      scatterCtx.stroke();
      scatterCtx.fillText(xv.toFixed(1), pxv, SCATTER_PAD.top + plotH + 6);
    }
    scatterCtx.textAlign = 'right';
    scatterCtx.textBaseline = 'middle';
    for (var j = 0; j <= TICKS; j++) {
      var yv = range.y[0] + (j / TICKS) * (range.y[1] - range.y[0]);
      var pyv = scatterWorldToPixel(range.x[0], yv, range, w, h)[1];
      scatterCtx.beginPath();
      scatterCtx.moveTo(SCATTER_PAD.left - 4, pyv);
      scatterCtx.lineTo(SCATTER_PAD.left, pyv);
      scatterCtx.strokeStyle = borderColor;
      scatterCtx.stroke();
      scatterCtx.fillText(yv.toFixed(1), SCATTER_PAD.left - 6, pyv);
    }
    scatterCtx.fillStyle = textMuted;
    scatterCtx.textAlign = 'center';
    scatterCtx.textBaseline = 'alphabetic';
    scatterCtx.fillText('x', SCATTER_PAD.left + plotW / 2, h - 4);

    // 회귀직선 (현재 w0,w1)
    var wCur = currentDisplayW();
    var x0 = range.x[0], x1 = range.x[1];
    var y0 = wCur[0] + wCur[1] * x0;
    var y1 = wCur[0] + wCur[1] * x1;
    var p0 = scatterWorldToPixel(x0, y0, range, w, h);
    var p1 = scatterWorldToPixel(x1, y1, range, w, h);
    scatterCtx.strokeStyle = lineColor;
    scatterCtx.lineWidth = 2;
    scatterCtx.beginPath();
    scatterCtx.moveTo(p0[0], p0[1]);
    scatterCtx.lineTo(p1[0], p1[1]);
    scatterCtx.stroke();

    // 데이터 점
    var data = DataStore.getAll();
    scatterCtx.fillStyle = dataColor;
    for (var k = 0; k < data.length; k++) {
      var pp = scatterWorldToPixel(data[k].x, data[k].y, range, w, h);
      scatterCtx.beginPath();
      scatterCtx.arc(pp[0], pp[1], 5, 0, Math.PI * 2);
      scatterCtx.fill();
      scatterCtx.strokeStyle = panelColor;
      scatterCtx.lineWidth = 1;
      scatterCtx.stroke();
    }
  }

  // ---------- 등고선 ----------
  function rebuildContourBackground() {
    var data = DataStore.getAll();
    contourRange = Contour.computeRange(data);
    contourGrid = Contour.computeGrid(data, currentLambda, contourRange);

    var size = fitCanvas(contourCanvas, contourCtx); // 실제 표시 캔버스 크기 확보
    bgCanvas.width = contourCanvas.width;
    bgCanvas.height = contourCanvas.height;
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Contour.renderBackground(bgCtx, size.w, size.h, contourGrid);
    return size;
  }

  function drawContour() {
    var rect = contourCanvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));

    if (contourCanvas.width !== bgCanvas.width || contourCanvas.height !== bgCanvas.height) {
      fitCanvas(contourCanvas, contourCtx);
    } else {
      contourCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // 배경 blit (오프스크린 -> 화면, 디바이스 픽셀 기준으로 그대로 복사)
    contourCtx.save();
    contourCtx.setTransform(1, 0, 0, 1, 0, 0);
    contourCtx.drawImage(bgCanvas, 0, 0);
    contourCtx.restore();
    contourCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!contourRange) return;

    var style = getComputedStyle(document.documentElement);
    var olsColor = (style.getPropertyValue('--ols-marker-color') || '#51cf66').trim();
    var accent = (style.getPropertyValue('--accent') || '#4fc3f7').trim();
    var gdColor = (style.getPropertyValue('--gd-path-color') || '#ff6b6b').trim();
    var sgdColor = (style.getPropertyValue('--sgd-path-color') || '#a78bfa').trim();

    var data = DataStore.getAll();

    // OLS 해 마커 (고정, λ와 무관)
    var ols = Regression.olsClosedForm(data);
    if (ols) {
      var olsPx = Contour.worldToPixel(ols.w0, ols.w1, contourRange, w, h);
      drawStar(contourCtx, olsPx[0], olsPx[1], 8, olsColor);
    }

    // 릿지 닫힌 형태 해 마커 (λ에 따라 이동, λ=0이면 OLS와 정확히 겹침)
    var ridge = Regression.ridgeClosedForm(data, currentLambda);
    if (ridge) {
      var ridgePx = Contour.worldToPixel(ridge.w0, ridge.w1, contourRange, w, h);
      contourCtx.strokeStyle = accent;
      contourCtx.lineWidth = 2;
      contourCtx.beginPath();
      contourCtx.arc(ridgePx[0], ridgePx[1], 6, 0, Math.PI * 2);
      contourCtx.stroke();
    }

    // 시작점
    var startPx = Contour.worldToPixel(startPoint.w0, startPoint.w1, contourRange, w, h);
    contourCtx.fillStyle = '#ffffff';
    contourCtx.beginPath();
    contourCtx.arc(startPx[0], startPx[1], 4, 0, Math.PI * 2);
    contourCtx.fill();

    var gs = GDEngine.getState();
    if (gs) {
      if (chkBatch.checked) drawPath(gs.batch.path, gdColor, w, h, gs.batch.status);
      if (chkSgd.checked) drawPath(gs.sgd.path, sgdColor, w, h, gs.sgd.status);
    }
  }

  function drawPath(path, color, w, h, status) {
    if (path.length === 0) return;
    contourCtx.strokeStyle = color;
    contourCtx.lineWidth = 1.6;
    contourCtx.globalAlpha = 0.85;
    contourCtx.beginPath();
    for (var i = 0; i < path.length; i++) {
      var px = Contour.worldToPixel(path[i].w0, path[i].w1, contourRange, w, h);
      if (i === 0) contourCtx.moveTo(px[0], px[1]);
      else contourCtx.lineTo(px[0], px[1]);
    }
    contourCtx.stroke();
    contourCtx.globalAlpha = 1;

    var last = path[path.length - 1];
    var lastPx = Contour.worldToPixel(last.w0, last.w1, contourRange, w, h);
    contourCtx.fillStyle = status === 'diverged' ? '#ff3b3b' : color;
    contourCtx.beginPath();
    contourCtx.arc(lastPx[0], lastPx[1], 4.5, 0, Math.PI * 2);
    contourCtx.fill();
  }

  function drawStar(ctx, cx, cy, r, color) {
    var spikes = 5, outer = r, inner = r * 0.45;
    ctx.fillStyle = color;
    ctx.beginPath();
    var rot = Math.PI / 2 * 3;
    var step = Math.PI / spikes;
    ctx.moveTo(cx, cy - outer);
    for (var i = 0; i < spikes; i++) {
      var xo = cx + Math.cos(rot) * outer;
      var yo = cy + Math.sin(rot) * outer;
      ctx.lineTo(xo, yo);
      rot += step;
      var xi = cx + Math.cos(rot) * inner;
      var yi = cy + Math.sin(rot) * inner;
      ctx.lineTo(xi, yi);
      rot += step;
    }
    ctx.lineTo(cx, cy - outer);
    ctx.closePath();
    ctx.fill();
  }

  // ---------- MSE 차트 ----------
  function initChart() {
    var canvasEl = document.getElementById('mse-chart');
    mseChart = new Chart(canvasEl, {
      type: 'line',
      data: {
        datasets: [
          {
            label: '배치 GD',
            data: [],
            borderColor: '#ff6b6b',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.15,
            fill: false
          },
          {
            label: 'SGD',
            data: [],
            borderColor: '#a78bfa',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
            fill: false
          }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: '스텝', color: '#a0a0c0', font: { size: 10 } },
            ticks: { color: '#909090', font: { size: 9 } },
            grid: { color: 'rgba(60,60,100,0.3)' }
          },
          y: {
            title: { display: true, text: 'MSE', color: '#a0a0c0', font: { size: 10 } },
            beginAtZero: true,
            ticks: { color: '#909090', font: { size: 9 } },
            grid: { color: 'rgba(60,60,100,0.3)' }
          }
        },
        plugins: {
          legend: { display: true, labels: { color: '#e0e0e0', font: { size: 10 }, boxWidth: 12 } },
          tooltip: {
            backgroundColor: 'rgba(10,10,40,0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0'
          }
        }
      }
    });
  }

  function updateChart() {
    if (!mseChart) return;
    var gs = GDEngine.getState();
    if (!gs) return;
    mseChart.data.datasets[0].data = gs.batch.mseHistory.map(function (p) { return { x: p.step, y: p.mse }; });
    mseChart.data.datasets[1].data = gs.sgd.mseHistory.map(function (p) { return { x: p.step, y: p.mse }; });
    mseChart.update('none');
  }

  function resetChart() {
    if (!mseChart) return;
    mseChart.data.datasets[0].data = [];
    mseChart.data.datasets[1].data = [];
    mseChart.update('none');
  }

  // ---------- 상태 텍스트 ----------
  function statusLabel(status) {
    if (status === 'converged') return '수렴함';
    if (status === 'diverged') return '발산함 (η를 줄여보세요)';
    if (status === 'running') return '진행 중';
    return '대기 중';
  }

  function updateStatusText() {
    var gs = GDEngine.getState();
    var data = DataStore.getAll();
    if (!gs) {
      statStep.textContent = '0';
      statMse.textContent = '—';
      statStatus.textContent = '시작점을 등고선 위에서 클릭하세요';
      return;
    }
    var activeName = chkBatch.checked ? 'batch' : (chkSgd.checked ? 'sgd' : null);
    var active = activeName === 'batch' ? gs.batch : (activeName === 'sgd' ? gs.sgd : null);
    if (!active) {
      statStep.textContent = '0';
      statMse.textContent = '—';
      statStatus.textContent = '경로 표시를 최소 1개 선택하세요';
      return;
    }
    statStep.textContent = String(active.step);
    var m = Regression.mse(data, active.w0, active.w1);
    statMse.textContent = isFinite(m) ? m.toFixed(4) : '∞';

    var parts = [];
    if (chkBatch.checked) parts.push('배치: ' + statusLabel(gs.batch.status));
    if (chkSgd.checked) parts.push('SGD: ' + statusLabel(gs.sgd.status));
    statStatus.textContent = parts.join(' · ') || '대기 중';
  }

  // ---------- 데이터 변경 처리 ----------
  function onDataChanged() {
    rebuildContourBackground();
    // 데이터가 바뀌면 진행 중이던 경사하강 경로를 리셋한다 (구현 규칙 5)
    GDEngine.pause();
    GDEngine.setStart(startPoint.w0, startPoint.w1);
    resetChart();
    updatePlayPauseButtons();
    drawScatter();
    drawContour();
    updateStatusText();
  }

  function onLambdaChanged() {
    if (!contourRange) return;
    contourGrid = Contour.computeGrid(DataStore.getAll(), currentLambda, contourRange);
    var rect = contourCanvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Contour.renderBackground(bgCtx, w, h, contourGrid);
    drawContour();
  }

  // ---------- 재생 루프 프레임 콜백 ----------
  function onFrame() {
    drawContour();
    drawScatter();
    updateChart();
    updateStatusText();
  }

  function updatePlayPauseButtons() {
    var running = GDEngine.isRunning();
    btnPlay.disabled = running;
    btnPause.disabled = !running;
  }

  // ---------- 이벤트 바인딩 ----------
  function bindScatterEvents() {
    function handlePick(evt, isDelete) {
      var rect = scatterCanvas.getBoundingClientRect();
      var px = evt.clientX - rect.left;
      var py = evt.clientY - rect.top;
      var range = scatterRange();
      var world = scatterPixelToWorld(px, py, range, rect.width, rect.height);

      // 픽셀 허용오차(半径 10px)를 데이터 단위 허용오차로 환산
      var tolX = (range.x[1] - range.x[0]) * (10 / rect.width);
      var tolY = (range.y[1] - range.y[0]) * (10 / rect.height);
      var tol = Math.max(tolX, tolY);

      var removed = DataStore.removeNear(world[0], world[1], tol);
      if (!removed && !isDelete) {
        DataStore.add(world[0], world[1]);
      }
      onDataChanged();
    }

    scatterCanvas.addEventListener('click', function (evt) {
      handlePick(evt, false);
    });
    scatterCanvas.addEventListener('contextmenu', function (evt) {
      evt.preventDefault();
      handlePick(evt, true);
    });
  }

  function bindContourEvents() {
    contourCanvas.addEventListener('click', function (evt) {
      if (!contourRange) return;
      var rect = contourCanvas.getBoundingClientRect();
      var px = evt.clientX - rect.left;
      var py = evt.clientY - rect.top;
      var world = Contour.pixelToWorld(px, py, contourRange, rect.width, rect.height);
      startPoint.w0 = world[0];
      startPoint.w1 = world[1];
      GDEngine.pause();
      GDEngine.setStart(startPoint.w0, startPoint.w1);
      GDEngine.setActiveModes({ batch: chkBatch.checked, sgd: chkSgd.checked });
      resetChart();
      updatePlayPauseButtons();
      drawContour();
      drawScatter();
      updateStatusText();
    });
  }

  function bindControls() {
    elEta.addEventListener('input', function () {
      currentEta = Math.pow(10, parseFloat(elEta.value));
      elEtaVal.textContent = currentEta < 0.01 ? currentEta.toExponential(2) : currentEta.toFixed(3);
    });

    elLambda.addEventListener('input', function () {
      currentLambda = parseFloat(elLambda.value);
      elLambdaVal.textContent = currentLambda.toFixed(1);
      onLambdaChanged();
      updateStatusText();
    });

    chkBatch.addEventListener('change', function () {
      GDEngine.setActiveModes({ batch: chkBatch.checked, sgd: chkSgd.checked });
      drawContour();
      drawScatter();
      updateStatusText();
    });
    chkSgd.addEventListener('change', function () {
      GDEngine.setActiveModes({ batch: chkBatch.checked, sgd: chkSgd.checked });
      drawContour();
      drawScatter();
      updateStatusText();
    });

    btnPlay.addEventListener('click', function () {
      if (!chkBatch.checked && !chkSgd.checked) {
        statStatus.textContent = '경로 표시를 최소 1개 선택하세요';
        return;
      }
      if (!GDEngine.getState()) {
        GDEngine.setStart(startPoint.w0, startPoint.w1);
      }
      GDEngine.setActiveModes({ batch: chkBatch.checked, sgd: chkSgd.checked });
      GDEngine.play(
        function () { return DataStore.getAll(); },
        function () { return currentEta; },
        function () { return currentLambda; },
        onFrame
      );
      updatePlayPauseButtons();
    });

    btnPause.addEventListener('click', function () {
      GDEngine.pause();
      updatePlayPauseButtons();
    });

    btnReset.addEventListener('click', function () {
      GDEngine.pause();
      GDEngine.setStart(startPoint.w0, startPoint.w1);
      resetChart();
      updatePlayPauseButtons();
      drawContour();
      drawScatter();
      updateStatusText();
    });
  }

  function bindResize() {
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        dpr = window.devicePixelRatio || 1;
        rebuildContourBackground();
        drawScatter();
        drawContour();
      }, 120);
    });
  }

  // ---------- 초기화 ----------
  function init() {
    elEtaVal.textContent = currentEta.toFixed(3);
    elLambdaVal.textContent = currentLambda.toFixed(1);

    rebuildContourBackground();

    // 초기 시작점: 등고선 범위 좌상단 근처 (OLS 해로부터 떨어진 지점에서 출발해
    // 수렴 과정을 눈으로 볼 수 있도록)
    if (contourRange) {
      startPoint.w0 = contourRange.w0[0] + (contourRange.w0[1] - contourRange.w0[0]) * 0.12;
      startPoint.w1 = contourRange.w1[1] - (contourRange.w1[1] - contourRange.w1[0]) * 0.12;
    }
    GDEngine.setStart(startPoint.w0, startPoint.w1);
    GDEngine.setActiveModes({ batch: chkBatch.checked, sgd: chkSgd.checked });

    initChart();

    bindScatterEvents();
    bindContourEvents();
    bindControls();
    bindResize();

    drawScatter();
    drawContour();
    updateStatusText();
    updatePlayPauseButtons();
  }

  init();

})();
