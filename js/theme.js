// 깜빡임 방지: <head>에서 즉시 실행
(function () {
  const saved = localStorage.getItem('blog-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  // 기본은 항상 네온 블랙(dark) — media query와 무관하게
})();

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('theme-toggle');
  const label = document.getElementById('toggle-label');
  if (!btn) return;

  function sync() {
    const isDim = document.documentElement.getAttribute('data-theme') === 'light';
    if (label) label.textContent = isDim ? 'BRIGHT' : 'DIM';
  }

  sync();

  btn.addEventListener('click', function () {
    const isDim = document.documentElement.getAttribute('data-theme') === 'light';
    const next = isDim ? null : 'light';
    if (next) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('blog-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('blog-theme');
    }
    sync();
  });
});
