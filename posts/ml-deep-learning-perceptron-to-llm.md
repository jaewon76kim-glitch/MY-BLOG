---
title: perceptron에서 LLM까지 — deep learning 핵심 알고리즘이 푸는 문제들
date: 2026-07-24
tags: [deep learning, CNN, Transformer, LLM]
description: 개인 교재 "머신러닝과 인공지능의 역사" 7~11부를 따라, perceptron·backpropagation·CNN·RNN/LSTM·attention/Transformer·LLM이 각각 어떤 문제를 풀기 위해 등장했는지 키워드와 핵심 수식으로 정리했다.
---

[지난 편](post.html?slug=ml-classical-algorithms-bayes-to-svm)에서 Bayes' theorem부터 SVM까지 고전 machine learning을 훑었다. 이번 편은 그 뒤를 잇는 neural network·CNN·RNN·Transformer·LLM이다. 흥미롭게도 이 절반은 앞의 절반과 끊어져 있지 않다 — 다층 perceptron이 극복한 문제(XOR)는 SVM이 이미 kernel trick으로 풀었던 문제였고, ResNet의 residual connection·Transformer의 self-attention·RLHF의 reward model은 각각 앞 편에서 다룬 개념(vanishing gradient, inner product 유사도, logistic regression)의 재활용이다.

## 1. perceptron과 backpropagation — neural network의 탄생

**문제**: 뉴런 하나를 흉내낸 perceptron(linear classifier)은 XOR처럼 linear separability가 불가능한 데이터를 다룰 수 없다(1969년 민스키·페퍼트가 증명, 1차 AI 겨울의 원인). 앞 편의 kernel trick과 같은 발상 — nonlinear transformation으로 linear separability가 쉬운 공간으로 옮기기 — 을 층을 쌓아 neural network 스스로 학습하게 하면 이 한계를 넘을 수 있다.

**키워드**: activation function, multilayer perceptron (MLP), backpropagation, chain rule, vanishing / exploding gradient, ReLU

**핵심 수식**: perceptron은 `y = f(w·x)`. hidden layer를 거치는 MLP는
```
y = f(W⁽²⁾ f(W⁽¹⁾x))
```
weight을 학습하려면 loss function `J = ½‖ŷ − y‖²`를 각 층의 weight로 미분해야 하는데, chain rule을 출력층에서부터 거꾸로 적용하면 놀랍도록 재귀적인 패턴이 나온다 — 오차 신호 `δ`가 출력층에서 입력층 방향으로 weight을 타고 전파된다:
```
∂J/∂w⁽³⁾ = δ·u      (δ = (ŷ−y)·f'(·))
∂J/∂w⁽²⁾ = γ·z      (γ = f'(·) · Σ δ·w⁽³⁾)
```
층이 깊어질수록 `f'(·)`(sigmoid는 최대 0.25)가 계속 곱해져 입력에 가까운 층의 gradient가 지수적으로 사라진다 — **vanishing gradient**. 미분값이 항상 1인 `ReLU(x)=max(0,x)`가 이 문제를 크게 완화하면서 deep learning이 실제로 학습 가능해졌다.

## 2. CNN — 이미지의 지역 구조를 활용하기

**문제**: fully connected layer를 이미지에 그대로 쓰면 parameter가 폭증한다(200×200 이미지에 hidden neuron 100개만 둬도 400만 parameter). 이미지는 가까운 픽셀끼리만 강하게 상관되어 있다는 구조를 fully connected은 전혀 활용하지 못한다.

**키워드**: local connectivity, weight sharing, convolution, feature map, padding/stride/pooling, LeNet-5, AlexNet(ReLU+dropout), VGG(작은 kernel 여러 겹), 1×1 convolution, ResNet(residual connection)

**핵심 수식**: 같은 kernel(filter) `W`를 이미지 전체에 슬라이딩하며 적용해 parameter 수를 kernel 크기로 고정한다. 출력 feature map 크기는
```
n' = ⌊(n + 2p − h)/s⌋ + 1     (n:입력, h:kernel, s:stride, p:padding)
```
층을 아주 깊게 쌓으면 CNN도 vanishing gradient가 재발한다. **ResNet**은 몇 개 층을 건너뛰어 입력을 출력에 더하는 residual connection으로 해결한다:
```
x₄ = F(x₁,x₂,x₃) + x₁
∂x₄/∂x₁ = (곱셈 경로, 소실 가능) + 1     (덧셈 지름길이 최소 1을 보장)
```

## 3. RNN과 LSTM — 순서 있는 데이터 다루기

**문제**: MLP·CNN은 입력 크기가 고정돼 있고 순서를 자연스럽게 다루지 못한다("개가 사람을 물었다" ≠ "사람이 개를 물었다"). CNN의 weight sharing을 공간이 아니라 **시간**축에 적용하면 임의 길이의 시퀀스를 처리할 수 있다.

**키워드**: recurrent neural network (RNN), hidden state, backpropagation through time (BPTT), long-term dependency, LSTM(cell state, gate), GRU, word embedding, language modeling

**핵심 수식**: 같은 weight을 모든 시점에 반복 적용한다.
```
h_t = f(W_hh·h_(t-1) + W_xh·x_t + b_h)
```
시퀀스가 길어지면 `∂h_T/∂h_1`이 `T-1`개 행렬의 곱이 되어 gradient가 소실되거나 폭발한다. **LSTM**은 ResNet과 같은 원리(곱셈 대신 덧셈)를 시간축에 적용한다 — cell state를 원소별 덧셈으로 갱신해 기억을 보존한다:
```
c_t = f_t ⊙ c_(t-1) + i_t ⊙ c̃_t     (f_t: forget gate, i_t: input gate)
```

## 4. attention과 Transformer — bottleneck을 없애고 병렬화하기

**문제**: encoder-decoder(Seq2Seq) 구조는 문장 전체 정보를 고정 크기 벡터 하나에 압축해야 하는 **bottleneck**이 있다. 게다가 RNN은 `h_t`가 `h_(t-1)`을 먼저 필요로 해 병렬 계산이 안 된다.

**키워드**: attention, context vector, self-attention, Query/Key/Value, 스케일링, multi-head attention, positional encoding, residual connection+layer normalization, BERT(인코더-온리) vs GPT(디코더-온리, causal masking)

**핵심 수식**: 각 위치가 다른 모든 위치와 얼마나 관련 있는지를 inner product(SVM kernel trick과 같은 발상)으로 재고, softmax로 regularization해 value를 가중합한다.
```
Attention(Q,K,V) = softmax(QKᵀ/√d_k) · V
```
`√d_k`로 나누는 건 차원이 커질수록 inner product의 분산이 커져 softmax가 극단화되는 걸 막기 위해서다. 이 계산은 모든 위치에 대해 동시에 할 수 있어 RNN의 순차적 제약과 long-term dependency 문제를 한 번에 해결한다. GPT는 미래 위치를 보지 못하게 masking한 디코더만 써서 "다음 token 예측"을 병렬로 학습한다.

## 5. LLM 시대 — 스케일업, 정렬, 효율화

**문제**: Transformer을 어떻게 키우고, 무엇으로 학습시키고, 사람이 원하는 방향으로 다듬을 것인가.

**키워드**: pre-training / fine-tuning, scaling law(Kaplan/Chinchilla), in-context learning, emergent ability, RLHF(SFT→reward model→PPO), DPO, LoRA, MoE, test-time compute, RAG

**핵심 수식**: 손실 `L`이 모델 크기 `N`, 데이터량 `D`에 대해 거듭제곱 법칙을 따른다(scaling law) — 작은 모델 몇 개로 큰 모델의 성능을 예측할 수 있다.
```
L(N) ≈ (N_c/N)^α_N,   L(D) ≈ (D_c/D)^α_D
```
사람의 선호(비교 판단)로 reward model을 학습하는 단계는 앞 편의 logistic regression과 형태가 완전히 같다:
```
P(y_w ≻ y_l | x) = σ(r_φ(x,y_w) − r_φ(x,y_l))
```
모델 전체를 파인튜닝하기엔 너무 크므로, **LoRA**는 weight 변화량만 저랭크 행렬 곱으로 근사한다(parameter 수 `d×k` → `r(d+k)`, `r≪d,k`):
```
W = W₀ + BA,   B∈ℝ^(d×r), A∈ℝ^(r×k)
```
**MoE**는 token마다 일부 expert만 활성화해(`TopK` routing) 총 parameter는 키우면서 실제 연산량은 낮게 유지한다.

## 마치며

perceptron의 XOR 한계를 다층으로 극복한 발상이 kernel trick의 재탕이었듯, ResNet의 residual connection과 LSTM의 gate는 같은 원리(곱셈 경로의 vanishing gradient를 덧셈 경로로 우회)의 두 가지 구현이었다. self-attention의 유사도 계산은 SVM의 kernel trick과 같은 inner product였고, RLHF의 reward model은 logistic regression 그 자체였다. 결국 1부에서 6부까지 다진 도구(확률, optimization, gradient descent, inner product 기반 유사도)가 형태만 바꿔가며 CNN·RNN·Transformer·LLM 전체를 관통한다는 게, 이 교재를 정리하며 가장 인상 깊었던 부분이다.
