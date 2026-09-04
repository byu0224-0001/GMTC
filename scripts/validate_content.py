#!/usr/bin/env python3
"""Build-time content checks: Core100 coverage, IDs, quiz integrity."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def labels_for(pid: str, term_map: dict, report_heads: dict[str, list[str]]) -> list[str]:
    out: list[str] = [pid]
    if pid in report_heads:
        out.extend(report_heads[pid])
    t = term_map.get(pid)
    if t:
        out.extend([t.get("headword") or "", t.get("abbr") or "", t.get("enName") or ""])
        out.extend(t.get("aliases") or [])
    return [x for x in out if x]


def term_used(blob: str, pid: str, term_map: dict, report_heads: dict[str, list[str]]) -> bool:
    hay = blob.lower()
    for k in labels_for(pid, term_map, report_heads):
        if len(k) >= 2 and k.lower() in hay:
            return True
    return False


def validate_briefing_obj(obj: dict, errors: list[str], known: set[str], term_map: dict, report_heads: dict[str, list[str]], loc: str) -> None:
    bid = obj.get("id") or loc
    pids = obj.get("primaryTermIds") or []
    for pid in pids:
        if pid not in known:
            errors.append(f"{bid} unknown primaryTerm {pid}")
        elif not term_used(json.dumps(obj, ensure_ascii=False), pid, term_map, report_heads):
            errors.append(f"{bid} primaryTerm {pid} not used in content")
    for pid in obj.get("supportTermIds") or []:
        if pid not in known:
            errors.append(f"{bid} unknown supportTerm {pid}")
    mode = obj.get("contentMode") or ("synthetic" if obj.get("sourceMode") == "synthetic" else "real_event")
    if mode == "real_event" and not obj.get("sourceRefs"):
        errors.append(f"{bid} real_event missing sourceRefs")
    if mode == "synthetic" and obj.get("eventDate"):
        errors.append(f"{bid} synthetic has eventDate")
    if obj.get("reviewStatus") not in (None, "draft", "reviewed", "published"):
        errors.append(f"{bid} bad reviewStatus")
    for block in obj.get("blocks") or []:
        if block.get("type") == "choice":
            cids = [c.get("id") for c in block.get("choices") or []]
            if block.get("answerId") not in cids:
                errors.append(f"{bid} choice answer not in choices")
            if len(cids) != len(set(cids)):
                errors.append(f"{bid} duplicate choices")
        if block.get("type") == "concepts":
            for cid in block.get("ids") or []:
                if cid not in known:
                    errors.append(f"{bid} concepts unknown {cid}")



def ids_in(text: str, pattern: str) -> list[str]:
    return re.findall(pattern, text)


def main() -> int:
    errors: list[str] = []
    terms_file = json.loads((ROOT / "public/data/terms.json").read_text(encoding="utf-8"))
    terms = {t["id"]: t for t in terms_file["terms"]}
    ids = list(terms)
    if len(ids) != len(set(ids)):
        errors.append("duplicate term ids in terms.json")

    literacy = (ROOT / "src/content/literacy.ts").read_text(encoding="utf-8")
    copy_src = (ROOT / "src/content/coreCopy.ts").read_text(encoding="utf-8")
    report_src = (ROOT / "src/content/reportLexicon.ts").read_text(encoding="utf-8")
    core_ids = re.findall(r'\{ id: "([^"]+)", taxonomy:', literacy)
    copy_ids = re.findall(r'^  "([^"]+)": \{', copy_src, re.M)
    report_ids = re.findall(r'id: "(rpt-[^"]+)"', report_src)

    if len(core_ids) != 100:
        errors.append(f"CORE100 length {len(core_ids)} != 100")
    missing_terms = [i for i in core_ids if i not in terms]
    if missing_terms:
        errors.append(f"Core100 missing from terms.json: {missing_terms}")
    missing_copy = [i for i in core_ids if i not in copy_ids]
    if missing_copy:
        errors.append(f"Core100 missing CORE_COPY: {missing_copy}")
    extra_copy = [i for i in copy_ids if i not in core_ids]
    if extra_copy:
        errors.append(f"CORE_COPY extra keys: {extra_copy}")

    # relatedIds
    for t in terms_file["terms"]:
        for rid in t.get("relatedIds", []):
            if rid not in terms:
                errors.append(f"broken relatedId {rid} on {t['id']}")
                break

    report_id_set = set(report_ids)
    for m in re.finditer(r'relatedBokIds: \[([^\]]*)\]', report_src):
        for bid in re.findall(r'"([^"]+)"', m.group(1)):
            if bid not in terms:
                errors.append(f"report relatedBokId missing: {bid}")

    for m in re.finditer(r'"(rpt-[^"]+)": "([^"]+)"', report_src):
        rid, bok = m.group(1), m.group(2)
        if rid not in report_id_set:
            errors.append(f"REPORT_BOK_CANON unknown report: {rid}")
        if bok not in terms:
            errors.append(f"REPORT_BOK_CANON missing BOK: {bok}")

    # context cases
    for block in re.finditer(
        r'answerTermId: "([^"]+)"[\s\S]*?choiceIds: \[([^\]]+)\]',
        literacy,
    ):
        ans, raw = block.group(1), block.group(2)
        choices = re.findall(r'"([^"]+)"', raw)
        if ans not in choices:
            errors.append(f"context answer {ans} not in choices {choices}")
        known = ans in terms or ans in report_id_set
        if not known:
            errors.append(f"context answer unknown: {ans}")
        for c in choices:
            if c not in terms and c not in report_id_set:
                errors.append(f"context choice unknown: {c}")

    # BOK_REPORT_BRIDGE ids
    for bid in re.findall(r'^  "([^"]+)": \{', report_src, re.M):
        if bid.startswith("rpt-"):
            continue
        if bid not in terms:
            errors.append(f"bridge BOK id missing: {bid}")

    briefing_src = (ROOT / "src/content/briefings.ts").read_text(encoding="utf-8")
    known = set(terms) | report_id_set
    report_heads: dict[str, list[str]] = {}
    for block in re.finditer(
        r'id: "(rpt-[^"]+)"[\s\S]*?headword: "([^"]+)"[\s\S]*?abbr: ([^\n]+)',
        report_src,
    ):
        rid, head, abbr_raw = block.group(1), block.group(2), block.group(3)
        abbr = re.search(r'"([^"]+)"', abbr_raw)
        report_heads[rid] = [head] + ([abbr.group(1)] if abbr else [])

    chunks = re.split(r'\n  \{\n    id: "bf-', briefing_src)
    briefing_count = 0
    ts_ids: list[str] = []
    for chunk in chunks[1:]:
        briefing_count += 1
        bid = "bf-" + chunk.split('"', 1)[0]
        ts_ids.append(bid)
        primary = re.search(r"primaryTermIds: \[([^\]]*)\]", chunk)
        if not primary:
            errors.append(f"{bid} missing primaryTermIds")
            continue
        pids = re.findall(r'"([^"]+)"', primary.group(1))
        if not 2 <= len(pids) <= 3:
            errors.append(f"{bid} primaryTermIds should be 2-3, got {len(pids)}")
        for pid in pids:
            if pid not in known:
                errors.append(f"{bid} unknown primaryTerm {pid}")
            elif not term_used(chunk, pid, terms, report_heads):
                errors.append(f"{bid} primaryTerm {pid} not used in content")
        support = re.search(r"supportTermIds: \[([^\]]*)\]", chunk)
        if support:
            for pid in re.findall(r'"([^"]+)"', support.group(1)):
                if pid not in known:
                    errors.append(f"{bid} unknown supportTerm {pid}")
        n_p = len(re.findall(r'type: "p"', chunk))
        n_q = len(re.findall(r'type: "(?:choice|cloze)"', chunk))
        if n_q > 4:
            errors.append(f"{bid} too many questions: {n_q}")
        if n_p < n_q:
            errors.append(f"{bid} paragraphs ({n_p}) < questions ({n_q})")
        if 'contentMode: "synthetic"' in chunk or 'sourceMode: "synthetic"' in chunk:
            if re.search(r'eventDate: "[0-9]', chunk):
                errors.append(f"{bid} synthetic briefing has eventDate")
        if "sourceRefs" not in chunk:
            errors.append(f"{bid} missing sourceRefs")
        if 'contentMode: "real_event"' in chunk and "sourceRefs" not in chunk:
            errors.append(f"{bid} real_event missing sourceRefs")
        for m in re.finditer(
            r'type: "choice"[\s\S]*?answerId: "([^"]+)"[\s\S]*?choices: \[([\s\S]*?)\]',
            chunk,
        ):
            ans, raw = m.group(1), m.group(2)
            cids = re.findall(r'id: "([^"]+)"', raw)
            if ans not in cids:
                errors.append(f"{bid} choice answer {ans} not in {cids}")
            if len(cids) != len(set(cids)):
                errors.append(f"{bid} duplicate choices {cids}")
        for m in re.finditer(
            r'type: "cloze"[\s\S]*?answerId: "([^"]+)"[\s\S]*?choiceIds: \[([^\]]+)\]',
            chunk,
        ):
            ans, raw = m.group(1), m.group(2)
            cids = re.findall(r'"([^"]+)"', raw)
            if ans not in cids:
                errors.append(f"{bid} cloze answer {ans} not in {cids}")
            for c in cids:
                if c not in known:
                    errors.append(f"{bid} cloze choice unknown: {c}")
        for m in re.finditer(r'type: "concepts", ids: \[([^\]]+)\]', chunk):
            for cid in re.findall(r'"([^"]+)"', m.group(1)):
                if cid not in known:
                    errors.append(f"{bid} concepts unknown {cid}")

    if briefing_count < 8:
        errors.append(f"briefings {briefing_count} < 8")

    pub_ids: list[str] = []
    pub_path = ROOT / "public/content/published-briefings.json"
    if pub_path.exists():
        pub = json.loads(pub_path.read_text(encoding="utf-8"))
        rows = pub if isinstance(pub, list) else pub.get("briefings") or []
        for obj in rows:
            validate_briefing_obj(obj, errors, known, terms, report_heads, obj.get("id", "published"))
            if obj.get("id"):
                pub_ids.append(obj["id"])

    for extra in sys.argv[1:]:
        p = Path(extra)
        if not p.exists():
            errors.append(f"missing draft {extra}")
            continue
        obj = json.loads(p.read_text(encoding="utf-8"))
        validate_briefing_obj(obj, errors, known, terms, report_heads, str(p))

    today_path = ROOT / "public/content/today.json"
    if today_path.exists():
        today = json.loads(today_path.read_text(encoding="utf-8"))
        if not today.get("date"):
            errors.append("today.json missing date")
        if today.get("briefingId") not in set(ts_ids) | set(pub_ids):
            errors.append(f"today.json unknown briefing {today.get('briefingId')}")
        if "contentVersion" in today and not isinstance(today.get("contentVersion"), int):
            errors.append("today.json contentVersion must be int")

    if errors:
        print("FAIL")
        for e in errors[:40]:
            print("-", e)
        if len(errors) > 40:
            print(f"... +{len(errors) - 40} more")
        return 1
    print(
        json.dumps(
            {
                "ok": True,
                "terms": len(terms),
                "core100": len(core_ids),
                "coreCopy": len(copy_ids),
                "report": len(report_id_set),
                "briefings": briefing_count,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
