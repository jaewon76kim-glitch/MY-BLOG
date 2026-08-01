---
title: GoogLeNet 뜯어보기 — 1×1 bottleneck, inception module, global average pooling
date: 2026-07-24
tags: [CNN, GoogLeNet, inception module, deep learning]
description: GoogLeNet이 1×1 convolution으로 연산량 bottleneck을 없애는 계산 과정, naive inception module의 문제와 개선된 구조, fully connected layer를 대체하는 global average pooling의 parameter 절감까지 자세히 정리했다.
---

[지난 글](post.html?slug=ml-deep-learning-perceptron-to-llm)에서 CNN 발전사(LeNet-5 → AlexNet → VGG/GoogLeNet/ResNet)를 훑으면서 GoogLeNet은 한 문장으로만 지나갔다. 이번 글에서는 그 한 문장 안에 있던 세 가지 — 1×1 convolution의 bottleneck 효과, inception module, global average pooling — 를 계산까지 포함해서 자세히 푼다.

## fully connected의 한계, 그리고 "kernel 크기를 하나로 고정해야 하나"라는 질문

VGGNet은 "3×3 kernel을 여러 번 쌓자"는 답으로 층을 깊게 만들었다. 그런데 같은 사진 안에도 물체 크기는 제각각이다 — 클로즈업된 눈은 작은 영역(3×3 정도)만 봐도 되지만, 화면을 가득 채운 얼굴은 훨씬 넓은 영역(5×5 이상)을 봐야 한다. kernel 크기를 층마다 하나로 고정하는 대신, **한 층에서 여러 크기의 kernel을 동시에 써보고 결과를 합치면 어떨까**라는 발상이 GoogLeNet의 출발점이다. 다만 이 발상을 그대로 구현하면 연산량이 감당할 수 없이 커지는데, 그 문제를 어떻게 푸는지가 이 글의 핵심이다.

## 1. 1×1 convolution bottleneck — 연산량이 왜 10분의 1로 줄어드는가

convolution 연산량을 세는 공식부터 정리한다. 출력 feature map의 픽셀 하나(channel 하나)를 만들려면 그 위치에서 (입력 channel 수 × kernel 세로 × kernel 가로)번의 곱셈이 필요하고, 이를 모든 출력 위치와 모든 출력 channel(filter 개수)에 대해 반복한다.

```
총 연산량 = (출력 가로 × 출력 세로) × (filter 개수) × (입력 channel 수 × kernel 높이 × kernel 폭)
```

입력 channel 120, 출력 feature map 11×11, 목표 filter 20개(5×5 kernel)인 상황을 예로 든다.

**경우 1 — 5×5 kernel을 바로 적용**
```
20 × 11×11 × (120×5×5)
```
- `120×5×5 = 3000` : filter 하나가 한 위치에서 하는 곱셈 수 (입력 120channel 전체 × 5×5 영역)
- `11×11 = 121` : 출력 위치의 개수
- `20` : filter(출력 channel) 개수

```
3000 × 121 × 20 = 7,260,000 ≈ 726만 회
```

**경우 2 — 1×1 kernel로 channel을 먼저 줄인 뒤 5×5 적용**

1단계, 1×1 kernel 6개로 channel을 120→6으로 줄인다. 1×1 kernel은 공간은 보지 않고 channel만 훑으므로 공간 크기(11×11)는 그대로다.
```
6 × 11×11 × (120×1×1) = 120 × 121 × 6 = 87,120 ≈ 8.7만 회
```
2단계, 이제 6channel이 된 입력에 5×5 kernel 20개를 적용한다. 입력 channel이 120이 아니라 6이므로 한 위치당 곱셈이 `6×5×5=150`번뿐이다.
```
20 × 11×11 × (6×5×5) = 150 × 121 × 20 = 363,000 ≈ 36.3만 회
```
두 단계를 더하면
```
87,120 + 363,000 = 450,120 ≈ 45만 회
```

두 경우 모두 `11×11 × 20`(=2420)이라는 공통 인자는 같다. 차이는 **filter 하나가 한 위치에서 훑는 입력 크기**뿐이다 — 경우 1은 120channel을 통째로 훑어 `3000`이 곱해지지만, 경우 2는 1×1로 channel을 6개로 줄여놓아서 `6×5×5=150`으로 20분의 1이 된다. channel을 줄이는 1×1 연산 자체의 비용(8.7만)을 더해도, 비싼 5×5 연산이 대폭 줄어든 이득이 훨씬 커서 전체가 `726만 → 45만`, 약 16분의 1(10분의 1 이하)로 줄어든다.

즉 1×1 convolution의 역할은 "공간을 보지 않고 channel 차원만 압축하는 bottleneck(bottleneck)"이고, 이 bottleneck을 거친 뒤 비싼 kernel을 적용하면 표현력은 거의 유지하면서 연산량만 크게 줄일 수 있다.

## 2. inception module — naive 버전에서 bottleneck 구조로

**naive 버전.** 한 입력에 대해 다음 네 연산을 동시에(병렬로) 적용하고, 결과를 channel 방향으로 이어붙인다(concat).
```
입력 → 1×1 convolution  ┐
입력 → 3×3 convolution  ├→ concat → 출력
입력 → 5×5 convolution  │
입력 → 3×3 max pooling ┘
```
1×1은 국소적인 패턴, 3×3·5×5는 각각 중간·넓은 범위의 패턴을 잡고, pooling 경로는 강한 특징을 그대로 살린다. 네 결과 모두 same padding으로 공간 크기를 맞춰두면 channel 방향으로만 이어붙일 수 있다. 어느 kernel 크기가 맞을지 사람이 미리 정하지 않고, 학습 과정에서 각 경로의 weight이 알아서 유용한 만큼 조정된다.

**문제.** 입력 channel이 많은 상태에서 5×5 convolution을 그대로 걸면 위에서 본 것처럼 연산량이 폭증한다(726만 회). 게다가 pooling 경로는 channel 수를 그대로 유지하므로, 네 경로를 이어붙이면 출력 channel 수가 계속 불어나 다음 inception module에서는 입력 channel이 더 커진 상태로 같은 문제를 반복한다. 층을 몇 개만 쌓아도 감당이 안 된다.

**개선된 구조.** 비싼 kernel 앞에(그리고 pooling 뒤에) 1×1 convolution bottleneck을 끼운다.
```
입력 → 1×1 convolution (그대로 출력)                 ┐
입력 → 1×1 convolution(channel 축소) → 3×3 convolution        ├→ concat → 출력
입력 → 1×1 convolution(channel 축소) → 5×5 convolution        │
입력 → 3×3 max pooling → 1×1 convolution(channel 축소)       ┘
```
3×3·5×5 경로 앞에 1×1을 끼워 channel을 먼저 줄이고(예: 120→16) 비싼 kernel을 적용하면, `120×5×5=3000` 대신 `16×5×5=400`으로 곱셈 수가 확 줄어든다. pooling 경로 뒤의 1×1도 concat 이후 channel이 무한정 불어나는 것을 막는다. 정리하면 inception module은 **"다양한 스케일의 kernel을 병렬로 쓰되, 비싼 kernel마다 1×1 bottleneck으로 입구를 좁혀 감당 가능하게 만든다"**는 하나의 원리로 요약된다.

## 3. GoogLeNet 전체 구조

이 inception module 하나를 "블록"처럼 여러 개(원 논문 기준 9개) 이어 쌓은 것이 GoogLeNet(22층)이다. 층은 VGG보다 훨씬 깊은데도, bottleneck 덕분에 parameter 수는 오히려 VGG의 10분의 1 수준이었다. (이름 "인셉션"은 영화 〈인셉션〉의 "We need to go deeper"라는 대사에서 따온 농담 섞인 이름이라는 일화가 있다.)

## 4. global average pooling — fully connected layer를 통째로 들어낸다

전형적인 CNN(AlexNet, VGG 등)은 convolution·pooling으로 특징을 추출한 뒤, 마지막에 fully connected layer (FC)으로 분류한다. 그런데 이 마지막 FC층들이 parameter의 대부분을 차지한다.

**FC로 마무리할 때의 parameter 수.** 예컨대 마지막 feature map이 `512×7×7`이라 하자. 이를 1차원으로 펼치면 `512×7×7 = 25,088`차원이다. 이를 4096차원 FC층 두 개, 그리고 1000개 클래스(ImageNet 기준) 분류층으로 이으면
```
25,088 × 4,096 ≈ 1억 300만   (첫 FC층)
 4,096 × 4,096 ≈ 1,680만    (두 번째 FC층)
 4,096 × 1,000 ≈   410만    (분류층)
─────────────────────────────
합계                ≈ 1억 2,400만 개
```
CNN 전체 parameter의 대부분이 사실 convolution층이 아니라 이 FC층들에 몰려 있다.

**global average pooling (GAP)으로 대체.** GAP는 `512×7×7` feature map의 각 channel(512개)을 각각 7×7 영역 전체의 평균 하나로 압축한다. 즉 channel마다 있던 `7×7=49`개의 값을 평균 한 개로 요약하므로, 결과는 `512`차원 벡터 하나다. 이 벡터를 바로 분류층(512→1000)에 연결하면
```
512 × 1,000 ≈ 51만 3천 개
```
FC로 마무리했을 때(약 1억 2,400만 개)와 비교하면 parameter가 약 240분의 1로 줄어든다. 게다가 GAP 자체는 평균을 내는 연산이라 학습할 weight이 전혀 없다(parameter 0개). 이렇게 parameter를 극적으로 줄이면서도, 각 channel이 "이미지 전체에서 이 특징이 얼마나 강하게 나타났는가"를 요약한 값이라는 해석이 가능해 성능 손실은 크지 않다는 것이 GoogLeNet이 보여준 결과였다.

## 마치며

정리하면 GoogLeNet에는 목적이 다른 두 장치가 따로 있다. **병렬 구조(1×1/3×3/5×5/pooling을 동시에 쓰는 것) 자체는 압축이 아니라, 다양한 스케일의 특징을 동시에 뽑으려는 목적**이다. 오히려 이 병렬 구조를 그대로 두면 channel이 계속 불어나 연산량이 폭증하는 문제를 낳는데, 그걸 감당 가능하게 만드는 것이 **inception module 내부의 1×1 bottleneck**(channel 방향 압축)이다. 반면 **global average pooling**은 병렬 구조와는 무관하게, 네트워크 맨 끝에서 fully connected layer를 대체하려고 공간 방향(7×7)을 평균 하나로 압축하는 별개의 기법이다. 층은 22층으로 당시 기준 매우 깊었지만, 이 두 압축(channel 압축은 1×1, 공간 압축은 GAP) 덕분에 parameter 수는 오히려 8층짜리 AlexNet보다도 적었다는 게 이 설계의 핵심 성과였다.
