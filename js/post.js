'use strict';

// ── frontmatter 파싱 ──────────────────────────────────────────
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    // tags: [a, b] 형식 파싱
    if (val.startsWith('[') && val.endsWith(']')) {
      meta[key] = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else {
      meta[key] = val.replace(/^["']|["']$/g, '');
    }
  });

  return { meta, content: match[2] };
}

// ── 읽기 시간 ─────────────────────────────────────────────────
function readingTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// ── 날짜 포맷 ─────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── 헤딩에 id 부여 & TOC 생성 ────────────────────────────────
function buildToc(contentEl) {
  const headings = [...contentEl.querySelectorAll('h2, h3')];
  if (headings.length < 2) return '';

  const idCount = {};
  const items = headings.map(h => {
    const text = h.textContent.trim();
    let id = text.toLowerCase()
      .replace(/[^\w\s가-힣]/g, '')
      .replace(/\s+/g, '-');
    if (!id) id = 'heading';
    idCount[id] = (idCount[id] || 0) + 1;
    if (idCount[id] > 1) id += `-${idCount[id]}`;
    h.id = id;
    return { id, text, level: parseInt(h.tagName[1]) };
  });

  return items.map(item =>
    `<a href="#${item.id}" data-level="${item.level}">${escapeHtml(item.text)}</a>`
  ).join('');
}

// ── TOC 스크롤 하이라이트 ─────────────────────────────────────
function setupTocHighlight() {
  const links = document.querySelectorAll('#toc-nav a');
  if (!links.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = document.querySelector(`#toc-nav a[href="#${entry.target.id}"]`);
      if (link) link.classList.toggle('active', entry.isIntersecting);
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  document.querySelectorAll('.post-content h2, .post-content h3').forEach(h => observer.observe(h));
}

// ── 유틸 ──────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── marked 설정 ───────────────────────────────────────────────
function configureMarked() {
  marked.setOptions({ gfm: true, breaks: false });
}

// ── 메인 렌더 ─────────────────────────────────────────────────
async function renderPost(slug) {
  const article = document.getElementById('post-article');

  const res = await fetch(`posts/${encodeURIComponent(slug)}.md`);
  if (!res.ok) {
    article.innerHTML = `<p class="loading-msg" style="color:var(--text-muted)">
      포스트를 찾을 수 없습니다: <code>${escapeHtml(slug)}</code></p>`;
    return;
  }

  const raw = await res.text();
  const { meta, content } = parseFrontmatter(raw);
  const minutes = readingTime(content);

  // 페이지 타이틀 업데이트
  if (meta.title) document.title = `${meta.title} — My Blog`;

  // HTML 변환
  const bodyHtml = marked.parse(content);

  // 태그 마크업
  const tagsHtml = (meta.tags || []).map(t =>
    `<a href="index.html" class="tag-chip">#${escapeHtml(t)}</a>`
  ).join('');

  article.innerHTML = `
    <header class="post-header">
      <h1 class="post-title">${escapeHtml(meta.title || slug)}</h1>
      <div class="post-meta">
        ${meta.date ? `<span class="post-meta-date">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ${formatDate(meta.date)}</span>` : ''}
        ${meta.date ? '<span class="post-meta-sep">·</span>' : ''}
        <span class="post-meta-reading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          읽기 ${minutes}분
        </span>
        ${tagsHtml ? `<span class="post-meta-sep">·</span>
          <div class="post-meta-tags">${tagsHtml}</div>` : ''}
      </div>
    </header>
    <div class="post-content">${bodyHtml}</div>
  `;

  // 코드 하이라이팅 (marked highlight 옵션이 안 적용된 블록 대비)
  article.querySelectorAll('pre code').forEach(block => {
    if (!block.classList.contains('hljs')) hljs.highlightElement(block);
  });

  // TOC 생성
  const contentEl = article.querySelector('.post-content');
  const tocHtml = buildToc(contentEl);

  document.getElementById('toc-nav').innerHTML = tocHtml;
  document.getElementById('toc-nav-mobile').innerHTML = tocHtml;

  // TOC가 없으면 aside/details 숨김
  if (!tocHtml) {
    document.getElementById('toc-aside').style.display = 'none';
    document.getElementById('toc-mobile').style.display = 'none';
  }

  setupTocHighlight();
}

// ── 초기화 ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) {
    document.getElementById('post-article').innerHTML =
      '<p class="loading-msg">slug 파라미터가 없습니다. <a href="index.html">목록으로 돌아가기</a></p>';
    return;
  }

  configureMarked();
  renderPost(slug).catch(e => {
    document.getElementById('post-article').innerHTML =
      `<p class="loading-msg">오류: ${escapeHtml(e.message)}</p>`;
  });
});
