// rain.js - ITU-R P.618 강우감쇠 + ITU-R P.838 k,alpha 계수 lookup
// (전역 변수 방식, type="module" 사용 안 함)
//
// 근거: 위성통신_소스.tex \section{대기와 강우감쇠: ITU-R 모델} (859절)
//   gamma_R = k * R^alpha [dB/km]           (P.838 회귀계수)
//   L_S = (h_R - h_S) / sin(theta)          (슬랜트 경로장)
//   L_G = L_S * cos(theta)                  (수평투영 경로장)
//   L_E = L_S * r                           (유효경로장, r=경로축소계수)
//   A_0.01 = gamma_R * L_E                  [dB]

var RainModel = (function () {
  'use strict';

  // ITU-R P.838-3 근사 계수표 (수평/수직 편파). 출처: ITU-R P.838-3 권고안에서
  // 흔히 쓰이는 근사 계수표. 임의로 만들지 않고 build 지침에 명시된 표 값을 그대로 사용.
  // 원형 편파는 H/V 평균으로 단순화(k=(kH+kV)/2, alpha=(alphaH+alphaV)/2).
  var P838_TABLE = [
    { f: 1,  kH: 0.0000387, aH: 0.912, kV: 0.0000352, aV: 0.880 },
    { f: 2,  kH: 0.000154,  aH: 0.963, kV: 0.000138,  aV: 0.923 },
    { f: 4,  kH: 0.000650,  aH: 1.121, kV: 0.000591,  aV: 1.075 },
    { f: 6,  kH: 0.00175,   aH: 1.308, kV: 0.00155,   aV: 1.265 },
    { f: 7,  kH: 0.00301,   aH: 1.332, kV: 0.00265,   aV: 1.312 },
    { f: 8,  kH: 0.00454,   aH: 1.327, kV: 0.00395,   aV: 1.310 },
    { f: 10, kH: 0.0101,    aH: 1.276, kV: 0.00887,   aV: 1.264 },
    { f: 12, kH: 0.0188,    aH: 1.217, kV: 0.0168,    aV: 1.200 },
    { f: 15, kH: 0.0367,    aH: 1.154, kV: 0.0335,    aV: 1.128 },
    { f: 20, kH: 0.0751,    aH: 1.099, kV: 0.0691,    aV: 1.065 },
    { f: 25, kH: 0.124,     aH: 1.061, kV: 0.113,     aV: 1.030 },
    { f: 30, kH: 0.187,     aH: 1.021, kV: 0.167,     aV: 1.000 },
    { f: 35, kH: 0.263,     aH: 0.979, kV: 0.233,     aV: 0.963 },
    { f: 40, kH: 0.350,     aH: 0.939, kV: 0.310,     aV: 0.929 }
  ];

  // 로그축(log-log) 선형보간: log10(value)를 log10(f)에 대해 선형보간.
  // f가 표 범위를 벗어나면 양끝 값으로 clamp.
  function interpLogLog(f, key) {
    var n = P838_TABLE.length;
    if (f <= P838_TABLE[0].f) return P838_TABLE[0][key];
    if (f >= P838_TABLE[n - 1].f) return P838_TABLE[n - 1][key];

    for (var i = 0; i < n - 1; i++) {
      var lo = P838_TABLE[i];
      var hi = P838_TABLE[i + 1];
      if (f >= lo.f && f <= hi.f) {
        var logF = Math.log10(f);
        var logFlo = Math.log10(lo.f);
        var logFhi = Math.log10(hi.f);
        var logVlo = Math.log10(lo[key]);
        var logVhi = Math.log10(hi[key]);
        var t = (logF - logFlo) / (logFhi - logFlo);
        var logV = logVlo + t * (logVhi - logVlo);
        return Math.pow(10, logV);
      }
    }
    return P838_TABLE[n - 1][key]; // 안전망
  }

  // 원형 편파용 k, alpha (H/V 평균)
  function kAlpha(fc_GHz) {
    var kH = interpLogLog(fc_GHz, 'kH');
    var aH = interpLogLog(fc_GHz, 'aH');
    var kV = interpLogLog(fc_GHz, 'kV');
    var aV = interpLogLog(fc_GHz, 'aV');
    return {
      k: (kH + kV) / 2,
      alpha: (aH + aV) / 2
    };
  }

  // 비감쇠계수 gamma_R = k * R^alpha [dB/km]
  function specificAttenuation(R_mmh, fc_GHz) {
    if (R_mmh <= 0) return 0;
    var ka = kAlpha(fc_GHz);
    return ka.k * Math.pow(R_mmh, ka.alpha);
  }

  // 슬랜트 경로장 L_S = (h_R - h_S) / sin(theta) [km]
  function slantPathLength_km(hR_km, hS_km, elevation_deg) {
    var diff = hR_km - hS_km;
    if (diff <= 0) return 0; // 지상국이 강우고도보다 높으면 강우경로 없음
    var elRad = elevation_deg * Math.PI / 180;
    var sinEl = Math.sin(elRad);
    if (sinEl <= 0) return 0;
    return diff / sinEl;
  }

  // ITU-R P.618-13 수평 경로 축소계수(간이식, build 지침 명시):
  //   r_0.01 = 1 / (1 + 0.78*sqrt(L_G*gammaR/f_GHz) - 0.38*(1-exp(-2*L_G)))
  // 주의: 공식 ITU-R P.618-13 절차는 이후 수직 조정계수(zeta, Lr, chi 등)까지
  // 이어지지만, 이 앱은 "수평 축소계수까지만 적용한 단순화 모델"이다.
  function pathReductionFactor(LG_km, gammaR_dBkm, fc_GHz) {
    if (LG_km <= 0) return 1;
    var sq = Math.sqrt(LG_km * gammaR_dBkm / fc_GHz);
    var denom = 1 + 0.78 * sq - 0.38 * (1 - Math.exp(-2 * LG_km));
    if (denom <= 0) return 1;
    return 1 / denom;
  }

  // 종합: 강우감쇠 A_0.01 계산
  // 반환: { gammaR, LS, LG, r, LE, A001, k, alpha }
  function rainAttenuation(params) {
    var fc_GHz = params.fc_GHz;
    var elevation_deg = params.elevation_deg;
    var hR_km = params.hR_km;
    var hS_km = params.hS_km;
    var R001_mmh = params.R001_mmh;

    var gammaR = specificAttenuation(R001_mmh, fc_GHz);
    var LS = slantPathLength_km(hR_km, hS_km, elevation_deg);
    var elRad = elevation_deg * Math.PI / 180;
    var LG = LS * Math.cos(elRad);
    var r = pathReductionFactor(LG, gammaR, fc_GHz);
    var LE = LS * r;
    var A001 = gammaR * LE;

    var ka = kAlpha(fc_GHz);

    return {
      gammaR: gammaR,
      LS: LS,
      LG: LG,
      r: r,
      LE: LE,
      A001: A001,
      k: ka.k,
      alpha: ka.alpha
    };
  }

  return {
    P838_TABLE: P838_TABLE,
    kAlpha: kAlpha,
    specificAttenuation: specificAttenuation,
    slantPathLength_km: slantPathLength_km,
    pathReductionFactor: pathReductionFactor,
    rainAttenuation: rainAttenuation
  };
})();
