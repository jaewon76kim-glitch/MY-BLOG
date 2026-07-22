/* depletion-profile.js — 섹션 2: 공핍층 프로파일 ρ(x)/E(x)/φ(x)
 * 세 그래프 모두 같은 x축(공핍층 경계 -x_p ~ x_n)을 공유하며, semiconductor-math.js의
 * fieldAt()/potentialAt()을 그대로 사용해 계단접합 근사의 전기장·전위 분포를 그린다.
 */

var DP_COLORS = {
  rho: '#ff6b6b',
  rhoNeg: '#4fc3f7',
  field: '#ffd43b',
  potential: '#8be28b',
  axis: '#555577',
  grid: 'rgba(90, 90, 130, 0.25)'
};

function dpSetupCanvas(canvas, cssHeight) {
  var container = canvas.parentElement;
  var cssWidth = Math.max(container.clientWidth, 260);
  var dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return { ctx: ctx, width: cssWidth, height: cssHeight };
}

function dpDrawFrame(ctx, layout, xMin, xMax, yMin, yMax, xTicks, yLabel) {
  var left = layout.left, right = layout.right, top = layout.top, bottom = layout.bottom;

  // 배경 격자(0선 강조)
  ctx.save();
  ctx.strokeStyle = DP_COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top); ctx.lineTo(left, bottom);
  ctx.moveTo(left, bottom); ctx.lineTo(right, bottom);
  ctx.stroke();

  // y=0 기준선(전기장/전위가 음/양을 오갈 수 있는 경우)
  var y0 = dpMapY(0, yMin, yMax, top, bottom);
  ctx.strokeStyle = 'rgba(160,160,192,0.35)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(left, y0); ctx.lineTo(right, y0);
  ctx.stroke();
  ctx.setLineDash([]);

  // x=0 (야금학적 접합) 기준선
  var x0 = dpMapX(0, xMin, xMax, left, right);
  ctx.strokeStyle = 'rgba(160,160,192,0.35)';
  ctx.beginPath();
  ctx.moveTo(x0, top); ctx.lineTo(x0, bottom);
  ctx.stroke();
  ctx.restore();

  // 축 라벨
  ctx.save();
  ctx.fillStyle = '#a0a0c0';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  xTicks.forEach(function (t) {
    var px = dpMapX(t.x, xMin, xMax, left, right);
    ctx.fillText(t.label, px, bottom + 14);
  });
  ctx.textAlign = 'right';
  ctx.fillText(yLabel, left - 6, top + 8);
  ctx.restore();
}

function dpMapX(x, xMin, xMax, left, right) {
  var t = (x - xMin) / (xMax - xMin);
  return left + t * (right - left);
}
function dpMapY(y, yMin, yMax, top, bottom) {
  var t = (y - yMin) / (yMax - yMin);
  return bottom - t * (bottom - top);
}

function dpRenderRho(calc, xMin, xMax) {
  var canvas = document.getElementById('dp-rho-canvas');
  var setup = dpSetupCanvas(canvas, 130);
  var ctx = setup.ctx;
  var layout = { left: 54, right: setup.width - 14, top: 12, bottom: setup.height - 22 };

  var rhoP = -Q * calc.NA; // p측 이온화된 억셉터: 음전하
  var rhoN = Q * calc.ND;  // n측 이온화된 도너: 양전하
  var maxAbs = Math.max(Math.abs(rhoP), Math.abs(rhoN)) * 1.15 || 1;

  dpDrawFrame(ctx, layout, xMin, xMax, -maxAbs, maxAbs,
    [{ x: -calc.xp, label: '-x_p' }, { x: 0, label: '0' }, { x: calc.xn, label: 'x_n' }],
    'ρ(x)');

  ctx.save();
  ctx.fillStyle = DP_COLORS.rhoNeg;
  if (calc.xp > 0) {
    var x1 = dpMapX(-calc.xp, xMin, xMax, layout.left, layout.right);
    var x2 = dpMapX(0, xMin, xMax, layout.left, layout.right);
    var y0 = dpMapY(0, -maxAbs, maxAbs, layout.top, layout.bottom);
    var yv = dpMapY(rhoP, -maxAbs, maxAbs, layout.top, layout.bottom);
    ctx.fillRect(x1, yv, x2 - x1, y0 - yv);
  }
  ctx.fillStyle = DP_COLORS.rho;
  if (calc.xn > 0) {
    var x3 = dpMapX(0, xMin, xMax, layout.left, layout.right);
    var x4 = dpMapX(calc.xn, xMin, xMax, layout.left, layout.right);
    var y0b = dpMapY(0, -maxAbs, maxAbs, layout.top, layout.bottom);
    var yv2 = dpMapY(rhoN, -maxAbs, maxAbs, layout.top, layout.bottom);
    ctx.fillRect(x3, yv2, x4 - x3, y0b - yv2);
  }
  ctx.restore();
}

function dpRenderField(calc, xMin, xMax) {
  var canvas = document.getElementById('dp-field-canvas');
  var setup = dpSetupCanvas(canvas, 130);
  var ctx = setup.ctx;
  var layout = { left: 54, right: setup.width - 14, top: 12, bottom: setup.height - 22 };

  var Emax = calc.Emax;
  var yMin = -Emax * 1.15 || -1, yMax = Emax * 0.15 + 1e-3;

  dpDrawFrame(ctx, layout, xMin, xMax, yMin, yMax,
    [{ x: -calc.xp, label: '-x_p' }, { x: 0, label: '0' }, { x: calc.xn, label: 'x_n' }],
    'E(x)');

  var pts = [];
  var steps = 120;
  for (var i = 0; i <= steps; i++) {
    var x = xMin + (xMax - xMin) * i / steps;
    var e = fieldAt(x, calc.NA, calc.ND, calc.xp, calc.xn);
    pts.push({ x: dpMapX(x, xMin, xMax, layout.left, layout.right), y: dpMapY(e, yMin, yMax, layout.top, layout.bottom) });
  }
  ctx.save();
  ctx.strokeStyle = DP_COLORS.field;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.restore();
}

function dpRenderPotential(calc, xMin, xMax) {
  var canvas = document.getElementById('dp-potential-canvas');
  var setup = dpSetupCanvas(canvas, 130);
  var ctx = setup.ctx;
  var layout = { left: 54, right: setup.width - 14, top: 12, bottom: setup.height - 22 };

  var phiMax = calc.vbi - calc.V;
  if (phiMax <= 0) phiMax = 1e-6;
  var yMin = -phiMax * 0.15, yMax = phiMax * 1.15;

  dpDrawFrame(ctx, layout, xMin, xMax, yMin, yMax,
    [{ x: -calc.xp, label: '-x_p' }, { x: 0, label: '0' }, { x: calc.xn, label: 'x_n' }],
    'φ(x)');

  var pts = [];
  var steps = 120;
  for (var i = 0; i <= steps; i++) {
    var x = xMin + (xMax - xMin) * i / steps;
    var phi;
    if (x < -calc.xp) phi = 0;
    else if (x > calc.xn) phi = phiMax;
    else phi = potentialAt(x, calc.NA, calc.ND, calc.xp, calc.xn);
    pts.push({ x: dpMapX(x, xMin, xMax, layout.left, layout.right), y: dpMapY(phi, yMin, yMax, layout.top, layout.bottom) });
  }
  ctx.save();
  ctx.strokeStyle = DP_COLORS.potential;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.restore();
}

function dpRender(calc) {
  var W = calc.W, xp = calc.xp, xn = calc.xn;
  var margin = Math.max(W * 0.3, 1e-8);
  var xMin, xMax;
  if (W <= 0) { xMin = -1e-7; xMax = 1e-7; }
  else { xMin = -xp - margin; xMax = xn + margin; }

  dpRenderRho(calc, xMin, xMax);
  dpRenderField(calc, xMin, xMax);
  dpRenderPotential(calc, xMin, xMax);

  document.getElementById('dp-w-val').textContent = formatLength(W);
  document.getElementById('dp-xp-val').textContent = formatLength(xp);
  document.getElementById('dp-xn-val').textContent = formatLength(xn);
  document.getElementById('dp-emax-val').textContent = formatField(calc.Emax);

  var note = document.getElementById('dp-note-text');
  if (note) {
    var ratio = xp > 0 ? (xn / xp) : Infinity;
    var neutralCheck = Math.abs(calc.NA * xp - calc.ND * xn);
    note.innerHTML = 'N_A·x_p ≈ N_D·x_n 검산: ' + sciNotation(calc.NA * xp, 3) + ' cm⁻² vs ' +
      sciNotation(calc.ND * xn, 3) + ' cm⁻² (전기적 중성 조건). x_n/x_p ≈ ' +
      (isFinite(ratio) ? ratio.toFixed(2) : '∞') + '.';
  }
}

function initDepletionProfile() {
  // 초기 렌더는 main.js의 전체 렌더 사이클에서 수행된다.
}
