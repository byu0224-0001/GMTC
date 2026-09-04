import type { LearningBriefing } from "../types";

const SRC = { label: "실제 기사가 아닌 학습을 위해 재구성한 내용입니다." };

/** 학습용 브리핑. 실제 기사 문장을 옮기지 않음. */
export const LEARNING_BRIEFINGS: LearningBriefing[] = [
  {
    id: "bf-cpi-rates",
    kicker: "물가·금리",
    minutes: 4,
    headline: "물가가 예상보다 높게 나왔습니다",
    subtitle: "주식과 채권이 함께 내린 이유",

    primaryTermIds: ["소비자물가지수-cpi", "기준금리", "듀레이션"],
    supportTermIds: ["근원인플레이션율", "기대인플레이션"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "최근 소비자물가 상승률이 시장 예상치를 웃돌았습니다. 투자자들이 주목한 것은 이러한 흐름이 지속되고 있는지, 물가 압력이 다시 강해지고 있는지였습니다.",
      },
      {
        type: "p",
        text: "물가가 쉽게 내려오지 않으면 중앙은행이 기준금리를 빠르게 내리기 어렵습니다. 금리 인하 기대가 줄면서 국채금리는 올랐습니다.",
      },
      {
        type: "p",
        text: "금리 인하 기대가 줄자 국채금리가 올랐습니다. 만기가 긴 국채 가격이 단기채보다 더 크게 떨어졌습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "만기가 긴 국채가 더 크게 떨어진 건 무슨 차이 때문일까요?",
        answerId: "듀레이션",
        choices: [
          { id: "듀레이션", label: "듀레이션" },
          { id: "만기수익률", label: "만기수익률" },
          { id: "표면금리", label: "표면금리" },
          { id: "신용스프레드", label: "신용스프레드" },
        ],
        note: "같은 금리 움직임에도 만기가 긴 쪽 가격이 더 크게 반응한 장면입니다.",
      },
      {
        type: "choice",
        depth: "cause",
        question: "국채 금리가 오른 이유는?",

        answerId: "cut",
        choices: [
          { id: "cut", label: "금리 인하 기대가 줄었기 때문" },
          { id: "supply", label: "국채를 더 많이 찍기로 이미 확정됐기 때문" },
          { id: "div", label: "기업 배당이 늘면 국채 금리가 반드시 오르기 때문" },
          { id: "core", label: "근원물가(Core CPI)가 내려서 완화 기대로 읽혔기 때문" },
        ],
        note: "물가 압력이 남아 있으면 중앙은행이 금리를 빠르게 내리기 어렵다고 봅니다. 그 기대가 줄어 시장금리가 오릅니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["물가 상승", "금리 인하 기대 약화", "시장금리 상승", "채권가격 하락"],
        extra:
          "금리가 높아지면 미래 이익을 현재 가치로 환산할 때 쓰는 할인율도 커질 수 있습니다. 성장 기대를 많이 반영하던 기업 주가에는 부담이 됩니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "물가 한 달만으로 금리 방향을 단정하기 어려운 이유는?",

        answerId: "core",
        choices: [
          { id: "core", label: "근원물가와 기대인플레이션을 같이 봐야 기조인지 알 수 있다" },
          { id: "once", label: "헤드라인 물가 한 달이면 기조가 확정된다" },
          { id: "div", label: "배당성향이 물가 경로를 결정한다" },
          { id: "ignore", label: "예상과의 차이는 볼 필요가 없다" },
        ],
        note: "헤드라인 물가 한 달은 에너지 같은 일시 충격이 섞일 수 있습니다. 근원물가가 같이 올랐는지를 봐야 합니다.",
      },
      { type: "concepts", ids: ["소비자물가지수-cpi", "기준금리", "듀레이션"] },
    ],
  },
  {
    id: "bf-earnings-down",
    kicker: "실적·주가",
    minutes: 3,
    headline: "실적은 좋은데 주가는 내렸습니다",
    subtitle: "실적과 기대가 어긋날 때",

    primaryTermIds: ["주당순이익-eps", "주가수익비율-per", "rpt-consensus"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "한 기업의 지난 분기 영업이익이 전년보다 늘었다는 공시가 나왔습니다. 그런데 당일 주가는 내렸습니다.",
      },
      {
        type: "choice",
        depth: "cause",
        question: "지금 확인된 사실은?",

        answerId: "fact",
        choices: [
          { id: "fact", label: "지난 분기 영업이익이 전년보다 늘었다는 공시" },
          { id: "est", label: "내년에도 같은 속도로 이익이 늘어날 것이라는 전망" },
          { id: "cheap", label: "지금 주가가 저평가돼 있다는 의견" },
          { id: "buy", label: "목표주가를 올리고 매수를 유지한다는 추천" },
        ],
        note: "지난 실적 숫자는 확인된 내용입니다. 앞으로의 이익·목표가·매수는 아직 전망과 의견입니다.",
      },
      {
        type: "p",
        text: "실적이 좋아도 시장이 미리 기대한 숫자보다 못하면 주가는 내릴 수 있습니다. 금리가 오른 날이면 같은 이익(EPS)에도 PER 같은 밸류에이션 배수가 낮아지기도 합니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "다음에 확인할 항목은?",

        answerId: "cons",
        choices: [
          { id: "cons", label: "컨센서스(시장 평균 예상)와 실제 숫자의 차이" },
          { id: "past", label: "작년 영업이익이 늘었으면 컨센서스는 볼 필요 없다" },
          { id: "pe", label: "PER는 실적 발표와 무관하므로 같이 보지 않는다" },
          { id: "guide", label: "회사가 내년 가이던스를 안 내면 기대는 없는 것과 같다" },
        ],
        note: "주가는 과거 실적보다 ‘앞으로 얼마를 벌 것으로 봤는지’에 더 민감할 수 있습니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["공시된 실적", "시장 기대와의 차이", "금리·배수", "주가"],
      },
      { type: "concepts", ids: ["주당순이익-eps", "주가수익비율-per", "rpt-consensus"] },
    ],
  },
  {
    id: "bf-yoy-ytd",
    kicker: "숫자 읽기",
    minutes: 3,
    headline: "한 달은 +45%, 올해는 +18%",
    subtitle: "같은 성장인데 숫자가 다른 이유",

    primaryTermIds: ["rpt-yoy", "rpt-ytd", "rpt-base"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "한 기업의 월 수출액이 전년 같은 달보다 45% 늘었습니다. 그런데 연초부터 모은 누적 증가율은 18%입니다.",
      },
      {
        type: "choice",
        depth: "number",
        question: "두 숫자가 다른 이유는?",

        answerId: "period",
        choices: [
          { id: "period", label: "한 달 성장과 올해 누적은 비교 기간이 다르다" },
          { id: "same", label: "YoY와 YTD는 같은 기간을 보므로 항상 같아야 한다" },
          { id: "fxonly", label: "환율만 보면 두 비율은 자동으로 같아진다" },
          { id: "ignore", label: "누적이 낮으면 한 달 숫자는 오류다" },
        ],
        note: "YoY는 작년 같은 달, YTD는 올해 1월부터의 합입니다. 한 달이 좋아도 앞부분이 약하면 누적은 낮습니다.",
      },
      {
        type: "p",
        text: "한 달의 +45%만 보고 올해 내내 그 속도로 성장했다고 말하면 과장입니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "다음에 확인하면 좋은 것은?",

        answerId: "base",
        choices: [
          { id: "base", label: "절대 수출액, 이전 월 흐름, 기저효과" },
          { id: "onlypct", label: "비율만 보면 충분하다" },
          { id: "mom", label: "전월 대비만 보면 YoY는 필요 없다" },
          { id: "skip", label: "한 달 숫자가 크면 누적은 보지 않아도 된다" },
        ],
        note: "비율만 보면 착시가 납니다. 금액의 크기와 작년 같은 달이 유난히 나빴는지도 같이 봅니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["한 달 실적", "YoY", "YTD", "기저효과"],
      },
      { type: "concepts", ids: ["rpt-yoy", "rpt-ytd", "rpt-base"] },
    ],
  },
  {
    id: "bf-fx-export",
    kicker: "환율·수출",
    minutes: 3,
    headline: "원화 약세면 수출 기업은 무조건 이득일까",
    subtitle: "환율만 보면 놓치는 것",

    primaryTermIds: ["기준환율", "경상수지", "평가절상"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "원/달러 환율이 오르면(원화 약세) 같은 달러 수출이 원화로 환산될 때 더 커 보일 수 있습니다. 반대로 수입 원자재 비용도 커질 수 있습니다. 원화가 비싸지는 것(평가절상)은 이와 반대입니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "원/달러처럼 서로 다른 통화를 교환하는 기준은?",
        answerId: "기준환율",
        choices: [
          { id: "기준환율", label: "기준환율" },
          { id: "평가절상", label: "평가절상" },
          { id: "기준금리", label: "기준금리" },
          { id: "경상수지", label: "경상수지" },
        ],
        note: "기준환율은 원/달러처럼 한 통화가 다른 통화와 교환되는 비율의 기준점입니다.",
      },
      {
        type: "p",
        text: "수출 단가가 좋아 보여도, 해외 수요가 줄면 물량이 빠집니다. 환율만으로 실적을 단정할 수 없습니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "환율 다음에 함께 볼 것은?",

        answerId: "ca",
        choices: [
          { id: "ca", label: "수출 물량, 수입 비용, 경상수지" },
          { id: "only", label: "환율 숫자 하나만" },
          { id: "always", label: "원화 약세면 수출 기업 실적은 항상 좋아진다" },
          { id: "ignore", label: "수입 원자재 비용은 환율과 무관하다" },
        ],
        note: "경상수지와 수출 물량을 봐야 환율 효과가 실적으로 남는지 가늠할 수 있습니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["환율", "수출 환산액", "수입 비용", "실적"],
      },
      { type: "concepts", ids: ["기준환율", "경상수지", "평가절상"] },
    ],
  },
  {
    id: "bf-jobs",
    kicker: "고용·금리",
    minutes: 3,
    headline: "일자리가 줄면 금리는 어떻게 읽힐까",
    subtitle: "실업률과 고용률은 다른 지표입니다",

    primaryTermIds: ["실업률", "고용률", "기준금리"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "일자리를 찾는 사람 가운데 아직 못 구한 비율이 오르면, 시장은 경기가 식고 있다고 읽을 수 있습니다. 중앙은행이 기준금리를 계속 올리기 어렵다는 기대도 커질 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "일자리를 찾는 사람 비율이 올랐다는 뉴스에서, 시장이 먼저 본 숫자는?",

        answerId: "실업률",
        choices: [
          { id: "실업률", label: "실업률" },
          { id: "고용률", label: "고용률" },
          { id: "경제성장률", label: "경제성장률" },
          { id: "소매판매", label: "소매판매" },
        ],
        note: "구직을 포기한 사람은 이 비율에 안 들어갑니다. 그래서 고용률을 같이 봐야 일자리 사정이 더 잘 보입니다.",
      },
      {
        type: "p",
        text: "실업률만 보면 구직을 포기한 사람은 빠집니다. 고용률을 같이 봐야 일자리 사정이 더 잘 보입니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "고용 숫자 하나만으로 금리 방향을 단정하기 어려운 이유는?",

        answerId: "wage",
        choices: [
          { id: "wage", label: "임금, 구인 강도, 물가를 같이 봐야 한다" },
          { id: "one", label: "실업률 한 달이면 금리 경로가 확정된다" },
          { id: "same", label: "실업률과 고용률은 같은 지표이므로 하나만 보면 된다" },
          { id: "ignore", label: "구직 포기자는 고용 판단에 넣을 필요가 없다" },
        ],
        note: "고용이 약해도 임금과 물가가 단단하면 중앙은행은 쉽게 금리를 내리지 않을 수 있습니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["고용 둔화", "성장 우려", "금리 인하 기대", "시장금리"],
      },
      { type: "concepts", ids: ["실업률", "고용률", "기준금리"] },
    ],
  },
  {
    id: "bf-capex",
    kicker: "투자·생산",
    minutes: 4,
    headline: "설비 투자를 늘렸다고 실적이 바로 좋아질까",
    subtitle: "투자 시점과 가동 시점은 다릅니다",

    primaryTermIds: ["자본적지출", "rpt-capa", "rpt-util"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "기업이 공장·장비를 늘리겠다고 하면 당장은 현금이 나갑니다. 매출은 설비가 돌아가고 수요가 붙을 때 따라옵니다.",
      },
      {
        type: "p",
        text: "투자가 낡은 설비를 바꾸는 것인지, 용량을 늘리는 것인지에 따라 장비 기업의 일감도 달라집니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "공장·서버처럼 오래 쓰는 자산에 넣는 돈을 리포트에서는?",

        answerId: "자본적지출",
        choices: [
          { id: "자본적지출", label: "자본적지출 (CAPEX)" },
          { id: "주당순이익-eps", label: "주당순이익 (EPS)" },
          { id: "유동성", label: "유동성" },
          { id: "소매판매", label: "소매판매" },
        ],
        note: "CAPEX(자본적지출)는 오래 쓰는 자산에 넣는 돈입니다. 비용이 아니라 투자로 잡히는 경우가 많습니다.",
      },
      {
        type: "choice",
        depth: "cause",
        question: "장비 기업 실적을 볼 때 제일 먼저 볼 것은?",

        answerId: "new",
        choices: [
          { id: "new", label: "투자가 신규 증설인지, 낡은 설비 교체인지" },
          { id: "order", label: "발주가 실제로 시작됐는지" },
          { id: "run", label: "신규 설비가 언제 가동되는지" },
          { id: "demand", label: "관련 수요가 지속되는지" },
        ],
        note: "교체 투자면 용량이 크게 안 늘 수 있습니다. 신규 증설이면 발주·가동 시점을 이어서 봐야 합니다.",
      },
      {
        type: "p",
        text: "설비가 늘어도 가동률이 낮으면 감가상각만 커질 수 있습니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "CAPEX 다음에 확인할 숫자는?",

        answerId: "util",
        choices: [
          { id: "util", label: "생산능력과 가동률, 실제 발주" },
          { id: "only", label: "CAPEX 공시 한 줄이면 충분하다" },
          { id: "now", label: "투자 공시가 나오면 그 분기 실적이 바로 좋아진다" },
          { id: "cost", label: "감가상각은 가동률과 관계없다" },
        ],
        note: "용량(capa)과 가동률(utilization)이 따라와야 투자 효과가 실적으로 남습니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["CAPEX", "생산능력", "가동률", "실적"],
      },
      { type: "concepts", ids: ["자본적지출", "rpt-capa", "rpt-util"] },
    ],
  },
  {
    id: "bf-gdp-retail",
    kicker: "경기",
    minutes: 3,
    headline: "성장률은 괜찮은데 체감은 왜 다를까",
    subtitle: "국내총생산(GDP)과 소매판매는 속도가 다를 수 있습니다",

    primaryTermIds: ["국내총생산-gdp", "소매판매", "경기"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "성장률이 전년보다 나아 보여도, 가계 소비가 늘어나는 속도는 더딜 수 있습니다. 숫자와 체감이 어긋나는 이유입니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "이 장면에서 전년보다 늘었다고 한 나라 전체 생산 숫자는?",

        answerId: "국내총생산-gdp",
        choices: [
          { id: "국내총생산-gdp", label: "국내총생산 (GDP)" },
          { id: "국민총소득-gni", label: "국민총소득 (GNI)" },
          { id: "경상수지", label: "경상수지" },
          { id: "외환보유액", label: "외환보유액" },
        ],
        note: "GDP는 국내 생산의 합입니다. GNI는 그 나라 국민이 국내외에서 벌어들인 소득의 합에 가깝습니다.",
      },
      {
        type: "p",
        text: "수출이 성장률을 끌어올리면 GDP는 괜찮은데, 내수 판매는 약할 수 있습니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "성장률을 볼 때 함께 보면 좋은 것은?",

        answerId: "mix",
        choices: [
          { id: "mix", label: "소비, 투자, 수출이 각각 얼마나 기여했는지" },
          { id: "one", label: "성장률 한 줄이면 구성은 볼 필요가 없다" },
          { id: "same", label: "GDP와 소매판매는 항상 같은 속도를 가리킨다" },
          { id: "feel", label: "체감이 나쁘면 성장률 숫자는 틀린 것이다" },
        ],
        note: "같은 성장률이라도 수출과 내수의 비중이 다르면 체감과 기업 실적이 갈립니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["생산", "GDP", "소비", "체감 경기"],
      },
      { type: "concepts", ids: ["국내총생산-gdp", "소매판매", "경기"] },
    ],
  },
  {
    id: "bf-shareholder",
    kicker: "주주환원",
    minutes: 3,
    headline: "배당을 늘리겠다는 발표, 주가는 오를까",
    subtitle: "발표와 실제 현금 유출은 따로 봅니다",

    primaryTermIds: ["주주환원정책", "주당순이익-eps", "rpt-guidance"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "회사가 이익의 더 많은 부분을 배당이나 자사주로 돌리겠다고 밝히면, 주주환원으로 읽힙니다. 다만 그건 가이던스에 가까운 계획이고, 실제 현금이 나가는지·주당순이익(EPS)이 유지되는지는 따로 봐야 합니다.",
      },
      {
        type: "p",
        text: "환원 비율을 올려도 이익이 줄면 오래 가기 어렵습니다. 발표와 실제 배당·자사주 집행은 다른 층입니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "배당·자사주로 주주에게 돌려주는 정책은?",

        answerId: "주주환원정책",
        choices: [
          { id: "주주환원정책", label: "주주환원정책" },
          { id: "유상증자", label: "유상증자" },
          { id: "기업공개", label: "기업공개" },
          { id: "자사주", label: "자사주 매입만" },
        ],
        note: "주주환원은 배당과 자사주 매입 등으로 이익을 주주에게 돌리는 정책입니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "환원 발표 다음에 확인할 것은?",

        answerId: "eps",
        choices: [
          { id: "eps", label: "이익(EPS)이 유지되는지, 실제 배당이 나왔는지" },
          { id: "word", label: "발표 문장만 보면 현금 유출은 확인할 필요 없다" },
          { id: "once", label: "환원 비율을 올리면 이익이 줄어도 지속된다" },
          { id: "price", label: "발표 당일 주가가 오르면 환원은 끝난 것이다" },
        ],
        note: "환원을 늘려도 이익이 줄면 지속하기 어렵습니다. 가이던스와 실제 배당을 같이 봅니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["이익", "주주환원", "실제 배당·자사주", "주가"],
      },
      { type: "concepts", ids: ["주주환원정책", "주당순이익-eps", "rpt-guidance"] },
    ],
  },
  {
    id: "bf-bond-rates",
    kicker: "국채·금리",
    minutes: 3,
    headline: "국채 금리가 오르면 채권 값은 왜 내릴까",
    subtitle: "금리와 채권 가격은 반대로 움직입니다",

    primaryTermIds: ["국채", "만기수익률", "신용스프레드"],
    supportTermIds: ["듀레이션"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "이미 발행된 국채의 이자는 대부분 고정입니다. 시장에서 새로 요구하는 금리가 오르면, 예전 이자만 주는 채권은 상대적으로 덜 매력져서 가격이 내려갑니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "지금 가격으로 샀을 때 기대하는 수익률은?",

        answerId: "만기수익률",
        choices: [
          { id: "만기수익률", label: "만기수익률" },
          { id: "표면금리", label: "표면금리" },
          { id: "기준금리", label: "기준금리" },
          { id: "지급준비제도", label: "지급준비제도" },
        ],
        note: "표면금리는 채권에 찍힌 이자입니다. 만기수익률은 지금 가격으로 샀을 때 만기까지 기대하는 수익률입니다.",
      },
      {
        type: "p",
        text: "국채 금리는 크게 안 움직이는데 회사채 금리만 더 오르면, 기업이 돈을 빌리는 비용이 국채와 벌어지고 있는 겁니다.",
      },
      {
        type: "choice",
        depth: "cause",
        question: "국채와 회사채 금리 차이가 벌어진다는 것은?",

        answerId: "spread",
        choices: [
          { id: "spread", label: "신용위험이 커져 조달 비용이 상대적으로 비싸진 것" },
          { id: "same", label: "국채와 회사채 금리는 항상 같이 움직이므로 차이는 의미가 없다" },
          { id: "div", label: "배당을 늘리면 회사채 스프레드는 반드시 줄어든다" },
          { id: "fx", label: "환율만 보면 신용 스프레드는 결정된다" },
        ],
        note: "국채는 정부가 빌리는 돈의 가격에 가깝고, 회사채는 여기에 기업의 신용 위험이 더해집니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["시장금리 상승", "만기수익률", "채권가격 하락", "신용스프레드"],
      },
      { type: "concepts", ids: ["국채", "만기수익률", "신용스프레드"] },
    ],
  },
  {
    id: "bf-supply-price",
    kicker: "공급·물가",
    minutes: 3,
    headline: "물건이 부족하면 물가는 어떻게 되나",
    subtitle: "수요보다 공급이 먼저 움직입니다",

    primaryTermIds: ["인플레이션", "생산자물가지수-ppi", "스태그플레이션"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "같은 수요라도 공급이 막히면 가격이 오를 수 있습니다. 원자재·부품 가격이 먼저 오르면, 나중에 소비자 물가로 옮겨 가 인플레이션 압력으로 읽히기도 합니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "기업이 원자재·중간재를 사고팔 때의 가격 흐름은?",

        answerId: "생산자물가지수-ppi",
        choices: [
          { id: "생산자물가지수-ppi", label: "생산자물가지수 (PPI)" },
          { id: "소비자물가지수-cpi", label: "소비자물가지수 (CPI)" },
          { id: "소매판매", label: "소매판매" },
          { id: "실업률", label: "실업률" },
        ],
        note: "생산자물가지수(PPI)는 생산 단계, 소비자물가지수(CPI)는 가계가 자주 지출하는 상품·서비스의 가격입니다. 둘의 시차와 전가 여부를 함께 봅니다.",
      },
      {
        type: "p",
        text: "성장은 약한데 물가만 오르는 구간도 있습니다. 그때는 금리만 내려서 해결된다고 보기 어렵습니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "성장은 느린데 물가만 오르는 상황은?",

        answerId: "stag",
        choices: [
          { id: "stag", label: "스태그플레이션처럼 성장 둔화와 물가 상승이 겹치는지" },
          { id: "always", label: "성장이 약하면 물가는 반드시 내려간다" },
          { id: "cpi-only", label: "PPI는 볼 필요 없이 CPI 한 줄이면 충분하다" },
          { id: "ignore", label: "공급 제약은 물가와 무관하다" },
        ],
        note: "수요가 식어도 공급이 막혀 있으면 물가가 버팁니다. 성장과 물가를 한 방향으로만 묶지 않습니다.",
      },
      {
        type: "causal",
        title: "한 줄 요약",
        chain: ["공급 제약", "생산자 가격", "소비자 물가", "성장"],
      },
      { type: "concepts", ids: ["인플레이션", "생산자물가지수-ppi", "스태그플레이션"] },
    ],
  },
];

let extraBriefings: LearningBriefing[] = [];

export function registerExtraBriefings(list: LearningBriefing[]): void {
  extraBriefings = list.filter((b) => b.reviewStatus !== "draft");
}

export function allBriefings(): LearningBriefing[] {
  const seen = new Set(LEARNING_BRIEFINGS.map((b) => b.id));
  return [...LEARNING_BRIEFINGS, ...extraBriefings.filter((b) => !seen.has(b.id))];
}

export function briefingById(id: string): LearningBriefing | undefined {
  return allBriefings().find((b) => b.id === id);
}

export function nextBriefing(seenIds: string[]): LearningBriefing {
  const pool = allBriefings();
  const unseen = pool.find((b) => !seenIds.includes(b.id));
  if (unseen) return unseen;
  const i = new Date().getDay() % pool.length;
  return pool[i];
}

export const PILOT_TERM_IDS: string[] = [
  ...new Set(LEARNING_BRIEFINGS.flatMap((b) => b.primaryTermIds)),
];
