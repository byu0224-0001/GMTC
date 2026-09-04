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

export type DrillKind = "recall" | "contrast" | "cloze";

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
