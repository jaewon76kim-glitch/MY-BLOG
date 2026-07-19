// renderer.js - 궤도 평면 canvas 2D 렌더링 (전역 변수 방식)

var KeplerRenderer = (function () {
  'use strict';

  var canvas, ctx, W, H;

  // 면적속도 부채꼴을 그리기 위한 최근 궤적 샘플(초점 기준 평면좌표, m)
  var sectorPoints = [];

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    W = canvas.offsetWidth || 400;
    H = canvas.offsetHeight || 360;
    canvas.width = W;
    canvas.height = H;
  }

  // 캔버스에 궤도 전체(원지점까지)가 여백을 두고 들어오도록 스케일(px/m) 계산
  function computeScale(a_m, e) {
    var rApo = KeplerOrbit.rApogee(a_m, e);
    var avail = Math.min(W, H) / 2 * 0.82;
    return avail / rApo;
  }

  // 궤도 평면 좌표(m) → 캔버스 픽셀 좌표 (y축 반전: 위가 +y)
  function toScreen(x_m, y_m, scale, cx, cy) {
    return { x: cx + x_m * scale, y: cy - y_m * scale };
  }

  function drawBackground() {
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, W, H);

    var stars = [
      [0.06, 0.08], [0.18, 0.15], [0.31, 0.05], [0.44, 0.22], [0.58, 0.09],
      [0.72, 0.18], [0.85, 0.06], [0.93, 0.28], [0.12, 0.35], [0.4, 0.38],
      [0.65, 0.4], [0.88, 0.44], [0.22, 0.55], [0.5, 0.6], [0.78, 0.58],
      [0.09, 0.7], [0.35, 0.78], [0.6, 0.75], [0.82, 0.82], [0.95, 0.65]
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    stars.forEach(function (s) {
      ctx.beginPath();
      ctx.arc(s[0] * W, s[1] * H, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawEllipse(a_m, e, scale, cx, cy) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    var steps = 180;
    for (var i = 0; i <= steps; i++) {
      var nu = (i / steps) * 2 * Math.PI;
      var r = KeplerOrbit.radiusAtNu(a_m, e, nu);
      var x = r * Math.cos(nu);
      var y = r * Math.sin(nu);
      var p = toScreen(x, y, scale, cx, cy);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawEarth(scale, cx, cy) {
    var rE_m = KeplerOrbit.R_E_KM * 1000;
    var rPix = rE_m * scale;
    if (rPix < 5) rPix = 5; // 최소 가시 크기 보장(MEO/GEO에서는 실제 축척보다 크게 표시됨)

    var grad = ctx.createRadialGradient(cx - rPix * 0.3, cy - rPix * 0.3, rPix * 0.1, cx, cy, rPix);
    grad.addColorStop(0, '#7aa5e8');
    grad.addColorStop(1, '#4a7fd6');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rPix, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawMarkers(a_m, e, scale, cx, cy) {
    var rp = KeplerOrbit.rPerigee(a_m, e);
    var pp = toScreen(rp, 0, scale, cx, cy);
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('근지점', pp.x, pp.y + 16);

    var ra = KeplerOrbit.rApogee(a_m, e);
    var pa = toScreen(-ra, 0, scale, cx, cy);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(pa.x, pa.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('원지점', pa.x, pa.y + 16);
  }

  // 최근 windowSec 동안 쓸고 지나간 면적(부채꼴) 하이라이트
  // — 같은 시간 간격이면 근지점 근처(좁은 각/큰 반지름 변화 없음)나 원지점 근처(넓은 각) 모두
  //   면적이 항상 같다는 케플러 제2법칙을 시각적으로 보여준다.
  function drawSector(scale, cx, cy) {
    if (sectorPoints.length < 2) return;
    ctx.fillStyle = 'rgba(79, 195, 247, 0.25)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (var i = 0; i < sectorPoints.length; i++) {
      var p = toScreen(sectorPoints[i].x, sectorPoints[i].y, scale, cx, cy);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawSatellite(scale, cx, cy, x_m, y_m) {
    var p = toScreen(x_m, y_m, scale, cx, cy);
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff8d0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 최근 궤적 샘플 push. windowSec보다 오래된 샘플은 제거.
  function pushSectorPoint(x_m, y_m, tSim, windowSec) {
    sectorPoints.push({ x: x_m, y: y_m, t: tSim });
    while (sectorPoints.length && (tSim - sectorPoints[0].t) > windowSec) {
      sectorPoints.shift();
    }
  }

  function resetSector() {
    sectorPoints = [];
  }

  function draw(a_m, e, satState) {
    if (!ctx) return;
    var cx = W / 2;
    var cy = H / 2;
    var scale = computeScale(a_m, e);

    drawBackground();
    drawEllipse(a_m, e, scale, cx, cy);
    drawSector(scale, cx, cy);
    drawEarth(scale, cx, cy);
    drawMarkers(a_m, e, scale, cx, cy);
    drawSatellite(scale, cx, cy, satState.x, satState.y);
  }

  return {
    init: init,
    resize: resize,
    draw: draw,
    pushSectorPoint: pushSectorPoint,
    resetSector: resetSector
  };
})();
