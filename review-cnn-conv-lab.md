# Review 결과: cnn-conv-lab

리뷰어: Review 서브에이전트 (Build 에이전트와 별개, 읽기 전용 검증만 수행)
검증 방식: 코드 직접 읽기, `node --check`/`node -e`로 conv-math.js 함수 직접 로드·재계산,
`python3 -m http.server` + curl로 10개 리소스 200 확인, Playwright(Chromium headless, 로컬 설치)로
실제 브라우저 로드·클릭·스크롤·리사이즈까지 재현, 원문 tex 파일(8부) 전체 재독.

## 총평

**전체 통과.** 파일 완전성/제약 조건/브라우저 동작/수학·로직/UI 모든 항목에서 재현 가능한 근거로 확인.
발견된 문제는 **0건(치명적/중대 문제 없음)**, **경미(Low) 수준의 문서 표현 불일치 1건**만 기록(코드 버그
아님, 아래 "발견된 문제" 참조).

**섹션 3/4 원문 대조 결론**: Build 에이전트가 주장한 두 수치 재현(섹션 3의 156개/약 480만개, 섹션 4의
`H=W=11, C_in=120, k=5, C_out=20, C_bottleneck=6` → 726만/45만) 모두 **원문과 정확히 일치**함을
`/mnt/c/Users/hugok/Claude/Projects/doc/머신러닝과_인공지능/머신러닝과_인공지능_소스.tex` 1546행·
1562~1575행 부근을 직접 읽고 확인했다. Build 지침 파일의 괄호 설명("채널 120→20")이 원문과 어긋나
있었다는 Build의 정정 주장도 **타당함**을 확인했다(아래 4-2 상세 참조). Build가 원문을 잘못 읽었을
가능성은 검토 결과 없음.

---

## 1. 파일 완전성

- [x] `index.html`(13,346 bytes), `css/style.css`(10,394 bytes), `js/conv-math.js`, `js/conv-demo.js`,
  `js/hyperparam-explorer.js`, `js/param-count.js`, `js/bottleneck-calc.js`, `js/resnet-gradient.js`,
  `js/main.js` 모두 존재 확인 (`ls -la` 직접 실행, 근거: 위 파일 크기·타임스탬프 확인).
- [x] `js/vendor/chart.umd.min.js`가 `apps/gradient-descent-lab/js/vendor/chart.umd.min.js`와 동일한
  파일인지 `diff`와 `md5sum` 둘 다로 직접 확인:
  ```
  diff ... → 출력 없음 (동일)
  md5sum 양쪽 → 3a1612b2a2ed332a6c1793fc73fa564a5 (동일 해시)
  ```
  신규 CDN이나 다른 버전이 아님을 확인.

이상 없음.

## 2. 제약 조건 준수

- [x] `grep -n 'type="module"' index.html` → 결과 없음. `grep -n 'src="https' index.html` → 결과 없음.
  외부 CDN/모듈 스크립트 미사용 확인.
- [x] `git status --porcelain` 직접 재확인: `apps/cnn-conv-lab/` 신규 폴더와 이번 작업 사이클에서 생긴
  `.claude/*.md`, `spec-ml-sim-2.md`(Plan 단계 산출물)만 미추적(`??`) 상태로 나타남.
  `git diff --stat`(추적 파일 변경분)은 **빈 결과** — 기존에 git이 추적하던 파일은 단 한 줄도 수정되지
  않았음을 직접 확인(Build 보고를 그대로 믿지 않고 재검증). `index.html`(블로그 루트) 등 다른
  `apps/*` 폴더도 전혀 건드리지 않음(`ls apps/`로 기존 5개 폴더 + cnn-conv-lab만 존재 확인).
- [x] spec 7절(구현 범위 외) 항목 점검: `grep -rniE "tensorflow|tfjs|backprop|drag|dataTransfer|
  dropzone|input type=\"file\"|batchnorm|dropout" apps/cnn-conv-lab/` → 매치 없음(exit code 1).
  실제 역전파 학습, 파일 업로드/드래그앤드롭, TF.js, 배치정규화/드롭아웃 시각화 모두 미구현 확인.
  LeNet-5/AlexNet/VGG/GoogLeNet/ResNet 전체 아키텍처 층별 재현도 코드에 없음(섹션 3/4은 각각 첫
  합성곱층 파라미터 수, 1×1 병목 연산량만 발췌 계산할 뿐 층별 시뮬레이션 없음 — 코드 전체 읽고 확인).

이상 없음.

## 3. 브라우저 동작 (정적 서버 + 헤드리스 브라우저)

- [x] `python3 -m http.server`(서버 기동과 curl을 같은 bash 호출 안에서 실행)로 10개 리소스 전부 200
  확인:
  ```
  200  apps/cnn-conv-lab/index.html
  200  apps/cnn-conv-lab/css/style.css
  200  apps/cnn-conv-lab/js/conv-math.js
  200  apps/cnn-conv-lab/js/conv-demo.js
  200  apps/cnn-conv-lab/js/hyperparam-explorer.js
  200  apps/cnn-conv-lab/js/param-count.js
  200  apps/cnn-conv-lab/js/bottleneck-calc.js
  200  apps/cnn-conv-lab/js/resnet-gradient.js
  200  apps/cnn-conv-lab/js/main.js
  200  apps/cnn-conv-lab/js/vendor/chart.umd.min.js
  ```
- [x] `node --check`를 9개 js 파일(vendor 포함) 전부에 개별 실행 → 전부 `OK`, 구문 오류 없음.
- [x] index.html의 id 참조와 실제 DOM id 1:1 일치 확인: 모든 js 파일에서 `getElementById('...')`로
  참조하는 id를 추출(52개)해 index.html에 정의된 id 목록과 `comm -23`으로 대조 → **불일치 0건**.
  (`hpBindSlider()`처럼 함수 인자로 id를 넘기는 5개 슬라이더 id도 개별적으로 소스에서 확인, 모두
  index.html에 존재)
- [x] **헤드리스 브라우저(Playwright/Chromium, 이번 세션에 로컬 설치해 직접 실행)로 실제 로드해
  검증** — "가능하면" 조건을 충족해 정적 분석에 그치지 않고 실제 렌더링까지 확인:
  - 페이지 로드 후 `console` 메시지·`pageerror` 이벤트 모두 **0건** (콘솔 에러 없음)
  - `#pc-lenet-btn` 클릭 → `#pc-fc-value`="4,821,600 (약 482만)개", `#pc-conv-value`="156개"
  - `#bn-googlenet-btn` 클릭 → `#bn-direct-value`="7,260,000회", `#bn-bottleneck-value`="450,120회"
  - `#hp-formula-text` 기본값 = "n' = ⌊(11 + 2×0 - 3) / 1⌋ + 1 = 9"
  - 이미지 캔버스 픽셀 클릭 → `#dotproduct-text` 실제로 갱신됨(최초 시도 시 뷰포트 밖 스크롤 위치
    문제로 오검출했으나, 이는 테스트 스크립트의 좌표 계산 문제였음을 `image[0][0]` 값 변화로 직접
    재확인해 배제 — 아래 5절 참조)
  - 재생 버튼 클릭 → play 버튼 disabled로 전환, 위치 텍스트가 800ms 후 실제로 변함(애니메이션 동작),
    일시정지 클릭 후 800ms 대기 시 위치 텍스트 불변(정지 확인)
  - 모바일 375px 뷰포트에서 `document.body.scrollWidth`(376px) vs `clientWidth`(375px) — 1px 차이는
    서브픽셀 반올림 수준, 실질적 가로 오버플로우 없음

이상 없음(정적 분석이 아니라 실제 브라우저 실행으로 확인).

## 4. 수학/로직 재검증 (가장 중요한 섹션)

모든 계산은 `conv-math.js`를 Node에 그대로 로드해 독립적으로 재실행한 결과다(Build 보고 수치를 베끼지
않고 직접 재현).

### 4-1. 섹션 1: dot product 공식

```js
function dotProductAt(image, kernel, row, col) {
  ...
  var imgVal = image[row + u][col + v];
  var kVal = kernel[u][v];
  var prod = imgVal * kVal; sum += prod;
  ...
}
```
공식 `Σ image[i+u][j+v]*kernel[u][v]`와 정확히 일치. 직접 손계산 대조: 4×4 이미지
`[[1,2,3,0],[4,5,6,0],[7,8,9,0],[0,0,0,0]]`에 항등 커널(중앙만 1)을 적용하면
`convolve2D(...)` 결과가 `[[5,6],[8,9]]`로 나왔고, 이는 각각 `image[1][1]=5, image[1][2]=6,
image[2][1]=8, image[2][2]=9`와 정확히 일치(항등 커널이므로 커널 중심이 가리키는 원본 픽셀 값이
그대로 나와야 함). 검증 통과.
또한 계산식 표시(`dotproduct-text`)에는 정규화 전 raw 값이 그대로 표시됨을 Playwright로 확인
(예: `-53.00`처럼 클리핑 없는 값).

### 4-2. 섹션 2: 출력 크기 공식

`outputSize(n,h,s,p) = Math.floor((n+2*p-h)/s)+1` — 공식과 정확히 일치.
- `outputSize(11,3,1,0)` → **9** (직접 재계산, Build 주장과 일치)
- `outputSize(10,3,2,1)` → **5** (지침의 예시 `floor((10+2-3)/2)+1 = floor(4.5)+1 = 5`와 정확히 일치,
  Build가 언급하지 않은 값이지만 review 지침의 요구대로 별도 조합으로 직접 검증)

최대풀링/평균풀링이 실제로 다른 값을 내는지: `mat=[[1,2],[3,4]]`에 대해
`pool2D(mat,2,2,'max')` = `[[4]]`, `pool2D(mat,2,2,'avg')` = `[[2.5]]` — 서로 다름, 정상 동작 확인.

### 4-3. 섹션 3: 합성곱 파라미터 공식과 완전연결 비교 가정

`convParams(h,cIn,cOut) = (h*h*cIn+1)*cOut` — 공식과 일치. `convParams(5,1,6)` → **156**
(직접 재계산: `(5*5*1+1)*6 = 26*6 = 156`, Build 주장과 일치하며 원문 "6×26=156개"와도 정확히 일치).

**완전연결 비교 가정의 원문 대조**: 원문(1546행 부근)은 다음과 같이만 서술한다 —
> "만약 완전연결층으로 32×32=1024차원 입력을 6×28×28=4704차원 출력에 연결했다면
> 1024×4704≈480만 개의 파라미터가 필요했을 것입니다."

원문은 **순수 곱셈(1024×4704)만** 언급하고 편향(bias)을 더하지 않는다. 직접 계산하면
`1024×4704 = 4,816,896`(≈481.7만, 원문은 이를 "약 480만"으로 뭉뚱그려 표현).
Build의 `fcParams(inputUnits, outputUnits) = inputUnits*outputUnits + outputUnits`는 **편향 항
`+ outputUnits`(=+4704)를 추가로 더한 가정**이며, `fcParams(1024,4704)` → **4,821,600**(≈482만)이
나온다. 이는:
- **원문에 명시적으로 나온 숫자가 아니라 Build가 "완전연결도 유닛마다 편향 1개씩 가진다"는 관례를
  적용해 역산·확장한 가정**이다(build 지침 70~73행에서도 이 가정을 스스로 명시하고 있음. 코드 주석
  `param-count.js` 5~9행에도 동일하게 명시되어 있어 투명성은 확보됨).
- 이 가정 자체는 신경망 관례상 불합리하지 않으나(완전연결층도 보통 편향을 가짐), **원문이 실제로
  전달한 근사값 "약 480만"과 코드가 산출하는 정밀값 "약 482만"·표시값 "4,821,600 (약 482만)개" 사이에
  작은 괴리가 있고, index.html 섹션 3 설명 문구는 여전히 "약 480만개"라고 적어 실제 표시값(482만)과
  살짝 어긋난다** — 이는 아래 "발견된 문제" 1건으로 별도 기록(Low, 수치 오류 아님, 표현 불일치).

### 4-4. 섹션 4: 1×1 합성곱 연산량 — GoogLeNet 예시 원문 대조 (가장 중요)

원문(1562~1575행 부근)을 직접 읽고 정확한 조건을 확인했다. 원문 전문(발췌):

> "예를 들어 120채널 입력에 5×5 커널 20개를 바로 적용하면 연산량이
> $20\times11\times11\times(120\times5\times5) \approx 726\text{만 회}$
> 인데, 먼저 1×1 커널 6개로 채널을 120→6으로 줄인 뒤 5×5 커널 20개를 적용하면
> $6\times11\times11\times(120\times1\times1) + 20\times11\times11\times(6\times5\times5) \approx 45\text{만 회}$"

여기서 원문이 명시하는 조건은 정확히: **H=W=11, C_in=120, k=5(5×5 커널), C_out=20(5×5 커널 20개),
C_bottleneck=6(1×1 커널 6개, 채널을 120→6으로 축소)**.

이는 **Build가 주장한 정정값과 정확히 일치**한다. 반면 Build 지침 파일(`build-cnn-conv-lab-instructions.md`
84행)과 spec(`spec-ml-sim-2.md` 35행)에 있던 괄호 설명 "채널 120→20"은, 문면 그대로 읽으면 "1×1
병목 단계가 120채널을 20채널로 줄인다"는 뜻으로 오독될 소지가 있다. 실제로 이 오독된 해석
(C_bottleneck=20으로 대입)으로 직접 재계산해보면:

```
bottleneckConvOps(11,11,5,120,20,20).total
  = 11×11×1×1×120×20 + 11×11×5×5×20×20
  = 290,400 + 1,210,000 = 1,500,400 (≈150만)
```

이는 spec/원문이 요구하는 "45만"과 전혀 맞지 않는다. 즉 "채널 120→20"이라는 괄호 설명을 병목 채널
수로 오독하면 목표 수치(45만)를 재현할 수 없고, 원문을 실제로 대조해야만 "120→20"은 (전체 파이프라인의
입력→최종 출력 채널) 관계를 가리키는 것이지 (1×1 병목 단계의 채널 축소)를 가리키는 것이 아님을 알 수
있다. **Build의 정정("괄호 설명이 원문과 어긋나 있었다")은 문면상 오독 가능성이 실재하고, 정정된 값이
원문과 정확히 일치하므로 타당하다고 판단한다.** Build가 원문을 잘못 읽었을 가능성은 이번 재검토로
배제되었다.

수치 재계산(Node로 conv-math.js 직접 로드):
- `directConvOps(11,11,5,120,20)` → **7,260,000** (원문의 "≈726만 회"와 정확히 일치, 근사가 아니라
  정확히 일치하는 정수값)
- `bottleneckConvOps(11,11,5,120,20,6)` → `{stage1: 87120, stage2: 363000, total: 450120}`
  (원문의 두 항 `6×11×11×120=87,120`과 `20×11×11×150=363,000`을 그대로 재현, 합계 450,120은
  원문의 "≈45만 회"와 정확히 일치)

`directConvOps`, `bottleneckConvOps` 함수 구현도 코드에서 직접 읽어 공식과 일치함을 확인:
```js
function directConvOps(H, W, k, cIn, cOut) { return H * W * k * k * cIn * cOut; }
function bottleneckConvOps(H, W, k, cIn, cOut, cBottleneck) {
  var stage1 = H * W * 1 * 1 * cIn * cBottleneck;
  var stage2 = H * W * k * k * cBottleneck * cOut;
  return { stage1: stage1, stage2: stage2, total: stage1 + stage2 };
}
```
공식과 정확히 일치. `bottleneck-calc.js` 상단 주석(4~10행)에도 이 원문 대조 결론을 정확히 남겨두고
있어(코드 자체가 검증 가능한 근거를 포함) 향후 유지보수 시에도 오독 위험이 낮음.

### 4-5. 섹션 5: 잔차연결 기울기 흐름

```js
function gradientPlain(L, fPrime) { if (L <= 1) return 1; return Math.pow(fPrime, L - 1); }
function gradientResidual(L, fPrime) { return gradientPlain(L, fPrime) + 1; }
```
공식 `Π f'_i`, `Π f'_i + 1`과 일치(L-1개 층을 거치는 경로이므로 지수 `L-1`도 타당).
f'=0.5로 L=1,2,5,10,20,30,60에서 직접 재계산:

| L | plain (일반) | residual (잔차) |
|---|---|---|
| 1 | 1 | 2 |
| 2 | 0.5 | 1.5 |
| 5 | 0.0625 | 1.0625 |
| 10 | 0.001953125 | 1.001953125 |
| 20 | 1.907e-6 | 1.0000019 |
| 30 | 1.863e-9 | 1.0000000019 |
| 60 | **1.734723475976807e-18** | **1**(부동소수점 정밀도 한계로 1.0과 구별 안 됨, 수학적으로는 1보다 미세하게 큼) |

`L=60`에서 plain 값이 정확히 `1.7347...e-18`로 Build 주장(`1.7e-18`)과 일치(반올림 표현 차이일 뿐).
잔차연결 값은 모든 L에서 `plain+1 ≥ 1`이 항상 성립(코드 구조상 자명하지만 수치로도 확인). Build 주장
"L=1~60, f'=0.5일 때 일반 신경망 곡선은 1.7e-18까지 수렴, 잔차연결 곡선은 항상 ≥1 유지" **확인됨**.

이상 없음.

## 5. UI/CSS

- [x] **섹션 1**: Playwright로 이미지 캔버스 좌표 (10,10) 클릭 시 `convDemoState.image[0][0]`이
  40→91→142로 51씩 순환 증가함을 직접 확인(코드의 `(cur+51)%256` 로직과 일치), `dotproduct-text`도
  즉시 갱신됨을 확인. 커널 프리셋 select를 `custom`으로 바꾸고 첫 번째 `.kernel-cell`에 `9` 입력 시
  dotproduct 텍스트가 변경됨을 확인(커스텀 커널 즉시 반영). 재생 버튼 클릭 시 play 버튼 disabled,
  800ms 후 위치가 실제로 이동(애니메이션 동작), 일시정지 클릭 후 800ms 대기해도 위치 불변(정지 확인)
  — 재생 중에만 루프가 도는 것을 실측으로 확인.
  (첫 시도에서 페이지 스크롤 위치 때문에 클릭 좌표가 뷰포트 밖(y=-1531)으로 나가 오검출했던 것은
  테스트 스크립트의 문제였고, `boundingBox()` 재확인 및 `locator.click({position})` 사용으로
  재현·정정함 — 앱 자체의 버그 아님)
- [x] **섹션 2**: `hp-h-slider`/`hp-s-slider`/`hp-p-slider`(모두 index.html에 존재)와 `hp-n-input`이
  모두 존재, `hpBindSlider`로 값 변경 시 `hpRenderAll()`(공식 텍스트 + 캔버스 재계산) 호출 확인.
  기본 로드 시 공식 텍스트가 `n' = ⌊(11 + 2×0 - 3) / 1⌋ + 1 = 9`로 렌더링됨을 Playwright로 확인.
  패딩은 `hpRenderInput()`에서 패딩 영역만 `#3a3a55`(회색) 채우기 + `#a0a0c0` 별도 테두리로 시각적
  구분(코드 직접 확인). 최대/평균풀링 토글 버튼 클릭 시 `hpState.poolMode` 전환 및 `hpRenderAll()`
  재호출 확인(4-2절에서 max/avg가 실제로 다른 값을 냄을 이미 수치로 증명).
- [x] **섹션 3**: `pc-lenet-btn` 클릭 시 `pcLoadLeNetPreset()`이 H=32,W=32,Cin=1,h=5,Cout=6로 채우고
  Playwright 실측 결과 `pc-conv-value`="156개", `pc-fc-value`="4,821,600 (약 482만)개"로 확인(156은
  정확히 일치, 482만은 4-3절 참조). Chart.js 옵션에 `scales.y.type: 'logarithmic'` 명시되어 있어
  로그 스케일 축 사용 확인(코드 직접 확인).
- [x] **섹션 4**: `bn-googlenet-btn` 클릭 시 `bnLoadGoogLeNetPreset()`이
  H=11,W=11,Cin=120,Cout=20,k=5,Cbottleneck=6으로 채움(코드 직접 확인) — 4-4절에서 확인한 원문
  기준 정확한 값과 일치. Playwright 실측 결과 `bn-direct-value`="7,260,000회",
  `bn-bottleneck-value`="450,120회"로 확인.
- [x] **섹션 5**: `rg-L-slider`(min=1,max=60), `rg-fprime-slider`(min=0.1,max=1.0,step=0.01) 둘 다
  index.html에 존재 확인. Chart.js `type:'line'`, 두 데이터셋("일반 신경망"/"잔차연결 포함") 존재,
  `rg-log-toggle` 체크박스로 `scales.y.type`을 `'logarithmic'`/`'linear'` 전환하는 코드 확인.
- [x] 상단 앵커 네비게이션: `main.js`의 `NAV_SECTIONS` 5개 항목이 `nav-tabs`(탭)와 `nav-select`
  (드롭다운) 둘 다에 동적 생성되고, 클릭/change 시 `scrollIntoView` 호출 확인. CSS 640px 미디어
  쿼리에서 `.nav-tabs{display:none}`, `.nav-select{display:block}`로 전환되어 스펙의 "모바일에서는
  드롭다운" 요구와 일치.
- [x] 모바일 375px: Playwright로 실제 뷰포트를 375×800으로 설정해 확인한 결과
  `document.body.scrollWidth=376px` vs `clientWidth=375px` — 사실상 가로 오버플로우 없음(1px는
  서브픽셀 반올림). CSS 900px 브레이크포인트에서 `.s1-layout`과 `.hp-canvas-row`가
  `flex-direction: column`으로 전환되어 좌/중/우 패널이 세로로 스택됨을 코드로 직접 확인. 640px,
  400px 브레이크포인트도 각각 존재(컨트롤 그룹 폭 조정, 차트 높이 축소 등).

이상 없음.

---

## 발견된 문제 목록

### 1. (Low) 섹션 3 설명 문구 "약 480만개"와 실제 표시값 "482만" 간의 표현 불일치

- **위치**: `apps/cnn-conv-lab/index.html` 152행(섹션 3 `section-desc`) vs
  `apps/cnn-conv-lab/js/param-count.js`(`fcParams` 계산 결과 표시)
- **내용**: index.html 섹션 3 설명 문구는 "156개 vs 약 480만개 비교를 그대로 재현합니다"라고 적혀
  있으나, "LeNet-5 예시 불러오기" 클릭 시 실제 화면에 표시되는 값은 `formatKoreanNumber`가 산출하는
  "4,821,600 (약 482만)개"이다. 원인은 `fcParams`가 원문에 없는 편향 항(`+ outputUnits`)을 추가로
  더하는 가정을 쓰기 때문(4-3절 참조) — 이 가정 자체는 build 지침에 명시되어 있고 UI에도
  `pc-assumption-text`로 투명하게 설명되므로 "버그"는 아니지만, 정적 설명 문구(480만)와 동적 계산
  결과(482만)가 살짝 어긋나 사용자에게 사소한 혼란을 줄 수 있다.
- **심각도**: Low(수치 계산 로직 자체는 정확하고 일관됨, 단지 두 곳의 근사 표현이 다름)
- **수정 권고**: index.html 152행의 "약 480만개"를 "약 482만개"로 맞추거나, 반대로 `formatKoreanNumber`
  표시를 "480만"으로 반올림 폭을 넓히거나, 혹은 아예 "≈480만개(교재)/482만개(편향 포함 시)"처럼 두
  근사값을 함께 명시. 어느 쪽이든 코드 로직 변경이 아니라 표현(문구/반올림 방식)만 조정하면 됨.

그 외 파일 완전성/제약 조건/브라우저 동작/수학·로직(섹션 1~5 전체)/UI·CSS 전 항목에서 추가로 발견된
문제는 없음.

## 수정 권고 요약

- (선택) 위 Low 이슈 1건 수정: index.html 152행 문구를 "약 482만개"로 정정하거나 근사 표현 통일.
- 그 외 수정 필요 사항 없음. 코드 품질, 원문 정합성(특히 GoogLeNet 예시), 브라우저 동작 모두 기준을
  충족하여 Embed 단계로 진행해도 무방하다고 판단.
