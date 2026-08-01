/* 3GPP UE 프로토콜 스펙 지도 — 렌더링 및 상호작용 */

const $ = (sel) => document.querySelector(sel);

// 스택도에 세로로 쌓을 순서 (위 → 아래).
// 위 4개는 NAS를 전송수단으로 쓰거나(SMS·LCS·Security) NAS의 등록 대상을
// 정하는(PLMN Selection) 상위 기능이라 NAS 위에 놓는다. 그 아래가 스택 본체.
const STACK_ORDER = ['te', 'ims', 'sms', 'lcs', 'sec', 'plmn', 'nas', 'uecap', 'rrc', 'rrm', 'sdap', 'pdcp', 'rlc', 'mac', 'phy', 'rf'];
// 스택을 검증하는 시험 규격
const TEST_ORDER = ['t-com', 't-pct', 't-rrm', 't-rct'];
// 규격이 아니라 연구 문서 — 설계 배경 추적용
const STUDY_ORDER = ['ntn-tr'];

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

// LTE/NR 칸이 나뉘지 않는 RAT 공통 문서는 한 칸으로 편다.
//   wide = 그 행이 통째로 RAT 공통 (예: SMS, PLMN Selection)
//   base = LTE/NR이 있는 행에 공통 문서가 딸린 경우 (예: NAS의 24.007/24.008)
const wideRow = (mid, mod, list, indent) => `
  <button class="layer ${indent ? 'base-row' : 'wide-row'}" data-mod="${mid}"
          aria-label="${indent ? (mod.commonLabel || mod.name + ' 공통') : mod.name} 열기">
    <span class="layer-name">${indent ? (mod.commonLabel || 'Common') : mod.name}<small>${
      indent ? (mod.commonDesc || 'LTE·NR 공통') : mod.desc
    }</small></span>
    <span class="layer-cell common">${list.map((s) => s.id).join(' · ')}</span>
  </button>`;

/* 한 모듈을 LTE/NR 2칸 행으로 그린다. 스택·시험·연구 세 구획이 같은 형식을 쓴다. */
function moduleRow(mid) {
  const mod = moduleById(mid);
  const list = specsOf(mid);
  const lte = list.filter((s) => s.s === 'LTE');
  const nr = list.filter((s) => s.s === 'NR');
  const common = list.filter((s) => s.s === 'Common');

  // RAT 구분이 아예 없으면 칸을 나누지 않는다
  if (!lte.length && !nr.length) return wideRow(mid, mod, common, false);

  return `
    <button class="layer" data-mod="${mid}" aria-label="${mod.name} 모듈 열기">
      <span class="layer-name">${mod.name}<small>${mod.desc}</small></span>
      <span class="layer-cell ${lte.length ? 'lte' : 'none'}">${
        lte.length ? lte.map((s) => s.id).join(' · ') : '해당 없음'
      }</span>
      <span class="layer-cell ${nr.length ? 'nr' : 'none'}">${
        nr.length ? nr.map((s) => s.id).join(' · ') : '해당 없음'
      }</span>
    </button>` + (common.length ? wideRow(mid, mod, common, true) : '');
}

const HEAD = '<div class="stack-head"><span></span><span>LTE / EPS</span><span>NR / 5GS</span></div>';
const section = (order) => `<div class="stack">${HEAD}${order.map(moduleRow).join('')}</div>`;

function renderOverview() {
  $('#view').innerHTML = `
    <p class="note">
      <strong>단말(UE) 프로토콜 개발자 기준</strong>으로 골랐습니다.
      Layer를 눌러 상세로 들어가면 각 스펙을 <strong>언제 펼치게 되는지</strong>를 함께 적어두었습니다.
    </p>
    <h2 class="stack-title">Protocol Stack</h2>
    ${section(STACK_ORDER)}

    <h2 class="stack-title">Conformance Test</h2>
    <p class="section-note">위 스택을 검증하는 시험 규격입니다.
      PCT·RRM·RCT 셋 다 공통 시험환경(38.508-1 / 36.508)을 참조합니다.</p>
    ${section(TEST_ORDER)}

    <h2 class="stack-title">Study Item (TR)</h2>
    <p class="section-note">규격이 아니라 연구 문서입니다.
      현재 설계가 <strong>왜 이렇게 나왔는지</strong> 배경을 추적할 때 봅니다.</p>
    ${section(STUDY_ORDER)}
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
