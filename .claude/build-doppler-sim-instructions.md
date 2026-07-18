# Build 서브에이전트 지침: doppler-sim

## 목표

`/home/hugok/MY-BLOG/apps/doppler-sim/` 폴더에 위성 통과 도플러·RTT 시뮬레이터를 구현한다.
블로그의 다른 파일(index.html, post.html, css/, js/ 등)은 절대 수정하지 않는다.

## 파일 구조 (생성할 것)

```
/home/hugok/MY-BLOG/apps/doppler-sim/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── sim.js          # 물리 계산 모듈
    ├── renderer.js     # Canvas 애니메이션
    ├── chart.js        # Chart.js 래퍼
    └── vendor/
        └── chart.umd.min.js   # Chart.js 4.x 로컬 복사본
```

## Chart.js 4.x 다운로드 방법

```bash
mkdir -p /home/hugok/MY-BLOG/apps/doppler-sim/js/vendor
curl -L "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js" \
  -o /home/hugok/MY-BLOG/apps/doppler-sim/js/vendor/chart.umd.min.js
```

## 물리 수식 (sim.js에 구현)

### 좌표계

- 위성은 지구 중심 기준 원형 궤도. 지상국은 고정.
- 앙각(elevation angle) El: 지상국에서 위성을 바라보는 각도 (0° = 지평선, 90° = 천정)
- 통과 시뮬레이션: El = -El_max → 0° → El_max → 0° → -El_max (지평선 아래는 가리기)

### 경사거리 (Slant Range)

```
R_E = 6371 km  (지구 반경)
R = sqrt( (R_E + h)^2 - R_E^2 * cos^2(El) ) - R_E * sin(El)
```

### 위성 속도

```
mu = 3.986e14  m^3/s^2  (지구 중력 상수)
v = sqrt(mu / (R_E*1000 + h*1000))  m/s
```

### 도플러 천이

위성이 접근할 때 양수(+), 멀어질 때 음수(-).

```
// 천정 통과 전: 접근 중 → 양의 도플러
// 천정 통과 후: 멀어짐 → 음의 도플러
// 시선 방향 속도 성분 = v * cos(El) * sign (접근/후퇴에 따라 부호)

// 단순화: 통과 진행도 t ∈ [0, 1]에서
// 앙각 El(t) = El_max * cos(π * t)   (t=0: 진입, t=0.5: 천정, t=1: 이탈)
// radial_v = -v * sin(El(t))  // 경사거리 변화율 dR/dt 근사
// f_d = -f_carrier * radial_v / c
```

더 정밀하게:
```
// El이 커질수록(천정 접근) R 감소 → radial_v < 0 → f_d > 0 (청색편이)
// El이 작아질수록(이탈) R 증가 → radial_v > 0 → f_d < 0 (적색편이)
dR/dt ≈ -v * sin(El) * sign(접근여부)
```

**구현 권장 방법:** 시뮬레이션을 1프레임 단계로 진행하며 R[t] - R[t-1] / dt 로 radial_v를 수치 미분한다.

```js
f_d = -f_carrier * (dR_dt / C)  // Hz, C = 3e8 m/s
```

### RTT

```
RTT = 2 * R * 1000 / C * 1000  // ms  (R은 km, C=3e8 m/s)
```

### 통과 시간 (실제 물리)

```
T_pass = (2 * El_max_rad * (R_E + h)) / v  // 초
```
시뮬레이션에서는 속도 배율(×1/×5/×10)을 곱한 가속 시간으로 표시.

## UI 상세 (index.html + style.css)

### 레이아웃

```
┌─────────────────────────────────────────┐
│  제목: 위성 통과 도플러·RTT 시뮬레이터      │
├───────────────┬─────────────────────────┤
│  입력 패널     │  캔버스 (위성 통과 애니메이션) │
│               │                          │
│  고도 슬라이더 │  ─────────────────────── │
│  주파수 슬라이더│  도플러 천이 그래프 (kHz)   │
│  앙각 슬라이더 │                          │
│               │  ─────────────────────── │
│  ▶/⏸ 버튼     │  RTT 그래프 (ms)          │
│  ×1 ×5 ×10   │                          │
│               │  수치 요약 카드             │
└───────────────┴─────────────────────────┘
```

모바일: 입력 패널이 위, 출력이 아래로 쌓인다.

### 색상 팔레트 (다크 테마)

```css
--bg: #0f0f1a
--panel: #1a1a2e
--accent: #4fc3f7   /* 하늘색 */
--doppler-color: #ff6b6b  /* 붉은색 */
--rtt-color: #51cf66      /* 초록색 */
--text: #e0e0e0
--border: #2a2a4a
```

### 입력 패널 슬라이더

각 슬라이더 아래 현재 값을 레이블로 표시.
- 고도: 400km ~ 35786km, step=100, 기본 550 → LEO/MEO/GEO 프리셋 버튼 (550/20200/35786)
- 주파수: 1~30 GHz, step=0.5, 기본 12 → L/S/Ka 프리셋 버튼 (1.5/2.5/20)
- 최대 앙각: 10~90°, step=5, 기본 90

### 캔버스 애니메이션 (renderer.js)

- 배경: 그라디언트 하늘 (위는 어두운 우주, 아래는 지평선)
- 지평선 수평선
- 호(arc): 위성 궤적을 점선으로 미리 그린다
- 위성 아이콘: ◆ 또는 작은 직사각형 + 태양광 패널 표현
- 지상국: 지평선 중앙에 ▲ 삼각형
- 현재 앙각(°)과 경사거리(km)를 캔버스 우상단에 오버레이

### 그래프 (chart.js wrapper)

- 도플러 차트: `new Chart(ctx, { type: 'line', ... })`
  - 데이터 포인트를 매 프레임 push, 최대 300포인트까지만 유지
  - y축: ±최댓값 + 10% 여유, 0선에 빨간 점선 (천정 통과 기준)
  - x축: 경과 시간(s)
- RTT 차트: 같은 방식, 최솟값(천정)에 별표 레이블

### 수치 요약 카드

| 항목 | 값 |
|---|---|
| 앙각 | 45.3° |
| 경사거리 | 823 km |
| 도플러 | +23.4 kHz |
| RTT | 5.49 ms |

실시간 업데이트.

## 구현 규칙

1. `type="module"` 사용 금지 (파일:// 프로토콜 CORS 문제 방지). 모든 JS는 전역 변수로.
2. CDN 사용 금지. Chart.js는 반드시 로컬 파일 (`js/vendor/chart.umd.min.js`)에서 로드.
3. 빌드 도구 없음.
4. 모바일 대응: `max-width: 100%`, flexbox, viewport meta 태그.
5. 슬라이더 변경 즉시 시뮬레이션 리셋 후 재시작.
6. 재생 중일 때만 requestAnimationFrame 루프 동작. 일시정지 시 캔버스·수치 고정.

## 완료 조건

- `/apps/doppler-sim/index.html`을 브라우저에서 열었을 때 바로 동작
- 슬라이더 조작 시 도플러·RTT 그래프가 즉시 변경
- LEO(550km)에서 도플러 천이 최댓값 약 ±20~60 kHz (12GHz 기준)
- GEO(35786km)에서 RTT 최솟값 약 240ms
- 재생/일시정지·속도 배율 버튼 정상 동작
- 모바일 화면(375px 폭)에서 레이아웃 깨지지 않음

## 완료 후 보고

구현 완료 후 생성한 파일 목록과 주요 구현 결정 사항을 보고한다.
블로그 다른 파일 수정 여부를 명시적으로 확인·보고한다.
