import type { LearningBriefing, ReadingAside } from "../types";

/**
 * 기사형 읽기의 맥락 주석.
 *
 * 문장마다 붙이지 않는다. 편당 2개, 많아도 3개.
 * 이미 질문·해설이 다루는 정의는 다시 쓰지 않고, 막히는 인과·조건·숫자만 연다.
 */
type Match = { match: string; aside: ReadingAside };

export const BRIEFING_ASIDES: Record<string, Match[]> = {
  "bf-cpi-rates": [
    {
      match: "기준금리를 빠르게 내리기 어려울",
      aside: {
        kind: "condition",
        body: "같은 물가 숫자라도 고용이 급격히 약해지면 금리 판단이 달라질 수 있어요. 물가만 보고 인하가 무조건 미뤄진다고 단정하지 않아요.",
      },
    },
    {
      match: "만기가 긴 채권일수록 가격이 더 크게",
      aside: {
        kind: "why",
        body: "먼 미래에 받을 현금일수록 금리 변화에 더 민감해요. 그 민감도를 듀레이션이라고 불러요.",
        flows: [{ title: "같은 금리 상승", steps: ["금리 상승", "듀레이션이 긴 채권", "가격 하락 폭이 더 큼"] }],
      },
    },
  ],
  "bf-earnings-down": [
    {
      match: "기대에 못 미치면 실망 매물이",
      aside: {
        kind: "why",
        body: "주가는 이미 ‘앞으로 이만큼 벌 것’이라는 기대를 담고 있어요. 그래서 지난 분기 실적이 좋아져도, 기대보다 못하면 당일 가격이 내릴 수 있어요.",
      },
    },
    {
      match: "같은 이익에도 주가수익비율이 낮아질",
      aside: {
        kind: "condition",
        body: "금리가 다시 낮아지면 같은 이익에도 배수가 높아질 수 있어요. 실적 한 줄과 금리 환경을 같이 봐요.",
      },
    },
  ],
  "bf-yoy-ytd": [
    {
      match: "전년 동월 대비와 연초 누적은 비교 기간이 다릅니다",
      aside: {
        kind: "number",
        body: "한 달 +45%는 ‘이번 달 vs 작년 같은 달’이고, 누적 +18%는 ‘올해 1월부터 지금까지 vs 작년 같은 기간’이에요. 기간이 다르면 속도가 달라 보이는 게 정상이에요.",
      },
    },
    {
      match: "작년 같은 기간이 유난히 나빴는지",
      aside: {
        kind: "why",
        body: "작년이 유난히 나빴으면 올해 비율이 커 보여요. 그래서 비율만 보지 않고 절대 금액도 같이 확인해요.",
      },
    },
  ],
  "bf-fx-export": [
    {
      match: "환산액이 늘었다고 실적이 좋아진 것은 아니",
      aside: {
        kind: "why",
        body: "달러 매출이 그대로여도 원화가 약해지면 원화 환산액은 커져요. 외화 표시 경쟁력이 나아진 것과는 다른 이야기예요.",
      },
    },
    {
      match: "원화가 강해지는 평가절상 때와는 반대",
      aside: {
        kind: "condition",
        body: "원화가 강해지면 수출 환산액은 줄고 수입 비용은 낮아지는 반대 방향으로 읽어요.",
      },
    },
  ],
  "bf-jobs": [
    {
      match: "구직을 포기한 사람을 빼기",
      aside: {
        kind: "why",
        body: "실업률은 구직자만 분모에 넣어요. 구직을 포기하면 실업률이 낮아 보여도 일자리 사정은 나쁠 수 있어요. 그래서 고용률을 같이 봐요.",
      },
    },
    {
      match: "고용이 약해도 임금과 물가가 단단하면",
      aside: {
        kind: "condition",
        body: "고용은 약한데 물가가 안 꺾이면 중앙은행이 금리를 쉽게 내리지 않을 수 있어요. 고용 한 줄만으로 인하를 단정하지 않아요.",
      },
    },
  ],
  "bf-capex": [
    {
      match: "영업이익은 바로 늘지 않았습니다",
      aside: {
        kind: "why",
        body: "공장·장비를 사는 현금은 당장 나가요. 매출과 이익은 설비가 돌아가기 시작해야 붙어요.",
        flows: [{ title: "투자 시점", steps: ["현금 지출", "설비 가동", "매출·이익"] }],
      },
    },
    {
      match: "설비만 늘고 가동이 낮으면",
      aside: {
        kind: "condition",
        body: "수요가 안 따라오면 감가상각만 커져 이익을 깎을 수 있어요. 설비 증가와 가동률을 같이 봐요.",
      },
    },
  ],
  "bf-gdp-retail": [
    {
      match: "성장률 한 줄만 보면 그 구성이 가려집니다",
      aside: {
        kind: "why",
        body: "국내총생산은 소비·투자·수출을 합친 숫자예요. 수출이 끌면 성장률은 괜찮은데 가계 체감은 약할 수 있어요.",
      },
    },
    {
      match: "소비·투자·수출이 성장에 얼마나 기여했는지",
      aside: {
        kind: "next",
        body: "소비 기여도, 설비투자, 순수출을 나눠 보면 누가 성장을 끌었는지 보여요.",
      },
    },
  ],
  "bf-shareholder": [
    {
      match: "가이던스에 가깝습니다",
      aside: {
        kind: "why",
        body: "발표는 ‘앞으로 하겠다’는 계획이에요. 배당·자사주가 실제로 집행된 뒤에야 환원이 확인돼요.",
      },
    },
    {
      match: "같은 환원 규모를 오래 유지하기 어려울",
      aside: {
        kind: "condition",
        body: "이익과 현금흐름이 줄면 같은 배당·자사주를 오래 유지하기 어려워요. 발표 규모와 실제 집행을 같이 봐요.",
      },
    },
  ],
  "bf-bond-rates": [
    {
      match: "만기가 긴 채권일수록 같은 금리 움직임에도 가격 낙폭이 컸습니다",
      aside: {
        kind: "why",
        body: "만기가 길수록 금리에 더 민감해요. 같은 폭으로 금리가 올라도 장기채 가격이 더 크게 내려요.",
      },
    },
    {
      match: "기업 신용에 대해 시장이 요구하는 가산 폭",
      aside: {
        kind: "why",
        body: "국채 금리는 거의 그대로인데 회사채만 더 올랐다면, 기업 신용에 붙는 가산 금리가 벌어진 것으로 읽어요.",
      },
    },
  ],
  "bf-supply-price": [
    {
      match: "전가되는 폭은 업종과 재고에 따라 다릅니다",
      aside: {
        kind: "example",
        body: "원재료 가격이 올라도 기업마다 소비자 가격에 반영되는 속도는 달라요.",
        flows: [
          {
            title: "재고가 적고 가격을 올리기 쉬운 경우",
            steps: ["원재료 가격 ↑", "원가 부담 ↑", "판매가격 ↑"],
          },
          {
            title: "재고가 많거나 가격 경쟁이 심한 경우",
            steps: ["원재료 가격 ↑", "기업이 비용 일부 흡수", "이익률 ↓"],
          },
        ],
        takeaway: "그래서 원재료 가격만 보지 않고 재고 수준과 가격 결정력도 함께 봐요.",
      },
    },
    {
      match: "금리만 내려서 해결된다고 보기 어렵습니다",
      aside: {
        kind: "condition",
        body: "수요가 약한 물가는 금리 인하만으로 안 풀릴 수 있어요. 공급 제약이 남아 있는지를 같이 봐요.",
      },
    },
  ],
  "bf-credit-spread": [
    {
      match: "기업이 실제로 발행하는 금리는 올랐고",
      aside: {
        kind: "why",
        body: "기업이 내는 이자는 기준이 되는 금리에 신용 가산을 더한 값이에요. 기준이 내려도 가산이 더 벌어지면 실제 조달 비용은 늘 수 있어요.",
      },
    },
    {
      match: "모든 기업의 신용이 나빠진 것은 아닙니다",
      aside: {
        kind: "condition",
        body: "특정 업종·등급의 수급만 꼬여도 스프레드가 움직일 수 있어요. 전체 신용이 나빠진 것과는 구분이 필요해요.",
      },
    },
  ],
  "bf-nominal-price": [
    {
      match: "체감 부담이 얼마나 줄었는지를 두고",
      aside: {
        kind: "why",
        body: "화면에 찍힌 금리가 내려도 물가가 그만큼 안 꺾이면, 돈의 실질 부담은 덜 줄어요.",
      },
    },
    {
      match: "인플레이션이 얼마나 낮아졌는지도 같이",
      aside: {
        kind: "number",
        body: "명목금리에서 물가 상승률을 빼 보면 실질 금리에 가깝게 읽을 수 있어요. 한쪽만 보면 착시가 나요.",
      },
    },
  ],
  "bf-dsr-home": [
    {
      match: "이미 받은 모기지대출의 원리금은 바로 줄지 않았습니다",
      aside: {
        kind: "why",
        body: "집값은 담보 가치에 바로 닿아요. 이미 받은 대출의 매달 원리금은 계약 조건이 바뀌지 않으면 그대로예요.",
      },
    },
    {
      match: "변동금리인지, 만기를 늘렸는지",
      aside: {
        kind: "condition",
        body: "변동금리이거나 만기를 늘렸거나 소득이 같이 움직이면 원리금 부담은 달라질 수 있어요. 집값 한 줄만으로 단정하지 않아요.",
      },
    },
  ],
  "bf-yield-curve": [
    {
      match: "인하 기대는 짧은 만기에 먼저 반영됐습니다",
      aside: {
        kind: "why",
        body: "정책금리 기대는 짧은 만기에 더 빨리 붙어요. 긴 만기에는 물가와 성장 전망이 더 많이 남아요.",
      },
    },
    {
      match: "곡선이 평평해졌다고 경기가 바로 꺾인 것은 아닙니다",
      aside: {
        kind: "condition",
        body: "수급이나 해외 금리만으로도 장기물이 안 내릴 수 있어요. 한 번의 기울기만으로 경기 전환을 단정하지 않아요.",
      },
    },
  ],
  "bf-per-pbr": [
    {
      match: "같은 주가가 이익 대비로는 비싸 보이기 시작했습니다",
      aside: {
        kind: "why",
        body: "주가수익비율은 주가를 이익으로 나눈 배수예요. 이익이 줄면 주가가 그대로여도 배수가 올라가요.",
      },
    },
    {
      match: "PBR과 ROE를 같이 봐야",
      aside: {
        kind: "next",
        body: "자산 대비 배수와 수익성을 같이 봐야, 지금 비싼 게 이익 부진 때문인지 자산 대비 기대 때문인지 갈려요.",
      },
    },
  ],
  "bf-rate-fx": [
    {
      match: "원화가 약해지면 수입 물가 부담이 커질 수 있습니다",
      aside: {
        kind: "why",
        body: "수입 비용이 오르면 국내 물가가 조금 낮아진 효과를 상쇄할 수 있어요.",
      },
    },
    {
      match: "환율이 급하면 중앙은행이 금리를 빠르게 내리기 어렵",
      aside: {
        kind: "condition",
        body: "자본 유출이나 수입 물가 부담이 커지면, 물가가 둔해져도 인하 속도가 느려질 수 있어요.",
      },
    },
  ],
};

export function withReadingAsides(briefing: LearningBriefing): LearningBriefing {
  const notes = BRIEFING_ASIDES[briefing.id];
  if (!notes?.length) return briefing;
  let used = 0;
  const blocks = briefing.blocks.map((block) => {
    if (block.type !== "p" || used >= 3) return block;
    const hit = notes.find((n) => !block.aside && block.text.includes(n.match));
    if (!hit) return block;
    used += 1;
    return { ...block, aside: hit.aside };
  });
  return { ...briefing, blocks };
}
