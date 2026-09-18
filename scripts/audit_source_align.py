#!/usr/bin/env python3
"""표제어와 한국은행 원문 정의가 실제로 맞는지 검사한다.

Foundation 한 줄을 쓰기 전에 돌려야 한다. 잘못 분리된 원문을 바탕으로
설명을 만들면 오류가 증식한다.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TERMS = ROOT / "public/data/terms.json"


def compact(s: str) -> str:
    sys.path.insert(0, str(ROOT / "scripts"))
    from source_integrity import compact as compact_key  # noqa: E402
    return compact_key(s)


def aligned(term: dict) -> bool:
    sys.path.insert(0, str(ROOT / "scripts"))
    from source_integrity import source_aligned  # noqa: E402
    return source_aligned(term)


def main() -> int:
    data = json.loads(TERMS.read_text(encoding="utf-8"))
    terms = data["terms"]
    bad = [t for t in terms if not aligned(t)]
    print(f"terms.json {len(terms)}개")
    print(f"표제어가 원문에 안 보이는 항목 {len(bad)}개")
    for t in bad:
        preview = re.sub(r"\s+", " ", (t.get("definition") or "")[:80])
        print(f"- {t['id']}  |  {t['headword']}  |  {preview}")
    if len(bad) > 0:
        print(
            "\n이 목록을 고치기 전에 593개 Foundation 한 줄을 쓰지 않는다. "
            "원문 매핑이 틀린 채 설명을 만들면 오류가 복제된다."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
