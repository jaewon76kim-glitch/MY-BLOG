// charts.js - Chart.js 설정 (전역 변수 방식, type="module" 사용 안 함)
//
// 차트 1: 시간축 포락선(dB) — 실시간 스크롤 라인. 임계값 수평 점선 + 임계값 아래 영역 음영은
//         커스텀 플러그인(afterDraw)으로 그리고, 임계값 아래로 떨어진 선분 구간은 Chart.js의
//         segment.borderColor 콜백으로 강조색을 입혀 표시한다("임계값 아래 구간 음영" 요구 반영).
// 차트 2: PDF vs 히스토그램 — 막대(몬테카를로 실측)와 선(이론 PDF)을 한 Chart 인스턴스에
//         혼합 타입(datasets 배열의 type 필드)으로 겹쳐 그린다.

var FadingCharts = (function () {
  'use strict';

  var envelopeChart = null;
  var pdfChart = null;

  var MAX_POINTS = 400;
  var currentThresholdDb = null;
  var currentLineColor = '#4fc3f7';
  var belowColor = '#ff6b6b';

  // ---- 임계값 점선 + 음영 플러그인 ----
  var thresholdPlugin = {
    id: 'fadingThresholdLine',
    afterDraw: function (chart) {
      if (chart !== envelopeChart) return;
      if (currentThresholdDb === null || currentThresholdDb === undefined) return;
      var yScale = chart.scales.y;
      var xScale = chart.scales.x;
      if (!yScale || !xScale) return;
      var yPix = yScale.getPixelForValue(currentThresholdDb);
      if (isNaN(yPix)) return;

      var ctx = chart.ctx;
      ctx.save();

      // 임계값 아래 영역 음영
      var bottom = yScale.getPixelForValue(yScale.min);
      if (yPix < bottom) {
        ctx.fillStyle = 'rgba(255, 107, 107, 0.08)';
        ctx.fillRect(xScale.left, yPix, xScale.right - xScale.left, bottom - yPix);
      }

      // 점선
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(xScale.left, yPix);
      ctx.lineTo(xScale.right, yPix);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  };

  if (typeof Chart !== 'undefined') {
    Chart.register(thresholdPlugin);
  }

  function initEnvelopeChart(canvasEl) {
    if (envelopeChart) {
      envelopeChart.destroy();
      envelopeChart = null;
    }
    envelopeChart = new Chart(canvasEl, {
      type: 'line',
      data: {
        datasets: [{
          label: '순시 SNR (dB)',
          data: [],
          borderColor: currentLineColor,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15,
          fill: false,
          segment: {
            borderColor: function (ctx) {
              if (currentThresholdDb === null || currentThresholdDb === undefined) return currentLineColor;
              var y0 = ctx.p0.parsed.y;
              var y1 = ctx.p1.parsed.y;
              if (y0 < currentThresholdDb && y1 < currentThresholdDb) return belowColor;
              return currentLineColor;
            }
          }
        }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: '경과 시간 (s)', color: '#909090', font: { size: 10 } },
            ticks: { color: '#909090', maxTicksLimit: 7, font: { size: 9 } },
            grid: { color: 'rgba(60,60,100,0.3)' }
          },
          y: {
            title: { display: true, text: '순시 SNR (dB)', color: '#909090', font: { size: 10 } },
            ticks: { color: '#909090', font: { size: 9 }, maxTicksLimit: 6 },
            grid: { color: 'rgba(60,60,100,0.3)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,10,40,0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0',
            displayColors: false
          }
        }
      }
    });
    return envelopeChart;
  }

  function setEnvelopeColor(color) {
    currentLineColor = color;
    if (envelopeChart) {
      envelopeChart.data.datasets[0].borderColor = color;
    }
  }

  function setThresholdDb(dbValue) {
    currentThresholdDb = dbValue;
  }

  function setEnvelopeYRange(centerDb) {
    if (!envelopeChart) return;
    envelopeChart.options.scales.y.suggestedMin = centerDb - 30;
    envelopeChart.options.scales.y.suggestedMax = centerDb + 15;
  }

  function pushEnvelope(tSec, dbValue) {
    if (!envelopeChart) return;
    var data = envelopeChart.data.datasets[0].data;
    data.push({ x: tSec, y: dbValue });
    if (data.length > MAX_POINTS) data.shift();
    envelopeChart.update('none');
  }

  function resetEnvelope() {
    if (!envelopeChart) return;
    envelopeChart.data.datasets[0].data = [];
    envelopeChart.update('none');
  }

  // ---- PDF vs 히스토그램 차트 ----
  function initPdfChart(canvasEl) {
    if (pdfChart) {
      pdfChart.destroy();
      pdfChart = null;
    }
    pdfChart = new Chart(canvasEl, {
      data: {
        datasets: [
          {
            type: 'bar',
            label: '몬테카를로 히스토그램',
            data: [],
            backgroundColor: 'rgba(79, 195, 247, 0.35)',
            borderColor: 'rgba(79, 195, 247, 0.7)',
            borderWidth: 1,
            barPercentage: 1.0,
            categoryPercentage: 1.0,
            order: 2
          },
          {
            type: 'line',
            label: '이론 PDF',
            data: [],
            borderColor: '#ffd43b',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.25,
            fill: false,
            order: 1
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
            title: { display: true, text: '정규화 SNR γ/γ̄', color: '#909090', font: { size: 10 } },
            ticks: { color: '#909090', font: { size: 9 }, maxTicksLimit: 8 },
            grid: { color: 'rgba(60,60,100,0.3)' }
          },
          y: {
            title: { display: true, text: '확률밀도', color: '#909090', font: { size: 10 } },
            ticks: { color: '#909090', font: { size: 9 } },
            grid: { color: 'rgba(60,60,100,0.3)' },
            beginAtZero: true
          }
        },
        plugins: {
          legend: { display: true, labels: { color: '#a0a0c0', font: { size: 10 }, boxWidth: 12 } },
          tooltip: {
            backgroundColor: 'rgba(10,10,40,0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0'
          }
        }
      }
    });
    return pdfChart;
  }

  function updateHistogram(data) {
    if (!pdfChart) return;
    pdfChart.data.datasets[0].data = data;
    pdfChart.update('none');
  }

  function updateTheoryPdf(data, color) {
    if (!pdfChart) return;
    pdfChart.data.datasets[1].data = data;
    if (color) pdfChart.data.datasets[1].borderColor = color;
    pdfChart.update('none');
  }

  function resetPdfChart() {
    if (!pdfChart) return;
    pdfChart.data.datasets[0].data = [];
    pdfChart.update('none');
  }

  return {
    initEnvelopeChart: initEnvelopeChart,
    setEnvelopeColor: setEnvelopeColor,
    setThresholdDb: setThresholdDb,
    setEnvelopeYRange: setEnvelopeYRange,
    pushEnvelope: pushEnvelope,
    resetEnvelope: resetEnvelope,
    initPdfChart: initPdfChart,
    updateHistogram: updateHistogram,
    updateTheoryPdf: updateTheoryPdf,
    resetPdfChart: resetPdfChart
  };
})();
