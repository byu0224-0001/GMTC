#!/usr/bin/env python3
"""Generate a LearningBriefing draft from a fact sheet. Mock unless OPENAI_API_KEY is set.

Usage:
  python3 scripts/editorial_draft.py --fact-sheet editorial/factsheets/example-cpi.json --mock
  python3 scripts/editorial_draft.py --candidates editorial/2026-09-03-candidates.json --pick 1 --fact-sheet ...
"""
from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KST = timezone(timedelta(hours=9))

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "id",
        "kicker",
        "minutes",
        "headline",
        "subtitle",
        "primaryTermIds",
        "supportTermIds",
        "learningObjectives",
        "contentMode",
        "sourceMode",
        "sourceRefs",
        "blocks",
        "reviewStatus",
        "difficulty",
        "evergreen",
    ],
    "properties": {
        "id": {"type": "string"},
        "kicker": {"type": "string"},
        "minutes": {"type": "integer"},
        "headline": {"type": "string"},
        "subtitle": {"type": "string"},
        "primaryTermIds": {"type": "array", "items": {"type": "string"}},
        "supportTermIds": {"type": "array", "items": {"type": "string"}},
        "learningObjectives": {"type": "array", "items": {"type": "string"}},
        "contentMode": {"type": "string", "enum": ["synthetic", "real_event"]},
        "sourceMode": {"type": "string", "enum": ["synthetic", "official"]},
        "sourceRefs": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["label"],
                "properties": {"label": {"type": "string"}, "url": {"type": "string"}},
            },
        },
        "eventDate": {"type": ["string", "null"]},
        "reviewStatus": {"type": "string", "enum": ["draft", "reviewed", "published"]},
        "difficulty": {"type": "string", "enum": ["intro", "core", "advanced"]},
        "evergreen": {"type": "boolean"},
        "blocks": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["type"],
                "properties": {
                    "type": {"type": "string", "enum": ["p", "choice", "cloze", "causal", "concepts"]},
                    "text": {"type": "string"},
                    "title": {"type": "string"},
                    "chain": {"type": "array", "items": {"type": "string"}},
                    "extra": {"type": "string"},
                    "ids": {"type": "array", "items": {"type": "string"}},
                    "question": {"type": "string"},
                    "answerId": {"type": "string"},
                    "note": {"type": "string"},
                    "depth": {"type": "string", "enum": ["term", "number", "cause", "next"]},
                    "before": {"type": "string"},
                    "after": {"type": "string"},
                    "choiceIds": {"type": "array", "items": {"type": "string"}},
                    "choices": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["id", "label"],
                            "properties": {"id": {"type": "string"}, "label": {"type": "string"}},
                        },
                    },
                },
            },
        },
    },
}

SYSTEM = """당신은 투자 문해력 앱의 학습 브리핑 편집자다.
앱은 친근한 AI 튜터가 아니라 읽기 쉬운 한국 금융앱의 설명체다.

금지: 자 한번 생각해볼까요, 하나 맞혀볼까요, 이제 한 단계 더, 시장이 다시 생각합니다, ~에 해당하는 층, 과도한 번역투.
좋은 예: 금리 인하 기대가 줄자 국채금리가 올랐어요. 특히 만기가 긴 채권은 금리가 움직일 때 가격 변동이 더 클 수 있습니다.
질문은 필요한 지점에서만: 이때 알아두면 좋은 개념은 무엇일까요?

규칙:
- factSheet에 없는 숫자·날짜·고유명사 사실을 만들지 마라.
- 문제는 최대 4개. 용어 인식 1~2, 숫자/원인 1, 마지막 판단 1.
- 오답은 초보자가 헷갈릴 만해야 하고 정답은 하나여야 한다. PER/IPO처럼 동떨어진 보기는 금지.
- 용어 문제는 depth=term, 사고 문제는 number|cause|next.
- reviewStatus는 반드시 draft.
- 마지막에 causal과 concepts 블록을 둔다. concepts.ids는 primaryTermIds와 같다.
- 문단 수가 문제 수보다 많아야 한다.
"""


def load_env() -> None:
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def slug(s: str) -> str:
    out = re.sub(r"[^a-z0-9가-힣]+", "-", s.lower()).strip("-")
    return (out[:40] or "briefing")


def mock_draft(fact: dict) -> dict:
    pids = fact.get("primaryTermIds") or ["소비자물가지수-cpi", "기준금리", "듀레이션"]
    mode = fact.get("contentMode") or "synthetic"
    headline = fact.get("headline") or "오늘 이슈를 짧게 정리합니다"
    facts = fact.get("confirmedFacts") or ["확인된 사실은 팩트시트에 적힌 문장뿐입니다."]
    lead = facts[0]
    refs = []
    if fact.get("sourceName") or fact.get("sourceUrl"):
        refs.append({"label": fact.get("sourceName") or "출처", **({"url": fact["sourceUrl"]} if fact.get("sourceUrl") else {})})
    if mode != "real_event":
        refs = [{"label": "학습용으로 다시 쓴 글. 기사 원문을 옮기지 않음."}]
    day = datetime.now(KST).strftime("%Y%m%d")
    return {
        "id": f"bf-draft-{slug(pids[0])}-{day}",
        "kicker": "오늘의 이슈",
        "minutes": 4,
        "headline": headline,
        "subtitle": "확인된 사실만으로 개념을 연결합니다.",
        "primaryTermIds": pids[:3],
        "supportTermIds": fact.get("supportTermIds") or [],
        "learningObjectives": [f"{p} 개념이 이 이슈에서 어떻게 쓰이는지 읽는다" for p in pids[:3]],
        "contentMode": mode,
        "sourceMode": "official" if mode == "real_event" else "synthetic",
        "sourceRefs": refs,
        "eventDate": None if mode != "real_event" else None,
        "reviewStatus": "draft",
        "difficulty": "core",
        "evergreen": mode != "real_event",
        "blocks": [
            {"type": "p", "text": lead},
            {
                "type": "p",
                "text": "이 숫자만으로 금리 경로가 바뀌었다고 단정하지 않습니다. 함께 봐야 할 개념이 있습니다.",
            },
            {
                "type": "choice",
                "depth": "term",
                "question": "이때 알아두면 좋은 개념은 무엇일까요?",
                "answerId": pids[0],
                "choices": [{"id": x, "label": x} for x in (pids + ["주가수익비율-per"])[:4]],
                "note": "팩트시트에 적힌 사실 범위 안에서만 해석합니다.",
            },
            {
                "type": "choice",
                "depth": "cause",
                "question": "확인된 사실로 가장 적절한 해석은 무엇일까요?",
                "answerId": "fact",
                "choices": [
                    {"id": "fact", "label": "팩트시트에 적힌 사실까지만 확인된 내용이다"},
                    {"id": "guess", "label": "적히지 않은 다음 달 수치까지 확정된 것이다"},
                    {"id": "always", "label": "한 지표면 금리 경로가 항상 바뀐다"},
                    {"id": "ignore", "label": "관련 개념은 같이 볼 필요가 없다"},
                ],
                "note": "확인되지 않은 숫자와 전망을 사실처럼 쓰지 않습니다.",
            },
            {"type": "p", "text": "방금 본 개념은 이어지는 금리·가격 이야기에서도 같은 이름으로 나옵니다."},
            {
                "type": "choice",
                "depth": "next",
                "question": "다음에 확인하면 좋은 것은 무엇일까요?",
                "answerId": "more",
                "choices": [
                    {"id": "more", "label": "팩트시트에 없는 숫자는 공식자료에서 따로 확인한다"},
                    {"id": "invent", "label": "없는 숫자는 관례로 채워도 된다"},
                    {"id": "once", "label": "헤드라인 한 줄이면 충분하다"},
                    {"id": "skip", "label": "관련 개념은 다시 볼 필요가 없다"},
                ],
                "note": "초안은 검수 전까지 사용자 앱에 나가지 않습니다.",
            },
            {"type": "causal", "title": "한 번에 연결하면", "chain": pids[:3] + ["해석"]},
            {"type": "concepts", "ids": pids[:3]},
        ],
        "_editorial": {
            "mock": True,
            "factSheetId": fact.get("id"),
            "generatedAt": datetime.now(KST).isoformat(),
        },
    }


def call_openai(fact: dict) -> dict:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise SystemExit("OPENAI_API_KEY가 없습니다. --mock 또는 .env를 확인하세요.")
    model = os.environ.get("OPENAI_MODEL", "gpt-5.6-terra")
    effort = os.environ.get("OPENAI_REASONING_EFFORT", "medium")
    payload = {
        "model": model,
        "reasoning": {"effort": effort},
        "input": [
            {"role": "developer", "content": SYSTEM},
            {
                "role": "user",
                "content": "다음 factSheet만 근거로 LearningBriefing JSON을 만들어라.\n"
                + json.dumps(fact, ensure_ascii=False, indent=2),
            },
        ],
        "text": {"format": {"type": "json_schema", "name": "briefing_draft", "strict": True, "schema": SCHEMA}},
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    ctx = ssl.create_default_context()
    try:
        import certifi  # type: ignore

        ctx = ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    with urllib.request.urlopen(req, timeout=120, context=ctx) as res:
        body = json.loads(res.read().decode("utf-8"))
    text = body.get("output_text")
    if not text:
        chunks = []
        for item in body.get("output", []):
            for c in item.get("content", []):
                if c.get("type") in ("output_text", "text") and c.get("text"):
                    chunks.append(c["text"])
        text = "\n".join(chunks)
    if not text:
        raise SystemExit("OpenAI 응답에서 텍스트를 찾지 못했습니다.")
    draft = json.loads(text)
    draft["reviewStatus"] = "draft"
    draft["_editorial"] = {
        "mock": False,
        "model": model,
        "factSheetId": fact.get("id"),
        "generatedAt": datetime.now(KST).isoformat(),
    }
    return draft


def load_fact(args: argparse.Namespace) -> dict:
    if args.fact_sheet:
        return json.loads(Path(args.fact_sheet).read_text(encoding="utf-8"))
    if args.candidates and args.pick is not None:
        data = json.loads(Path(args.candidates).read_text(encoding="utf-8"))
        cands = data.get("candidates") or []
        idx = args.pick - 1
        if idx < 0 or idx >= len(cands):
            raise SystemExit("후보 번호가 범위를 벗어났습니다.")
        c = cands[idx]
        return {
            "id": c.get("id") or f"cand-{args.pick}",
            "headline": c["title"],
            "sourceName": c.get("source"),
            "sourceUrl": c.get("url"),
            "confirmedFacts": [],
            "confirmedNumbers": [],
            "officialSourceUrls": [],
            "primaryTermIds": c.get("termIds") or c.get("matchedTermIds") or [],
            "supportTermIds": [],
            "contentMode": "real_event",
            "warning": "헤드라인만으로는 초안을 내지 마세요. --fact-sheet에 확인된 사실을 적으세요.",
        }
    raise SystemExit("--fact-sheet 또는 --candidates --pick 이 필요합니다.")


def main() -> int:
    load_env()
    p = argparse.ArgumentParser()
    p.add_argument("--fact-sheet")
    p.add_argument("--candidates")
    p.add_argument("--pick", type=int)
    p.add_argument("--mock", action="store_true")
    p.add_argument("--out")
    args = p.parse_args()
    fact = load_fact(args)
    if not fact.get("confirmedFacts") and not args.mock and os.environ.get("OPENAI_API_KEY"):
        print("factSheet에 confirmedFacts가 없습니다. 헤드라인만으로 생성하지 않습니다.", file=sys.stderr)
        return 2
    use_mock = args.mock or not os.environ.get("OPENAI_API_KEY", "").strip()
    if args.candidates and not args.fact_sheet and not use_mock:
        print("후보만으로는 실호출하지 않습니다. --fact-sheet을 쓰거나 --mock을 쓰세요.", file=sys.stderr)
        return 2
    draft = mock_draft(fact) if use_mock else call_openai(fact)
    out_dir = ROOT / "editorial" / "drafts"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = Path(args.out) if args.out else out_dir / f"{draft['id']}.json"
    path.write_text(json.dumps(draft, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "mock": use_mock, "path": str(path.relative_to(ROOT)), "id": draft["id"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
