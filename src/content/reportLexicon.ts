import type { ReportTerm, Term } from "../types";

/** 증권사 리포트에서 산업을 가리지 않고 반복되는 말. 한은 800선과 별층. 원문 인용 없음. */
export const REPORT_ESSENTIALS: ReportTerm[] = [
  {
    id: "rpt-yoy",
    headword: "전년 동기 대비",
    abbr: "YoY",
    aliases: ["yoy", "전년동기대비"],
    easyExplanation: "작년 같은 기간과 비교한 증감이에요. 8월이면 작년 8월과 비교해요.",
    whyItMatters: "작년 같은 기간과 비교한 증감이에요. 한 달이 좋아도 앞선 달이 약하면 올해 전체 평가는 달라져요.",
    reportUsage: "판매량이 전년 같은 달보다 줄었다는 식의 비교예요. 계절을 맞춰 놓고 좋아졌는지 봐요.",
    chain: ["YoY", "QoQ", "YTD", "기저효과"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-qoq",
    headword: "전분기 대비",
    abbr: "QoQ",
    aliases: ["qoq"],
    easyExplanation: "바로 직전 분기와 비교한 증감이에요.",
    whyItMatters: "바로 직전 분기와 비교한 증감이에요. 바로 직전 분기와 비교하기 때문에 계절적 요인의 영향을 받을 수 있어요.",
    reportUsage: "바로 직전 분기와 비교하기 때문에 계절적 요인의 영향을 받을 수 있어요. YoY와 방향이 다를 수 있어요.",
    chain: ["QoQ", "YoY", "가이던스"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-mom",
    headword: "전월 대비",
    abbr: "MoM",
    aliases: ["mom"],
    easyExplanation: "바로 지난달과 비교한 증감이에요.",
    whyItMatters: "바로 지난달과 비교한 증감이에요. 월별 변동이 클 수 있으므로 YoY 등 다른 비교 기준과 함께 보는 것이 좋아요.",
    reportUsage: "월별 변동이 클 수 있으므로 YoY 등 다른 비교 기준과 함께 보는 것이 좋아요.",
    chain: ["MoM", "YoY", "YTD"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-ytd",
    headword: "연초 이후 누적",
    abbr: "YTD",
    aliases: ["ytd", "연초누적"],
    easyExplanation: "올해 1월부터 현재까지의 누적 실적을 전년 같은 기간과 비교할 때 사용해요.",
    whyItMatters: "올해 1월부터 현재까지의 누적 실적을 전년 같은 기간과 비교할 때 사용해요. 한 달 성장과 올해 흐름을 구분할 때 써요.",
    reportUsage: "같은 표에 YoY와 YTD가 같이 있으면, 한 달 성장과 올해 흐름을 구분해 읽어요.",
    chain: ["한 달 YoY", "YTD", "기저효과"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-pctp",
    headword: "퍼센트포인트",
    abbr: "%p",
    aliases: ["퍼센트포인트", "pctp"],
    easyExplanation: "비율과 비율의 차이예요. 10%에서 13%면 +3%p이지, +30%가 아니에요.",
    whyItMatters: "이미 비율인 숫자끼리의 차이예요. 점유율·마진이 얼마나 변했는지를 % 증가와 섞지 않게 해 줘요.",
    reportUsage: "침투율이 3%p 올랐다는 문장을, 판매량이 3% 늘었다고 읽으면 안 돼요.",
    chain: ["%p", "점유율", "침투율", "마진"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-bp",
    headword: "베이시스포인트",
    abbr: "bp",
    aliases: ["bp", "bps"],
    easyExplanation: "금리·스프레드를 아주 잘게 나눈 단위예요. 100bp = 1%p이에요.",
    whyItMatters: "100bp는 1%p이에요. 금리나 신용스프레드의 작은 변화를 표현할 때 자주 사용해요.",
    reportUsage: "작은 숫자처럼 보여도 채권 가격·평가손익에는 충분히 큰 움직임일 수 있어요.",
    chain: ["bp", "금리", "신용스프레드"],
    relatedBokIds: ["신용스프레드", "국채"],
    freshness: "evergreen",
  },
  {
    id: "rpt-12m-fwd",
    headword: "향후 12개월 전망",
    abbr: "12M FWD",
    aliases: ["12m fwd", "forward"],
    easyExplanation: "향후 12개월의 예상 실적을 기준으로 본다는 뜻이에요. 12M FWD PER, 12M FWD EPS처럼 다른 지표와 함께 사용돼요.",
    whyItMatters: "향후 12개월의 예상 실적을 기준으로 본다는 뜻이에요. 12M FWD PER, 12M FWD EPS처럼 다른 지표와 함께 사용돼요.",
    reportUsage: "과거 PER과 전망 PER을 같은 숫자로 읽으면 비싸 보이거나 싸 보이는 느낌이 뒤바뀌어요.",
    chain: ["12M FWD", "PER", "컨센서스"],
    relatedBokIds: ["주가수익비율-per"],
    freshness: "evergreen",
  },
  {
    id: "rpt-capex",
    headword: "자본적 지출",
    abbr: "CAPEX",
    aliases: ["capex", "설비투자"],
    easyExplanation: "공장·장비·데이터센터처럼 오래 쓸 자산에 넣는 투자비예요.",
    whyItMatters: "오래 쓸 자산에 넣는 돈이에요. 지금은 현금이 나가고, 나중에 생산능력으로 돌아올 수 있어요.",
    reportUsage: "CAPEX가 늘었다고 관련 기업이 동시에 좋아지지는 않아요. 증설인지, 전환인지를 봐요.",
    chain: ["CAPEX", "CAPA", "가동률", "현금흐름"],
    relatedBokIds: ["자본적지출"],
    freshness: "evergreen",
  },
  {
    id: "rpt-capa",
    headword: "생산능력",
    abbr: "CAPA",
    aliases: ["capa", "capacity", "풀카파"],
    easyExplanation: "공장이 최대로 만들 수 있는 양이에요. Full Capa는 그 한도에 거의 닿았다는 뜻이에요.",
    whyItMatters: "공장이 최대로 만들 수 있는 양이에요. 주문이 늘어도 여기가 꽉 찼으면 당장 매출이 안 늘 수 있어요.",
    reportUsage: "주문이 생산능력을 넘어설 경우 납기가 길어지거나, 생산 여력이 있는 다른 업체로 주문이 이동할 수 있어요.",
    chain: ["수요", "CAPA", "가동률", "증설"],
    relatedBokIds: ["제조업생산능력"],
    freshness: "evergreen",
  },
  {
    id: "rpt-util",
    headword: "가동률",
    abbr: null,
    aliases: ["utilization"],
    easyExplanation: "갖고 있는 생산능력 가운데 실제로 얼마나 돌리고 있는지의 비율이에요.",
    whyItMatters: "가진 설비를 실제로 얼마나 돌리고 있는지를 보여줘요. 낮으면 고정비가 그대로 남고, 높으면 증설 압력이 생겨요.",
    reportUsage: "증설 직후에는 가동률이 떨어졌다가, 수요가 따라오면 다시 올라가는 식의 시차가 있어요.",
    chain: ["CAPA", "가동률", "고정비", "마진"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-asp",
    headword: "평균판매단가",
    abbr: "ASP",
    aliases: ["asp"],
    easyExplanation: "제품 하나당 평균적으로 받은 가격이에요.",
    whyItMatters: "제품 한 단위의 평균 판매 가격이에요. 대수가 같아도 단가가 오르면 매출이 늘 수 있어요.",
    reportUsage: "자동차·반도체 리포트에서 판매량과 짝으로 나와요. 대수만 보면 실적을 놓쳐요.",
    chain: ["판매량", "ASP", "제품 믹스", "매출"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-opm",
    headword: "영업이익률",
    abbr: "OPM",
    aliases: ["opm", "영업이익률"],
    easyExplanation: "매출액 가운데 영업이익이 차지하는 비율이에요.",
    whyItMatters: "매출에서 비용 등을 뺀 뒤 남는 비율이에요. 매출이 늘어도 믹스·환율·비용 때문에 빠질 수 있어요.",
    reportUsage: "‘수익성에 부정적’이라는 문장은 대개 이 비율 이야기를 하고 있어요.",
    chain: ["매출", "OPM", "믹스", "환율"],
    relatedBokIds: ["매출액영업이익률"],
    freshness: "evergreen",
  },
  {
    id: "rpt-mix",
    headword: "제품 믹스",
    abbr: "Mix",
    aliases: ["믹스", "product mix"],
    easyExplanation: "무엇을 얼마나 팔았는지, 제품 구성이에요. 수익성이 다른 제품이 섞여 있어요.",
    whyItMatters: "무엇을 얼마나 팔았는지의 구성이에요. 판매량이 같아도 수익성이 높은 제품의 비중이 달라지면 영업이익률이 달라질 수 있어요.",
    reportUsage: "하이브리드 비중이 줄었다는 문장은, 대수 감소와 별개로 마진 이야기로 읽어요.",
    chain: ["판매량", "믹스", "ASP", "마진"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-orders",
    headword: "수주",
    abbr: null,
    aliases: ["발주"],
    easyExplanation: "고객이 사겠다고 확정한 주문이에요. 계약된 주문이 실제 매출로 인식되기까지 시간이 걸릴 수 있어요.",
    whyItMatters: "아직 매출로 안 잡힌 수주예요. 장비·조선처럼 일감이 먼저 늘고 매출은 나중에 따라오는 업종에서 핵심이에요.",
    reportUsage: "대규모 발주가 났다고 올해 이익이 바로 뛰는 것은 아니에요. 인식 시점을 봐요.",
    chain: ["수주", "백로그", "Ramp-up", "매출"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-backlog",
    headword: "수주잔고",
    abbr: "Backlog",
    aliases: ["백로그"],
    easyExplanation: "이미 수주했지만 아직 매출로 인식되지 않은 주문의 잔액이에요.",
    whyItMatters: "이미 수주했지만 아직 매출로 인식되지 않은 주문의 잔액이에요. 앞으로 매출로 이어질 일감을 가늠할 때 봐요.",
    reportUsage: "수주는 늘었는데 잔고가 안 쌓이면, 빨리 소화했거나 취소가 있었을 수 있어요.",
    chain: ["수주", "백로그", "매출 시차"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-guidance",
    headword: "가이던스",
    abbr: "Guidance",
    aliases: ["가이던스", "전망치"],
    easyExplanation: "회사가 스스로 내놓은 실적·투자 계획이에요. 애널리스트 추정치와는 달라요.",
    whyItMatters: "회사가 앞으로의 실적 범위를 스스로 밝힌 것이에요. 시장 기대와 어긋나면 주가가 크게 움직일 수 있어요.",
    reportUsage: "‘회사가 올해 CAPEX를 늘리겠다’는 가이던스이고, ‘그래서 이익이 나빠질 것’은 추정이에요.",
    chain: ["가이던스", "컨센서스", "실적"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-consensus",
    headword: "시장 평균 추정",
    abbr: "Consensus",
    aliases: ["컨센서스", "시장기대치"],
    easyExplanation: "여러 애널리스트 전망을 모아 놓은 평균에 가까워요.",
    whyItMatters: "여러 전망을 모아 놓은 시장 평균에 가까워요. 실적이 좋다·나쁘다는 이 평균을 넘겼느냐로 갈리는 경우가 많아요.",
    reportUsage: "기대치를 상회했다는 문장은, 작년에 비해 좋아졌다는 말과 다를 수 있어요.",
    chain: ["컨센서스", "가이던스", "어닝 서프라이즈"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-ramp",
    headword: "램프업",
    abbr: "Ramp-up",
    aliases: ["ramp-up", "램프업"],
    easyExplanation: "새 생산라인이나 제품의 생산량을 목표 수준까지 단계적으로 높이는 과정이에요.",
    whyItMatters: "새 생산라인이나 제품의 생산량을 목표 수준까지 단계적으로 높이는 과정이에요. 증설이 끝나도 바로 풀가동이 아니에요.",
    reportUsage: "CAPEX 수혜를 말할 때, 이미 돌아가는 라인인지 이제 올리는 라인인지가 갈려요.",
    chain: ["증설", "Ramp-up", "가동률", "수율"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-lead",
    headword: "리드타임",
    abbr: "Lead time",
    aliases: ["납기", "리드타임"],
    easyExplanation: "주문부터 납품까지 걸리는 기간이에요.",
    whyItMatters: "주문부터 납품까지 걸리는 기간이에요. 길어지면 공급 부족이 나타나고 있는지 추가로 확인할 필요가 있어요.",
    reportUsage: "단납기에서 연간 발주로 바뀐다는 문장은, 공급이 빠듯하다는 신호로 읽히곤 해요.",
    chain: ["수요", "리드타임", "선주문", "CAPA"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-ms",
    headword: "시장점유율",
    abbr: "M/S",
    aliases: ["점유율", "ms"],
    easyExplanation: "그 시장에서 우리 제품이 차지하는 비중이에요.",
    whyItMatters: "그 시장에서 우리 제품이 차지하는 비중이에요. 시장 전체 판매량과 점유율을 함께 보면 시장 자체가 줄었는지, 해당 기업의 경쟁력이 달라졌는지를 구분하는 데 도움이 돼요.",
    reportUsage: "시장 전체 판매량과 점유율을 함께 보면 시장 자체가 줄었는지, 해당 기업의 경쟁력이 달라졌는지를 구분하는 데 도움이 돼요.",
    chain: ["시장 규모", "M/S", "판매량"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-penetration",
    headword: "침투율",
    abbr: null,
    aliases: ["침투율", "penetration"],
    easyExplanation: "전체 가운데 특정 제품(예: 전기차, 하이브리드)이 차지하는 비율이에요.",
    whyItMatters: "전체 가운데 특정 제품이 차지하는 비율이에요. 판매 대수가 줄어도 이 비율이 오르면 수요가 그쪽으로 옮긴 것일 수 있어요.",
    reportUsage: "침투율 변화는 %p로 써요. 시장 전체 성장률(YoY %)과 단위가 달라요.",
    chain: ["침투율", "%p", "믹스"],
    relatedBokIds: [],
    freshness: "semi",
  },
  {
    id: "rpt-base",
    headword: "기저효과",
    abbr: null,
    aliases: ["기저", "base effect"],
    easyExplanation: "작년 같은 기간이 유난히 좋거나 나빴기 때문에, 올해 증감률이 크게 보이는 현상이에요.",
    whyItMatters: "작년 같은 기간이 유난히 좋거나 나빴기 때문에 올해 증감률이 크게 보이는 현상이에요. 비율 옆에 절대 금액을 같이 봐요.",
    reportUsage: "YoY가 높은데 절대 금액은 평범한 경우가 있고, 그 반대도 있어요.",
    chain: ["기저효과", "YoY", "절대 금액"],
    relatedBokIds: ["기저효과"],
    freshness: "evergreen",
  },
  {
    id: "rpt-turnaround",
    headword: "턴어라운드",
    abbr: null,
    aliases: ["턴어라운드"],
    easyExplanation: "적자 확대나 실적 악화가 멈추고 개선되는 국면을 뜻해요. 적자가 줄었다고 반드시 흑자로 전환한 것은 아니에요.",
    whyItMatters: "적자 확대나 실적 악화가 멈추고 개선되는 국면을 뜻해요. 적자가 줄었다고 반드시 흑자로 전환한 것은 아니에요.",
    reportUsage: "적자가 줄었다는 문장을 흑자 전환과 같은 뜻으로 읽지 않아요.",
    chain: ["저점", "턴어라운드", "컨센서스"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-valuation",
    headword: "밸류에이션",
    abbr: null,
    aliases: ["밸류에이션", "valuation"],
    easyExplanation: "지금 가격이 이익·자산·성장에 비해 얼마나 비싸고 싼지를 가늠하는 작업이에요.",
    whyItMatters: "지금 가격이 이익·자산에 비해 얼마나 비싸고 싼지를 가늠하는 작업이에요. 같은 이익에도 배수가 바뀌면 주가가 같이 움직여요.",
    reportUsage: "PER·PBR 같은 지표를 활용하며, 향후 실적을 기준으로 할 경우 12M FWD PER처럼 표현해요. 도구가 곧 매수 신호는 아니에요.",
    chain: ["실적", "밸류에이션", "PER", "할인·프리미엄"],
    relatedBokIds: ["주가수익비율-per", "주가순자산비율-pbr"],
    freshness: "evergreen",
  },
  {
    id: "rpt-premium",
    headword: "프리미엄",
    abbr: null,
    aliases: ["프리미엄"],
    easyExplanation: "비슷한 회사들보다 비싸게 평가받는 상태예요.",
    whyItMatters: "비슷한 기업보다 배수를 높게 받는 상태예요. 성장·브랜드를 이유로 붙기도 하고, 기대가 지나치면 나중에 빠지기도 해요.",
    reportUsage: "‘프리미엄이 정당하냐’는 실적 숫자와 다른 논쟁이에요.",
    chain: ["밸류에이션", "프리미엄", "컨센서스"],
    relatedBokIds: [],
    freshness: "evergreen",
  },
  {
    id: "rpt-discount",
    headword: "할인",
    abbr: null,
    aliases: ["디스카운트", "코리아 디스카운트"],
    easyExplanation: "비슷한 회사들보다 싸게 평가받는 상태예요.",
    whyItMatters: "비슷한 기업보다 배수를 낮게 받는 상태예요. 지배구조·환원 부족 같은 이유가 붙는 문장이 자주 나와요.",
    reportUsage: "할인이 줄면 실적이 그대로여도 주가가 오를 수 있어요. 반대도 있어요.",
    chain: ["할인", "밸류에이션", "주주환원"],
    relatedBokIds: ["주주환원정책"],
    freshness: "semi",
  },
  {
    id: "rpt-tp",
    headword: "목표주가",
    abbr: "TP",
    aliases: ["목표가", "target price"],
    easyExplanation: "애널리스트가 ‘이 정도면 적정하다’고 제시한 가격이에요. 확정 시세가 아니에요.",
    whyItMatters: "애널리스트가 제시하는 목표 가격이에요. 추정과 의견이 섞인 결과라, 확정 가치가 아니에요.",
    reportUsage: "목표주가와 현재주가의 차이가 상승여력(Upside)이에요. 사실 확인이 아니에요.",
    chain: ["EPS", "PER", "목표주가", "투자의견"],
    relatedBokIds: ["주당순이익-eps"],
    freshness: "dated",
  },
  {
    id: "rpt-upside",
    headword: "상승여력",
    abbr: "Upside",
    aliases: ["업사이드"],
    easyExplanation: "현재 주가 대비 목표주가가 얼마나 위에 있는지를 비율로 본 값이에요.",
    whyItMatters: "현재 가격 대비 목표 가격이 얼마나 위에 있는지를 본 비율이에요. 가정이 바뀌면 같이 사라져요.",
    reportUsage: "목표주가를 올린 이유(이익 추정인지, 배수인지)를 같이 봐야 해요.",
    chain: ["현재주가", "목표주가", "Upside"],
    relatedBokIds: [],
    freshness: "dated",
  },
  {
    id: "rpt-ow",
    headword: "비중확대",
    abbr: "Overweight",
    aliases: ["오버웨이트", "overweight"],
    easyExplanation: "해당 업종이나 종목의 비중을 비교 기준보다 높게 가져가라는 증권사의 투자의견이에요.",
    whyItMatters: "해당 업종이나 종목의 비중을 비교 기준보다 높게 가져가라는 증권사의 투자의견이에요. 무조건 사라는 확정이 아니에요.",
    reportUsage: "업종 리포트 표지에 자주 붙어요. 실적 표와 같은 무게로 읽지 않아요.",
    chain: ["투자의견", "Overweight", "Top Pick"],
    relatedBokIds: [],
    freshness: "dated",
  },
  {
    id: "rpt-toppick",
    headword: "최선호주",
    abbr: "Top Pick",
    aliases: ["탑픽"],
    easyExplanation: "해당 리포트에서 가장 선호하는 종목으로 제시한 종목이에요.",
    whyItMatters: "해당 리포트에서 가장 선호하는 종목으로 제시한 종목이에요. 확정 매수가 아니라 상대 의견이에요.",
    reportUsage: "왜 그 종목인지(실적, 밸류에이션, 모멘텀)가 본문에 있어요. 이름만 보지 않아요.",
    chain: ["Top Pick", "투자의견", "목표주가"],
    relatedBokIds: [],
    freshness: "dated",
  },
];

export function reportTermById(id: string): ReportTerm | undefined {
  return REPORT_ESSENTIALS.find((t) => t.id === id);
}

export const REPORT_GROUPS: { id: string; label: string; ids: string[] }[] = [
  { id: "num", label: "숫자 읽기", ids: ["rpt-yoy", "rpt-qoq", "rpt-mom", "rpt-ytd", "rpt-pctp", "rpt-bp", "rpt-base"] },
  { id: "ops", label: "실적·생산", ids: ["rpt-capex", "rpt-capa", "rpt-util", "rpt-asp", "rpt-opm", "rpt-mix", "rpt-orders", "rpt-backlog", "rpt-ramp", "rpt-lead"] },
  { id: "mkt", label: "시장 이해", ids: ["rpt-ms", "rpt-penetration", "rpt-turnaround"] },
  { id: "val", label: "투자 판단", ids: ["rpt-guidance", "rpt-consensus", "rpt-12m-fwd", "rpt-valuation", "rpt-premium", "rpt-discount", "rpt-tp", "rpt-upside", "rpt-ow", "rpt-toppick"] },
];

/**
 * 같은 개념이 한은 800선과 리포트 표현에 둘 다 있는 경우.
 * 사전 ‘전체’에서는 한은 항목 하나로 묶고, 리포트 id는 브리핑·퀴즈 호환용으로 남긴다.
 * 전기자동차/EV처럼 이름만 다른 쌍. 제조업생산능력 vs 생산능력(CAPA)은 범위가 달라 묶지 않는다.
 */
export const REPORT_BOK_CANON: Record<string, string> = {
  "rpt-base": "기저효과",
  "rpt-capex": "자본적지출",
  "rpt-opm": "매출액영업이익률",
};

export function canonBokId(id: string): string {
  return REPORT_BOK_CANON[id] ?? id;
}

export function reportIdForBok(bokId: string): string | undefined {
  return (Object.entries(REPORT_BOK_CANON) as Array<[string, string]>).find(([, id]) => id === bokId)?.[0];
}

function compactLabel(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[\s·ㆍ\-_/()]/g, "");
}

function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const k = compactLabel(v);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/** 한은 항목에 리포트 쪽 약어·쉬운 설명을 붙여 검색과 상세가 한 장이 되게 한다. */
export function mergeReportOntoBok(terms: Term[]): Term[] {
  return terms.map((t) => {
    const rptId = reportIdForBok(t.id);
    if (!rptId) return t;
    const r = reportTermById(rptId);
    if (!r) return t;
    const hw = compactLabel(t.headword);
    const aliases = uniqueLabels([...t.aliases, r.headword, ...r.aliases, r.abbr ?? ""]).filter(
      (a) => compactLabel(a) !== hw,
    );
    return {
      ...t,
      abbr: t.abbr || r.abbr,
      aliases,
      oneLiner: t.oneLiner || r.easyExplanation,
      easyExplanation: t.easyExplanation || r.easyExplanation,
      whyItMatters: t.whyItMatters || r.whyItMatters,
      chain: t.chain.length ? t.chain : r.chain,
    };
  });
}

export const BOK_REPORT_BRIDGE: Record<string, { usage: string; lexiconIds: string[] }> = {
  "기저효과": {
    usage: "리포트에서는 YoY가 크게 보일 때 자주 붙어요. 작년 같은 기간이 유난히 좋거나 나빴는지를 먼저 보고, 비율 옆에 절대 금액도 같이 봐요.",
    lexiconIds: ["rpt-yoy", "rpt-ytd"],
  },
  "자본적지출": {
    usage: "리포트에서는 보통 CAPEX라고 써요. 단기 현금이 나가지만, 생산능력이 늘면 나중에 매출로 돌아올 수 있어요. 수요가 따라오는지는 따로 봐야 해요.",
    lexiconIds: ["rpt-capa", "rpt-util"],
  },
  "주가수익비율-per": {
    usage: "12M FWD PER이면 지난 이익이 아니라 앞으로 1년 이익을 가정한 배수예요. 과거 PER과 섞어 읽지 않아요.",
    lexiconIds: ["rpt-12m-fwd", "rpt-valuation", "rpt-consensus"],
  },
  "주주환원정책": {
    usage: "배당·자사주 발표와 실제 집행, 밸류에이션 할인이 줄어들 수 있다는 해석을 한 문장으로 읽지 않아요.",
    lexiconIds: ["rpt-discount", "rpt-valuation"],
  },
  "국채": {
    usage: "증권업 리포트의 국고채 금리 옆에는 종종 bp가 붙어요. 금리가 오르면 보유 채권의 평가 가격은 내려요.",
    lexiconIds: ["rpt-bp"],
  },
  "매출액영업이익률": {
    usage: "리포트에서는 보통 OPM이라고 써요. 매출이 늘어도 믹스·환율·비용 때문에 이 비율은 빠질 수 있어요.",
    lexiconIds: ["rpt-mix", "rpt-asp"],
  },
};

export function reportToTerm(r: ReportTerm): Term {
  return {
    id: r.id,
    headword: r.headword,
    pairHeadwords: [],
    aliases: r.aliases,
    enName: r.abbr,
    abbr: r.abbr,
    cho: "ABC",
    definition: r.reportUsage,
    shortDef: r.easyExplanation,
    relatedIds: r.relatedBokIds,
    category: "금융시장",
    difficulty: 2,
    source: { pdf: "report-lexicon", page: null },
    priority: "essential",
    oneLiner: r.easyExplanation,
    easyExplanation: r.easyExplanation,
    whyItMatters: r.whyItMatters,
    chain: r.chain,
    keyPoints: [r.reportUsage],
    commonConfusions: [],
    learningReviewed: false,
  };
}
