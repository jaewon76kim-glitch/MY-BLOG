// groundtrack.js - 지상궤적(ground track) 세계지도 뷰 (선택 기능)
//
// 승교점적경=0, 근지점인수=0으로 단순화한 위경도 계산 (지침서 공식):
//   위도  φ = asin(sin(i) * sin(u))
//   경도  λ = atan2(cos(i)*sin(u), cos(u)) - ω_earth * t
// 외부 지도 이미지/라이브러리 없이 위경도 격자선만으로 최소 구현한다.

var KeplerGroundTrack = (function () {
  'use strict';

  var canvas, ctx, W, H;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    W = canvas.offsetWidth || 400;
    H = canvas.offsetHeight || 200;
    canvas.width = W;
    canvas.height = H;
  }

  // 경도[-180,180] 위도[-90,90] (도) → 캔버스 픽셀
  function lonLatToXY(lonDeg, latDeg) {
    var x = (lonDeg + 180) / 360 * W;
    var y = (90 - latDeg) / 180 * H;
    return { x: x, y: y };
  }

  function drawBackground() {
    ctx.fillStyle = '#080816';
    ctx.fillRect(0, 0, W, H);
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(224, 224, 224, 0.14)';
    ctx.lineWidth = 1;

    // 위도선 15도 간격
    for (var lat = -90; lat <= 90; lat += 15) {
      var p1 = lonLatToXY(-180, lat);
      var p2 = lonLatToXY(180, lat);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p1.y);
      ctx.stroke();
    }
    // 경도선 30도 간격
    for (var lon = -180; lon <= 180; lon += 30) {
      var q1 = lonLatToXY(lon, -90);
      var q2 = lonLatToXY(lon, 90);
      ctx.beginPath();
      ctx.moveTo(q1.x, q1.y);
      ctx.lineTo(q1.x, q2.y);
      ctx.stroke();
    }

    // 적도, 본초자오선 강조
    ctx.strokeStyle = 'rgba(224, 224, 224, 0.35)';
    var eq1 = lonLatToXY(-180, 0), eq2 = lonLatToXY(180, 0);
    ctx.beginPath();
    ctx.moveTo(eq1.x, eq1.y);
    ctx.lineTo(eq2.x, eq1.y);
    ctx.stroke();

    var pm1 = lonLatToXY(0, -90), pm2 = lonLatToXY(0, 90);
    ctx.beginPath();
    ctx.moveTo(pm1.x, pm1.y);
    ctx.lineTo(pm1.x, pm2.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(224, 224, 224, 0.25)';
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }

  // 경도가 -180/180 경계를 넘나드는 지점은 선을 끊어서 그림(가로로 화면을 가로지르는 선 방지)
  function drawTrack(points) {
    if (points.length < 2) return;
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    var started = false;
    var prev = null;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var xy = lonLatToXY(p.lon, p.lat);
      if (prev && Math.abs(p.lon - prev.lon) > 180) {
        started = false; // 경도 wrap 지점에서 선 끊기
      }
      if (!started) {
        ctx.moveTo(xy.x, xy.y);
        started = true;
      } else {
        ctx.lineTo(xy.x, xy.y);
      }
      prev = p;
    }
    ctx.stroke();
  }

  function drawSatMarker(sat) {
    var xy = lonLatToXY(sat.lon, sat.lat);
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.arc(xy.x, xy.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff8d0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function draw(trackPoints, sat) {
    if (!ctx) return;
    drawBackground();
    drawGrid();
    drawTrack(trackPoints);
    if (sat) drawSatMarker(sat);
  }

  return {
    init: init,
    resize: resize,
    draw: draw
  };
})();
