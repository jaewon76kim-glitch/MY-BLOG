// gradient-descent.js - 배치/SGD 스텝 반복 로직과 애니메이션 프레임 스케줄링.
// 전역 객체 GDEngine 으로 노출 (type="module" 미사용).
//
// 두 개의 독립된 경로(배치, SGD)를 같은 시작점에서 동시에 추적해
// "나란히 오버레이"로 비교할 수 있게 한다. mode 토글은 재생 버튼을 눌렀을 때
// 어느 경로에 스텝을 진행시킬지 결정하며(둘 다 실행하도록 선택 가능),
// 두 경로 모두 리셋 전까지 화면에 남아 시각적으로 비교된다.

var GDEngine = (function () {

  var DIVERGE_THRESHOLD = 1e8; // 이 값을 넘으면 발산으로 간주
  var GRAD_NORM_EPS = 1e-5;    // 그라디언트 노름이 이 아래로 떨어지면 수렴으로 간주
  var STEPS_PER_FRAME = 3;     // 프레임당 진행할 스텝 수 (애니메이션 체감 속도)

  var state = null;

  function freshPathState(w0, w1) {
    return {
      w0: w0,
      w1: w1,
      path: [{ w0: w0, w1: w1 }],
      mseHistory: [],
      step: 0,
      status: 'idle', // idle | running | converged | diverged
      diverged: false,
      converged: false
    };
  }

  function init(startW0, startW1) {
    state = {
      startW0: startW0,
      startW1: startW1,
      batch: freshPathState(startW0, startW1),
      sgd: freshPathState(startW0, startW1),
      activeModes: { batch: true, sgd: false }, // 어떤 경로를 진행시킬지
      running: false,
      rafId: null
    };
    return state;
  }

  function getState() {
    return state;
  }

  function setStart(w0, w1) {
    pause();
    init(w0, w1);
  }

  function setActiveModes(modes) {
    if (!state) return;
    state.activeModes.batch = !!modes.batch;
    state.activeModes.sgd = !!modes.sgd;
  }

  function stepOne(pathState, data, eta, lambda, useSGD) {
    if (pathState.status === 'diverged' || pathState.status === 'converged') return;
    if (data.length === 0) return;

    var grad;
    if (useSGD) {
      var idx = Math.floor(Math.random() * data.length);
      grad = Regression.gradMSESingle(data, idx, pathState.w0, pathState.w1, lambda);
    } else {
      grad = Regression.gradMSE(data, pathState.w0, pathState.w1, lambda);
    }

    var gradNorm = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1]);

    var newW0 = pathState.w0 - eta * grad[0];
    var newW1 = pathState.w1 - eta * grad[1];

    pathState.w0 = newW0;
    pathState.w1 = newW1;
    pathState.step += 1;
    pathState.path.push({ w0: newW0, w1: newW1 });

    var currentMse = Regression.mse(data, newW0, newW1);
    pathState.mseHistory.push({ step: pathState.step, mse: currentMse });

    if (!isFinite(newW0) || !isFinite(newW1) || Math.abs(newW0) > DIVERGE_THRESHOLD || Math.abs(newW1) > DIVERGE_THRESHOLD) {
      pathState.status = 'diverged';
      pathState.diverged = true;
    } else if (!useSGD && gradNorm < GRAD_NORM_EPS) {
      // 배치 경로에서만 그라디언트 노름 기준 수렴 판정 (SGD는 잡음 때문에 노름이 0에 잘 안 붙음)
      pathState.status = 'converged';
      pathState.converged = true;
    }
  }

  function tick(data, eta, lambda) {
    if (!state) return;
    for (var i = 0; i < STEPS_PER_FRAME; i++) {
      if (state.activeModes.batch) stepOne(state.batch, data, eta, lambda, false);
      if (state.activeModes.sgd) stepOne(state.sgd, data, eta, lambda, true);
      if (!anyRunnable()) break;
    }
  }

  function anyRunnable() {
    var b = state.activeModes.batch && state.batch.status !== 'diverged' && state.batch.status !== 'converged';
    var s = state.activeModes.sgd && state.sgd.status !== 'diverged' && state.sgd.status !== 'converged';
    return b || s;
  }

  function play(data, getEta, getLambda, onFrame) {
    if (!state || state.running) return;
    state.running = true;
    if (state.activeModes.batch && state.batch.status === 'idle') state.batch.status = 'running';
    if (state.activeModes.sgd && state.sgd.status === 'idle') state.sgd.status = 'running';

    function loop() {
      if (!state || !state.running) return;
      tick(data(), getEta(), getLambda());
      if (typeof onFrame === 'function') onFrame(state);
      if (!anyRunnable()) {
        pause();
        return;
      }
      state.rafId = requestAnimationFrame(loop);
    }
    state.rafId = requestAnimationFrame(loop);
  }

  function pause() {
    if (!state) return;
    state.running = false;
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  function isRunning() {
    return !!(state && state.running);
  }

  return {
    init: init,
    getState: getState,
    setStart: setStart,
    setActiveModes: setActiveModes,
    play: play,
    pause: pause,
    isRunning: isRunning
  };

})();
