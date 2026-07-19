// charts.js - Chart.js 래퍼 모듈 (전역 변수 방식, type="module" 사용 안 함)
// 성상도 산점도(판정 경계 포함) + BER-vs-Eb/N0 로그스케일 곡선을 그린다.
// (apps/link-budget-calc/js/charts.js의 구조/색상 톤을 계승)

var ConstellationCharts = (function () {
  'use strict';

  var constellationChart = null;
  var berCurveChart = null;

  var COLOR_IDEAL = '#ffd43b';
  var COLOR_RX_OK = 'rgba(79, 195, 247, 0.45)';
  var COLOR_RX_ERR = 'rgba(255, 107, 107, 0.85)';
  var COLOR_BOUNDARY = 'rgba(160, 160, 210, 0.35)';
  var GRID_COLOR = 'rgba(60,60,100,0.3)';
  var TICK_COLOR = '#909090';

  var MOD_COLORS = {
    BPSK: '#51cf66',
    QPSK: '#4fc3f7',
    '8PSK': '#ffd43b',
    '16QAM': '#ff8787',
    '64QAM': '#da77f2'
  };

  // 판정경계 플러그인이 참조하는 "현재 그려진 성상도" 상태
  var boundaryState = { modKey: 'QPSK', constellation: [] };

  function commonScaleText(text) {
    return { display: true, text: text, color: TICK_COLOR, font: { size: 10 } };
  }

  // ---------- 판정 경계 그리기 (Chart.js 코어 플러그인 훅만 사용, 외부 플러그인 불필요) ----------
  var BOUNDARY_RANGE = 2.2;

  var decisionBoundaryPlugin = {
    id: 'decisionBoundary',
    beforeDatasetsDraw: function (chart) {
      if (!chart.config._isConstellationChart) return;
      if (!boundaryState.constellation.length) return;

      var ctx = chart.ctx;
      var xScale = chart.scales.x;
      var yScale = chart.scales.y;
      ctx.save();
      ctx.strokeStyle = COLOR_BOUNDARY;
      ctx.lineWidth = 1;

      var cfg = Modulation.MODS[boundaryState.modKey];
      if (cfg.type === 'psk') {
        drawRadialBoundaries(ctx, xScale, yScale, boundaryState.constellation.length);
      } else {
        drawGridBoundaries(ctx, xScale, yScale, boundaryState.constellation);
      }
      ctx.restore();
    }
  };

  // PSK: 인접 성상점 사이의 각 이등분선(방사형 부채꼴 경계)
  function drawRadialBoundaries(ctx, xScale, yScale, M) {
    var cx = xScale.getPixelForValue(0);
    var cy = yScale.getPixelForValue(0);
    for (var m = 0; m < M; m++) {
      var theta = (2 * Math.PI * m / M) + (Math.PI / M);
      var ex = BOUNDARY_RANGE * Math.cos(theta);
      var ey = BOUNDARY_RANGE * Math.sin(theta);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(xScale.getPixelForValue(ex), yScale.getPixelForValue(ey));
      ctx.stroke();
    }
  }

  // QAM: 인접 레벨 사이 중점에 수직/수평 격자선 (사각형 격자 판정경계)
  function drawGridBoundaries(ctx, xScale, yScale, constellation) {
    var xs = uniqueSorted(constellation.map(function (p) { return p.x; }));
    var ys = uniqueSorted(constellation.map(function (p) { return p.y; }));
    var lo = -BOUNDARY_RANGE, hi = BOUNDARY_RANGE;

    var i, mid, px, py;
    for (i = 0; i < xs.length - 1; i++) {
      mid = (xs[i] + xs[i + 1]) / 2;
      px = xScale.getPixelForValue(mid);
      ctx.beginPath();
      ctx.moveTo(px, yScale.getPixelForValue(lo));
      ctx.lineTo(px, yScale.getPixelForValue(hi));
      ctx.stroke();
    }
    for (i = 0; i < ys.length - 1; i++) {
      mid = (ys[i] + ys[i + 1]) / 2;
      py = yScale.getPixelForValue(mid);
      ctx.beginPath();
      ctx.moveTo(xScale.getPixelForValue(lo), py);
      ctx.lineTo(xScale.getPixelForValue(hi), py);
      ctx.stroke();
    }
  }

  function uniqueSorted(arr) {
    var seen = {};
    var out = [];
    arr.forEach(function (v) {
      var key = v.toFixed(6);
      if (!seen[key]) {
        seen[key] = true;
        out.push(v);
      }
    });
    out.sort(function (a, b) { return a - b; });
    return out;
  }

  // ---------- 성상도 산점도 ----------
  function initConstellationChart(canvasEl) {
    if (constellationChart) {
      constellationChart.destroy();
      constellationChart = null;
    }
    constellationChart = new Chart(canvasEl, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: '수신점(정상판정)',
            data: [],
            backgroundColor: COLOR_RX_OK,
            pointRadius: 2.6,
            pointHoverRadius: 4
          },
          {
            label: '수신점(오판정)',
            data: [],
            backgroundColor: COLOR_RX_ERR,
            pointRadius: 3.2,
            pointHoverRadius: 5
          },
          {
            label: '이상적 성상점',
            data: [],
            backgroundColor: COLOR_IDEAL,
            borderColor: 'rgba(0,0,0,0.5)',
            borderWidth: 1,
            pointRadius: 7,
            pointHoverRadius: 8,
            pointStyle: 'rectRot'
          }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            min: -BOUNDARY_RANGE,
            max: BOUNDARY_RANGE,
            title: commonScaleText('I (동위상)'),
            ticks: { color: TICK_COLOR, font: { size: 9 } },
            grid: { color: GRID_COLOR }
          },
          y: {
            type: 'linear',
            min: -BOUNDARY_RANGE,
            max: BOUNDARY_RANGE,
            title: commonScaleText('Q (직교위상)'),
            ticks: { color: TICK_COLOR, font: { size: 9 } },
            grid: { color: GRID_COLOR }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: TICK_COLOR, font: { size: 9 }, boxWidth: 10, padding: 8 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,10,40,0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0'
          }
        }
      },
      plugins: [decisionBoundaryPlugin]
    });
    constellationChart.config._isConstellationChart = true;
    return constellationChart;
  }

  function updateConstellationChart(modKey, simResult) {
    if (!constellationChart) return;
    boundaryState.modKey = modKey;
    boundaryState.constellation = simResult.constellation;

    var ok = [];
    var err = [];
    simResult.points.forEach(function (p) {
      (p.error ? err : ok).push({ x: p.x, y: p.y });
    });

    constellationChart.data.datasets[0].data = ok;
    constellationChart.data.datasets[1].data = err;
    constellationChart.data.datasets[2].data = simResult.constellation.map(function (c) {
      return { x: c.x, y: c.y };
    });
    constellationChart.update('none');
  }

  // ---------- BER vs Eb/N0 곡선 ----------
  var BER_MIN_PLOT = 1e-6;

  function initBerCurveChart(canvasEl) {
    if (berCurveChart) {
      berCurveChart.destroy();
      berCurveChart = null;
    }

    var datasets = Modulation.MOD_ORDER.map(function (key) {
      return {
        label: key,
        data: [],
        borderColor: MOD_COLORS[key],
        borderWidth: 1.6,
        pointRadius: 0,
        tension: 0,
        fill: false
      };
    });
    datasets.push({
      label: '현재 동작점',
      data: [],
      borderColor: '#ffffff',
      backgroundColor: '#ffffff',
      pointRadius: 6,
      pointHoverRadius: 7,
      showLine: false
    });

    berCurveChart = new Chart(canvasEl, {
      type: 'line',
      data: { datasets: datasets },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        scales: {
          x: {
            type: 'linear',
            min: -5,
            max: 20,
            title: commonScaleText('Eb/N0 (dB)'),
            ticks: { color: TICK_COLOR, font: { size: 9 }, maxTicksLimit: 8 },
            grid: { color: GRID_COLOR }
          },
          y: {
            type: 'logarithmic',
            min: BER_MIN_PLOT,
            max: 1,
            title: commonScaleText('BER (이론값)'),
            ticks: {
              color: TICK_COLOR,
              font: { size: 9 },
              callback: function (value) {
                return value.toExponential ? value.toExponential(0) : String(value);
              }
            },
            grid: { color: GRID_COLOR }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: TICK_COLOR, font: { size: 9 }, boxWidth: 10, padding: 6 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,10,40,0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0'
          }
        }
      }
    });

    // 5개 변조방식의 이론 BER 곡선은 정적이므로 초기화 시 한 번만 계산해 채운다.
    Modulation.MOD_ORDER.forEach(function (key, idx) {
      var curve = [];
      for (var db = -5; db <= 20; db += 0.5) {
        var ber = Modulation.theoryBER(key, db);
        if (ber < BER_MIN_PLOT) ber = BER_MIN_PLOT;
        curve.push({ x: db, y: ber });
      }
      berCurveChart.data.datasets[idx].data = curve;
    });
    berCurveChart.update('none');

    return berCurveChart;
  }

  function updateBerCurrentPoint(modKey, ebn0_dB) {
    if (!berCurveChart) return;
    var ber = Modulation.theoryBER(modKey, ebn0_dB);
    if (ber < BER_MIN_PLOT) ber = BER_MIN_PLOT;
    var lastIdx = berCurveChart.data.datasets.length - 1;
    berCurveChart.data.datasets[lastIdx].data = [{ x: ebn0_dB, y: ber }];
    berCurveChart.update('none');
  }

  return {
    initConstellationChart: initConstellationChart,
    updateConstellationChart: updateConstellationChart,
    initBerCurveChart: initBerCurveChart,
    updateBerCurrentPoint: updateBerCurrentPoint
  };
})();
