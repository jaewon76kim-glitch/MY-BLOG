# Plan 서브에이전트 지침 — 페이딩 채널 시각화

## 목표
`위성통신_소스.tex`의 소규모 페이딩(Rayleigh/Rician/Nakagami-m) 이론을 기반으로 인터랙티브 웹앱을 기획하고 spec 파일을 작성한다.

## 배경

doc 프로젝트의 위성통신 교재(`/mnt/c/Users/hugok/Claude/Projects/doc/위성통신/위성통신_소스.tex`)에는
소규모 페이딩 통계(Rayleigh, Rician K-factor, Nakagami-m) 파트가 있다. 이미 만든 위성통신 웹앱 3개
(`apps/doppler-sim` 도플러+RTT, `apps/link-budget-calc` 링크버짓, `apps/constellation-sim` PSK/QAM
성상도+BER)는 어느 것도 이 페이딩 통계를 다루지 않았다 — 원래 최초 기획 후보 중 하나였는데 아직 안 만들어진
주제다.

## 작업 절차

1. `위성통신_소스.tex`에서 소규모 페이딩(Rayleigh/Rician/Nakagami-m) 관련 절을 실제로 읽어, 정확한 PDF 수식,
   K-factor/m 파라미터의 정의, 아웃티지 확률(outage probability)과의 연관성을 확인한다.
2. 기존 3개 앱과 겹치지 않는 것을 확인한다: `apps/doppler-sim/`, `apps/link-budget-calc/`,
   `apps/constellation-sim/`의 spec/코드를 간단히 훑어 UI 패턴(입력 슬라이더 종류, 캔버스 구성 등)을 참고하되
   똑같이 베끼지 않는다.
3. 다음을 반드시 포함하는 인터랙티브 웹앱을 기획한다:
   - Rayleigh / Rician(K-factor 슬라이더) / Nakagami-m(m 슬라이더) 세 가지를 전환하며 비교
   - 시간축 페이딩 포락선(envelope) 시뮬레이션 애니메이션(예: sum-of-sinusoids/Clarke 모델 또는 필터링된
     가우시안 잡음 기반 몬테카를로 생성)
   - 이론 PDF 곡선과 몬테카를로 실측 히스토그램을 겹쳐 그려 이론-실측 일치를 시각적으로 검증
   - 아웃티지 확률(포락선이 임계값 아래로 떨어지는 비율)과의 연관 표시(선택적 임계값 슬라이더)

## 출력 요구사항

`/home/hugok/MY-BLOG/spec-fading-sim.md` 파일을 다음 항목으로 작성한다:

1. **앱 이름(폴더명, `apps/` 아래)과 한 줄 설명**
2. **핵심 기능 목록** (5개 이내)
3. **파일 구조** — `/apps/{앱이름}/` 하위 파일 목록
4. **주요 UI 구성**
5. **사용할 기술** — 순수 HTML/CSS/JS, 벤더링할 라이브러리(기존 앱들의 `js/vendor/chart.umd.min.js` 재사용 가능한지 확인)
6. **구현 범위 외**

`data-category`는 `위성통신`으로 고정. spec 파일 작성 후 완료를 보고한다. 구현은 하지 않는다.
