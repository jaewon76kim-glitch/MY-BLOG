/* number-game.js — 섹션 4·5: 숫자게임(Number Game) 가설공간
 * 1~100 격자에서 숫자를 클릭해 데이터 D에 추가/제거하면, 고정된 가설공간 중 D와 모순되지
 * 않는 가설들의 강한 표집 우도 p(D|h)=(1/|h|)^N을 계산해 로그 스케일 막대그래프로 비교한다.
 *
 * 주의: 원문(교재)은 "2의 거듭제곱"을 "1,2,4,8,16,32,64로 6개"라고 서술하지만 실제 나열은 7개다
 * (1=2^0 포함). 원문의 우도 계산(1/6, (1/6)^4)은 |h|=6을 사용해 유도되었으므로, 이 앱에서는
 * h_two를 "1을 제외한 2의 거듭제곱 {2,4,8,16,32,64}", |h_two|=6으로 정의해 원문 계산과 정확히
 * 일치시킨다.
 */

var NUMBER_GAME_HYPOTHESES = [
  {
    id: 'even', label: '짝수 전체', size: 50,
    predicate: function (n) { return n % 2 === 0; }
  },
  {
    id: 'odd', label: '홀수 전체', size: 50,
    predicate: function (n) { return n % 2 === 1; }
  },
  {
    id: 'two', label: '2의 거듭제곱 (|h|=6, 1 제외)', size: 6,
    predicate: function (n) { return [2, 4, 8, 16, 32, 64].indexOf(n) >= 0; }
  },
  {
    id: 'mult3', label: '3의 배수', size: 33,
    predicate: function (n) { return n % 3 === 0; }
  },
  {
    id: 'mult4', label: '4의 배수', size: 25,
    predicate: function (n) { return n % 4 === 0; }
  },
  {
    id: 'mult5', label: '5의 배수', size: 20,
    predicate: function (n) { return n % 5 === 0; }
  },
  {
    id: 'le10', label: '10 이하의 수', size: 10,
    predicate: function (n) { return n <= 10; }
  },
  {
    id: 'endsIn0', label: "끝자리가 0인 수", size: 10,
    predicate: function (n) { return n % 10 === 0; }
  },
  {
    id: 'all', label: '1~100 모든 수', size: 100,
    predicate: function () { return true; }
  },
  {
    id: 'prime', label: '소수', size: 25,
    predicate: function (n) { return isPrimeNumber(n); }
  },
  {
    id: 'square', label: '완전제곱수', size: 10,
    predicate: function (n) { var r = Math.sqrt(n); return Math.abs(r - Math.round(r)) < 1e-9; }
  }
];

var ngState = {
  data: [16] // 클릭으로 선택된 숫자 (D)
};

var ngChart = null;

function ngComputeLikelihoods(data) {
  var N = data.length;
  return NUMBER_GAME_HYPOTHESES.map(function (h) {
    var consistent = N === 0 ? true : isConsistentWithHypothesis(data, h.predicate);
    var p = hypothesisLikelihood(h.size, N, consistent);
    return {
      id: h.id, label: h.label, size: h.size,
      consistent: consistent, p: p,
      logp: logHypothesisLikelihood(h.size, N, consistent)
    };
  });
}

function ngRenderGrid() {
  var grid = document.getElementById('ng-number-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (var n = 1; n <= 100; n++) {
    var cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'ng-cell' + (ngState.data.indexOf(n) >= 0 ? ' ng-cell-selected' : '');
    cell.textContent = n;
    cell.dataset.n = n;
    (function (num, el) {
      el.addEventListener('click', function () {
        var idx = ngState.data.indexOf(num);
        if (idx >= 0) ngState.data.splice(idx, 1);
        else ngState.data.push(num);
        ngRenderAll();
      });
    })(n, cell);
    grid.appendChild(cell);
  }
}

function ngRenderList(results) {
  var el = document.getElementById('ng-hypothesis-list');
  if (!el) return;
  var sorted = results.slice().sort(function (a, b) { return b.p - a.p; });
  el.innerHTML = sorted.map(function (r) {
    var cls = r.consistent ? 'ng-list-row' : 'ng-list-row ng-list-row-contradicted';
    var valueText = r.consistent ? formatSmallProb(r.p) : '모순 (p=0)';
    return '<div class="' + cls + '">' +
      '<span class="ng-list-label">' + r.label + ' <span class="ng-list-size">|h|=' + r.size + '</span></span>' +
      '<span class="ng-list-value">' + valueText + '</span>' +
      '</div>';
  }).join('');
}

function ngRenderDataText() {
  var el = document.getElementById('ng-data-text');
  if (!el) return;
  var sorted = ngState.data.slice().sort(function (a, b) { return a - b; });
  el.textContent = 'D = { ' + (sorted.length ? sorted.join(', ') : '(비어 있음)') + ' }  (N=' + sorted.length + ')';
}

function ngRenderChart(results) {
  var ctx = document.getElementById('ng-chart').getContext('2d');
  var consistentResults = results.filter(function (r) { return r.consistent && r.p > 0; });
  consistentResults.sort(function (a, b) { return b.p - a.p; });

  var labels = consistentResults.map(function (r) { return r.label; });
  var data = consistentResults.map(function (r) { return r.p; });
  var colors = consistentResults.map(function (r, i) { return i === 0 ? '#ffd43b' : '#4fc3f7'; });

  var chartData = {
    labels: labels,
    datasets: [{
      label: 'p(D|h)',
      data: data,
      backgroundColor: colors,
      borderRadius: 4
    }]
  };
  var options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (item) { return 'p(D|h) = ' + formatSmallProb(item.raw); }
        }
      }
    },
    scales: {
      x: {
        type: 'logarithmic',
        title: { display: true, text: 'p(D|h) (로그 스케일, 모순 가설 제외)', color: '#a0a0c0' },
        ticks: { color: '#a0a0c0' },
        grid: { color: 'rgba(42,42,74,0.5)' }
      },
      y: {
        ticks: { color: '#e0e0e0' },
        grid: { display: false }
      }
    }
  };

  if (ngChart) {
    ngChart.data = chartData;
    ngChart.options = options;
    ngChart.update();
  } else {
    ngChart = new Chart(ctx, { type: 'bar', data: chartData, options: options });
  }
}

function ngRenderAll() {
  ngRenderGrid();
  ngRenderDataText();
  var results = ngComputeLikelihoods(ngState.data);
  ngRenderList(results);
  ngRenderChart(results);
  // 섹션 5(MLE/MAP)도 같은 가설공간과 상호작용하므로 존재하면 갱신
  if (typeof mmRenderAll === 'function') mmRenderAll();
}

function ngLoadPreset(nums) {
  ngState.data = nums.slice();
  ngRenderAll();
}

function initNumberGame() {
  document.getElementById('ng-preset-16-btn').addEventListener('click', function () {
    ngLoadPreset([16]);
  });
  document.getElementById('ng-preset-4nums-btn').addEventListener('click', function () {
    ngLoadPreset([16, 8, 2, 64]);
  });
  document.getElementById('ng-clear-btn').addEventListener('click', function () {
    ngLoadPreset([]);
  });

  ngRenderAll();
}
