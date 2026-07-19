// orbit.js - 케플러 궤도역학 계산 (전역 변수 방식, type="module" 사용 안 함)
//
// 참고: 위성통신 교재 8장 1절은 "원궤도" 특수해(힘 균형 GM_E m/r^2 = m v^2/r)만 다룬다.
// 이 모듈은 그 결과를 장반경 a를 이용한 일반 타원 궤도(e>0) 공식으로 확장한 것으로,
// e=0을 대입하면 모든 공식이 교재의 원궤도 공식과 정확히 일치한다.

var KeplerOrbit = (function () {
  'use strict';

  var GM_E = 3.986e14;      // 지구 중력 상수 m^3/s^2
  var R_E_KM = 6378;        // 지구 반경 km (표시용)
  var SIDEREAL_DAY = 86164; // 항성일 s
  var OMEGA_EARTH = 2 * Math.PI / SIDEREAL_DAY; // 지구 자전각속도 rad/s

  // 케플러 제3법칙: T = 2π sqrt(a^3 / GM_E)  (a: m 단위)
  function periodSec(a_m) {
    return 2 * Math.PI * Math.sqrt(Math.pow(a_m, 3) / GM_E);
  }

  // 비스비바 방정식: v(r,a) = sqrt(GM_E (2/r - 1/a))
  // e=0이면 r=a이므로 v = sqrt(GM_E/a) = sqrt(GM_E/r) → 교재의 원궤도 속도 공식과 일치
  function velocity(r_m, a_m) {
    var val = GM_E * (2 / r_m - 1 / a_m);
    if (val < 0) val = 0; // 수치오차 방지
    return Math.sqrt(val);
  }

  function rPerigee(a_m, e) { return a_m * (1 - e); }
  function rApogee(a_m, e) { return a_m * (1 + e); }

  // 케플러 방정식 M = E - e sin(E) 을 Newton-Raphson으로 수치해석
  function solveKepler(M, e) {
    var E = M;
    for (var i = 0; i < 10; i++) {
      var f = E - e * Math.sin(E) - M;
      var fp = 1 - e * Math.cos(E);
      E = E - f / fp;
    }
    return E;
  }

  // 이심근점이각(E) → 진근점이각(ν), atan2로 사분면 안전 처리
  function trueAnomalyFromE(E, e) {
    return 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
  }

  // 궤도 방정식(원뿔곡선)으로 진근점이각 ν에서의 반지름 — 정적 타원 궤도 그리기용
  // r(ν) = a(1-e^2) / (1 + e cos ν)
  function radiusAtNu(a_m, e, nu) {
    return a_m * (1 - e * e) / (1 + e * Math.cos(nu));
  }

  // 시뮬레이션 시각 t(초)에서의 전체 궤도 상태
  // a_m: 장반경(m), e: 이심률
  function stateAtTime(t_sec, a_m, e) {
    var T = periodSec(a_m);
    var n = 2 * Math.PI / T; // 평균운동
    var M = n * t_sec;
    M = M % (2 * Math.PI);
    if (M < 0) M += 2 * Math.PI;

    var E = solveKepler(M, e);
    var r = a_m * (1 - e * Math.cos(E));
    var nu = trueAnomalyFromE(E, e);
    if (nu < 0) nu += 2 * Math.PI;

    var v = velocity(r, a_m);
    var x = r * Math.cos(nu); // 지구는 초점(0,0), 근지점이 +x축 방향
    var y = r * Math.sin(nu);

    return { t: t_sec, M: M, E: E, r: r, nu: nu, v: v, x: x, y: y, T: T, n: n };
  }

  return {
    GM_E: GM_E,
    R_E_KM: R_E_KM,
    SIDEREAL_DAY: SIDEREAL_DAY,
    OMEGA_EARTH: OMEGA_EARTH,
    periodSec: periodSec,
    velocity: velocity,
    rPerigee: rPerigee,
    rApogee: rApogee,
    solveKepler: solveKepler,
    trueAnomalyFromE: trueAnomalyFromE,
    radiusAtNu: radiusAtNu,
    stateAtTime: stateAtTime
  };
})();
