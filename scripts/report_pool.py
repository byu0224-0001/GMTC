#!/usr/bin/env python3
"""
학습 후보와 문제 유형 지원 현황을 세어 보고한다.

src/lib/pool.ts / src/lib/quiz.ts / src/lib/today.ts와 같은 규칙을 따라 계산한다.
숫자를 눈으로 확인하기 위한 리포트이므로, 규칙을 바꿀 때는 양쪽을 함께 고쳐야 한다.
validate_content.py가 후보 수의 하한을 함께 확인한다.
"""
from __future__ import annotations

import json
import re
from collections import Counter, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASK = "○○○"
MAX_HOP = 3

DEFINITION_TAIL = re.compile(
    r"(말한다|말하며|의미한다|뜻한다|가리킨다|일컫는다|지칭한다|칭한다|부른다"
    r"|의미이다|개념이다|지표이다|비율이다|제도이다|이라고 한다|라고 한다)\.?$"
)
CONTINUATION = re.compile(
    r"^(따라서|그러나|그런데|이러한|이와|이런|여기서|즉|예를|한편|또한|이에|반면|특히"
    r"|다만|이때|그리고|아울러|이는|이를|이 때|동 |위와|앞서|보통 이를|반대로|물론)"
)
SPLICED = re.compile(r"[가-힣]{3,}/[가-힣]{3,}/")
PARTICLE_HEAD = re.compile(r"^[는은이가을를의에와과도만로라란나서야며인일임]")

TOPIC_HINTS = [
    (re.compile(r"인플레이션|물가|디플레|물가지수|구매력"), "물가"),
    (re.compile(r"환율|외환|통화바스켓|페그|원화|달러화"), "외환"),
    (re.compile(r"채권|금리|스프레드|수익률|본드|듀레이션"), "금리·채권"),
    (re.compile(r"주식|주가|증권시장|배당|자사주|상장"), "주식"),
    (re.compile(r"은행|여신|대출|충당금|자기자본비율|신용등급"), "은행·신용"),
    (re.compile(r"옵션|선물|스왑|파생"), "파생"),
    (re.compile(r"블록체인|가상자산|토큰|핀테크|디지털화폐|테크"), "디지털금융"),
    (re.compile(r"주택|부동산|모기지|전세"), "부동산"),
    (re.compile(r"고용|실업|취업|성장률|경기|생산지수"), "경기·성장"),
    (re.compile(r"중앙은행|통화정책|기준금리|지급준비|공개시장"), "통화정책"),
]

TAXONOMY_ORDER = [
    "경제기초", "경기·성장", "물가", "통화정책", "금리·채권", "주식", "기업분석",
    "은행·신용", "외환", "국제경제", "부동산", "파생", "디지털금융", "금융안정",
]


def seeded_shuffle(arr, seed):
    a = list(arr)
    s = seed or 1
    for i in range(len(a) - 1, 0, -1):
        s = (s * 1103515245 + 12345) % 2**32
        j = s % (i + 1)
        a[i], a[j] = a[j], a[i]
    return a


def mask_keys(term):
    raw = [term["headword"], term.get("abbr") or "", term.get("enName") or ""]
    return sorted({k for k in raw if len(k) >= 2}, key=len, reverse=True)


def mask_headword(term, sentence):
    text, count = sentence, 0
    for key in mask_keys(term):
        text, n = re.subn(re.escape(key), MASK, text)
        count += n
        if len(key) >= 3:
            text, n = re.subn(r"\s*".join(map(re.escape, key)), MASK, text)
            count += n
    if count < 1 or count > 2:
        return None
    if re.search(f"[가-힣]{MASK}|{MASK}\\s*{MASK}", text):
        return None
    for m in re.finditer(f"{MASK}(.?)", text):
        nxt = m.group(1)
        if nxt and re.match(r"[가-힣]", nxt) and not PARTICLE_HEAD.match(nxt):
            return None
    return text


def official_prompt(term):
    if len(term["headword"]) < 2:
        return None
    for sentence in re.findall(r"[^.]{15,200}?다\.", term["definition"]):
        sentence = sentence.strip()
        if not DEFINITION_TAIL.search(sentence):
            continue
        if CONTINUATION.match(sentence) or SPLICED.search(sentence):
            continue
        masked = mask_headword(term, sentence)
        if not masked:
            continue
        if not 28 <= len(masked) <= 140:
            continue
        if len(masked.replace(MASK, "")) < 24:
            continue
        return masked
    return None


def _reject_reason(term) -> str:
    """왜 문항이 되지 않는지. 가장 멀리 통과한 단계를 사유로 삼는다.

    문장별 사유를 뭉쳐서 세면 뒤 문장의 사유가 앞 문장의 실제 실패를 덮어 버린다.
    """
    if len(term["headword"]) < 2:
        return "표제어가 한 글자"
    sentences = [s.strip() for s in re.findall(r"[^.]{15,200}?다\.", term["definition"])]
    if not sentences:
        return "정의문으로 끊어 읽을 문장이 없음"
    best, reason = 0, "정의문 어미가 아님 (연혁·계산법·배경 설명)"
    for s in sentences:
        if not DEFINITION_TAIL.search(s):
            continue
        if best < 1:
            best, reason = 1, "앞 문장에 이어지는 문장이라 단독으로 못 읽음"
        if CONTINUATION.match(s) or SPLICED.search(s):
            continue
        if best < 2:
            best, reason = 2, "설명이 표제어가 아닌 다른 개념을 가리킴"
        if not mask_headword(term, s):
            continue
        if best < 3:
            best, reason = 3, "표제어를 가리면 남는 문장이 너무 짧음"
    return reason


def build():
    data = json.loads((ROOT / "public/data/terms.json").read_text(encoding="utf-8"))
    terms = {t["id"]: t for t in data["terms"]}
    literacy = (ROOT / "src/content/literacy.ts").read_text(encoding="utf-8")
    core = dict(re.findall(r'\{ id: "([^"]+)", taxonomy: "([^"]+)" \}', literacy))

    neighbors: dict[str, set[str]] = {}
    for t in data["terms"]:
        for r in t.get("relatedIds") or []:
            if r not in terms:
                continue
            neighbors.setdefault(t["id"], set()).add(r)
            neighbors.setdefault(r, set()).add(t["id"])

    hop, topic = {}, {}
    queue = deque()
    for cid, tax in core.items():
        if cid in terms:
            hop[cid], topic[cid] = 0, tax
            queue.append(cid)
    while queue:
        u = queue.popleft()
        for v in sorted(neighbors.get(u, ())):
            if v in hop:
                continue
            hop[v], topic[v] = hop[u] + 1, topic[u]
            queue.append(v)
    for t in data["terms"]:
        if hop.get(t["id"]) == 0:
            continue
        for rx, tax in TOPIC_HINTS:
            if rx.search(t["headword"]):
                topic[t["id"]] = tax
                break

    pool = []
    for t in data["terms"]:
        h = hop.get(t["id"])
        if h is None or h > MAX_HOP:
            continue
        prompt = official_prompt(t)
        if h > 0 and not prompt:
            continue
        pool.append({"id": t["id"], "hop": h, "topic": topic.get(t["id"], "경제기초"), "prompt": prompt})
    return data, terms, core, pool


def main() -> int:
    data, terms, core, pool = build()
    copy_src = (ROOT / "src/content/coreCopy.ts").read_text(encoding="utf-8")
    drills = (ROOT / "src/content/drills.ts").read_text(encoding="utf-8")
    reading = (ROOT / "src/content/readingCases.ts").read_text(encoding="utf-8")
    report_src = (ROOT / "src/content/reportLexicon.ts").read_text(encoding="utf-8")

    one_liners = dict(
        re.findall(r'\n  "([^"]+)": \{\s*\n\s*oneLiner: "((?:[^"\\]|\\.)*)"', copy_src)
    )
    report_ids = re.findall(r'id: "(rpt-[^"]+)"', report_src)
    REPORT_HEAD.update(
        dict(re.findall(r'id: "(rpt-[^"]+)"[\s\S]*?headword: "([^"]+)"', report_src))
    )
    canon = dict(re.findall(r'"(rpt-[^"]+)": "([^"]+)"', report_src))
    report_one = dict(
        re.findall(
            r'id: "(rpt-[^"]+)"[\s\S]*?easyExplanation:\s*\n?\s*"((?:[^"\\]|\\.)*)"', report_src
        )
    )
    contrast = set(
        re.findall(r'\n  "([^"]+)": \{', re.search(r"export const CONTRAST[\s\S]*?\n\};", drills).group(0))
    )
    misc = set(
        re.findall(
            r'\n  "([^"]+)": \{', re.search(r"export const MISCONCEPTIONS[\s\S]*?\n\};", drills).group(0)
        )
    )
    ctx_answers = {canon.get(a, a) for a in re.findall(r'answerTermId: "([^"]+)"', reading)}

    candidates = [{"id": p["id"], "hop": p["hop"], "topic": p["topic"], "prompt": p["prompt"]} for p in pool]
    for rid in report_ids:
        if rid in canon:
            continue
        candidates.append({"id": rid, "hop": 0, "topic": "리포트 표현", "prompt": None})

    def prompt_text(c):
        own = one_liners.get(c["id"]) or report_one.get(c["id"])
        return own or c["prompt"]

    forms = Counter()
    # 용어별로 몇 가지 형태를 만들 수 있는지. 하나뿐이면 익숙함 판정에서 면제 규칙에 의존한다.
    per_term: dict[str, list[str]] = {}
    for c in candidates:
        mine: list[str] = []
        text = prompt_text(c)
        if text:
            forms["recall"] += 1
            mine.append("recall")
            if len(text) <= 84:
                forms["recognition"] += 1
                mine.append("recognition")
        if c["id"] in contrast:
            forms["contrast"] += 1
            mine.append("contrast")
        if c["id"] in misc:
            forms["judgment"] += 1
            mine.append("judgment")
        if c["id"] in ctx_answers:
            forms["context"] += 1
            mine.append("context")
        per_term[c["id"]] = mine

    single = [i for i, f in per_term.items() if len(f) <= 1]
    multi = [i for i, f in per_term.items() if len(f) >= 2]
    core_single = [i for i in single if i in one_liners or i.startswith("rpt-")]

    print("=" * 66)
    print("1. 학습 후보")
    print("=" * 66)
    print(f"한국은행 원문           {len(data['terms'])}개")
    print(f"리포트 표현             {len(report_ids)}개 (그중 {len(canon)}개는 원문 용어와 동일)")
    print(f"핵심 100개에서 3다리 안 {sum(1 for i in terms if True and _hop_ok(i, pool))}개 (문항 성립 기준 통과)")
    print(f"최종 학습 후보          {len(candidates)}개")
    print()
    print("  단계별:")
    print(f"    CORE100 (자체 원고)         {sum(1 for c in candidates if c['hop'] == 0 and c['id'] in one_liners)}개")
    print(f"    리포트 표현 (자체 원고)     {sum(1 for c in candidates if c['id'].startswith('rpt-'))}개")
    print(f"    한국은행 원문 정의문        {sum(1 for c in candidates if c['hop'] > 0)}개")
    print(f"  사전에만 남는 용어          {len(data['terms']) - sum(1 for c in candidates if not c['id'].startswith('rpt-'))}개")
    print()
    print("  후보에서 빠지는 이유 (한국은행 787개 기준):")
    reasons = Counter()
    for t in data["terms"]:
        if official_prompt(t):
            continue
        reasons[_reject_reason(t)] += 1
    for r, n in reasons.most_common():
        print(f"    {n:4}개  {r}")
    print("    * 문항이 안 되는 것은 알고리즘이 보수적이어서가 아니라, 원문이 표제어가 아닌")
    print("      다른 개념을 설명하거나 설명 안에 답이 들어 있어서다. 사람이 원고를 쓰지 않으면")
    print("      늘릴 수 없다. 이 용어들은 사전에서 전부 찾아볼 수 있다.")
    print()
    print("  분야 분포:")
    for tax, n in sorted(Counter(c["topic"] for c in candidates).items(), key=lambda x: -x[1]):
        print(f"    {tax:8} {n:3}개")

    print()
    print("=" * 66)
    print("2. 문제 유형별 지원 용어 수")
    print("=" * 66)
    labels = {
        "recognition": "뜻 고르기 (용어 → 뜻)",
        "recall": "용어 떠올리기 (뜻 → 용어)",
        "contrast": "비슷한 개념 구분",
        "judgment": "맞는 설명인지 판단 (O/X)",
        "context": "짧은 상황에 적용",
    }
    for k in ["recognition", "recall", "contrast", "judgment", "context"]:
        print(f"  {labels[k]:28} {forms[k]:3}개")
    print()
    print("  익숙해짐 판정 기준별:")
    print(f"    일반 규칙 적용 가능 (형태 2개 이상)  {len(multi):3}개")
    print(f"    면제 규칙에 의존 (형태 1개)          {len(single):3}개")
    if core_single:
        print(f"    그중 자체 원고 용어                  {len(core_single):3}개  <- 문항 보강 대상")
        print(f"      {', '.join(sorted(core_single)[:12])}")
    else:
        print("    그중 자체 원고 용어                    0개  (핵심 용어는 면제 규칙에 의존하지 않는다)")
    print(f"  형태 분포: " + ", ".join(
        f"{n}개 형태 {c}용어" for n, c in sorted(Counter(len(f) for f in per_term.values()).items())
    ))

    print()
    print("=" * 66)
    print("2-1. 핵심·빈출 용어 커버리지")
    print("=" * 66)
    print("  후보 총량보다 이쪽이 중요하다. 자동 문항화가 쉬운 용어만 학습되면")
    print("  교육적 중요도가 아니라 원문 문장 구조가 커리큘럼을 정하게 된다.")
    print()
    core_ids = list(core.keys())
    report_only = [r for r in report_ids if r not in canon]
    groups = [
        ("Core100", core_ids),
        ("Report Essentials", report_only),
    ]
    for name, ids in groups:
        present = [i for i in ids if i in per_term]
        print(f"  {name} ({len(ids)}개)")
        print(f"    학습 후보에 포함        {len(present):3}/{len(ids)}")
        for k in ["recognition", "recall", "contrast", "judgment", "context"]:
            n = sum(1 for i in present if k in per_term[i])
            print(f"    {labels[k]:26} {n:3}/{len(ids)}")
        weak = [i for i in present if len(per_term[i]) < 2]
        missing = [i for i in ids if i not in per_term]
        if missing:
            print(f"    후보에서 빠짐          {len(missing)}개  <- 사람이 원고를 써야 한다")
            print(f"      {', '.join(missing[:10])}")
        if weak:
            print(f"    형태 1개뿐 (면제 의존)  {len(weak)}개  <- 문항 보강 대상")
            print(f"      {', '.join(sorted(weak)[:10])}")
        if not missing and not weak:
            print("    전부 두 가지 이상 형태로 학습 가능. 면제 규칙에 의존하지 않는다.")
        print()

    print()
    print("=" * 66)
    print("3. 10일 학습 예시 (매일 접속, 모두 정답 가정)")
    print("=" * 66)
    simulate(candidates, one_liners, report_one, contrast, misc, ctx_answers, terms, canon)
    return 0


def _hop_ok(term_id, pool):
    return any(p["id"] == term_id for p in pool)


REPORT_HEAD: dict[str, str] = {}


def simulate(candidates, one_liners, report_one, contrast, misc, ctx_answers, terms, canon):
    """today.ts의 pickNewTerms / srs.ts의 사다리를 그대로 따라간다."""
    STEPS = [1, 2, 6, 15]
    GRADUATE = 4
    SINGLE_FORM_FALLBACK = 5
    NEW_PER_DAY = 2
    BACKLOG_THROTTLE = 2
    BACKLOG_STOP = 4
    DEFAULT_BUDGET = 8.6
    COST_NEW, COST_FIRST, COST_REVIEW = 1.15, 0.7, 0.8
    MIN_REVIEW_CAP = 4
    LADDER = [
        ["recognition"],
        ["recall"],
        ["contrast", "recall"],
        ["judgment", "context", "contrast", "recall"],
    ]
    NAME = {
        "recognition": "뜻 고르기",
        "recall": "용어 떠올리기",
        "contrast": "개념 구분",
        "judgment": "O/X 판단",
        "context": "짧은 상황",
    }

    def label(cid):
        t = terms.get(cid)
        return t["headword"] if t else report_head.get(cid, cid)

    def available(cid):
        out = []
        if one_liners.get(cid) or report_one.get(cid) or _prompt_of(cid, candidates):
            out += ["recognition", "recall"]
        if cid in contrast:
            out.append("contrast")
        if cid in misc:
            out.append("judgment")
        if canon.get(cid, cid) in ctx_answers:
            out.append("context")
        return out

    def form_of(cid, reps):
        av = available(cid)
        for i in range(min(reps, len(LADDER) - 1), -1, -1):
            for f in LADDER[i]:
                if f in av:
                    return f
        return "recall"

    def interval_for(reps):
        return STEPS[min(max(reps, 1), len(STEPS)) - 1]

    def familiar(v):
        if v["reps"] < GRADUATE or len(v["days"]) < 2:
            return False
        return len(v["forms"]) >= 2 or v["reps"] >= SINGLE_FORM_FALLBACK

    def review_cap(new_count):
        left = DEFAULT_BUDGET - new_count * (COST_NEW + COST_FIRST)
        return max(MIN_REVIEW_CAP, int(left // COST_REVIEW))

    report_head = REPORT_HEAD
    cards: dict[str, dict] = {}
    base = 20596  # 임의의 기준일. 분야 회전이 날짜에 따라 달라지는 것을 보인다.
    for day in range(10):
        seen = set(cards)
        unseen = [c for c in candidates if c["id"] not in seen]
        seed = base + day
        buckets: dict[str, list] = {}
        for c in unseen:
            buckets.setdefault(c["topic"], []).append(c)
        for k, arr in buckets.items():
            buckets[k] = sorted(seeded_shuffle(arr, seed + len(k) + 1), key=lambda c: c["hop"])
        order = [k for k in TAXONOMY_ORDER if k in buckets]
        order += [k for k in buckets if k not in order]
        offset = seed % len(order)
        rotated = order[offset:] + order[:offset]

        due_all = sorted(
            (cid for cid, v in cards.items() if not familiar(v) and v["due"] <= day),
            key=lambda cid: cards[cid]["due"],
        )
        backlog = max(0, len(due_all) - review_cap(NEW_PER_DAY))
        want_new = 0 if backlog >= BACKLOG_STOP else 1 if backlog >= BACKLOG_THROTTLE else NEW_PER_DAY

        fresh, report_used = [], 0
        while len(fresh) < want_new:
            moved = False
            for k in rotated:
                if len(fresh) >= want_new:
                    break
                arr = buckets.get(k) or []
                idx = next(
                    (i for i, c in enumerate(arr) if not c["id"].startswith("rpt-") or report_used < 1),
                    None,
                )
                if idx is None:
                    continue
                c = arr.pop(idx)
                if c["id"].startswith("rpt-"):
                    report_used += 1
                fresh.append(c)
                moved = True
            if not moved:
                break

        cap = review_cap(len(fresh))
        review = due_all[:cap]
        left = max(0, len(due_all) - len(review))

        new_txt = ", ".join(f"{label(c['id'])}({c['topic']})" for c in fresh)
        rev_txt = ", ".join(f"{label(cid)}·{NAME[form_of(cid, cards[cid]['reps'])]}" for cid in review)
        mins = round(len(fresh) * (COST_NEW + COST_FIRST) + len(review) * COST_REVIEW)
        print(f"\nDay {day + 1}  약 {mins}분  (신규 {len(fresh)} / 복습 {len(review)} / 밀림 {left})")
        print(f"  새 용어: {new_txt or '없음'}")
        print(f"  복습   : {rev_txt or '없음'}")

        for cid in review:
            v = cards[cid]
            v["forms"].add(form_of(cid, v["reps"]))
            v["days"].add(day)
            v["reps"] += 1
            v["due"] = day + interval_for(v["reps"])
        for c in fresh:
            f = form_of(c["id"], 0)
            cards[c["id"]] = {"reps": 1, "due": day + interval_for(1), "days": {day}, "forms": {f}}

    grad = sum(1 for v in cards.values() if familiar(v))
    print(f"\n10일 누적: 시작한 용어 {len(cards)}개, 익숙해짐 {grad}개")


def _prompt_of(cid, candidates):
    for c in candidates:
        if c["id"] == cid:
            return c["prompt"]
    return None


if __name__ == "__main__":
    raise SystemExit(main())
