#!/usr/bin/env python3
"""Collect RSS headlines for editorial briefing candidates. Not a user-facing news feed."""
from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "editorial"

KST = timezone(timedelta(hours=9))
WINDOW = timedelta(hours=24)

FEEDS = [
    ("Federal Reserve", "https://www.federalreserve.gov/feeds/press_all.xml"),
    ("BLS", "https://www.bls.gov/feed/bls_latest.rss"),
    ("ECB", "https://www.ecb.europa.eu/rss/press.xml"),
    ("BOK", "https://www.bok.or.kr/portal/bbs/B0000249/rssList.do?menuNo=200761"),
    ("Reuters Business", "https://feeds.reuters.com/reuters/businessNews"),
]

EXTRA_ALIASES: list[tuple[str, str]] = [
    ("cpi", "소비자물가지수-cpi"),
    ("consumer price", "소비자물가지수-cpi"),
    ("inflation", "인플레이션"),
    ("fomc", "기준금리"),
    ("federal reserve", "기준금리"),
    ("interest rate", "기준금리"),
    ("policy rate", "기준금리"),
    ("duration", "듀레이션"),
    ("treasury", "국채"),
    ("bond yield", "만기수익률"),
    ("unemployment", "실업률"),
    ("payroll", "고용률"),
    ("jobs report", "실업률"),
    ("capex", "자본적지출"),
    ("capital expenditure", "자본적지출"),
    ("yoy", "rpt-yoy"),
    ("year-over-year", "rpt-yoy"),
    ("export", "경상수지"),
    ("won", "기준환율"),
    ("dollar", "기준환율"),
    ("exchange rate", "기준환율"),
    ("dividend", "주주환원정책"),
    ("buyback", "주주환원정책"),
    ("eps", "주당순이익-eps"),
    ("earnings", "주당순이익-eps"),
    ("p/e", "주가수익비율-per"),
    ("gdp", "국내총생산-gdp"),
    ("ppi", "생산자물가지수-ppi"),
    ("producer price", "생산자물가지수-ppi"),
    ("stagflation", "스태그플레이션"),
    ("spread", "신용스프레드"),
    ("guidance", "rpt-guidance"),
    ("consensus", "rpt-consensus"),
    ("utilization", "rpt-util"),
]


def load_term_aliases() -> list[tuple[str, str]]:
    terms = json.loads((ROOT / "public/data/terms.json").read_text(encoding="utf-8"))["terms"]
    out: list[tuple[str, str]] = []
    for t in terms:
        tid = t["id"]
        keys = [t.get("headword"), t.get("abbr"), t.get("enName"), *t.get("aliases", []), *t.get("pairHeadwords", [])]
        for k in keys:
            if k and len(str(k).strip()) >= 2:
                out.append((str(k).strip().lower(), tid))
    report = (ROOT / "src/content/reportLexicon.ts").read_text(encoding="utf-8")
    for block in re.finditer(
        r'id: "(rpt-[^"]+)"[\s\S]*?headword: "([^"]+)"[\s\S]*?abbr: ([^\n]+)[\s\S]*?aliases: \[([^\]]*)\]',
        report,
    ):
        rid, head, abbr_raw, alias_raw = block.group(1), block.group(2), block.group(3), block.group(4)
        keys = [head, *re.findall(r'"([^"]+)"', alias_raw)]
        abbr = re.search(r'"([^"]+)"', abbr_raw)
        if abbr:
            keys.append(abbr.group(1))
        for k in keys:
            if k and len(k.strip()) >= 2:
                out.append((k.strip().lower(), rid))
    out.extend(EXTRA_ALIASES)
    return out


def parse_date(text: str | None) -> datetime | None:
    if not text:
        return None
    text = text.strip()
    try:
        return parsedate_to_datetime(text).astimezone(timezone.utc)
    except Exception:
        pass
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(text.replace("Z", "+0000") if fmt.endswith("%z") else text, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            continue
    return None


def text_of(el: ET.Element | None) -> str:
    if el is None or el.text is None:
        return ""
    return unescape(re.sub(r"<[^>]+>", "", el.text)).strip()


def ssl_ctx() -> ssl.SSLContext:
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def fetch_xml(url: str) -> tuple[str | None, str | None]:
    ctx = ssl_ctx()
    req = urllib.request.Request(url, headers={"User-Agent": "voca-editorial/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as res:
            return res.read().decode("utf-8", errors="replace"), None
    except Exception as exc:
        return None, str(exc)


def items_from_feed(source: str, xml: str) -> list[dict]:
    root = ET.fromstring(xml)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    out: list[dict] = []
    for item in root.findall("./channel/item"):
        title = text_of(item.find("title"))
        link = text_of(item.find("link"))
        published = parse_date(text_of(item.find("pubDate")) or text_of(item.find("{http://purl.org/dc/elements/1.1/}date")))
        out.append({"source": source, "title": title, "url": link, "publishedAt": published})
    for entry in root.findall("atom:entry", ns) or root.findall("{http://www.w3.org/2005/Atom}entry"):
        title = text_of(entry.find("atom:title", ns)) or text_of(entry.find("{http://www.w3.org/2005/Atom}title"))
        link_el = entry.find("atom:link", ns) or entry.find("{http://www.w3.org/2005/Atom}link")
        href = link_el.get("href") if link_el is not None else ""
        published = parse_date(
            text_of(entry.find("atom:updated", ns))
            or text_of(entry.find("atom:published", ns))
            or text_of(entry.find("{http://www.w3.org/2005/Atom}updated"))
        )
        out.append({"source": source, "title": title, "url": href, "publishedAt": published})
    return [x for x in out if x["title"]]


def match_terms(title: str, aliases: list[tuple[str, str]]) -> list[str]:
    hay = title.lower()
    hits: list[str] = []
    for key, tid in aliases:
        if len(key) < 2:
            continue
        if key in hay and tid not in hits:
            hits.append(tid)
    return hits[:6]


def score(item: dict) -> int:
    n = len(item["termIds"])
    recency = 2 if item["publishedAt"] and item["publishedAt"] >= datetime.now(timezone.utc) - timedelta(hours=12) else 0
    return n * 3 + recency


def fitness(n: int) -> str:
    if n >= 3:
        return "높음"
    if n >= 1:
        return "중간"
    return "낮음"


def main() -> int:
    aliases = load_term_aliases()
    now = datetime.now(timezone.utc)
    cutoff = now - WINDOW
    rows: list[dict] = []
    failed: list[dict] = []
    for source, url in FEEDS:
        xml, err = fetch_xml(url)
        if not xml:
            failed.append({"source": source, "url": url, "error": err or "empty"})
            print(f"FAIL {source}: {err}", file=sys.stderr)
            continue
        try:
            rows.extend(items_from_feed(source, xml))
        except ET.ParseError as exc:
            failed.append({"source": source, "url": url, "error": f"parse: {exc}"})
            print(f"parse fail {source}: {exc}", file=sys.stderr)

    recent = []
    seen = set()
    for item in rows:
        pub = item["publishedAt"]
        if pub and pub < cutoff:
            continue
        key = re.sub(r"\W+", "", item["title"].lower())[:80]
        if key in seen:
            continue
        seen.add(key)
        item["termIds"] = match_terms(item["title"], aliases)
        item["score"] = score(item)
        recent.append(item)

    recent.sort(key=lambda x: (-x["score"], x["title"]))
    top = recent[:12]
    day = datetime.now(KST).strftime("%Y-%m-%d")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "generatedAt": datetime.now(KST).isoformat(),
        "windowHours": 24,
        "count": len(top),
        "failedFeeds": failed,
        "candidates": [
            {
                "id": f"c{i}",
                "title": x["title"],
                "source": x["source"],
                "url": x["url"],
                "publishedAt": x["publishedAt"].isoformat() if x["publishedAt"] else None,
                "matchedTermIds": x["termIds"],
                "termIds": x["termIds"],
                "score": x["score"],
                "fitness": fitness(len(x["termIds"])),
            }
            for i, x in enumerate(top, 1)
        ],
    }
    (OUT_DIR / f"{day}-candidates.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        f"# {day} 브리핑 후보",
        "",
        "RSS 헤드라인만 모았습니다. 기사 본문은 저장하지 않습니다.",
        "사용자 앱에 노출하지 않습니다. 운영자가 하나 고른 뒤 브리핑을 직접 작성합니다.",
        "",
    ]
    if failed:
        lines += ["## 실패한 피드", ""]
        for f in failed:
            lines.append(f"- {f['source']}: {f['error']}")
        lines.append("")
    if not top:
        lines.append("최근 24시간 후보가 없습니다. 피드 접근을 확인하세요.")
    for i, x in enumerate(top, 1):
        when = ""
        if x["publishedAt"]:
            local = x["publishedAt"].astimezone(KST)
            when = local.strftime("%H:%M")
        terms = " ".join(f"`{t}`" for t in x["termIds"]) or "(매칭 없음)"
        lines += [
            f"## {i}. {x['title']}",
            "",
            f"출처: {x['source']}" + (f" · {when}" if when else ""),
            f"URL: {x['url']}",
            "연결 가능한 개념",
            terms,
            f"학습 적합도: {fitness(len(x['termIds']))}",
            "",
        ]
    (OUT_DIR / f"{day}-candidates.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"ok": True, "day": day, "candidates": len(top), "failedFeeds": failed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
