# Build 지침: PSK/QAM 성상도 & BER 시뮬레이터

이 파일은 Build 서브에이전트 전용 작업 지침이다. 반드시 아래 범위만 수정한다.

## 범위

**수정 가능**: `/home/hugok/MY-BLOG/apps/constellation-sim/` 폴더 안의 파일만 새로 만든다.
**절대 건드리지 않음**: 블로그의 다른 파일(index.html, css/, js/home.js, posts/, 다른 apps/* 폴더 등) 일체.

## 계획 문서

`/home/hugok/MY-BLOG/spec.md`에 이번 앱의 전체 스펙(기능 목록, 파일 구조, UI 구성, 사용 기술, 구현 범위 외)이 정리되어 있다. 이 문서를 그대로 따라 구현한다.

## 참고할 기존 앱

- `/home/hugok/MY-BLOG/apps/link-budget-calc/` — 가장 최근에 만든 자매 앱. UI 톤(색상, 레이아웃, 슬라이더 스타일), Chart.js 사용 패턴, Q함수(Abramowitz–Stegun 근사) 구현을 그대로 참고/재사용한다.
- `/home/hugok/MY-BLOG/apps/link-budget-calc/js/vendor/chart.umd.min.js` — 이 파일을 `apps/constellation-sim/js/vendor/`로 그대로 복사해서 재사용한다(CDN 사용 금지, 새로 다운로드하지 않는다).

## 소스 자료 (수식의 근거)

`/mnt/c/Users/hugok/Claude/Projects/doc/위성통신/위성통신_소스.tex`의 509번째 줄 부근 `\section{디지털 변조 성능: AWGN 위의 PSK와 QAM}` 절을 반드시 읽고, 그 안의 수식(BPSK/QPSK/M-PSK/M-QAM의 정확한 SER/BER 공식)을 그대로 JS로 옮긴다. 임의로 다른 근사식을 쓰지 않는다.

## 완료 기준

- spec.md의 "핵심 기능 목록"과 "주요 UI 구성"에 있는 항목을 모두 구현한다.
- spec.md의 "구현 범위 외" 항목은 만들지 않는다(스코프 확장 금지).
- 모바일에서도 쓸 수 있도록 반응형으로 만든다(CLAUDE.md 웹앱 규칙).
- 외부 라이브러리는 로컬 복사된 Chart.js 하나만 쓴다. 다른 CDN이나 패키지를 추가하지 않는다.
- 브라우저 콘솔 에러 없이 로드되고, 슬라이더/버튼 조작 시 성상도와 BER 곡선이 실시간으로 갱신되어야 한다.

작업이 끝나면 무엇을 만들었는지, 파일 목록과 함께 간단히 보고한다. (Review는 별도 서브에이전트가 수행하므로 이 에이전트는 자체 브라우저 테스트를 깊게 할 필요는 없지만, 문법 오류가 없는지 정도는 확인한다.)
