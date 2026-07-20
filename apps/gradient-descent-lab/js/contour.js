// contour.js - MSE(+릿지) 등고선 계산 및 canvas 렌더링.
// 전역 객체 Contour 로 노출 (type="module" 미사용).
//
// 배경(색상 밴드 + 밴드 경계선)은 데이터/λ가 바뀔 때만 오프스크린 캔버스에
// 다시 그리고, 애니메이션 프레임에서는 그 오프스크린 이미지를 blit한 뒤
// 경로/마커만 덧그려 성능을 확보한다.
//
// 색상: 단일 색조(사이트 accent #4fc3f7 계열) 시퀀셜 램프를 사용해
// "골짜기(낮은 손실)"는 어둡게, "벽(높은 손실)"은 밝게 표현한다
// (손실 지형에서 내려가야 할 방향이 어두운 쪽이라는 직관과 일치).

var Contour = (function () {

  var PADDING = { left: 46, right: 14, top: 14, bottom: 30 };
  var GRID_RES = 70; // 한 변당 격자 수
  var NUM_BANDS = 12;

  // ---- 색상 램프 (단일 색조, 어두운 골짜기 -> 밝은 accent) ----
  var RAMP_LOW = [13, 27, 42];   // #0d1b2a
  var RAMP_MID = [31, 111, 149]; // #1f6f95
  var RAMP_HIGH = [79, 195, 247]; // #4fc3f7 (accent)

  function lerp(a, b, t) { return a + (b - a) * t; }

  function rampColor(t) {
    t = Math.max(0, Math.min(1, t));
    var c;
    if (t < 0.5) {
      var tt = t / 0.5;
      c = [
        lerp(RAMP_LOW[0], RAMP_MID[0], tt),
        lerp(RAMP_LOW[1], RAMP_MID[1], tt),
        lerp(RAMP_LOW[2], RAMP_MID[2], tt)
      ];
    } else {
      var tt2 = (t - 0.5) / 0.5;
      c = [
        lerp(RAMP_MID[0], RAMP_HIGH[0], tt2),
        lerp(RAMP_MID[1], RAMP_HIGH[1], tt2),
        lerp(RAMP_MID[2], RAMP_HIGH[2], tt2)
      ];
    }
    return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
  }

  // 데이터와 OLS 해를 기반으로 등고선 패널이 보여줄 (w0,w1) 범위를 정한다.
  // 원점(0,0)을 항상 포함시켜 릿지가 원점 쪽으로 최저점을 당기는 것을 볼 수 있게 한다.
  function computeRange(data) {
    var ols = Regression.olsClosedForm(data);
    if (!ols || !isFinite(ols.w0) || !isFinite(ols.w1)) {
      return { w0: [-10, 10], w1: [-10, 10] };
    }
    var pad0 = Math.max(3, Math.abs(ols.w0) * 0.7 + 2);
    var pad1 = Math.max(3, Math.abs(ols.w1) * 0.7 + 2);
    var w0lo = Math.min(0, ols.w0) - pad0;
    var w0hi = Math.max(0, ols.w0) + pad0;
    var w1lo = Math.min(0, ols.w1) - pad1;
    var w1hi = Math.max(0, ols.w1) + pad1;
    return { w0: [w0lo, w0hi], w1: [w1lo, w1hi] };
  }

  // grid.values[row][col] = J(w0,w1), row는 w1(위->아래 감소), col은 w0(왼->오른 증가)
  function computeGrid(data, lambda, range) {
    var cols = GRID_RES, rows = GRID_RES;
    var values = new Array(rows);
    var min = Infinity, max = -Infinity;
    for (var r = 0; r < rows; r++) {
      values[r] = new Array(cols);
      var w1 = range.w1[1] - (r / (rows - 1)) * (range.w1[1] - range.w1[0]); // 위쪽이 큰 값
      for (var c = 0; c < cols; c++) {
        var w0 = range.w0[0] + (c / (cols - 1)) * (range.w0[1] - range.w0[0]);
        var v = data.length > 0 ? Regression.regObjective(data, w0, w1, lambda) : 0;
        values[r][c] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    return { values: values, cols: cols, rows: rows, min: min, max: max, range: range };
  }

  function worldToPixel(w0, w1, range, canvasW, canvasH) {
    var plotW = canvasW - PADDING.left - PADDING.right;
    var plotH = canvasH - PADDING.top - PADDING.bottom;
    var px = PADDING.left + ((w0 - range.w0[0]) / (range.w0[1] - range.w0[0])) * plotW;
    var py = PADDING.top + (1 - (w1 - range.w1[0]) / (range.w1[1] - range.w1[0])) * plotH;
    return [px, py];
  }

  function pixelToWorld(px, py, range, canvasW, canvasH) {
    var plotW = canvasW - PADDING.left - PADDING.right;
    var plotH = canvasH - PADDING.top - PADDING.bottom;
    var w0 = range.w0[0] + ((px - PADDING.left) / plotW) * (range.w0[1] - range.w0[0]);
    var w1 = range.w1[0] + (1 - (py - PADDING.top) / plotH) * (range.w1[1] - range.w1[0]);
    return [w0, w1];
  }

  function bandIndex(v, min, max) {
    var span = Math.max(1e-9, max - min);
    // sqrt 압축: 손실이 최솟값에서 멀어질수록 시각적으로 밴드 간격이 좁아지는
    // 이차함수(포물면) 형태를 완만하게 펴서 등고선 링이 고르게 보이게 한다.
    var t = Math.sqrt((v - min) / span);
    var idx = Math.floor(t * NUM_BANDS);
    if (idx >= NUM_BANDS) idx = NUM_BANDS - 1;
    if (idx < 0) idx = 0;
    return idx;
  }

  // 배경(색상 밴드 + 경계선 + 축)을 오프스크린 캔버스에 렌더링
  function renderBackground(ctx, canvasW, canvasH, grid) {
    ctx.clearRect(0, 0, canvasW, canvasH);

    var style = getComputedStyle(document.documentElement);
    var panelColor = (style.getPropertyValue('--panel') || '#1a1a2e').trim();
    var borderColor = (style.getPropertyValue('--border') || '#2a2a4a').trim();
    var textMuted = (style.getPropertyValue('--text-muted') || '#a0a0c0').trim();
    var contourLineColor = (style.getPropertyValue('--contour-color') || 'rgba(224,224,224,0.4)').trim();

    ctx.fillStyle = panelColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    var plotW = canvasW - PADDING.left - PADDING.right;
    var plotH = canvasH - PADDING.top - PADDING.bottom;
    var cellW = plotW / grid.cols;
    var cellH = plotH / grid.rows;

    // 밴드별 인덱스 미리 계산
    var bandGrid = new Array(grid.rows);
    for (var r = 0; r < grid.rows; r++) {
      bandGrid[r] = new Array(grid.cols);
      for (var c = 0; c < grid.cols; c++) {
        bandGrid[r][c] = bandIndex(grid.values[r][c], grid.min, grid.max);
      }
    }

    // 색상 밴드 채우기
    for (var ry = 0; ry < grid.rows; ry++) {
      for (var cx = 0; cx < grid.cols; cx++) {
        var idx = bandGrid[ry][cx];
        var t = idx / (NUM_BANDS - 1);
        ctx.fillStyle = rampColor(t);
        var x = PADDING.left + cx * cellW;
        var y = PADDING.top + ry * cellH;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellW) + 1, Math.ceil(cellH) + 1);
      }
    }

    // 밴드 경계선(등고선) 그리기: 인접 셀 간 밴드가 다르면 경계에 선을 긋는다
    ctx.strokeStyle = contourLineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var ry2 = 0; ry2 < grid.rows; ry2++) {
      for (var cx2 = 0; cx2 < grid.cols; cx2++) {
        var here = bandGrid[ry2][cx2];
        // 오른쪽 이웃과 경계
        if (cx2 < grid.cols - 1 && bandGrid[ry2][cx2 + 1] !== here) {
          var xB = PADDING.left + (cx2 + 1) * cellW;
          ctx.moveTo(xB, PADDING.top + ry2 * cellH);
          ctx.lineTo(xB, PADDING.top + (ry2 + 1) * cellH);
        }
        // 아래쪽 이웃과 경계
        if (ry2 < grid.rows - 1 && bandGrid[ry2 + 1][cx2] !== here) {
          var yB = PADDING.top + (ry2 + 1) * cellH;
          ctx.moveTo(PADDING.left + cx2 * cellW, yB);
          ctx.lineTo(PADDING.left + (cx2 + 1) * cellW, yB);
        }
      }
    }
    ctx.stroke();

    // 축 (w0: 가로, w1: 세로)
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = textMuted;
    ctx.font = '10px "Segoe UI", system-ui, sans-serif';
    ctx.lineWidth = 1;

    // 테두리
    ctx.strokeRect(PADDING.left, PADDING.top, plotW, plotH);

    // 원점(0,0) 십자선 (범위 안에 있을 때만)
    var range = grid.range;
    if (range.w0[0] <= 0 && 0 <= range.w0[1]) {
      var zx = worldToPixel(0, 0, range, canvasW, canvasH)[0];
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(zx, PADDING.top);
      ctx.lineTo(zx, PADDING.top + plotH);
      ctx.stroke();
      ctx.restore();
    }
    if (range.w1[0] <= 0 && 0 <= range.w1[1]) {
      var zy = worldToPixel(0, 0, range, canvasW, canvasH)[1];
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, zy);
      ctx.lineTo(PADDING.left + plotW, zy);
      ctx.stroke();
      ctx.restore();
    }

    // 눈금 (w0: 5개, w1: 5개)
    var TICKS = 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var i = 0; i <= TICKS; i++) {
      var w0v = range.w0[0] + (i / TICKS) * (range.w0[1] - range.w0[0]);
      var px = worldToPixel(w0v, range.w1[0], range, canvasW, canvasH)[0];
      ctx.beginPath();
      ctx.moveTo(px, PADDING.top + plotH);
      ctx.lineTo(px, PADDING.top + plotH + 4);
      ctx.strokeStyle = borderColor;
      ctx.stroke();
      ctx.fillText(w0v.toFixed(1), px, PADDING.top + plotH + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var j = 0; j <= TICKS; j++) {
      var w1v = range.w1[0] + (j / TICKS) * (range.w1[1] - range.w1[0]);
      var py = worldToPixel(range.w0[0], w1v, range, canvasW, canvasH)[1];
      ctx.beginPath();
      ctx.moveTo(PADDING.left - 4, py);
      ctx.lineTo(PADDING.left, py);
      ctx.strokeStyle = borderColor;
      ctx.stroke();
      ctx.fillText(w1v.toFixed(1), PADDING.left - 6, py);
    }

    // 축 이름
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('w₀ (절편)', PADDING.left + plotW / 2, canvasH - 4);
    ctx.save();
    ctx.translate(12, PADDING.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('w₁ (기울기)', 0, 0);
    ctx.restore();
  }

  return {
    computeRange: computeRange,
    computeGrid: computeGrid,
    renderBackground: renderBackground,
    worldToPixel: worldToPixel,
    pixelToWorld: pixelToWorld,
    PADDING: PADDING
  };

})();
