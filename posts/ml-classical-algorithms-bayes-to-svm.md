---
title: Bayes' theorem에서 SVM까지 — 고전 machine learning 핵심 알고리즘이 푸는 문제들
date: 2026-07-24
tags: [machine learning, Bayesian learning, regression, SVM]
description: 개인 교재 "머신러닝과 인공지능의 역사" 1~6부를 따라, Bayes' theorem·MLE/MAP·regression·분류·clustering·SVM이 각각 어떤 문제를 풀기 위해 등장했는지 키워드와 핵심 수식으로 정리했다.
---

아들 교재로 쓰려고 정리하고 있는 machine learning 노트의 앞부분(1~6부)을 요약한다. 각 절은 "이 알고리즘이 풀려던 문제 → 핵심 키워드 → 핵심 수식" 순서로 최대한 압축했다. 전체 흐름은 하나로 이어진다 — regression에서 확률적으로 유도한 loss function이, 분류에서 형태를 바꿔 다시 등장하고, clustering의 Lagrange multiplier method가 SVM에서 본격적으로 확장되는 식이다.

## 0. 왜 규칙을 직접 짜지 않고 데이터로 배우는가

if-else로 규칙을 짤 수 없을 만큼 문제가 복잡해지면(사진이 고양이인지 개인지 등), 규칙 자체를 데이터로부터 찾아내자는 발상이 machine learning이다. 결국 모든 문제는 하나로 요약된다 — 입력 `x`를 받아 출력 `y`를 내는 함수 `f_θ(x) ≈ y`를, 데이터로부터 parameter `θ`를 조정해 찾는 것. 2부부터 다루는 모든 알고리즘은 "이 θ를 어떻게 구할 것인가"에 대한 서로 다른 답이다.

## 1. Bayes' theorem — 원인과 결과를 뒤집는 수학

**문제**: 원인이 주어졌을 때 결과가 나올 확률 `p(결과|원인)`은 알기 쉽지만(질병이 있을 때 양성이 나올 확률), 정작 필요한 건 그 반대 `p(원인|결과)`(양성이 나왔을 때 질병일 확률)다. 이 둘을 그냥 같다고 착각하는 게 **base rate fallacy**다.

**키워드**: conditional probability, likelihood, prior, posterior, generative classifier, MAP

**핵심 수식**:
```
p(A|B) = p(B|A) · p(A) / p(B)
```
분류에 적용하면 클래스 `c`가 주어졌을 때 데이터가 나올 확률(likelihood) `p(x|y=c)`와 prior `p(y=c)`로부터 posterior를 구해 가장 큰 클래스를 고른다(MAP, Maximum A Posteriori):
```
ĉ = argmax_c  p(x|y=c) · p(y=c)
```

## 2. MLE와 MAP — 데이터로 확률 자체를 추정하기

**문제**: 위에서는 prior·likelihood가 이미 주어졌다고 가정했다. 실제로는 이 확률들 자체를 데이터에서 추정해야 한다. 숫자 게임(예시 `{16,8,2,64}`만 보고 "2의 거듭제곱"을 고르지 "짝수 전체"를 안 고르는 이유)이 이 문제를 잘 보여준다 — 답은 "간단한 가설일수록 우연히 그 예시들만 맞아떨어질 확률이 낮다"는 데 있다(Occam's razor의 확률적 근거).

**키워드**: hypothesis space, strong sampling assumption, maximum likelihood estimation (MLE), maximum a posteriori (MAP), prior의 필요성

**핵심 수식**: 가설 `h`에 속하는 원소 수를 `|h|`라 하면 데이터 `N`개가 `h`와 맞아떨어질 likelihood는
```
p(D|h) = (1/|h|)^N
```
prior까지 반영하면 MAP, 데이터가 무한히 많아지면(`N→∞`) prior 항이 무시할 만해져 MAP는 MLE로 수렴한다:
```
ĥ_MAP = argmax_h [log p(D|h) + log p(h)]
ĥ_MLE = argmax_h  log p(D|h)          (N→∞일 때 MAP ≈ MLE)
```

## 3. regression — least squares, gradient descent, ridge regression

**문제**: 연속값 `y`를 특징 `x`로부터 예측한다(집값, 점수 등). "가장 잘 맞는 직선"을 어떻게 정의할지가 관건이다.

**키워드**: design matrix, residual sum of squares (RSS)/mean squared error (MSE), normal equation, gradient descent, convexity, ridge regression, regularization

**핵심 수식**: 오차 제곱합을 최소화하는 loss function을 정의하고,
```
MSE(w) = (1/N)·(y - Xw)ᵀ(y - Xw)
```
미분해 0으로 놓으면 닫힌 형태의 해(normal equation)를 얻는다:
```
w_OLS = (XᵀX)⁻¹ Xᵀy
```
`D`가 매우 커서 역행렬 계산이 비쌀 때는 반복적으로 접근하는 **gradient descent**을 쓴다:
```
w_next = w_present − η · ∇MSE(w)
```
흥미로운 점은, "오차 제곱합을 최소화한다"는 이 기하학적 선택이 사실은 **noise가 Gaussian 분포를 따른다는 가정 하의 MLE**와 정확히 같다는 것이다. 여기에 `w`가 0 근처에 있어야 한다는 Gaussian prior(MAP)을 더하면, 계수가 지나치게 커지는 **overfitting**을 억제하는 ridge regression이 나온다:
```
w_MAP = argmin_w [RSS(w) + λ‖w‖²]      (λ = σ²/τ², regularization strength)
```

## 4. 분류 — sigmoid와 logistic regression, softmax

**문제**: `y`가 연속값이 아니라 범주(0/1)일 때 step function으로 딱 자르면 미분이 거의 모든 곳에서 0이라 gradient descent를 쓸 수 없다. 확신의 정도(70% 확률로 1이다)도 표현할 수 없다.

**키워드**: sigmoid function, Bernoulli distribution, logistic regression, negative log-likelihood (NLL)/cross entropy, convexity, softmax, generalized linear model (GLM)

**핵심 수식**: step function을 부드럽게 일반화한 sigmoid로 확률을 표현한다.
```
sigm(x) = 1 / (1 + e^(-x))
p(y|x,w) = Bernoulli(y | sigm(wᵀx))
```
regression의 RSS 자리에 이번엔 음의 log-likelihood(=cross entropy)가 들어가고, 놀랍게도 gradient는 regression과 똑같은 패턴("예측값 − 실제값"에 design matrix를 곱한 것)을 띤다:
```
∇NLL(w) = Xᵀ(μ − y),   μ_i = sigm(wᵀx_i)
```
클래스가 3개 이상이면 sigmoid의 일반화인 **softmax**로 확장한다(`K=2`이면 정확히 sigmoid로 환원된다):
```
softmax(z)_k = e^(z_k) / Σ_j e^(z_j)
```

## 5. unsupervised learning — k-means, GMM, EM algorithm, KNN

**문제**: 정답 라벨 없이 데이터에 숨은 구조("비슷한 것끼리 묶이는 그룹")를 찾는다.

**키워드**: k-means, distortion function, latent variable, Gaussian mixture model (GMM), responsibility, EM algorithm (E-step / M-step), k-nearest neighbors (KNN)

**핵심 수식**: k-means는 "배정 → 갱신"을 반복해 왜곡을 최소화한다.
```
J = Σ_i ‖x_i − z_c(i)‖²
```
k-means의 한계(전부 아니면 전무 배정)를 확률적으로 완화한 것이 GMM이다. 관측되지 않는 "어느 cluster에서 왔는가"라는 latent variable `z`를 두면, log-likelihood 안에 합(Σ)이 들어가 직접 미분할 수 없다. 그래서 latent variable의 posterior(책임) `r_ik`를 계산하는 **E-step**과, 그 책임으로 parameter를 갱신하는 **M-step**을 번갈아 반복한다(k-means는 이 절차의 하드 버전이다):
```
r_ik = π_k · N(x_i|μ_k,Σ_k) / Σ_j π_j·N(x_i|μ_j,Σ_j)
μ_k  = (Σ_i r_ik·x_i) / (Σ_i r_ik)
```
반대편 극단이 KNN이다. parameter를 아예 학습하지 않고, 예측 시점마다 가장 가까운 `k`개 이웃의 다수결로 분류한다(non-parametric). `k`는 3부의 regularization strength `λ`와 같은 역할, 즉 bias-variance tradeoff를 조절하는 손잡이다.

## 6. support vector machine — margin maximization과 kernel trick

**문제**: 지금까지는 "확률을 최대화한다"는 원리로 decision boundary를 정했다. SVM은 완전히 다른 원리, 즉 "경계와 가장 가까운 데이터까지의 여유(마진)를 최대화한다"는 기하학적 원리를 쓴다.

**키워드**: hyperplane, support vector, Lagrange multiplier method, KKT conditions (complementary slackness), dual problem, soft margin, kernel trick

**핵심 수식**: hyperplane `h(x)=wᵀx+b=0`에서 점까지의 거리 공식으로부터, 마진 `2/‖w‖`을 최대화하는 문제를 세운다.
```
minimize  ‖w‖²/2
subject to  y_i(wᵀx_i + b) ≥ 1,  ∀i
```
부등식 제약이 있으므로 Lagrange multiplier method를 KKT 조건(`μ≥0`, `μ·g(x*)=0`)으로 확장한다. `w`, `b`를 소거하면 오직 데이터끼리의 **inner product**만 남는 dual problem을 얻는다:
```
maximize_μ  Σ_i μ_i − (1/2)ΣᵢΣⱼ μ_iμ_j y_iy_j (x_i·x_j)
subject to  Σ_i μ_iy_i = 0,  0 ≤ μ_i ≤ C     (C: soft margin 강도)
```
여기서 inner product만 등장한다는 사실이 **kernel trick**의 열쇠다. inner product를 kernel function `K(x,x')=Φ(x)·Φ(x')`로 바꾸면, 고차원(심지어 무한차원) 공간으로 명시적으로 옮기지 않고도 그 공간에서의 linear separability 효과를 저차원 계산만으로 얻는다. 이 트릭은 SVM 전용이 아니라 "inner product만으로 표현되는 모든 알고리즘"(ridge regression, k-means, KNN 등)에 공짜로 적용된다.

## 마치며

여기까지 훑어보면 하나의 패턴이 반복해서 보인다. regression의 RSS는 사실 Gaussian 가정의 MLE였고, 분류의 cross entropy는 베르누이 가정의 MLE였다. ridge regression의 regularization은 MAP였고, k-means는 GMM의 EM을 하드하게 만든 특수 사례였다. SVM의 Lagrange multiplier method는 5부에서 등식 제약으로 살짝 등장했던 것이 부등식 제약(KKT)으로 확장된 것이었다. 결국 "어떤 함수 형태를 가정하고, 어떤 objective function을 어떻게 optimization할 것인가"라는 질문 하나가 이 절반 전체를 관통한다.

다음 편에서는 perceptron에서 시작해 이 원리가 neural network·CNN·Transformer·LLM으로 어떻게 이어지는지 정리한다.
