/* main.js — 섹션 간 네비게이션, 공통 이벤트 바인딩, 전체 조립 */

var NAV_SECTIONS = [
  { id: 'section-1', label: '1. convolution 슬라이딩' },
  { id: 'section-2', label: '2. hyperparameter' },
  { id: 'section-3', label: '3. parameter 수 비교' },
  { id: 'section-4', label: '4. 1×1 convolution' },
  { id: 'section-5', label: '5. 잔차연결' }
];

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
    var scrollPos = window.scrollY + 120;
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
  initConvDemo();
  initHyperparamExplorer();
  initParamCount();
  initBottleneckCalc();
  initResnetGradient();
});
