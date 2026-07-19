# Spec: PSK/QAM 성상도 & BER 시뮬레이터

## 1. 선택한 웹앱

**이름:** PSK/QAM 성상도 & BER 시뮬레이터
**경로:** `/apps/constellation-sim/`
**한 줄 설명:** 변조방식(BPSK/QPSK/8PSK/16QAM/64QAM)과 Eb/N0을 조절하면 AWGN 잡음이 낀 수신 심볼 성상도를 몬테카를로로 실시간 시뮬레이션하고, 실측 SER/BER을 이론값·BER-vs-Eb/N0 곡선과 함께 비교하는 인터랙티브 시뮬레이터

**소재(tex 원문 절, `/mnt/c/Users/hugok/Claude/Projects/doc/위성통신/위성통신_소스.tex`):**
- `\section{디지털 변조 성능: AWGN 위의 PSK와 QAM}` (509번째 줄 부근) — BPSK/QPSK/M-PSK/M-QAM 오류확률 공식
- 보조로 `\section{링크버짓, 수신감도, 아웃티지 확률}`(231절)의 $E_s/N_0$ 정의를 재사용

기존 `apps/link-budget-calc`(EIRP/G/T/링크버짓 계산)와 `apps/doppler-sim`(궤도·도플러 애니메이션)과 겹치지 않도록, 링크버짓 계산 다음 단계인 **"이 Eb/N0에서 실제 복조 성능이 어떻게 보이는가"**에 집중한다. link-budget-calc에서 계산된 Eb/N0 값을 그대로 이 앱 슬라이더에 입력해볼 수 있다는 점을 UI 안내 문구로 명시해 두 앱을 연결한다.

## 2. 핵심 기능 목록

### 2.1 변조방식 선택
- BPSK, QPSK, 8PSK, 16-QAM, 64-QAM 버튼 선택
- 각 방식의 이상적 성상점 좌표를 tex 535~573절 정의대로 생성(PSK: 단위원 위 등간격, QAM: 정사각형 그리드, Gray 매핑은 시각화에서 다루지 않음)

### 2.2 AWGN 몬테카를로 시뮬레이션
- 입력: Eb/N0 (dB) 슬라이더, 심볼 샘플 수(표시용) 슬라이더
- 매 업데이트마다 무작위 송신 심볼을 뽑고, Box-Muller로 생성한 복소 가우시안 잡음 $n\sim\mathcal{N}(0,N_0/2)$(I/Q 각 축)을 더해 수신점을 생성
- $E_s/N_0$ 환산: PSK는 $E_s=E_b$(BPSK)·$E_s=2E_b$(QPSK) 등, QAM은 $E_s=E_b\log_2 M$ (tex 530, 546, 564절 정의를 그대로 사용)

### 2.3 성상도 시각화
- 이상적 성상점(고정 마커) + 잡음 낀 수신점(반투명 산점도) + 최근접 판정으로 잘못 분류된 점은 다른 색으로 강조
- 판정 경계(간단한 격자선, QAM은 사각형 격자 / PSK는 방사형 부채꼴)를 배경에 표시

### 2.4 SER/BER 비교
- **실측치**: 시뮬레이션된 심볼 중 최근접 판정 오류 비율(SER), 그레이코딩 근사로 SER→BER 환산($BER\approx SER/\log_2 M$, 고SNR 근사임을 UI에 명시)
- **이론치**: tex 공식 그대로 구현
  - BPSK: $Q(\sqrt{2E_b/N_0})$ (530절)
  - QPSK 정확식 (546절)
  - M-PSK 근사식 (552절)
  - M-QAM: $\sqrt{M}$-PAM 오류율에서 유도 (564~570절)
- 두 값을 나란히 숫자로 표시(실측은 샘플 수가 적을 때 이론과 차이가 클 수 있음을 툴팁으로 안내)

### 2.5 BER vs Eb/N0 곡선
- x축 Eb/N0(dB, -5~20), y축 BER(로그 스케일)
- 5개 변조방식의 이론 BER 곡선을 모두 겹쳐 그리고, 현재 선택된 방식·Eb/N0 위치를 점으로 표시
- 위성통신에서 왜 낮은 차수 변조(QPSK/8PSK)를 선호하는지(577절, GEO RTT 때문에 적응변조가 느림) 설명 문구를 곁들임

## 3. 파일 구조

```
/apps/constellation-sim/
├── index.html            # 앱 진입점 (단일 페이지)
├── css/
│   └── style.css         # 앱 전용 스타일 (link-budget-calc 톤 계승)
└── js/
    ├── modulation.js      # 성상점 좌표 생성, 이론 SER/BER 공식(BPSK/QPSK/M-PSK/M-QAM), 최근접 판정
    ├── noise.js            # Box-Muller AWGN 샘플러, 몬테카를로 시뮬레이션 루프
    ├── charts.js           # Chart.js 래퍼 — 성상도 산점도, BER-vs-Eb/N0 로그스케일 곡선
    └── vendor/
        └── chart.umd.min.js   # apps/link-budget-calc/js/vendor/chart.umd.min.js 재사용(그대로 복사, CDN 미사용)
```

## 4. 주요 UI 구성

### 입력 패널
| 컨트롤 | 범위 | 기본값 |
|---|---|---|
| 변조방식 버튼 | BPSK/QPSK/8PSK/16QAM/64QAM | QPSK |
| Eb/N0 (dB) 슬라이더 | -5 ~ 20 | 8 |
| 표시 심볼 수 슬라이더 | 100 ~ 3000 | 500 |
| "다시 시뮬레이션" 버튼 | — | — |

### 출력 영역
- **성상도 산점도** — 이상적 심볼점(진한 마커) + 수신점(반투명) + 오판정 강조 + 판정경계
- **수치 요약 카드** — 실측 SER/BER, 이론 SER/BER, 두 값의 오차율
- **BER vs Eb/N0 곡선** — 5개 변조방식 이론곡선 + 현재 동작점 표시(로그 y축)
- 안내 문구 — "`apps/link-budget-calc`에서 계산한 Eb/N0 값을 여기 슬라이더에 입력해 실제 복조 성능을 확인해보세요"

## 5. 사용할 기술

- **순수 HTML5 / CSS3 / JavaScript (ES2020+)** — 빌드 도구 없음, doppler-sim/link-budget-calc와 동일한 관례
- **Chart.js 4.x (로컬 복사본)** — `js/vendor/chart.umd.min.js`, `apps/link-budget-calc`에서 그대로 복사해 재사용(CDN 금지)
- **수식은 JS로 직접 구현** — `modulation.js`에 tex 원문의 SER/BER 공식을 그대로 옮긴다
- **Q함수** — 외부 라이브러리 없이 Abramowitz–Stegun 근사식으로 JS 자체 구현(link-budget-calc의 구현과 동일한 근사식 재사용)
- 외부 수식 렌더러(KaTeX 등) 불필요

## 6. 구현 범위 외 (이번 버전 제외)

- 페이딩 채널(라이시안/레일리/나카가미) 반영 — AWGN 전용, 페이딩은 향후 별도 앱 후보
- 실제 FEC/LDPC 코딩 이득 반영
- Gray 매핑 기반 정확한 비트오류(심볼오류가 아닌 비트오류) 히트맵 — BER은 근사식만 사용
- 위상/타이밍 동기화 오차, IQ 불균형 등 실장 손상 모델링
- 펄스성형 필터링, ISI, 다중경로 채널
- 8PSK/16QAM/64QAM 등에서 그레이코딩이 아닌 다른 비트매핑 비교
