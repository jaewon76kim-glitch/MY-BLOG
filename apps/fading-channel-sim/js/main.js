// main.js - 상태관리/이벤트/애니메이션 루프 (전역, type="module" 불사용)

(function () {
  'use strict';

  var RAYLEIGH_COLOR = '#ff6b6b';
  var RICIAN_COLOR = '#51cf66';
  var NAKAGAMI_COLOR = '#ffd43b';

  // ---- 프리셋 정의 (spec-fading-sim.md §2-5 근거) ----
  var PRESETS = {
    'urban-nlos': { model: 'rayleigh', K_dB: 0, m: 1.0, gammaBar_dB: 8, fD_Hz: 15, th_dB: 0 },
    'sat-open-ka': { model: 'rician', K_dB: 15, m: 1.0, gammaBar_dB: 14, fD_Hz: 1, th_dB: 0 },
    'sat-urban-low': { model: 'rician', K_dB: 0, m: 1.0, gammaBar_dB: 8, fD_Hz: 10, th_dB: 0 },
    'indoor-multipath': { model: 'nakagami', K_dB: 0, m: 0.5, gammaBar_dB: 10, fD_Hz: 20, th_dB: 0 }
  };

  // ---- 상태 ----
  var state = {
    model: 'rayleigh',
    K_dB: 10.0,
    m: 1.0,
    gammaBar_dB: 10.0,
    fD_Hz: 3.0,
    th_dB: 0.0,
    playing: false
  };

  var generator = null;
  var elapsedTime = 0;
  var rafId = null;
  var lastTimestamp = null;

  // ---- DOM 참조 ----
  var el = {};
  [
    'btn-model-rayleigh', 'btn-model-rician', 'btn-model-nakagami',
    'group-k', 'val-k', 'slider-k',
    'group-m', 'val-m', 'slider-m',
    'val-gammabar', 'slider-gammabar',
    'val-fd', 'slider-fd', 'val-fd-label',
    'val-th', 'slider-th',
    'btn-play', 'btn-reset',
    'sum-samples', 'sum-outage-meas', 'sum-outage-theory', 'sum-mean', 'sum-param', 'sum-conv',
    'chart-envelope', 'chart-pdf'
  ].forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  function K_linFromDb(dB) {
    return Math.pow(10, dB / 10);
  }

  function currentColor() {
    if (state.model === 'rayleigh') return RAYLEIGH_COLOR;
    if (state.model === 'rician') return RICIAN_COLOR;
    return NAKAGAMI_COLOR;
  }

  // ---- 초기화 ----
  function init() {
    FadingCharts.initEnvelopeChart(el['chart-envelope']);
    FadingCharts.initPdfChart(el['chart-pdf']);

    bindModelButtons();
    bindSliders();
    bindPresets();
    bindControls();

    applyModelVisibility();
    recreateGenerator();
    resetStatsAndCharts();
    updateColors();
    updateTheoryCurve();
    updateSummary();
  }

  // ---- 모델 전환 버튼 ----
  function bindModelButtons() {
    document.querySelectorAll('[data-model]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.model = this.getAttribute('data-model');
        setActive('[data-model]', this);
        applyModelVisibility();
        recreateGenerator();
        resetStatsAndCharts();
        updateColors();
        updateTheoryCurve();
        updateSummary();
      });
    });
  }

  function applyModelVisibility() {
    el['group-k'].style.display = state.model === 'rician' ? 'flex' : 'none';
    el['group-m'].style.display = state.model === 'nakagami' ? 'flex' : 'none';
  }

  // ---- 슬라이더 ----
  function bindSliders() {
    el['slider-k'].addEventListener('input', function () {
      state.K_dB = parseFloat(this.value);
      el['val-k'].textContent = state.K_dB.toFixed(1) + ' dB';
      // K 변경은 라이시안 분포 형태를 바꾸므로 누적 통계만 리셋(오실레이터 위상/시간축은 유지)
      Stats.reset();
      FadingCharts.resetPdfChart();
      updateTheoryCurve();
      updateSummary();
    });

    el['slider-m'].addEventListener('input', function () {
      state.m = parseFloat(this.value);
      el['val-m'].textContent = state.m.toFixed(1);
      Stats.reset();
      FadingCharts.resetPdfChart();
      updateTheoryCurve();
      updateSummary();
    });

    el['slider-gammabar'].addEventListener('input', function () {
      state.gammaBar_dB = parseFloat(this.value);
      el['val-gammabar'].textContent = state.gammaBar_dB.toFixed(1) + ' dB';
      // γ̄는 정규화 분포(x=γ/γ̄) 자체를 바꾸지 않으므로 통계 리셋 불필요 — 표시 스케일만 갱신
      FadingCharts.setEnvelopeYRange(state.gammaBar_dB);
      updateSummary();
    });

    el['slider-fd'].addEventListener('input', function () {
      state.fD_Hz = parseFloat(this.value);
      el['val-fd'].textContent = state.fD_Hz.toFixed(1) + ' Hz';
      updateFdLabel();
      // f_D는 시간 상관(페이딩 속도)만 바꾸고 정규화 분포는 바꾸지 않으므로 통계 리셋 불필요
    });

    el['slider-th'].addEventListener('input', function () {
      state.th_dB = parseFloat(this.value);
      el['val-th'].textContent = state.th_dB.toFixed(1) + ' dB';
      // 임계값은 히스토그램 누적 자체와 무관(요약 카드에서 즉시 재계산)하므로 통계 리셋 불필요
      FadingCharts.setThresholdDb(state.gammaBar_dB + state.th_dB);
      updateSummary();
    });
  }

  function updateFdLabel() {
    var label;
    if (state.fD_Hz < 3) label = '(매우 완만한 페이딩)';
    else if (state.fD_Hz < 10) label = '(완만한 페이딩)';
    else if (state.fD_Hz < 25) label = '(보통 속도 페이딩)';
    else label = '(빠른 페이딩)';
    el['val-fd-label'].textContent = label;
  }

  // ---- 프리셋 ----
  function bindPresets() {
    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = this.getAttribute('data-preset');
        var p = PRESETS[key];
        if (!p) return;

        state.model = p.model;
        state.K_dB = p.K_dB;
        state.m = p.m;
        state.gammaBar_dB = p.gammaBar_dB;
        state.fD_Hz = p.fD_Hz;
        state.th_dB = p.th_dB;

        syncControlsFromState();
        setActive('[data-preset]', this);
        setActive('[data-model]', document.getElementById('btn-model-' + p.model));

        applyModelVisibility();
        recreateGenerator();
        resetStatsAndCharts();
        updateColors();
        updateTheoryCurve();
        updateSummary();
      });
    });
  }

  function syncControlsFromState() {
    el['slider-k'].value = state.K_dB;
    el['val-k'].textContent = state.K_dB.toFixed(1) + ' dB';
    el['slider-m'].value = state.m;
    el['val-m'].textContent = state.m.toFixed(1);
    el['slider-gammabar'].value = state.gammaBar_dB;
    el['val-gammabar'].textContent = state.gammaBar_dB.toFixed(1) + ' dB';
    el['slider-fd'].value = state.fD_Hz;
    el['val-fd'].textContent = state.fD_Hz.toFixed(1) + ' Hz';
    updateFdLabel();
    el['slider-th'].value = state.th_dB;
    el['val-th'].textContent = state.th_dB.toFixed(1) + ' dB';
    FadingCharts.setEnvelopeYRange(state.gammaBar_dB);
    FadingCharts.setThresholdDb(state.gammaBar_dB + state.th_dB);
  }

  // ---- 재생/리셋 컨트롤 ----
  function bindControls() {
    el['btn-play'].addEventListener('click', function () {
      if (state.playing) {
        pause();
      } else {
        play();
      }
    });

    el['btn-reset'].addEventListener('click', function () {
      pause();
      recreateGenerator();
      resetStatsAndCharts();
      updateTheoryCurve();
      updateSummary();
    });
  }

  function play() {
    state.playing = true;
    el['btn-play'].textContent = '⏸ 일시정지';
    lastTimestamp = null;
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    state.playing = false;
    el['btn-play'].textContent = '▶ 재생';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ---- 채널 생성기 재생성 ----
  function recreateGenerator() {
    generator = Fading.createGenerator(state.model);
    elapsedTime = 0;
  }

  function resetStatsAndCharts() {
    Stats.reset();
    FadingCharts.resetEnvelope();
    FadingCharts.resetPdfChart();
    FadingCharts.setEnvelopeYRange(state.gammaBar_dB);
    FadingCharts.setThresholdDb(state.gammaBar_dB + state.th_dB);
  }

  function updateColors() {
    var color = currentColor();
    FadingCharts.setEnvelopeColor(color);
  }

  // ---- 이론 PDF 곡선 갱신 (모델/K/m 변경 시에만 호출) ----
  function updateTheoryCurve() {
    var K_lin = K_linFromDb(state.K_dB);
    var data = [];
    var n = Stats.NBINS;
    for (var i = 0; i < n; i++) {
      var x = (i + 0.5) * Stats.BIN_WIDTH;
      var y;
      if (state.model === 'rayleigh') {
        y = Theory.rayleighPDF(x);
      } else if (state.model === 'rician') {
        y = Theory.ricianPDF(x, K_lin);
      } else {
        y = Theory.nakagamiPDF(x, state.m);
      }
      data.push({ x: x, y: y });
    }
    FadingCharts.updateTheoryPdf(data, currentColor());
  }

  // ---- 요약 카드 갱신 ----
  function formatProb(p) {
    if (p >= 0.01) return (p * 100).toFixed(2) + ' %';
    if (p <= 0) return '0 %';
    return (p * 100).toExponential(2) + ' %';
  }

  function updateSummary() {
    var K_lin = K_linFromDb(state.K_dB);
    var total = Stats.getTotal();
    el['sum-samples'].textContent = total.toString();

    var xth = Math.pow(10, state.th_dB / 10);
    var outageMeas = Stats.getOutageMeasured(xth);
    var outageTheory;
    if (state.model === 'rayleigh') {
      outageTheory = Theory.rayleighOutage(xth);
    } else if (state.model === 'rician') {
      outageTheory = Theory.ricianOutage(xth, K_lin);
    } else {
      outageTheory = Theory.nakagamiOutage(xth, state.m);
    }

    el['sum-outage-meas'].textContent = formatProb(outageMeas);
    el['sum-outage-theory'].textContent = formatProb(outageTheory);
    el['sum-mean'].textContent = total > 0 ? Stats.getMean().toFixed(3) : '—';

    if (state.model === 'rayleigh') {
      el['sum-param'].textContent = 'Rayleigh (K=0)';
      el['sum-conv'].textContent = '≈ Nakagami m = 1.00';
    } else if (state.model === 'rician') {
      el['sum-param'].textContent = 'K = ' + state.K_dB.toFixed(1) + ' dB';
      var mEq = Theory.mFromK(K_lin);
      el['sum-conv'].textContent = '≈ Nakagami m = ' + mEq.toFixed(2);
    } else {
      el['sum-param'].textContent = 'm = ' + state.m.toFixed(2);
      var kEq = Theory.kFromM(state.m);
      if (kEq === null) {
        el['sum-conv'].textContent = '해당 K 없음 (레일리보다 심한 페이딩)';
      } else {
        el['sum-conv'].textContent = '≈ Rician K = ' + (10 * Math.log10(kEq)).toFixed(2) + ' dB';
      }
    }
  }

  // ---- 애니메이션 루프 ----
  function loop(timestamp) {
    if (!state.playing) return;

    if (lastTimestamp === null) lastTimestamp = timestamp;
    var dtMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    var dtSec = Math.min(dtMs / 1000, 0.05); // 최대 50ms 클램프
    elapsedTime += dtSec;

    var K_lin = K_linFromDb(state.K_dB);
    var xNorm = generator.sample(elapsedTime, state.fD_Hz, K_lin, state.m);
    if (xNorm < 0 || !isFinite(xNorm)) xNorm = 0;

    Stats.addSample(xNorm);

    var instSnrDb = state.gammaBar_dB + 10 * Math.log10(Math.max(xNorm, 1e-9));
    FadingCharts.pushEnvelope(elapsedTime, instSnrDb);
    FadingCharts.updateHistogram(Stats.getHistogramDensity());
    updateSummary();

    rafId = requestAnimationFrame(loop);
  }

  // ---- 유틸 ----
  function setActive(selector, activeBtn) {
    document.querySelectorAll(selector).forEach(function (b) {
      b.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
  }

  init();

})();
