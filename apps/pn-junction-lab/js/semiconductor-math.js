/* semiconductor-math.js — 공용 순수 계산 함수 (모든 섹션에서 재사용)
 * 반복 최적화 없이 닫힌 형태 공식으로만 계산한다.
 */

// --- 온도 스케일링 유효상태밀도: N_c(T) = N_C_300 * (T/300)^1.5 ---
function Nc(T) {
  return N_C_300 * Math.pow(T / 300, 1.5);
}
function Nv(T) {
  return N_V_300 * Math.pow(T / 300, 1.5);
}

// --- 진성 캐리어 농도 n_i(T) = sqrt(N_c(T) N_v(T)) exp(-E_g / 2 k_B T) ---
function nI(T) {
  return Math.sqrt(Nc(T) * Nv(T)) * Math.exp(-E_G / (2 * K_B_EV * T));
}

// --- 내장전위 V_bi = (k_B T) ln(N_A N_D / n_i^2)  [k_B T는 eV 단위 = V] ---
function vBi(NA, ND, T) {
  var ni = nI(T);
  return K_B_EV * T * Math.log((NA * ND) / (ni * ni));
}

// --- 아인슈타인 관계식: D = (k_B T / e) * mu.  k_B T가 이미 eV(=V) 단위이므로 D = k_B T[eV] * mu ---
function Dn(T) {
  return K_B_EV * T * MU_N;
}
function Dp(T) {
  return K_B_EV * T * MU_P;
}

// --- 소수캐리어 확산길이 L = sqrt(D * tau) ---
function Ln(T) {
  return Math.sqrt(Dn(T) * TAU_N);
}
function Lp(T) {
  return Math.sqrt(Dp(T) * TAU_P);
}

// --- 공핍층 폭: W = sqrt( (2 eps (V_bi - V) / q) * (1/N_A + 1/N_D) ) ---
// Vbi - V가 음수(강한 순방향)가 되면 물리적으로 공핍층이 사라지므로 0으로 클램프한다.
function depletionWidth(Vbi_, V, NA, ND) {
  var diff = Vbi_ - V;
  if (diff <= 0) return 0;
  return Math.sqrt((2 * EPS_SI * diff / Q) * (1 / NA + 1 / ND));
}

// --- 전기적 중성조건에 따른 W 분배: N_A x_p = N_D x_n, x_p + x_n = W ---
function depletionSplit(W, NA, ND) {
  var xp = W * ND / (NA + ND);
  var xn = W * NA / (NA + ND);
  return { xp: xp, xn: xn };
}

// --- 최대 전기장: E_max = q N_A x_p / eps = q N_D x_n / eps (두 식이 항상 일치) ---
function maxField(NA, xp) {
  return Q * NA * xp / EPS_SI;
}

// --- 전기장 프로파일 E(x): -x_p<x<0에서 E = -(q N_A/eps)(x+x_p), 0<x<x_n에서 E = -(q N_D/eps)(x_n - x) ---
function fieldAt(x, NA, ND, xp, xn) {
  if (x >= -xp && x < 0) {
    return -(Q * NA / EPS_SI) * (x + xp);
  } else if (x >= 0 && x <= xn) {
    return -(Q * ND / EPS_SI) * (xn - x);
  }
  return 0;
}

// --- 전위 프로파일 φ(x): E = -dφ/dx를 적분한 두 포물선. 기준점 φ(-x_p)=0 ---
// 영역1(-x_p<=x<=0): φ(x) = (q N_A / 2eps)(x+x_p)^2
// 영역2(0<=x<=x_n):  φ(x) = φ(0) + (q N_D/eps)(x_n x - x^2/2)
function potentialAt(x, NA, ND, xp, xn) {
  var phi0 = (Q * NA / (2 * EPS_SI)) * xp * xp;
  if (x <= 0) {
    var xc = Math.max(x, -xp);
    return (Q * NA / (2 * EPS_SI)) * (xc + xp) * (xc + xp);
  } else {
    var xc2 = Math.min(x, xn);
    return phi0 + (Q * ND / EPS_SI) * (xn * xc2 - xc2 * xc2 / 2);
  }
}

// --- 평형 소수캐리어 농도 (질량작용법칙 np = n_i^2) ---
function pN0(ND, T) {
  var ni = nI(T);
  return (ni * ni) / ND;
}
function nP0(NA, T) {
  var ni = nI(T);
  return (ni * ni) / NA;
}

// --- 쇼클리 포화전류: I0 = q A ( D_p p_n0/L_p + D_n n_p0/L_n ) ---
function saturationCurrent(NA, ND, T, A) {
  var pn0 = pN0(ND, T);
  var np0 = nP0(NA, T);
  return Q * A * (Dp(T) * pn0 / Lp(T) + Dn(T) * np0 / Ln(T));
}

// --- 쇼클리 다이오드 방정식: I(V) = I0 (exp(V / (k_B T[eV])) - 1) ---
// k_B T가 eV 단위이므로 e^{eV/k_BT}의 지수는 그대로 V/(K_B_EV*T)로 계산된다.
function diodeCurrent(I0, V, T) {
  return I0 * (Math.exp(V / (K_B_EV * T)) - 1);
}

// --- 한 파라미터 세트로부터 모든 파생값을 한번에 계산(각 섹션에서 공용으로 사용) ---
function computeJunction(NA, ND, T, V, A) {
  var ni = nI(T);
  var vbi = vBi(NA, ND, T);
  var W = depletionWidth(vbi, V, NA, ND);
  var split = depletionSplit(W, NA, ND);
  var xp = split.xp, xn = split.xn;
  var Emax = W > 0 ? maxField(NA, xp) : 0;
  var Emax2 = W > 0 ? maxField(ND, xn) : 0; // 검산용: Emax와 같아야 함
  var I0 = saturationCurrent(NA, ND, T, A);
  var I = diodeCurrent(I0, V, T);
  var thermalV = K_B_EV * T; // ≈0.0259V @300K

  return {
    NA: NA, ND: ND, T: T, V: V, A: A,
    ni: ni,
    vbi: vbi,
    W: W, xp: xp, xn: xn,
    Emax: Emax, Emax2: Emax2,
    Dn: Dn(T), Dp: Dp(T), Ln: Ln(T), Lp: Lp(T),
    pn0: pN0(ND, T), np0: nP0(NA, T),
    I0: I0, I: I,
    thermalV: thermalV
  };
}

// --- 밴드 다이어그램용: Ec-Ei, Ei-Ev (자기일관성: 합이 항상 E_G와 같음) ---
function ecMinusEi(T) {
  return K_B_EV * T * Math.log(Nc(T) / nI(T));
}
function eiMinusEv(T) {
  return K_B_EV * T * Math.log(Nv(T) / nI(T));
}
// EF 위치(진성준위 기준): n형은 위(+), p형은 아래(-)
function efMinusEiN(ND, T) {
  return K_B_EV * T * Math.log(ND / nI(T));
}
function eiMinusEfP(NA, T) {
  return K_B_EV * T * Math.log(NA / nI(T));
}

/* ===================== 표시용 포맷 함수 (물리량이 아닌 UI 유틸) ===================== */

var SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '-': '⁻', '+': ''
};

function toSuperscript(str) {
  var out = '';
  for (var i = 0; i < str.length; i++) {
    out += SUPERSCRIPT_MAP.hasOwnProperty(str[i]) ? SUPERSCRIPT_MAP[str[i]] : str[i];
  }
  return out;
}

// "3.2×10¹⁷" 형태의 과학적 표기
function sciNotation(value, sigDigits) {
  if (sigDigits === undefined) sigDigits = 2;
  if (value === 0) return '0';
  var sign = value < 0 ? '-' : '';
  var abs = Math.abs(value);
  var exp = Math.floor(Math.log10(abs));
  var mantissa = abs / Math.pow(10, exp);
  // 반올림 시 10.0 으로 올라가는 경우 보정
  var mantissaStr = mantissa.toFixed(sigDigits);
  if (parseFloat(mantissaStr) >= 10) {
    exp += 1;
    mantissa = abs / Math.pow(10, exp);
    mantissaStr = mantissa.toFixed(sigDigits);
  }
  return sign + mantissaStr + '×10' + toSuperscript(String(exp));
}

// 농도 표기: "3.2×10¹⁷ cm⁻³"
function formatConcentration(value) {
  return sciNotation(value, 2) + ' cm' + toSuperscript('-3');
}

// 길이(cm 단위 입력) -> nm 또는 µm로 자동 변환
function formatLength(cm) {
  if (cm === 0) return '0 nm';
  var nm = cm * 1e7;
  if (Math.abs(nm) < 1000) {
    return nm.toFixed(1) + ' nm';
  }
  var um = cm * 1e4;
  return um.toFixed(3) + ' µm';
}

// 전류(A 단위 입력) -> 자동 단위(A/mA/µA/nA/pA/fA), 부호 유지
function formatCurrent(amps) {
  if (amps === 0) return '0 A';
  var sign = amps < 0 ? '-' : '';
  var abs = Math.abs(amps);
  var units = [
    { th: 1, suffix: 'A' },
    { th: 1e-3, suffix: 'mA' },
    { th: 1e-6, suffix: 'µA' },
    { th: 1e-9, suffix: 'nA' },
    { th: 1e-12, suffix: 'pA' },
    { th: 1e-15, suffix: 'fA' }
  ];
  for (var i = 0; i < units.length; i++) {
    if (abs >= units[i].th) {
      return sign + (abs / units[i].th).toFixed(3) + ' ' + units[i].suffix;
    }
  }
  return sign + sciNotation(abs, 2) + ' A';
}

// 전기장(V/cm 입력) -> 자동 단위(V/cm 또는 kV/cm, MV/cm)
function formatField(vpercm) {
  var abs = Math.abs(vpercm);
  if (abs >= 1e6) return (vpercm / 1e6).toFixed(3) + ' MV/cm';
  if (abs >= 1e3) return (vpercm / 1e3).toFixed(2) + ' kV/cm';
  return vpercm.toFixed(1) + ' V/cm';
}
