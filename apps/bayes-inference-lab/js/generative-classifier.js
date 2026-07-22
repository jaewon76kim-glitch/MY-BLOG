/* generative-classifier.js — 섹션 3: 생성적 분류기(오션뷰 호텔 MAP 분류)
 * 클래스별(호텔 A/B/C) 우도 p(x|y=c)와 사전확률 p(y=c) 슬라이더를 조절하면
 * 베이즈 정리로 정규화된 사후확률 막대그래프를 즉시 갱신하고 MAP 클래스를 강조한다.
 */

var gcState = {
  classes: [
    { name: '호텔 A', likelihood: 0.75, prior: 1 / 3 },
    { name: '호텔 B', likelihood: 0.25, prior: 1 / 3 },
    { name: '호텔 C', likelihood: 0.50, prior: 1 / 3 }
  ]
};

var gcChart = null;

var GC_COLORS = ['#4fc3f7', '#ff6b6b', '#ffd43b', '#8be28b', '#c792ea'];

function gcRenderText(calc) {
  var el = document.getElementById('gc-evidence-text');
  if (!el) return;
  var terms = calc.results.map(function (r) {
    return r.likelihood.toFixed(3) + '×' + r.prior.toFixed(3) + '=' + r.unnormalized.toFixed(4);
  }).join(' + ');
  el.innerHTML =
    'p(오션뷰) = Σ p(오션뷰|y=c)·p(y=c) = ' + terms + ' = <strong>' + calc.evidence.toFixed(4) + '</strong>';

  var mapEl = document.getElementById('gc-map-text');
  if (mapEl && calc.mapIndex >= 0) {
    var winner = calc.results[calc.mapIndex];
    mapEl.innerHTML = 'MAP 선택: <strong style="color:' + GC_COLORS[calc.mapIndex % GC_COLORS.length] + '">' +
      winner.name + '</strong> (사후확률 ' + (winner.posterior * 100).toFixed(1) + '%)';
  }
}

function gcRenderChart(calc) {
  var ctx = document.getElementById('gc-chart').getContext('2d');
  var labels = calc.results.map(function (r) { return r.name; });
  var data = calc.results.map(function (r) { return r.posterior; });
  var colors = calc.results.map(function (r, i) {
    return i === calc.mapIndex ? '#ffd43b' : GC_COLORS[i % GC_COLORS.length];
  });

  var chartData = {
    labels: labels,
    datasets: [{
      label: '사후확률 p(y=c|오션뷰)',
      data: data,
      backgroundColor: colors,
      borderRadius: 4
    }]
  };
  var options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (item) { return (item.raw * 100).toFixed(2) + '%'; }
        }
      }
    },
    scales: {
      y: {
        min: 0, max: 1,
        title: { display: true, text: '사후확률', color: '#a0a0c0' },
        ticks: {
          color: '#a0a0c0',
          callback: function (v) { return (v * 100).toFixed(0) + '%'; }
        },
        grid: { color: 'rgba(42,42,74,0.5)' }
      },
      x: {
        ticks: { color: '#e0e0e0' },
        grid: { display: false }
      }
    }
  };

  if (gcChart) {
    gcChart.data = chartData;
    gcChart.options = options;
    gcChart.update();
  } else {
    gcChart = new Chart(ctx, { type: 'bar', data: chartData, options: options });
  }
}

function gcRenderAll() {
  var calc = generativeClassifierPosteriors(gcState.classes);
  gcRenderText(calc);
  gcRenderChart(calc);
}

function gcBuildControls() {
  var wrap = document.getElementById('gc-class-controls');
  wrap.innerHTML = '';
  gcState.classes.forEach(function (c, i) {
    var row = document.createElement('div');
    row.className = 'gc-class-row';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'gc-name-input';
    nameInput.value = c.name;
    nameInput.addEventListener('input', function () {
      gcState.classes[i].name = nameInput.value || ('클래스 ' + (i + 1));
      gcRenderAll();
    });

    var likWrap = document.createElement('div');
    likWrap.className = 'gc-slider-wrap';
    var likLabel = document.createElement('span');
    likLabel.className = 'control-label';
    likLabel.textContent = '우도 p(x|y=c) = ';
    var likVal = document.createElement('span');
    likVal.className = 'gc-slider-val';
    likVal.textContent = c.likelihood.toFixed(2);
    likLabel.appendChild(likVal);
    var likSlider = document.createElement('input');
    likSlider.type = 'range';
    likSlider.min = '0'; likSlider.max = '1'; likSlider.step = '0.01';
    likSlider.value = c.likelihood;
    likSlider.addEventListener('input', function () {
      gcState.classes[i].likelihood = parseFloat(likSlider.value);
      likVal.textContent = gcState.classes[i].likelihood.toFixed(2);
      gcRenderAll();
    });
    likWrap.appendChild(likLabel);
    likWrap.appendChild(likSlider);

    var priorWrap = document.createElement('div');
    priorWrap.className = 'gc-slider-wrap';
    var priorLabel = document.createElement('span');
    priorLabel.className = 'control-label';
    priorLabel.textContent = '사전확률 p(y=c) = ';
    var priorVal = document.createElement('span');
    priorVal.className = 'gc-slider-val';
    priorVal.textContent = c.prior.toFixed(2);
    priorLabel.appendChild(priorVal);
    var priorSlider = document.createElement('input');
    priorSlider.type = 'range';
    priorSlider.min = '0'; priorSlider.max = '1'; priorSlider.step = '0.01';
    priorSlider.value = c.prior;
    priorSlider.addEventListener('input', function () {
      gcState.classes[i].prior = parseFloat(priorSlider.value);
      priorVal.textContent = gcState.classes[i].prior.toFixed(2);
      gcRenderAll();
    });
    priorWrap.appendChild(priorLabel);
    priorWrap.appendChild(priorSlider);

    row.appendChild(nameInput);
    row.appendChild(likWrap);
    row.appendChild(priorWrap);
    wrap.appendChild(row);
  });
}

function gcResetPreset() {
  gcState.classes = [
    { name: '호텔 A', likelihood: 0.75, prior: 1 / 3 },
    { name: '호텔 B', likelihood: 0.25, prior: 1 / 3 },
    { name: '호텔 C', likelihood: 0.50, prior: 1 / 3 }
  ];
  gcBuildControls();
  gcRenderAll();
}

function initGenerativeClassifier() {
  gcBuildControls();
  document.getElementById('gc-reset-btn').addEventListener('click', gcResetPreset);
  gcRenderAll();
}
