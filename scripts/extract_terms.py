#!/usr/bin/env python3
"""Extract 한국은행 경제금융용어 800선 into terms.json."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF = next(ROOT.joinpath("data").glob("*.pdf"))
OUT = ROOT / "public" / "data" / "terms.json"

CHO_HEADERS = set("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ")
ROMAN = re.compile(r"^[ivxlcdm]+$", re.I)
PAGE_NUM = re.compile(r"^\d{1,3}$")
TOC_LINE = re.compile(r"^(?P<head>.+?)[·ㆍ\.…\s]+(?P<page>\d{1,3})\s*$")
RELATED_RE = re.compile(r"연관검색어")
NOISE_LINES = {
    "I 경제금융용어  800선",
    "I 경제금융용어 800선",
    "경제금융용어  800선",
    "경제금융용어 800선",
}


def cho_of(headword: str) -> str:
    ch = headword.strip()[0]
    if "A" <= ch.upper() <= "Z" or ch.isascii() and ch.isalpha():
        return "ABC"
    if ch.isdigit() or ch in "「\"'":
        return "ABC"
    code = ord(ch)
    if 0xAC00 <= code <= 0xD7A3:
        idx = (code - 0xAC00) // 588
        return "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"[idx]
    if ch in CHO_HEADERS:
        return ch
    return "ABC"


def parse_parens(headword: str) -> tuple[str, str | None, str | None, list[str]]:
    """Return display headword, abbr, enName, pairHeadwords."""
    pairs = [p.strip() for p in headword.split("/") if p.strip()]
    main = pairs[0]
    abbr = None
    en_name = None
    m = re.search(r"\(([^)]+)\)\s*$", main)
    core = main
    if m:
        inner = m.group(1).strip()
        core = main[: m.start()].strip()
        if re.fullmatch(r"[A-Z0-9+\-/]{1,12}", inner):
            abbr = inner
        elif ";" in inner or "," in inner:
            left, right = re.split(r"[;,]", inner, maxsplit=1)
            left, right = left.strip(), right.strip()
            if re.fullmatch(r"[A-Z0-9+\-/]{1,12}", left):
                abbr, en_name = left, right
            else:
                en_name = inner
        else:
            en_name = inner
        pairs[0] = core
        # keep remaining pair parts without trailing parens already handled
    return core, abbr, en_name, pairs


def term_id(headword: str, abbr: str | None) -> str:
    base = re.sub(r"[\s·ㆍ]+", "", headword)
    base = re.sub(r"[()/]", "", base)
    if abbr:
        return f"{base}-{abbr.lower()}"
    return base


TOC_NOISE = re.compile(
    r"찾아보기|경제금융용어\s*800선|^I$|^I\s"
)


def _normalize_head(head: str) -> str:
    head = re.sub(r"\s+", " ", head).strip()
    head = re.sub(r"^I\s+", "", head)
    return head


def parse_toc(doc: pymupdf.Document) -> list[str]:
    heads: list[str] = []
    buf = ""
    for i in range(3, 17):  # PDF pages 4–17
        for raw in doc[i].get_text().splitlines():
            line = raw.strip()
            if not line:
                continue
            if ROMAN.fullmatch(line) or line in CHO_HEADERS or line == "ABC":
                continue
            if PAGE_NUM.fullmatch(line):
                continue
            if TOC_NOISE.search(line) and "··" not in line and not TOC_LINE.match(line):
                continue
            if buf.endswith("·"):
                buf = buf[:-1]
            buf = f"{buf}{line}" if buf else line
            m = TOC_LINE.match(buf)
            if not m:
                compact = re.sub(r"\s+", "", buf)
                m = TOC_LINE.match(compact)
            if m:
                head = _normalize_head(m.group("head"))
                head = re.sub(r"[·ㆍ\.…]+$", "", head).strip()
                if TOC_NOISE.search(head):
                    head = re.sub(r"^.*(?:찾아보기I?|경제금융용어\s*800선)", "", head)
                    head = head.lstrip(" I")
                if head and head not in CHO_HEADERS and len(head) >= 2:
                    heads.append(head)
                buf = ""
            elif len(buf) > 120:
                buf = ""
    return heads


def parse_toc(doc: pymupdf.Document) -> list[str]:
    heads: list[str] = []
    buf = ""
    for i in range(3, 17):  # PDF pages 4–17
        for raw in doc[i].get_text().splitlines():
            line = raw.strip()
            if not line:
                continue
            if ROMAN.fullmatch(line) or line in CHO_HEADERS or line == "ABC":
                continue
            if PAGE_NUM.fullmatch(line):
                continue
            if TOC_NOISE.search(line) and "··" not in line and not TOC_LINE.match(line):
                continue
            buf = f"{buf}{line}" if buf else line
            m = TOC_LINE.match(buf)
            if not m:
                compact = re.sub(r"\s+", "", buf)
                m = TOC_LINE.match(compact)
            if m:
                head = _normalize_head(m.group("head"))
                head = re.sub(r"[·ㆍ\.…]+$", "", head).strip()
                if TOC_NOISE.search(head):
                    # header glued onto a real term — keep the term tail
                    head = re.sub(r"^.*(?:찾아보기I?|경제금융용어\s*800선)", "", head)
                    head = head.lstrip(" I")
                if head and head not in CHO_HEADERS and len(head) >= 2:
                    heads.append(head)
                buf = ""
            elif len(buf) > 120:
                buf = ""
    return heads


def clean_body_pages(doc: pymupdf.Document) -> str:
    chunks: list[str] = []
    for i in range(18, 423):  # body through last term pages
        lines = []
        raw_lines = doc[i].get_text().splitlines()
        for idx, raw in enumerate(raw_lines):
            line = raw.strip()
            if not line:
                continue
            if line in NOISE_LINES:
                continue
            if line in CHO_HEADERS or line == "ABC":
                continue
            if PAGE_NUM.fullmatch(line):
                continue
            # running header: next-term name on first line of many pages
            if idx <= 2 and i > 18 and len(line) <= 40 and not line.endswith("."):
                # keep it; splitter uses exact headwords. Harmless if it's a term title.
                pass
            lines.append(line)
        chunks.append("\n".join(lines))
    return "\n".join(chunks)


def first_sentence(text: str, limit: int = 110) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    for sep in ("다. ", "다."):
        if sep in text:
            s = text.split("다.", 1)[0] + "다."
            return s[:limit] + ("…" if len(s) > limit else "")
    return text[:limit] + ("…" if len(text) > limit else "")


def split_terms(body: str, toc_heads: list[str]) -> list[dict]:
    # Build search keys: TOC head and core without parens
    anchors: list[tuple[str, str]] = []
    for h in toc_heads:
        core, abbr, en_name, pairs = parse_parens(h)
        anchors.append((h, core))

    positions: list[tuple[int, int, str]] = []
    used = set()
    cursor = 0
    for i, (full, core) in enumerate(anchors):
        found = -1
        keys = []
        for key in (full, core, full.replace("·", ""), core.replace("·", ""),
                    full.replace("·", "·"), core.replace(" ", "")):
            if key and key not in keys:
                keys.append(key)
        for key in keys:
            flex = re.escape(key).replace(r"\·", r"[·ㆍ]?")
            flex = flex.replace(r"\ ", r"[\s·ㆍ]*")
            pat = re.compile(rf"(?:^|\n){flex}\s*(?:\n|$)")
            m = pat.search(body, cursor)
            if m:
                found = m.start() + (1 if body[m.start()] == "\n" else 0)
                break
        if found < 0:
            for key in keys:
                flex = re.escape(key).replace(r"\·", r"[·ㆍ]?")
                pat = re.compile(rf"(?:^|\n){flex}")
                m = pat.search(body, cursor)
                if m:
                    found = m.start() + (1 if body[m.start()] == "\n" else 0)
                    break
        if found < 0:
            continue
        positions.append((found, i, full))
        used.add(i)
        cursor = found + 1

    positions.sort()
    terms: list[dict] = []
    seen_ids: set[str] = set()
    for pi, (start, toc_i, full) in enumerate(positions):
        end = positions[pi + 1][0] if pi + 1 < len(positions) else len(body)
        block = body[start:end].strip()
        lines = block.splitlines()
        if not lines:
            continue
        # drop the heading line(s)
        rest_lines = lines[1:]
        # sometimes heading is repeated immediately
        while rest_lines and rest_lines[0].strip() in {full, parse_parens(full)[0]}:
            rest_lines = rest_lines[1:]
        related_raw: list[str] = []
        body_lines: list[str] = []
        for ln in rest_lines:
            if RELATED_RE.search(ln):
                tail = RELATED_RE.split(ln, 1)[-1].strip(" :")
                if tail:
                    related_raw.extend([x.strip() for x in re.split(r",|/", tail) if x.strip()])
                continue
            # skip leftover running headers that equal other terms later
            if PAGE_NUM.fullmatch(ln) or ln in CHO_HEADERS:
                continue
            body_lines.append(ln)
        definition = re.sub(r"[ \t]+", " ", " ".join(body_lines))
        definition = re.sub(r"\s+\n", "\n", definition)
        definition = re.sub(r"\n+", " ", definition).strip()
        definition = re.sub(r"\s{2,}", " ", definition)
        core, abbr, en_name, pairs = parse_parens(full)
        tid = term_id(core, abbr)
        if tid in seen_ids:
            tid = f"{tid}-{toc_i}"
        seen_ids.add(tid)
        terms.append(
            {
                "id": tid,
                "headword": core,
                "pairHeadwords": pairs,
                "aliases": [],
                "enName": en_name,
                "abbr": abbr,
                "cho": cho_of(core),
                "definition": definition,
                "shortDef": first_sentence(definition),
                "relatedRaw": related_raw,
                "relatedIds": [],
                "source": {"pdf": "bok-800-2026", "page": None},
            }
        )
    return terms, used, len(toc_heads)


def resolve_related(terms: list[dict]) -> None:
    by_head: dict[str, str] = {}
    by_id: dict[str, str] = {}
    for t in terms:
        by_head[t["headword"]] = t["id"]
        for p in t["pairHeadwords"]:
            by_head[p] = t["id"]
        if t["abbr"]:
            by_head[t["abbr"]] = t["id"]
        by_id[t["id"]] = t["id"]
    for t in terms:
        ids = []
        for raw in t.pop("relatedRaw", []):
            raw = re.sub(r"\s+", " ", raw).strip()
            core, abbr, _, _ = parse_parens(raw)
            hit = by_head.get(raw) or by_head.get(core) or (by_head.get(abbr) if abbr else None)
            if hit and hit != t["id"] and hit not in ids:
                ids.append(hit)
        t["relatedIds"] = ids[:5]


def infer_category(term: dict) -> str:
    text = term["headword"] + " " + term["definition"][:400]
    rules = [
        ("지급결제", r"지급|결제|송금|어음|수표|CD공동망|VAN|전자금융|RTGS"),
        ("가계·부동산", r"가계|주택|LTV|DTI|DSR|부동산|전세|모기지"),
        ("금융안정", r"건전성|시스템 리스크|예금자|부실|바젤|스트레스|뱅크런"),
        ("국제금융", r"환율|외환|IMF|SDR|국제수지|달러|BIS|SWIFT"),
        ("통화정책", r"기준금리|통화|인플레이션|물가|공개시장|콜금리|KOFR"),
        ("금융시장", r"채권|주식|펀드|파생|선물|옵션|발행|PER|ETF|MMF"),
        ("제도·규제", r"법률|규제|감독|회계|IFRS|과세|관세"),
    ]
    for cat, pat in rules:
        if re.search(pat, text):
            return cat
    return "실물경제"


def infer_difficulty(term: dict) -> int:
    h = term["headword"]
    easy = ["금리", "인플레이션", "GDP", "환율", "물가", "실업", "예금"]
    if any(x in h for x in easy) and len(h) <= 8:
        return 1
    if term["abbr"] and len(term["definition"]) > 500:
        return 4
    if len(h) >= 10 or "/" in "/".join(term["pairHeadwords"]):
        return 3
    return 2


def main() -> int:
    doc = pymupdf.open(PDF)
    toc = parse_toc(doc)
    body = clean_body_pages(doc)
    terms, used, toc_n = split_terms(body, toc)
    resolve_related(terms)
    for t in terms:
        t["category"] = infer_category(t)
        t["difficulty"] = infer_difficulty(t)

    empty = [t["headword"] for t in terms if len(t["definition"]) < 40]
    report = {
        "tocCount": toc_n,
        "extracted": len(terms),
        "tocUnmatched": toc_n - len(used),
        "emptyDefs": empty[:30],
        "emptyDefCount": len(empty),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("sample toc", toc[:8], "...", toc[-5:])
    print("sample terms", [t["headword"] for t in terms[:8]])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "source": "bok-800-2026",
        "sourceTitle": "한국은행 「2026 경제금융용어 800선」",
        "count": len(terms),
        "terms": terms,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)
    if len(terms) < 700:
        print("WARN: extracted fewer than 700 terms", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
