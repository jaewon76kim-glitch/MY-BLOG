'use strict';

// doc/ 폴더 구조 기반 고정 카테고리 순서. '기타'는 이 목록에 없는 글이 있을 때만 맨 뒤에 자동 추가된다.
const CATEGORIES = [
  '위성통신', '머신러닝과_인공지능', 'OS', '해석역학과_장이론',
  '물리전자와_반도체공학', '무한과_극한', '독서', '소설', '유튜브_목록'
];

let allPosts = [];
let activeTags = new Set();
let activeCategory = null;
let searchQuery = '';

async function loadPosts() {
  const res = await fetch('posts/index.json');
  if (!res.ok) throw new Error('포스트 목록을 불러올 수 없습니다.');
  const posts = await res.json();
  // 날짜 역순 정렬
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function readingTime(wordCount) {
  const min = Math.max(1, Math.round(wordCount / 200));
  return `읽기 ${min}분`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function collectTags(posts) {
  const freq = {};
  posts.forEach(p => (p.tags || []).forEach(t => { freq[t] = (freq[t] || 0) + 1; }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

function collectCategories(posts, appCategories) {
  const used = new Set();
  posts.forEach(p => { if (p.category) used.add(p.category); });
  appCategories.forEach(c => used.add(c));

  const ordered = CATEGORIES.filter(c => used.has(c));
  used.forEach(c => { if (!ordered.includes(c) && c !== '기타') ordered.push(c); });
  if (used.has('기타')) ordered.push('기타');
  return ordered;
}

function renderCategoryFilter(categories) {
  const container = document.getElementById('category-filter');
  container.innerHTML = '';
  if (!categories.length) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'category-tab' + (activeCategory === null ? ' active' : '');
  allBtn.textContent = '전체';
  allBtn.addEventListener('click', () => {
    activeCategory = null;
    renderCategoryFilter(categories);
    renderPosts();
    filterApps();
  });
  container.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-tab' + (activeCategory === cat ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = (activeCategory === cat) ? null : cat;
      renderCategoryFilter(categories);
      renderPosts();
      filterApps();
    });
    container.appendChild(btn);
  });
}

function filterApps() {
  const cards = document.querySelectorAll('.app-card');
  let visibleCount = 0;
  cards.forEach(card => {
    const visible = !activeCategory || card.dataset.category === activeCategory;
    card.style.display = visible ? '' : 'none';
    if (visible) visibleCount++;
  });
  const section = document.getElementById('apps-section');
  if (section) section.style.display = visibleCount ? '' : 'none';
}

function renderTagFilter(tags) {
  const container = document.getElementById('tag-filter');
  container.innerHTML = '';
  if (!tags.length) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'tag-chip' + (activeTags.size === 0 ? ' active' : '');
  allBtn.textContent = '전체';
  allBtn.addEventListener('click', () => {
    activeTags.clear();
    renderTagFilter(tags);
    renderPosts();
  });
  container.appendChild(allBtn);

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-chip' + (activeTags.has(tag) ? ' active' : '');
    btn.textContent = '#' + tag;
    btn.addEventListener('click', () => {
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
      } else {
        activeTags.add(tag);
      }
      renderTagFilter(tags);
      renderPosts();
    });
    container.appendChild(btn);
  });
}

function filterPosts() {
  const q = searchQuery.toLowerCase().trim();
  return allPosts.filter(post => {
    if (activeCategory && post.category !== activeCategory) return false;
    if (activeTags.size > 0) {
      const postTags = post.tags || [];
      const hasAll = [...activeTags].every(t => postTags.includes(t));
      if (!hasAll) return false;
    }
    if (q) {
      const haystack = [post.title, post.description, ...(post.tags || [])].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function renderPosts() {
  const container = document.getElementById('post-list');
  const posts = filterPosts();

  if (!posts.length) {
    container.innerHTML = '<p class="empty-msg">검색 결과가 없습니다.</p>';
    return;
  }

  container.innerHTML = '';
  posts.forEach(post => {
    const a = document.createElement('a');
    a.className = 'archive-row';
    a.href = `post.html?slug=${encodeURIComponent(post.slug)}`;

    const tags = (post.tags || []).map(t =>
      `<span class="tag-chip">#${escapeHtml(t)}</span>`
    ).join('');

    a.innerHTML = `
      <time class="archive-date">${formatDate(post.date)}</time>
      <div class="archive-sep"></div>
      <div class="archive-body">
        <span class="archive-title">${escapeHtml(post.title)}</span>
        ${post.description ? `<p class="archive-desc">${escapeHtml(post.description)}</p>` : ''}
        <div class="archive-meta">
          ${tags}
          <span class="archive-time">${readingTime(post.wordCount || 200)}</span>
        </div>
      </div>
    `;
    container.appendChild(a);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function init() {
  try {
    allPosts = await loadPosts();
    const tags = collectTags(allPosts);
    const appCategories = [...document.querySelectorAll('.app-card')]
      .map(c => c.dataset.category)
      .filter(Boolean);
    renderCategoryFilter(collectCategories(allPosts, appCategories));
    renderTagFilter(tags);
    renderPosts();
    filterApps();
  } catch (e) {
    document.getElementById('post-list').innerHTML =
      `<p class="empty-msg">오류: ${escapeHtml(e.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderPosts();
  });

  init();
});
