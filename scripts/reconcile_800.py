#!/usr/bin/env python3
"""Index-level reconciliation: TOC heads vs extracted terms.json vs 800 표방."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "bok-800-reconciliation.md"

sys.path.insert(0, str(ROOT / "scripts"))
from extract_terms import PDF, parse_parens, parse_toc, term_id  # noqa: E402

import pymupdf  # noqa: E402


def main() -> int:
    doc = pymupdf.open(PDF)
    toc = parse_toc(doc)
    terms_file = json.loads((ROOT / "public/data/terms.json").read_text(encoding="utf-8"))
    extracted = terms_file["terms"]

    toc_ids: list[tuple[str, str, list[str]]] = []
    for h in toc:
        core, abbr, _en, pairs = parse_parens(h)
        toc_ids.append((h, term_id(core, abbr), pairs))

    extracted_ids = {t["id"] for t in extracted}
    extracted_heads = {t["headword"] for t in extracted}
    for t in extracted:
        extracted_heads.update(t.get("pairHeadwords") or [])

    unmatched_toc: list[str] = []
    pair_covered: list[str] = []
    for full, tid, pairs in toc_ids:
        if tid in extracted_ids:
            continue
        # 표제항에 복수 용어(A/B)가 하나의 entry로 합쳐진 경우
        if any(p in extracted_heads or parse_parens(p)[0] in extracted_heads for p in pairs):
            pair_covered.append(full)
            continue
        unmatched_toc.append(full)

    extra = [t["headword"] for t in extracted if t["id"] not in {tid for _, tid, _ in toc_ids}]

    lines = [
        "# 한국은행 800선 추출 대사",
        "",
        f"- TOC 표제어 수: **{len(toc)}**",
        f"- terms.json entries: **{len(extracted)}** (앱이 ‘800선’이라고 부르는 사전 엔트리)",
        f"- TOC 표제어 중 ID가 바로 매칭: **{len(toc) - len(unmatched_toc) - len(pair_covered)}**",
        f"- 복수 표제어(슬래시 등)로 한 엔트리에 흡수된 것으로 보이는 TOC: **{len(pair_covered)}**",
        f"- TOC에 있는데 추출 엔트리로 못 찾은 표제어: **{len(unmatched_toc)}**",
        f"- TOC ID 집합에 없는 추출 엔트리: **{len(extra)}**",
        "",
        "## 판단",
        "",
    ]
    covered = len(toc) - len(unmatched_toc)
    if unmatched_toc:
        lines.append(
            f"원본 목차 {len(toc)}개 중 {covered}개는 엔트리 또는 복수표제어로 커버됩니다. "
            "앱 카피에서 ‘800선’은 원본 자료명을 가리키되, **엔트리 수는 787개**로 표기하는 편이 정확합니다."
        )
    else:
        lines.append("TOC 표제어는 모두 추출 엔트리 또는 복수표제어 흡수로 설명됩니다.")
    lines += ["", "## TOC에서 못 찾은 표제어", ""]
    if unmatched_toc:
        lines += [f"- {x}" for x in unmatched_toc]
    else:
        lines.append("(없음)")
    lines += ["", "## 복수표제어로 흡수된 것으로 보이는 목차", ""]
    lines += [f"- {x}" for x in pair_covered[:40]]
    if len(pair_covered) > 40:
        lines.append(f"- … 외 {len(pair_covered) - 40}개")
    lines += ["", "## 샘플 여분 추출 headword", ""]
    lines += [f"- {x}" for x in extra[:20]]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({
        "toc": len(toc),
        "extracted": len(extracted),
        "unmatchedToc": len(unmatched_toc),
        "pairCovered": len(pair_covered),
        "extra": len(extra),
        "wrote": str(OUT),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
