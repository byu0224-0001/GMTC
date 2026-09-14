import type { BriefingBlock, LearningBriefing } from "../types";

export const FIGURE_NOTE = "※ 이해를 돕기 위해 구성한 예시 수치입니다.";
const N = FIGURE_NOTE;

/** 글마다 JSX를 두지 않는다. 값이 있는 글에만 도표를 붙인다.
 * 질문 전에는 수치·비교만 두고, 해석 흐름은 `revealAfterAnswer`로 정답 뒤에 연다.
 */
export const BRIEFING_FIGURES: Record<string, BriefingBlock[]> = {
  "bf-cpi-rates": [
    {
      type: "metric",
      items: [
        { label: "시장 예상", value: "2.6%" },
        { label: "실제 물가", value: "3.1%" },
      ],
      note: N,
    },
    {
      type: "flow",
      steps: ["물가 예상 상회", "인하 기대 약화", "장기금리 상승"],
      revealAfterAnswer: true,
    },
  ],
  "bf-earnings-down": [
    {
      type: "compare",
      rows: [
        { label: "영업이익", value: 18, display: "+18%" },
        { label: "시장 예상", value: 24, display: "+24%" },
        { label: "당일 주가", value: -3, display: "−3%" },
      ],
      note: N,
    },
  ],
  "bf-yoy-ytd": [
    {
      type: "compare",
      rows: [
        { label: "이번 달 YoY", value: 45, display: "+45%" },
        { label: "연초 누적 YTD", value: 18, display: "+18%" },
      ],
      note: N,
    },
  ],
  "bf-jobs": [
    {
      type: "metric",
      items: [
        { label: "실업률", value: "3.8% → 4.2%" },
      ],
      note: N,
    },
    {
      type: "flow",
      steps: ["고용 약화", "인하 기대 확대", "시장금리 하락"],
      revealAfterAnswer: true,
    },
  ],
  "bf-capex": [
    {
      type: "flow",
      steps: ["자본적지출", "생산능력", "가동률", "이익"],
      revealAfterAnswer: true,
    },
  ],
  "bf-gdp-retail": [
    {
      type: "compare",
      rows: [
        { label: "GDP 성장", value: 2.4, display: "+0.6%p" },
        { label: "소매판매", value: 0.4, display: "+0.1%" },
      ],
      note: N,
    },
  ],
  "bf-bond-rates": [
    {
      type: "compare",
      rows: [
        { label: "3년물 가격", value: 11, display: "−1.1%" },
        { label: "10년물 가격", value: 38, display: "−3.8%" },
      ],
      note: N,
    },
    {
      type: "flow",
      steps: ["만기 ↑", "금리 민감도 ↑", "가격 변동 폭 ↑"],
      revealAfterAnswer: true,
    },
  ],
  "bf-credit-spread": [
    {
      type: "compare",
      rows: [
        { label: "국채 금리", value: 15, display: "−0.15%p" },
        { label: "회사채 금리", value: 20, display: "+0.20%p" },
      ],
      note: N,
    },
  ],
  "bf-nominal-price": [
    {
      type: "metric",
      items: [
        { label: "명목금리", value: "3.5% → 3.0%" },
        { label: "물가", value: "2.8%" },
      ],
      note: N,
    },
  ],
  "bf-dsr-home": [
    {
      type: "compare",
      rows: [
        { label: "집값", value: 8, display: "−8%" },
        { label: "DSR", value: 1, display: "거의 그대로" },
      ],
      note: N,
    },
  ],
  "bf-yield-curve": [
    {
      type: "compare",
      rows: [
        { label: "단기 금리", value: 25, display: "−0.25%p" },
        { label: "장기 금리", value: 2, display: "거의 그대로" },
      ],
      note: N,
    },
  ],
  "bf-per-pbr": [
    {
      type: "compare",
      rows: [
        { label: "PER", value: 22, display: "18 → 22배" },
        { label: "이익", value: 12, display: "−12%" },
      ],
      note: N,
    },
  ],
  "bf-rate-fx": [
    { type: "flow", steps: ["원화 약세", "수입 물가 부담", "인하 제약"], revealAfterAnswer: true },
  ],
  "bf-fx-export": [
    { type: "flow", steps: ["원화 약세", "수출 환산액 ↑", "수입 비용 ↑"], revealAfterAnswer: true },
  ],
  "bf-supply-price": [
    { type: "flow", steps: ["공급 제약", "생산자 가격", "소비자 물가"], revealAfterAnswer: true },
  ],
  "bf-shareholder": [
    { type: "flow", steps: ["환원 발표", "실제 집행", "이익·현금흐름"], revealAfterAnswer: true },
  ],
};

export function withReadingFigures(briefing: LearningBriefing): LearningBriefing {
  const extra = BRIEFING_FIGURES[briefing.id];
  if (!extra?.length) return briefing;
  const blocks = [...briefing.blocks];
  const i = blocks.findIndex((b) => b.type === "p");
  blocks.splice(i >= 0 ? i + 1 : 0, 0, ...extra);
  return { ...briefing, blocks };
}
