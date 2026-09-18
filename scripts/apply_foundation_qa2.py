#!/usr/bin/env python3
"""Foundation 검수팩 2 판정을 반영한다.

copyReview는 pending. 일괄 승인하지 않는다.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from apply_session_qa_round2 import HEADER, dump_entry  # noqa: E402
from export_session_qa import parse_session_copy  # noqa: E402
from source_integrity import clean_definitions, nearby_intrusions  # noqa: E402

TERMS = ROOT / "public/data/terms.json"
TAX = ROOT / "editorial/taxonomy-overrides.json"
BATCH = ROOT / "editorial/foundation-batch2.json"
SESSION_TS = ROOT / "src/content/sessionCopy.ts"

COPY_PATCHES: dict[str, dict] = {
    "간접세": {
        "oneLiner": "납세의무자와 실제 세 부담자가 달라, 세 부담이 다른 사람에게 전가될 수 있는 세금이에요.",
        "keyPoints": ["부가가치세처럼 소비 과정에서 부담이 전가되는 세금은 소득이 낮은 가구에 상대적으로 더 큰 부담이 될 수 있어 역진성이 논의돼요."],
    },
    "거래정보저장소": {
        "whyItMatters": "장외파생상품 익스포저를 감독당국이 파악하고 시장 투명성을 높일 수 있는지 볼 때 써요. 거래가 장외에 흩어져 있어도 위험이 어디에 쌓였는지 파악하는 데 도움을 줘요.",
        "typicalSituation": "장외파생 보고 의무가 강화됐다는 문장은, 어떤 상품·참가자가 보고 대상인지와 보고 정보의 범위를 같이 봐요. 거래소에서 체결되는 상장 파생상품 시장과 같은 장소로 읽지 않아요.",
    },
    "결제완결성": {
        "easyExplanation": "결제완결성이 법적으로 보장된 지급결제시스템에서는 정해진 시점 이후 완료된 지급지시나 결제를 참가자의 파산 등을 이유로 되돌리지 못하게 해요.",
        "typicalSituation": "결제완결성이 보장된다는 문장은, 해당 시스템이 법률상 지정 대상인지와 어느 시점부터 결제가 취소 불가능해지는지를 봐요. 일반 계좌이체가 모두 같은 보호를 받는다고 읽지 않아요.",
        "keyPoints": ["단순히 화면에 ‘처리 완료’가 뜨는 것과 달라요. 파산 등 사후 상황에서도 결제를 법적으로 되돌리지 못하게 하는 보호가 핵심이에요."],
    },
    "고정금리부채권-sb": {
        "oneLiner": "발행할 때 정한 표면금리를 만기까지 고정해 지급하는 채권이에요.",
        "easyExplanation": "약속된 이자율은 고정돼 있지만 시장에서 거래되는 채권 가격과 만기수익률은 금리·신용 여건에 따라 움직여요. 전환권 같은 별도 권리가 붙지 않은 일반 채권을 스트레이트 본드라고 부르기도 해요.",
    },
    "관리통화제도": {
        "oneLiner": "화폐 가치를 금 보유량에 직접 묶지 않고, 중앙은행이 통화·신용 여건을 조절하는 화폐제도예요.",
        "easyExplanation": "금본위제처럼 발행량을 금 보유량에 직접 연동하지 않아요. 중앙은행은 기준금리·공개시장운영 등으로 금융여건에 영향을 주며 물가와 경기 안정을 추구해요.",
        "keyPoints": ["통화 공급에 금이라는 자동 제약이 없는 대신, 중앙은행의 정책 운영과 물가 안정 책임이 중요해져요."],
    },
    "구독경제": {
        "oneLiner": "정기적으로 대가를 내고 제품·서비스를 계속 이용하거나 공급받는 소비·사업 모델이에요.",
        "easyExplanation": "회비를 내고 콘텐츠·소프트웨어의 사용권을 얻는 경우도 있고, 식품·생활용품처럼 제품을 정기 배송받아 소유하게 되는 경우도 있어요. 핵심은 일회성 구매보다 반복 결제 관계가 이어진다는 점이에요.",
        "commonConfusions": ["할부는 한 번 산 물건의 대금을 나눠 내는 구조예요. 구독은 일정 기간 관계가 이어지며 반복 결제가 발생하고, 소유권 여부는 상품에 따라 달라요."],
    },
    "구인배수": {
        "oneLiner": "구인 인원을 구직 인원으로 나눠, 일하려는 사람에 비해 일자리가 얼마나 있는지 보는 지표예요.",
        "easyExplanation": "1보다 크면 구직자보다 구인 인원이 많은 쪽, 1보다 작으면 구인 인원보다 구직자가 많은 쪽으로 읽어요. 다만 어떤 구인·구직 통계를 썼는지 확인해야 해요.",
    },
    "국제수지표": {
        "whyItMatters": "일정 기간 거주자와 비거주자 사이의 거래가 상품·서비스·소득·자본·금융 중 어디에서 발생했는지 볼 때 써요. 특정 시점의 대외자산 잔액은 국제투자대조표에서 따로 봐요.",
        "typicalSituation": "경상수지가 흑자라는 문장은, 상품수지인지 서비스·본원소득·이전소득인지 나눠 봐요. 흑자를 단순히 ‘외화가 그만큼 들어왔다’고 읽지 말고, 금융계정과 함께 거래의 대응 관계를 봐요.",
    },
    "규모의경제": {
        "easyExplanation": "생산량이 늘면서 고정비가 더 많은 제품에 나뉘거나 공정 효율이 높아지면 평균비용이 낮아질 수 있어요. 다만 일정 규모를 넘으면 관리 복잡성 등으로 평균비용이 다시 높아질 수도 있어요.",
        "keyPoints": ["생산 규모가 커진다고 항상 평균비용이 내려가는 것은 아니에요. 비용 구조와 생산 구간을 같이 봐요."],
    },
    "글로벌공급망압력지수": {
        "easyExplanation": "해상·항공 운송비와 제조업의 납품 지연 같은 공급망 데이터를 묶어 산출해요. 0은 ‘문제가 없음’이 아니라 장기 평균 수준에 가까운 값이고, 양(+)의 값이 커질수록 평균보다 공급망 압력이 큰 쪽으로 읽어요.",
        "typicalSituation": "지수가 높다는 문장은, 운송비·납기 지연 가운데 무엇이 압력을 키웠는지 다른 물류 지표와 같이 봐요. 지수가 내려도 국내 재고·계약 가격 때문에 소비자가 체감하는 변화는 늦을 수 있어요.",
        "keyPoints": ["공급망 압력을 평균 대비로 보여 주는 종합지표예요. 국내 수요 과열이나 소비자물가 자체를 직접 재는 지표는 아니에요."],
    },
    "금리선물": {
        "oneLiner": "금리나 채권 가격 변동에 따른 손익을 미래 시점 기준으로 거래하는 표준화된 선물계약이에요.",
        "easyExplanation": "국채선물이나 단기금리 선물처럼 기준이 되는 채권·금리에 연동된 상품이 있어요. 금리 변동 위험을 헤지하거나 방향에 투자할 때 사용해요.",
        "whyItMatters": "현물 채권뿐 아니라 선물 가격을 통해 시장의 금리 기대와 헤지 수요를 볼 때 써요.",
    },
    "금산분리": {
        "oneLiner": "산업자본과 금융자본이 서로를 과도하게 지배하지 못하도록 결합을 제한하는 원칙이에요.",
        "easyExplanation": "우리나라에서는 특히 산업자본의 은행 지배 제한이 핵심으로 논의돼요. 특정 기업의 사금고화나 이해상충을 줄이려는 취지지만, 적용 범위와 예외는 법령에 따라 달라요.",
        "keyPoints": ["‘금산분리’라는 원칙과 실제 지분 한도·예외 규정은 구분해 봐요."],
    },
    "금융의증권화": {
        "easyExplanation": "대출 같은 기초자산을 묶어 현금흐름을 바탕으로 증권을 발행해요. 구조에 따라 자산을 별도 기구로 이전하고, 필요하면 신용보강을 붙이기도 해요.",
        "whyItMatters": "은행 장부에 있던 신용위험이 투자자에게 분산·이전될 수 있는 구조를 이해할 때 써요. 다만 발행기관이 위험을 일부 남겨 둘 수도 있어요.",
        "keyPoints": ["유동성은 높아질 수 있지만, 위험이 사라지는 것은 아니에요. 누가 어떤 위험을 최종적으로 보유하는지 봐요."],
    },
    "금융의탈중개화": {
        "oneLiner": "은행 같은 전통적 금융중개기관의 대차대조표를 덜 거치고 자금 수요자와 공급자가 더 직접 연결되는 현상이에요.",
        "easyExplanation": "P2P 대출이나 일부 디지털 금융처럼 전통적 은행 중개를 우회하는 구조가 있어요. 다만 플랫폼·거래소·프로토콜이 새로운 중개 기능을 맡을 수 있어 ‘중개자가 완전히 없다’는 뜻은 아니에요.",
        "typicalSituation": "P2P로 돈을 빌렸다는 문장은, 은행 대출을 우회했는지와 플랫폼이 심사·매칭·보관 같은 기능을 어디까지 맡는지 봐요.",
        "keyPoints": ["전통적 중개가 줄어도 신용평가·매칭·결제·규제 기능까지 사라지는 것은 아니에요."],
    },
    "금전신탁": {
        "easyExplanation": "금전을 신탁해 계약에서 정한 방식으로 운용하고, 그 실적을 수익자에게 귀속시키는 상품이에요. 특정금전신탁처럼 운용 방법을 지정하는 형태도 있어요. 원금 보장 여부와 예금자보호 적용 여부는 상품 구조를 따로 확인해야 해요.",
        "typicalSituation": "금전신탁 수익률이 예금보다 높다는 문장은, 운용자산·수수료·원금 보장 여부·예금자보호 대상인지부터 확인해요. ‘은행에서 판다’는 이유만으로 예금과 같은 상품으로 읽지 않아요.",
        "keyPoints": ["예금과 신탁은 법적 구조와 손익 귀속 방식이 달라요. 예금이 모두 확정금리인 것도, 신탁이 모두 같은 위험을 가진 것도 아니에요."],
        "commonConfusions": ["은행 예금과 달라요. 금전신탁은 신탁재산의 운용 결과와 계약 조건에 따라 수익·손실 구조가 달라질 수 있어요."],
    },
    "간편송금": {
        "easyExplanation": "앱이나 온라인에서 복잡한 인증 절차를 줄여 비밀번호·생체인증 등으로 송금하는 서비스예요. 실제 자금 이동 경로와 인증 방식은 서비스마다 달라요.",
    },
    "교환사채-eb": {
        "oneLiner": "사채권자가 원하면 발행회사가 보유한 주식 등 유가증권과 바꿀 수 있는 권리가 붙은 사채예요.",
    },
    "가상자산공개-ico": {
        "typicalSituation": "ICO로 자금을 모았다는 문장은, 토큰이 어떤 권리인지와 발행·유통 규제가 어떻게 적용되는지를 같이 봐요. 국내 규율은 법·제도가 정한 시점과 범위를 공식 자료로 확인하고, 상장 주식 공모와 같은 보호가 있다고 단정하지 않아요.",
    },
    "국민연금": {
        "typicalSituation": "국민연금 제도 변화가 나왔다는 문장은, 보험료율·수급 연령·급여 수준 중 무엇이 바뀌는지와 시행 시점을 공식 안내로 확인해요. 한 시점 기금 전망을 확정 사실처럼 읽지 않아요.",
    },
}


def apply_copy(drafts: dict) -> int:
    n = 0
    missing = [k for k in COPY_PATCHES if k not in drafts]
    if missing:
        raise SystemExit(f"unknown copy ids: {missing}")
    for sid, patch in COPY_PATCHES.items():
        cur = drafts[sid]
        for field, val in patch.items():
            if field == "commonConfusions" and val == []:
                cur.pop("commonConfusions", None)
            else:
                cur[field] = val
        drafts[sid] = cur
        n += 1
    return n


def apply_taxonomy(terms: list[dict]) -> int:
    overrides = json.loads(TAX.read_text(encoding="utf-8"))
    n = 0
    by_id = {t["id"]: t for t in terms}
    missing = [k for k in overrides if k not in by_id]
    if missing:
        raise SystemExit(f"unknown taxonomy ids: {missing}")
    for tid, cat in overrides.items():
        if by_id[tid].get("category") != cat:
            by_id[tid]["category"] = cat
            n += 1
    return n


def write_session(existing: dict, batch: dict) -> None:
    order = list(existing.keys())
    for sid in batch:
        if sid not in existing:
            order.append(sid)
            existing[sid] = batch[sid]
        else:
            existing[sid] = {**existing[sid], **batch[sid]}
    parts = [HEADER]
    for sid in order:
        parts.append(dump_entry(sid, existing[sid]))
        parts.append("")
    text = "\n".join(parts).rstrip() + "\n};\n"
    SESSION_TS.write_text(text, encoding="utf-8")


def main() -> None:
    payload = json.loads(TERMS.read_text(encoding="utf-8"))
    before = nearby_intrusions(payload["terms"])
    slice_stats = clean_definitions(payload["terms"])
    tax_n = apply_taxonomy(payload["terms"])
    TERMS.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    left = nearby_intrusions(payload["terms"])

    drafts = json.loads(BATCH.read_text(encoding="utf-8"))
    copy_n = apply_copy(drafts)
    BATCH.write_text(json.dumps(drafts, ensure_ascii=False, indent=2), encoding="utf-8")

    existing = parse_session_copy(SESSION_TS.read_text(encoding="utf-8"))
    write_session(existing, drafts)

    print("intrusions_before", len(before))
    print("slice", slice_stats)
    print("intrusions_after", len(left))
    print("taxonomy_changed", tax_n)
    print("copy_patched", copy_n)
    print("session_keys", len(parse_session_copy(SESSION_TS.read_text(encoding="utf-8"))))
    if left:
        print("remaining:")
        for h in left:
            print("-", h["id"], "<-", h["intruder"])


if __name__ == "__main__":
    main()
