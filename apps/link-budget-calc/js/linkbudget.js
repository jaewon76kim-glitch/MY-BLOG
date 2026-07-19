// linkbudget.js - 링크버짓 핵심 계산 모듈 (전역 변수 방식, type="module" 사용 안 함)
//
// 근거: 위성통신_소스.tex
//   - \section{자유공간 경로손실과 프리스 공식} (148절)      → 자유공간 경로손실 dB식
//   - \section{링크버짓, 수신감도, 아웃티지 확률} (231절)    → Es/N0, 수신감도, 아웃티지(Q함수)
//   - \section{위성 링크버짓의 완성: EIRP와 G/T} (905절)     → EIRP, Tsys, G/T, 업/다운링크 합산식

var LinkBudget = (function () {
  'use strict';

  // ---- 물리 상수 ----
  var T0 = 290;            // 잡음지수 기준온도 [K] (tex 905절: T_e = T0(F-1))
  var KB = 1.380649e-23;   // 볼츠만 상수 [J/K] (CODATA)

  // 볼츠만 상수를 dB로: 10*log10(kB) ≈ -228.6 dBW/K/Hz
  // (링크버짓에서 흔히 쓰이는 "-228.6 dBW/K/Hz" 상수. 항상 수식으로 계산해
  //  하드코딩 오탈자를 방지한다.)
  var KB_DB = 10 * Math.log10(KB);

  var RE_KM = 6371; // 지구 평균 반경 [km] (apps/doppler-sim/js/sim.js와 동일 값 사용)

  // ---- 2.1 EIRP (tex 905절: EIRP_dBW = Pt_dBW + GT_dB) ----
  function eirp_dBW(Pt_dBW, GT_dB) {
    return Pt_dBW + GT_dB;
  }

  // ---- 2.2 G/T (tex 905절) ----
  // Te = T0*(F-1) [F는 선형 잡음지수], Tsys = Tant + Te, (G/T)_dB = GR_dB - 10log10(Tsys)
  function noiseFigure_linear(F_dB) {
    return Math.pow(10, F_dB / 10);
  }

  function equivNoiseTemp_K(F_dB) {
    var F_lin = noiseFigure_linear(F_dB);
    return T0 * (F_lin - 1);
  }

  function sysNoiseTemp_K(Tant_K, F_dB) {
    return Tant_K + equivNoiseTemp_K(F_dB);
  }

  function gt_dB(GR_dB, Tsys_K) {
    return GR_dB - 10 * Math.log10(Tsys_K);
  }

  // ---- 궤도 기하: 슬랜트 거리 (apps/doppler-sim/js/sim.js의 slantRange와 동일한
  // 구면 기하 공식 사용 — 지구반경 Re, 고도 h, 앙각 El) ----
  // d = sqrt((Re+h)^2 - (Re*cosEl)^2) - Re*sinEl
  function slantRange_km(h_km, elevation_deg) {
    var elRad = elevation_deg * Math.PI / 180;
    var cosEl = Math.cos(elRad);
    var sinEl = Math.sin(elRad);
    var inner = Math.pow(RE_KM + h_km, 2) - Math.pow(RE_KM * cosEl, 2);
    if (inner < 0) inner = 0;
    var d = Math.sqrt(inner) - RE_KM * sinEl;
    return Math.max(d, h_km);
  }

  // ---- 2.3 자유공간 경로손실 (tex 148절 dB 실무식, 231절에서 재인용) ----
  // L_FS,dB(d) = 20log10(d_km) + 20log10(f_MHz) + 32.44
  function freeSpaceLoss_dB(d_km, fc_GHz) {
    var f_MHz = fc_GHz * 1000;
    return 20 * Math.log10(d_km) + 20 * Math.log10(f_MHz) + 32.44;
  }

  // ---- 2.5 Es/N0 (tex 905절 요약식) ----
  // Es/N0|dB = EIRP_dBW + (G/T)_dB - Lp_dB - A_rain - kB_dB - Rs_dB - Lrf_dB
  function symbolRate_dB(Rs_Msps) {
    var Rs_Hz = Rs_Msps * 1e6;
    return 10 * Math.log10(Rs_Hz);
  }

  function esN0_dB(EIRP_dBW, GT_dB, Lp_dB, Arain_dB, Rs_dB, Lrf_dB) {
    return EIRP_dBW + GT_dB - Lp_dB - Arain_dB - KB_DB - Rs_dB - Lrf_dB;
  }

  function linkMargin_dB(EsN0_dB_val, EsN0min_dB) {
    return EsN0_dB_val - EsN0min_dB;
  }

  // ---- 2.5 수신감도 / 최대허용 경로손실 (보조 지표) ----
  // tex 231절(272~292행): 수신감도는 요구 (Es/N0)_min을 만족하는 "문턱 수신전력"이며
  // 실제 경로손실과 무관하게 Tsys, Rs, (Es/N0)_min만으로 정해진다.
  //   N0_dBW/Hz = kB_dB + 10log10(Tsys)
  //   S_rx,dBW = (Es/N0)_min,dB + Rs_dB + N0_dBW/Hz
  // 최대허용 경로손실은 spec 2.5의 "S_rx,dBm = Pt+GT+GR-Lp" 관계를, 위 문턱값과
  // 결합해 "현재 EIRP·GR로 문턱을 만족시키는 최대 Lp"로 뒤집어 구한다(A_rain, L_rf는
  // tex 원문의 단순화된 수신감도 정의를 따라 제외):
  //   L_p,max,dB = EIRP_dBW + GR_dB - S_rx,dBW
  function sensitivity_dBW(EsN0min_dB, Rs_dB, Tsys_K) {
    var N0_dBW_per_Hz = KB_DB + 10 * Math.log10(Tsys_K);
    return EsN0min_dB + Rs_dB + N0_dBW_per_Hz;
  }

  function maxAllowablePathLoss_dB(EIRP_dBW, GR_dB, Srx_dBW) {
    return EIRP_dBW + GR_dB - Srx_dBW;
  }

  // ---- 2.7 아웃티지 확률 (tex 231절) ----
  // O_N = Q(M_shad/sigma_s), Q(.)는 Abramowitz-Stegun 근사(26.2.17, |오차| < 7.5e-8)
  function qFunction(x) {
    if (x < 0) return 1 - qFunction(-x);
    var t = 1 / (1 + 0.2316419 * x);
    var d = 0.3989422804014327 * Math.exp(-x * x / 2); // 1/sqrt(2*pi) * exp(-x^2/2)
    var poly = t * (0.319381530 +
      t * (-0.356563782 +
      t * (1.781477937 +
      t * (-1.821255978 +
      t * 1.330274429))));
    return d * poly;
  }

  function outageProbability(margin_dB, sigma_s_dB) {
    if (sigma_s_dB <= 0) return margin_dB >= 0 ? 0 : 1;
    return qFunction(margin_dB / sigma_s_dB);
  }

  return {
    T0: T0,
    KB: KB,
    KB_DB: KB_DB,
    RE_KM: RE_KM,
    eirp_dBW: eirp_dBW,
    noiseFigure_linear: noiseFigure_linear,
    equivNoiseTemp_K: equivNoiseTemp_K,
    sysNoiseTemp_K: sysNoiseTemp_K,
    gt_dB: gt_dB,
    slantRange_km: slantRange_km,
    freeSpaceLoss_dB: freeSpaceLoss_dB,
    symbolRate_dB: symbolRate_dB,
    esN0_dB: esN0_dB,
    linkMargin_dB: linkMargin_dB,
    sensitivity_dBW: sensitivity_dBW,
    maxAllowablePathLoss_dB: maxAllowablePathLoss_dB,
    qFunction: qFunction,
    outageProbability: outageProbability
  };
})();
