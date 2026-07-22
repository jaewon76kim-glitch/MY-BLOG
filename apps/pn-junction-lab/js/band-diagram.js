/* band-diagram.js — 섹션 1: 에너지밴드 다이어그램
 * 접합 전(같은 실리콘이므로 진공 기준 E_c/E_v/E_i가 두 영역에서 동일, E_F 위치만 다름)과
 * 접합 후(단일 E_F로 정렬되며 밴드가 e(V_bi-V)만큼 휘어짐)를 캔버스에 그린다.
 * 공핍층 내부의 밴드 휨 곡선은 semiconductor-math.js의 potentialAt()을 그대로 재사용해
 * 실제 전위 분포와 일치시킨다.
 */

var BD_COLORS = {
  ec: '#4fc3f7',   // 전도대 E_c
  ev: '#ff6b6b',   // 가전자대 E_v
  ei: '#a0a0c0',   // 진성준위 E_i (점선)
  ef: '#ffd43b',   // 페르미준위 E_F (굵은 점선)
  pRegion: 'rgba(255, 107, 107, 0.08)',
  nRegion: 'rgba(79, 195, 247, 0.08)',
  gap: 'rgba(160, 160, 192, 0.06)'
};

var bdMode = 'after'; // 'before' | 'after'

function bdBuildLegend() {
  var el = document.getElementById('bd-legend');
  if (!el) return;
  var items = [
    { color: BD_COLORS.ec, label: 'E_c (전도대 하단)' },
    { color: BD_COLORS.ev, label: 'E_v (가전자대 상단)' },
    { color: BD_COLORS.ei, label: 'E_i (진성준위)' },
    { color: BD_COLORS.ef, label: 'E_F (페르미준위)' }
  ];
  el.innerHTML = items.map(function (it) {
    return '<span class="bd-legend-item"><span class="bd-swatch" style="background:' + it.color +
      '"></span>' + it.label + '</span>';
  }).join('');
}

function bdMinMaxPadded(values) {
  var min = Math.min.apply(null, values);
  var max = Math.max.apply(null, values);
  var pad = (max - min) * 0.18 || 0.1;
  return { min: min - pad, max: max + pad };
}

function bdEnergyToY(e, yMin, yMax, top, bottom) {
  var t = (e - yMin) / (yMax - yMin);
  return bottom - t * (bottom - top);
}

function bdDrawDashedLine(ctx, x1, y1, x2, y2, color, width, dash) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function bdDrawCurve(ctx, points, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(function (p, i) {
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.restore();
}

function bdRender(calc) {
  var canvas = document.getElementById('bd-canvas');
  if (!canvas) return;
  var container = canvas.parentElement;
  var cssWidth = Math.max(container.clientWidth, 280);
  var cssHeight = 320;
  var dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  var padL = 46, padR = 16, padT = 16, padB = 30;
  var top = padT, bottom = cssHeight - padB;
  var left = padL, right = cssWidth - padR;

  var NA = calc.NA, ND = calc.ND, T = calc.T, V = calc.V;
  var ecEi = ecMinusEi(T);
  var eiEv = eiMinusEv(T);
  var efN = efMinusEiN(ND, T);   // E_Fn - E_i (n형, 진성준위 위)
  var efP = eiMinusEfP(NA, T);   // E_i - E_Fp (p형, 진성준위 아래)

  var EcP = ecEi, EvP = -eiEv, EiP = 0, EFp = -efP;
  var EcNlocal = ecEi, EvNlocal = -eiEv, EFnLocal = efN;

  if (bdMode === 'before') {
    var vals = [EcP, EvP, EiP, EFp, EFnLocal];
    var range = bdMinMaxPadded(vals);
    var gapPx = Math.min(60, (right - left) * 0.12);
    var midL = left + (right - left - gapPx) / 2;
    var midR = midL + gapPx;

    // 영역 배경
    ctx.fillStyle = BD_COLORS.pRegion;
    ctx.fillRect(left, top, midL - left, bottom - top);
    ctx.fillStyle = BD_COLORS.nRegion;
    ctx.fillRect(midR, top, right - midR, bottom - top);

    function y(e) { return bdEnergyToY(e, range.min, range.max, top, bottom); }

    // p측 (왼쪽 블록): Ec, Ev 동일값, Ei 점선, EFp 노란 점선
    bdDrawDashedLine(ctx, left, y(EcP), midL, y(EcP), BD_COLORS.ec, 3);
    bdDrawDashedLine(ctx, left, y(EvP), midL, y(EvP), BD_COLORS.ev, 3);
    bdDrawDashedLine(ctx, left, y(EiP), midL, y(EiP), BD_COLORS.ei, 1.5, [4, 3]);
    bdDrawDashedLine(ctx, left, y(EFp), midL, y(EFp), BD_COLORS.ef, 2, [7, 4]);

    // n측 (오른쪽 블록): 같은 Ec/Ev/Ei(진공기준 동일), EFn은 다른 높이
    bdDrawDashedLine(ctx, midR, y(EcNlocal), right, y(EcNlocal), BD_COLORS.ec, 3);
    bdDrawDashedLine(ctx, midR, y(EvNlocal), right, y(EvNlocal), BD_COLORS.ev, 3);
    bdDrawDashedLine(ctx, midR, y(EiP), right, y(EiP), BD_COLORS.ei, 1.5, [4, 3]);
    bdDrawDashedLine(ctx, midR, y(EFnLocal), right, y(EFnLocal), BD_COLORS.ef, 2, [7, 4]);

    ctx.fillStyle = '#a0a0c0';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('p형 (분리 상태)', (left + midL) / 2, bottom + 18);
    ctx.fillText('n형 (분리 상태)', (midR + right) / 2, bottom + 18);

    var bendEl = document.getElementById('bd-bending-text');
    if (bendEl) {
      bendEl.innerHTML = '접합 전: 같은 실리콘이므로 진공 기준 E_c/E_v/E_i는 두 영역에서 동일합니다. ' +
        'E_F만 다릅니다 — p형은 E_i에서 <strong>' + efP.toFixed(4) + ' eV</strong> 아래, n형은 E_i에서 ' +
        '<strong>' + efN.toFixed(4) + ' eV</strong> 위. 접촉하면 이 차이(≈V_bi)만큼 밴드가 휩니다.';
    }
    bdDrawYAxisLabel(ctx, top, bottom);
    return;
  }

  // ===== 접합 후 =====
  var offset = calc.vbi - V; // e(V_bi - V) : p벌크 -> n벌크로의 전체 밴드 강하량
  var EcN = EcP - offset, EvN = EvP - offset, EiN = EiP - offset;
  var EFnBulk = EFnLocal - offset;

  var vals2 = [EcP, EvP, EFp, EcN, EvN, EFnBulk];
  var range2 = bdMinMaxPadded(vals2);
  function y2(e) { return bdEnergyToY(e, range2.min, range2.max, top, bottom); }

  // x축(픽셀) 배분: p벌크 | 공핍층(고정폭 시각화, xp:xn 비율 반영) | n벌크
  var bulkFrac = 0.28;
  var depW = right - left;
  var pBulkEnd = left + depW * bulkFrac;
  var nBulkStart = right - depW * bulkFrac;
  var W = calc.W, xp = calc.xp, xn = calc.xn;
  var xpFrac = (xp + xn) > 0 ? xp / (xp + xn) : 0.5;
  var junctionX = pBulkEnd + (nBulkStart - pBulkEnd) * xpFrac;

  // 영역 배경
  ctx.fillStyle = BD_COLORS.pRegion;
  ctx.fillRect(left, top, junctionX - left, bottom - top);
  ctx.fillStyle = BD_COLORS.nRegion;
  ctx.fillRect(junctionX, top, right - junctionX, bottom - top);

  // Ec, Ev 곡선: 벌크는 평평, 공핍층은 실제 potentialAt()으로 휘어짐
  function bendCurve(EbulkP, EbulkN) {
    var pts = [];
    pts.push({ x: left, y: y2(EbulkP) });
    pts.push({ x: pBulkEnd, y: y2(EbulkP) });
    var steps = 40;
    for (var i = 0; i <= steps; i++) {
      var frac = i / steps;
      var xPhys = -xp + frac * (xp + xn); // -xp ~ xn
      var phi = W > 0 ? potentialAt(xPhys, NA, ND, xp, xn) : offset * frac;
      var px = pBulkEnd + frac * (nBulkStart - pBulkEnd);
      pts.push({ x: px, y: y2(EbulkP - phi) });
    }
    pts.push({ x: nBulkStart, y: y2(EbulkN) });
    pts.push({ x: right, y: y2(EbulkN) });
    return pts;
  }

  bdDrawCurve(ctx, bendCurve(EcP, EcN), BD_COLORS.ec, 3);
  bdDrawCurve(ctx, bendCurve(EvP, EvN), BD_COLORS.ev, 3);
  bdDrawCurve(ctx, bendCurve(EiP, EiN), BD_COLORS.ei, 1.5);

  // 준페르미준위: p측(EFp, x<junction) / n측(EFnBulk, x>junction) 계단형
  bdDrawDashedLine(ctx, left, y2(EFp), junctionX, y2(EFp), BD_COLORS.ef, 2, [7, 4]);
  bdDrawDashedLine(ctx, junctionX, y2(EFnBulk), right, y2(EFnBulk), BD_COLORS.ef, 2, [7, 4]);
  if (Math.abs(EFp - EFnBulk) > 1e-6) {
    bdDrawDashedLine(ctx, junctionX, y2(EFp), junctionX, y2(EFnBulk), BD_COLORS.ef, 1.5, [2, 3]);
  }

  // 접합 경계선
  bdDrawDashedLine(ctx, junctionX, top, junctionX, bottom, '#555577', 1, [3, 3]);

  // 밴드 휨 화살표 (p측 벌크 E_c 대비 n측 벌크 E_c, 접합 위치에 세로로 표시)
  bdDrawBendArrow(ctx, junctionX, y2(EcP), y2(EcN), offset);

  ctx.fillStyle = '#a0a0c0';
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('p형 벌크', (left + pBulkEnd) / 2, bottom + 18);
  ctx.fillText('공핍층', junctionX, bottom + 18);
  ctx.fillText('n형 벌크', (nBulkStart + right) / 2, bottom + 18);

  bdDrawYAxisLabel(ctx, top, bottom);

  var bendEl2 = document.getElementById('bd-bending-text');
  if (bendEl2) {
    bendEl2.innerHTML = '접합 후 밴드 휨량 e(V_bi - V) = e(' + calc.vbi.toFixed(4) + ' - ' + V.toFixed(4) +
      ') = <strong>' + offset.toFixed(4) + ' eV</strong> (V_bi=' + calc.vbi.toFixed(4) + 'V, V=' + V.toFixed(4) + 'V)';
  }
}

function bdDrawBendArrow(ctx, x, yTop, yBottom, magnitude) {
  var arrowX = x + 34;
  ctx.save();
  ctx.strokeStyle = BD_COLORS.ef;
  ctx.fillStyle = BD_COLORS.ef;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(arrowX, yTop);
  ctx.lineTo(arrowX, yBottom);
  ctx.stroke();
  // 화살촉 (양끝)
  bdArrowHead(ctx, arrowX, yTop, -1);
  bdArrowHead(ctx, arrowX, yBottom, 1);
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('e(V_bi-V)=' + magnitude.toFixed(3) + 'eV', arrowX + 6, (yTop + yBottom) / 2);
  ctx.restore();
}

function bdArrowHead(ctx, x, y, dir) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 4, y - 6 * dir);
  ctx.lineTo(x + 4, y - 6 * dir);
  ctx.closePath();
  ctx.fill();
}

function bdDrawYAxisLabel(ctx, top, bottom) {
  ctx.save();
  ctx.fillStyle = '#a0a0c0';
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.translate(14, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('전자 에너지 (eV)', 0, 0);
  ctx.restore();
}

function initBandDiagram() {
  bdBuildLegend();
  document.getElementById('bd-before-btn').addEventListener('click', function () {
    bdMode = 'before';
    this.classList.add('primary');
    document.getElementById('bd-after-btn').classList.remove('primary');
    bdRender(getCurrentCalc());
  });
  document.getElementById('bd-after-btn').addEventListener('click', function () {
    bdMode = 'after';
    this.classList.add('primary');
    document.getElementById('bd-before-btn').classList.remove('primary');
    bdRender(getCurrentCalc());
  });
}
