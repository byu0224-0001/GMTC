"""한국은행 원문의 표제어 경계·공백 정규화를 한곳에서 본다.

다음 표제어가 본문 중간에 끼면 그 토큰만 뺀다. 그 지점부터 문장을 자르지 않는다.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TERMS_PATH = ROOT / "public/data/terms.json"
PARTICLES = set("은는이가을를의에와과도만로라란인임부터까지처럼")

# 본문에 실제로 등장하는 인접 개념. 끼어든 표제어가 아니다.
ALLOW_INTRUSION: set[tuple[str, str]] = {
    ("거액지급시스템", "결제리스크"),
    ("무역지수", "물가지수"),
    ("비관측경제-noe", "비트코인"),
    ("신용스프레드", "신용위험"),
    ("시카고연준금융상황지수", "신용스프레드"),
    ("외환보유액", "외환시장"),
    ("인적자본", "인플레이션"),
    ("SOFR", "Treasury Bill(T"),
    ("한국은행", "한은금융망"),
    ("국고금실시간전자이체", "국고수표"),
    ("국민부담률", "국민연금"),
    ("국민처분가능소득-ndi", "국외순수취경상이전"),
    ("국민총소득-gni", "국외순수취요소소득"),
    ("그램-리치-블라일리법", "글래스-스티걸법"),
    ("사회보장제도", "사회보험"),
    ("주가수익비율-per", "주가순자산비율"),
    ("주가수익비율-per", "주당순이익"),
    ("국제산업연관표", "글로벌 가치사슬"),
    ("국민계정체계-sna", "국제수지표"),
    ("공급사용표-sut", "국민대차대조표"),
    ("지급결제보고서", "지급결제시스템"),
    ("지급결제시스템", "지급수단"),
    ("탄소국경세", "탄소배출권"),
    ("통화안정계정", "통화안정증권"),
    ("통합발행제도", "통화안정증권"),
    ("현지금융", "현지법인"),
    ("유럽부흥개발은행-ebrd", "유럽연합"),
    ("증권결제리스크", "증권대금동시결제"),
    ("지식서비스무역통계", "지식재산권"),
    ("국민소득", "국민총소득"),
    ("분산원장기술", "비트코인"),
}


def nfkc(s: str) -> str:
    return unicodedata.normalize("NFKC", s or "")


def compact(s: str) -> str:
    return re.sub(r"[\s·ㆍ\-_/()]", "", nfkc(s))


def first_sentence(text: str, limit: int = 110) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    for sep in ("다. ", "다."):
        if sep in text:
            s = text.split("다.", 1)[0] + "다."
            return s[:limit] + ("…" if len(s) > limit else "")
    return text[:limit] + ("…" if len(text) > limit else "")


def source_aligned(term: dict) -> bool:
    body = term.get("definition") or ""
    keys = [term.get("headword") or "", term.get("abbr") or "", term.get("enName") or ""]
    keys += term.get("pairHeadwords") or []
    keys += term.get("aliases") or []
    cbody = compact(body)
    for k in keys:
        if k and len(k) >= 2 and k in body:
            return True
        ck = compact(k)
        if ck and len(ck) >= 2 and ck in cbody:
            return True
    return False


def _variants(term: dict) -> list[str]:
    out: list[str] = []
    hw = (term.get("headword") or "").strip()
    abbr = term.get("abbr")
    if hw and abbr:
        out.append(f"{hw}({abbr})")
        out.append(f"{hw} ({abbr})")
    if hw:
        out.append(hw)
    for p in term.get("pairHeadwords") or []:
        p = (p or "").strip()
        if p and p not in out:
            out.append(p)
    out.sort(key=len, reverse=True)
    return out


def nearby_intrusions(terms: list[dict], window: int = 3) -> list[dict]:
    hits: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for i, t in enumerate(terms):
        body = t.get("definition") or ""
        for n in terms[i + 1 : i + 1 + window]:
            if (t["id"], n["id"]) in ALLOW_INTRUSION:
                continue
            if (t["id"], n.get("headword") or "") in ALLOW_INTRUSION:
                continue
            for v in _variants(n):
                if len(compact(v)) < 4:
                    continue
                flex = r"\s*".join(map(re.escape, v))
                for m in re.finditer(flex, body):
                    if m.start() < 8:
                        continue
                    after = body[m.end() : m.end() + 1]
                    before = body[max(0, m.start() - 8) : m.start()]
                    if after in PARTICLES:
                        continue
                    if before.rstrip().endswith((",", "·", "+", "-", "=", "*")):
                        continue
                    key = (t["id"], v)
                    if key in seen:
                        continue
                    seen.add(key)
                    hits.append(
                        {
                            "id": t["id"],
                            "headword": t.get("headword"),
                            "intruder": v,
                            "intruderId": n["id"],
                            "at": m.start(),
                            "context": body[max(0, m.start() - 24) : m.end() + 24],
                        }
                    )
    return hits


def _collapse_spaces(s: str) -> str:
    s = re.sub(r"[ \t]{2,}", " ", s)
    s = re.sub(r"\s+([.,)])", r"\1", s)
    return s.strip()


def strip_token(body: str, token: str) -> str:
    flex = r"\s*".join(map(re.escape, token))
    out = re.sub(flex, " ", body, count=1)
    return _collapse_spaces(out)


# 짧은 표제어·문법 예외는 여기만 손으로 고친다.
EXPLICIT: list[tuple[str, str, str]] = [
    ("거액익스포저규제", "2019년 3월 결제 시범실시한 이후", "2019년 3월 시범실시한 이후"),
    (
        "가상자산공개-ico",
        "ICO는 이더리움(Ethereum)을 포함한 다양한 분산원장 기반 블록체인 네트워크에서 이뤄지고 있다. 우리나라의 경우 향후 논의를 거 쳐 ICO를 포함한 가상자산 전반의 발행 및 유통 관련 사항을 가상자산 관련 법률에서 규 제할 것으로 보인다.",
        "ICO는 이더리움(Ethereum)을 포함한 다양한 분산원장 기반 블록체인 네트워크에서 이뤄지고 있다. 가상자산의 발행·유통 규율은 국내 법·제도가 정하는 범위와 시점에 따라 달라지므로 최신 공식 자료를 확인해야 한다.",
    ),
    (
        "국민연금",
        "다만 출산율 저하와 고령화로 인해 국민연금 기금이 고갈될 수 있다는 우려가 높아지면서 수급 개시 연령 상향, 보험료 인상 등의 필요성이 대두되고 있다.",
        "다만 저출산·고령화로 기금 지속가능성이 과제로 남아 있으며, 보험료율과 수급 개시 연령 등은 법령이 정한 경로에 따라 시점마다 달라질 수 있어 보건복지부 등 공식 안내를 확인해야 한다.",
    ),
    ("공공재", "않는다. (SUT) 따라서", "않는다. 따라서"),
    ("금융EDI", "방지 (FSI) 하고", "방지하고"),
    ("4차산업혁명", "공존, 사회보험 개인정보", "공존, 개인정보"),
]


def clean_definitions(terms: list[dict]) -> dict[str, int]:
    """끼어든 다음 표제어 토큰만 제거하고, 현행성 문장만 치환한다."""
    by_id = {t["id"]: t for t in terms}
    changed = {"explicit": 0, "intrusion": 0}

    for tid, old, new in EXPLICIT:
        t = by_id.get(tid)
        if not t:
            continue
        if old in t["definition"]:
            t["definition"] = t["definition"].replace(old, new, 1)
            t["shortDef"] = first_sentence(t["definition"])
            changed["explicit"] += 1

    # 같은 본문을 여러 번 훑어 연쇄 삽입을 걷는다.
    for _ in range(3):
        hits = nearby_intrusions(terms)
        if not hits:
            break
        for h in hits:
            t = by_id[h["id"]]
            before = t["definition"]
            t["definition"] = strip_token(t["definition"], h["intruder"])
            if t["definition"] != before:
                t["shortDef"] = first_sentence(t["definition"])
                changed["intrusion"] += 1
    return changed


def load_terms() -> dict:
    return json.loads(TERMS_PATH.read_text(encoding="utf-8"))


def save_terms(payload: dict) -> None:
    TERMS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    payload = load_terms()
    hits = nearby_intrusions(payload["terms"])
    print(f"intrusions before clean: {len(hits)}")
    stats = clean_definitions(payload["terms"])
    save_terms(payload)
    left = nearby_intrusions(payload["terms"])
    print("cleaned", stats, "remaining", len(left))
    for h in left[:20]:
        print(h["id"], "<-", h["intruder"], "|", re.sub(r"\s+", " ", h["context"]))
