// renderer.js - Canvas 애니메이션 (전역 변수 방식)

var DopplerRenderer = (function () {
  var canvas, ctx;
  var W, H;

  // 위성 위치 기록 (궤적 잔상)
  var trailPoints = [];
  var MAX_TRAIL = 100;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    W = canvas.offsetWidth || 400;
    H = canvas.offsetHeight || 220;
    canvas.width = W;
    canvas.height = H;
  }

  // 앙각 → 캔버스 Y 좌표 변환 (El_rad >= 0)
  // El=0 → 지평선 (H * 0.72)
  // El=90° → 천정 (H * 0.08)
  function elToY(El_rad) {
    var horizY = H * 0.72;
    var zenithY = H * 0.10;
    var frac = El_rad / (Math.PI / 2); // 0~1 (El: 0~90°)
    if (frac > 1) frac = 1;
    if (frac < 0) frac = 0;
    return horizY - frac * (horizY - zenithY);
  }

  // 통과 진행도 t → X 위치 (0=왼쪽 지평선, 0.5=중앙 천정, 1=오른쪽 지평선)
  function tToX(t) {
    var marginL = W * 0.08;
    var marginR = W * 0.08;
    return marginL + t * (W - marginL - marginR);
  }

  function drawBackground() {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#020210');
    grad.addColorStop(0.45, '#080820');
    grad.addColorStop(0.72, '#0d1b4b');
    grad.addColorStop(0.72, '#1a3a1a');
    grad.addColorStop(1, '#0e1e0e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 별 [x, y, alpha] — alpha 고정으로 매 프레임 깜빡임 방지
    var stars = [
      [0.05,0.05,0.55],[0.15,0.12,0.40],[0.28,0.03,0.60],[0.4,0.08,0.45],
      [0.55,0.04,0.50],[0.65,0.14,0.35],[0.75,0.07,0.55],[0.88,0.02,0.50],
      [0.93,0.11,0.40],[0.1,0.2,0.35],[0.35,0.18,0.50],[0.6,0.22,0.45],
      [0.82,0.19,0.40],[0.48,0.25,0.55],[0.2,0.3,0.35],[0.72,0.28,0.45],
      [0.03,0.35,0.50],[0.97,0.32,0.40],[0.42,0.38,0.35],[0.58,0.42,0.45]
    ];
    stars.forEach(function (s) {
      if (s[1] < 0.7) {
        ctx.fillStyle = 'rgba(255,255,255,' + s[2] + ')';
        ctx.beginPath();
        ctx.arc(s[0] * W, s[1] * H, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawHorizon() {
    var horizY = H * 0.72;
    ctx.strokeStyle = '#4a8a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizY);
    ctx.lineTo(W, horizY);
    ctx.stroke();

    // 지상국 삼각형 (지평선 중앙)
    var cx = W / 2;
    var triH = 18;
    var triW = 14;
    ctx.fillStyle = '#4fc3f7';
    ctx.strokeStyle = '#a0d8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, horizY - triH);
    ctx.lineTo(cx - triW / 2, horizY + 4);
    ctx.lineTo(cx + triW / 2, horizY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#a0d8f0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GS', cx, horizY + 18);

    // 지평선 라벨
    ctx.fillStyle = 'rgba(160,160,192,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('지평선 0°', 6, horizY - 4);
  }

  // 위성 궤적 호(arc) 미리 그리기 (El_max에 따른 호)
  // El(t) = El_max * sin(π*t), t∈[0,1]
  function drawOrbitArc(El_max_deg) {
    var steps = 80;
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    var started = false;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var El_rad = (El_max_deg * Math.PI / 180) * Math.sin(Math.PI * t);
      var x = tToX(t);
      var y = elToY(El_rad);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 천정 표시
    var zenithY = elToY(El_max_deg * Math.PI / 180);
    ctx.fillStyle = 'rgba(79,195,247,0.4)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(El_max_deg + '°', W / 2, zenithY - 8);
  }

  function drawTrail() {
    if (trailPoints.length < 2) return;
    for (var i = 1; i < trailPoints.length; i++) {
      var alpha = (i / trailPoints.length) * 0.6;
      ctx.strokeStyle = 'rgba(79, 195, 247, ' + alpha + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
      ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
      ctx.stroke();
    }
  }

  function drawSatellite(x, y, visible) {
    if (!visible) return;

    ctx.save();
    ctx.translate(x, y);

    // 태양광 패널 왼쪽
    ctx.fillStyle = '#2a5f8f';
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1;
    ctx.fillRect(-20, -4, 12, 8);
    ctx.strokeRect(-20, -4, 12, 8);
    ctx.beginPath();
    ctx.moveTo(-20, 0); ctx.lineTo(-8, 0);
    ctx.stroke();

    // 태양광 패널 오른쪽
    ctx.fillRect(8, -4, 12, 8);
    ctx.strokeRect(8, -4, 12, 8);
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(20, 0);
    ctx.stroke();

    // 본체
    ctx.fillStyle = '#c0c0d0';
    ctx.strokeStyle = '#e0e0f0';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-7, -6, 14, 12);
    ctx.strokeRect(-7, -6, 14, 12);

    // 안테나
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, -14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -14, 3, Math.PI, 2 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  function drawOverlay(El_deg, R_km) {
    var pad = 10;
    var boxW = 165;
    var boxH = 52;
    var bx = W - boxW - pad;
    var by = pad;

    ctx.fillStyle = 'rgba(10, 10, 40, 0.78)';
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeRect(bx, by, boxW, boxH);
    }

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('El: ' + El_deg.toFixed(1) + '°', bx + 10, by + 18);
    ctx.fillText('R:  ' + R_km.toFixed(0) + ' km', bx + 10, by + 36);
  }

  // 시선 방향 선 (지상국 → 위성)
  function drawLOS(satX, satY, visible) {
    if (!visible) return;
    var gx = W / 2;
    var gy = H * 0.72;
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(satX, satY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function draw(simResult, El_max_deg) {
    if (!ctx) return;

    drawBackground();
    drawOrbitArc(El_max_deg);
    drawHorizon();

    var t = simResult.t;
    var El_rad = simResult.El_rad;
    var visible = simResult.visible;

    var satX = tToX(t);
    var satY = visible ? elToY(El_rad) : H * 0.78;

    // 잔상 추가
    if (visible) {
      trailPoints.push({ x: satX, y: satY });
      if (trailPoints.length > MAX_TRAIL) trailPoints.shift();
    }
    drawTrail();

    drawLOS(satX, satY, visible);
    drawSatellite(satX, satY, visible);

    drawOverlay(simResult.El_deg, simResult.R_km);
  }

  function resetTrail() {
    trailPoints = [];
  }

  function drawIdle(El_max_deg) {
    if (!ctx) return;
    resize();
    drawBackground();
    drawOrbitArc(El_max_deg || 90);
    drawHorizon();

    // 초기 위치: 왼쪽 지평선에 위성 표시
    var satX = tToX(0);
    var satY = elToY(0);
    drawSatellite(satX, satY, true);
  }

  return {
    init: init,
    resize: resize,
    draw: draw,
    drawIdle: drawIdle,
    resetTrail: resetTrail
  };
})();
