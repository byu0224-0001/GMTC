/** 학습 탭의 작은 개념 지도. 용어 목록이 아니라 관계 묶음. 강의가 아님. */
export interface LearningMapStep {
  termId: string;
  point: string;
}

export interface LearningMap {
  id: string;
  group: "물가·금리" | "기업·숫자";
  kicker: string;
  title: string;
  minutes: number;
  steps: LearningMapStep[];
  connect: string[];
  readingId: string;
}

export const LEARNING_MAPS: LearningMap[] = [
  {
    id: "map-prices",
    group: "물가·금리",
    kicker: "물가",
    title: "물가를 읽는 법",
    minutes: 4,
    steps: [
      { termId: "소비자물가지수-cpi", point: "소비자가 실제로 지출하는 상품·서비스 가격이 얼마나 변했는지 봐요." },
      { termId: "근원인플레이션율", point: "변동성이 큰 항목을 빼고, 일시적 충격인지 흐름인지 가려요." },
      { termId: "기대인플레이션", point: "앞으로 물가가 얼마나 오를 것으로 보는지도 같이 봐요." },
      { termId: "기준금리", point: "물가 상승세가 쉽게 낮아지지 않으면 기준금리를 빠르게 내리기 어려워요." },
    ],
    connect: ["물가 상승", "금리 인하 기대 약화", "시장금리 상승", "채권·주식 가격 부담"],
    readingId: "bf-cpi-rates",
  },
  {
    id: "map-bonds",
    group: "물가·금리",
    kicker: "금리·채권",
    title: "금리가 오르면 채권 가격은 왜 내릴까",
    minutes: 5,
    steps: [
      { termId: "기준금리", point: "중앙은행의 정책금리가 다른 시장금리에 영향을 줘요." },
      { termId: "만기수익률", point: "이미 나온 채권은 가격이 내려가야 새 시장금리와 비슷한 수익률을 제공해요." },
      { termId: "국채", point: "정부가 발행하는 채권의 금리는 다른 금리의 기준점이 돼요." },
      { termId: "듀레이션", point: "같은 금리 변화에도 만기가 긴 채권의 가격이 더 크게 움직여요." },
    ],
    connect: ["기준금리", "시장금리", "채권 가격", "만기수익률", "듀레이션"],
    readingId: "bf-bond-rates",
  },
  {
    id: "map-jobs",
    group: "물가·금리",
    kicker: "고용",
    title: "실업률이 오르면 금리 기대는 어떻게 달라질까",
    minutes: 3,
    steps: [
      { termId: "실업률", point: "일하려는 사람 가운데 일자리를 못 구한 비율이에요." },
      { termId: "고용률", point: "구직을 포기한 사람은 실업률에서 빠질 수 있어 같이 봐요." },
      { termId: "기준금리", point: "경기와 물가 압력이 함께 낮아질 것으로 보면 인하 기대가 커질 수 있어요." },
    ],
    connect: ["고용 둔화", "성장·물가 압력", "금리 인하 기대", "시장금리"],
    readingId: "bf-jobs",
  },
  {
    id: "map-supply",
    group: "물가·금리",
    kicker: "공급",
    title: "공급이 줄면 물가는 왜 오를까",
    minutes: 4,
    steps: [
      { termId: "생산자물가지수-ppi", point: "생산 단계의 가격 변화를 먼저 보여 줘요." },
      { termId: "인플레이션", point: "비용 상승이 소비자 가격에 전가되면 물가 상승 압력으로 이어질 수 있어요." },
      { termId: "스태그플레이션", point: "경기 둔화와 물가 상승이 동시에 나타날 수도 있어요." },
    ],
    connect: ["공급 제약", "생산자 가격", "소비자 물가", "성장"],
    readingId: "bf-supply-price",
  },
  {
    id: "map-earnings",
    group: "기업·숫자",
    kicker: "실적",
    title: "실적이 좋아졌는데 주가는 왜 내릴까",
    minutes: 4,
    steps: [
      { termId: "주당순이익-eps", point: "지난 분기 이익은 확인된 숫자예요." },
      { termId: "rpt-consensus", point: "그 숫자가 시장이 기대한 수준에 못 미치면 주가는 내릴 수 있어요." },
      { termId: "주가수익비율-per", point: "금리가 오르면 같은 이익에도 받아들여지는 배수 수준이 낮아질 수 있어요." },
    ],
    connect: ["공시된 실적", "시장 기대와의 차이", "금리·배수", "주가"],
    readingId: "bf-earnings-down",
  },
  {
    id: "map-yoy",
    group: "기업·숫자",
    kicker: "숫자 읽기",
    title: "한 달 증가율과 올해 누적이 다른 이유",
    minutes: 3,
    steps: [
      { termId: "rpt-yoy", point: "특정 기간을 전년 같은 기간과 비교해요." },
      { termId: "rpt-ytd", point: "연초부터 현재까지의 누적을 전년 같은 기간과 비교해요." },
      { termId: "rpt-base", point: "작년 같은 기간이 유난히 좋거나 나빴으면 비율이 크게 보일 수 있어요." },
    ],
    connect: ["한 달 실적", "YoY", "YTD", "기저효과"],
    readingId: "bf-yoy-ytd",
  },
  {
    id: "map-capex",
    group: "기업·숫자",
    kicker: "투자·생산",
    title: "설비투자를 늘리면 실적이 바로 좋아질까",
    minutes: 4,
    steps: [
      { termId: "자본적지출", point: "공장·장비에 쓰는 돈은 먼저 현금이 나가요." },
      { termId: "rpt-capa", point: "그다음 생산할 수 있는 양이 얼마나 늘었는지 봐요." },
      { termId: "rpt-util", point: "늘어난 능력이 실제로 돌아가고 있는지는 가동률로 확인해요." },
    ],
    connect: ["CAPEX", "생산능력", "가동률", "실적"],
    readingId: "bf-capex",
  },
  {
    id: "map-gdp",
    group: "기업·숫자",
    kicker: "경기",
    title: "성장률은 좋아졌는데 체감은 왜 다를까",
    minutes: 4,
    steps: [
      { termId: "국내총생산-gdp", point: "한 나라 안에서 생산된 재화와 서비스의 가치를 합한 지표예요." },
      { termId: "경제성장률", point: "그 합이 이전보다 얼마나 늘었는지를 비율로 봐요." },
      { termId: "소매판매", point: "가계 소비가 같이 늘었는지는 따로 확인해야 해요." },
    ],
    connect: ["생산", "GDP", "소비·투자·수출", "체감 경기"],
    readingId: "bf-gdp-retail",
  },
  {
    id: "map-return",
    group: "기업·숫자",
    kicker: "주주환원",
    title: "배당 확대 발표만으로 환원이 늘었을까",
    minutes: 3,
    steps: [
      { termId: "주주환원정책", point: "배당·자사주 계획은 아직 발표일 수 있어요." },
      { termId: "rpt-guidance", point: "회사가 밝힌 계획과 실제 집행을 구분해요." },
      { termId: "주당순이익-eps", point: "이익과 현금흐름이 뒷받침돼야 같은 규모를 유지하기 쉬워요." },
    ],
    connect: ["이익", "환원 계획", "실제 배당·자사주", "지속 여부"],
    readingId: "bf-shareholder",
  },
  {
    id: "map-fx",
    group: "기업·숫자",
    kicker: "환율",
    title: "원화가 약해지면 수출 기업에 항상 유리할까",
    minutes: 3,
    steps: [
      { termId: "평가절상", point: "원화가 강해지면 수출 가격 경쟁에는 부담, 수입 비용에는 도움이 될 수 있어요." },
      { termId: "경상수지", point: "환율만 보지 않고 수출 물량과 수입 비용도 같이 봐요." },
    ],
    connect: ["환율", "수출 환산액", "수입 비용", "실적"],
    readingId: "bf-fx-export",
  },
  {
    id: "map-spread",
    group: "물가·금리",
    kicker: "신용",
    title: "국채가 내렸는데 회사채는 왜 오를까",
    minutes: 3,
    steps: [
      { termId: "국채", point: "정부가 빌리는 금리는 다른 금리의 기준점이 돼요." },
      { termId: "신용스프레드", point: "기업이 더 내는 가산 폭이 벌어지면 회사채 금리는 오를 수 있어요." },
      { termId: "회사채", point: "실제로 기업이 부담하는 조달 금리를 여기서 봐요." },
    ],
    connect: ["국채 금리", "신용스프레드", "회사채 금리", "이자 부담"],
    readingId: "bf-credit-spread",
  },
  {
    id: "map-nominal",
    group: "물가·금리",
    kicker: "명목·물가",
    title: "금리가 내렸다고 돈 값이 싸진 걸까",
    minutes: 3,
    steps: [
      { termId: "기준금리", point: "정책금리가 내리면 표시 금리도 따라 내릴 수 있어요." },
      { termId: "명목금리", point: "화면에 적히는 금리는 물가를 빼기 전의 숫자예요." },
      { termId: "인플레이션", point: "물가가 같이 낮아지지 않으면 실질 부담은 덜 줄어들 수 있어요." },
    ],
    connect: ["기준금리", "명목금리", "인플레이션", "실질 부담"],
    readingId: "bf-nominal-price",
  },
  {
    id: "map-dsr",
    group: "기업·숫자",
    kicker: "가계 대출",
    title: "집값이 내리면 원리금도 바로 줄까",
    minutes: 3,
    steps: [
      { termId: "담보인정비율-ltv", point: "집값 대비 얼마나 빌렸는지를 봐요." },
      { termId: "모기지대출", point: "이미 받은 주택담보대출의 조건은 가격과 따로 움직여요." },
      { termId: "총부채원리금상환비율-dsr", point: "소득 대비 원리금 부담은 여기서 봐요." },
    ],
    connect: ["집값", "LTV", "모기지 원리금", "DSR"],
    readingId: "bf-dsr-home",
  },
  {
    id: "map-curve",
    group: "물가·금리",
    kicker: "수익률곡선",
    title: "짧은 금리와 긴 금리가 갈라지면",
    minutes: 3,
    steps: [
      { termId: "국채", point: "만기가 다른 국채 금리가 곡선을 만들어요." },
      { termId: "수익률곡선", point: "만기별 금리를 이은 그림이에요." },
      { termId: "장단기금리차", point: "짧은 금리와 긴 금리의 간격이 줄어들면 기울기가 달라져 보여요." },
    ],
    connect: ["정책 기대", "단기 금리", "장기 금리", "장단기금리차"],
    readingId: "bf-yield-curve",
  },
  {
    id: "map-multiples",
    group: "기업·숫자",
    kicker: "배수",
    title: "PER이 높아 보일 때 무엇을 같이 볼까",
    minutes: 3,
    steps: [
      { termId: "주가수익비율-per", point: "주가를 이익으로 나눈 배수예요. 이익이 줄면 비싸 보일 수 있어요." },
      { termId: "주가순자산비율-pbr", point: "주가를 순자산으로 나눈 배수예요." },
      { termId: "자기자본이익률-roe", point: "자본이 이익을 얼마나 냈는지에 따라 같은 PBR도 다르게 읽혀요." },
    ],
    connect: ["이익 변화", "PER", "순자산·ROE", "PBR"],
    readingId: "bf-per-pbr",
  },
  {
    id: "map-rate-fx",
    group: "물가·금리",
    kicker: "환율·금리",
    title: "환율이 급하면 금리 인하가 왜 미뤄질까",
    minutes: 3,
    steps: [
      { termId: "기준환율", point: "원/달러가 빠르게 오르면 원화 약세로 읽혀요." },
      { termId: "인플레이션", point: "수입 물가 부담이 커지면 국내 물가 압력으로 이어질 수 있어요." },
      { termId: "기준금리", point: "그래서 물가가 둔해져도 인하를 서두르기 어렵다는 제약이 붙어요." },
    ],
    connect: ["원화 약세", "수입 물가", "인하 제약", "기준금리 기대"],
    readingId: "bf-rate-fx",
  },
];

export const LEARNING_MAP_GROUPS: LearningMap["group"][] = ["물가·금리", "기업·숫자"];

export function learningMapById(id: string): LearningMap | undefined {
  return LEARNING_MAPS.find((m) => m.id === id);
}

export function mapForBriefing(briefingId: string): LearningMap | undefined {
  return LEARNING_MAPS.find((m) => m.readingId === briefingId);
}
