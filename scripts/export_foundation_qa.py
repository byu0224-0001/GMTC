#!/usr/bin/env python3
"""다음 Foundation 94개 초안을 검수용 한 파일로 뽑는다. SESSION_COPY에 넣지 않는다."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from export_session_qa import BATCH, flags, first_sentence, md_escape, source_aligned, surface_label  # noqa: E402

SRC = ROOT / "editorial" / "foundation-batch2-source.json"
DRAFTS = ROOT / "editorial" / "foundation-batch2.json"
OUT = ROOT / "editorial" / "foundation-qa-2.md"


def main() -> None:
    sources = json.loads(SRC.read_text(encoding="utf-8"))
    drafts = json.loads(DRAFTS.read_text(encoding="utf-8"))
    terms_file = json.loads((ROOT / "public/data/terms.json").read_text(encoding="utf-8"))
    by_id = {t["id"]: t for t in terms_file["terms"]}
    rows = []
    for s in sources:
        copy = drafts[s["id"]]
        copy.setdefault("chain", [])
        copy.setdefault("keyPoints", [])
        copy.setdefault("commonConfusions", [])
        term = by_id[s["id"]]
        rows.append((term, copy))
    total_batch = max(1, (len(rows) + BATCH - 1) // BATCH)
    lines: list[str] = []
    a = lines.append
    a("# Foundation 검수팩 2")
    a("")
    a("상태: **전부 pending**. SESSION_COPY에 아직 넣지 않았다. 일괄 승인 금지.")
    a(f"개수: **{len(rows)}개** · 한글 표제어 다음 묶음(원문 정렬된 항목만)")
    a("이전 묶음 94개는 `editorial/session-copy-qa.md`")
    a("생성: `python3 scripts/export_foundation_qa.py`")
    a("")
    a("## GPT에게")
    a("")
    a("제품 카피를 검수한다. 새 기능을 제안하지 않는다. 일괄 통과로 몰아 주지 않는다.")
    a("학습 카드: 한 줄 뜻 + 이유 첫 문장. 사전: 쉬운 설명·이렇게 읽어요·이유 전체·핵심·혼동(있을 때만).")
    a("")
    a("1. 한 줄 뜻이 맞는가.")
    a("2. 사례를 전부처럼 쓰지 않았는가.")
    a("3. 인과를 과장하지 않았는가.")
    a("4. 필드가 같은 말을 반복하지 않는가.")
    a("5. 혼동이 진짜 인접 개념인가. 없으면 생략.")
    a("6. 이렇게 읽어요가 방향+조건+같이 확인할 변수인가.")
    a("7. 사례가 정체성으로 올라오지 않았는가.")
    a("8. 규제·법률·프로젝트·시행상태를 evergreen처럼 단정하지 않았는가.")
    a("")
    a("답은 표만 먼저. 수정 항목만 문장을 다시 쓴다.")
    a("")
    a("```")
    a("id | 판정(통과/수정/보류) | 걸린 번호 | 한 줄 이유")
    a("집계: 통과 n · 수정 n · 보류 n")
    a("일괄 승인하지 말 것.")
    a("```")
    a("")
    a("## 목차")
    a("")
    a("| # | 묶음 | 표제어 | id | 기계 힌트 |")
    a("|---|------|--------|----|-----------|")
    for i, (term, copy) in enumerate(rows, 1):
        batch = (i - 1) // BATCH + 1
        hint = ", ".join(flags(term["id"], copy)) or "—"
        a(f"| {i} | {batch}/{total_batch} | {term['headword']} | `{term['id']}` | {hint} |")
    a("")
    for i, (term, copy) in enumerate(rows, 1):
        batch = (i - 1) // BATCH + 1
        if (i - 1) % BATCH == 0:
            a(f"## 묶음 {batch}/{total_batch}")
            a("")
        extra = [x for x in (term.get("abbr"), term.get("enName")) if x]
        why_first = first_sentence(copy["whyItMatters"])
        a(f"### {i}. {term['headword']}")
        a("")
        a(f"- id: `{term['id']}`")
        a(f"- 유형: {surface_label(term)} · 분류: {term.get('category') or '—'}")
        if extra:
            a(f"- 영문·약어: {' · '.join(extra)}")
        a("- copyReview: pending · 코드 미반영")
        a(f"- 원문 접기: {'표제어가 원문에 보임' if source_aligned(term) else '표제어가 원문에 안 보임 — 매핑부터'}")
        hint = flags(term["id"], copy)
        if hint:
            a(f"- 기계 힌트: {'; '.join(hint)}")
        a("")
        a("#### 오늘 학습 카드에 나가는 문장")
        a("")
        a(f"- 한 줄 뜻: {md_escape(copy['oneLiner'])}")
        a(f"- 이유 첫 문장: {md_escape(why_first)}")
        a(f"- 관련 개념: {', '.join(copy.get('chain') or []) or '없음'}")
        a("")
        a("#### 사전 상세에 나가는 문장")
        a("")
        a(f"- 쉬운 설명: {md_escape(copy['easyExplanation'])}")
        a(f"- 이렇게 읽어요: {md_escape(copy['typicalSituation'])}")
        a(f"- 알아두면 좋은 이유: {md_escape(copy['whyItMatters'])}")
        a(f"- 핵심 포인트: {md_escape((copy.get('keyPoints') or ['없음'])[0])}")
        conf = copy.get("commonConfusions") or []
        a(f"- 헷갈리기 쉬운 점: {md_escape(conf[0]) if conf else '없음(생략)'}")
        a("")
        a("#### 한국은행 원문 (참고 · 화면 본문 아님)")
        a("")
        a(md_escape(term.get("definition") or "(원문 없음)"))
        a("")
        a("판정: 통과 / 수정 / 보류")
        a("걸린 번호:")
        a("고칠 문장:")
        a("")
    a("## 집계")
    a("")
    a(f"- 전체 {len(rows)} · 통과 __ · 수정 __ · 보류 __")
    a("- 이 묶음은 검수 통과 후에만 SESSION_COPY로 옮긴다")
    a("")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}  {len(rows)}개  {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
