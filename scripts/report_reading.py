"""읽기 32편 전수 표.

`질문을 세 갈래로 나눴다`와 `본문을 다시 썼다`는 다른 작업이다. 전자만 하고 후자를
했다고 보고하면 안 되므로, 본문 길이를 첫 커밋과 직접 비교해 표로 남긴다.
"""

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LENS = {"name": "이름 찾기", "cause": "원인", "next": "다음 확인"}


def bodies(src: str) -> dict[str, str]:
    ids = re.findall(r'\n    id: "(cx-[^"]+)"', src)
    chunks = re.split(r'\n  \{\n    id: "cx-', src)[1:]
    out = {}
    for cid, chunk in zip(ids, chunks):
        m = re.search(r'situation:\s*\n?\s*"((?:[^"\\]|\\.)*)"', chunk)
        if m:
            out[cid] = m.group(1).replace("\\n", "")
    return out


def field(chunk: str, name: str) -> str | None:
    m = re.search(rf'{name}: "([^"]+)"', chunk)
    return m.group(1) if m else None


def head_labels() -> dict[str, str]:
    """용어 id를 사람이 읽는 이름으로. 표에 id만 적으면 검수할 수 없다."""
    import json

    data = json.loads((ROOT / "public/data/terms.json").read_text(encoding="utf-8"))
    labels = {t["id"]: t["headword"] for t in data["terms"]}
    report = (ROOT / "src/content/reportLexicon.ts").read_text(encoding="utf-8")
    labels.update(dict(re.findall(r'id: "(rpt-[^"]+)"[\s\S]*?headword: "([^"]+)"', report)))
    return labels


def main() -> int:
    path = ROOT / "src/content/readingCases.ts"
    src = path.read_text(encoding="utf-8")
    new = bodies(src)

    try:
        old_src = subprocess.run(
            ["git", "show", "f043669:src/content/literacy.ts"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        old = bodies(old_src)
    except subprocess.CalledProcessError:
        old = {}

    labels = head_labels()
    ids = re.findall(r'\n    id: "(cx-[^"]+)"', src)
    chunks = re.split(r'\n  \{\n    id: "cx-', src)[1:]

    print(f"{'id':24} {'전':>4} {'후':>4} {'배':>4}  {'읽기 방식':10} 핵심 용어")
    print("-" * 108)
    grew = 0
    for cid, chunk in zip(ids, chunks):
        body = new[cid]
        before = len(old.get(cid, ""))
        after = len(body)
        ratio = f"{after / before:.1f}x" if before else "-"
        if before and after >= before * 2:
            grew += 1
        lens = LENS.get(field(chunk, "lens") or "", "?")
        raw = re.search(r"termIds: \[([^\]]*)\]", chunk)
        tids = re.findall(r'"([^"]+)"', raw.group(1)) if raw else []
        if not tids:
            tids = [field(chunk, "answerTermId") or ""]
        names = " · ".join(labels.get(t, t) for t in tids)
        print(f"{cid:24} {before:>4} {after:>4} {ratio:>4}  {lens:10} {names}")

    lens_counts: dict[str, int] = {}
    for chunk in chunks:
        k = field(chunk, "lens") or "?"
        lens_counts[k] = lens_counts.get(k, 0) + 1
    lengths = [len(b) for b in new.values()]
    has_num = sum(1 for b in new.values() if re.search(r"[0-9]", b))
    sentences = [b.count("다.") for b in new.values()]

    print("-" * 108)
    print(f"편수            {len(new)}편")
    print(f"본문 길이        {min(lengths)}~{max(lengths)}자 (평균 {sum(lengths) // len(lengths)}자)")
    if old:
        prev = [len(old[c]) for c in new if c in old]
        print(f"리라이트 전      {min(prev)}~{max(prev)}자 (평균 {sum(prev) // len(prev)}자)")
        print(f"두 배 이상 확장   {grew}/{len(new)}편")
    print(f"문장 수          {min(sentences)}~{max(sentences)}문장")
    print(f"수치 포함        {has_num}/{len(new)}편")
    print("읽기 방식 분포    " + ", ".join(f"{LENS[k]} {v}편" for k, v in lens_counts.items() if k in LENS))
    return 0


if __name__ == "__main__":
    sys.exit(main())
