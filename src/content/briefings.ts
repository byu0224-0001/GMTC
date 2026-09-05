import type { LearningBriefing } from "../types";

const SRC = { label: "학습을 위해 재구성한 예시입니다." };

/** 학습용 브리핑. 실제 기사 문장을 옮기지 않음. reviewStatus published는 제품에 실렸다는 뜻이지, 사람 한국어·금융 검수 완료가 아니다. */
export const LEARNING_BRIEFINGS: LearningBriefing[] = [
  {
    id: "bf-cpi-rates",
    kicker: "물가·금리",
    minutes: 4,
    headline: "물가가 예상보다 높으면 금리는 왜 오를까요?",
    subtitle: "물가·기준금리·채권 가격이 이어지는 흐름",
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
        text: "소비자물가 상승률이 예상보다 높게 나오면, 물가 상승세가 예상보다 오래 이어질 가능성을 확인하게 됩니다.",
      },
      {
        type: "p",
        text: "물가 상승세가 쉽게 낮아지지 않으면 중앙은행이 기준금리를 빠르게 내리기 어렵습니다. 금리 인하 기대가 약해지면 시장금리는 오를 수 있습니다.",
      },
      {
        type: "p",
        text: "시장금리가 오르면 기존 채권 가격은 내려갑니다. 같은 폭으로 금리가 올라도 만기가 긴 채권의 가격이 더 크게 움직일 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "같은 폭으로 금리가 올랐는데 장기채 가격이 더 많이 떨어졌습니다. 이 차이를 설명하는 개념은 무엇일까요?",
        answerId: "듀레이션",
        choices: [
          { id: "듀레이션", label: "듀레이션" },
          { id: "만기수익률", label: "만기수익률" },
          { id: "표면금리", label: "표면금리" },
          { id: "신용스프레드", label: "신용스프레드" },
        ],
        note: "듀레이션은 금리 변화에 대한 채권 가격의 민감도를 나타냅니다. 일반적으로 듀레이션이 길수록 금리 변화에 가격이 더 크게 움직입니다.",
      },
      {
        type: "choice",
        depth: "cause",
        question: "물가 상승세가 이어질 것으로 보이면 시장금리가 오를 수 있는 이유는 무엇일까요?",
        answerId: "cut",
        choices: [
          { id: "cut", label: "금리 인하 기대가 약해질 수 있기 때문" },
          { id: "supply", label: "국채 발행이 이미 확정됐기 때문" },
          { id: "div", label: "기업 배당이 늘면 국채 금리가 반드시 오르기 때문" },
          { id: "core", label: "근원물가가 내려 완화 기대로 이어지기 때문" },
        ],
        note: "물가 상승세가 쉽게 낮아지지 않으면 중앙은행이 기준금리를 빠르게 내리기 어렵습니다. 그 기대가 약해지면 시장금리가 오를 수 있습니다.",
      },
      {
        type: "causal",
        title: "한 번에 연결하면",
        chain: ["물가 상승", "금리 인하 기대 약화", "시장금리 상승", "채권가격 하락"],
        extra:
          "금리가 높아지면 미래 이익을 현재 가치로 환산할 때 쓰는 할인율도 커질 수 있습니다. 성장 기대를 많이 반영하던 기업 주가에는 부담이 됩니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "물가 한 달만으로 금리 방향을 단정하기 어려운 이유는 무엇일까요?",
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
    headline: "실적이 좋아졌는데 주가는 왜 내릴까요?",
    subtitle: "실적은 예상치와 함께 봐야 합니다",
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
        text: "한 기업의 지난 분기 영업이익이 전년보다 늘었습니다. 그런데 실적 발표 당일 주가는 하락했습니다.",
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
        text: "실적이 전년보다 좋아졌더라도 시장의 예상에 못 미치면 주가는 하락할 수 있습니다. 금리가 오르면 같은 이익에도 투자자가 받아들이는 밸류에이션 수준이 낮아질 수 있습니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "실적이 늘었는데도 ‘기대보다 부진했다’는 평가가 나왔습니다. 가장 먼저 무엇과 비교해야 할까요?",
        answerId: "cons",
        choices: [
          { id: "cons", label: "컨센서스와 실제 실적의 차이" },
          { id: "pe", label: "PER는 실적 발표와 무관하므로 같이 보지 않는다" },
          { id: "guide", label: "회사가 내년 가이던스를 안 내면 기대는 없는 것과 같다" },
          { id: "price", label: "당일 주가가 내렸으면 실적 숫자는 틀린 것이다" },
        ],
        note: "주가는 과거 실적보다 앞으로 얼마를 벌 것으로 봤는지에 더 민감할 수 있습니다.",
      },
      {
        type: "causal",
        title: "한 번에 연결하면",
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
    subtitle: "전년 동월 대비와 연초 누적은 비교 기간이 다릅니다",
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
        text: "한 기업의 월 수출액이 전년 같은 달보다 45% 늘었습니다. 반면 1월부터 현재까지의 누적 수출액은 전년 같은 기간보다 18% 늘었습니다.",
      },
      {
        type: "choice",
        depth: "number",
        question: "왜 두 증가율이 다를 수 있을까요?",
        answerId: "period",
        choices: [
          { id: "period", label: "전년 동월 대비와 연초 누적은 비교 기간이 다르다" },
          { id: "same", label: "YoY와 YTD는 같은 기간을 보므로 항상 같아야 한다" },
          { id: "fxonly", label: "환율만 보면 두 비율은 자동으로 같아진다" },
          { id: "ignore", label: "누적이 낮으면 한 달 숫자는 오류다" },
        ],
        note: "YoY는 특정 기간을 전년 같은 기간과 비교하고, YTD는 연초부터 현재까지의 누적 실적을 비교합니다. 최근 한 달의 증가율이 높아도 앞선 달의 증가율이 낮았다면 YTD는 더 낮을 수 있습니다.",
      },
      {
        type: "p",
        text: "한 달의 +45%만 보고 올해 내내 그 속도로 성장했다고 말하면 과장입니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "증가율이 크게 보일 때 함께 확인하면 좋은 것은 무엇일까요?",
        answerId: "base",
        choices: [
          { id: "base", label: "절대 금액과 기저효과" },
          { id: "onlypct", label: "비율만 보면 충분하다" },
          { id: "mom", label: "전월 대비만 보면 YoY는 필요 없다" },
          { id: "skip", label: "한 달 숫자가 크면 누적은 보지 않아도 된다" },
        ],
        note: "비율만 보면 착시가 날 수 있습니다. 금액의 크기와 작년 같은 기간이 유난히 나빴는지도 같이 봅니다.",
      },
      {
        type: "causal",
        title: "한 번에 연결하면",
        chain: ["한 달 실적", "YoY", "YTD", "기저효과"],
      },
      { type: "concepts", ids: ["rpt-yoy", "rpt-ytd", "rpt-base"] },
    ],
  },
  {
    id: "bf-fx-export",
    kicker: "환율·수출",
    minutes: 3,
    headline: "원화가 약해지면 수출 기업에 항상 유리할까요?",
    subtitle: "환율과 수출 물량, 수입 비용을 같이 봅니다",
    primaryTermIds: ["평가절상", "경상수지"],
    sourceMode: "synthetic",
    contentMode: "synthetic",
    reviewStatus: "published",
    difficulty: "core",
    sourceRefs: [SRC],
    evergreen: true,
    blocks: [
      {
        type: "p",
        text: "원화가 약해지면 같은 달러 수출이 원화로 환산될 때 더 커 보일 수 있습니다. 반대로 수입 원자재 비용도 커질 수 있습니다. 원화가 강해지는 것(평가절상)은 이와 반대입니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "자국 통화의 가치가 다른 통화보다 높아지는 것을 무엇이라고 할까요?",
        answerId: "평가절상",
        choices: [
          { id: "평가절상", label: "평가절상" },
          { id: "기준금리", label: "기준금리" },
          { id: "경상수지", label: "경상수지" },
          { id: "외환보유액", label: "외환보유액" },
        ],
        note: "평가절상은 자국 통화의 가치가 다른 통화보다 높아지는 것입니다. 수출 가격 경쟁력에는 부담이 되고, 수입 물가 부담은 줄어들 수 있습니다.",
      },
      {
        type: "p",
        text: "수출 단가가 좋아 보여도, 해외 수요가 줄면 물량이 빠질 수 있습니다. 환율만으로 실적을 단정할 수 없습니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "환율 다음에 함께 볼 것은 무엇일까요?",
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
        title: "한 번에 연결하면",
        chain: ["환율", "수출 환산액", "수입 비용", "실적"],
      },
      { type: "concepts", ids: ["평가절상", "경상수지"] },
    ],
  },
  {
    id: "bf-jobs",
    kicker: "고용·금리",
    minutes: 3,
    headline: "실업률이 오르면 금리 기대는 어떻게 달라질까요?",
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
        text: "실업률이 오르면 고용 여건이 약해지고 있다는 신호일 수 있습니다. 경기와 물가 압력이 함께 낮아질 것으로 예상되면 기준금리 인하 가능성이 커질 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "일하려는 사람 가운데 일자리를 구하지 못한 사람의 비율을 나타내는 지표는 무엇일까요?",
        answerId: "실업률",
        choices: [
          { id: "실업률", label: "실업률" },
          { id: "고용률", label: "고용률" },
          { id: "경제성장률", label: "경제성장률" },
          { id: "소매판매", label: "소매판매" },
        ],
        note: "실업률은 경제활동인구 가운데 실업자가 차지하는 비율입니다. 구직 활동을 하지 않는 사람은 실업률 계산에서 빠질 수 있으므로 고용률 등 다른 지표도 함께 봅니다.",
      },
      {
        type: "p",
        text: "실업률만 보면 구직을 포기한 사람은 빠집니다. 고용률을 같이 봐야 일자리 사정이 더 잘 보입니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "고용 숫자 하나만으로 금리 방향을 단정하기 어려운 이유는 무엇일까요?",
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
        title: "한 번에 연결하면",
        chain: ["고용 둔화", "성장 우려", "금리 인하 기대", "시장금리"],
      },
      { type: "concepts", ids: ["실업률", "고용률", "기준금리"] },
    ],
  },
  {
    id: "bf-capex",
    kicker: "투자·생산",
    minutes: 4,
    headline: "설비투자를 늘리면 실적도 바로 좋아질까요?",
    subtitle: "투자에서 생산까지는 시간이 걸립니다",
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
        text: "기업이 공장이나 장비에 대한 투자를 늘리면 먼저 현금이 나갑니다. 매출은 설비가 실제로 가동되고 수요가 뒷받침될 때 늘 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "공장·서버·장비처럼 장기간 사용하는 자산에 쓰는 투자 지출을 무엇이라고 할까요?",
        answerId: "자본적지출",
        choices: [
          { id: "자본적지출", label: "자본적지출 (CAPEX)" },
          { id: "주당순이익-eps", label: "주당순이익 (EPS)" },
          { id: "rpt-capa", label: "생산능력 (CAPA)" },
          { id: "rpt-util", label: "가동률" },
        ],
        note: "자본적지출(CAPEX)은 공장·서버·장비처럼 장기간 사용하는 자산에 쓰는 투자 지출입니다.",
      },
      {
        type: "p",
        text: "투자가 낡은 설비를 바꾸는 것인지, 용량을 늘리는 것인지에 따라 장비 기업의 일감도 달라집니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "설비투자로 생산할 수 있는 양이 얼마나 늘었는지 확인할 때 보는 개념은 무엇일까요?",
        answerId: "rpt-capa",
        choices: [
          { id: "rpt-capa", label: "생산능력 (CAPA)" },
          { id: "자본적지출", label: "자본적지출 (CAPEX)" },
          { id: "rpt-util", label: "가동률" },
          { id: "주당순이익-eps", label: "주당순이익 (EPS)" },
        ],
        note: "생산능력(CAPA)은 설비가 최대로 만들 수 있는 양입니다. 투자가 늘어도 생산능력이 바로 늘지는 않을 수 있습니다.",
      },
      {
        type: "p",
        text: "설비가 늘어도 가동률이 낮으면 감가상각만 커질 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "늘어난 생산능력이 실제 생산으로 이어지고 있는지 확인할 때 보는 지표는 무엇일까요?",
        answerId: "rpt-util",
        choices: [
          { id: "rpt-util", label: "가동률" },
          { id: "rpt-capa", label: "생산능력 (CAPA)" },
          { id: "자본적지출", label: "자본적지출 (CAPEX)" },
          { id: "소매판매", label: "소매판매" },
        ],
        note: "가동률은 가진 생산능력 가운데 실제로 얼마나 돌리고 있는지의 비율입니다. 설비가 늘어도 가동률이 낮으면 실적으로 바로 이어지지 않을 수 있습니다.",
      },
      {
        type: "causal",
        title: "한 번에 연결하면",
        chain: ["CAPEX", "생산능력", "가동률", "실적"],
      },
      { type: "concepts", ids: ["자본적지출", "rpt-capa", "rpt-util"] },
    ],
  },
  {
    id: "bf-gdp-retail",
    kicker: "경기",
    minutes: 3,
    headline: "성장률은 좋아졌는데 왜 체감경기는 다를까요?",
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
        text: "GDP 성장률이 높아져도 가계 소비가 함께 늘었다고 단정할 수는 없습니다. 수출이나 투자가 성장을 이끌었다면 가계가 느끼는 경기와 차이가 날 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "한 나라 안에서 일정 기간 생산된 재화와 서비스의 가치를 합한 지표는 무엇일까요?",
        answerId: "국내총생산-gdp",
        choices: [
          { id: "국내총생산-gdp", label: "국내총생산 (GDP)" },
          { id: "국민총소득-gni", label: "국민총소득 (GNI)" },
          { id: "경상수지", label: "경상수지" },
          { id: "외환보유액", label: "외환보유액" },
        ],
        note: "GDP는 국내에서 생산된 재화와 서비스의 가치를 합한 지표입니다. GNI는 그 나라 국민이 국내외에서 벌어들인 소득의 합에 가깝습니다.",
      },
      {
        type: "p",
        text: "수출이 성장률을 끌어올리면 GDP는 괜찮은데, 내수 판매는 약할 수 있습니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "GDP가 늘어난 이유를 확인하려면 무엇을 나눠 봐야 할까요?",
        answerId: "mix",
        choices: [
          { id: "mix", label: "소비·투자·수출 등이 성장에 얼마나 기여했는지" },
          { id: "one", label: "성장률 한 줄이면 구성은 볼 필요가 없다" },
          { id: "same", label: "GDP와 소매판매는 항상 같은 속도를 가리킨다" },
          { id: "feel", label: "체감이 나쁘면 성장률 숫자는 틀린 것이다" },
        ],
        note: "같은 성장률이라도 무엇이 성장을 이끌었는지에 따라 가계의 체감경기와 기업 실적은 다르게 나타날 수 있습니다.",
      },
      {
        type: "causal",
        title: "한 번에 연결하면",
        chain: ["생산", "GDP", "소비", "체감 경기"],
      },
      { type: "concepts", ids: ["국내총생산-gdp", "소매판매", "경기"] },
    ],
  },
  {
    id: "bf-shareholder",
    kicker: "주주환원",
    minutes: 3,
    headline: "배당 확대 발표만으로 주주환원이 늘었다고 볼 수 있을까요?",
    subtitle: "계획과 실제 집행은 구분해서 봅니다",
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
        text: "회사가 배당 확대나 자사주 매입 계획을 발표했다고 해서 주주환원이 이미 이뤄진 것은 아닙니다. 실제 집행 규모와 시기를 확인해야 합니다.",
      },
      {
        type: "p",
        text: "주주환원을 지속하려면 이익과 현금흐름도 뒷받침돼야 합니다. 이익이 줄어들면 같은 환원 규모를 장기간 유지하기 어려울 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "배당·자사주 매입 등으로 이익을 주주에게 돌리는 정책은 무엇일까요?",
        answerId: "주주환원정책",
        choices: [
          { id: "주주환원정책", label: "주주환원정책" },
          { id: "유상증자", label: "유상증자" },
          { id: "기업공개", label: "기업공개" },
          { id: "rpt-guidance", label: "가이던스" },
        ],
        note: "주주환원은 배당과 자사주 매입 등으로 이익을 주주에게 돌리는 정책입니다. 발표와 실제 집행은 구분해서 봅니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "주주환원 확대 계획이 실제로 이행되고 있는지 확인하려면 무엇을 봐야 할까요?",
        answerId: "eps",
        choices: [
          { id: "eps", label: "실제 배당·자사주 집행과 이익·현금흐름" },
          { id: "word", label: "발표 문장만 보면 충분하다" },
          { id: "once", label: "환원 비율을 올리면 이익이 줄어도 지속된다" },
          { id: "price", label: "발표 당일 주가가 오르면 환원은 끝난 것이다" },
        ],
        note: "계획이 발표돼도 실제 배당·자사주 집행과 이익·현금흐름을 확인해야 지속 여부를 판단할 수 있습니다.",
      },
      {
        type: "causal",
        title: "한 번에 연결하면",
        chain: ["이익", "주주환원 계획", "실제 배당·자사주", "주가"],
      },
      { type: "concepts", ids: ["주주환원정책", "주당순이익-eps", "rpt-guidance"] },
    ],
  },
  {
    id: "bf-bond-rates",
    kicker: "국채·금리",
    minutes: 3,
    headline: "국채금리가 오르면 왜 채권 가격은 내릴까요?",
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
        text: "이미 발행된 채권은 약속된 이자가 정해져 있습니다. 이후 시장금리가 오르면 더 높은 수익률을 제공하는 새 채권의 매력이 커집니다. 기존 채권은 가격이 내려가야 새로운 시장금리와 비슷한 수준의 수익률을 제공할 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "현재 가격으로 채권을 사서 만기까지 보유할 때 기대하는 수익률은 무엇일까요?",
        answerId: "만기수익률",
        choices: [
          { id: "만기수익률", label: "만기수익률" },
          { id: "표면금리", label: "표면금리" },
          { id: "기준금리", label: "기준금리" },
          { id: "지급준비제도", label: "지급준비제도" },
        ],
        note: "표면금리는 채권 발행 시 정해진 이자율입니다. 만기수익률은 현재 가격으로 매수해 만기까지 보유할 때 기대하는 수익률입니다.",
      },
      {
        type: "p",
        text: "국채금리는 크게 변하지 않았는데 회사채금리만 올랐다면, 회사채와 국채의 금리 차이가 커진 것입니다. 기업의 신용위험에 대해 더 높은 금리를 요구하고 있다는 신호일 수 있습니다.",
      },
      {
        type: "choice",
        depth: "cause",
        question: "국채와 회사채 금리 차이가 벌어진다는 것은 무엇을 뜻할까요?",
        answerId: "spread",
        choices: [
          { id: "spread", label: "신용위험에 대해 요구되는 추가 금리가 커진 것" },
          { id: "same", label: "국채와 회사채 금리는 항상 같이 움직이므로 차이는 의미가 없다" },
          { id: "div", label: "배당을 늘리면 회사채 스프레드는 반드시 줄어든다" },
          { id: "fx", label: "환율만 보면 신용 스프레드는 결정된다" },
        ],
        note: "국채금리는 비교적 신용위험이 낮은 금리에 가깝고, 회사채에는 기업의 신용위험이 더해집니다.",
      },
      {
        type: "causal",
        title: "한 번에 연결하면",
        chain: ["시장금리 상승", "만기수익률", "채권가격 하락", "신용스프레드"],
      },
      { type: "concepts", ids: ["국채", "만기수익률", "신용스프레드"] },
    ],
  },
  {
    id: "bf-supply-price",
    kicker: "공급·물가",
    minutes: 3,
    headline: "공급이 줄면 물가는 왜 오를까요?",
    subtitle: "수요보다 공급이 먼저 움직일 수 있습니다",
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
        text: "수요가 그대로여도 원자재나 부품 공급이 줄면 가격이 오를 수 있습니다. 생산 단계의 비용 상승이 소비자 가격에 전가되면 소비자물가 상승 압력으로 이어질 수 있습니다.",
      },
      {
        type: "choice",
        depth: "term",
        question: "생산자가 거래하는 상품과 서비스의 가격 변화를 보여주는 지수는 무엇일까요?",
        answerId: "생산자물가지수-ppi",
        choices: [
          { id: "생산자물가지수-ppi", label: "생산자물가지수 (PPI)" },
          { id: "소비자물가지수-cpi", label: "소비자물가지수 (CPI)" },
          { id: "소매판매", label: "소매판매" },
          { id: "실업률", label: "실업률" },
        ],
        note: "생산자물가지수(PPI)는 생산자가 거래하는 상품과 서비스의 가격 변화를 보여줍니다. 생산 단계의 가격 상승이 소비자 가격에 얼마나 전가되는지는 별도로 확인해야 합니다.",
      },
      {
        type: "p",
        text: "성장은 약한데 물가만 오르는 구간도 있습니다. 그때는 금리만 내려서 해결된다고 보기 어렵습니다.",
      },
      {
        type: "choice",
        depth: "next",
        question: "경기 둔화와 물가 상승이 동시에 나타나는 상황을 무엇이라고 할까요?",
        answerId: "stag",
        choices: [
          { id: "stag", label: "스태그플레이션" },
          { id: "always", label: "성장이 약하면 물가는 반드시 내려간다" },
          { id: "cpi-only", label: "PPI는 볼 필요 없이 CPI 한 줄이면 충분하다" },
          { id: "ignore", label: "공급 제약은 물가와 무관하다" },
        ],
        note: "수요가 줄어도 공급이 막혀 있으면 물가가 오를 수 있습니다. 성장과 물가를 한 방향으로만 묶지 않습니다.",
      },
      {
        type: "causal",
        title: "한 번에 연결하면",
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
