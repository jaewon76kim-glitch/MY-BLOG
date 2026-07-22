/* mle-map-divergence.js — 섹션 5: MLE ↔ MAP 갈림길 토글
 * 숫자게임(4번 기능) 결과를 재사용해 사전확률 on/off에 따라 사후확률 순위가
 * 어떻게 달라지는지, N이 커질수록 사전확률 항의 영향력이 우도 항에 압도되어
 * MAP가 MLE로 수렴하는 과정을 보여준다.
 *
 * 데모 가설:
 *   h_two   = "2의 거듭제곱" (|h|=6, 1 제외) — 자연스러운 가설
 *   h_prime = "32를 제외한 2의 거듭제곱" (|h|=5) — 조작적이고 부자연스러운 가설
 *   h_even  = "짝수 전체" (|h|=50) — 항상 소극적인 참고용 가설
 * D={16,8,2,64}(N=4)에서 우도만 보면 h_prime이 h_two보다 높지만(|h| 작음),
 * h_two에 더 높은 사전확률을 주면 사후확률(우도×사전)은 h_two가 역전한다.
 * 여기 표시하는 막대는 -log p(D|h)와 -log p(h)의 "놀라움(surprisal)"이므로
 * 막대 합이 작을수록 더 유력한 가설이다.
 */

var MM_HYPOTHESES = [
  { id: 'two', label: 'h_two: 2의 거듭제곱', size: 6 },
  { id: 'hprime', label: "h': 32 제외 2의 거듭제곱", size: 5 },
  { id: 'even', label: 'h_even: 짝수 전체', size: 50 }
];

var mmState = {
  N: 4,
  priorOn: true,
  priors: { two: 0.1, hprime: 0.001, even: 0.05 }
};

var mmChart = null;

function mmCompute() {
  return MM_HYPOTHESES.map(function (h) {
    var logD = -mmState.N * Math.log(h.size); // log p(D|h), N과 무관 조건부이므로 항상 데이터가 h와 부합한다고 가정
    var logPriorMAP = Math.log(mmState.priors[h.id]);
    var surpriseD = -logD;               // -log p(D|h), N에 비례해 커짐
    var surprisePrior = -logPriorMAP;    // -log p(h), N과 무관한 상수
    var totalMLE = surpriseD;                       // 사전 균등(무정보) 가정 = 우도만
    var totalMAP = surpriseD + surprisePrior;        // 사전확률 반영
    return {
      id: h.id, label: h.label, size: h.size,
      surpriseD: surpriseD, surprisePrior: surprisePrior,
      totalMLE: totalMLE, totalMAP: totalMAP
    };
  });
}

function mmWinner(results, key) {
  var best = results[0];
  results.forEach(function (r) { if (r[key] < best[key]) best = r; });
  return best;
}

function mmRenderSummary(results) {
  var el = document.getElementById('mm-summary-text');
  if (!el) return;
  var mleWinner = mmWinner(results, 'totalMLE');
  var mapWinner = mmWinner(results, 'totalMAP');
  el.innerHTML =
    'N=' + mmState.N + '일 때 — <strong>우도만(MLE) 기준 승자: ' + mleWinner.label + '</strong>, ' +
    '<strong>사전확률 반영(MAP) 기준 승자: ' + mapWinner.label + '</strong>' +
    (mleWinner.id !== mapWinner.id
      ? ' → 우도와 사전확률이 서로 다른 가설을 지지합니다 (갈림길).'
      : ' → 이 N에서는 두 기준이 같은 가설을 지지합니다' +
        (mleWinner.id === 'hprime' ? ' (N이 커져 사전확률의 영향력이 우도에 압도된 상태 — MAP가 MLE로 수렴).' : '.'));
}

function mmRenderChart(results) {
  var ctx = document.getElementById('mm-chart').getContext('2d');
  var labels = results.map(function (r) { return r.label; });
  var likelihoodData = results.map(function (r) { return r.surpriseD; });
  var priorData = results.map(function (r) { return mmState.priorOn ? r.surprisePrior : 0; });

  var chartData = {
    labels: labels,
    datasets: [
      {
        label: '-log p(D|h)  (우도 항, N에 비례)',
        data: likelihoodData,
        backgroundColor: '#4fc3f7',
        stack: 's'
      },
      {
        label: mmState.priorOn ? '-log p(h)  (사전 항, N과 무관한 상수)' : '-log p(h)  (사전 미반영 = 0)',
        data: priorData,
        backgroundColor: '#ff6b6b',
        stack: 's'
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
          label: function (item) { return item.dataset.label + ': ' + item.raw.toFixed(3); }
        }
      }
    },
    scales: {
      y: {
        stacked: true,
        title: { display: true, text: '놀라움(surprisal) = -log 확률 (작을수록 유력)', color: '#a0a0c0' },
        ticks: { color: '#a0a0c0' },
        grid: { color: 'rgba(42,42,74,0.5)' }
      },
      x: {
        stacked: true,
        ticks: { color: '#e0e0e0' },
        grid: { display: false }
      }
    }
  };

  if (mmChart) {
    mmChart.data = chartData;
    mmChart.options = options;
    mmChart.update();
  } else {
    mmChart = new Chart(ctx, { type: 'bar', data: chartData, options: options });
  }
}

function mmRenderAll() {
  var results = mmCompute();
  mmRenderSummary(results);
  mmRenderChart(results);
}

function mmBindPriorSlider(id, valId, hypId) {
  var slider = document.getElementById(id);
  var val = document.getElementById(valId);
  slider.value = mmState.priors[hypId];
  if (val) val.textContent = mmState.priors[hypId].toFixed(3);
  slider.addEventListener('input', function () {
    mmState.priors[hypId] = parseFloat(slider.value);
    if (val) val.textContent = mmState.priors[hypId].toFixed(3);
    mmRenderAll();
  });
}

function initMleMapDivergence() {
  var nSlider = document.getElementById('mm-N-slider');
  var nVal = document.getElementById('mm-N-val');
  nSlider.value = mmState.N;
  nVal.textContent = mmState.N;
  nSlider.addEventListener('input', function () {
    mmState.N = parseInt(nSlider.value, 10);
    nVal.textContent = mmState.N;
    mmRenderAll();
  });

  mmBindPriorSlider('mm-prior-two-slider', 'mm-prior-two-val', 'two');
  mmBindPriorSlider('mm-prior-hprime-slider', 'mm-prior-hprime-val', 'hprime');
  mmBindPriorSlider('mm-prior-even-slider', 'mm-prior-even-val', 'even');

  var toggle = document.getElementById('mm-prior-toggle');
  toggle.checked = mmState.priorOn;
  toggle.addEventListener('change', function () {
    mmState.priorOn = toggle.checked;
    var priorControls = document.getElementById('mm-prior-controls');
    if (priorControls) priorControls.classList.toggle('mm-prior-disabled', !mmState.priorOn);
    mmRenderAll();
  });

  mmRenderAll();
}
