// chart.js - Chart.js 래퍼 모듈 (전역 변수 방식, type="module" 불사용)

var DopplerCharts = (function () {
  var dopplerChart = null;
  var rttChart = null;

  var MAX_POINTS = 300;

  // 공통 차트 옵션 생성
  function baseOptions(yLabel, color, yMin, yMax) {
    return {
      type: 'line',
      data: {
        datasets: [{
          label: yLabel,
          data: [],          // {x, y} 형식
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false
        }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,       // {x,y} 직접 사용
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: '경과 시간 (s)',
              color: '#909090',
              font: { size: 10 }
            },
            ticks: {
              color: '#909090',
              maxTicksLimit: 7,
              font: { size: 9 }
            },
            grid: { color: 'rgba(60,60,100,0.3)' }
          },
          y: {
            title: {
              display: true,
              text: yLabel,
              color: '#909090',
              font: { size: 10 }
            },
            min: yMin,
            max: yMax,
            ticks: {
              color: '#909090',
              font: { size: 9 },
              maxTicksLimit: 5
            },
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
    };
  }

  // 0선 플러그인 (도플러 차트용)
  var zeroLinePlugin = {
    id: 'dopplerZeroLine',
    afterDraw: function (chart) {
      if (!chart.options.showZeroLine) return;
      var ctx = chart.ctx;
      var yScale = chart.scales.y;
      var xScale = chart.scales.x;
      if (!yScale || !xScale) return;
      var y0 = yScale.getPixelForValue(0);
      if (isNaN(y0)) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(xScale.left, y0);
      ctx.lineTo(xScale.right, y0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  };

  // 플러그인 등록 (중복 방지)
  if (typeof Chart !== 'undefined') {
    Chart.register(zeroLinePlugin);
  }

  function initDoppler(canvasEl, maxKhz) {
    if (dopplerChart) {
      dopplerChart.destroy();
      dopplerChart = null;
    }
    var margin = maxKhz * 1.15;
    if (margin < 5) margin = 5;
    var opts = baseOptions('도플러 천이 (kHz)', '#ff6b6b', -margin, margin);
    opts.options.showZeroLine = true;

    dopplerChart = new Chart(canvasEl, opts);
    return dopplerChart;
  }

  function initRTT(canvasEl, maxRTT_ms) {
    if (rttChart) {
      rttChart.destroy();
      rttChart = null;
    }
    var yMax = maxRTT_ms * 1.1;
    if (yMax < 1) yMax = 500;
    var opts = baseOptions('RTT (ms)', '#51cf66', 0, yMax);
    rttChart = new Chart(canvasEl, opts);
    return rttChart;
  }

  function pushPoint(chart, x, y) {
    if (!chart) return;
    var data = chart.data.datasets[0].data;

    data.push({ x: x, y: y });

    if (data.length > MAX_POINTS) {
      data.shift();
    }

    chart.update('none');
  }

  function pushDoppler(timeSec, f_d_khz) {
    pushPoint(dopplerChart, timeSec, f_d_khz);
  }

  function pushRTT(timeSec, rtt_ms) {
    pushPoint(rttChart, timeSec, rtt_ms);
  }

  function resetCharts(maxKhz, maxRTT_ms, dopplerCanvas, rttCanvas) {
    // Chart.js가 이미 로드되어 있어야 함
    if (typeof Chart === 'undefined') {
      console.error('Chart.js not loaded');
      return;
    }
    initDoppler(dopplerCanvas, maxKhz);
    initRTT(rttCanvas, maxRTT_ms);
  }

  return {
    initDoppler: initDoppler,
    initRTT: initRTT,
    pushDoppler: pushDoppler,
    pushRTT: pushRTT,
    resetCharts: resetCharts
  };
})();
