// main.js - 상태관리 / 이벤트 바인딩 / 애니메이션 루프 (전역 변수 방식, type="module" 사용 안 함)

(function () {
  'use strict';

  // ---- DOM 참조 ----
  var sliderA = document.getElementById('slider-a');
  var sliderE = document.getElementById('slider-e');
  var sliderI = document.getElementById('slider-i');
  var valA = document.getElementById('val-a');
  var valE = document.getElementById('val-e');
  var valI = document.getElementById('val-i');

  var btnPlay = document.getElementById('btn-play');
  var btnReset = document.getElementById('btn-reset');

  var warnBox = document.getElementById('warn-box');

  var sumT = document.getElementById('sum-T');
  var sumVp = document.getElementById('sum-vp');
  var sumVa = document.getElementById('sum-va');
  var sumVt = document.getElementById('sum-vt');
  var sumRpAlt = document.getElementById('sum-rpalt');
  var sumRaAlt = document.getElementById('sum-raalt');
  var sumEcc = document.getElementById('sum-ecc');
  var sumSma = document.getElementById('sum-sma');
  var presetBadge = document.getElementById('val-presetbadge');

  var canvasOrbit = document.getElementById('orbit-canvas');
  var canvasGround = document.getElementById('groundtrack-canvas');

  // ---- 프리셋 정의 (LEO/MEO/GEO, 모두 원궤도 e=0 기본값) ----
  var PRESETS = {
    LEO: 6928,   // 6378 + 550 km (Starlink 예시)
    MEO: 26578,  // 6378 + 20200 km (GPS 예시)
    GEO: 42164
  };

  // ---- 상태 ----
  var params = {
    a_km: PRESETS.LEO,
    e: 0,
    i_deg: 51.6,
    speedMul: 1,
    preset: 'LEO'
  };

  var TARGET_CYCLE_SEC = 20; // speedMul=1일 때 한 바퀴를 도는 데 걸리는 대략적 실제 시간(초)

  var playing = false;
  var rafId = null;
  var lastTimestamp = null;

  var simTimeSec = 0;   // 궤도 시뮬레이션 누적 시간(초) — 케플러 방정식 M(t)=n*t 에 사용
  var currentT = 0;     // 현재 궤도주기(초)
  var timeScaleAuto = 1; // 실제 1초당 시뮬레이션 진행 초(자동 스케일)

  var groundTrackPoints = []; // {lon, lat, t}

  // ---- 초기화 ----
  function init() {
    KeplerRenderer.init(canvasOrbit);
    KeplerGroundTrack.init(canvasGround);

    sliderA.addEventListener('input', function () {
      params.a_km = parseFloat(this.value);
      params.preset = null;
      valA.textContent = formatKm(params.a_km);
      updatePresetHighlight();
      onOrbitParamChange();
    });

    sliderE.addEventListener('input', function () {
      params.e = parseFloat(this.value);
      valE.textContent = params.e.toFixed(2);
      onOrbitParamChange();
    });

    sliderI.addEventListener('input', function () {
      params.i_deg = parseFloat(this.value);
      valI.textContent = params.i_deg.toFixed(1) + '°';
      groundTrackPoints = []; // 경사각이 바뀌면 이전 지상궤적 이력은 무의미하므로 초기화
    });

    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = this.getAttribute('data-preset');
        var a = PRESETS[key];
        params.a_km = a;
        params.e = 0;
        params.preset = key;
        sliderA.value = a;
        sliderE.value = 0;
        valA.textContent = formatKm(a);
        valE.textContent = '0.00';
        updatePresetHighlight();
        onOrbitParamChange();
      });
    });

    document.querySelectorAll('[data-speed]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        params.speedMul = parseFloat(this.getAttribute('data-speed'));
        document.querySelectorAll('[data-speed]').forEach(function (b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
      });
    });

    btnPlay.addEventListener('click', function () {
      if (playing) pause(); else play();
    });

    btnReset.addEventListener('click', function () {
      pause();
      resetOrbit();
      renderStatic();
    });

    window.addEventListener('resize', function () {
      KeplerRenderer.resize();
      KeplerGroundTrack.resize();
      renderStatic();
    });

    resetOrbit();
    renderStatic();
  }

  // a 또는 e 슬라이더/프리셋 변경 시: 애니메이션을 리셋하고 새 궤도로 다시 시작한다(규칙 5)
  function onOrbitParamChange() {
    var wasPlaying = playing;
    pause();
    resetOrbit();
    renderStatic();
    if (wasPlaying) play();
  }

  function resetOrbit() {
    simTimeSec = 0;
    var a_m = params.a_km * 1000;
    currentT = KeplerOrbit.periodSec(a_m);
    timeScaleAuto = currentT / TARGET_CYCLE_SEC;
    KeplerRenderer.resetSector();
    groundTrackPoints = [];
  }

  function play() {
    playing = true;
    btnPlay.textContent = '⏸ 일시정지';
    lastTimestamp = null;
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    playing = false;
    btnPlay.textContent = '▶ 재생';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // 재생 중일 때만 requestAnimationFrame 루프 동작(규칙 6)
  function loop(ts) {
    if (!playing) return;

    if (lastTimestamp === null) lastTimestamp = ts;
    var dtReal = (ts - lastTimestamp) / 1000;
    lastTimestamp = ts;
    dtReal = Math.min(dtReal, 0.05); // 탭 전환 등으로 인한 큰 점프 방지

    var dtSim = dtReal * timeScaleAuto * params.speedMul;
    simTimeSec += dtSim;

    stepAndRender();
    rafId = requestAnimationFrame(loop);
  }

  function stepAndRender() {
    var a_m = params.a_km * 1000;
    var st = KeplerOrbit.stateAtTime(simTimeSec, a_m, params.e);

    var windowSec = currentT * 0.03; // 면적속도 부채꼴에 사용할 슬라이딩 시간창(궤도주기의 3%)
    KeplerRenderer.pushSectorPoint(st.x, st.y, simTimeSec, windowSec);
    KeplerRenderer.draw(a_m, params.e, st);

    updateNumericPanel(st);
    updateGroundTrack(st, true);
  }

  // 정지 상태(재생 전/리셋 직후)에서도 캔버스와 수치 패널을 최신 상태로 그림
  function renderStatic() {
    var a_m = params.a_km * 1000;
    var st = KeplerOrbit.stateAtTime(simTimeSec, a_m, params.e);
    KeplerRenderer.draw(a_m, params.e, st);
    updateNumericPanel(st);
    updateGroundTrack(st, false);
  }

  function updateNumericPanel(st) {
    var a_m = params.a_km * 1000;
    var T = currentT;

    sumT.textContent = formatTime(T);

    var vp = KeplerOrbit.velocity(KeplerOrbit.rPerigee(a_m, params.e), a_m);
    var va = KeplerOrbit.velocity(KeplerOrbit.rApogee(a_m, params.e), a_m);
    sumVp.textContent = (vp / 1000).toFixed(3) + ' km/s';
    sumVa.textContent = (va / 1000).toFixed(3) + ' km/s';
    sumVt.textContent = (st.v / 1000).toFixed(3) + ' km/s';

    var rpAlt = KeplerOrbit.rPerigee(a_m, params.e) / 1000 - KeplerOrbit.R_E_KM;
    var raAlt = KeplerOrbit.rApogee(a_m, params.e) / 1000 - KeplerOrbit.R_E_KM;
    sumRpAlt.textContent = rpAlt.toFixed(0) + ' km';
    sumRaAlt.textContent = raAlt.toFixed(0) + ' km';

    sumEcc.textContent = params.e.toFixed(2);
    sumSma.textContent = params.a_km.toFixed(0) + ' km';
    presetBadge.textContent = params.preset || '커스텀';

    if (rpAlt < 0) {
      warnBox.style.display = 'block';
      warnBox.textContent = '⚠ 근지점 고도가 음수입니다 — 지구 표면과 궤도가 교차하는 비현실적 값입니다(교육용 2체 문제 계산은 계속 유효).';
    } else {
      warnBox.style.display = 'none';
    }
  }

  // 지상궤적 계산 (지침서 공식)
  //   φ = asin(sin(i) * sin(u))
  //   λ = atan2(cos(i)*sin(u), cos(u)) - ω_earth * t     (u = ν, 근지점인수=0 단순화)
  function updateGroundTrack(st, recordHistory) {
    var i_rad = params.i_deg * Math.PI / 180;
    var u = st.nu;

    var lat = Math.asin(Math.sin(i_rad) * Math.sin(u));
    var lon = Math.atan2(Math.cos(i_rad) * Math.sin(u), Math.cos(u)) - KeplerOrbit.OMEGA_EARTH * simTimeSec;
    lon = normalizeAngle(lon);

    var latDeg = lat * 180 / Math.PI;
    var lonDeg = lon * 180 / Math.PI;

    if (recordHistory) {
      groundTrackPoints.push({ lon: lonDeg, lat: latDeg, t: simTimeSec });
      var maxAge = currentT * 3; // 최근 3바퀴 분량만 유지 (지구 자전에 의한 서편 이동 패턴을 보여줌)
      while (groundTrackPoints.length && (simTimeSec - groundTrackPoints[0].t) > maxAge) {
        groundTrackPoints.shift();
      }
    }

    KeplerGroundTrack.draw(groundTrackPoints, { lon: lonDeg, lat: latDeg });
  }

  function normalizeAngle(rad) {
    while (rad > Math.PI) rad -= 2 * Math.PI;
    while (rad < -Math.PI) rad += 2 * Math.PI;
    return rad;
  }

  function formatKm(v) {
    return v.toFixed(0) + ' km';
  }

  function formatTime(T) {
    if (T < 3600) return (T / 60).toFixed(1) + ' 분 (' + T.toFixed(0) + ' s)';
    return (T / 3600).toFixed(2) + ' 시간 (' + T.toFixed(0) + ' s)';
  }

  function updatePresetHighlight() {
    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-preset') === params.preset);
    });
  }

  init();

})();
