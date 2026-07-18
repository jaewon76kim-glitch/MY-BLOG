// sim.js - 물리 계산 모듈 (전역 변수 방식, type="module" 사용 안 함)

var DopplerSim = (function () {
  var C = 3e8;           // 빛의 속도 m/s
  var R_E = 6371;        // 지구 반경 km
  var MU = 3.986e14;     // 지구 중력 상수 m^3/s^2

  // 슬랜트 레인지 계산 (km)
  // El: 앙각 (radians), 음수 허용 (지평선 아래)
  function slantRange(h_km, El_rad) {
    var Re = R_E;
    var hh = h_km;
    var cosEl = Math.cos(El_rad);
    var sinEl = Math.sin(El_rad);
    // El 음수면 지평선 너머 → R 크게 되지만 계산은 유지
    var inner = Math.pow(Re + hh, 2) - Math.pow(Re * cosEl, 2);
    if (inner < 0) inner = 0;
    var R = Math.sqrt(inner) - Re * sinEl;
    return Math.max(R, hh); // 최소 고도만큼은 보장
  }

  // 위성 궤도 속도 (m/s)
  function orbitalVelocity(h_km) {
    var r = (R_E + h_km) * 1000; // m
    return Math.sqrt(MU / r);
  }

  // 통과 총 시간 계산 (초) — 지평선~천정~지평선 근사
  function passTime(h_km, El_max_deg) {
    var El_max_rad = El_max_deg * Math.PI / 180;
    var v = orbitalVelocity(h_km);
    var r = (R_E + h_km) * 1000; // m
    return (2 * El_max_rad * r) / v;
  }

  // 시뮬레이션 상태
  var state = {
    h_km: 550,
    f_carrier_hz: 12e9,
    El_max_deg: 90,
    speedMul: 1,
    playing: false,
    t: 0,           // 진행도 [0, 1]
    prevR: null,
    elapsedSec: 0,  // 실제(시뮬) 경과 시간(초)
    totalTimeSec: 0
  };

  // 현재 t에서 앙각 계산 (radians)
  // t in [0,1]: 0=진입(지평선), 0.5=천정, 1=이탈(지평선)
  // El(t) = El_max * sin(π * t)
  function elevationAt(t) {
    var El_max_rad = state.El_max_deg * Math.PI / 180;
    return El_max_rad * Math.sin(Math.PI * t);
  }

  // 시뮬레이션 1스텝 진행, 결과 반환
  function step(dtSec) {
    var T = state.totalTimeSec;
    if (T <= 0) T = 1;

    // t 진행
    state.t += (dtSec * state.speedMul) / T;
    if (state.t > 1) state.t = 1;

    state.elapsedSec += dtSec * state.speedMul;

    var El_rad = elevationAt(state.t);
    var R_km = slantRange(state.h_km, El_rad);
    var R_m = R_km * 1000;

    // 수치 미분으로 radial_v 계산
    var dR_dt = 0;
    if (state.prevR !== null) {
      // dtSec * speedMul = 실제 시뮬레이션 시간 진행량
      var simDtSec = dtSec * state.speedMul;
      if (simDtSec > 0) {
        dR_dt = (R_m - state.prevR) / simDtSec; // m/s
      }
    }
    state.prevR = R_m;

    // 도플러 천이 (Hz)
    // f_d = -f_carrier * (dR/dt) / C
    // dR/dt 양수 → 거리 증가 → 멀어짐 → 적색편이 → f_d 음수
    // dR/dt 음수 → 거리 감소 → 접근 → 청색편이 → f_d 양수
    var f_d = -state.f_carrier_hz * (dR_dt / C);

    // RTT (ms)
    var RTT = 2 * R_km * 1000 / C * 1000;

    // 앙각 0 이상이면 가시
    var visible = El_rad >= 0;

    return {
      t: state.t,
      El_deg: El_rad * 180 / Math.PI,
      El_rad: El_rad,
      R_km: R_km,
      f_d_khz: f_d / 1000,
      RTT_ms: RTT,
      visible: visible,
      elapsedSec: state.elapsedSec,
      done: state.t >= 1
    };
  }

  function reset(params) {
    if (params) {
      if (params.h_km !== undefined) state.h_km = params.h_km;
      if (params.f_ghz !== undefined) state.f_carrier_hz = params.f_ghz * 1e9;
      if (params.El_max_deg !== undefined) state.El_max_deg = params.El_max_deg;
      if (params.speedMul !== undefined) state.speedMul = params.speedMul;
    }
    state.t = 0;
    state.prevR = null;  // 첫 프레임에서 설정됨 (f_d = 0으로 시작)
    state.elapsedSec = 0;
    state.totalTimeSec = passTime(state.h_km, state.El_max_deg);
  }

  function setPlaying(val) {
    state.playing = val;
  }

  function isPlaying() {
    return state.playing;
  }

  function isDone() {
    return state.t >= 1;
  }

  function getState() {
    return state;
  }

  function setSpeedMul(val) {
    state.speedMul = val;
  }

  // 최대 도플러 추정 (kHz) — 차트 Y축 범위용
  // sin(π*t) 모델에서 피크 |dR/dt| = π * Re * v / (2*(Re+h))
  // (El_max에 무관하게 동일 — passtime 공식과 상쇄됨)
  function maxDoppler_kHz() {
    var v = orbitalVelocity(state.h_km);
    var Re_m = R_E * 1000;
    var h_m = state.h_km * 1000;
    var radial_v_max = Math.PI * Re_m * v / (2 * (Re_m + h_m));
    return state.f_carrier_hz * radial_v_max / C / 1000;
  }

  return {
    step: step,
    reset: reset,
    setPlaying: setPlaying,
    isPlaying: isPlaying,
    isDone: isDone,
    getState: getState,
    setSpeedMul: setSpeedMul,
    maxDoppler_kHz: maxDoppler_kHz,
    orbitalVelocity: orbitalVelocity,
    passTime: passTime,
    slantRange: slantRange,
    elevationAt: elevationAt
  };
})();
