"""읽기 32편의 두 번째 질문을 사실/인과/다음확인 세 방식으로 나눈다.

전부 `이 개념은 무엇일까요?`로 끝나면 본문을 읽지 않고 정답 용어만 떠올리게 된다.
답이 되는 용어는 그대로 두고 묻는 방식만 바꾼다.
"""

import re
import sys
from pathlib import Path

PATH = Path("src/content/readingCases.ts")

# id -> (lens, question). question이 None이면 기존 문장을 유지한다.
PLAN: dict[str, tuple[str, str | None]] = {
    "cx-2022-cpi": ("next", None),
    "cx-hike-duration": (
        "cause",
        "만기가 긴 채권의 가격이 더 크게 내린 이유를 설명하는 개념은 무엇일까요?",
    ),
    "cx-spread": ("next", None),
    "cx-2008-mbs": ("name", None),
    "cx-bankrun": ("name", None),
    "cx-qe-taper": ("name", None),
    "cx-current-account": ("name", None),
    "cx-ltv": (
        "cause",
        "같은 집값인데 빌릴 수 있는 금액이 줄어든 이유를 설명하는 기준은 무엇일까요?",
    ),
    "cx-dsr": (
        "cause",
        "연봉이 그대로인데 대출 한도가 깎인 이유를 설명하는 기준은 무엇일까요?",
    ),
    "cx-etf": ("name", None),
    "cx-liquidity": (
        "next",
        "이런 시장에서 큰 금액을 원하는 시점에 처분할 수 있을지 판단하려면 무엇을 확인해야 할까요?",
    ),
    "cx-base-rate": (
        "cause",
        "정책금리는 그대로인데 시장금리가 움직인 이유를 설명하려면, 시장이 무엇의 향방을 다시 봤다고 해야 할까요?",
    ),
    "cx-stagflation": ("name", None),
    "cx-carry": ("name", None),
    "cx-vix": ("name", None),
    "cx-unemployment": (
        "cause",
        "시장이 금리 기대를 낮춘 근거가 된 지표는 무엇일까요?",
    ),
    "cx-fx-reserve": (
        "next",
        "환율이 급하게 오를 때 당국이 얼마나 대응할 수 있는지 가늠하려면 무엇을 확인해야 할까요?",
    ),
    "cx-leverage": (
        "next",
        "금리가 더 오를 때 이 회사가 얼마나 버틸 수 있는지 보려면 어떤 비율을 확인해야 할까요?",
    ),
    "cx-core-cpi": (
        "cause",
        "전체 상승률과 기조적 흐름이 갈린 이유를 설명하는 지표는 무엇일까요?",
    ),
    "cx-real-rate": (
        "cause",
        "이자를 더 받았는데도 살 수 있는 것이 줄어든 이유를 설명할 때, 물가를 빼기 전의 금리를 무엇이라고 할까요?",
    ),
    "cx-lender-last": ("name", None),
    "cx-yield-curve": (
        "next",
        "역전이 얼마나 깊어졌는지 확인하려면 어떤 값을 봐야 할까요?",
    ),
    "cx-ai-capex": (
        "cause",
        "설비투자가 늘었는데도 이익 추정이 갈리는 이유를 설명하는, 리포트에서 쓰는 말은 무엇일까요?",
    ),
    "cx-defi-cbdc": ("name", None),
    "cx-cb-repay": (
        "cause",
        "조기 상환으로 주식 수가 늘어날 부담이 사라진 이유를 설명하는, 이 채권의 이름은 무엇일까요?",
    ),
    "cx-shareholder-return": ("next", None),
    "cx-put-option": ("name", None),
    "cx-eps-valuation": (
        "cause",
        "이익 전망이 오르자 목표주가도 함께 오른 이유를 설명하는, 한 주가 얼마를 벌었는지 나타내는 숫자는 무엇일까요?",
    ),
    "cx-ktb-securities": ("name", None),
    "cx-yoy-ytd": (
        "cause",
        "지난달 증가율이 유난히 크게 나온 이유를 설명하는 말은 무엇일까요?",
    ),
    "cx-full-capa": (
        "next",
        "주문이 후발 업체로 넘어가고 있는지 보려면 리포트에서 무엇을 확인해야 할까요?",
    ),
    "cx-product-mix": (
        "next",
        "판매 대수가 비슷한데 이익이 줄었을 때 리포트에서 무엇을 먼저 확인해야 할까요?",
    ),
}


def main() -> int:
    src = PATH.read_text(encoding="utf-8")
    if '\n    lens: "' in src:
        print("already applied")
        return 0
    missing = []
    for cid, (lens, question) in PLAN.items():
        anchor = f'id: "{cid}",'
        if anchor not in src:
            missing.append(cid)
            continue
        start = src.index(anchor)
        end = src.index('answerTermId:', start)
        block = src[start:end]
        m = re.search(r'\n    question: "((?:[^"\\]|\\.)*)",\n', block)
        if not m:
            missing.append(f"{cid}(question)")
            continue
        new_q = question if question else m.group(1)
        replacement = f'\n    lens: "{lens}",\n    question: "{new_q}",\n'
        src = src[:start] + block.replace(m.group(0), replacement) + src[end:]
    if missing:
        print("MISSING:", missing)
        return 1
    PATH.write_text(src, encoding="utf-8")
    counts: dict[str, int] = {}
    for lens, _ in PLAN.values():
        counts[lens] = counts.get(lens, 0) + 1
    print("applied", len(PLAN), counts)
    return 0


if __name__ == "__main__":
    sys.exit(main())
