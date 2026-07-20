/* conv-math.js
 * CNN 합성곱 연산 실험실 — 순수 계산 함수 모음 (전역 변수, 모듈 시스템 미사용)
 * 다른 js 파일(conv-demo.js, hyperparam-explorer.js, param-count.js,
 * bottleneck-calc.js, resnet-gradient.js)에서 그대로 재사용한다.
 */

/* ---------- 1) 합성곱 슬라이딩 (섹션 1) ---------- */

/**
 * 커널 프리셋. 교재 관례에 맞춘 계수.
 */
var KERNEL_PRESETS = {
  edge: {
    label: '엣지 검출',
    values: [
      [-1, -1, -1],
      [-1,  8, -1],
      [-1, -1, -1]
    ]
  },
  blur: {
    label: '블러 (평균)',
    values: [
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9]
    ]
  },
  sharpen: {
    label: '샤픈',
    values: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ]
  },
  identity: {
    label: '항등(변화 없음)',
    values: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0]
    ]
  },
  custom: {
    label: '커스텀',
    values: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0]
    ]
  }
};

/**
 * 한 위치에서의 dot product (원소별 곱-합) 계산.
 * image, kernel: 2차원 배열. (row, col) = 커널의 좌상단이 놓이는 이미지 좌표.
 * 패딩 없음, 스트라이드 1 기준.
 * 반환: { terms: [{imgVal, kVal, prod, u, v}], sum }
 */
function dotProductAt(image, kernel, row, col) {
  var kh = kernel.length;
  var kw = kernel[0].length;
  var terms = [];
  var sum = 0;
  for (var u = 0; u < kh; u++) {
    for (var v = 0; v < kw; v++) {
      var imgVal = image[row + u][col + v];
      var kVal = kernel[u][v];
      var prod = imgVal * kVal;
      sum += prod;
      terms.push({ imgVal: imgVal, kVal: kVal, prod: prod, u: u, v: v });
    }
  }
  return { terms: terms, sum: sum };
}

/**
 * 전체 특징맵 계산 (패딩 없음, 스트라이드 1). raw dot product 값 그대로 반환(정규화 없음).
 */
function convolve2D(image, kernel) {
  var n = image.length;
  var m = image[0].length;
  var kh = kernel.length;
  var kw = kernel[0].length;
  var outH = n - kh + 1;
  var outW = m - kw + 1;
  var out = [];
  for (var i = 0; i < outH; i++) {
    var row = [];
    for (var j = 0; j < outW; j++) {
      row.push(dotProductAt(image, kernel, i, j).sum);
    }
    out.push(row);
  }
  return out;
}

/**
 * 일반화된 합성곱: 스트라이드/패딩 지원 (섹션 2용).
 * padding은 0으로 채운다.
 */
function convolve2DGeneral(image, kernel, stride, padding) {
  var n = image.length;
  var m = image[0].length;
  var kh = kernel.length;
  var kw = kernel[0].length;

  // 패딩된 이미지 생성
  var padded = [];
  var padN = n + 2 * padding;
  var padM = m + 2 * padding;
  for (var i = 0; i < padN; i++) {
    var row = [];
    for (var j = 0; j < padM; j++) {
      var srcI = i - padding;
      var srcJ = j - padding;
      if (srcI >= 0 && srcI < n && srcJ >= 0 && srcJ < m) {
        row.push(image[srcI][srcJ]);
      } else {
        row.push(0);
      }
    }
    padded.push(row);
  }

  var outH = Math.floor((padN - kh) / stride) + 1;
  var outW = Math.floor((padM - kw) / stride) + 1;
  var out = [];
  for (var oi = 0; oi < outH; oi++) {
    var orow = [];
    for (var oj = 0; oj < outW; oj++) {
      var baseI = oi * stride;
      var baseJ = oj * stride;
      var sum = 0;
      for (var u = 0; u < kh; u++) {
        for (var v = 0; v < kw; v++) {
          sum += padded[baseI + u][baseJ + v] * kernel[u][v];
        }
      }
      orow.push(sum);
    }
    out.push(orow);
  }
  return { output: out, padded: padded };
}

/* ---------- 2) 출력 크기 공식 (섹션 2) ---------- */

/**
 * n' = floor((n + 2p - h) / s) + 1
 */
function outputSize(n, h, s, p) {
  return Math.floor((n + 2 * p - h) / s) + 1;
}

/**
 * 풀링: matrix에 대해 poolSize x poolSize 윈도우, 스트라이드 stride로
 * 최대풀링/평균풀링을 적용한다. 패딩 없음.
 * mode: 'max' | 'avg'
 */
function pool2D(matrix, poolSize, stride, mode) {
  var n = matrix.length;
  var m = matrix[0].length;
  var outH = Math.floor((n - poolSize) / stride) + 1;
  var outW = Math.floor((m - poolSize) / stride) + 1;
  if (outH <= 0 || outW <= 0) return [];
  var out = [];
  for (var oi = 0; oi < outH; oi++) {
    var row = [];
    for (var oj = 0; oj < outW; oj++) {
      var baseI = oi * stride;
      var baseJ = oj * stride;
      var vals = [];
      for (var u = 0; u < poolSize; u++) {
        for (var v = 0; v < poolSize; v++) {
          vals.push(matrix[baseI + u][baseJ + v]);
        }
      }
      if (mode === 'max') {
        row.push(Math.max.apply(null, vals));
      } else {
        var sum = vals.reduce(function (a, b) { return a + b; }, 0);
        row.push(sum / vals.length);
      }
    }
    out.push(row);
  }
  return out;
}

/* ---------- 3) 파라미터 수 비교 (섹션 3) ---------- */

/**
 * 합성곱층 파라미터 개수: (h*h*C_in + 1) * C_out (편향 포함, 커널당 1개)
 */
function convParams(h, cIn, cOut) {
  return (h * h * cIn + 1) * cOut;
}

/**
 * 완전연결 파라미터 개수(비교용 가정):
 * "출력 특징맵의 각 유닛이 입력 전체와 독립적으로 완전연결된 경우"
 * = 입력 유닛 수 * 출력 유닛 수 + 출력 유닛 수(편향, 유닛당 1개)
 * 입력 유닛 수 = H*W*C_in, 출력 유닛 수 = Hout*Wout*C_out
 * (Hout, Wout은 해당 합성곱층이 만들어내는 출력 특징맵 크기: 패딩 없음, 스트라이드 1 가정)
 */
function fcParams(inputUnits, outputUnits) {
  return inputUnits * outputUnits + outputUnits;
}

/* ---------- 4) 1x1 합성곱 연산량 절감 (섹션 4) ---------- */

/**
 * 직접 큰 커널 적용 시 곱셈 횟수: H*W*k*k*C_in*C_out
 */
function directConvOps(H, W, k, cIn, cOut) {
  return H * W * k * k * cIn * cOut;
}

/**
 * 1x1 병목 후 큰 커널 적용 시 곱셈 횟수:
 * (1x1 병목 단계: H*W*1*1*C_in*C_bottleneck) + (큰 커널 단계: H*W*k*k*C_bottleneck*C_out)
 */
function bottleneckConvOps(H, W, k, cIn, cOut, cBottleneck) {
  var stage1 = H * W * 1 * 1 * cIn * cBottleneck;
  var stage2 = H * W * k * k * cBottleneck * cOut;
  return { stage1: stage1, stage2: stage2, total: stage1 + stage2 };
}

/* ---------- 5) 잔차연결 기울기 흐름 (섹션 5) ---------- */

/**
 * 일반(곱셈 경로만): dx_L/dx_1 = Π_{i=1}^{L-1} f'_i (모든 층에 공통 f' 적용)
 * L=1일 때는 경로가 없으므로(자기 자신) 1을 반환.
 */
function gradientPlain(L, fPrime) {
  if (L <= 1) return 1;
  return Math.pow(fPrime, L - 1);
}

/**
 * 잔차연결 포함: dx_L/dx_1 = (Π f'_i) + 1
 */
function gradientResidual(L, fPrime) {
  return gradientPlain(L, fPrime) + 1;
}

/* ---------- 공통 유틸 ---------- */

/**
 * 숫자를 한국어 자릿수 단위(만)로 읽기 쉽게 포맷. 큰 수 표시용.
 */
function formatKoreanNumber(num) {
  var rounded = Math.round(num);
  var withComma = rounded.toLocaleString('ko-KR');
  if (rounded >= 10000) {
    var man = rounded / 10000;
    var manStr = man >= 100 ? man.toFixed(0) : man.toFixed(1);
    return withComma + ' (약 ' + manStr + '만)';
  }
  return withComma;
}
