/* presets.js — 섹션 4: 도핑 프리셋 정의 및 적용
 * 클릭 시 컨트롤 패널의 N_A/N_D 슬라이더 값을 바꾸고 전체(섹션 1~3)를 재렌더링한다.
 * 비교표는 항상 "현재 T, A, V=0(무바이어스)" 기준으로 3개 프리셋을 나란히 계산한다.
 */

var DOPING_PRESETS = [
  { id: 'sym', name: '대칭 접합', NA: 1e17, ND: 1e17, desc: 'N_A = N_D = 10¹⁷' },
  { id: 'asym', name: '비대칭 p+n 접합', NA: 1e18, ND: 1e15, desc: 'N_A ≫ N_D (실제 정류 다이오드 구조)' },
  { id: 'low', name: '저농도 접합', NA: 1e15, ND: 1e15, desc: 'N_A = N_D = 10¹⁵' }
];

function presetsBuildButtons() {
  var wrap = document.getElementById('preset-btns');
  if (!wrap) return;
  wrap.innerHTML = '';
  DOPING_PRESETS.forEach(function (p) {
    var btn = document.createElement('button');
    btn.className = 'ctrl-btn';
    btn.id = 'preset-btn-' + p.id;
    btn.textContent = p.name + ' (' + p.desc + ')';
    btn.addEventListener('click', function () {
      applyDopingPreset(p.NA, p.ND);
    });
    wrap.appendChild(btn);
  });
}

function presetsRenderTable(T, A) {
  var tbody = document.getElementById('preset-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  DOPING_PRESETS.forEach(function (p) {
    var c = computeJunction(p.NA, p.ND, T, 0, A); // V=0 무바이어스 기준
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + p.name + '</td>' +
      '<td>' + formatConcentration(p.NA) + '</td>' +
      '<td>' + formatConcentration(p.ND) + '</td>' +
      '<td>' + c.vbi.toFixed(4) + ' V</td>' +
      '<td>' + formatLength(c.W) + '</td>' +
      '<td>' + formatLength(c.xp) + ' / ' + formatLength(c.xn) + '</td>' +
      '<td>' + formatCurrent(c.I0) + '</td>';
    tbody.appendChild(tr);
  });
}

function initPresets() {
  presetsBuildButtons();
}
