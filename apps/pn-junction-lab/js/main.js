/* main.js — 컨트롤 패널 바인딩, 섹션 간 값 동기화, 네비게이션, 전체 조립 */

var NAV_SECTIONS = [
  { id: 'section-1', label: '1. 에너지밴드' },
  { id: 'section-2', label: '2. 공핍층 프로파일' },
  { id: 'section-3', label: '3. I-V 곡선' },
  { id: 'section-4', label: '4. 도핑 프리셋' }
];

var appState = {
  NA_exp: 17,   // N_A = 10^17 cm^-3
  ND_exp: 15,   // N_D = 10^15 cm^-3
  T: 300,       // K
  V: 0,         // V
  A_exp: -4     // A = 10^-4 cm^2
};

function getState() {
  return {
    NA: Math.pow(10, appState.NA_exp),
    ND: Math.pow(10, appState.ND_exp),
    T: appState.T,
    V: appState.V,
    A: Math.pow(10, appState.A_exp)
  };
}

function getCurrentCalc() {
  var s = getState();
  return computeJunction(s.NA, s.ND, s.T, s.V, s.A);
}

function applyDopingPreset(NA, ND) {
  appState.NA_exp = Math.log10(NA);
  appState.ND_exp = Math.log10(ND);
  document.getElementById('na-slider').value = appState.NA_exp;
  document.getElementById('nd-slider').value = appState.ND_exp;
  renderAll();
}

function updateControlDisplays(calc) {
  document.getElementById('na-val').textContent = formatConcentration(calc.NA);
  document.getElementById('nd-val').textContent = formatConcentration(calc.ND);
  document.getElementById('t-val').textContent = calc.T.toFixed(0);
  document.getElementById('v-val').textContent = calc.V.toFixed(3);
  document.getElementById('a-val').textContent = sciNotation(calc.A, 2) + ' cm²';

  document.getElementById('summary-ni').textContent = formatConcentration(calc.ni);
  document.getElementById('summary-vbi').textContent = calc.vbi.toFixed(4) + ' V';
  document.getElementById('summary-vt').textContent = (calc.thermalV * 1000).toFixed(2) + ' mV';
}

function renderAll() {
  var calc = getCurrentCalc();
  updateControlDisplays(calc);
  bdRender(calc);
  dpRender(calc);
  ivRender(calc);
  presetsRenderTable(calc.T, calc.A);
}

function debounce(fn, wait) {
  var timer = null;
  return function () {
    var args = arguments, ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
  };
}

function bindControls() {
  document.getElementById('na-slider').addEventListener('input', function () {
    appState.NA_exp = parseFloat(this.value);
    renderAll();
  });
  document.getElementById('nd-slider').addEventListener('input', function () {
    appState.ND_exp = parseFloat(this.value);
    renderAll();
  });
  document.getElementById('t-slider').addEventListener('input', function () {
    appState.T = parseFloat(this.value);
    renderAll();
  });
  document.getElementById('v-slider').addEventListener('input', function () {
    appState.V = parseFloat(this.value);
    renderAll();
  });
  document.getElementById('a-slider').addEventListener('input', function () {
    appState.A_exp = parseFloat(this.value);
    renderAll();
  });
}

function bindPanelToggle() {
  var btn = document.getElementById('panel-toggle-btn');
  var body = document.getElementById('control-panel-body');
  btn.addEventListener('click', function () {
    var collapsed = body.classList.toggle('cp-collapsed');
    btn.textContent = collapsed ? '패널 펼치기' : '패널 접기';
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
}

function initNav() {
  var navBar = document.getElementById('nav-tabs');
  var navSelect = document.getElementById('nav-select');

  NAV_SECTIONS.forEach(function (s) {
    var a = document.createElement('a');
    a.href = '#' + s.id;
    a.className = 'nav-tab';
    a.textContent = s.label;
    a.dataset.target = s.id;
    navBar.appendChild(a);

    var opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    navSelect.appendChild(opt);
  });

  navSelect.addEventListener('change', function () {
    var target = document.getElementById(navSelect.value);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });

  var tabs = navBar.querySelectorAll('.nav-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.getElementById(tab.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  function updateActiveNav() {
    var scrollPos = window.scrollY + 160;
    var current = NAV_SECTIONS[0].id;
    NAV_SECTIONS.forEach(function (s) {
      var el = document.getElementById(s.id);
      if (el && el.offsetTop <= scrollPos) current = s.id;
    });
    tabs.forEach(function (tab) {
      tab.classList.toggle('nav-tab-active', tab.dataset.target === current);
    });
    if (navSelect.value !== current) navSelect.value = current;
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();
}

document.addEventListener('DOMContentLoaded', function () {
  initNav();
  bindControls();
  bindPanelToggle();
  initBandDiagram();
  initDepletionProfile();
  initIvCurve();
  initPresets();
  renderAll();

  window.addEventListener('resize', debounce(renderAll, 150));
});
