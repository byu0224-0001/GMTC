import type { Term } from "../types";
import { CORE_COPY } from "./coreCopy";

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
  if (hand) return { ...hand, reviewed: false };
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

/**
 * 본문에서 실제로 확인된 사실을 먼저 묻는 문제.
 * 개념을 몰라도 문장을 정확히 읽으면 풀 수 있어야 하고,
 * 문장에 없는 내용을 끌어와 답하게 만들지 않는다.
 */
export interface ContextFactQuestion {
  question: string;
  choices: { id: string; label: string }[];
  answerId: string;
  why: string;
}

export interface ContextCase {
  id: string;
  title: string;
  era: string;
  /**
   * 경제기사·증권사 리포트에서 접할 만한 밀도의 학습 문단. 180~350자.
   * 실제 기사를 옮긴 것이 아니라 학습용으로 지어낸 상황이다.
   */
  situation: string;
  /** 본문에서 실제로 확인된 사실을 묻는 앞 문제. 필요할 때만 쓴다. */
  fact?: ContextFactQuestion;
  /**
   * 두 번째 문제가 요구하는 읽기 방식.
   *  name  이 상황을 가리키는 개념의 이름
   *  cause 왜 이런 변화가 나타났는지
   *  next  이 해석을 확인하려면 무엇을 더 봐야 하는지
   *
   * 32편을 모두 같은 틀로 만들면 사용자가 본문이 아니라 형식을 외운다.
   * 세 방식을 섞어 두고 화면에도 어떤 방식인지 적는다.
   */
  lens: "name" | "cause" | "next";
  /** 이 상황을 설명하는 개념을 묻는 문제. */
  question: string;
  answerTermId: string;
  choiceIds: string[];
  why: string;
  chain: string[];
  /** 본문에 나온 핵심 용어. 눌러서 사전으로 간다. */
  termIds?: string[];
  asOf?: string;
  freshness?: "evergreen" | "dated";
  kind?: "recognize" | "interpret" | "number";
  nextToCheck?: string[];
}

/**
 * 읽기 사례는 내용이 길어 별도 파일에 둔다.
 * 학습 세션의 `짧은 상황에 적용` 문제도 이 사례를 그대로 쓴다.
 */
export { READING_CASES as CONTEXT_CASES } from "./readingCases";
