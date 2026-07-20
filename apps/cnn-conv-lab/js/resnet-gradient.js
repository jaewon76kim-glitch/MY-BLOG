/* resnet-gradient.js — 섹션 5: 잔차연결(ResNet) 기울기 흐름 비교
 * 층 수 L, 평균 기울기 인자 f'(0.1~1.0)를 조절하면
 * "일반 신경망"(곱셈 경로만, Π f') 과 "잔차연결 포함"(Π f' + 1)의 dx_L/dx_1 값을
 * 층수에 따라 라인차트로 비교한다.
 */

var rgState = {
  Lmax: 20,
  fPrime: 0.5,
  logScale: false
};

var rgChart = null;

function rgCompute() {
  var labels = [];
  var plain = [];
  var residual = [];
  for (var L = 1; L <= rgState.Lmax; L++) {
    labels.push(L);
    plain.push(gradientPlain(L, rgState.fPrime));
    residual.push(gradientResidual(L, rgState.fPrime));
  }
  return { labels: labels, plain: plain, residual: residual };
}

function rgRenderChart() {
  var calc = rgCompute();
  var ctx = document.getElementById('rg-chart').getContext('2d');

  var data = {
    labels: calc.labels,
    datasets: [
      {
        label: '일반 신경망 (곱셈 경로만, Π f\')',
        data: calc.plain,
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255,107,107,0.15)',
        tension: 0.15,
        pointRadius: 2
      },
      {
        label: '잔차연결 포함 (Π f\' + 1)',
        data: calc.residual,
        borderColor: '#4fc3f7',
        backgroundColor: 'rgba(79,195,247,0.15)',
        tension: 0.15,
        pointRadius: 2
      }
    ]
  };

  var options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e0e0e0' } },
      tooltip: {
        callbacks: {
          label: function (item) {
            return item.dataset.label + ': ' + item.raw.toFixed(6);
          }
        }
      }
    },
    scales: {
      y: {
        type: rgState.logScale ? 'logarithmic' : 'linear',
        title: { display: true, text: '∂x_L / ∂x_1', color: '#a0a0c0' },
        ticks: { color: '#a0a0c0' },
        grid: { color: 'rgba(42,42,74,0.5)' }
      },
      x: {
        title: { display: true, text: '층 수 L', color: '#a0a0c0' },
        ticks: { color: '#a0a0c0' },
        grid: { color: 'rgba(42,42,74,0.3)' }
      }
    }
  };

  if (rgChart) {
    rgChart.data = data;
    rgChart.options = options;
    rgChart.update();
  } else {
    rgChart = new Chart(ctx, { type: 'line', data: data, options: options });
  }
}

function rgRenderSummary() {
  var calc = rgCompute();
  var lastPlain = calc.plain[calc.plain.length - 1];
  var lastResidual = calc.residual[calc.residual.length - 1];
  var el = document.getElementById('rg-summary-text');
  if (el) {
    el.innerHTML =
      'L=' + rgState.Lmax + '일 때: 일반 신경망 = ' + lastPlain.toExponential(3) +
      ' (0으로 수렴) · 잔차연결 = ' + lastResidual.toFixed(6) + ' (항상 ≥ 1 유지)';
  }
}

function rgRenderAll() {
  rgRenderChart();
  rgRenderSummary();
}

function initResnetGradient() {
  var LSlider = document.getElementById('rg-L-slider');
  var LVal = document.getElementById('rg-L-val');
  LSlider.value = rgState.Lmax;
  LVal.textContent = rgState.Lmax;
  LSlider.addEventListener('input', function () {
    rgState.Lmax = parseInt(LSlider.value, 10);
    LVal.textContent = rgState.Lmax;
    rgRenderAll();
  });

  var fSlider = document.getElementById('rg-fprime-slider');
  var fVal = document.getElementById('rg-fprime-val');
  fSlider.value = rgState.fPrime;
  fVal.textContent = rgState.fPrime.toFixed(2);
  fSlider.addEventListener('input', function () {
    rgState.fPrime = parseFloat(fSlider.value);
    fVal.textContent = rgState.fPrime.toFixed(2);
    rgRenderAll();
  });

  var logToggle = document.getElementById('rg-log-toggle');
  logToggle.addEventListener('change', function () {
    rgState.logScale = logToggle.checked;
    rgRenderAll();
  });

  rgRenderAll();
}
