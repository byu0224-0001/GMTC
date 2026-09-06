"""우리가 직접 쓴 학습 문구를 해요체로 옮긴다.

왜 하는가. 20~30대가 폰에서 5분 쓰는 앱인데 문장이 `나타냅니다` `아닙니다`
`다른 제도입니다`로 끝나면 교재를 읽는 느낌이 된다. 내용이 같아도 거리가 생긴다.

무엇을 바꾸지 않는가. **한국은행 원문 정의는 건드리지 않는다.** 원문은
public/data/terms.json에 따로 있고 이 스크립트는 src/content/*.ts만 본다.
공식 문서를 우리 말투로 고쳐 쓰면 그건 더 이상 원문이 아니다.

    우리 설명 = 해요체
    공식 원문 = 원문 그대로

한글 활용은 규칙만으로 다 되지 않는다. 그래서 두 층으로 쓴다.
  1. 규칙: 종성 유무와 모음 조화로 대부분을 처리한다
  2. 예외 사전: ㄹ탈락·ㅂ불규칙·르불규칙처럼 규칙이 어긋나는 낱말만 손으로 적는다

바꾼 결과는 전부 표로 찍어 눈으로 확인한다. 확인 없이 1000개 문장을 기계로
고치면 어색한 문장이 어디에 생겼는지 알 수 없다.
"""

import re
import sys
from pathlib import Path

FILES = [
    "src/content/coreCopy.ts",
    "src/content/reportLexicon.ts",
    "src/content/drills.ts",
    "src/content/readingCases.ts",
    "src/content/learningMaps.ts",
    "src/content/briefings.ts",
    "src/content/reasoning.ts",
    "src/content/claimCases.ts",
]

# 규칙이 어긋나는 낱말. 규칙으로 만들려다 틀리는 것보다 여기 적는 편이 안전하다.
IRREGULAR = {
    # ㄹ탈락: 만들다 -> 만듭니다. 되돌리면 어간이 `만드`로 잘못 나온다.
    "만듭니다": "만들어요",
    "줄어듭니다": "줄어들어요",
    "늘어납니다": "늘어나요",
    "답니다": "달아요",
    "삽니다": "살아요",
    "압니다": "알아요",
    "엽니다": "열어요",
    "팝니다": "팔아요",
    "붑니다": "불어요",
    "겁니다": "거예요",
    # ㅂ불규칙
    "가깝습니다": "가까워요",
    "쉽습니다": "쉬워요",
    "어렵습니다": "어려워요",
    "무겁습니다": "무거워요",
    "가볍습니다": "가벼워요",
    "좁습니다": "좁아요",
    # 르불규칙
    "다릅니다": "달라요",
    "가릅니다": "갈라요",
    "빠릅니다": "빨라요",
    "고릅니다": "골라요",
    "이릅니다": "일러요",
    "부릅니다": "불러요",
    "오릅니다": "올라요",
    "내릅니다": "내려요",
    # 불규칙에 준하는 것들
    "아닙니다": "아니에요",
    "됩니다": "돼요",
    "안됩니다": "안 돼요",
    "합니다": "해요",
    "그렇습니다": "그래요",
    "이렇습니다": "이래요",
    "낫습니다": "나아요",
    "긋습니다": "그어요",
    "짓습니다": "지어요",
    "갖습니다": "가져요",
    "듣습니다": "들어요",
    "걷습니다": "걸어요",
    "묻습니다": "물어요",
}

# `이`로 끝나는 동사 어간. `보입니다`는 명사 `보` + 이다가 아니라 동사 보이다이므로
# `보예요`가 아니라 `보여요`가 된다. 글자만으로는 명사와 못 가르니 여기 적는다.
VERB_I = {
    "보이",
    "쓰이",
    "섞이",
    "묶이",
    "조이",
    "줄이",
    "움직이",
    "높이",
    "모이",
    "쌓이",
    "벌이",
    "붙이",
    "기울이",
    "출렁이",
}

BASE, JONG_COUNT, JUNG_COUNT = 0xAC00, 28, 21
# 모음 조화. ㅏ ㅑ ㅗ 는 아요, 나머지는 어요.
BRIGHT = {0, 2, 8}  # ㅏ, ㅑ, ㅗ


def decompose(ch: str):
    """한 글자를 초성·중성·종성 번호로 나눈다."""
    if not ("가" <= ch <= "힣"):
        return None
    code = ord(ch) - BASE
    return code // (JONG_COUNT * JUNG_COUNT), (code // JONG_COUNT) % JUNG_COUNT, code % JONG_COUNT


def compose(cho: int, jung: int, jong: int) -> str:
    return chr(BASE + (cho * JUNG_COUNT + jung) * JONG_COUNT + jong)


def polite_from_stem(stem: str) -> str:
    """어간에 -아요/-어요를 붙인다. 축약이 일어나는 경우를 함께 처리한다."""
    if stem.endswith("하"):
        return stem[:-1] + "해요"
    if stem.endswith("되"):
        return stem[:-1] + "돼요"
    d = decompose(stem[-1])
    if d is None:
        return stem + "어요"
    cho, jung, jong = d
    if jong:
        # 종성이 있으면 축약이 없다. 모음 조화만 본다.
        return stem + ("아요" if jung in BRIGHT else "어요")
    # 종성이 없으면 어미와 합쳐진다.
    MERGE = {
        0: None,   # ㅏ + 아 -> ㅏ (가 -> 가요)
        1: None,   # ㅐ + 어 -> ㅐ (나타내 -> 나타내요)
        3: None,   # ㅒ
        4: None,   # ㅓ + 어 -> ㅓ (서 -> 서요)
        5: None,   # ㅔ + 어 -> ㅔ (세 -> 세요)
        7: None,   # ㅖ
        20: 6,     # ㅣ + 어 -> ㅕ (내리 -> 내려)
        8: 9,      # ㅗ + 아 -> ㅘ (보 -> 봐)
        13: 14,    # ㅜ + 어 -> ㅝ (주 -> 줘)
        18: 4,     # ㅡ + 어 -> ㅓ (쓰 -> 써)
        6: None,   # ㅕ + 어 -> ㅕ
        2: None,   # ㅑ
        11: None,  # ㅘ (나오 -> 나와)
    }
    if jung in MERGE:
        merged = MERGE[jung]
        if merged is None:
            return stem + "요"
        return stem[:-1] + compose(cho, merged, 0) + "요"
    return stem + ("아요" if jung in BRIGHT else "어요")


def convert(word: str) -> str | None:
    """`...니다`로 끝나는 낱말 하나를 해요체로 옮긴다."""
    if word in IRREGULAR:
        return IRREGULAR[word]

    # `...입니다`는 두 가지다. `비율입니다`(명사 + 이다)와 `보입니다`(동사 보이다).
    # 형태가 같아서 글자만으로는 못 가른다. 동사는 여기 적어 두고 나머지를 명사로 본다.
    if word.endswith("입니다") and len(word) > 3:
        stem = word[:-3] + "이"
        if stem in VERB_I:
            return polite_from_stem(stem)
        noun = word[:-3]
        d = decompose(noun[-1])
        if d and d[2] == 0:
            return noun + "예요"
        return noun + "이에요"
    if word == "입니다":
        return "이에요"

    # 과거: 어간 끝에 ㅆ이 붙은 형태. `했습니다` `올랐습니다` `찼습니다` 모두 여기.
    m = re.match(r"^(.*)습니다$", word)
    if m:
        d = decompose(m.group(1)[-1])
        if d and d[2] == 20:  # 종성 ㅆ
            return m.group(1) + "어요"

    # X습니다: 어간이 자음으로 끝난다
    if word.endswith("습니다"):
        return polite_from_stem(word[:-3])

    # Xㅂ니다: 어간이 모음으로 끝나고 ㅂ이 붙었다
    if word.endswith("니다"):
        head = word[:-2]
        d = decompose(head[-1])
        if d and d[2] == 17:  # 종성 ㅂ
            stem = head[:-1] + compose(d[0], d[1], 0)
            return polite_from_stem(stem)
    return None


def main() -> int:
    check = "--check" in sys.argv
    table: dict[str, str] = {}
    unknown: set[str] = set()
    changed = 0

    for f in FILES:
        p = Path(f)
        src = p.read_text(encoding="utf-8")
        out = src

        def fix_literal(m: re.Match) -> str:
            body = m.group(1)

            def one(w: re.Match) -> str:
                word = w.group(1)
                new = convert(word)
                if new is None:
                    unknown.add(word)
                    return word
                table[word] = new
                return new

            return '"' + re.sub(r"([가-힣]{1,8}니다)(?=[.」\s]|$)", one, body) + '"'

        out = re.sub(r'"((?:[^"\\]|\\.)*)"', fix_literal, out)
        if out != src:
            changed += 1
            if not check:
                p.write_text(out, encoding="utf-8")

    print(f"{'검사' if check else '변환'}: 파일 {changed}개, 어미 {len(table)}종")
    for k in sorted(table, key=lambda x: (-len(x), x)):
        print(f"  {k:16} -> {table[k]}")
    if unknown:
        print(f"\n규칙에 없는 어미 {len(unknown)}종. 예외 사전에 추가해야 한다.")
        for u in sorted(unknown):
            print(f"  {u}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
