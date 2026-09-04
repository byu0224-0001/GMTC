import type { ClaimCase } from "../types";

/** 연습용 문장. 특정 리포트 문단을 복사하지 않음. 분류명(fact 등)을 맞히게 하지 않음. */
export const CLAIM_CASES: ClaimCase[] = [
  {
    id: "cl-sales-vs-thesis",
    title: "판매는 줄었는데, 파업 탓이라고 단정할 수 있을까요?",
    asOf: "2026-08",
    situation:
      "한 완성차 업체의 지난달 판매가 전년 같은 달보다 14.2% 줄었다는 집계가 나왔습니다. 한 리포트는 파업에 따른 생산 중단이 주원인이었을 것으로 봤습니다.",
    question: "지금 확인된 사실은?",
    choices: [
      { id: "fact", label: "지난달 판매가 전년보다 줄었다는 집계" },
      { id: "analyst_thesis", label: "파업이 감소의 주원인이었을 것이라는 판단" },
      { id: "company_guidance", label: "회사가 내년 판매 목표를 발표한 것" },
      { id: "valuation_opinion", label: "지금 주가가 저평가돼 있다는 의견" },
    ],
    answerType: "fact",
    why: "판매 증감은 집계에 가깝고, ‘왜 줄었나’는 아직 해석입니다. 둘을 한 문장으로 사실처럼 묶지 않습니다.",
    nextToCheck: ["공장 가동일수", "재고", "다음 달 판매"],
  },
  {
    id: "cl-guidance-vs-estimate",
    title: "회사가 모델을 늘리겠다고 했습니다. 내년 수익이 좋아질까요?",
    asOf: "2026-09",
    situation:
      "회사가 내년부터 하이브리드 모델을 더 늘리겠다고 밝혔습니다. 한 증권사 리포트는 이 변화가 내년 평균판매단가(ASP)를 높이는 데 도움이 될 것으로 예상했습니다.",
    question: "지금 확인된 사실은?",
    choices: [
      { id: "company_guidance", label: "회사가 하이브리드 모델 확대 계획을 발표했다" },
      { id: "analyst_estimate", label: "내년 평균판매단가가 실제로 오른다" },
      { id: "analyst_thesis", label: "내년 수익성이 개선된다" },
      { id: "valuation_opinion", label: "현재 주가가 저평가돼 있다" },
    ],
    answerType: "company_guidance",
    why: "모델 확대는 회사가 밝힌 계획입니다. 평균판매단가와 수익성이 실제로 좋아질지는 아직 전망입니다.",
    nextToCheck: ["하이브리드 판매 비중", "평균판매단가(ASP)", "영업이익률"],
  },
  {
    id: "cl-buy-target",
    title: "지난 실적과 목표주가를 같은 사실로 읽어도 될까요?",
    asOf: "2026-09",
    situation:
      "리포트 표지에 매수와 목표주가가 적혀 있고, 본문에는 지난 분기 영업이익 숫자가 나옵니다.",
    question: "아직 전망·의견에 가까운 것은?",
    choices: [
      { id: "valuation_opinion", label: "매수 의견과 목표주가" },
      { id: "fact", label: "지난 분기 영업이익 공시 숫자" },
      { id: "company_guidance", label: "이미 공시된 작년 배당액" },
      { id: "analyst_thesis", label: "거래소에 나온 전일 종가" },
    ],
    answerType: "valuation_opinion",
    why: "지난 실적 숫자는 공시로 확인된 사실입니다. 목표주가와 매수는 앞으로의 가정에 기댄 투자 의견입니다.",
    nextToCheck: ["이익 추정치 변화", "가정(환율·물량)", "컨센서스와의 차이"],
  },
];
