#!/usr/bin/env python3
"""posts/index.json 스키마 검증. post-article 스킬의 Review 단계에서 사용.

python3 -m json.tool은 문법(syntax)만 확인하고 필드명/타입/카테고리 유효성은
보지 않는다는 게 발견된 약점이었음(2026-07-30) — 이 스크립트가 그 빈틈을 메운다.

카테고리 목록은 js/home.js의 CATEGORIES 배열에서 직접 파싱한다(하드코딩하면
그 자체가 또 다른 낡는 사본이 되므로, 단일 출처를 유지).
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
POSTS_JSON = REPO_ROOT / "posts" / "index.json"
HOME_JS = REPO_ROOT / "js" / "home.js"

REQUIRED_FIELDS = {
    "slug": str,
    "title": str,
    "date": str,
    "tags": list,
    "category": str,
    "description": str,
    "wordCount": int,
}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def is_valid_date(s: str) -> bool:
    if not DATE_RE.match(s):
        return False
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def load_categories() -> set[str]:
    text = HOME_JS.read_text(encoding="utf-8")
    m = re.search(r"const CATEGORIES\s*=\s*\[(.*?)\]", text, re.S)
    if not m:
        print(f"오류: {HOME_JS}에서 CATEGORIES 배열을 못 찾음", file=sys.stderr)
        sys.exit(2)
    names = re.findall(r"'([^']+)'", m.group(1))
    return set(names) | {"기타"}  # '기타'는 목록에 없는 글이 있을 때 UI가 자동 추가


def main() -> int:
    categories = load_categories()
    posts = json.loads(POSTS_JSON.read_text(encoding="utf-8"))

    errors: list[str] = []
    seen_slugs: dict[str, int] = {}

    for i, post in enumerate(posts):
        label = post.get("slug", f"index {i}")

        for field, expected_type in REQUIRED_FIELDS.items():
            if field not in post:
                errors.append(f"[{label}] 필수 필드 누락: {field}")
                continue
            if not isinstance(post[field], expected_type):
                errors.append(
                    f"[{label}] {field}는 {expected_type.__name__}이어야 하는데 "
                    f"{type(post[field]).__name__}임"
                )

        if "date" in post and isinstance(post["date"], str):
            if not is_valid_date(post["date"]):
                errors.append(f"[{label}] date가 유효한 YYYY-MM-DD가 아님: {post['date']}")

        if "category" in post and isinstance(post["category"], str):
            if post["category"] not in categories:
                errors.append(
                    f"[{label}] category '{post['category']}'가 js/home.js의 "
                    f"CATEGORIES에 없음(오타 또는 등록 누락)"
                )

        if "slug" in post and isinstance(post["slug"], str):
            seen_slugs[post["slug"]] = seen_slugs.get(post["slug"], 0) + 1

        if "tags" in post and isinstance(post["tags"], list):
            if not all(isinstance(t, str) for t in post["tags"]):
                errors.append(f"[{label}] tags 안에 문자열이 아닌 항목이 있음")

    for slug, count in seen_slugs.items():
        if count > 1:
            errors.append(f"slug 중복: '{slug}'가 {count}번 등장")

    if errors:
        print(f"posts/index.json 검증 실패 ({len(errors)}건):")
        for e in errors:
            print(f"  - {e}")
        return 1

    print(f"posts/index.json 검증 통과 ({len(posts)}개 글, {len(categories)}개 유효 카테고리)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
