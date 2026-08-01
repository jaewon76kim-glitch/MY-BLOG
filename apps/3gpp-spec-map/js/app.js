/* 3GPP UE 프로토콜 스펙 지도 — 렌더링 및 상호작용 */

const $ = (sel) => document.querySelector(sel);

// 스택도에 세로로 쌓을 순서 (위 → 아래).
// 위 4개는 NAS를 전송수단으로 쓰거나(SMS·LCS·Security) NAS의 등록 대상을
// 정하는(PLMN Selection) 상위 기능이라 NAS 위에 놓는다. 그 아래가 스택 본체.
const STACK_ORDER = ['te', 'ims', 'sms', 'lcs', 'sec', 'plmn', 'nas', 'uecap', 'rrc', 'rrm', 'sdap', 'pdcp', 'rlc', 'mac', 'phy-proc', 'phy', 'rf'];
// 총론·아키텍처 — 스택과 같은 위→아래 순서라 이 구획만 봐도 큰 그림이 잡힌다
const OVERVIEW_ORDER = ['ov-ims', 'ov-lcs', 'ov-sec', 'ov-nas', 'ov-ran', 'ov-phy'];
// 스택을 검증하는 시험 규격. 공통 시험환경(t-com)은 나머지 셋이 참조하는
// 토대이므로 맨 아래에 둔다.
const TEST_ORDER = ['t-pct', 't-rrm', 't-rct', 't-com'];
// 규격이 아니라 연구 문서 — 설계 배경 추적용
const STUDY_ORDER = ['ntn-tr'];

let ntnOnly = false;
let query = '';

const moduleById = (id) => MODULES.find((m) => m.id === id);

/* 스펙 번호 오름차순 비교. '38.101-1' → [38, 101, 1], '38.108' → [38, 108, 0].
   문자열 비교로는 38.101-1이 38.108보다 뒤로 가므로 마디를 숫자로 쪼갠다. */
const specNo = (id) => {
  const [series, rest] = id.split('.');
  const [main, part] = rest.split('-');
  return [Number(series), Number(main), Number(part || 0)];
};
const bySpecNo = (x, y) => {
  const a = specNo(x.id), b = specNo(y.id);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
};

// filter()가 새 배열을 주므로 sort()가 SPECS 원본을 건드리지 않는다
const specsOf = (mid) => SPECS.filter((s) => s.m === mid).sort(bySpecNo);

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
    <h2 class="stack-title">Overview · Architecture (Stage 2)</h2>
    <p class="section-note">개별 layer가 아니라 <strong>구조 전체를 서술하는</strong> 문서입니다.
      아래 스택과 같은 위→아래 순서로 놓았으니, 이 구획만 훑어도 큰 그림이 잡힙니다.</p>
    ${section(OVERVIEW_ORDER)}

    <h2 class="stack-title">Protocol Stack</h2>
    <p class="section-note">실제 메시지·절차를 규정하는 문서입니다.</p>
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
      <span>카드의 <b>ETSI PDF ↗</b> = 로그인 없이 PDF로 내려받기</span>
    </div>`;
}

/* ── 원문 내려받기 링크 ──────────────────────────────
   3GPP 사이트(dynareport)는 docx를 주므로 Office 없이는 불편하다.
   ETSI deliver는 같은 문서를 PDF로 두고 있어 그쪽으로 보낸다.

   ETSI 번호 = '1' + 3GPP 번호(점 제거). 다중 파트는 2자리로 붙인다.
     38.300  → 138300      (범위 138300_138399)
     38.101-1→ 13810101    (범위 138100_138199 — 범위는 파트 뗀 6자리 기준)
   버전 폴더가 그대로 나열되는 디렉터리를 걸어, 특정 버전을 박지 않아도
   항상 최신 목록에서 원하는 판을 고를 수 있게 한다. */
function etsiUrl(id) {
  const [head, part] = id.split('-');
  const base = '1' + head.replace('.', '');
  const num = base + (part ? String(part).padStart(2, '0') : '');
  const start = Math.floor(Number(base) / 100) * 100;
  return `https://www.etsi.org/deliver/etsi_ts/${start}_${start + 99}/${num}/`;
}

/* TR은 ETSI가 발행하지 않아(38.811·38.821·38.822·36.763 모두 404)
   PDF가 없다. 이 넷만 종전대로 3GPP 공식 페이지에 둔다. */
function specLink(s) {
  if (s.tr) {
    return {
      href: `https://www.3gpp.org/dynareport/${s.id.replace('.', '')}.htm`,
      label: '3GPP 공식 ↗',
      title: 'ETSI가 발행하지 않는 TR이라 PDF가 없습니다 — 3GPP 공식 페이지'
    };
  }
  return {
    href: etsiUrl(s.id),
    label: 'ETSI PDF ↗',
    title: '버전 폴더 목록이 열립니다 — 원하는 버전으로 들어가면 PDF (로그인 불필요)'
  };
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
        <a class="ext" href="${specLink(s).href}" title="${specLink(s).title}"
           target="_blank" rel="noopener">${specLink(s).label}</a>
      </p>
      ${s.xref ? `<div class="card-xref">↔ ${s.xref}</div>` : ''}
      ${s.ntnNote ? `<div class="card-ntn"><b>NTN</b> — ${s.ntnNote}</div>` : ''}
    </article>`;
}

function renderModule(mid) {
  const mod = moduleById(mid);
  const list = specsOf(mid).filter(passes);
  $('#view').innerHTML = `
    <div class="detail-head">
      <button class="back" data-back>← 전체 지도</button>
      <h2>${mod.name}</h2>
    </div>
    <p class="detail-desc">${mod.desc}</p>
    ${mod.asymNote ? `<p class="note"><strong>번호 체계 주의</strong> — ${mod.asymNote}</p>` : ''}
    <div class="cards">
      ${list.length ? list.map(card).join('') : '<p class="empty">조건에 맞는 스펙이 없습니다.</p>'}
    </div>`;
}

/* ── 검색 결과 (모듈 무관 전역) ──────────────────────── */
function renderSearch() {
  // 검색 결과는 모듈 묶음을 유지하되(지도 순서 그대로), 그 안에서 번호순
  const order = [...OVERVIEW_ORDER, ...STACK_ORDER, ...TEST_ORDER, ...STUDY_ORDER];
  const list = SPECS.filter(passes)
    .sort((x, y) => order.indexOf(x.m) - order.indexOf(y.m) || bySpecNo(x, y));
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
