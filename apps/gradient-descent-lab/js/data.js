// data.js - 데이터 점 상태 관리(추가/삭제). localStorage 불필요, 메모리 상태만.
// 전역 객체 DataStore 로 노출 (type="module" 미사용).

var DataStore = (function () {

  // 초기 예시 데이터 (대략 y = 2 + 1.5x 근방에 노이즈, x in [0,10])
  var DEFAULT_POINTS = [
    { x: 0.5, y: 2.6 },
    { x: 1.5, y: 4.1 },
    { x: 2.3, y: 5.0 },
    { x: 3.2, y: 7.6 },
    { x: 4.6, y: 8.7 },
    { x: 5.5, y: 10.9 },
    { x: 6.8, y: 12.4 },
    { x: 7.4, y: 13.1 },
    { x: 8.6, y: 15.7 }
  ];

  var points = [];

  function clonePoint(p) {
    return { x: p.x, y: p.y };
  }

  function reset() {
    points = DEFAULT_POINTS.map(clonePoint);
  }

  function add(x, y) {
    points.push({ x: x, y: y });
  }

  function removeAt(index) {
    if (index >= 0 && index < points.length) {
      points.splice(index, 1);
      return true;
    }
    return false;
  }

  // 주어진 (x,y) 좌표(데이터 공간)에 가장 가까운 점을 찾아 삭제. tolerance는 데이터 공간 단위 거리.
  function removeNear(x, y, tolerance) {
    var bestIdx = -1;
    var bestDist = Infinity;
    for (var i = 0; i < points.length; i++) {
      var dx = points[i].x - x;
      var dy = points[i].y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestDist <= tolerance) {
      points.splice(bestIdx, 1);
      return true;
    }
    return false;
  }

  function getAll() {
    return points;
  }

  function count() {
    return points.length;
  }

  function clear() {
    points = [];
  }

  reset();

  return {
    reset: reset,
    add: add,
    removeAt: removeAt,
    removeNear: removeNear,
    getAll: getAll,
    count: count,
    clear: clear
  };

})();
