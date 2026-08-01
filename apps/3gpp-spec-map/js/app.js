/* 3GPP UE 프로토콜 스펙 지도 — 렌더링 및 상호작용 */

const $ = (sel) => document.querySelector(sel);

// 스택도에 세로로 쌓을 순서 (위 → 아래). 실제 프로토콜 스택 그대로.
const STACK_ORDER = ['nas', 'rrc', 'sdap', 'pdcp', 'rlc', 'mac', 'phy'];
// 옆 기둥 — 스택의 한 layer가 아니라 스택 전체를 가로지르는 것들
const PILLAR_ORDER = ['uecap', 'rf', 'sec', 'ims', 'sms', 'lcs', 'te', 't-com', 't-pct', 't-rrm', 't-rct'];

let ntnOnly = false;
let query = '';

const moduleById = (id) => MODULES.find((m) => m.id === id);
const specsOf = (mid) => SPECS.filter((s) => s.m === mid);

/* 현재 필터를 통과하는가 */
function passes(spec) {
  if (ntnOnly && !spec.ntn) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  const hay = [
    spec.id, spec.short, spec.title, spec.when,
    spec.ntnNote, spec.xref, spec.kw, spec.rel
  ].filter(Boolean).join(' ').toLowerCase()
   // 태그를 제거해 <b>·<code> 안의 글자도 검색되게 한다
   .replace(/<[^>]+>/g, '');
  return hay.includes(q);
}

/* ── Level 0 ─────────────────────────────────────────── */
function renderOverview() {
  // RAT 공통(s === 'Common') NAS 문서 — LTE/NR 어느 칸에도 속하지 않으므로
  // 별도 행으로 뺀다. 스택 맨 아래가 아니라 NAS 바로 밑에 붙인다(참조 방향이 그렇다).
  const base = specsOf('nas').filter((s) => s.s === 'Common');
  const baseRow = `
    <button class="layer base-row" data-mod="nas" aria-label="Common NAS base 열기">
      <span class="layer-name">Common NAS base<small>LTE·NR이 함께 참조</small></span>
      <span class="layer-cell common">${base.map((s) => s.id).join(' · ')}</span>
    </button>`;

  const stack = STACK_ORDER.map((mid) => {
    const mod = moduleById(mid);
    const lte = specsOf(mid).filter((s) => s.s === 'LTE');
    const nr = specsOf(mid).filter((s) => s.s === 'NR');
    return `
      <button class="layer" data-mod="${mid}" aria-label="${mod.name} 모듈 열기">
        <span class="layer-name">${mod.name}<small>${mod.desc}</small></span>
        <span class="layer-cell ${lte.length ? 'lte' : 'none'}">${
          lte.length ? lte.map((s) => s.id).join(' · ') : '해당 없음'
        }</span>
        <span class="layer-cell ${nr.length ? 'nr' : 'none'}">${
          nr.length ? nr.map((s) => s.id).join(' · ') : '해당 없음'
        }</span>
      </button>` + (mid === 'nas' ? baseRow : '');
  }).join('');

  const pillars = PILLAR_ORDER.map((mid) => {
    const mod = moduleById(mid);
    return `
      <button class="pillar" data-mod="${mid}">
        <span class="count">${specsOf(mid).length}</span>
        <strong>${mod.name}</strong>
        <small>${mod.desc}</small>
      </button>`;
  }).join('');

  $('#view').innerHTML = `
    <p class="note">
      <strong>단말(UE) 프로토콜 개발자 기준</strong>으로 골랐습니다.
      Layer를 눌러 상세로 들어가면 각 스펙을 <strong>언제 펼치게 되는지</strong>를 함께 적어두었습니다.
    </p>
    <h2 class="stack-title">Protocol Stack</h2>
    <div class="stack">
      <div class="stack-head"><span></span><span>LTE / EPS</span><span>NR / 5GS</span></div>
      ${stack}
    </div>
    <div class="pillars">
      <h2>UE Capability · RF · Security · Services · AT · Test</h2>
      <p class="pillar-note">스택의 한 layer에 속하지 않고, 스택 전체를 가로지르거나 그 바깥에 있는 문서들입니다.</p>
      <div class="pillar-grid">${pillars}</div>
    </div>
    <div class="legend">
      <span><b style="color:var(--ntn)">■</b> NTN only</span>
      <span><b style="color:var(--ntn-soft)">■</b> NTN clause</span>
      <span>★ 자주 펼치는 문서</span>
      <span>TR = Study item (Technical Report)</span>
    </div>`;
}

/* ── Level 1 ─────────────────────────────────────────── */
function badges(s) {
  const out = [];
  if (s.s === 'NR') out.push('<span class="badge nr">NR</span>');
  else if (s.s === 'LTE') out.push('<span class="badge lte">LTE</span>');
  else out.push('<span class="badge common">Common</span>');
  if (s.ntn === 'only') out.push('<span class="badge ntn">NTN only</span>');
  else if (s.ntn === 'clause') out.push('<span class="badge ntn-c">NTN clause</span>');
  if (s.tr) out.push('<span class="badge tr">TR</span>');
  if (s.side === 'net') out.push('<span class="badge net">Network side</span>');
  out.push(`<span class="badge rel">${s.rel}</span>`);
  return `<span class="badges">${out.join('')}</span>`;
}

function card(s) {
  const cls = s.ntn === 'only' ? ' ntn-only' : s.ntn === 'clause' ? ' ntn-clause' : '';
  return `
    <article class="card${cls}" id="spec-${s.id.replace(/\./g, '_')}">
      <div class="card-top">
        <span class="spec-id">${s.tr ? 'TR ' : 'TS '}${s.id}</span>
        <span class="card-short">${s.short}</span>
        ${badges(s)}
      </div>
      <p class="card-title">${s.title}</p>
      <p class="card-when">${s.when}</p>
      <p class="peer">
        ${s.peer ? `Peer: <a data-goto="${s.peer}">${s.peer}</a> · ` : ''}
        <a class="ext" href="https://www.3gpp.org/dynareport/${s.id.replace('.', '')}.htm"
           target="_blank" rel="noopener">3GPP 공식 ↗</a>
      </p>
      ${s.xref ? `<div class="card-xref">↔ ${s.xref}</div>` : ''}
      ${s.ntnNote ? `<div class="card-ntn"><b>NTN</b> — ${s.ntnNote}</div>` : ''}
    </article>`;
}

function renderModule(mid) {
  const mod = moduleById(mid);
  const list = specsOf(mid).filter(passes);
  const asym = list.some((s) => s.asym);
  $('#view').innerHTML = `
    <div class="detail-head">
      <button class="back" data-back>← 전체 지도</button>
      <h2>${mod.name}</h2>
    </div>
    <p class="detail-desc">${mod.desc}</p>
    ${asym ? `<p class="note"><strong>번호 체계 주의</strong> — RRM conformance test는 LTE가
      <code>36.521-3</code>(521 시리즈 <em>안</em>)인데 NR은 <code>38.533</code>(521 시리즈 <em>밖</em>)입니다.
      번호만 보면 놓치기 쉬운 비대칭입니다.</p>` : ''}
    <div class="cards">
      ${list.length ? list.map(card).join('') : '<p class="empty">조건에 맞는 스펙이 없습니다.</p>'}
    </div>`;
}

/* ── 검색 결과 (모듈 무관 전역) ──────────────────────── */
function renderSearch() {
  const list = SPECS.filter(passes);
  $('#view').innerHTML = `
    <div class="detail-head">
      <button class="back" data-back>← 전체 지도</button>
      <h2>검색 결과 <span class="peer">${list.length}건</span></h2>
    </div>
    <div class="cards">
      ${list.length ? list.map(card).join('') : '<p class="empty">일치하는 스펙이 없습니다.</p>'}
    </div>`;
}

/* ── 라우팅 ──────────────────────────────────────────── */
let pendingSpec = null; // 렌더 후 스크롤·강조할 스펙 id

function render() {
  if (query || ntnOnly) renderSearch();
  else {
    const mid = location.hash.replace('#', '');
    if (mid && moduleById(mid)) renderModule(mid);
    else renderOverview();
  }
  if (pendingSpec) {
    const el = document.getElementById('spec-' + pendingSpec.replace(/\./g, '_'));
    pendingSpec = null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid var(--accent)';
      el.style.outlineOffset = '2px';
      setTimeout(() => { el.style.outline = ''; }, 1600);
      return;
    }
  }
  window.scrollTo(0, 0);
}

/* 필터를 모두 비운다 (전체 지도로 돌아갈 때) */
function clearFilters() {
  query = '';
  ntnOnly = false;
  $('#search').value = '';
  $('#btn-ntn').setAttribute('aria-pressed', 'false');
}

/* 특정 스펙으로 이동 — 해시가 바뀌든 안 바뀌든 한 번만 렌더된다 */
function gotoSpec(id) {
  const spec = SPECS.find((s) => s.id === id);
  if (!spec) return;
  clearFilters();
  pendingSpec = id;
  if (location.hash.replace('#', '') === spec.m) render(); // hashchange가 안 나므로 직접
  else location.hash = spec.m;                             // hashchange → render()
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-back]')) {
    clearFilters();                 // 검색·NTN 상태에서도 확실히 빠져나온다
    if (location.hash) location.hash = '';
    else render();
    return;
  }
  const layer = e.target.closest('[data-mod]');
  if (layer) { clearFilters(); location.hash = layer.dataset.mod; return; }
  const goto = e.target.closest('[data-goto]');
  if (goto) { gotoSpec(goto.dataset.goto); }
});

window.addEventListener('hashchange', render);

$('#search').addEventListener('input', (e) => {
  query = e.target.value.trim();
  render();
});

$('#btn-ntn').addEventListener('click', (e) => {
  ntnOnly = !ntnOnly;
  e.currentTarget.setAttribute('aria-pressed', String(ntnOnly));
  render();
});

render();
