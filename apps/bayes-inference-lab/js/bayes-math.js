/* bayes-math.js
 * 베이즈 추론 실험실 — 순수 계산 함수 모음 (전역 변수, 모듈 시스템 미사용)
 * 다른 js 파일(base-rate-calculator.js, contingency-table.js, generative-classifier.js,
 * number-game.js, mle-map-divergence.js)에서 그대로 재사용한다.
 * 모든 함수는 반복 최적화 없이 닫힌 형태 공식으로 즉시 계산된다.
 */

/* ---------- 1) 기저율 오류 — 베이즈 정리 계산기 (섹션 1) ---------- */

/**
 * 전체 확률의 법칙: p(양성) = p(양성|암)*p(암) + p(양성|암 아님)*(1-p(암))
 */
function totalProbabilityPositive(sensitivity, falsePositiveRate, priorCancer) {
  return sensitivity * priorCancer + falsePositiveRate * (1 - priorCancer);
}

/**
 * 베이즈 정리: p(암|양성) = p(양성|암)*p(암) / p(양성)
 * 반환: { pPositive, pCancerGivenPositive, numerator }
 */
function bayesCancerGivenPositive(sensitivity, falsePositiveRate, priorCancer) {
  var numerator = sensitivity * priorCancer;
  var pPositive = totalProbabilityPositive(sensitivity, falsePositiveRate, priorCancer);
  var posterior = pPositive > 0 ? numerator / pPositive : 0;
  return { numerator: numerator, pPositive: pPositive, pCancerGivenPositive: posterior };
}

/**
 * 100명 아이콘 격자용 인원수 분해.
 * 진짜양성 = 100*p(암)*p(양성|암), 위양성 = 100*(1-p(암))*p(양성|암 아님),
 * 위음성 = 100*p(암)*(1-p(양성|암)), 진짜음성 = 나머지.
 * 반올림 후 합이 100이 되도록 진짜음성을 나머지로 보정한다.
 */
function breakdown100(sensitivity, falsePositiveRate, priorCancer) {
  var truePos = Math.round(100 * priorCancer * sensitivity);
  var falseNeg = Math.round(100 * priorCancer * (1 - sensitivity));
  var falsePos = Math.round(100 * (1 - priorCancer) * falsePositiveRate);
  var trueNeg = 100 - truePos - falseNeg - falsePos;
  if (trueNeg < 0) trueNeg = 0;
  return { truePos: truePos, falsePos: falsePos, trueNeg: trueNeg, falseNeg: falseNeg };
}

/* ---------- 2) 조건부확률 방향성 — 성적표 예제 (섹션 2) ---------- */

/**
 * 2x2 분할표에서 두 방향의 조건부확률을 계산한다.
 * studiedAplus: 공부함 & A+, studiedOther: 공부함 & 그 외,
 * notStudiedAplus: 안 함 & A+, notStudiedOther: 안 함 & 그 외
 */
function contingencyConditionals(studiedAplus, studiedOther, notStudiedAplus, notStudiedOther) {
  var studiedTotal = studiedAplus + studiedOther;
  var aplusTotal = studiedAplus + notStudiedAplus;
  var pAplusGivenStudied = studiedTotal > 0 ? studiedAplus / studiedTotal : 0;
  var pStudiedGivenAplus = aplusTotal > 0 ? studiedAplus / aplusTotal : 0;
  return {
    studiedTotal: studiedTotal,
    aplusTotal: aplusTotal,
    pAplusGivenStudied: pAplusGivenStudied,
    pStudiedGivenAplus: pStudiedGivenAplus
  };
}

/* ---------- 3) 생성적 분류기 — MAP 분류 (섹션 3) ---------- */

/**
 * classes: [{ name, likelihood, prior }]
 * 반환: [{ name, likelihood, prior, unnormalized, posterior }], evidence(Z), mapIndex
 */
function generativeClassifierPosteriors(classes) {
  var unnormalized = classes.map(function (c) { return c.likelihood * c.prior; });
  var evidence = unnormalized.reduce(function (a, b) { return a + b; }, 0);
  var mapIndex = -1;
  var mapVal = -Infinity;
  var results = classes.map(function (c, i) {
    var posterior = evidence > 0 ? unnormalized[i] / evidence : 0;
    if (posterior > mapVal) { mapVal = posterior; mapIndex = i; }
    return {
      name: c.name,
      likelihood: c.likelihood,
      prior: c.prior,
      unnormalized: unnormalized[i],
      posterior: posterior
    };
  });
  return { results: results, evidence: evidence, mapIndex: mapIndex };
}

/* ---------- 4) 숫자게임 — 강한 표집 가정 우도 (섹션 4, 5) ---------- */

/**
 * 강한 표집 가정: p(D|h) = (1/|h|)^N, D가 h와 모순되면 0.
 * consistent가 false이면 확률은 정의상 0.
 */
function hypothesisLikelihood(hypothesisSize, N, consistent) {
  if (!consistent || hypothesisSize <= 0) return 0;
  return Math.pow(1 / hypothesisSize, N);
}

/**
 * 로그 우도: log p(D|h) = N * log(1/|h|) = -N*log(|h|)
 * 모순되면 -Infinity.
 */
function logHypothesisLikelihood(hypothesisSize, N, consistent) {
  if (!consistent || hypothesisSize <= 0) return -Infinity;
  return -N * Math.log(hypothesisSize);
}

/**
 * 주어진 데이터 배열이 모두 predicate(멤버십 함수)를 만족하는지 확인.
 */
function isConsistentWithHypothesis(data, predicate) {
  for (var i = 0; i < data.length; i++) {
    if (!predicate(data[i])) return false;
  }
  return true;
}

/* ---------- 공통 유틸 ---------- */

/**
 * 소수 배열 반환 여부(1~100 소수 판별용).
 */
function isPrimeNumber(n) {
  if (n < 2) return false;
  for (var i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

/**
 * 지수 표기 문자열(작은 확률값 표시용). 예: 1.6e-7 -> "1.60×10⁻⁷"
 */
function formatSmallProb(x) {
  if (x === 0) return '0';
  if (x >= 0.001) return x.toFixed(4);
  var s = x.toExponential(2); // "1.60e-7"
  var parts = s.split('e');
  var mantissa = parts[0];
  var exp = parseInt(parts[1], 10);
  var supMap = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  var expStr = String(exp).split('').map(function (ch) { return supMap[ch] || ch; }).join('');
  return mantissa + '×10' + expStr;
}
