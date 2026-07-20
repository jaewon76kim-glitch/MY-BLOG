/* conv-demo.js — 섹션 1: 합성곱 슬라이딩 데모
 * 토이 이미지 상태 관리 + 커널 슬라이딩 애니메이션 + 특징맵 렌더링(canvas)
 * 전역 변수 사용 (모듈 시스템 없음), main.js에서 initConvDemo() 호출로 초기화.
 */

var IMG_SIZE = 10;      // 토이 이미지 n x n
var KERNEL_SIZE = 3;    // 커널 크기 (섹션 1은 3x3 고정)

var convDemoState = {
  image: [],              // n x n, 0~255
  kernelKey: 'edge',      // 현재 선택된 프리셋 키
  customKernel: null,     // 사용자가 입력한 커스텀 커널 (3x3)
  pos: { row: 0, col: 0 }, // 현재 슬라이딩 위치 (커널 좌상단)
  playing: false,
  speedMs: 350,
  lastStepTime: 0,
  rafId: null
};

function makeDefaultImage() {
  var img = [];
  for (var i = 0; i < IMG_SIZE; i++) {
    var row = [];
    for (var j = 0; j < IMG_SIZE; j++) {
      // 대각선 그라디언트 + 중앙에 밝은 사각형 패턴 (엣지 검출이 잘 보이도록)
      var base = Math.round(40 + (i + j) * (150 / (2 * IMG_SIZE)));
      var isBoxEdge = (i >= 3 && i <= 6 && j >= 3 && j <= 6);
      var val = isBoxEdge ? 230 : base;
      row.push(Math.max(0, Math.min(255, val)));
    }
    img.push(row);
  }
  return img;
}

function getCurrentKernel() {
  if (convDemoState.kernelKey === 'custom') {
    return convDemoState.customKernel || KERNEL_PRESETS.custom.values;
  }
  return KERNEL_PRESETS[convDemoState.kernelKey].values;
}

function convDemoOutputDims() {
  return {
    h: IMG_SIZE - KERNEL_SIZE + 1,
    w: IMG_SIZE - KERNEL_SIZE + 1
  };
}

/* ---------- 렌더링 ---------- */

var imgCanvas, imgCtx, featCanvas, featCtx;
var CELL = 34; // 이미지 셀 픽셀 크기 (반응형에서 CSS로 스케일)

function renderImageGrid() {
  if (!imgCtx) return;
  var kernel = getCurrentKernel();
  var pos = convDemoState.pos;
  imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);

  for (var i = 0; i < IMG_SIZE; i++) {
    for (var j = 0; j < IMG_SIZE; j++) {
      var v = convDemoState.image[i][j];
      imgCtx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
      imgCtx.fillRect(j * CELL, i * CELL, CELL, CELL);

      // 커널이 현재 덮고 있는 칸이면 강조 테두리
      var inWindow = (i >= pos.row && i < pos.row + KERNEL_SIZE &&
                       j >= pos.col && j < pos.col + KERNEL_SIZE);
      imgCtx.strokeStyle = inWindow ? '#4fc3f7' : 'rgba(42,42,74,0.6)';
      imgCtx.lineWidth = inWindow ? 2 : 1;
      imgCtx.strokeRect(j * CELL + 0.5, i * CELL + 0.5, CELL - 1, CELL - 1);

      // 숫자 표시
      imgCtx.fillStyle = v > 140 ? '#111' : '#e0e0e0';
      imgCtx.font = '10px monospace';
      imgCtx.textAlign = 'center';
      imgCtx.textBaseline = 'middle';
      imgCtx.fillText(v, j * CELL + CELL / 2, i * CELL + CELL / 2);
    }
  }
}

function renderFeatureMap() {
  if (!featCtx) return;
  var kernel = getCurrentKernel();
  var dims = convDemoOutputDims();
  var full = convolve2D(convDemoState.image, kernel);

  // 정규화(0~255)해서 시각화 (계산식 표시에는 raw 값을 별도로 씀)
  var flat = [];
  for (var i = 0; i < full.length; i++) flat = flat.concat(full[i]);
  var minV = Math.min.apply(null, flat);
  var maxV = Math.max.apply(null, flat);
  var range = (maxV - minV) || 1;

  featCtx.clearRect(0, 0, featCanvas.width, featCanvas.height);
  var pos = convDemoState.pos;

  for (var r = 0; r < dims.h; r++) {
    for (var c = 0; c < dims.w; c++) {
      var raw = full[r][c];
      var norm = Math.round(((raw - minV) / range) * 255);
      featCtx.fillStyle = 'rgb(' + norm + ',' + norm + ',' + norm + ')';
      featCtx.fillRect(c * CELL, r * CELL, CELL, CELL);

      var isCurrent = (r === pos.row && c === pos.col);
      featCtx.strokeStyle = isCurrent ? '#ffd43b' : 'rgba(42,42,74,0.6)';
      featCtx.lineWidth = isCurrent ? 2 : 1;
      featCtx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1);
    }
  }
}

function renderDotProductText() {
  var el = document.getElementById('dotproduct-text');
  if (!el) return;
  var kernel = getCurrentKernel();
  var pos = convDemoState.pos;
  var result = dotProductAt(convDemoState.image, kernel, pos.row, pos.col);

  var lines = result.terms.map(function (t) {
    var kValStr = Number.isInteger(t.kVal) ? t.kVal : t.kVal.toFixed(3);
    return '(' + t.imgVal + ' × ' + kValStr + ')';
  });
  var formula = lines.join(' + ') + ' = ' + result.sum.toFixed(2);

  el.innerHTML =
    '<div class="dp-pos">위치 (row=' + pos.row + ', col=' + pos.col + ')</div>' +
    '<div class="dp-formula">' + formula + '</div>';
}

function renderKernelGrid() {
  var wrap = document.getElementById('kernel-grid');
  if (!wrap) return;
  wrap.innerHTML = '';
  var kernel = getCurrentKernel();
  var isCustom = convDemoState.kernelKey === 'custom';

  for (var i = 0; i < KERNEL_SIZE; i++) {
    for (var j = 0; j < KERNEL_SIZE; j++) {
      var input = document.createElement('input');
      input.type = 'number';
      input.step = '0.1';
      input.className = 'kernel-cell';
      input.value = Number.isInteger(kernel[i][j]) ? kernel[i][j] : kernel[i][j].toFixed(3);
      input.disabled = !isCustom;
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', onCustomKernelInput);
      wrap.appendChild(input);
    }
  }
}

function onCustomKernelInput(e) {
  if (!convDemoState.customKernel) {
    convDemoState.customKernel = KERNEL_PRESETS.custom.values.map(function (row) { return row.slice(); });
  }
  var r = parseInt(e.target.dataset.row, 10);
  var c = parseInt(e.target.dataset.col, 10);
  var v = parseFloat(e.target.value);
  if (isNaN(v)) v = 0;
  convDemoState.customKernel[r][c] = v;
  renderFeatureMap();
  renderDotProductText();
}

function renderConvDemoAll() {
  renderImageGrid();
  renderFeatureMap();
  renderDotProductText();
}

/* ---------- 슬라이딩 애니메이션 ---------- */

function advanceStep() {
  var dims = convDemoOutputDims();
  var pos = convDemoState.pos;
  pos.col++;
  if (pos.col >= dims.w) {
    pos.col = 0;
    pos.row++;
    if (pos.row >= dims.h) {
      pos.row = 0; // 처음으로 되돌아가 반복
    }
  }
  renderConvDemoAll();
}

function convDemoLoop(timestamp) {
  if (!convDemoState.playing) return;
  if (timestamp - convDemoState.lastStepTime >= convDemoState.speedMs) {
    advanceStep();
    convDemoState.lastStepTime = timestamp;
  }
  convDemoState.rafId = requestAnimationFrame(convDemoLoop);
}

function playConvDemo() {
  if (convDemoState.playing) return;
  convDemoState.playing = true;
  convDemoState.lastStepTime = 0;
  convDemoState.rafId = requestAnimationFrame(convDemoLoop);
  var playBtn = document.getElementById('btn-conv-play');
  var pauseBtn = document.getElementById('btn-conv-pause');
  if (playBtn) playBtn.disabled = true;
  if (pauseBtn) pauseBtn.disabled = false;
}

function pauseConvDemo() {
  convDemoState.playing = false;
  if (convDemoState.rafId) cancelAnimationFrame(convDemoState.rafId);
  var playBtn = document.getElementById('btn-conv-play');
  var pauseBtn = document.getElementById('btn-conv-pause');
  if (playBtn) playBtn.disabled = false;
  if (pauseBtn) pauseBtn.disabled = true;
}

function stepConvDemo() {
  pauseConvDemo();
  advanceStep();
}

function resetConvDemoPos() {
  pauseConvDemo();
  convDemoState.pos = { row: 0, col: 0 };
  renderConvDemoAll();
}

/* ---------- 이미지 셀 클릭 편집 ---------- */

function onImageCanvasClick(e) {
  var rect = imgCanvas.getBoundingClientRect();
  var scaleX = imgCanvas.width / rect.width;
  var scaleY = imgCanvas.height / rect.height;
  var x = (e.clientX - rect.left) * scaleX;
  var y = (e.clientY - rect.top) * scaleY;
  var col = Math.floor(x / CELL);
  var row = Math.floor(y / CELL);
  if (row < 0 || row >= IMG_SIZE || col < 0 || col >= IMG_SIZE) return;

  var cur = convDemoState.image[row][col];
  var next = (cur + 51) % 256; // 클릭할 때마다 밝기 단계적으로 증가(순환)
  convDemoState.image[row][col] = next;
  renderConvDemoAll();
}

function onImageCanvasContextMenu(e) {
  e.preventDefault();
  var rect = imgCanvas.getBoundingClientRect();
  var scaleX = imgCanvas.width / rect.width;
  var scaleY = imgCanvas.height / rect.height;
  var x = (e.clientX - rect.left) * scaleX;
  var y = (e.clientY - rect.top) * scaleY;
  var col = Math.floor(x / CELL);
  var row = Math.floor(y / CELL);
  if (row < 0 || row >= IMG_SIZE || col < 0 || col >= IMG_SIZE) return;

  var cur = convDemoState.image[row][col];
  var next = (cur - 51 + 256) % 256; // 우클릭: 밝기 감소
  convDemoState.image[row][col] = next;
  renderConvDemoAll();
}

/* ---------- 초기화 ---------- */

function initConvDemo() {
  convDemoState.image = makeDefaultImage();

  imgCanvas = document.getElementById('conv-image-canvas');
  featCanvas = document.getElementById('conv-feature-canvas');
  imgCtx = imgCanvas.getContext('2d');
  featCtx = featCanvas.getContext('2d');

  imgCanvas.width = IMG_SIZE * CELL;
  imgCanvas.height = IMG_SIZE * CELL;
  var dims = convDemoOutputDims();
  featCanvas.width = dims.w * CELL;
  featCanvas.height = dims.h * CELL;

  imgCanvas.addEventListener('click', onImageCanvasClick);
  imgCanvas.addEventListener('contextmenu', onImageCanvasContextMenu);

  var kernelSelect = document.getElementById('kernel-preset-select');
  kernelSelect.addEventListener('change', function () {
    convDemoState.kernelKey = kernelSelect.value;
    renderKernelGrid();
    renderConvDemoAll();
  });

  document.getElementById('btn-conv-play').addEventListener('click', playConvDemo);
  document.getElementById('btn-conv-pause').addEventListener('click', pauseConvDemo);
  document.getElementById('btn-conv-step').addEventListener('click', stepConvDemo);
  document.getElementById('btn-conv-reset').addEventListener('click', resetConvDemoPos);

  var speedSlider = document.getElementById('conv-speed-slider');
  if (speedSlider) {
    speedSlider.addEventListener('input', function () {
      // 슬라이더 값: 1(빠름)~10(느림) -> ms로 환산
      convDemoState.speedMs = parseInt(speedSlider.value, 10) * 100;
    });
  }

  renderKernelGrid();
  renderConvDemoAll();
}
