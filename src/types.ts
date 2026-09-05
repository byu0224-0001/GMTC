export type ChoBucket =
  | "ㄱ" | "ㄲ" | "ㄴ" | "ㄷ" | "ㄸ" | "ㄹ" | "ㅁ" | "ㅂ" | "ㅃ"
  | "ㅅ" | "ㅆ" | "ㅇ" | "ㅈ" | "ㅉ" | "ㅊ" | "ㅋ" | "ㅌ" | "ㅍ" | "ㅎ" | "ABC";

export type Category =
  | "통화정책" | "실물경제" | "금융시장" | "금융안정"
  | "지급결제" | "국제금융" | "제도·규제" | "가계·부동산";

export type Taxonomy =
  | "경제기초" | "경기·성장" | "물가" | "통화정책" | "금리·채권"
  | "주식" | "기업분석" | "은행·신용" | "외환" | "국제경제"
  | "부동산" | "파생" | "디지털금융" | "금융안정";

export type Priority = "core" | "essential" | "full";

export interface Term {
  id: string;
  headword: string;
  pairHeadwords: string[];
  aliases: string[];
  enName: string | null;
  abbr: string | null;
  cho: ChoBucket;
  definition: string;
  shortDef: string;
  relatedIds: string[];
  category: Category;
  difficulty: number;
  source: { pdf: string; page: number | null };
  priority: Priority;
  taxonomy?: Taxonomy;
  oneLiner: string;
  easyExplanation: string;
  whyItMatters: string;
  chain: string[];
  keyPoints: string[];
  commonConfusions: string[];
  learningReviewed: boolean;
}

export interface TermsFile {
  version: number;
  source: string;
  sourceTitle: string;
  count: number;
  terms: Omit<Term, "priority" | "taxonomy" | "oneLiner" | "easyExplanation" | "whyItMatters" | "chain" | "keyPoints" | "commonConfusions" | "learningReviewed">[];
}

export type GradeLabel = "again" | "hard" | "good";

export interface SrsCard {
  termId: string;
  ease: number;
  interval: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastQuality: 1 | 3 | 4 | null;
  updatedAt: string;
  /** 맞힌 날(KST). 같은 날 여러 번 맞혀도 하루로 센다. */
  successDates: string[];
  /** 맞힌 문제 형태. 한 형태만 반복해서 맞힌 것을 익숙함으로 세지 않기 위해 쓴다. */
  successForms: RetrievalForm[];
}

export interface ContextStat {
  seen: number;
  correct: number;
  lastAt: string;
}

export interface ProgressState {
  /** localStorage 스키마. 올리면 loadProgress에서 이전 버전을 이관한다. */
  version: number;
  displayName: string;
  cards: Record<string, SrsCard>;
  contextStats: Record<string, ContextStat>;
  seenContextIds: string[];
  streakDays: number;
  lastStudyDate: string | null;
  briefingAttempts?: BriefingAttempt[];
  lastBriefingDate?: string | null;
  /** 오늘 권장 분량을 마친 날(KST). 홈이 완료 상태로 바뀌는 기준이다. */
  defaultDoneDate: string | null;
  /** 날짜별 추가 세션 횟수. 권장 분량과 자율 학습을 구분해서 센다. */
  extraSessions: Record<string, number>;
  /** 첫 화면 안내를 본 시각. null이면 온보딩을 보여 준다. */
  onboardedAt: string | null;
  /** 알림 허용을 물어본 적이 있는지. 거절한 사람에게 반복해서 묻지 않는다. */
  pushAskedAt: string | null;
  /** 권장 분량을 마친 날의 수. 알림을 물어볼 시점을 정하는 데 쓴다. */
  doneSessions: number;
}

export interface BriefingAttempt {
  briefingId: string;
  startedAt: string;
  completedAt?: string;
  questionsAnswered: number;
  correctAnswers: number;
  results: { index: number; depth?: string; correct: boolean }[];
}

export interface McqItem {
  id: string;
  termId: string;
  prompt: string;
  choices: { id: string; termId: string; label: string }[];
  answerId: string;
}

export type ClaimType =
  | "fact"
  | "company_guidance"
  | "analyst_estimate"
  | "analyst_thesis"
  | "valuation_opinion";

export type Freshness = "evergreen" | "semi" | "dated";

export interface ReportTerm {
  id: string;
  headword: string;
  abbr: string | null;
  aliases: string[];
  easyExplanation: string;
  whyItMatters: string;
  reportUsage: string;
  chain: string[];
  relatedBokIds: string[];
  freshness: Freshness;
}

export interface ReasoningPattern {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  trap: string;
  question: string;
  choices: { id: string; label: string }[];
  answerId: string;
  why: string;
}

export interface ClaimCase {
  id: string;
  title: string;
  asOf: string;
  situation: string;
  question: string;
  choices: { id: ClaimType; label: string }[];
  answerType: ClaimType;
  why: string;
  nextToCheck?: string[];
}

/**
 * 학습이 요구하는 인지 형태. 보기 선택은 화면 방식이므로 여기에 넣지 않는다.
 *  recognition 용어 → 뜻 / recall 뜻 → 용어 / contrast 비슷한 개념 구분
 *  judgment 흔한 오해 판단 / context 짧은 상황에 적용
 */
export type RetrievalForm = "recognition" | "recall" | "contrast" | "judgment" | "context";

export type DrillKind = RetrievalForm;

export interface DrillItem {
  kind: DrillKind;
  termId: string;
  prompt: string;
  caption: string;
  choices: { id: string; termId: string; label: string }[];
  answerId: string;
  note: string;
}

export type BriefingBlock =
  | { type: "p"; text: string }
  | {
      type: "cloze";
      before: string;
      after: string;
      question: string;
      answerId: string;
      choiceIds: string[];
      note: string;
    }
  | {
      type: "choice";
      question: string;
      answerId: string;
      choices: { id: string; label: string }[];
      note: string;
      depth: "term" | "number" | "cause" | "next";
    }
  | { type: "causal"; title: string; chain: string[]; extra?: string }
  | { type: "concepts"; ids: string[] };

export interface LearningBriefing {
  id: string;
  kicker: string;
  asOf?: string;
  minutes: number;
  headline: string;
  subtitle: string;
  blocks: BriefingBlock[];
  primaryTermIds: string[];
  supportTermIds?: string[];
  relatedTermIds?: string[];
  sourceMode: "official" | "synthetic";
  contentMode?: "synthetic" | "real_event";
  sourceRefs: { label: string; url?: string }[];
  eventDate?: string | null;
  evergreen?: boolean;
  learningObjectives?: string[];
  difficulty?: "intro" | "core" | "advanced";
  reviewStatus?: "draft" | "reviewed" | "published";
}
