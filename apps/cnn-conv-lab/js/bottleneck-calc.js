/* bottleneck-calc.js — 섹션 4: 1x1 합성곱 연산량 절감 계산기
 * "직접 큰 커널 적용" vs "1x1 병목 후 큰 커널 적용"의 곱셈 연산 횟수를 비교한다.
 *
 * GoogLeNet 예시 기본값(교재 8부 원문 그대로 재현):
 *   H=W=11(특징맵 공간 크기), C_in=120, k=5(5x5 커널), C_out=20(5x5 커널 20개),
 *   C_bottleneck=6(1x1 커널 6개로 채널을 120→6으로 줄임)
 *   직접 적용: 11×11×5×5×120×20 = 7,260,000 ≈ 726만 회
 *   병목 후 적용: 11×11×1×1×120×6 + 11×11×5×5×6×20 = 87,120 + 363,000 = 450,120 ≈ 45만 회
 * (원문에서 1x1은 채널을 120→6으로 줄이며, 5x5 커널 20개가 최종 출력 채널 수 C_out=20을 만든다.
 *  "120→20"이 아니라 "120→6"이 병목 채널 수이므로 이 값을 기본값으로 사용해야 726만/45만이 정확히 재현된다.)
 */

var bnState = {
  H: 11,
  W: 11,
  Cin: 120,
  Cout: 20,
  k: 5,
  Cbottleneck: 6
};

var bnChart = null;

function bnCompute() {
  var direct = directConvOps(bnState.H, bnState.W, bnState.k, bnState.Cin, bnState.Cout);
  var bottleneck = bottleneckConvOps(bnState.H, bnState.W, bnState.k, bnState.Cin, bnState.Cout, bnState.Cbottleneck);
  return { direct: direct, bottleneck: bottleneck };
}

function bnRenderText(calc) {
  document.getElementById('bn-direct-value').textContent = calc.direct.toLocaleString('ko-KR') + '회';
  document.getElementById('bn-bottleneck-value').textContent = calc.bottleneck.total.toLocaleString('ko-KR') + '회';
  document.getElementById('bn-direct-korean').textContent = formatKoreanNumber(calc.direct);
  document.getElementById('bn-bottleneck-korean').textContent = formatKoreanNumber(calc.bottleneck.total);

  var ratio = calc.direct / calc.bottleneck.total;
  document.getElementById('bn-ratio-text').textContent =
    '병목 사용 시 연산량이 약 ' + ratio.toFixed(1) + '배 절감됩니다 (직접 적용 대비 ' +
    (100 / ratio).toFixed(1) + '%).';

  document.getElementById('bn-breakdown-text').innerHTML =
    '1×1 병목 단계: ' + bnState.H + '×' + bnState.W + '×1×1×' + bnState.Cin + '×' + bnState.Cbottleneck +
    ' = ' + calc.bottleneck.stage1.toLocaleString('ko-KR') + '회<br>' +
    bnState.k + '×' + bnState.k + ' 큰 커널 단계: ' + bnState.H + '×' + bnState.W + '×' + bnState.k + '×' + bnState.k +
    '×' + bnState.Cbottleneck + '×' + bnState.Cout + ' = ' + calc.bottleneck.stage2.toLocaleString('ko-KR') + '회';
}

function bnRenderChart(calc) {
  var ctx = document.getElementById('bn-chart').getContext('2d');
  var data = {
    labels: ['직접 ' + bnState.k + '×' + bnState.k + ' 적용', '1×1 병목 후 적용'],
    datasets: [{
      label: '곱셈 연산 횟수',
      data: [calc.direct, calc.bottleneck.total],
      backgroundColor: ['#ff6b6b', '#4fc3f7'],
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
          label: function (item) { return item.raw.toLocaleString('ko-KR') + '회'; }
        }
      }
    },
    scales: {
      y: {
        title: { display: true, text: '곱셈 연산 횟수', color: '#a0a0c0' },
        ticks: { color: '#a0a0c0' },
        grid: { color: 'rgba(42,42,74,0.5)' }
      },
      x: {
        ticks: { color: '#e0e0e0' },
        grid: { display: false }
      }
    }
  };

  if (bnChart) {
    bnChart.data = data;
    bnChart.update();
  } else {
    bnChart = new Chart(ctx, { type: 'bar', data: data, options: options });
  }
}

function bnRenderAll() {
  var calc = bnCompute();
  bnRenderText(calc);
  bnRenderChart(calc);
}

function bnBindInput(id, stateKey) {
  var el = document.getElementById(id);
  el.value = bnState[stateKey];
  el.addEventListener('input', function () {
    var v = parseInt(el.value, 10);
    if (isNaN(v) || v < 1) return;
    bnState[stateKey] = v;
    bnRenderAll();
  });
}

function bnLoadGoogLeNetPreset() {
  bnState.H = 11;
  bnState.W = 11;
  bnState.Cin = 120;
  bnState.Cout = 20;
  bnState.k = 5;
  bnState.Cbottleneck = 6;
  document.getElementById('bn-H-input').value = bnState.H;
  document.getElementById('bn-W-input').value = bnState.W;
  document.getElementById('bn-Cin-input').value = bnState.Cin;
  document.getElementById('bn-Cout-input').value = bnState.Cout;
  document.getElementById('bn-k-input').value = bnState.k;
  document.getElementById('bn-Cbottleneck-input').value = bnState.Cbottleneck;
  bnRenderAll();
}

function initBottleneckCalc() {
  bnBindInput('bn-H-input', 'H');
  bnBindInput('bn-W-input', 'W');
  bnBindInput('bn-Cin-input', 'Cin');
  bnBindInput('bn-Cout-input', 'Cout');
  bnBindInput('bn-k-input', 'k');
  bnBindInput('bn-Cbottleneck-input', 'Cbottleneck');

  document.getElementById('bn-googlenet-btn').addEventListener('click', bnLoadGoogLeNetPreset);

  bnRenderAll();
}
