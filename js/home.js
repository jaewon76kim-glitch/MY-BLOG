'use strict';

let allPosts = [];
let activeTags = new Set();
let searchQuery = '';

async function loadPosts() {
  const res = await fetch('posts/index.json');
  if (!res.ok) throw new Error('포스트 목록을 불러올 수 없습니다.');
  const posts = await res.json();
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function readingTime(wordCount) {
  return `읽기 ${Math.max(1, Math.round(wordCount / 200))}분`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function collectTags(posts) {
  const freq = {};
  posts.forEach(p => (p.tags || []).forEach(t => { freq[t] = (freq[t] || 0) + 1; }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

function renderTagFilter(tags) {
  const container = document.getElementById('tag-filter');
  container.innerHTML = '';
  if (!tags.length) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'tag-chip' + (activeTags.size === 0 ? ' active' : '');
  allBtn.textContent = '#all';
  allBtn.addEventListener('click', () => { activeTags.clear(); renderTagFilter(tags); renderPosts(); });
  container.appendChild(allBtn);

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-chip' + (activeTags.has(tag) ? ' active' : '');
    btn.textContent = '#' + tag;
    btn.addEventListener('click', () => {
      activeTags.has(tag) ? activeTags.delete(tag) : activeTags.add(tag);
      renderTagFilter(tags);
      renderPosts();
    });
    container.appendChild(btn);
  });
}

function filterPosts() {
  const q = searchQuery.toLowerCase().trim();
  return allPosts.filter(post => {
    if (activeTags.size > 0) {
      const postTags = post.tags || [];
      if (![...activeTags].every(t => postTags.includes(t))) return false;
    }
    if (q) {
      const hay = [post.title, post.description, ...(post.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPosts() {
  const container = document.getElementById('post-list');
  const posts = filterPosts();

  if (!posts.length) {
    container.innerHTML = '<p class="empty-msg">// 검색 결과 없음</p>';
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

async function init() {
  try {
    allPosts = await loadPosts();
    renderTagFilter(collectTags(allPosts));
    renderPosts();
  } catch (e) {
    document.getElementById('post-list').innerHTML =
      `<p class="empty-msg">// 오류: ${escapeHtml(e.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderPosts();
  });
  init();
});
