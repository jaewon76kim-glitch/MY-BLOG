// charts.js - Chart.js 래퍼 모듈 (전역 변수 방식, type="module" 사용 안 함)
// 워터폴 막대(링크버짓 누적), 강우감쇠 곡선, 아웃티지 확률 곡선을 그린다.

var LBCharts = (function () {
  'use strict';

  var waterfallChart = null;
  var rainChart = null;
  var outageChart = null;

  var COLOR_UP = '#51cf66';    // 증가(이득) 단계
  var COLOR_DOWN = '#ff6b6b';  // 감소(손실) 단계
  var COLOR_START = '#4fc3f7'; // 시작(EIRP) 단계
  var COLOR_END = '#ffd43b';   // 최종 결과(Es/N0) 단계
  var GRID_COLOR = 'rgba(60,60,100,0.3)';
  var TICK_COLOR = '#909090';

  function commonScaleText(text) {
    return {
      display: true,
      text: text,
      color: TICK_COLOR,
      font: { size: 10 }
    };
  }

  // ---------- 워터폴 막대 그래프 ----------
  // steps: [{ label, delta, isStart }] 순서대로 누적. delta는 부호 포함(+/-).
  function buildWaterfallData(steps) {
    var labels = [];
    var bars = [];    // [from, to]
    var colors = [];
    var running = 0;

    steps.forEach(function (step, idx) {
      labels.push(step.label);
      var from = running;
      var to;
      if (step.isStart) {
        to = step.delta;
        colors.push(COLOR_START);
      } else if (idx === steps.length - 1) {
        to = running + step.delta;
        colors.push(COLOR_END);
      } else {
        to = running + step.delta;
        colors.push(step.delta >= 0 ? COLOR_UP : COLOR_DOWN);
      }
      bars.push([from, to]);
      running = to;
    });

    return { labels: labels, bars: bars, colors: colors, final: running };
  }

  function initWaterfall(canvasEl) {
    if (waterfallChart) {
      waterfallChart.destroy();
      waterfallChart = null;
    }
    waterfallChart = new Chart(canvasEl, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderRadius: 3,
          barPercentage: 0.7,
          categoryPercentage: 0.85
        }]
      },
      options: {
        animation: { duration: 200 },
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
          x: {
            ticks: { color: TICK_COLOR, font: { size: 9 }, maxRotation: 45, minRotation: 0 },
            grid: { color: GRID_COLOR }
          },
          y: {
            title: commonScaleText('dB / dBW'),
            ticks: { color: TICK_COLOR, font: { size: 9 } },
            grid: { color: GRID_COLOR }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,10,40,0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0',
            callbacks: {
              label: function (ctx) {
                var v = ctx.raw;
                var delta = v[1] - v[0];
                return '누적: ' + v[1].toFixed(1) + ' dB  (증분 ' +
                  (delta >= 0 ? '+' : '') + delta.toFixed(1) + ')';
              }
            }
          }
        }
      }
    });
    return waterfallChart;
  }

  function updateWaterfall(steps) {
    if (!waterfallChart) return null;
    var built = buildWaterfallData(steps);
    waterfallChart.data.labels = built.labels;
    waterfallChart.data.datasets[0].data = built.bars;
    waterfallChart.data.datasets[0].backgroundColor = built.colors;
    waterfallChart.update('none');
    return built.final;
  }

  // ---------- 강우감쇠 곡선 (A_0.01 vs R_0.01) ----------
  function initRainCurve(canvasEl) {
    if (rainChart) {
      rainChart.destroy();
      rainChart = null;
    }
    rainChart = new Chart(canvasEl, {
      type: 'line',
      data: {
        datasets: [
          {
            label: '강우감쇠 곡선',
            data: [],
            borderColor: '#4fc3f7',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
            fill: false
          },
          {
            label: '현재값',
            data: [],
            borderColor: '#ffd43b',
            backgroundColor: '#ffd43b',
            pointRadius: 5,
            pointHoverRadius: 6,
            showLine: false
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
            title: commonScaleText('R₀.₀₁ (mm/h)'),
            ticks: { color: TICK_COLOR, font: { size: 9 }, maxTicksLimit: 7 },
            grid: { color: GRID_COLOR }
          },
          y: {
            title: commonScaleText('A₀.₀₁ (dB)'),
            beginAtZero: true,
            ticks: { color: TICK_COLOR, font: { size: 9 } },
            grid: { color: GRID_COLOR }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,10,40,0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0'
          }
        }
      }
    });
    return rainChart;
  }

  function updateRainCurve(curvePoints, currentPoint) {
    if (!rainChart) return;
    rainChart.data.datasets[0].data = curvePoints;
    rainChart.data.datasets[1].data = [currentPoint];
    rainChart.update('none');
  }

  // ---------- 아웃티지 확률 곡선 (O_N vs 마진) ----------
  function initOutageCurve(canvasEl) {
    if (outageChart) {
      outageChart.destroy();
      outageChart = null;
    }
    outageChart = new Chart(canvasEl, {
      type: 'line',
      data: {
        datasets: [
          {
            label: '아웃티지 곡선',
            data: [],
            borderColor: '#ff6b6b',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
            fill: false
          },
          {
            label: '현재 마진',
            data: [],
            borderColor: '#ffd43b',
            backgroundColor: '#ffd43b',
            pointRadius: 5,
            pointHoverRadius: 6,
            showLine: false
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
            title: commonScaleText('링크마진 (dB)'),
            ticks: { color: TICK_COLOR, font: { size: 9 }, maxTicksLimit: 7 },
            grid: { color: GRID_COLOR }
          },
          y: {
            type: 'logarithmic',
            title: commonScaleText('아웃티지 확률 Oₙ'),
            ticks: {
              color: TICK_COLOR,
              font: { size: 9 },
              callback: function (value) {
                var s = value.toExponential ? value.toExponential(0) : String(value);
                return s;
              }
            },
            grid: { color: GRID_COLOR }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,10,40,0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0'
          }
        }
      }
    });
    return outageChart;
  }

  function updateOutageCurve(curvePoints, currentPoint) {
    if (!outageChart) return;
    outageChart.data.datasets[0].data = curvePoints;
    outageChart.data.datasets[1].data = [currentPoint];
    outageChart.update('none');
  }

  return {
    initWaterfall: initWaterfall,
    updateWaterfall: updateWaterfall,
    initRainCurve: initRainCurve,
    updateRainCurve: updateRainCurve,
    initOutageCurve: initOutageCurve,
    updateOutageCurve: updateOutageCurve
  };
})();
