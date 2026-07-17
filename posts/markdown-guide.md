---
title: 마크다운 작성 가이드
date: 2026-07-10
tags: [마크다운, 가이드, 작성법]
description: 이 블로그에서 마크다운을 어떻게 작성하는지, 어떻게 렌더링되는지 확인하는 레퍼런스 포스트입니다.
---

## 텍스트 스타일

일반 문단은 그냥 텍스트를 씁니다. **굵게**, *기울임*, ~~취소선~~, `인라인 코드`를 사용할 수 있습니다.

## 제목 계층

### H3 제목

H2와 H3는 자동으로 목차(TOC)에 포함됩니다. 이 페이지 왼쪽(데스크탑) 또는 위쪽(모바일)에서 확인해보세요.

#### H4 제목

H4는 TOC에 포함되지 않습니다.

## 목록

### 순서 없는 목록

- 항목 하나
- 항목 둘
  - 중첩 항목
  - 또 다른 중첩 항목
- 항목 셋

### 순서 있는 목록

1. 첫 번째
2. 두 번째
3. 세 번째

## 인용

> 코드는 쓰는 것보다 읽히는 횟수가 훨씬 많다.
>
> — Guido van Rossum

## 코드 블록

### JavaScript

```javascript
async function fetchPosts() {
  const res = await fetch('posts/index.json');
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}

fetchPosts().then(posts => {
  console.log(`총 ${posts.length}개의 포스트`);
});
```

### HTML

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>My Blog</title>
</head>
<body>
  <h1>Hello, World!</h1>
</body>
</html>
```

### CSS

```css
:root {
  --bg: #ffffff;
  --text: #1a1a2e;
  --accent: #2563eb;
}

.post-content {
  max-width: 720px;
  margin: 0 auto;
  line-height: 1.8;
}
```

## 표

| 언어 | 용도 | 난이도 |
|------|------|--------|
| HTML | 구조 | 쉬움 |
| CSS | 스타일 | 중간 |
| JavaScript | 동작 | 다양함 |

## 구분선

---

구분선 아래 내용입니다.

## 링크와 이미지

[GitHub 방문하기](https://github.com) — 외부 링크 예시입니다.

## 마치며

이 포스트는 마크다운 렌더링을 확인하기 위한 레퍼런스용입니다. 실제 포스트 작성 시에는 `posts/` 디렉토리에 `.md` 파일을 만들고, `posts/index.json`에 메타데이터를 추가하면 됩니다.
