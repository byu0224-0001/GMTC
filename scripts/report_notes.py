"""정답을 고른 뒤 화면에 나올 해설을 그대로 뽑아 본다.

숫자로는 잡히지 않는 문제가 있다. 문장이 규칙을 통과해도 읽어 보면 아무 도움이
안 되는 경우다. 그래서 사람이 눈으로 확인할 목록을 만든다.

src/lib/quiz.ts의 explanationNote와 같은 순서를 따른다. 한쪽만 고치면 이 목록이
화면과 달라져 확인의 의미가 없어진다.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def literal(block: str, key: str) -> str:
    m = re.search(rf'{key}: "((?:[^"\\]|\\.)*)"', block)
    return m.group(1) if m else ""


def first_of_array(block: str, key: str) -> str:
    m = re.search(rf'{key}: \[\s*"((?:[^"\\]|\\.)*)"', block)
    return m.group(1) if m else ""


def compact(s: str) -> str:
    return re.sub(r"[\s.?!,·]", "", s)


def too_similar(a: str, b: str) -> bool:
    x, y = compact(a), compact(b)
    if not x or not y or x == y:
        return True
    n = min(22, len(x), len(y))
    return n >= 12 and x[:n] == y[:n]


def says_same(a: str, b: str) -> bool:
    """src/lib/quiz.ts의 saysSame과 같다."""
    wa = set(re.findall(r"[가-힣A-Za-z]{2,}", a))
    wb = set(re.findall(r"[가-힣A-Za-z]{2,}", b))
    if not wa or not wb:
        return False
    return len(wa & wb) / len(wa | wb) >= 0.3


def note_for(block: str, prompt: str) -> str:
    """src/lib/quiz.ts의 explanationNote와 같은 순서."""
    reading = next(
        (
            s
            for s in (
                literal(block, "whyItMatters"),
                first_of_array(block, "keyPoints"),
                literal(block, "easyExplanation"),
            )
            if s and not too_similar(s, prompt)
        ),
        "",
    )
    confusion = first_of_array(block, "commonConfusions")
    sentences = [x for x in re.split(r"(?<=[다요]\.)\s+", reading) if x] if reading else []
    if (
        reading
        and confusion
        and len(sentences) < 2
        and not too_similar(confusion, prompt)
        and not any(says_same(confusion, x) for x in sentences)
    ):
        return f"{reading} {confusion}"
    return reading or confusion


def main() -> int:
    src = (ROOT / "src/content/coreCopy.ts").read_text(encoding="utf-8")
    blocks = re.findall(r'\n  "([^"]+)": \{(.*?)\n  \},', src, re.S)
    print(f"핵심 용어 {len(blocks)}개. 문항에서 정의를 이미 본 뒤에 나오는 해설이다.\n")
    for head, block in blocks:
        prompt = literal(block, "oneLiner")
        print(f"[{head}]")
        print(f"  문항: {prompt}")
        print(f"  해설: {note_for(block, prompt)}")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
