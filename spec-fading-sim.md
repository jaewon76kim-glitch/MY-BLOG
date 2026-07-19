# spec-fading-sim.md — 위성링크 소규모 페이딩 시뮬레이터

## 0. 소스 확인

`/mnt/c/Users/hugok/Claude/Projects/doc/위성통신/위성통신_소스.tex` 316~450번째 줄
(`\section{소규모 페이딩 통계: 라이시안, 레일리, 나카가미}`)을 직접 읽고 확인한 핵심 수식:

- **다중경로 복소포락선**: $\tilde h = X+jY$, $X,Y$는 중심극한정리로 가우시안(LOS 있으면 평균 $\mu_X,\mu_Y\neq0$, 없으면 0). 포락선 $R=\sqrt{X^2+Y^2}$.
- **레일리(LOS 없음, $\mu_X=\mu_Y=0$)**: 포락선 PDF $f_R(r)=\dfrac{r}{\sigma^2}\exp\!\left(-\dfrac{r^2}{2\sigma^2}\right)$, 순간전력/SNR은 지수분포 $f_\gamma(\gamma)=\dfrac1{\bar\gamma}\exp(-\gamma/\bar\gamma)$.
- **라이시안(LOS 있음)**: $f_R(r)=\dfrac{r}{\sigma^2}\exp\!\left(-\dfrac{r^2+A^2}{2\sigma^2}\right)I_0\!\left(\dfrac{Ar}{\sigma^2}\right)$. $A=0\Rightarrow I_0(0)=1$이면 레일리로 정확히 환원(레일리는 라이시안의 특수해).
  K-factor $K\triangleq A^2/2\sigma^2$(LOS전력/산란전력)로 정규화하면
  $f_\gamma(\gamma)=\dfrac{(K+1)e^{-K}}{\bar\gamma}\exp\!\left(-\dfrac{(K+1)\gamma}{\bar\gamma}\right)I_0\!\left(2\sqrt{\dfrac{K(K+1)\gamma}{\bar\gamma}}\right)$.
  $K=0\to$레일리, $K\to\infty\to$페이딩 없는 AWGN. 위성-지상 링크는 앙각이 높을수록 $K$가 커짐(개활지 고앙각 Ka대역은 실측 $K>10$dB, 도심협곡/저앙각/핸드헬드 차폐 시 $K\to0$에 근접).
- **나카가미-m(수학적 일반화)**: $f_\gamma(\gamma)=\dfrac{1}{\Gamma(m)}\left(\dfrac{m}{\bar\gamma}\right)^m\gamma^{m-1}\exp\!\left(-\dfrac{m\gamma}{\bar\gamma}\right)$, $m\ge\frac12$. $m=1\to$레일리(지수분포)와 정확히 일치, $m\to\infty\to$페이딩 없음, $m<1\to$레일리보다 심한 페이딩. K-factor와 근사 변환 $m\approx\dfrac{(K+1)^2}{2K+1}$.
- **아웃티지 확률과의 연관** (231~311줄, 596~608줄 참조): 일반 정의 $O=\Pr[\Gamma<\Gamma_{th}]$. 레일리(지수분포)의 경우 CDF로부터 $O(\gamma_{th})=1-e^{-\gamma_{th}/\bar\gamma}$ (다이버시티 절 599~608줄에서 각 branch의 아웃티지로 명시적으로 사용됨). 라이시안은 Marcum-Q 함수, 나카가미는 정규화 하위 불완전감마함수 $P(m, m\gamma_{th}/\bar\gamma)$로 각각 주어짐.

## 1. 앱 이름과 한 줄 설명

- **폴더명 (`apps/` 아래)**: `fading-channel-sim`
- **`data-category`**: `위성통신`
- **한 줄 설명**: 위성-지상 링크의 소규모 페이딩(레일리 / 라이시안 K-factor / 나카가미-m)을 시간축 포락선 애니메이션과 몬테카를로 히스토그램으로 함께 보여주고, 포락선이 임계값 아래로 떨어지는 실측 비율을 이론 아웃티지 확률과 겹쳐 비교하는 시뮬레이터.

### 기존 3개 앱과의 차별점

- `doppler-sim`: 궤도 기하/도플러 천이/RTT만 다룸 — 채널 통계(페이딩) 없음.
- `link-budget-calc`: 링크버짓과 강우감쇠(대규모 감쇠) 계산 — 소규모 페이딩 통계 없음.
- `constellation-sim`: PSK/QAM 성상도와 AWGN 위에서의 SER/BER — 채널은 순수 AWGN(페이딩 없음), 페이딩 채널 통계 자체는 다루지 않음.
- 세 앱 모두 "슬라이더 + 실시간 Chart.js 그래프"라는 UI 패턴은 공유하되, 본 앱은 (1) 세 가지 페이딩 분포를 K/m 파라미터로 전환·비교하는 것, (2) 이론 PDF와 몬테카를로 실측 히스토그램의 일치를 직접 검증하는 것, (3) 아웃티지 확률을 실측/이론으로 나란히 보여주는 것에 집중한다는 점에서 겹치지 않는다.

## 2. 핵심 기능 목록

1. **페이딩 모델 전환 (Rayleigh / Rician / Nakagami-m)**: 상단 버튼 3개로 모델을 전환. Rician 선택 시 K-factor 슬라이더(dB, -10~20dB)가, Nakagami-m 선택 시 m 슬라이더(0.5~10)가 나타난다. 모델 전환 시 tex의 근사식 $m\approx(K+1)^2/(2K+1)$을 이용해 "현재 K에 상응하는 m" 또는 그 역을 참고값으로 함께 표시한다.
2. **시간축 페이딩 포락선 애니메이션**: 두 개의 독립 저역통과 가우시안 프로세스 $X(t),Y(t)$(Rician/레일리는 LOS 평균 유무만 다름, sum-of-sinusoids 방식의 Clarke 모델 근사로 생성)를 합성해 포락선 $R(t)=\sqrt{X(t)^2+Y(t)^2}$을 매 프레임 계산하고 dB 스케일 라인차트로 실시간 스크롤 표시한다. 도플러 확산 $f_D$ 슬라이더로 페이딩이 변하는 속도(완만/빠른 페이딩)를 조절한다.
3. **이론 PDF vs 몬테카를로 히스토그램 오버레이**: 누적된 포락선(또는 정규화 전력 $\gamma/\bar\gamma$) 샘플의 정규화 히스토그램(막대)과, 현재 선택된 모델의 이론 PDF(레일리/라이시안/나카가미-m 폐형식, 라이시안은 $I_0$ 급수근사로 직접 계산)를 같은 Chart.js 차트에 겹쳐 그려 이론-실측 일치를 시각적으로 확인한다.
4. **아웃티지 확률 임계값 슬라이더 + 실측/이론 비교**: 임계값 $\gamma_{th}$(평균 대비 dB) 슬라이더를 움직이면 시간축 그래프에 수평 임계선과 임계값 미만 구간 음영이 표시되고, 지금까지 샘플 중 임계값 미만 비율(실측 아웃티지)과 이론 아웃티지 확률(레일리 $1-e^{-\gamma_{th}/\bar\gamma}$, 나카가미 하위불완전감마, 라이시안 Marcum-Q 수치근사)을 나란히 카드로 표시한다.
5. **물리적 프리셋 버튼**: tex 본문이 언급한 실제 상황과 연결되는 원클릭 프리셋 — "지상 도심 NLOS(레일리, K=0)", "위성 개활지 고앙각 Ka대역(라이시안 K≈15dB, 사실상 AWGN에 근접)", "위성 도심협곡/저앙각(라이시안 K≈0dB 근처)", "실내 심한 다중경로(나카가미 m=0.5, 레일리보다 심한 페이딩)".

## 3. 파일 구조

```
/apps/fading-channel-sim/
  index.html                  # 레이아웃: 헤더 + 컨트롤 패널(입력) + 출력 패널(시간축 차트/PDF·히스토그램 차트/아웃티지 카드)
  css/style.css                # 반응형(모바일 세로 스택), 기존 3개 앱과 톤(색상/여백/카드 스타일) 통일
  js/fading.js                  # 채널 생성 핵심: 저역통과 가우시안 프로세스(sum-of-sinusoids/Clarke 근사) 생성기,
                                #   Rayleigh/Rician/Nakagami 포락선 샘플러, Box-Muller 가우시안 난수
  js/theory.js                  # 이론 함수: 레일리/라이시안/나카가미 PDF, Bessel I0 급수근사, Gamma 함수 근사(Lanczos),
                                #   하위 불완전감마 근사(나카가미 CDF/아웃티지), Marcum-Q 수치적분 근사(라이시안 아웃티지),
                                #   K↔m 변환
  js/stats.js                   # 실측 히스토그램 집계, 실측 아웃티지 비율 누적 계산, 이동창(윈도우) 관리
  js/charts.js                  # Chart.js 설정: (1) 시간축 포락선 라인차트+임계선/음영, (2) PDF-히스토그램 오버레이 차트
  js/main.js                    # 상태관리, UI 이벤트 바인딩(모델 전환/슬라이더/프리셋/재생·일시정지·리셋),
                                #   requestAnimationFrame 시뮬레이션 루프
  js/vendor/chart.umd.min.js    # apps/link-budget-calc(또는 doppler-sim/constellation-sim, 세 곳 모두 Chart.js v4.4.4
                                #   동일 UMD 빌드)의 사본을 그대로 복사해 재사용. 신규 다운로드 불필요.
```

## 4. 주요 UI 구성

- **헤더**: 제목("위성링크 소규모 페이딩 시뮬레이터: 레일리·라이시안·나카가미") + 한 줄 설명.
- **좌측(모바일에서는 상단) 컨트롤 패널** (`input-panel`, 기존 앱과 동일한 `param-group`/`preset-row`/`param-label`/`param-value` 클래스 재사용):
  - 페이딩 모델 선택: 버튼 3개(Rayleigh / Rician / Nakagami-m), 활성 모델만 강조(`preset-btn active` 패턴).
  - K-factor 슬라이더(dB, Rician 선택 시만 표시) 또는 m 슬라이더(Nakagami 선택 시만 표시). 비활성 모델의 슬라이더는 숨김.
  - 평균 SNR $\bar\gamma$ 슬라이더(dB).
  - 도플러 확산 $f_D$ 슬라이더(정규화 $f_D T_s$ 또는 Hz, 완만/빠른 페이딩 라벨 표시).
  - 아웃티지 임계값 $\gamma_{th}/\bar\gamma$ 슬라이더(dB).
  - 재생/일시정지/리셋 버튼.
  - 프리셋 버튼 4개(위 2번 항목 참조).
  - `hint-box`(기존 앱 관례): "K가 클수록 라이시안이 AWGN에 가까워지고, m=1은 레일리와 정확히 같습니다" 같은 tex 근거 설명 텍스트.
- **중앙 출력 패널** (`output-panel`):
  - **차트 1 — 시간축 포락선**: x축 시간, y축 포락선 전력(dB). 실시간 스크롤 라인, 임계값 수평 점선, 임계값 아래 구간 음영 강조.
  - **차트 2 — PDF vs 히스토그램**: x축 정규화 전력 $\gamma/\bar\gamma$(또는 진폭 r), 막대는 누적 몬테카를로 히스토그램, 선은 현재 모델의 이론 PDF. 모델 전환 시 즉시 다시 그려짐.
  - **요약 카드**: 누적 샘플 수, 실측 아웃티지 확률 vs 이론 아웃티지 확률(막대 또는 숫자 비교), 현재 K/m 값과 상호 근사 변환값.

## 5. 사용할 기술

- 순수 HTML/CSS/JS, 프레임워크 없음.
- **Chart.js 재사용 확인**: `apps/doppler-sim/js/vendor/chart.umd.min.js`, `apps/link-budget-calc/js/vendor/chart.umd.min.js`, `apps/constellation-sim/js/vendor/chart.umd.min.js` 세 파일 모두 존재하며 동일한 Chart.js UMD 빌드다. 이 중 하나를 그대로 복사해 `apps/fading-channel-sim/js/vendor/chart.umd.min.js`로 사용한다(신규 CDN 다운로드 불필요).
- **직접 구현이 필요한 수치 함수** (외부 라이브러리 없이 순수 JS):
  - Bessel $I_0$ 급수근사: $I_0(x)=\sum_{k=0}^{\infty}\dfrac{(x/2)^{2k}}{(k!)^2}$ (라이시안 PDF/아웃티지 계산에 필요).
  - Gamma 함수 $\Gamma(m)$: Lanczos 근사(나카가미 PDF 정규화 상수에 필요, 정수/반정수 m은 정확 재귀식으로도 처리 가능).
  - 하위 정규화 불완전감마함수 $P(m,x)$: 급수전개(작은 x)/연분수(큰 x) 근사(나카가미 이론 아웃티지 확률·CDF).
  - Marcum-Q 함수 수치근사(라이시안 이론 아웃티지 확률) — 급수전개 또는 수치적분으로 직접 구현.
  - 저역통과 가우시안 프로세스 생성: sum-of-sinusoids(Clarke 모델, $N$개의 등간격 도플러 성분 합) 또는 AR(1) 필터링된 가우시안 잡음 중 구현 단순성을 고려해 선택(Build 단계에서 확정). 난수는 Box-Muller로 직접 생성.

## 6. 구현 범위 외 (이번 버전에서 제외)

- **그림자 라이시안(shadowed-Rician) 2단계 모델**과 **Loo 모델**: tex 3장(311줄)·4장(428줄)에서 언급되지만, K 자체가 확률변수가 되는 2단계 모델은 본 앱 범위를 벗어남(향후 별도 앱 후보로 남김).
- **다이버시티/MRC 결합**(5부, 596~630줄 주제): 여러 독립 페이딩 branch를 합치는 시뮬레이션은 다루지 않음(별도 앱 후보).
- **페이딩 채널 위에서의 실제 변조 성능(평균 SER/BER)**: `constellation-sim`이 AWGN 기준 SER/BER을 이미 다루므로 중복 회피 차원에서 본 앱은 채널 통계(포락선/PDF/아웃티지) 자체에만 집중하고 BER 곱분(적분)까지는 계산하지 않음.
- **자기상관함수·코히어런스 시간 $T_c$의 정량적 그래프**(5장 도플러/자기상관 절): 본 앱의 $f_D$ 슬라이더는 페이딩 속도를 정성적으로만 조절하며, 자기상관함수 자체를 그리는 별도 차트는 만들지 않음(별도 앱 후보).
- 다중경로 개수 $N$ 세부 조정, Jakes 이외의 도플러 스펙트럼 형태 선택 옵션.
- 사용자 계정/저장 기능, 시뮬레이션 결과의 서버 저장·공유.
