/* param-count.js — 섹션 3: 완전연결 vs 합성곱 파라미터 수 비교
 * 입력 크기·채널 수·커널 크기·출력 채널 수를 받아 두 방식의 파라미터 개수를 계산하고
 * Chart.js 막대그래프(로그 스케일)로 비교한다.
 *
 * 완전연결 비교 기준(가정): "출력 특징맵의 각 유닛이 입력 전체와 독립적으로 완전연결된 경우".
 * 즉 입력 유닛 수(H×W×C_in)를, 이 합성곱층이 만들어내는 출력 특징맵 전체 유닛 수
 * (Hout×Wout×C_out, 패딩 없음·스트라이드 1 가정)에 전부 연결했다고 가정한다.
 * LeNet-5 예시(입력 32×32×1, 5×5 커널 6개)에서는 Hout=Wout=28이므로 출력 유닛 수 4704개,
 * 이를 conv-math.js의 fcParams(1024, 4704) = 1024×4704 + 4704 ≈ 482만(교재의 "약 480만"에 해당).
 */

var pcState = {
  H: 32,
  W: 32,
  Cin: 1,
  h: 5,
  Cout: 6
};

var pcChart = null;

function pcCompute() {
  var Hout = Math.max(pcState.H - pcState.h + 1, 0);
  var Wout = Math.max(pcState.W - pcState.h + 1, 0);
  var conv = convParams(pcState.h, pcState.Cin, pcState.Cout);
  var fc = fcParams(pcState.H * pcState.W * pcState.Cin, Hout * Wout * pcState.Cout);
  return { Hout: Hout, Wout: Wout, conv: conv, fc: fc };
}

function pcRenderText(calc) {
  var elConv = document.getElementById('pc-conv-value');
  var elFc = document.getElementById('pc-fc-value');
  var elAssump = document.getElementById('pc-assumption-text');
  if (elConv) elConv.textContent = calc.conv.toLocaleString('ko-KR') + '개';
  if (elFc) elFc.textContent = formatKoreanNumber(calc.fc) + '개';
  if (elAssump) {
    elAssump.textContent =
      '출력 특징맵 크기: ' + calc.Hout + '×' + calc.Wout + '×' + pcState.Cout + ' = ' +
      (calc.Hout * calc.Wout * pcState.Cout).toLocaleString('ko-KR') + '유닛 ' +
      '(완전연결 가정: 입력 전체 ' + (pcState.H * pcState.W * pcState.Cin).toLocaleString('ko-KR') +
      '개가 이 출력 유닛 전체와 독립적으로 완전연결됨)';
  }
}

function pcRenderChart(calc) {
  var ctx = document.getElementById('pc-chart').getContext('2d');
  var data = {
    labels: ['완전연결(FC)', '합성곱(부분연결+가중치공유)'],
    datasets: [{
      label: '파라미터 개수',
      data: [calc.fc, calc.conv],
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
          label: function (item) {
            return item.raw.toLocaleString('ko-KR') + '개';
          }
        }
      }
    },
    scales: {
      y: {
        type: 'logarithmic',
        title: { display: true, text: '파라미터 개수 (로그 스케일)', color: '#a0a0c0' },
        ticks: { color: '#a0a0c0' },
        grid: { color: 'rgba(42,42,74,0.5)' }
      },
      x: {
        ticks: { color: '#e0e0e0' },
        grid: { display: false }
      }
    }
  };

  if (pcChart) {
    pcChart.data = data;
    pcChart.options = options;
    pcChart.update();
  } else {
    pcChart = new Chart(ctx, { type: 'bar', data: data, options: options });
  }
}

function pcRenderAll() {
  var calc = pcCompute();
  pcRenderText(calc);
  pcRenderChart(calc);
}

function pcBindInput(id, stateKey) {
  var el = document.getElementById(id);
  el.value = pcState[stateKey];
  el.addEventListener('input', function () {
    var v = parseInt(el.value, 10);
    if (isNaN(v) || v < 1) return;
    pcState[stateKey] = v;
    pcRenderAll();
  });
}

function pcLoadLeNetPreset() {
  pcState.H = 32;
  pcState.W = 32;
  pcState.Cin = 1;
  pcState.h = 5;
  pcState.Cout = 6;
  document.getElementById('pc-H-input').value = pcState.H;
  document.getElementById('pc-W-input').value = pcState.W;
  document.getElementById('pc-Cin-input').value = pcState.Cin;
  document.getElementById('pc-h-input').value = pcState.h;
  document.getElementById('pc-Cout-input').value = pcState.Cout;
  pcRenderAll();
}

function initParamCount() {
  pcBindInput('pc-H-input', 'H');
  pcBindInput('pc-W-input', 'W');
  pcBindInput('pc-Cin-input', 'Cin');
  pcBindInput('pc-h-input', 'h');
  pcBindInput('pc-Cout-input', 'Cout');

  document.getElementById('pc-lenet-btn').addEventListener('click', pcLoadLeNetPreset);

  pcRenderAll();
}
