#!/usr/bin/env python3
"""통과·수정 SESSION_COPY만 approved로 올린다. 보류는 pending."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from apply_session_qa_round2 import HEADER, dump_entry  # noqa: E402
from export_session_qa import parse_session_copy  # noqa: E402

SESSION_TS = ROOT / "src/content/sessionCopy.ts"
HOLDS = ROOT / "editorial/copy-review-holds.json"


def main() -> None:
    holds_doc = json.loads(HOLDS.read_text(encoding="utf-8"))
    hold_ids = set(holds_doc.get("batch1", []) + holds_doc.get("batch2", []))
    src = SESSION_TS.read_text(encoding="utf-8")
    copies = parse_session_copy(src)
    missing = sorted(h for h in hold_ids if h not in copies)
    if missing:
        raise SystemExit(f"holds missing from SESSION_COPY: {missing}")
    order = re.findall(r'^  "([^"]+)": \{', src, re.M)
    approved = pending = 0
    for sid in order:
        copies[sid]["copyReview"] = "pending" if sid in hold_ids else "approved"
        if copies[sid]["copyReview"] == "approved":
            approved += 1
        else:
            pending += 1
    parts = [HEADER]
    for sid in order:
        parts.append(dump_entry(sid, copies[sid]))
        parts.append("")
    text = "\n".join(parts).rstrip() + "\n};\n"
    SESSION_TS.write_text(text, encoding="utf-8")
    print(f"approved {approved} pending {pending} total {len(order)}")


if __name__ == "__main__":
    main()
