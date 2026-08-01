# Review — 3gpp-spec-map

검증 일자: 2026-07-31 · 검증 전용 서브에이전트 (파일 수정 없음, 본 문서만 작성)
대상: `/home/hugok/MY-BLOG/apps/3gpp-spec-map/` (index.html, js/specs.js 69종, js/app.js, css/style.css)

## 검증 방법

- **스펙 대조**: 3GPP 공식 시리즈 목록(`https://www.3gpp.org/dynareport?code=NN-series.htm`, 21·23·24·26·27·31·33·36·37·38 시리즈 총 1,947건)을 내려받아 69개 항목의 **번호·정식 명칭·TR/TS 구분**을 프로그램으로 전수 대조.
- **릴리스 대조**: `https://www.3gpp.org/ftp/Specs/archive/{시리즈}/{번호}/` 아카이브의 실제 파일명(버전 코드)에서 각 스펙의 **최초 정식 릴리스**를 산출해 69건 전수 대조.
- **본문 대조**: NTN 관련 주장은 규격 원문(.docx)을 내려받아 문자열 검증. 사용한 판본 — 38.213 v17.13.0, 38.331 v17.17.0, 38.321 v17.15.0, 38.304 v17.11.0, 38.300 v17.17.0, 38.101-5 v17.15.0, 38.211 v17.10.0, 36.331 v17.16.0, 36.321 v17.7.0, 24.301 v17.12.0, 24.501 (Rel-18), 23.501 v17.15.0, 38.508-1 v17.11.0, 38.533 v17.9.0, 38.521-1 v17.11.0.
- **동작 검증**: `python3 -m http.server 8765` 구동 후 Chrome 150 headless를 CDP로 원격 제어(실제 브라우저 렌더링·클릭·해시라우팅·스크린샷·콘솔 수집).

---

## 1. 스펙 정확성 검증 결과

### 1.1 전수 대조 — 확인됨

| 항목 | 결과 |
|---|---|
| **스펙 번호 실재 여부** | **69/69 확인됨.** 폐지·오타 번호 없음 |
| **TR/TS 구분** | **69/69 확인됨.** TR로 표시한 4건(38.822, 38.811, 38.821, 36.763)이 공식 목록에서도 정확히 TR이고, 나머지 65건은 전부 TS |
| **`rel`(도입 릴리스)** | **69/69 확인됨.** 아카이브 최초 정식 버전과 100% 일치. 특히 24.007/24.008/31.101/31.102 = Rel-99(v3.x.y), 24.229 = Rel-5, 26.114 = Rel-7, 38.101-5·38.108·36.763 = Rel-17, 38.811 = Rel-15, 38.821 = Rel-16 모두 정확. 38.811/38.821/36.763에만 `~`를 붙이지 않은 것도 맞음(해당 릴리스 판본만 존재) |
| **`ntn: 'only'` 5건** | **확인됨.** 38.101-5(Satellite access RF and performance), 38.108(Satellite Access Node), TR 38.811, TR 38.821, TR 36.763 — 5건 모두 제목 자체가 NTN/위성 전용 |
| **`peer` 참조 무결성** | **확인됨.** 존재하지 않는 번호를 가리키는 peer 0건, 모듈을 넘어가는 peer 0건. 비상호적 매핑은 `38.214 → 36.213` 1건뿐이며 이는 "NR은 제어/데이터 분리, LTE는 통합"이라는 의도된 결과 |
| **중복 id / 잘못된 모듈 id** | 0건 |

### 1.2 앱이 강조하는 두 주장 — 둘 다 확인됨

**(1) RRM 비대칭 — 확인됨.** 공식 명칭 대조 결과:
- `TS 36.521-3` = "E-UTRA; UE conformance specification; Radio transmission and reception; **Part 3: Radio Resource Management (RRM) conformance testing**" → 521 시리즈 **안**
- `TS 38.533` = "NR; UE conformance specification; **Radio Resource Management (RRM)**" → 521 시리즈 **밖**의 독립 번호
- 근거: https://www.3gpp.org/dynareport?code=36-series.htm , https://www.3gpp.org/dynareport?code=38-series.htm

**(2) 38.213/38.214 vs 36.213 — 확인됨.**
- 38.213 "Physical layer procedures **for control**" / 38.214 "Physical layer procedures **for data**" / 36.213 "Physical layer procedures"(단일) — 앱의 서술 그대로.

### 1.3 오류 — 수정 권고 (근거 있음)

#### ① [오류·중요] `38.213`의 NTN 메모에 "도플러 사전보상"이 들어가 있음

- 38.213 v17.13.0 원문 전체에서 **"Doppler" 0회, "frequency pre-compensation" 0회**.
- 38.213이 규정하는 것은 **전송지연(시간축) 사전보상**뿐임: *"Using higher-layer ephemeris parameters for a serving satellite, if provided, a UE **pre-compensates the two-way transmission delay** on the service link based on N_TA,adjUE …"* 및 `Kcell,offset`(cellSpecificKoffset) / `KUE,offset`(MAC CE) 적용.
- **주파수(도플러) 사전보상의 규범적 위치는 TS 38.300 §16.14.2.2 "Timing Advance and Frequency Pre-compensation"**: *"The UE shall compute the frequency Doppler shift of the service link, and autonomously pre-compensate for it in the uplink transmissions, by considering UE position and the ephemeris."*
- 이를 뒷받침하는 교차근거 — **38.101-5 §6.4.1**이 직접 지목함: *"The NTN satellite UE pre-compensates the uplink modulated carrier frequency by the estimated Doppler shift **according to 3GPP TS 38.300 [9] clause 16.14.2**."*
- 38.211 v17.10.0에도 "pre-compensation" 0회(도플러 언급은 QCL의 large-scale property뿐).
- **권고**: 38.213 메모에서 "도플러 사전보상"을 빼고 "TA(공통/UE별) + K_offset"만 남기고, 도플러는 **38.300 §16.14.2.2**(설계) / **38.101-5 §6.4.1**(주파수 오차 요구) 카드로 옮길 것. (38.300이 현재 앱에 아예 없음 — 2절 참조)
- 근거 URL: https://www.3gpp.org/ftp/Specs/archive/38_series/38.213/ , https://www.3gpp.org/ftp/Specs/archive/38_series/38.300/ , https://www.3gpp.org/ftp/Specs/archive/38_series/38.101-5/

#### ② [오류] `38.331` NTN 메모의 IE 이름 `commonTimingAdvance` — 존재하지 않는 필드명

- 38.331 v17.17.0 원문에 `commonTimingAdvance` **0회**. 실제 ASN.1은 `NTN-Config-r17` 안의 **`ta-Info-r17`** 이고 그 하위가 **`ta-Common` / `ta-CommonDrift` / `ta-CommonDriftVariant`**(원문에서 직접 확인).
- 같은 메모의 `koffset`도 정확한 필드명은 **`cellSpecificKoffset-r17`**(원문 확인)이며, UE별 오프셋은 MAC CE로 주는 `K_UE,offset`.
- 나머지 나열은 **전부 실재 확인됨**: `epochTime`(16회), `ephemerisInfo`(15), `ntn-UlSyncValidityDuration`(6), `referenceLocation`(27), `distanceThresh`(12), `ntn-PolarizationDL`(5), `ntn-NeighCellConfigList`(5), `t-Service`(4).
- **권고**: `commonTimingAdvance` → `ta-Info(ta-Common/ta-CommonDrift)`, `koffset` → `cellSpecificKoffset`. ASN.1 필드명은 실무자가 그대로 grep하는 값이라 정확해야 한다.

#### ③ [오류] `23.501` NTN 메모 "5GS NTN 아키텍처(투명/재생 페이로드)" — 문서 귀속이 틀림

- 23.501 v17.15.0 원문에 **"transparent payload" 0회, "regenerative" 0회**.
- 23.501의 실제 NTN 내용은 **§5.4.10 "Support for identification and restriction of using NR satellite access"**, **§5.4.11 "Support for integrating NR satellite access into 5GS"**(5GC의 위성 RAT type, 망 선택, Tracking Area 처리, Forbidden Area/Service Area 제한), §5.8.2.15 satellite backhaul 보고.
- **투명(transparent)/재생(regenerative) 페이로드 구분은 TR 38.811·TR 38.821 소관**이며, 38.300 §16.14에도 그 표현은 없다(Rel-17 NR-NTN은 투명 페이로드만 규격화).
- **권고**: 23.501 메모를 "§5.4.11 위성 접속의 5GS 통합 — 위성 RAT type, 망 선택, TA 처리, 이동성 제한"으로 교체하고, 투명/재생 페이로드 설명은 38.821 카드로 이동.

### 1.4 확인됨 — 나머지 NTN 조항 주장 (원문 대조 완료)

| 스펙 | 앱의 주장 | 판정 · 원문 근거 |
|---|---|---|
| 38.321 | NTN 랜덤액세스 적응 — 확장 RA 응답 윈도우, HARQ 비활성 옵션 | **확인됨.** "non-terrestrial" 21회 — *"if the random access preamble was transmitted on a non-terrestrial network"*, *"UE-gNB RTT … the sum of the UE's Timing Advance value and kmac"*, `HARQ-RTT-TimerDL-NTN`(HARQ feedback enabled/disabled 별), `HARQModeA` |
| 38.304 | NTN 셀 재선택, 위치 기반 조건, t-Service | **확인됨.** `distanceThresh`+`referenceLocation` 기반 측정 개시 조건(5회), `t-Service` 기반 시간 조건(2회), `cellBarredNTN`, quasi-earth fixed cell 정의 |
| 36.321 | IoT NTN RA 적응(Rel-17~) | **확인됨.** "non-terrestrial" 18회, UE-eNB RTT/k-Mac, NTN에서의 preamble·Msg3 처리 |
| 36.331 | IoT NTN 관련 SIB·설정(Rel-17~) | **확인됨.** NTN 정의 + 변경이력 "Support of Non-Terrestrial Network in NB-IoT and eMTC" |
| 24.301 | IoT NTN 관련 타이머·절차 조정(Rel-17~) | **확인됨.** §4.8.2 "UE using satellite E-UTRAN access", §4.11 "Satellite access for CIoT", 위성 셀 다중 TAC에 따른 current TAI 정의 등 "satellite" 78회 |
| 24.501 | 5GS NTN 관련 절차·타이머 조정 | **확인됨.** §4.23 "NAS over Non-Terrestrial Network" 절이 실제로 존재 |
| 38.508-1 | "PCT/RRM/RCT 셋이 모두 이 문서를 참조" | **확인됨.** 38.533 변경이력 *"Align Annex H of TS 38.533 to Clause 7 of TS 38.508-1"*, 38.521-1 변경이력 *"Editorial correction of references to TS 38.508-1 clause 4.6 tables"* |

### 1.5 계층 배치(`m`) 판정

- **확인됨**: 37.324(SDAP)가 37 시리즈인 것 — 공식 명칭이 "E-UTRA **and** NR; SDAP specification"이라 37 시리즈가 맞고, 카드 메모의 주의 문구도 적절. l2 배치 타당.
- **확인됨**: 38.213을 PHY에 두고 "RACH/전력제어는 여기"로 표시 — 계획서 판단대로.
- **확인됨**: 38.133/36.133을 RRC·이동성에, 24.007/24.008을 NAS 공통기반에, 38.108을 RF(망 측)에 배치 — 모두 타당.
- **[의심] TR 38.821 / TR 36.763을 `rf`(RF·성능) 모듈에 배치.** 두 문서는 RF 연구가 아니라 RAN1/RAN2/RAN3 전반의 솔루션 연구(랜덤액세스·HARQ·이동성·아키텍처 포함)라, "RF·성능" 기둥 안에 있으면 성격이 오해된다. TR 38.811은 채널모델·시나리오라 RF 근접이 그나마 납득 가능. 계획서가 NTN 기둥을 두지 않기로 했으므로 대안은 (a) 모듈 이름을 "RF·성능 / NTN 연구"처럼 넓히거나 (b) "배경·연구" 소분류를 두는 것. **오류는 아니고 편집 판단 사항.**

### 1.6 정식 명칭 표기 차이 (경미 — 전부 확인 완료)

`E-UTRA`, `UE`, `ICS`, `GPRS`, `USIM` 등 정식 괄호 표기를 약어로 줄인 것은 일관되고 문제없다. 그와 별개로 **실제 제목과 다른 9건**:

| 번호 | 앱 표기 | 3GPP 공식 |
|---|---|---|
| **38.331** | NR; Radio Resource Control (RRC) **protocol specification** | NR; Radio Resource Control (RRC)**; Protocol specification** |
| **36.331** | 동일 형태 | E-UTRA; Radio Resource Control (RRC)**; Protocol specification** |
| **38.304** | procedures in Idle mode **and RRC Inactive state** | procedures in Idle mode **and in RRC Inactive state** |
| **38.101-3** | Range 1 and Range 2 **Interworking with other radios** | Range 1 and Range 2 **Interworking operation with other radios** |
| **38.521-3** | Range 1 and Range 2 **Interworking** (뒤 잘림) | Range 1 and Range 2 **Interworking operation with other radios** |
| **38.101-5** | Satellite access **Radio Frequency** and performance requirements | Satellite access **Radio Frequency (RF)** and performance requirements |
| **38.508-2** | Common Implementation Conformance Statement (ICS) *(끝)* | … (ICS) **proforma** |
| **36.521-3** | Part 3: **RRM** conformance testing | Part 3: **Radio Resource Management (RRM)** conformance testing |
| **36.307** | Requirements on **UEs** supporting… | Requirements on **User Equipments (UEs)** supporting… |

가장 눈에 띌 것은 **38.331/36.331의 세미콜론**(RRC 다음이 `;`이고 Protocol이 대문자)이다. 25년차 RRC 담당자라면 바로 알아본다.

### 1.7 기타 내용 점검 (확인됨)

38.322 "NR RLC는 concatenation 없음", 38.323 "PDCP duplication", 38.306 "featureSets/featureSetCombination", 36.306 "NB-IoT 카테고리 NB1/NB2", 36.211 "NPBCH·NPDCCH·NPUSCH", 36.101 "NB-IoT RF 포함", 24.301 "제어평면 CIoT", 33.501 "K_AUSF→K_SEAF→K_AMF→K_gNB", 31.102 "EF_IMSI/EF_LOCI/EF_EPSLOCI", 38.215 "RSRP/RSRQ/SINR" — 모두 사실관계 문제 없음.

- **[경미]** 38.201 카드의 "PHY 문서 **네 개**(211~214)" — 앱 자신이 PHY에 38.215까지 6개를 놓고 있고, 공식적으로는 38.202(Services provided by the physical layer)도 있다. "211~215" 또는 "201/202/211~215"로 고치는 편이 정확하다.

---

## 2. 누락 제안

단말 프로토콜 개발자 관점에서 **없으면 이상한** 순서로 정리했다. 번호·명칭은 공식 목록에서 확인 완료.

### 반드시 추가 권고

| 스펙 | 정식 명칭 | 이유 |
|---|---|---|
| **TS 38.300** | NR; NR and NG-RAN Overall description; Stage-2 | **가장 큰 누락.** 계획서의 NTN 조항표에도 있었는데 데이터에 없다. §16.14가 NTN UL 동기(TA + **주파수 사전보상**)의 규범적 출처이고 38.101-5가 이를 직접 참조한다. NTN 말고도 스택 전체를 조망하는 Stage-2 문서라 "구조를 먼저 보여준다"는 이 앱의 취지에 가장 잘 맞는다 |
| **TS 36.300** | E-UTRA and E-UTRAN; Overall description; Stage 2 | 위의 LTE 대응. peer 쌍이 자연스럽게 성립 |
| **TS 23.122** | NAS functions related to Mobile Station (MS) in idle mode | PLMN 선택·금지 PLMN·수동 검색의 본문. NAS 개발자가 24.301/24.501 다음으로 자주 펼치는 문서인데 통째로 빠졌다. 위성 접속 PLMN 선택도 여기 |
| **TS 38.521-5** | NR; UE conformance specification; Radio transmission and reception; **Part 5: Satellite access RF and performance** | **NTN 전용 문서인데 빠졌다.** 38.101-5의 시험 짝. 현재 RCT 기둥에 -1/-2/-3/-4만 있어 NTN 담당자 눈에는 구멍으로 보인다 |

### 추가하면 좋은 것

| 스펙 | 정식 명칭 | 이유 |
|---|---|---|
| TS 23.003 | Numbering, addressing and identification | IMSI/SUPI/GUTI/5G-S-TMSI/NAI 포맷의 유일한 출처 |
| TS 38.509 / TS 36.509 | Special conformance testing functions for UE | 시험 모드·루프백 — 적합성시험 돌리는 사람에겐 508만큼 자주 필요 |
| TS 38.522 | NR; UE conformance specification; Applicability of radio transmission, radio reception and RRM test cases | PCT에는 38.523-2(적용성)가 있는데 RCT/RRM 적용성 문서가 빠져 시험 3분류가 비대칭하게 보인다 |
| TS 37.340 | E-UTRA and NR; Multi-connectivity; Overall Description; Stage-2 | EN-DC/NSA의 본문. 현재 EN-DC는 38.101-3(RF)로만 등장해 프로토콜 측면이 비어 있다 |
| TS 38.202 / TS 36.302 | Services provided by the physical layer | PHY 세트 완성 + 38.201 메모의 "네 개" 문제 해소 |
| TS 24.526 | UE policies for 5G System (5GS); Stage 3 | URSP — 5G 단말 라우팅 정책 |
| TS 31.111 | USIM Application Toolkit (USAT) | 보안·USIM 모듈에 31.101/31.102만 있으면 절반 |
| TS 27.007 | AT command set for User Equipment (UE) | 27 시리즈. 모뎀·AP 인터페이스 담당이 매일 보는 문서 |

### 뺄 것

없음. 69종 모두 단말 관점에서 정당한 선택이다. 38.108(망 측)은 참고용 표시가 이미 되어 있어 그대로 두어도 무방.

---

## 3. 동작 검증 결과

Chrome 150 headless + CDP 실제 렌더링. `python3 -m http.server 8765`.

| 체크 | 결과 | 상세 |
|---|---|---|
| Level 0 스택도 렌더링 | **통과** | 계층 7행(NAS/RRC/UE능력/L2/MAC/PHY/공통L3) + 기둥 7개 + 범례 정상 |
| 계층 클릭 → Level 1 | **통과** | `#rrc` 진입, 카드 6장(38.331/38.304/38.133/36.331/36.304/36.133) |
| 기둥 클릭 → Level 1 | **통과** | `#t-rrm` 카드 2장 + RRM 비대칭 경고 박스 정상 출력 |
| 브라우저 뒤로가기(해시) | **통과** | `history.back()` → 전체도 복귀 |
| 앱 "← 전체 지도" 버튼 (모듈 화면) | **통과** | 전체도 복귀 |
| **앱 "← 전체 지도" 버튼 (검색·NTN 화면)** | **실패** | 아래 버그 ① |
| 검색 "38.331" | **통과** | 1건 |
| 검색 "도플러" | **통과** | 1건(38.213) |
| **검색 "RACH"** | **실패** | **0건.** 아래 버그 ② |
| "NTN만" 토글 | **통과** | 14건(전용 5 + 조항 9) 정확히 일치, `aria-pressed` 갱신됨 |
| 대응 링크 클릭 (모듈 화면 내) | **통과** | 36.331로 스크롤 + 아웃라인 하이라이트 확인(scrollY 504) |
| **대응 링크 클릭 (검색 결과 화면)** | **실패** | 아래 버그 ③ |
| 모바일 360px | **통과** | `scrollWidth == clientWidth == 360`, 가로 오버플로 0. 스택 3열이 88px+1fr+1fr로 접히고 카드도 정상 |
| 다크모드 | **통과** | `prefers-color-scheme: dark` → `rgb(15,23,42)`, `data-theme="dark"` 강제도 동작, `data-theme="light"`가 다크 미디어쿼리를 정상적으로 이김 |
| 콘솔 에러 | **거의 통과** | JS 예외 0건. 단 `GET /favicon.ico 404` 1건 |
| 데이터 무결성(런타임) | **통과** | SPECS 69 / MODULES 13, 중복 id 0, 깨진 peer 0, `when` 누락 0 |

### 버그 ① — 검색·NTN 상태에서 "← 전체 지도" 버튼이 동작하지 않음 (기능 결함)

`render()`가 `if (query || ntnOnly) return renderSearch();`로 시작하므로, 검색어가 남아 있으면 `data-back` 핸들러가 `location.hash=''`를 넣고 `render()`를 불러도 **다시 검색 화면**이 그려진다. 실측: 클릭 후 `.layer` 0개, `h2`는 여전히 "검색 결과 0건", 검색창 값 유지.
→ 검색 결과가 0건일 때 빠져나갈 방법이 검색창을 직접 지우는 것뿐이다. `data-back` 처리에서 `query=''; ntnOnly=false;` + 입력창/토글 초기화가 필요.

### 버그 ② — "RACH"로 검색하면 0건 (이 앱의 핵심 사용 시나리오)

데이터에 영문 약어가 없고 "랜덤액세스"로만 적혀 있다. 실측 0건 목록: **RACH, PRACH, beam, GNSS**. (한글 "빔"은 1건, "랜덤액세스"는 검색됨.)
단말 개발자는 한글보다 영문 약어를 먼저 친다. `when`/`ntnNote`에 약어를 병기하거나 항목에 `keywords` 필드를 추가할 것을 권고. 특히 RACH/PRACH/GNSS는 NTN 맥락에서 반드시 걸려야 한다.
- 부수적으로 짧은 질의의 부분문자열 오탐도 있다: `ICS` → 31.101/31.102가 걸림("chara**ct**er**is**tics" 안의 `ics`), `TA` → 16건. 2~3글자 질의는 번호/약어 우선 매칭으로 좁히는 편이 낫다.

### 버그 ③ — 검색 결과에서 "대응" 링크를 누르면 하이라이트와 스크롤이 사라짐

`gotoSpec()`이 `location.hash = spec.m`으로 해시를 바꾼 뒤 직접 `renderModule()` + 하이라이트를 하는데, 그 직후 비동기로 `hashchange`가 발생해 `render()`가 **innerHTML을 다시 그리고 `window.scrollTo(0,0)`** 을 호출한다. 하이라이트한 DOM 노드는 버려지고 `setTimeout`은 분리된 노드를 만진다.
실측: 검색 "36.331" → 대응 `38.331` 클릭 → 모듈은 `#rrc`로 잘 갔지만 `outline == ""`, `scrollY == 0`.
모듈 화면 안에서 누를 때는 **모든 peer 쌍이 같은 모듈에 있어** 해시가 바뀌지 않아 우연히 정상 동작한다(그래서 눈에 잘 안 띈다). 검색 결과에서만 재현.
→ `hashchange` 핸들러에서 프로그램적 해시 변경을 무시하는 플래그를 두거나, 하이라이트를 `hashchange` 이후로 미뤄야 한다.

### 계획서 대비 미구현 항목

| 계획서 요구 | 상태 |
|---|---|
| 카드에 **3GPP 공식 페이지 링크** | **없음.** 페이지 전체 `<a>`는 peer 링크뿐이고 전부 `href` 없음. 계획서 "Level 1 — 모듈 상세"의 마지막 요구사항이 빠졌다. `https://www.3gpp.org/dynareport?code=38331.htm` 형태가 실제로 동작함(본 검증에서 사용) |
| **릴리스 필터** ("Rel-15 이후만 보기 등") | **없음.** 컨트롤은 검색창 + NTN 토글뿐 |
| 다이어그램을 **인라인 SVG**로 | **미적용.** CSS Grid + div로 구현. 반응형·접근성 면에서는 오히려 나은 선택이라 결함으로 보지 않으나, 계획서와는 다름 |
| Level 0에 **SDAP 행 분리**(LTE는 "—") | **미적용.** RLC/PDCP/SDAP를 한 행으로 합쳐서, 계획서가 짚은 "SDAP는 NR에만 있다"는 비대칭이 Level 0에서 안 보인다. 37.324 카드 안에서만 언급됨 |
| 시험 508을 "셋을 받치는 별도 항목" | 적용됨(t-com 기둥) |

### 그 밖의 화면 관찰

- 스택 세로 순서에 **"UE 능력"이 RRC와 L2 사이**에 끼어 있다. 38.306/36.306은 프로토콜 계층이 아니라 능력 정의 문서라, "프로토콜 스택" 제목 아래 한 층으로 그려지면 25년차 눈에는 어색하다. 옆 기둥으로 빼거나 스택과 시각적으로 구분(점선·다른 배경)하는 편이 정확하다. 24.007/24.008 "공통 L3 기반" 행처럼 별도 취급하는 방식이 이미 앱 안에 있으니 그것을 재사용하면 된다.
- 카드 본문에 **마크다운 `**`가 그대로 노출**된다(3곳: 37.324, 38.533, 36.521-3). `card-when`은 `innerHTML`로 들어가지만 `**`는 HTML이 아니므로 리터럴로 보인다. 하필 **38.533/36.521-3가 계획서에서 "명시적으로 강조 표시"하라고 지정한 두 카드**라, 강조가 되기는커녕 별표가 보인다. CSS에 `.card-when strong` 규칙이 이미 있으니 데이터를 `<strong>`으로 바꾸면 된다.

---

## 4. 코드 품질 지적

**좋은 점**
- 외부 라이브러리 0, CDN 0, 자체 완결 — 블로그 관례 준수.
- CSS 변수 체계가 다른 앱과 일관되고, `prefers-color-scheme` + `:root[data-theme]` 양방향 오버라이드까지 정확히 구현(라이트 강제가 다크 미디어쿼리를 이기는 우선순위도 맞음).
- 데이터/렌더링 분리(`specs.js` ↔ `app.js`)가 깔끔해 스펙 추가·수정이 쉽다.
- JS 199줄로 기능 대비 매우 간결. 런타임 예외 0건.

**지적**
1. **XSS — 위험 없음.** `specs.js` 전체에 `<`, `>`, `&` 문자가 0건이고, 사용자 입력(`query`)은 필터링에만 쓰이며 `innerHTML`에 들어가지 않는다(검색 화면도 건수만 출력). 다만 데이터가 늘어날 때를 대비해 `escapeHtml()` 한 줄을 두는 편이 안전하다.
2. **키보드 접근성 결함.** `대응:` 링크가 `href` 없는 `<a data-goto>`라 **탭 포커스가 안 된다.** 모듈 화면에서 탭 이동 가능한 요소는 검색창/NTN버튼/뒤로가기 3개뿐이고 카드 간 이동 수단이 전혀 없다. `<button>`으로 바꾸거나 `href="#..."`를 부여할 것.
3. **화면 전환 시 포커스·낭독 안내 없음.** `#view`를 통째로 `innerHTML` 교체하는데 `aria-live`나 전환 후 포커스 이동이 없어, 스크린리더 사용자는 화면이 바뀐 것을 모른다. `.detail-head h2`에 `tabindex="-1"` + `focus()` 정도면 충분.
4. **불필요한 이중 렌더.** 뒤로가기 버튼이 `location.hash=''` 후 `render()`를 직접 호출하고, 이어서 `hashchange`로 또 `render()`가 돈다. 버그 ③의 원인과 같은 뿌리다. 해시 변경만 하고 렌더는 `hashchange`에 일임하는 편이 단순하다.
5. **`window.scrollTo(0,0)`을 `render()`가 무조건 호출**한다. 검색 중에는 입력 이벤트마다 `render()`가 도므로 타이핑할 때마다 스크롤이 위로 튄다.
6. **favicon 404** — 콘솔 에러 1건. 인라인 SVG data URI favicon 한 줄로 제거 가능.
7. `.hidden` 클래스가 CSS에 정의돼 있지만 어디서도 쓰이지 않는다(사소).
8. `renderOverview()`의 base-row가 `data-mod="nas"`라 클릭하면 NAS 모듈로 가는데, `aria-label`은 "NAS 공통 기반 열기"로 실제 도착지와 살짝 어긋난다(사소).

---

## 5. 종합 판정

**수정 필요 — 다만 토대는 매우 견고하다.**

전수 대조 결과 **번호 69/69, TR·TS 구분 69/69, 도입 릴리스 69/69, NTN 전용 5/5, peer 무결성 100%** 가 맞았다. 이 정도 정확도는 흔치 않고, 앱이 내세우는 두 주장(RRM 521 비대칭, 38.213/214 vs 36.213)도 공식 명칭으로 확인됐다. 게시할 가치가 충분한 결과물이다.

다만 **게시 전에 고쳐야 할 것**이 있다. 우선순위 순:

**A. 스펙 내용 (실무자가 즉시 알아볼 오류 — 반드시)**
1. `38.213`의 "도플러 사전보상" 삭제 → 38.300 §16.14.2.2 / 38.101-5 §6.4.1로 귀속 (1.3①)
2. `38.331`의 `commonTimingAdvance` → `ta-Info`(`ta-Common`), `koffset` → `cellSpecificKoffset` (1.3②)
3. `23.501`의 "투명/재생 페이로드" → §5.4.11 위성 접속 5GS 통합으로 교체, 투명/재생은 38.821 카드로 (1.3③)
4. **TS 38.300 추가**(가능하면 36.300도) — 위 1번의 귀속처이자 계획서에도 있던 문서
5. 제목 9건 표기 정정 (1.6) — 특히 38.331/36.331의 `RRC; Protocol specification`

**B. 동작 (사용성 결함 — 반드시)**
6. 검색·NTN 상태에서 "← 전체 지도" 버튼 무동작 (버그 ①)
7. "RACH"/"PRACH"/"GNSS" 검색 0건 — 영문 약어 병기 (버그 ②)
8. 카드에 `**`가 리터럴로 노출, 하필 강조하기로 한 RRM 두 카드 (3절 마지막)

**C. 계획서 미이행 (권고)**
9. 카드의 3GPP 공식 페이지 링크 추가
10. 검색 결과에서 대응 링크 클릭 시 하이라이트 소실 (버그 ③)
11. `href` 없는 `<a>` → 키보드 접근성

**D. 편집 판단 (선택)**
12. 38.521-5 / 23.122 / 38.509·36.509 등 누락 스펙 보강 (2절)
13. 스택도의 "UE 능력" 행 위치, SDAP 행 분리, TR 38.821·36.763의 RF 모듈 배치
14. 릴리스 필터, favicon

A와 B를 처리하면 게시 가능하다고 본다.

### 확인 불가로 남긴 것

- 계획서가 사용자 검토를 요청한 "NTN 조항 (2) 목록"의 **실무 유용성**(어느 조항이 실제로 가장 자주 필요한가)은 문헌 대조로 판정할 수 없다. 사실관계(해당 조항의 존재 여부)는 위에서 전부 확인했으나, 우선순위 판단은 사용자 몫이다.
- `when`(단말 개발자 관점 메모)의 서술은 검증 가능한 사실관계만 확인했다. "가장 자주 펼친다" 같은 빈도 주장은 검증 대상이 아니다.
- 38.521-1/38.533은 문서가 매우 커서 본문 텍스트 추출이 부분적일 수 있어, 두 문서에 대한 근거는 변경이력에 남은 명시적 교차참조에 의존했다(1.4 마지막 행).
