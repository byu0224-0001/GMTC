#!/usr/bin/env python3
"""Copy a reviewed draft into user-facing published JSON and today.json. Does not call OpenAI."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KST = timezone(timedelta(hours=9))
PUB = ROOT / "public" / "content" / "published-briefings.json"
TODAY = ROOT / "public" / "content" / "today.json"


def as_public(draft: dict) -> dict:
    out = {k: v for k, v in draft.items() if not k.startswith("_")}
    out["reviewStatus"] = "published"
    return out


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("draft")
    p.add_argument("--force", action="store_true", help="draft 상태여도 복사. 기본은 reviewed만")
    p.add_argument("--today", action="store_true", help="today.json의 briefingId를 이 글로 바꾼다")
    args = p.parse_args()
    path = Path(args.draft)
    draft = json.loads(path.read_text(encoding="utf-8"))
    status = draft.get("reviewStatus")
    if status not in ("reviewed", "published") and not args.force:
        print("reviewStatus가 reviewed가 아닙니다. 검수 후 고치거나 --force를 쓰세요.", file=sys.stderr)
        return 2
    if draft.get("contentMode") == "real_event":
        refs = draft.get("sourceRefs") or []
        if not refs:
            print("real_event 브리핑은 sourceRefs가 필요합니다.", file=sys.stderr)
            return 2
    public = as_public(draft)
    existing = json.loads(PUB.read_text(encoding="utf-8")) if PUB.exists() else []
    if not isinstance(existing, list):
        existing = existing.get("briefings") or []
    existing = [b for b in existing if b.get("id") != public["id"]]
    existing.append(public)
    PUB.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    dest = ROOT / "editorial" / "published" / f"{public['id']}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(public, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.today:
        TODAY.parent.mkdir(parents=True, exist_ok=True)
        prev: dict = {}
        if TODAY.exists():
            try:
                loaded = json.loads(TODAY.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    prev = loaded
            except json.JSONDecodeError:
                prev = {}
        version = int(prev.get("contentVersion") or 0) + 1
        TODAY.write_text(
            json.dumps(
                {
                    "date": datetime.now(KST).strftime("%Y-%m-%d"),
                    "briefingId": public["id"],
                    "contentVersion": version,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    print(json.dumps({"ok": True, "id": public["id"], "published": str(PUB.relative_to(ROOT)), "today": args.today}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
