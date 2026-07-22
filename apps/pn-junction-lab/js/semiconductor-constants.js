/* semiconductor-constants.js — 실리콘 재료상수 (물리전자와_반도체공학 §9~11 근거)
 * 이 파일의 상수는 임의로 바꾸지 않는다. 검산 기준(n_i(300), V_bi 범위 등)이 이 값들에 근거한다.
 */

var E_G = 1.12;              // 실리콘 띠간격, eV
var N_C_300 = 2.8e19;        // 전도띠 유효상태밀도 @300K, cm^-3
var N_V_300 = 1.04e19;       // 가전자띠 유효상태밀도 @300K, cm^-3
var EPS_SI = 1.036e-12;      // 실리콘 유전율 ε = ε_r*ε0, F/cm (ε_r=11.7)
var Q = 1.602e-19;           // 전자전하, C
var K_B_EV = 8.617e-5;       // 볼츠만 상수, eV/K
var MU_N = 1350;             // 전자 이동도 @300K, cm^2/(V·s)
var MU_P = 480;              // 정공 이동도 @300K, cm^2/(V·s)
var TAU_N = 1e-6;            // 전자 소수캐리어 수명, s
var TAU_P = 1e-6;            // 정공 소수캐리어 수명, s

// 슬라이더 범위 상수 (UI 전역에서 재사용)
var DOPING_MIN = 1e14;       // cm^-3
var DOPING_MAX = 1e19;       // cm^-3
var TEMP_MIN = 250;          // K
var TEMP_MAX = 450;          // K
var VOLTAGE_MIN = -1.0;      // V
var VOLTAGE_MAX = 0.7;       // V
var AREA_MIN = 1e-6;         // cm^2
var AREA_MAX = 1e-2;         // cm^2
var AREA_DEFAULT = 1e-4;     // cm^2
