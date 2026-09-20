#!/usr/bin/env python3
"""GPT 검수 라운드 문장을 SESSION_COPY에 반영하고, 원문 경계를 자른다.

통과·수정은 approved, 보류는 pending.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from export_session_qa import parse_session_copy  # noqa: E402

SESSION_TS = ROOT / "src/content/sessionCopy.ts"
PATCHES = ROOT / "editorial/session-copy-patches.json"

HEADER = '''import type { CoreCopy } from "./coreCopy";

/**
 * Core100 밖의 세션 후보 원고.
 * copyReview approved는 통과·수정 반영분. 보류는 pending.
 *
 * 한 줄 뜻         이게 뭐예요? 개념의 정체성. 사례가 정체성으로 올라오면 안 된다.
 * 쉬운 설명         조금 더 풀어 말하면요?
 * 알아두면 좋은 이유 이 개념을 알면 어떤 질문을 풀 수 있는가.
 * 이렇게 읽어요     실제 문장에서 조건이 주어졌을 때 어떻게 해석하는가.
 *                   방향 + 조건 + 같이 확인할 변수. A가 오르면 B가 오른다는 공식 금지.
 * 핵심 포인트       기억할 조건·예외·방향성
 * 헷갈리기 쉬운 점   실제로 혼동할 인접 개념. 없으면 생략.
 *
 * 투자 문맥은 메커니즘 → 경제·금융 문장 → 필요할 때만 시장 연결 순이다.
 * 규제·법률·정책 프로젝트·시행상태는 evergreen이 아니다. 시점을 단정하지 않는다.
 */
export type SessionCopy = CoreCopy & { typicalSituation: string };

export const SESSION_COPY: Record<string, SessionCopy> = {
'''


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def dump_entry(sid: str, c: dict) -> str:
    lines = [f'  "{sid}": {{']
    lines.append(f'    oneLiner: "{esc(c["oneLiner"])}",')
    lines.append(f'    easyExplanation: "{esc(c["easyExplanation"])}",')
    lines.append(f'    whyItMatters: "{esc(c["whyItMatters"])}",')
    chain = ", ".join(f'"{esc(x)}"' for x in c["chain"])
    lines.append(f"    chain: [{chain}],")
    if c.get("keyPoints"):
        kp = ", ".join(f'"{esc(x)}"' for x in c["keyPoints"])
        lines.append(f"    keyPoints: [{kp}],")
    conf = c.get("commonConfusions") or []
    if conf:
        cc = ", ".join(f'"{esc(x)}"' for x in conf)
        lines.append(f"    commonConfusions: [{cc}],")
    lines.append(f'    typicalSituation: "{esc(c["typicalSituation"])}",')
    review = c.get("copyReview") or "pending"
    lines.append(f'    copyReview: "{review}",')
    lines.append("  },")
    return "\n".join(lines)


def apply_session() -> int:
    copies = parse_session_copy(SESSION_TS.read_text(encoding="utf-8"))
    patches = json.loads(PATCHES.read_text(encoding="utf-8"))
    missing = [k for k in patches if k not in copies]
    if missing:
        raise SystemExit(f"unknown patch ids: {missing}")
    for sid, patch in patches.items():
        cur = copies[sid]
        for field, val in patch.items():
            if field == "commonConfusions" and val == []:
                cur.pop("commonConfusions", None)
                continue
            cur[field] = val
        copies[sid] = cur
    # preserve original key order
    src = SESSION_TS.read_text(encoding="utf-8")
    order = re.findall(r'^  "([^"]+)": \{', src, re.M)
    parts = [HEADER]
    for sid in order:
        parts.append(dump_entry(sid, copies[sid]))
        parts.append("")
    parts[-1] = parts[-1]  # last blank
    text = "\n".join(parts).rstrip() + "\n};\n"
    SESSION_TS.write_text(text, encoding="utf-8")
    return len(patches)


def main() -> None:
    n = apply_session()
    print(f"session patched {n}")


if __name__ == "__main__":
    main()
