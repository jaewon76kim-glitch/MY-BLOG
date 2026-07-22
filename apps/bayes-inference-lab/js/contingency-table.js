/* contingency-table.js — 섹션 2: 조건부확률 방향성 실습(성적표 예제)
 * 2x2 분할표(열심히 공부함/안 함 × A+ 받음/그 외) 4칸을 직접 입력하면
 * p(A+|공부함)과 p(공부함|A+)를 나란히 계산해 표시한다.
 */

var ctState = {
  studiedAplus: 18,
  studiedOther: 2,
  notStudiedAplus: 2,
  notStudiedOther: 8
};

function ctRenderAll() {
  var calc = contingencyConditionals(
    ctState.studiedAplus, ctState.studiedOther,
    ctState.notStudiedAplus, ctState.notStudiedOther
  );

  var elA = document.getElementById('ct-p-aplus-given-studied');
  var elB = document.getElementById('ct-p-studied-given-aplus');
  if (elA) elA.textContent = (calc.pAplusGivenStudied * 100).toFixed(1) + '%';
  if (elB) elB.textContent = (calc.pStudiedGivenAplus * 100).toFixed(1) + '%';

  var subA = document.getElementById('ct-formula-a');
  var subB = document.getElementById('ct-formula-b');
  if (subA) {
    subA.textContent = 'p(A+|공부함) = ' + ctState.studiedAplus + ' / ' + calc.studiedTotal +
      ' = ' + calc.pAplusGivenStudied.toFixed(4);
  }
  if (subB) {
    subB.textContent = 'p(공부함|A+) = ' + ctState.studiedAplus + ' / ' + calc.aplusTotal +
      ' = ' + calc.pStudiedGivenAplus.toFixed(4);
  }

  var diffEl = document.getElementById('ct-diff-note');
  if (diffEl) {
    var diff = Math.abs(calc.pAplusGivenStudied - calc.pStudiedGivenAplus);
    if (diff < 0.0001) {
      diffEl.textContent = '두 조건부확률이 우연히 정확히 같습니다 (p(A|B) = p(B|A)).';
    } else {
      diffEl.textContent = '두 조건부확률이 서로 다릅니다: p(A+|공부함) ≠ p(공부함|A+) — ' +
        '방향을 혼동하면 안 됩니다.';
    }
  }
}

function ctBindInput(id, stateKey) {
  var el = document.getElementById(id);
  el.value = ctState[stateKey];
  el.addEventListener('input', function () {
    var v = parseInt(el.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    ctState[stateKey] = v;
    ctRenderAll();
  });
}

function ctLoadPreset(a, b, c, d) {
  ctState.studiedAplus = a;
  ctState.studiedOther = b;
  ctState.notStudiedAplus = c;
  ctState.notStudiedOther = d;
  document.getElementById('ct-input-studied-aplus').value = a;
  document.getElementById('ct-input-studied-other').value = b;
  document.getElementById('ct-input-notstudied-aplus').value = c;
  document.getElementById('ct-input-notstudied-other').value = d;
  ctRenderAll();
}

function initContingencyTable() {
  ctBindInput('ct-input-studied-aplus', 'studiedAplus');
  ctBindInput('ct-input-studied-other', 'studiedOther');
  ctBindInput('ct-input-notstudied-aplus', 'notStudiedAplus');
  ctBindInput('ct-input-notstudied-other', 'notStudiedOther');

  document.getElementById('ct-preset1-btn').addEventListener('click', function () {
    ctLoadPreset(18, 2, 2, 8);
  });
  document.getElementById('ct-preset2-btn').addEventListener('click', function () {
    ctLoadPreset(10, 10, 2, 8);
  });

  ctRenderAll();
}
