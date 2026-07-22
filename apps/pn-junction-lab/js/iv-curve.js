/* iv-curve.js — 섹션 3: 쇼클리 다이오드 I-V 곡선 (Chart.js)
 * I(V) = I0(e^{V/(k_BT/e)} - 1) 을 그리고, 현재 V의 동작점을 마커로 표시한다.
 * Y축 선형/로그 토글을 제공한다(로그에서는 |I|를 표시 — 음수/0을 로그축에 그릴 수 없기 때문).
 */

var ivChart = null;
var ivMode = 'linear'; // 'linear' | 'log'

var IV_CURVE_COLOR = '#4fc3f7';
var IV_MARKER_COLOR = '#ffd43b';

function ivBuildCurvePoints(calc) {
  var steps = 240;
  var pts = [];
  for (var i = 0; i <= steps; i++) {
    var V = VOLTAGE_MIN + (VOLTAGE_MAX - VOLTAGE_MIN) * i / steps;
    var I = diodeCurrent(calc.I0, V, calc.T);
    pts.push({ x: V, y: I });
  }
  return pts;
}

function ivToLogSafe(points, floor) {
  return points.map(function (p) {
    var v = Math.abs(p.y);
    return { x: p.x, y: v < floor ? floor : v };
  });
}

function ivRender(calc) {
  var ctx = document.getElementById('iv-chart').getContext('2d');
  var rawPts = ivBuildCurvePoints(calc);
  var floor = calc.I0 * 1e-3;
  var curvePts = ivMode === 'log' ? ivToLogSafe(rawPts, floor) : rawPts;
  var opY = ivMode === 'log' ? Math.max(Math.abs(calc.I), floor) : calc.I;

  var chartData = {
    datasets: [
      {
        label: 'I(V)',
        data: curvePts,
        borderColor: IV_CURVE_COLOR,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        parsing: false
      },
      {
        label: '동작점 (현재 V)',
        data: [{ x: calc.V, y: opY }],
        type: 'scatter',
        showLine: false,
        pointRadius: 6,
        pointBackgroundColor: IV_MARKER_COLOR,
        pointBorderColor: '#0f0f1a',
        pointBorderWidth: 1.5,
        parsing: false
      }
    ]
  };

  var options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: { color: '#a0a0c0', font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: function (item) {
            var yVal = item.raw.y;
            return (ivMode === 'log' ? '|I| ≈ ' : 'I ≈ ') + formatCurrent(ivMode === 'log' ? yVal : yVal);
          },
          title: function (items) {
            return 'V = ' + items[0].raw.x.toFixed(3) + ' V';
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        min: VOLTAGE_MIN,
        max: VOLTAGE_MAX,
        title: { display: true, text: 'V (볼트)', color: '#a0a0c0' },
        ticks: { color: '#a0a0c0' },
        grid: { color: 'rgba(42,42,74,0.5)' }
      },
      y: {
        type: ivMode === 'log' ? 'logarithmic' : 'linear',
        title: { display: true, text: ivMode === 'log' ? '|I| (A, 로그)' : 'I (A)', color: '#a0a0c0' },
        ticks: {
          color: '#a0a0c0',
          callback: function (v) { return formatCurrent(v); }
        },
        grid: { color: 'rgba(42,42,74,0.5)' }
      }
    }
  };

  if (ivChart) {
    ivChart.data = chartData;
    ivChart.options = options;
    ivChart.update();
  } else {
    ivChart = new Chart(ctx, { type: 'line', data: chartData, options: options });
  }

  document.getElementById('iv-i0-val').textContent = formatCurrent(calc.I0);
  var opText = document.getElementById('iv-op-text');
  if (opText) {
    opText.innerHTML = '현재 동작점: V = ' + calc.V.toFixed(3) + ' V 일 때 I = <strong>' +
      formatCurrent(calc.I) + '</strong> (I0 = ' + formatCurrent(calc.I0) + ', I/I0 ≈ ' +
      sciNotation(calc.I0 !== 0 ? calc.I / calc.I0 : 0, 3) + ')';
  }
}

function initIvCurve() {
  document.getElementById('iv-linear-btn').addEventListener('click', function () {
    ivMode = 'linear';
    this.classList.add('primary');
    document.getElementById('iv-log-btn').classList.remove('primary');
    ivRender(getCurrentCalc());
  });
  document.getElementById('iv-log-btn').addEventListener('click', function () {
    ivMode = 'log';
    this.classList.add('primary');
    document.getElementById('iv-linear-btn').classList.remove('primary');
    ivRender(getCurrentCalc());
  });
}
