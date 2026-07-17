---
title: 오늘 배운 것
date: 2026-07-17
tags: [HTML, CSS, JavaScript, 웹개발]
description: 클로드 코드로 블로그를 만들면서 HTML, CSS, JavaScript가 각각 어떤 역할을 하는지 몸으로 배웠다.
---

## 클로드 코드로 블로그를 만들었다

오늘 Claude Code와 함께 순수 HTML, CSS, JavaScript만으로 블로그를 처음부터 만들었다. 프레임워크 없이 만드니까 각 언어가 뭘 담당하는지 훨씬 선명하게 보였다.

## HTML — 뼈대

HTML은 페이지의 **구조**를 담당한다. 무엇이 제목이고, 무엇이 본문이고, 무엇이 버튼인지를 정의한다.

```html
<header class="site-header">
  <a href="index.html" class="site-title">My Blog</a>
  <button id="theme-toggle">🌙</button>
</header>
```

이 코드만 보면 헤더 안에 사이트 제목 링크와 버튼이 있다는 것을 바로 알 수 있다. HTML은 *무엇*이 있는지를 말할 뿐, 어떻게 생겼는지는 말하지 않는다.

중요하게 배운 점은 **의미 있는 태그**를 쓰는 것이다. `<div>` 대신 `<header>`, `<main>`, `<article>`, `<aside>`, `<footer>`를 쓰면 구조가 스스로 설명된다.

## CSS — 옷

CSS는 HTML 뼈대에 **스타일**을 입힌다. 색, 크기, 간격, 레이아웃을 정한다.

이번에 가장 많이 쓴 개념은 **CSS 커스텀 프로퍼티(변수)** 였다.

```css
:root {
  --bg:     #ffffff;
  --text:   #1a1a2e;
  --accent: #2563eb;
}

:root[data-theme="dark"] {
  --bg:     #0f172a;
  --text:   #e2e8f0;
  --accent: #60a5fa;
}
```

변수를 한 곳에 모아두면, 다크 모드를 만들 때 변수 값만 바꿔주면 된다. 컴포넌트 하나하나를 수정할 필요가 없다.

또 `position: sticky`로 헤더를 스크롤해도 고정되게 만들었고, `flexbox`로 카드 레이아웃과 TOC 사이드바를 잡았다.

## JavaScript — 동작

JavaScript는 페이지에 **동작**을 준다. 사용자가 뭔가를 하면 반응하게 만든다.

이 블로그에서 JS가 하는 일:

1. `fetch()`로 마크다운 파일을 서버에서 읽어온다
2. frontmatter(제목, 날짜, 태그)를 파싱한다
3. `marked.parse()`로 마크다운을 HTML로 변환한다
4. 검색창 입력에 맞춰 포스트 목록을 실시간으로 필터링한다
5. 다크 모드 버튼 클릭 → `data-theme` 속성 변경 → CSS 변수가 바뀜

```javascript
document.getElementById('theme-toggle').addEventListener('click', function () {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
});
```

클릭 한 번이 CSS 변수 전환으로 이어지고, 그게 화면 전체 색을 바꾼다. 세 언어가 협력하는 흐름이 한눈에 보였다.

## 정리

| 역할 | 언어 | 비유 |
|------|------|------|
| 구조 | HTML | 건물의 뼈대 |
| 스타일 | CSS | 인테리어와 페인트 |
| 동작 | JavaScript | 전기와 배관 |

따로따로 배울 때는 추상적이었는데, 실제로 무언가를 만드니까 각자의 역할이 명확해졌다. 역시 직접 만들어봐야 배운다.
