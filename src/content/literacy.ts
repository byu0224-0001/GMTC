import type { Term } from "../types";
import { CORE_COPY } from "./coreCopy";
import { isPilotTerm } from "./pilotCore";

export type Taxonomy =
  | "경제기초"
  | "경기·성장"
  | "물가"
  | "통화정책"
  | "금리·채권"
  | "주식"
  | "기업분석"
  | "은행·신용"
  | "외환"
  | "국제경제"
  | "부동산"
  | "파생"
  | "디지털금융"
  | "금융안정";

export type Priority = "core" | "essential" | "full";

export interface CoreEntry {
  id: string;
  taxonomy: Taxonomy;
}

/** 투자 정보를 읽을 때 빈도가 높은 최소 문법. 800 전수가 아님. */
export const CORE100: CoreEntry[] = [
  { id: "국내총생산-gdp", taxonomy: "경기·성장" },
  { id: "경제성장률", taxonomy: "경기·성장" },
  { id: "국민총소득-gni", taxonomy: "경기·성장" },
  { id: "경기", taxonomy: "경기·성장" },
  { id: "경기종합지수", taxonomy: "경기·성장" },
  { id: "잠재GDP성장률", taxonomy: "경기·성장" },
  { id: "GDP갭", taxonomy: "경기·성장" },
  { id: "실업률", taxonomy: "경기·성장" },
  { id: "고용률", taxonomy: "경기·성장" },
  { id: "소매판매", taxonomy: "경기·성장" },
  { id: "소비자물가지수-cpi", taxonomy: "물가" },
  { id: "생산자물가지수-ppi", taxonomy: "물가" },
  { id: "인플레이션", taxonomy: "물가" },
  { id: "근원인플레이션율", taxonomy: "물가" },
  { id: "기대인플레이션", taxonomy: "물가" },
  { id: "디플레이션", taxonomy: "물가" },
  { id: "디스인플레이션", taxonomy: "물가" },
  { id: "스태그플레이션", taxonomy: "물가" },
  { id: "GDP디플레이터", taxonomy: "물가" },
  { id: "물가안정목표제", taxonomy: "물가" },
  { id: "기준금리", taxonomy: "통화정책" },
  { id: "한국은행", taxonomy: "통화정책" },
  { id: "중앙은행", taxonomy: "통화정책" },
  { id: "금융통화위원회", taxonomy: "통화정책" },
  { id: "공개시장운영", taxonomy: "통화정책" },
  { id: "양적완화정책", taxonomy: "통화정책" },
  { id: "긴축정책", taxonomy: "통화정책" },
  { id: "테이퍼링", taxonomy: "통화정책" },
  { id: "본원통화", taxonomy: "통화정책" },
  { id: "광의통화-m2", taxonomy: "통화정책" },
  { id: "지급준비제도", taxonomy: "통화정책" },
  { id: "연방준비제도-frs", taxonomy: "통화정책" },
  { id: "유럽중앙은행-ecb", taxonomy: "통화정책" },
  { id: "제로금리정책", taxonomy: "통화정책" },
  { id: "명목금리", taxonomy: "금리·채권" },
  { id: "가산금리", taxonomy: "금리·채권" },
  { id: "고정금리", taxonomy: "금리·채권" },
  { id: "변동금리", taxonomy: "금리·채권" },
  { id: "듀레이션", taxonomy: "금리·채권" },
  { id: "수익률곡선", taxonomy: "금리·채권" },
  { id: "만기수익률", taxonomy: "금리·채권" },
  { id: "국채", taxonomy: "금리·채권" },
  { id: "회사채", taxonomy: "금리·채권" },
  { id: "신용스프레드", taxonomy: "금리·채권" },
  { id: "장단기금리차", taxonomy: "금리·채권" },
  { id: "머니마켓펀드-mmf", taxonomy: "금리·채권" },
  { id: "채권시장", taxonomy: "금리·채권" },
  { id: "표면금리", taxonomy: "금리·채권" },
  { id: "상장지수펀드-etf", taxonomy: "주식" },
  { id: "주가수익비율-per", taxonomy: "주식" },
  { id: "주가순자산비율-pbr", taxonomy: "주식" },
  { id: "주식시장", taxonomy: "주식" },
  { id: "펀드", taxonomy: "주식" },
  { id: "공매도", taxonomy: "주식" },
  { id: "주가지수", taxonomy: "주식" },
  { id: "기업공개", taxonomy: "주식" },
  { id: "주주환원정책", taxonomy: "주식" },
  { id: "M&A", taxonomy: "기업분석" },
  { id: "자기자본이익률-roe", taxonomy: "기업분석" },
  { id: "주당순이익-eps", taxonomy: "기업분석" },
  { id: "자본적지출", taxonomy: "기업분석" },
  { id: "전환사채-cb", taxonomy: "기업분석" },
  { id: "부채비율", taxonomy: "기업분석" },
  { id: "이자보상배율", taxonomy: "기업분석" },
  { id: "유동성", taxonomy: "은행·신용" },
  { id: "신용위험", taxonomy: "은행·신용" },
  { id: "뱅크런", taxonomy: "은행·신용" },
  { id: "예금보험제도", taxonomy: "은행·신용" },
  { id: "부실채권-npl", taxonomy: "은행·신용" },
  { id: "BIS자기자본비율", taxonomy: "은행·신용" },
  { id: "신용경색", taxonomy: "은행·신용" },
  { id: "디레버리징", taxonomy: "은행·신용" },
  { id: "레버리지비율", taxonomy: "은행·신용" },
  { id: "기준환율", taxonomy: "외환" },
  { id: "외환보유액", taxonomy: "외환" },
  { id: "기축통화", taxonomy: "외환" },
  { id: "평가절상", taxonomy: "외환" },
  { id: "캐리트레이드", taxonomy: "외환" },
  { id: "경상수지", taxonomy: "국제경제" },
  { id: "국제수지-bop", taxonomy: "국제경제" },
  { id: "국제통화기금-imf", taxonomy: "국제경제" },
  { id: "담보인정비율-ltv", taxonomy: "부동산" },
  { id: "총부채상환비율-dti", taxonomy: "부동산" },
  { id: "총부채원리금상환비율-dsr", taxonomy: "부동산" },
  { id: "모기지대출", taxonomy: "부동산" },
  { id: "주택저당증권-mbs", taxonomy: "부동산" },
  { id: "옵션", taxonomy: "파생" },
  { id: "풋옵션", taxonomy: "파생" },
  { id: "선물거래", taxonomy: "파생" },
  { id: "VIXIndex", taxonomy: "파생" },
  { id: "가상자산", taxonomy: "디지털금융" },
  { id: "스테이블코인", taxonomy: "디지털금융" },
  { id: "블록체인", taxonomy: "디지털금융" },
  { id: "중앙은행디지털화폐-cbdc", taxonomy: "디지털금융" },
  { id: "시스템리스크", taxonomy: "금융안정" },
  { id: "글로벌금융위기", taxonomy: "금융안정" },
  { id: "그림자금융", taxonomy: "금융안정" },
  { id: "유동성함정", taxonomy: "금융안정" },
  { id: "최종대부자기능", taxonomy: "금융안정" },
  { id: "기회비용", taxonomy: "경제기초" },
];

export const TAXONOMY_ORDER: Taxonomy[] = [
  "경제기초",
  "경기·성장",
  "물가",
  "통화정책",
  "금리·채권",
  "주식",
  "기업분석",
  "은행·신용",
  "외환",
  "국제경제",
  "부동산",
  "파생",
  "디지털금융",
  "금융안정",
];

export const TAXONOMY_LABEL: Record<Taxonomy, string> = {
  경제기초: "경제 기초",
  "경기·성장": "경기·성장",
  물가: "물가",
  통화정책: "통화정책",
  "금리·채권": "금리·채권",
  주식: "주식",
  기업분석: "기업 분석",
  "은행·신용": "은행·신용",
  외환: "외환",
  국제경제: "국제 경제",
  부동산: "부동산",
  파생: "파생상품",
  디지털금융: "디지털 금융",
  금융안정: "금융 안정",
};

export interface LearningLayer {
  oneLiner: string;
  easyExplanation: string;
  whyItMatters: string;
  chain: string[];
  keyPoints?: string[];
  commonConfusions?: string[];
  reviewed: boolean;
}

export function coreIdSet(): Set<string> {
  return new Set(CORE100.map((c) => c.id));
}

export function taxonomyOf(id: string): Taxonomy | undefined {
  return CORE100.find((c) => c.id === id)?.taxonomy;
}

export function learningFor(term: { id: string; headword: string }): LearningLayer {
  const hand = CORE_COPY[term.id];
  if (hand) return { ...hand, reviewed: isPilotTerm(term.id) };
  return {
    oneLiner: "",
    easyExplanation: "",
    whyItMatters: "",
    chain: [term.headword],
    reviewed: false,
  };
}

export function isCore(id: string): boolean {
  return coreIdSet().has(id);
}

export function coreTerms(terms: Term[]): Term[] {
  const map = new Map(terms.map((t) => [t.id, t]));
  return CORE100.map((c) => map.get(c.id)).filter((t): t is Term => Boolean(t));
}

export interface ContextCase {
  id: string;
  title: string;
  era: string;
  situation: string;
  question: string;
  answerTermId: string;
  choiceIds: string[];
  why: string;
  chain: string[];
  asOf?: string;
  freshness?: "evergreen" | "dated";
  kind?: "recognize" | "interpret" | "number";
  nextToCheck?: string[];
}

export const CONTEXT_CASES: ContextCase[] = [
  {
    id: "cx-2022-cpi",
    title: "물가 발표가 예상을 웃돌았을 때",
    era: "2022년 인플레이션",
    kind: "interpret",
    situation: "미국 소비자물가 상승률이 시장 예상보다 높게 나오자, 연내 기준금리를 내릴 것이라는 기대가 하루 만에 크게 줄었습니다.",
    question: "금리 기대를 판단하려면 무엇을 먼저 같이 봐야 할까요?",
    answerTermId: "근원인플레이션율",
    choiceIds: ["근원인플레이션율", "주가수익비율-per", "담보인정비율-ltv", "공매도"],
    why: "헤드라인만 보면 에너지 가격 같은 일시 충격이 섞일 수 있습니다. 근원물가가 같이 올랐는지를 봐야 금리 기대를 판단할 수 있습니다.",
    chain: ["소비자물가", "근원물가", "기준금리", "성장주"],
    nextToCheck: ["근원물가", "기대인플레이션", "고용"],
  },
  {
    id: "cx-hike-duration",
    title: "금리 오를 때 장기 국채가 더 빠졌다",
    era: "금리 인상 구간",
    kind: "interpret",
    situation: "한국은행이 기준금리를 여러 차례 올리자, 만기 긴 국채 가격이 단기채보다 더 크게 떨어졌습니다. 증권사 리포트에는 채권평가손실 우려가 따라붙었습니다.",
    question: "보유 채권의 평가 손실 폭을 가늠하려면 무엇을 먼저 봐야 할까요?",
    answerTermId: "듀레이션",
    choiceIds: ["듀레이션", "주가수익비율-per", "담보인정비율-ltv", "GDP갭"],
    why: "금리가 오르면 채권 가격은 내립니다. 만기가 길수록, 이자를 적게 줄수록 그 폭이 커지는 경향이 있습니다.",
    chain: ["기준금리", "국채 가격", "듀레이션", "수익률곡선"],
    nextToCheck: ["만기 구성", "수익률곡선", "평가손익"],
  },
  {
    id: "cx-spread",
    title: "국채는 괜찮은데 회사채만",
    era: "신용 경계",
    kind: "interpret",
    situation: "국채 금리는 큰 변화가 없는데, 회사채 금리는 더 빠르게 올랐습니다.",
    question: "기업 조달 비용이 실제로 비싸졌는지 보려면 무엇을 봐야 할까요?",
    answerTermId: "신용스프레드",
    choiceIds: ["신용스프레드", "기준환율", "자기자본이익률-roe", "테이퍼링"],
    why: "국채 금리만 보면 놓칩니다. 국채와 회사채의 차이가 벌어져야 기업이 돈 빌리기가 비싸진 겁니다.",
    chain: ["국채", "회사채", "신용스프레드", "신용위험"],
    nextToCheck: ["등급별 스프레드", "만기 도래", "이자보상배율"],
  },
  {
    id: "cx-2008-mbs",
    title: "주택대출이 증권으로 바뀌었을 때",
    era: "2008년 금융위기",
    situation: "미국에서 주택담보대출 연체가 늘자, 그 대출을 모아 만든 증권 가격이 무너지고 은행끼리 돈을 빌려 주지 않았습니다.",
    question: "주택대출을 모아 만든 이 증권의 이름은?",
    answerTermId: "주택저당증권-mbs",
    choiceIds: ["주택저당증권-mbs", "상장지수펀드-etf", "중앙은행디지털화폐-cbdc", "주가수익비율-per"],
    why: "집 대출의 위험이 증권 시장 전체의 자금 경색으로 번진 길이 바로 이 상품입니다.",
    chain: ["주택담보대출", "MBS", "신용위험", "유동성"],
  },
  {
    id: "cx-bankrun",
    title: "예금을 한꺼번에 뺄 때",
    era: "은행 신뢰 충격",
    situation: "불안이 퍼지며 하루 만에 예금의 상당 부분이 빠져나갔고, 은행은 자산을 급히 팔아야 했습니다.",
    question: "이렇게 예금이 한꺼번에 빠져나가는 현상에 해당하는 용어는?",
    answerTermId: "뱅크런",
    choiceIds: ["뱅크런", "공매도", "스태그플레이션", "기회비용"],
    why: "은행이 당장 망해서라기보다, ‘지금 안 빼면 손해’라는 믿음이 퍼질 때 생깁니다.",
    chain: ["신뢰", "유동성", "뱅크런", "최종대부자"],
  },
  {
    id: "cx-qe-taper",
    title: "돈 푸는 속도를 줄인다고 했을 때",
    era: "양적완화 출구",
    situation: "중앙은행이 국채를 사들이던 규모를 매달 줄이겠다고 하자 장기금리가 먼저 뛰었습니다. 기준금리는 아직 그대로였습니다.",
    question: "자산 매입을 서서히 줄이는 이 조치는 무엇일까요?",
    answerTermId: "테이퍼링",
    choiceIds: ["테이퍼링", "디플레이션", "담보인정비율-ltv", "기업공개"],
    why: "금리를 올리는 것과는 다른 일입니다. 다만 시장은 ‘돈줄이 줄어든다’로 먼저 읽습니다.",
    chain: ["양적완화", "테이퍼링", "장기금리", "유동성"],
  },
  {
    id: "cx-current-account",
    title: "수출이 잘 되면 환율은",
    era: "대외 거래",
    situation: "에너지 수입이 줄고 수출이 살아나 월간 경상수지가 큰 폭 흑자를 냈다는 소식이 나왔습니다.",
    question: "외국과 물건·서비스·소득을 주고받은 결과를 나타내는 지표는?",
    answerTermId: "경상수지",
    choiceIds: ["경상수지", "재정수지", "자기자본이익률-roe", "VIXIndex"],
    why: "흑자면 외화가 들어올 압력으로 읽히지만, 환율은 금리 차와 자금 유출입도 같이 봐야 합니다.",
    chain: ["수출입", "경상수지", "환율", "외환보유액"],
  },
  {
    id: "cx-ltv",
    title: "집값 대비 대출 한도",
    era: "부동산 규제",
    situation: "정부가 투기지역 주택담보대출 한도를 낮추자, 같은 집값으로도 빌릴 수 있는 금액이 줄었습니다.",
    question: "집값의 몇 퍼센트까지 대출을 받을 수 있는지 정하는 비율은?",
    answerTermId: "담보인정비율-ltv",
    choiceIds: ["담보인정비율-ltv", "주가수익비율-per", "소비자물가지수-cpi", "기축통화"],
    why: "이 비율을 낮추면 레버리지가 줄고, 주택 수요가 바로 타격을 받습니다.",
    chain: ["집값", "LTV", "가계대출", "금리"],
  },
  {
    id: "cx-dsr",
    title: "금리가 오르니 대출 한도가 줄었다",
    era: "가계부채",
    situation: "대출금리가 오르자 같은 연봉으로도 원리금 부담이 커져, 새로 받을 수 있는 주담대 한도가 깎였습니다.",
    question: "버는 돈 대비 모든 대출 원리금을 보는 비율은?",
    answerTermId: "총부채원리금상환비율-dsr",
    choiceIds: ["총부채원리금상환비율-dsr", "GDP갭", "옵션", "블록체인"],
    why: "금리 인상이 집과 소비로 전해지는 길이 바로 이 비율입니다.",
    chain: ["금리", "원리금", "DSR", "주택 수요"],
  },
  {
    id: "cx-etf",
    title: "종목 대신 지수를 살 때",
    era: "일상 투자",
    situation: "종목을 고르기 부담스러운 투자자가 코스피를 따라가는 상품 한 주로 시장 전체에 나눠 담기로 했습니다. 증권업 리포트에도 ETF 거래대금이 따로 잡힙니다.",
    question: "이 상품을 가리키는 용어는 무엇일까요?",
    answerTermId: "상장지수펀드-etf",
    choiceIds: ["상장지수펀드-etf", "주택저당증권-mbs", "중앙은행디지털화폐-cbdc", "경기"],
    why: "시장을 한 번에 사는 도구이지, 손실이 없는 상품은 아닙니다.",
    chain: ["지수", "ETF", "분산", "거래대금"],
  },
  {
    id: "cx-liquidity",
    title: "가격은 있는데 안 팔린다",
    era: "시장 경색",
    situation: "채권 호가는 떠 있지만 실제 체결이 거의 없고, 조금만 팔아도 가격이 크게 밀립니다.",
    question: "이 상황에서 먼저 무너진 것은?",
    answerTermId: "유동성",
    choiceIds: ["유동성", "인플레이션", "기회비용", "블록체인"],
    why: "흔들릴 때는 값이 얼마냐보다, 지금 현금으로 바꿀 수 있느냐가 먼저 사라집니다.",
    chain: ["호가", "체결", "유동성", "신용경색"],
  },
  {
    id: "cx-base-rate",
    title: "한은이 금리를 동결했다",
    era: "국내 통화정책",
    situation: "금융통화위원회가 기준금리를 동결하며, 물가는 꺾이는 중이나 가계부채와 환율도 같이 보겠다고 했습니다.",
    question: "한국은행이 운용하는 이 정책금리의 이름은?",
    answerTermId: "기준금리",
    choiceIds: ["기준금리", "주가수익비율-per", "담보인정비율-ltv", "VIXIndex"],
    why: "동결도 결정입니다. 다음에 내릴지 올릴지 기대가 시장금리에 남습니다.",
    chain: ["물가", "기준금리", "시장금리", "가계부채"],
  },
  {
    id: "cx-stagflation",
    title: "물가는 오르고 경기는 식는다",
    era: "스태그플레이션 논쟁",
    situation: "에너지 가격 충격으로 소비자물가는 고공행진인데, 성장률과 고용은 동시에 약해졌습니다.",
    question: "이 조합을 가리키는 용어는 무엇일까요?",
    answerTermId: "스태그플레이션",
    choiceIds: ["스태그플레이션", "골디락스경제", "양적완화정책", "공매도"],
    why: "성장과 물가가 같은 방향으로 안 움직이면, 금리 하나로 둘 다 고치기 어렵습니다.",
    chain: ["공급 충격", "인플레이션", "성장 둔화", "스태그플레이션"],
  },
  {
    id: "cx-carry",
    title: "싼 돈으로 다른 나라 자산에",
    era: "환율·금리 차",
    situation: "일본 금리가 매우 낮을 때 엔화를 빌려 금리가 높은 달러 자산에 넣는 거래가 늘었습니다. 엔화가 급등하자 포지션이 한꺼번에 정리됐습니다.",
    question: "금리가 낮은 통화로 빌려, 금리가 높은 자산에 넣는 이 거래는?",
    answerTermId: "캐리트레이드",
    choiceIds: ["캐리트레이드", "뱅크런", "상장지수펀드-etf", "총부채원리금상환비율-dsr"],
    why: "금리 차와 환율이 동시에 움직이면, 들어가던 돈이 한순간에 빠져나갑니다.",
    chain: ["금리 차", "환율", "캐리트레이드", "위험 회피"],
  },
  {
    id: "cx-vix",
    title: "공포가 숫자로 나올 때",
    era: "증시 변동성",
    situation: "주가지수가 급락한 날, 옵션 가격으로 만든 변동성 지수가 뛰며 ‘공포 지수’ 기사가 쏟아졌습니다.",
    question: "미국 주식의 변동성 기대를 나타내는 대표 지수는?",
    answerTermId: "VIXIndex",
    choiceIds: ["VIXIndex", "소비자물가지수-cpi", "자기자본이익률-roe", "담보인정비율-ltv"],
    why: "앞으로 얼마나 출렁일지에 대한 가격이지, 오를지 내릴지를 알려 주지는 않습니다.",
    chain: ["옵션", "변동성", "VIX", "위험 회피"],
  },
  {
    id: "cx-unemployment",
    title: "일자리가 식으면 금리는",
    era: "고용과 통화정책",
    situation: "실업률이 예상보다 빠르게 오르자, 시장은 중앙은행이 인상을 멈출 가능성을 더 높게 보기 시작했습니다.",
    question: "고용 시장의 온도를 한 숫자로 보는 이 지표는?",
    answerTermId: "실업률",
    choiceIds: ["실업률", "신용스프레드", "중앙은행디지털화폐-cbdc", "주가수익비율-per"],
    why: "고용이 식으면 수요 쪽 물가 압력도 꺾인다고 봐서, 금리 기대가 바뀝니다. 한 달 숫자만으로 단정하진 않습니다.",
    chain: ["고용", "실업률", "수요", "기준금리"],
  },
  {
    id: "cx-fx-reserve",
    title: "환율이 급할 때 꺼내 쓰는 돈",
    era: "환율 급등",
    situation: "원화가 빠르게 약해지자, 당국이 갖고 있던 외화로 달러 유동성을 공급했다는 해석이 나왔습니다.",
    question: "이런 대응의 밑천이 되는 외화 자산 규모는 무엇일까요?",
    answerTermId: "외환보유액",
    choiceIds: ["외환보유액", "본원통화", "공매도", "기회비용"],
    why: "대외 충격을 받아 내는 완충이지, 무한히 쓸 수 있는 재원은 아닙니다.",
    chain: ["환율", "외환보유액", "신뢰", "금리 차"],
  },
  {
    id: "cx-leverage",
    title: "같은 자본으로 더 크게",
    era: "빚과 수익",
    situation: "금리가 낮던 시기 기업들이 빚을 늘려 투자했고, 금리가 오르자 이자 부담이 이익을 빠르게 잠식했습니다.",
    question: "자기자본 대비 부채를 얼마나 쓰는지 볼 때 자주 쓰는 비율은?",
    answerTermId: "레버리지비율",
    choiceIds: ["레버리지비율", "소비자물가지수-cpi", "상장지수펀드-etf", "기축통화"],
    why: "좋을 때는 수익을 키우고, 나쁠 때는 생존을 위협합니다.",
    chain: ["부채", "자기자본", "레버리지", "이자보상"],
  },
  {
    id: "cx-core-cpi",
    title: "식료품·에너지를 빼고 보니",
    era: "물가의 질",
    kind: "interpret",
    situation: "전체 소비자물가는 에너지 때문에 올랐지만, 변동이 큰 항목을 뺀 지수는 더디게 내려갔습니다.",
    question: "일시 충격인지 끈질긴 물가인지를 가리려면 무엇을 같이 봐야 할까요?",
    answerTermId: "근원인플레이션율",
    choiceIds: ["근원인플레이션율", "재정수지", "주택저당증권-mbs", "블록체인"],
    why: "헤드라인과 근원의 차이가 바로 그 구분입니다. 근원이 안 내려오면 금리 인하 기대가 약해질 수 있습니다.",
    chain: ["헤드라인 물가", "근원 물가", "기준금리", "기대"],
    nextToCheck: ["근원물가", "기대인플레이션", "임금"],
  },
  {
    id: "cx-real-rate",
    title: "이자는 올랐는데 실질은",
    era: "명목과 실질",
    situation: "예금 금리가 올랐지만 물가가 더 빨리 올라, 이자를 받아도 구매력은 오히려 줄었다는 이야기가 나왔습니다.",
    question: "뉴스에 나오는 ‘금리’가 대개 가리키는, 물가를 빼기 전 숫자는?",
    answerTermId: "명목금리",
    choiceIds: ["명목금리", "뱅크런", "공매도", "중앙은행디지털화폐-cbdc"],
    why: "뉴스의 금리는 대개 명목입니다. 실제로 얼마나 남았는지는 물가를 빼고 봐야 합니다.",
    chain: ["명목금리", "인플레이션", "실질금리", "소비"],
  },
  {
    id: "cx-lender-last",
    title: "시장이 멈췄을 때 중앙은행",
    era: "위기 대응",
    situation: "은행끼리 돈을 빌려 주지 않자, 중앙은행이 유동성을 공급해 지급결제가 돌아가게 했습니다.",
    question: "위기 때 마지막 자금 공급자 역할을 가리키는 용어는?",
    answerTermId: "최종대부자기능",
    choiceIds: ["최종대부자기능", "기업공개", "주가수익비율-per", "담보인정비율-ltv"],
    why: "망한 은행을 살려 주는 역할이라기보다, 일시적으로 현금이 마른 시장을 열어 주는 역할에 가깝습니다.",
    chain: ["유동성 고갈", "최종대부자", "신뢰", "시스템 리스크"],
  },
  {
    id: "cx-yield-curve",
    title: "짧은 금리가 긴 금리보다 높다",
    era: "장단기 금리",
    kind: "interpret",
    situation: "단기 시장금리가 장기 국채 금리를 웃돌자, 경기 둔화 신호로 읽는 리포트가 늘었습니다.",
    question: "이 신호를 과대해석하지 않으려면, 다음으로 무엇을 확인하는 게 나을까요?",
    answerTermId: "경기종합지수",
    choiceIds: ["경기종합지수", "지니계수", "블록체인", "공매도"],
    why: "곡선이 뒤집히면 둔화 기대로 읽히지만 만능 예고는 아닙니다. 고용·생산 같은 실물 지표와 같이 봐야 합니다.",
    chain: ["단기금리", "장기금리", "수익률곡선", "경기"],
    nextToCheck: ["동행지수", "실업률", "소매판매"],
  },
  {
    id: "cx-ai-capex",
    title: "서버를 먼저 사고 나중에 회수할 때",
    era: "AI·클라우드 투자",
    kind: "interpret",
    situation: "클라우드 회사가 서버를 사서 시간 단위로 빌려주는 구조라, AI 수요가 늘자 설비투자가 이익보다 먼저 뛰었다는 증권사 분석이 나왔습니다. 지금은 흑자여도 당장 쓸 현금은 빠듯해 보였습니다.",
    question: "관련 장비 기업의 실적 반영 시점을 보려면 무엇을 먼저 구분해야 할까요?",
    answerTermId: "rpt-ramp",
    choiceIds: ["rpt-ramp", "주가수익비율-per", "담보인정비율-ltv", "기회비용"],
    why: "CAPEX가 늘어도 증설인지 교체인지, 언제 가동되는지(Ramp-up)를 모르면 내년 실적을 확정할 수 없습니다.",
    chain: ["AI 수요", "CAPEX", "Ramp-up", "가동률"],
    nextToCheck: ["증설 vs 전환투자", "Ramp-up", "가동률"],
  },
  {
    id: "cx-defi-cbdc",
    title: "중앙은행이 만드는 디지털 돈",
    era: "디지털 화폐 논의",
    situation: "현금 사용이 줄어드는 가운데, 민간 스테이블코인과 별도로 중앙은행이 직접 발행하는 디지털 화폐 실험이 이어졌습니다.",
    question: "이 공적 디지털 화폐를 가리키는 용어는 무엇일까요?",
    answerTermId: "중앙은행디지털화폐-cbdc",
    choiceIds: ["중앙은행디지털화폐-cbdc", "상장지수펀드-etf", "주택저당증권-mbs", "듀레이션"],
    why: "지급 수단과 금융 안정 설계의 문제이지, 단기 테마로만 읽으면 핵심이 빠집니다.",
    chain: ["법정화폐", "지급결제", "CBDC", "스테이블코인"],
  },
  {
    id: "cx-cb-repay",
    title: "전환사채를 미리 갚았을 때",
    era: "기업 코멘트",
    situation: "한 화장품 회사가 자회사 전환사채를 조기에 상환해 재무적 투자자를 내보내자, 중복상장 우려가 줄었다는 리포트가 나왔습니다. 대신 은행 차입으로 자금을 댔습니다.",
    question: "나중에 주식으로 바꿀 수 있는 이 회사채는 무엇일까요?",
    answerTermId: "전환사채-cb",
    choiceIds: ["전환사채-cb", "상장지수펀드-etf", "담보인정비율-ltv", "경상수지"],
    why: "리포트의 CB입니다. 조기 상환은 희석·IPO 의무를 걷어 내기도 하지만, 차입 구조가 바뀝니다.",
    chain: ["전환사채", "조기상환", "차입", "주식 희석"],
  },
  {
    id: "cx-shareholder-return",
    title: "배당을 더 주겠다고 했을 때",
    era: "밸류업",
    kind: "interpret",
    situation: "한 보험사가 밸류업 정책으로 이익의 더 많은 부분을 배당으로 돌리겠다고 밝히자, 목표주가를 올리는 리포트가 나왔습니다.",
    question: "이 발표만으로 주주 가치가 실제로 올랐다고 보기 전에, 무엇을 확인하는 게 나을까요?",
    answerTermId: "자기자본이익률-roe",
    choiceIds: ["자기자본이익률-roe", "뱅크런", "근원인플레이션율", "기축통화"],
    why: "환원 확대는 회사 계획입니다. 이익이 유지되는지를 봐야 배당이 지속 가능한지 판단할 수 있습니다.",
    chain: ["이익", "배당", "자사주", "주주환원"],
    nextToCheck: ["실제 배당·자사주 집행", "소각 여부", "이익 지속성"],
  },
  {
    id: "cx-put-option",
    title: "조기 상환을 요구할 수 있는 권리",
    era: "투자 계약",
    situation: "전환사채 계약에 투자자가 정해 둔 조건으로 조기 상환을 요구할 수 있는 권리가 붙어 있어, 회계상 파생상품 부채로 잡혀 있었습니다.",
    question: "정해 둔 가격에 팔 수 있는 이 권리는 무엇일까요?",
    answerTermId: "풋옵션",
    choiceIds: ["풋옵션", "공매도", "국내총생산-gdp", "예금보험제도"],
    why: "사야 하는 의무가 아니라 팔 수 있는 권리입니다. 회사 입장에서는 언제 돈이 나갈지 모르는 부담이 됩니다.",
    chain: ["옵션", "풋옵션", "조기상환", "파생부채"],
  },
  {
    id: "cx-eps-valuation",
    title: "목표주가가 바뀌는 이유",
    era: "기업 리포트",
    situation: "리포트 첫 장에 목표주가와 현재주가가 나란히 적혀 있습니다. 애널리스트가 이익 추정치를 올리자 목표주가도 따라 올랐습니다.",
    question: "회사 이익을 주식 수로 나눈, 한 주당 얼마를 벌었는지를 나타내는 숫자는?",
    answerTermId: "주당순이익-eps",
    choiceIds: ["주당순이익-eps", "실업률", "외환보유액", "스테이블코인"],
    why: "목표주가는 대개 ‘주당 이익 × 배수’로 나옵니다. 이익 추정치가 바뀌면 목표가도 바뀝니다.",
    chain: ["순이익", "EPS", "PER", "목표주가"],
  },
  {
    id: "cx-ktb-securities",
    title: "국고채 금리가 오르면 증권사는",
    era: "증권업 리포트",
    situation: "8월 국고채 3년·10년 금리가 오르자, 증권업 리포트는 거래대금 감소와 함께 채권평가손실을 걱정했습니다. 다만 상승 폭이 과거보다 작아 손실은 우려보다 작을 수 있다고 봤습니다.",
    question: "국고채가 속하는, 정부가 발행하는 이 채권은 무엇일까요?",
    answerTermId: "국채",
    choiceIds: ["국채", "가상자산", "모기지대출", "핀테크"],
    why: "국고채 금리가 오르면 이미 들고 있던 채권의 평가 가격은 내립니다. 증권사 실적 이야기의 단골입니다.",
    chain: ["국채", "금리", "채권 가격", "평가손익"],
  },
  {
    id: "cx-yoy-ytd",
    title: "한 달 성장률과 올해 누적이 다를 때",
    era: "숫자 읽기",
    kind: "number",
    situation: "어느 달 수출이 전년 같은 달보다 크게 늘었는데, 올해 1월부터 모은 증가율은 그보다 낮았습니다. 표에 YoY와 YTD가 나란히 적혀 있었습니다.",
    question: "한 달만 크게 늘었다고 올해 내내 그 속도였다고 단정해도 될까요? 두 숫자가 다른 이유는?",
    answerTermId: "rpt-base",
    choiceIds: ["rpt-base", "rpt-mom", "rpt-ow", "기회비용"],
    why: "YoY는 작년 같은 달, YTD는 올해 누적입니다. 한 달이 좋아도 앞부분이 약하면 누적은 낮습니다. 기저효과도 같이 봅니다.",
    chain: ["YoY", "YTD", "기저효과"],
    nextToCheck: ["절대 수출액", "이전 월 흐름", "기저효과"],
    freshness: "evergreen",
  },
  {
    id: "cx-full-capa",
    title: "선두 공장이 꽉 찼을 때",
    era: "공급 제약",
    kind: "interpret",
    situation: "주문이 늘었는데 상위 위탁생산 업체의 생산일정이 이미 꽉 찼습니다. 납기가 늘어나자 고객이 물량을 미리 잡으려 하고, 여력이 있는 다른 업체로 주문이 옮겨 갈 수 있다는 분석이 나왔습니다.",
    question: "선두 공장이 꽉 찬 뒤, 실적 수혜 시점을 보려면 무엇을 먼저 봐야 할까요?",
    answerTermId: "rpt-lead",
    choiceIds: ["rpt-lead", "rpt-upside", "뱅크런", "담보인정비율-ltv"],
    why: "Full Capa는 끝이 아닙니다. 납기(리드타임)가 늘어나면 선주문과 낙수가 시작됩니다.",
    chain: ["수요", "CAPA", "리드타임", "낙수"],
    nextToCheck: ["리드타임", "선주문", "후순위 여력"],
    freshness: "evergreen",
  },
  {
    id: "cx-product-mix",
    title: "대수는 비슷한데 이익이 빠질 때",
    era: "실적 분해",
    kind: "interpret",
    situation: "전체 판매 대수는 크게 안 줄었는데, 수익성이 높은 차종의 비중이 줄었다는 코멘트가 나왔습니다. 리포트는 매출보다 마진을 걱정했습니다.",
    question: "대수가 비슷한데도 이익이 빠질 수 있다면, 무엇을 먼저 의심해야 할까요?",
    answerTermId: "rpt-mix",
    choiceIds: ["rpt-mix", "rpt-yoy", "외환보유액", "블록체인"],
    why: "판매량만 보면 실적을 놓칩니다. 무엇을 팔았는지(믹스)와 단가가 마진을 가릅니다.",
    chain: ["판매량", "믹스", "ASP", "마진"],
    nextToCheck: ["제품 믹스", "ASP", "영업이익률"],
    freshness: "evergreen",
  },
];
