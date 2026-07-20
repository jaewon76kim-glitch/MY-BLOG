// regression.js - MSE(w0,w1), ∇MSE, 정규방정식(OLS) 닫힌 형태 해, 릿지 닫힌 형태 해 등 순수 계산 함수.
// 전역 객체 Regression 으로 노출 (type="module" 미사용). 외부 선형대수 라이브러리 사용하지 않음.
//
// 모델: ŷ_i = w0 + w1*x_i  (단순선형회귀, n개 데이터 점)
// MSE(w0,w1) = (1/n) * Σ (w0 + w1*x_i - y_i)^2
//
// 릿지(정규화) 목적함수는 이 구현에서 "MSE 기준"으로 스케일을 통일한다:
//   J(w) = MSE(w) + (λ/n) * (w0^2 + w1^2)
// 이 J(w)의 그라디언트는 ∇MSE(w) + (2λ/n)*w 이며, ∂J/∂w = 0 을 풀면
// (XᵀX + λI) w = Xᵀy 와 정확히 동일한 정지점을 준다 (n으로 양변을 나눈 것뿐이므로).
// 따라서 λ=0일 때 GD 궤적과 닫힌 형태 해가 항상 같은 최솟값(OLS)로 수렴하고,
// λ>0일 때도 GD가 수렴하는 지점과 ridgeClosedForm()의 결과가 일치한다.

var Regression = (function () {

  function sums(data) {
    var n = data.length;
    var Sx = 0, Sy = 0, Sxx = 0, Sxy = 0;
    for (var i = 0; i < n; i++) {
      Sx += data[i].x;
      Sy += data[i].y;
      Sxx += data[i].x * data[i].x;
      Sxy += data[i].x * data[i].y;
    }
    return { n: n, Sx: Sx, Sy: Sy, Sxx: Sxx, Sxy: Sxy };
  }

  // MSE(w0, w1) - 순수 MSE (정규화 항 없음)
  function mse(data, w0, w1) {
    var n = data.length;
    if (n === 0) return 0;
    var s = 0;
    for (var i = 0; i < n; i++) {
      var e = w0 + w1 * data[i].x - data[i].y;
      s += e * e;
    }
    return s / n;
  }

  // 정규화된 목적함수 J(w) = MSE(w) + (λ/n)*(w0^2+w1^2). λ=0이면 mse()와 동일.
  // 등고선 렌더링과 릿지 시각화(최저점 이동)에 사용.
  function regObjective(data, w0, w1, lambda) {
    var n = data.length;
    var m = mse(data, w0, w1);
    if (n === 0 || !lambda) return m;
    return m + (lambda / n) * (w0 * w0 + w1 * w1);
  }

  // ∇MSE + 릿지 항 (배치, 전체 n개 데이터 사용)
  // 반환: [g0, g1]
  function gradMSE(data, w0, w1, lambda) {
    var n = data.length;
    if (n === 0) return [0, 0];
    var g0 = 0, g1 = 0;
    for (var i = 0; i < n; i++) {
      var e = w0 + w1 * data[i].x - data[i].y;
      g0 += e;
      g1 += e * data[i].x;
    }
    g0 = (2 / n) * g0;
    g1 = (2 / n) * g1;
    if (lambda) {
      g0 += (2 * lambda / n) * w0;
      g1 += (2 * lambda / n) * w1;
    }
    return [g0, g1];
  }

  // 단일 데이터 점 i에 대한 mse_i(w) = (w0+w1*x_i - y_i)^2 의 그라디언트 (SGD용 근사).
  // 릿지 항은 전체 n 기준 스케일(2λ/n * w)을 그대로 유지해 배치와 동일한 정지점으로 향하게 한다.
  function gradMSESingle(data, index, w0, w1, lambda) {
    var n = data.length;
    if (n === 0) return [0, 0];
    var p = data[index];
    var e = w0 + w1 * p.x - p.y;
    var g0 = 2 * e;
    var g1 = 2 * e * p.x;
    if (lambda) {
      g0 += (2 * lambda / n) * w0;
      g1 += (2 * lambda / n) * w1;
    }
    return [g0, g1];
  }

  // 2x2 역행렬을 스칼라 공식으로 직접 적용해 닫힌 형태 OLS 해 계산.
  // XᵀX = [[n, Sx], [Sx, Sxx]], Xᵀy = [Sy, Sxy]
  // det = n*Sxx - Sx*Sx
  // w0 = (Sxx*Sy - Sx*Sxy) / det
  // w1 = (n*Sxy - Sx*Sy) / det
  // 반환: {w0, w1} 또는 데이터가 부족/특이(det=0)하면 null.
  function olsClosedForm(data) {
    if (data.length < 2) return null;
    var s = sums(data);
    var det = s.n * s.Sxx - s.Sx * s.Sx;
    if (Math.abs(det) < 1e-12) return null; // 모든 x가 동일한 경우 등 특이 행렬
    var w0 = (s.Sxx * s.Sy - s.Sx * s.Sxy) / det;
    var w1 = (s.n * s.Sxy - s.Sx * s.Sy) / det;
    return { w0: w0, w1: w1 };
  }

  // 닫힌 형태 릿지 해: w_ridge = (XᵀX + λI)⁻¹ Xᵀy
  // λ=0이면 olsClosedForm()과 정확히 일치.
  function ridgeClosedForm(data, lambda) {
    if (data.length < 1) return null;
    var s = sums(data);
    var a = s.n + lambda, b = s.Sx, c = s.Sx, d = s.Sxx + lambda;
    var det = a * d - b * c;
    if (Math.abs(det) < 1e-12) return null;
    var w0 = (d * s.Sy - b * s.Sxy) / det;
    var w1 = (a * s.Sxy - c * s.Sy) / det;
    return { w0: w0, w1: w1 };
  }

  return {
    mse: mse,
    regObjective: regObjective,
    gradMSE: gradMSE,
    gradMSESingle: gradMSESingle,
    olsClosedForm: olsClosedForm,
    ridgeClosedForm: ridgeClosedForm
  };

})();
