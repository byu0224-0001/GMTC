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



# 읽을 거리인지 판별하는 신호. 이 중 둘 이상이 있어야 상황문이 아니라 글이 된다.
READING_SIGNALS: list[tuple[str, str]] = [
    ("변화", r"(올랐|내렸|늘었|줄었|커졌|낮아졌|높아졌|벌어졌|뛰었|무너졌|길어졌|빠져나갔|바뀌|앞당|불었)"),
    ("대조", r"(그런데|그러나|반면|다만|오히려|한편|-지만|았지만|었지만)"),
    ("원인", r"(때문|영향|탓|덕에|까닭|결과|로 인해|따라)"),
    ("해석", r"(평가|해석|전망|분석|판단|봤어요|보기 때문|말했어요|적었어요|나왔어요)"),
]

# 숫자를 쓸 때 허용하는 형식. 단위 없는 맨숫자가 떠다니면 무엇의 값인지 알 수 없다.
FIGURE_OK = re.compile(
    r"[0-9]+(\.[0-9]+)?\s*(%포인트|%p|%|배|주|개|곳|년|개월|주간|일|월|분기|번|명|원|달러|억|조|만|천|대|분)"
    r"|[0-9]+(\.[0-9]+)?\s*(억|조|만)?\s*(원|달러)"
    r"|[0-9]+분의|[0-9]+%대|[0-9]+년물|BBB|AA|[0-9]+대"
)

# 실제 규제·정책 수치로 읽힐 수 있는 표현. 지어낸 글이 현행 제도로 오해되면 안 된다.
POLICY_LOOKALIKE = re.compile(
    r"(상한이\s*[0-9]+%에서\s*[0-9]+%로|규제.{0,12}[0-9]+%에서\s*[0-9]+%로|"
    r"기준금리를?\s*[0-9]+(\.[0-9]+)?%(에서|로)|정책금리를?\s*[0-9]+(\.[0-9]+)?%(에서|로))"
)


def check_own_copy(core_ids: set, terms: set, report_ids: set) -> list[str]:
    """우리가 직접 쓴 학습 문구의 규칙.

    한국은행 원문은 검사하지 않는다. 원문은 public/data/terms.json에 있고
    우리가 고치지 않는다. 여기서 보는 것은 우리 문장뿐이다.

    지키려는 것 네 가지.

    1. 문체는 해요체로 통일한다. 한 화면에 `나타냅니다`와 `나타내요`가 섞이면
       두 사람이 쓴 글처럼 읽힌다.
    2. whyItMatters가 oneLiner를 다시 말하지 않는다. 문항이 이미 정의를 말했는데
       해설이 또 정의를 말하면 사용자가 얻는 게 없다. 두 번째 문장은
       `그래서 어떻게 읽는지`여야 한다.
    3. 화살표 흐름은 검수된 것만 쓴다. 관계를 밝히는 문장이 함께 있어야 한다.
    4. 오답으로 지정한 용어는 실제로 존재해야 한다.
    """
    errors: list[str] = []
    root = ROOT / "src/content"

    own_files = [
        "coreCopy.ts",
        "reportLexicon.ts",
        "drills.ts",
        "readingCases.ts",
        "learningMaps.ts",
        "briefings.ts",
        "reasoning.ts",
        "claimCases.ts",
        "conceptFlows.ts",
    ]
    for name in own_files:
        src = (root / name).read_text(encoding="utf-8")
        for lit in re.findall(r'"((?:[^"\\]|\\.)*)"', src):
            for m in re.finditer(r"[가-힣]{1,8}니다(?=[.」\s]|$)", lit):
                errors.append(f"{name}: 해요체가 아닌 어미 `{m.group(0)}`")

    copy_src = (root / "coreCopy.ts").read_text(encoding="utf-8")
    for head, block in re.findall(r'\n  "([^"]+)": \{(.*?)\n  \},', copy_src, re.S):
        one = re.search(r'oneLiner: "((?:[^"\\]|\\.)*)"', block)
        why = re.search(r'whyItMatters: "((?:[^"\\]|\\.)*)"', block)
        if not (one and why):
            continue
        first = why.group(1).split(". ")[0]
        a = set(re.findall(r"[가-힣A-Za-z]{2,}", one.group(1)))
        b = set(re.findall(r"[가-힣A-Za-z]{2,}", first))
        if a and b and len(a & b) / len(a | b) >= 0.34:
            errors.append(f"coreCopy {head}: whyItMatters가 정의를 다시 말한다")
        if len(why.group(1)) < 30:
            errors.append(f"coreCopy {head}: whyItMatters가 해석을 담기에 짧다")

    flow_src = (root / "conceptFlows.ts").read_text(encoding="utf-8")
    flows = re.findall(
        r'\n  "([^"]+)": \{\n    steps: \[([^\]]*)\],\n    note:\s*"((?:[^"\\]|\\.)*)"',
        flow_src,
    )
    if len(flows) < 8:
        errors.append(f"검수된 개념 흐름 {len(flows)}개 < 8")
    for tid, steps, note in flows:
        if tid not in terms and tid not in report_ids:
            errors.append(f"conceptFlows 알 수 없는 용어: {tid}")
        if len(re.findall(r'"([^"]+)"', steps)) < 3:
            errors.append(f"conceptFlows {tid}: 칸이 3개 미만이면 흐름이 아니다")
        # 화살표만 두면 사용자가 정의 관계도 인과로 읽는다. 관계를 글로 밝혀야 한다.
        if len(note) < 40:
            errors.append(f"conceptFlows {tid}: 관계 설명이 짧다")

    drills_src = (root / "drills.ts").read_text(encoding="utf-8")
    contrast = drills_src[
        drills_src.index("export const CONTRAST") : drills_src.index("export const CLOZE")
    ]
    entries = re.findall(
        r'\n  "([^"]+)": \{\n    question: "((?:[^"\\]|\\.)*)",\n    foilIds: \[([^\]]*)\]',
        contrast,
    )
    missing_core = set(core_ids) - {t for t, _, _ in entries}
    if missing_core:
        errors.append(
            f"오답을 직접 지정하지 않은 핵심 용어 {len(missing_core)}개: "
            f"{', '.join(sorted(missing_core)[:5])}"
        )
    for tid, _q, foils in entries:
        ids = re.findall(r'"([^"]+)"', foils)
        if len(ids) != 3:
            errors.append(f"CONTRAST {tid}: 오답이 3개가 아니다 ({len(ids)})")
        for fid in ids:
            if fid == tid:
                errors.append(f"CONTRAST {tid}: 오답에 정답이 들어 있다")
            if fid not in terms and fid not in report_ids:
                errors.append(f"CONTRAST {tid}: 알 수 없는 오답 {fid}")
    return errors


def check_reading_body(cid: str, text: str) -> list[str]:
    """읽기 본문 품질 검사.

    이전에는 `숫자가 없으면 실패`로 두었는데 그건 잘못된 규칙이었다. 규칙을 그렇게
    쓰면 숫자가 없어도 자연스러운 글에 억지로 숫자를 밀어넣게 된다. 필요한 것은
    숫자의 존재가 아니라 **읽을 거리인가**이고, 숫자를 쓸 때는 **정확한가**다.

    그래서 세 가지만 본다.
      1. 변화·대조·원인·해석 신호가 둘 이상 있는가 (읽을 거리인지)
      2. 숫자를 썼다면 단위가 붙어 있는가 (맨숫자가 떠다니지 않는지)
      3. 실제 규제 수치처럼 읽힐 표현을 쓰지 않았는가 (지어낸 글이니까)
    """
    out: list[str] = []
    found = [name for name, pat in READING_SIGNALS if re.search(pat, text)]
    if len(found) < 2:
        out.append(f"{cid} reads like a prompt, not a passage (signals: {found or 'none'})")

    for m in re.finditer(r"[0-9]+(?:\.[0-9]+)?", text):
        # `4분의 1`처럼 앞에서 단위를 이미 밝힌 경우는 뒤 숫자를 따로 보지 않는다.
        if text[max(0, m.start() - 4) : m.start()].endswith("분의 "):
            continue
        tail = text[m.start() : m.start() + 24]
        if not FIGURE_OK.match(tail):
            out.append(f"{cid} figure without a unit: …{tail[:16]}…")
            break

    if POLICY_LOOKALIKE.search(text):
        out.append(f"{cid} figure reads like an actual regulation; use a relative change instead")
    return out


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

    reading_src = (ROOT / "src/content/readingCases.ts").read_text(encoding="utf-8")
    reading_ids = re.findall(r'\n    id: "(cx-[^"]+)"', reading_src)
    if len(reading_ids) != 32:
        errors.append(f"reading cases {len(reading_ids)} != 32")
    if len(reading_ids) != len(set(reading_ids)):
        errors.append("duplicate reading case ids")
    reading_chunks = re.split(r'\n  \{\n    id: "cx-', reading_src)[1:]
    lens_counts: dict[str, int] = {}
    for cid, chunk in zip(reading_ids, reading_chunks):
        lens = re.search(r'lens: "(name|cause|next)"', chunk)
        if not lens:
            errors.append(f"{cid} missing lens")
        else:
            lens_counts[lens.group(1)] = lens_counts.get(lens.group(1), 0) + 1
        body = re.search(r'situation:\s*\n?\s*"((?:[^"\\]|\\.)*)"', chunk)
        if not body:
            errors.append(f"{cid} missing situation")
        else:
            text = body.group(1)
            n = len(text)
            if not 150 <= n <= 400:
                errors.append(f"{cid} situation {n} chars, want 150-400")
            # 문장이 두세 개면 상황문이지 읽을 거리가 아니다.
            # 우리 원고는 해요체이므로 `다.`만 세면 한 문장도 못 센다.
            n = len(re.findall(r"[다요]\.", text))
            if n < 4:
                errors.append(f"{cid} situation has only {n} sentences, want >=4")
            errors.extend(check_reading_body(cid, text))
        ans = re.search(r'answerTermId: "([^"]+)"', chunk)
        raw = re.search(r'choiceIds: \[([^\]]+)\]', chunk)
        if not ans or not raw:
            errors.append(f"{cid} missing answerTermId/choiceIds")
            continue
        choices = re.findall(r'"([^"]+)"', raw.group(1))
        if ans.group(1) not in choices:
            errors.append(f"{cid} answer {ans.group(1)} not in choices")
        if len(choices) != len(set(choices)):
            errors.append(f"{cid} duplicate choiceIds")
        if len(choices) != 4:
            errors.append(f"{cid} choiceIds should be 4, got {len(choices)}")
        for c in choices:
            if c not in terms and c not in report_id_set:
                errors.append(f"{cid} unknown choice: {c}")
        for tid in re.findall(r'termIds: \[([^\]]*)\]', chunk):
            for t in re.findall(r'"([^"]+)"', tid):
                if t not in terms and t not in report_id_set:
                    errors.append(f"{cid} unknown termId: {t}")
        fact = re.search(r'fact: \{([\s\S]*?)\n    \},', chunk)
        if fact:
            fids = re.findall(r'id: "([^"]+)"', fact.group(1))
            fans = re.search(r'answerId: "([^"]+)"', fact.group(1))
            if len(fids) != 4:
                errors.append(f"{cid} fact choices should be 4, got {len(fids)}")
            if not fans or fans.group(1) not in fids:
                errors.append(f"{cid} fact answerId not in choices")
            if not re.search(r'why: "', fact.group(1)):
                errors.append(f"{cid} fact missing why")
    # 32편이 한 방식으로 몰리면 본문이 아니라 문제 형식을 외우게 된다.
    for lens in ("name", "cause", "next"):
        if lens_counts.get(lens, 0) < 6:
            errors.append(f"reading lens {lens} only {lens_counts.get(lens, 0)}, want >=6")

    # 읽기 사례는 지어낸 상황이므로 특정 날짜를 사실처럼 적지 않는다.
    for m in re.finditer(r'(20[0-9]{2})년 ?[0-9]{1,2}월', reading_src):
        errors.append(f"reading case has a concrete date: {m.group(0)}")

    drills_src = (ROOT / "src/content/drills.ts").read_text(encoding="utf-8")
    mis_block = re.search(
        r'export const MISCONCEPTIONS[\s\S]*?\n\};', drills_src
    )
    if not mis_block:
        errors.append("MISCONCEPTIONS not found")
    else:
        mis = re.findall(
            r'\n  "([^"]+)": \{\s*\n\s*claim: "((?:[^"\\]|\\.)*)",\s*\n\s*correct: (true|false),\s*\n\s*why: "((?:[^"\\]|\\.)*)",',
            mis_block.group(0),
        )
        if len(mis) < 20:
            errors.append(f"MISCONCEPTIONS {len(mis)} < 20")
        trues = sum(1 for _, _, c, _ in mis if c == "true")
        if mis and not 0.25 <= trues / len(mis) <= 0.75:
            errors.append(f"MISCONCEPTIONS O/X unbalanced: {trues} true of {len(mis)}")
        for tid, claim, _, why in mis:
            if tid not in terms and tid not in report_id_set:
                errors.append(f"MISCONCEPTIONS unknown term: {tid}")
            if tid not in core_ids:
                errors.append(f"MISCONCEPTIONS {tid} is not in CORE100 (needs reviewed copy)")
            if len(claim) < 12:
                errors.append(f"MISCONCEPTIONS {tid} claim too short")
            if len(why) < 20:
                errors.append(f"MISCONCEPTIONS {tid} why too short")

    errors += check_own_copy(core_ids, terms, report_id_set)

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

    maps_src = (ROOT / "src/content/learningMaps.ts").read_text(encoding="utf-8")
    map_ids = re.findall(r'\n    id: "(map-[^"]+)"', maps_src)
    if len(map_ids) < 8:
        errors.append(f"learning maps {len(map_ids)} < 8")
    if len(map_ids) != len(set(map_ids)):
        errors.append("duplicate learning map ids")
    for mid, chunk in zip(map_ids, re.split(r'\n  \{\n    id: "map-', maps_src)[1:]):
        reading = re.search(r'readingId: "([^"]+)"', chunk)
        if not reading:
            errors.append(f"{mid} missing readingId")
        elif reading.group(1) not in ts_ids:
            errors.append(f"{mid} unknown readingId {reading.group(1)}")
        steps = re.findall(r'termId: "([^"]+)"', chunk)
        if not 2 <= len(steps) <= 5:
            errors.append(f"{mid} steps should be 2-5, got {len(steps)}")
        for tid in steps:
            if tid not in known:
                errors.append(f"{mid} unknown term {tid}")
        minutes = re.search(r"minutes: (\d+)", chunk)
        if minutes and not 3 <= int(minutes.group(1)) <= 5:
            errors.append(f"{mid} minutes {minutes.group(1)} not in 3-5")

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
                "readingCases": len(reading_ids),
                "readingLens": lens_counts,
                "learningMaps": len(map_ids),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
