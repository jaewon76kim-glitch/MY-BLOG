'use strict';

let allPosts = [];
let activeTags = new Set();
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
    const wordCount = post.wordCount || 200;
    const a = document.createElement('a');
    a.className = 'post-card';
    a.href = `post.html?slug=${encodeURIComponent(post.slug)}`;

    const tags = (post.tags || []).map(t =>
      `<span class="tag-chip">#${t}</span>`
    ).join('');

    a.innerHTML = `
      <div class="post-card-header">
        <span class="post-card-title">${escapeHtml(post.title)}</span>
        <span class="post-card-date">${formatDate(post.date)}</span>
      </div>
      ${post.description ? `<p class="post-card-desc">${escapeHtml(post.description)}</p>` : ''}
      <div class="post-card-footer">
        <div class="post-card-tags">${tags}</div>
        <span class="post-card-reading-time">${readingTime(wordCount)}</span>
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
    renderTagFilter(tags);
    renderPosts();
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
