#!/usr/bin/env python3
"""SESSION_COPY pending 원고를 사람·GPT 검수용 한 파일로 뽑는다.

승인하지 않는다. 필드가 채워져 있어도 copyReview는 pending으로 둔다.
"""
from __future__ import annotations

import json
import locale
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "editorial" / "session-copy-qa.md"
BATCH = 12


def unescape(s: str) -> str:
    return s.replace(r"\"", '"').replace(r"\n", "\n")


def parse_session_copy(src: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for m in re.finditer(r'^  "([^"]+)": \{\n((?:    .*\n)+?)  \},', src, re.M):
        sid, body = m.group(1), m.group(2)

        def field(name: str) -> str:
            mm = re.search(rf'{name}: "((?:[^"\\]|\\.)*)"', body)
            return unescape(mm.group(1)) if mm else ""

        def arr(name: str) -> list[str]:
            mm = re.search(rf"{name}: \[([^\]]*)\]", body)
            if not mm:
                return []
            return [unescape(x) for x in re.findall(r'"((?:[^"\\]|\\.)*)"', mm.group(1))]

        out[sid] = {
            "oneLiner": field("oneLiner"),
            "easyExplanation": field("easyExplanation"),
            "whyItMatters": field("whyItMatters"),
            "typicalSituation": field("typicalSituation"),
            "chain": arr("chain"),
            "keyPoints": arr("keyPoints"),
            "commonConfusions": arr("commonConfusions"),
            "copyReview": field("copyReview") or "pending",
        }
    return out


def first_sentence(s: str) -> str:
    parts = [p for p in re.split(r"(?<=[다요]\.)\s+", s.strip()) if p]
    return parts[0] if parts else s.strip()


def surface_label(term: dict) -> str:
    if str(term.get("id", "")).startswith("rpt-"):
        return "리포트 표현"
    return "경제·금융 용어"


def source_aligned(term: dict) -> bool:
    sys.path.insert(0, str(ROOT / "scripts"))
    from source_integrity import source_aligned as aligned  # noqa: E402
    return aligned(term)


def flags(sid: str, copy: dict) -> list[str]:
    notes: list[str] = []
    one, easy, why, sit = (
        copy["oneLiner"].strip(),
        copy["easyExplanation"].strip(),
        copy["whyItMatters"].strip(),
        copy["typicalSituation"].strip(),
    )
    confs = copy["commonConfusions"]
    if one and easy and one == easy:
        notes.append("한 줄 뜻 = 쉬운 설명")
    if one and why and one == why:
        notes.append("한 줄 뜻 = 알아두면 좋은 이유")
    if easy and why and easy == why:
        notes.append("쉬운 설명 = 알아두면 좋은 이유")
    if why and sit and (why == sit or (len(why) > 24 and (why in sit or sit in why))):
        notes.append("이유와 이렇게 읽어요가 겹침")
    if easy and "평편" in easy:
        notes.append("쉬운 설명에 ‘평편’")
    if len(easy) > 240:
        notes.append(f"쉬운 설명 {len(easy)}자")
    conf = confs[0] if confs else ""
    if conf:
        fxish = any(w in conf for w in ("환율", "절상", "절하"))
        about_fx = any(w in sid or w in one for w in ("환율", "외환", "평가절상", "평가절하"))
        if fxish and not about_fx:
            notes.append("혼동이 환율로 보임 — 비우는 편이 나을 수 있음")
        if ("KYC" in conf or "신분증" in conf) and "kyc" not in sid.lower() and "고객확인" not in sid:
            notes.append("혼동이 KYC로 보임 — 인접 개념인지 볼 것")
        if "전환사채" in conf and not any(k in sid.lower() for k in ("전환", "신주인수권", "bw", "cb", "사채")):
            notes.append("혼동이 전환사채로 보임 — 인접 개념인지 볼 것")
    if not confs:
        notes.append("헷갈리기 쉬운 점 없음(생략 가능)")
    return notes


def ko_key(s: str) -> str:
    try:
        locale.setlocale(locale.LC_COLLATE, "ko_KR.UTF-8")
        return locale.strxfrm(s)
    except locale.Error:
        return s


def md_escape(s: str) -> str:
    return s.replace("\n", " ").strip()


def main() -> None:
    terms_file = json.loads((ROOT / "public/data/terms.json").read_text(encoding="utf-8"))
    by_id = {t["id"]: t for t in terms_file["terms"]}
    copies = parse_session_copy((ROOT / "src/content/sessionCopy.ts").read_text(encoding="utf-8"))
    if not copies:
        raise SystemExit("SESSION_COPY를 읽지 못했어요.")

    rows = []
    missing = []
    for sid, copy in copies.items():
        term = by_id.get(sid)
        if not term:
            missing.append(sid)
            continue
        rows.append((term, copy))
    rows.sort(key=lambda x: ko_key(x[0]["headword"]))
    total_batch = max(1, (len(rows) + BATCH - 1) // BATCH)

    lines: list[str] = []
    a = lines.append
    a("# 세션 원고 검수팩")
    a("")
    a("상태: **전부 pending**. 필드가 있다고 학습 준비 완료가 아니다. 일괄 승인 금지.")
    a(f"개수: **{len(rows)}개** · 묶음 {total_batch}개(한 묶음 {BATCH}개, 앱 검수 모드와 같은 한글 순)")
    a("출처: `src/content/sessionCopy.ts` + `public/data/terms.json` 해당 표제어만")
    a("생성: `python3 scripts/export_session_qa.py`")
    a("")
    a("이 파일을 사람 한 명과 GPT가 같이 본다. 앱 검수 모드는 없다.")
    a("")
    a("## GPT에게")
    a("")
    a("제품 카피를 검수한다. 새 기능을 제안하지 않는다. 일괄 통과로 몰아 주지 않는다.")
    a("")
    a("학습 카드에 실제로 나가는 문장: **한 줄 뜻** + **알아두면 좋은 이유의 첫 문장** + 관련 개념.")
    a("사전 상세에 나가는 문장: 쉬운 설명, 이렇게 읽어요, 알아두면 좋은 이유 전체, 핵심 포인트, 헷갈리기 쉬운 점(있을 때만).")
    a("한국은행 원문은 접힌 참고다. 원문 문장을 화면 본문으로 쓰지 않는다. 사실을 우리 말로 다시 쓴다.")
    a("")
    a("용어마다 아래 여덟을 본다. **하나라도 걸리면 수정 또는 보류**. 통과는 여덟이 모두 괜찮을 때만.")
    a("")
    a("1. 한 줄 뜻이 이 표제어에 맞는가.")
    a("2. 사례·한 경로를 그 말의 전부처럼 쓰지 않았는가.")
    a("3. 인과를 과장하지 않았는가. ‘될 수 있어요’를 ‘된다’로 굳히지 않았는가.")
    a("4. 필드가 같은 말을 반복하지 않는가. 한 줄 / 쉬운 설명 / 이유 / 이렇게 읽어요가 역할이 다른가.")
    a("5. 헷갈리기 쉬운 점이 진짜 인접 개념인가. 틀을 채우려고 만든 혼동이면 비우는 편이 낫다.")
    a("6. 뉴스·리포트에서 다시 만날 문장이 ‘이렇게 읽어요’에 있는가. 방향+조건+같이 확인할 변수인가.")
    a("7. 정의와 사례의 층위가 뒤집히지 않았는가. 사례가 개념의 정체성으로 올라오면 보류.")
    a("8. 시점에 따라 바뀌는 사실인가. 규제·법률·정책 프로젝트·기관 수·시행상태는 evergreen과 구분.")
    a("")
    a("추가로: 해요체인지, 원문과 어긋난 사실이 있는지, 다른 용어와 바꿔 넣어도 말이 되는지.")
    a("헷갈리기 쉬운 점은 선택이다. 없다고 탈락이 아니다.")
    a("")
    a("답은 **표만** 먼저 준다. 수정안이 있는 항목만 문장을 다시 쓴다. 통과 항목은 설명을 늘리지 않는다.")
    a("")
    a("```")
    a("id | 판정(통과/수정/보류) | 걸린 번호 | 한 줄 이유")
    a("...")
    a("집계: 통과 n · 수정 n · 보류 n")
    a("일괄 승인하지 말 것.")
    a("```")
    a("")
    a("그다음, 수정 판정만 고친 문장을 필드별로 제시한다.")
    a("")
    a("## 사람 메모")
    a("")
    a("GPT 표를 받은 뒤, 통과로 나온 것도 10~15개씩 눈으로 다시 본다. 그 묶음만 `copyReview: approved`로 옮긴다.")
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
    if missing:
        a("## 원문에 없는 id")
        a("")
        for sid in missing:
            a(f"- `{sid}`")
        a("")

    for i, (term, copy) in enumerate(rows, 1):
        batch = (i - 1) // BATCH + 1
        if (i - 1) % BATCH == 0:
            a(f"## 묶음 {batch}/{total_batch}")
            a("")
        title = term["headword"]
        extra = []
        if term.get("abbr"):
            extra.append(term["abbr"])
        if term.get("enName"):
            extra.append(term["enName"])
        also = " · ".join(extra)
        why_first = first_sentence(copy["whyItMatters"])
        aligned = source_aligned(term)
        hint = flags(term["id"], copy)
        related = copy["chain"]
        bok_related = term.get("relatedIds") or []

        a(f"### {i}. {title}")
        a("")
        a(f"- id: `{term['id']}`")
        a(f"- 유형: {surface_label(term)} · 분류: {term.get('category') or '—'}")
        if also:
            a(f"- 영문·약어: {also}")
        a(f"- copyReview: pending")
        a(f"- 원문 접기: {'표제어가 원문에 보임' if aligned else '표제어가 원문에 안 보임 — 매핑부터'}")
        if hint:
            a(f"- 기계 힌트: {'; '.join(hint)}")
        a("")
        a("#### 오늘 학습 카드에 나가는 문장")
        a("")
        a(f"- 한 줄 뜻: {md_escape(copy['oneLiner'])}")
        a(f"- 이유 첫 문장: {md_escape(why_first)}")
        a(f"- 관련 개념: {', '.join(related) if related else '없음'}")
        a("")
        a("#### 사전 상세에 나가는 문장")
        a("")
        a(f"- 쉬운 설명: {md_escape(copy['easyExplanation'])}")
        a(f"- 이렇게 읽어요: {md_escape(copy['typicalSituation'])}")
        a(f"- 알아두면 좋은 이유: {md_escape(copy['whyItMatters'])}")
        a(f"- 핵심 포인트: {md_escape(copy['keyPoints'][0]) if copy['keyPoints'] else '없음'}")
        a(
            f"- 헷갈리기 쉬운 점: {md_escape(copy['commonConfusions'][0]) if copy['commonConfusions'] else '없음(생략)'}"
        )
        if bok_related:
            a(f"- 원문 관련 id: {', '.join(f'`{x}`' for x in bok_related)}")
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
    a("- 통과분도 10~15개씩 사람 재확인 후에만 approved")
    a("")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}  {len(rows)}개  {OUT.stat().st_size} bytes")
    if missing:
        print("missing", missing)


if __name__ == "__main__":
    main()
