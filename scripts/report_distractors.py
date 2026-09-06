"""오답이 소거법으로 걸러지는지 검사한다.

우리 사용자는 완전히 모르는 사람이 아니라 `이거였나 저거였나` 상태다. 그래서
오답 넷이 같은 종류가 아니면, 개념을 몰라도 분야만 보고 지워 낼 수 있다.

화면에서 실제로 본 예:

    노동과 자본을 무리 없이 썼을 때 유지될 수 있는 성장 속도는?
      청년실업률 / 경기조절정책 / 연구개발 / 잠재GDP성장률

성장 속도를 묻는데 후보 셋이 실업률, 정책, 연구개발이다. 개념을 몰라도 답이 보인다.

여기서는 src/lib/quiz.ts의 pickDistractors와 같은 규칙으로 모든 후보 용어의
문항을 만들어 보고, 오답이 정답과 같은 종류인지 센다. 통과 기준은 문항마다
최소 두 개가 같은 종류인 것이다. 셋 다 다른 종류면 소거법이 통한다고 본다.
"""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from report_pool import build  # noqa: E402  같은 후보 산출을 두 번 쓰지 않는다

# src/lib/quiz.ts의 KIND_PATTERNS와 같아야 한다. 한쪽만 고치면 검사가 무의미해진다.
KIND_PATTERNS = [
    r"(성장률|증가율)$",
    r"(실업률|고용률|참가율|취업률)$",
    r"(물가|물가지수|인플레이션|인플레이션율)$",
    r"(제도|제)$",
    r"(정책|운영|기능|정책수단)$",
    r"(금리|이자율|수익률)$",
    r"(지수)$",
    r"(비율|배율|배수|율)$",
    r"(채|채권)$",
    r"(시장)$",
    r"(수지|잔액|총량|통화)$",
    r"(옵션|선물|스왑|파생상품)$",
    r"(인구|가구)$",
    r"(소득|임금|보수)$",
    r"(자산|부채|자본)$",
    r"(세|조세|부담금)$",
    r"(환율|환율제도)$",
    r"(펀드|신탁)$",
    r"(은행|기관|기구)$",
]


def shares_morpheme(a: str, b: str) -> bool:
    """src/lib/quiz.ts의 sharesMorpheme과 같다."""
    for i in range(len(a) - 1):
        piece = a[i : i + 2]
        if not re.fullmatch(r"[가-힣]{2}", piece):
            continue
        if piece in b:
            return True
    return False


def kind_of(headword: str) -> str | None:
    for p in KIND_PATTERNS:
        if re.search(p, headword):
            return p
    return None


def seeded_shuffle(items: list, seed: int) -> list:
    """src/lib/rng.ts와 같은 순서를 만든다."""
    out = list(items)
    s = seed
    for i in range(len(out) - 1, 0, -1):
        s = (s * 1664525 + 1013904223) % (2**32)
        j = s % (i + 1)
        out[i], out[j] = out[j], out[i]
    return out


def main() -> int:
    data, _terms, _core, entries = build()
    by_id = {t["id"]: t for t in data["terms"]}
    topics = {e["id"]: e["topic"] for e in entries}
    pool = [by_id[e["id"]] for e in entries if e["id"] in by_id]

    # 사람이 오답을 지정해 둔 용어. 여기는 알고리즘을 타지 않는다.
    spec = Path("src/content/drills.ts").read_text(encoding="utf-8")
    hand = set(re.findall(r'\n  "([^"]+)": \{\n    question:', spec))

    weak: list[tuple[str, list[str]]] = []
    ok = 0
    hand_n = 0
    for t in pool:
        if t["id"] in hand:
            hand_n += 1
            continue
        want_topic = topics.get(t["id"])
        want_kind = kind_of(t["headword"])
        same = [x for x in pool if x["id"] != t["id"] and topics.get(x["id"]) == want_topic]
        confusable = [
            x
            for x in same
            if (want_kind and kind_of(x["headword"]) == want_kind)
            or shares_morpheme(t["headword"], x["headword"])
        ]
        # 앱은 큐 위치를 시드로 쓴다(LearnPage의 i + 17). 한 시드만 보면 결과가 편향된다.
        worst = None
        for seed in range(17, 25):
            picked: list[dict] = []
            for src in (confusable, same, [x for x in pool if x["id"] != t["id"]]):
                for x in seeded_shuffle(src, seed):
                    if len(picked) >= 3:
                        break
                    if any(p["id"] == x["id"] for p in picked):
                        continue
                    if x["headword"] == t["headword"]:
                        continue
                    picked.append(x)
            matched = sum(
                1
                for p in picked
                if (want_kind and kind_of(p["headword"]) == want_kind)
                or shares_morpheme(t["headword"], p["headword"])
            )
            if worst is None or matched < worst[0]:
                worst = (matched, picked)
        assert worst is not None
        if worst[0] >= 2:
            ok += 1
        else:
            weak.append((t["headword"], [p["headword"] for p in worst[1]]))

    total = len(pool) - hand_n
    print(f"학습 후보 {len(pool)}개")
    print(f"  사람이 오답을 지정         {hand_n}개 (핵심 용어는 전부 여기)")
    print(f"  자동 생성이 기준 통과      {ok}개 / {total}개")
    print(f"  소거법이 통할 수 있음      {len(weak)}개")
    good = hand_n + ok
    print(f"\n합계 {good}/{len(pool)}개 ({good * 100 // max(1, len(pool))}%)가 헷갈릴 만한 오답을 갖는다.\n")
    for h, ds in weak[:40]:
        print(f"  {h}")
        print(f"    {' / '.join(ds)}")
    if len(weak) > 40:
        print(f"  ... 그리고 {len(weak) - 40}개")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
