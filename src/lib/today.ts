import { REPORT_BOK_CANON, REPORT_ESSENTIALS, canonBokId, reportToTerm } from "../content/reportLexicon";
import { briefingForPlan, type TodayPlanFile } from "./todayPlan";
import { learningPool, topicOrder, type Pool } from "./pool";
import type { LearningBriefing } from "../types";
import type { ProgressState, Term } from "../types";
import { GRADUATE_REPETITIONS, familiarRule, isDue, isGraduated, kstDateKey } from "./srs";
import { choOf } from "./hangul";
import { formsFor, seededShuffle } from "./quiz";

/**
 * 하루 신규 개수.
 *
 * 졸업이 있는 사다리에서 정상 상태 복습량은 (신규) x (졸업까지 복습 횟수)로 고정된다.
 * 신규 2개 x 3회 = 6개이고, 여기에 신규 학습을 더하면 8분 안쪽이다.
 * 3개로 올리면 복습 요구가 하루 9개가 되어 5~10분을 넘긴다(scripts/sim-srs.mjs).
 */
export const NEW_PER_DAY = 2;
/**
 * 권장 세션의 시간 예산(분).
 *
 * 복습 개수를 고정 상한으로 두면 며칠 쉬고 돌아온 사람의 밀림이 풀리지 않는다.
 * 신규를 줄인 날은 그만큼 복습을 더 태워야 한다. 그래서 개수가 아니라 예산으로 정한다.
 * 8.6분은 신규 2개(3.7분) + 복습 6개(4.8분)가 들어가는 최소값이다. 이보다 낮추면
 * 매일 쓰는 사람도 정상 상태에서 밀리기 시작한다(scripts/sim-personas.mjs).
 */
export const DEFAULT_BUDGET_MINUTES = 8.6;
export const MIN_REVIEW_CAP = 4;
/** 복습이 밀리면 신규를 줄이고, 더 밀리면 아예 멈춘다. */
export const BACKLOG_THROTTLE = 2;
export const BACKLOG_STOP = 4;
export const TAXONOMY_SESSION_CAP = 8;
export const REPORT_SESSION_CAP = 6;
/** 리포트 표현이 하루를 다 차지하지 않게 한다. */
const REPORT_NEW_PER_DAY = 1;

export type SessionStep =
  | { kind: "new"; term: Term }
  | { kind: "first_recall"; term: Term }
  | { kind: "recall"; term: Term }
  /** 복습일이 오지 않은 카드를 미리 보는 단계. 일정을 앞당기지 않는다. */
  | { kind: "practice"; term: Term };

export type SessionSource = "home_default" | "extra";

/** 항목당 대략적인 소요 시간(분). estimateMinutes와 같은 계수를 쓴다. */
export const STEP_COST: Record<SessionStep["kind"], number> = {
  new: 1.15,
  first_recall: 0.7,
  recall: 0.8,
  practice: 0.8,
};

/** 추가 세션 기본 예산. `5분 더`라는 문구와 같은 값이어야 한다. */
export const EXTRA_BUDGET_MINUTES = 5;
/**
 * 추가 세션으로 하루에 더 시작할 수 있는 신규의 총량.
 *
 * 세션 회차마다 허용하면 주말에 몰아서 하는 사람이 하루에 10개를 시작하고, 신규 1개마다
 * 앞으로 복습 3개가 예약되므로 평일에 밀림이 쏟아진다. 그래서 회차가 아니라 하루로 막는다
 * (scripts/sim-personas.mjs 페르소나 C).
 */
export const EXTRA_NEW_DAILY_CAP = 2;

/** 오늘 처음 시작한 용어 수. 카드의 첫 정답 날짜로 센다. */
export function newStartedToday(terms: Term[], progress: ProgressState, now = new Date()): number {
  const today = kstDateKey(now);
  return studyCandidates(terms).filter((t) => progress.cards[t.id]?.successDates[0] === today)
    .length;
}

export function lessonPool(terms: Term[]): Term[] {
  const report = REPORT_ESSENTIALS.filter((r) => !REPORT_BOK_CANON[r.id]).map((r) => ({
    ...reportToTerm(r),
    cho: choOf(r.headword),
  }));
  const extras = Object.values(REPORT_BOK_CANON)
    .map((id) => terms.find((t) => t.id === id))
    .filter((t): t is Term => Boolean(t));
  const map = new Map<string, Term>();
  for (const t of [...terms, ...extras, ...report]) map.set(t.id, t);
  return [...map.values()];
}

export function resolveLessonTerm(id: string, pool: Term[]): Term | undefined {
  return pool.find((t) => t.id === canonBokId(id));
}

interface Candidates {
  terms: Term[];
  pool: Pool;
}

let candidateCache: { key: Term[]; value: Candidates } | null = null;

/**
 * 학습 세션에 들어갈 수 있는 용어.
 * 한국은행 787개 전부가 아니라 문항이 성립하는 것만 통과한다(lib/pool.ts).
 * 리포트 표현 30개는 자체 원고가 있어 전부 포함한다.
 */
function candidatesOf(terms: Term[]): Candidates {
  if (candidateCache && candidateCache.key === terms) return candidateCache.value;
  const pool = learningPool(terms);
  const byId = new Map(terms.map((t) => [t.id, t]));
  const out: Term[] = [];
  for (const id of pool.ids) {
    const t = byId.get(id);
    if (t) out.push(t);
  }
  for (const r of REPORT_ESSENTIALS) {
    if (REPORT_BOK_CANON[r.id]) continue;
    out.push({ ...reportToTerm(r), cho: choOf(r.headword) });
  }
  const value = { terms: out, pool };
  candidateCache = { key: terms, value };
  return value;
}

export function studyCandidates(terms: Term[]): Term[] {
  return candidatesOf(terms).terms;
}

function isReportTerm(id: string): boolean {
  return id.startsWith("rpt-");
}

function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function topicKey(pool: Pool, t: Term): string {
  return pool.byId.get(t.id)?.topic ?? t.taxonomy ?? "기타";
}

/**
 * 분야를 돌아가며 신규를 뽑는다. 완전 균등 랜덤은 쓰지 않는다.
 *  - 씨앗에서 가까운 용어(CORE100의 자체 원고)를 먼저 쓴다
 *  - 하루 안에서 같은 분야가 겹치지 않게 한다
 *  - 시작 분야를 날마다 돌려 며칠 연속 같은 분야가 나오지 않게 한다
 *  - 리포트 표현은 하루 1개까지
 */
export function pickNewTerms(
  terms: Term[],
  progress: ProgressState,
  n: number,
  dateKey: string,
): Term[] {
  if (n <= 0) return [];
  const { terms: candidates, pool } = candidatesOf(terms);
  const unseen = candidates.filter((t) => !progress.cards[t.id]);
  if (unseen.length === 0) return [];

  const seed = dayIndex(dateKey);
  const buckets = new Map<string, Term[]>();
  for (const t of unseen) {
    const key = topicKey(pool, t);
    const arr = buckets.get(key) ?? [];
    arr.push(t);
    buckets.set(key, arr);
  }
  const hopOf = (t: Term) => pool.byId.get(t.id)?.hop ?? 9;
  for (const [key, arr] of buckets) {
    // 자체 원고가 있는 CORE100을 먼저, 같은 등급 안에서는 날짜로 섞는다.
    buckets.set(key, seededShuffle(arr, seed + key.length + 1).sort((a, b) => hopOf(a) - hopOf(b)));
  }

  const order = topicOrder().filter((k) => buckets.has(k)) as string[];
  for (const k of buckets.keys()) if (!order.includes(k)) order.push(k);
  if (order.length === 0) return [];
  const offset = ((seed % order.length) + order.length) % order.length;
  const rotated = [...order.slice(offset), ...order.slice(0, offset)];

  const out: Term[] = [];
  let reportUsed = 0;
  for (let round = 0; out.length < n && round < 60; round += 1) {
    let moved = false;
    for (const key of rotated) {
      if (out.length >= n) break;
      const arr = buckets.get(key);
      if (!arr?.length) continue;
      const idx = arr.findIndex((t) => !isReportTerm(t.id) || reportUsed < REPORT_NEW_PER_DAY);
      if (idx < 0) continue;
      const [t] = arr.splice(idx, 1);
      if (isReportTerm(t.id)) reportUsed += 1;
      out.push(t);
      moved = true;
    }
    if (!moved) break;
  }
  return out;
}

/** 신규를 줄인 날은 남은 예산을 복습에 돌린다. */
export function reviewCap(newCount: number): number {
  const left = DEFAULT_BUDGET_MINUTES - newCount * (STEP_COST.new + STEP_COST.first_recall);
  return Math.max(MIN_REVIEW_CAP, Math.floor(left / STEP_COST.recall));
}

export function pickReviewTerms(
  terms: Term[],
  progress: ProgressState,
  freshIds: Set<string>,
  cap = reviewCap(NEW_PER_DAY),
): Term[] {
  return studyCandidates(terms)
    .filter((t) => {
      const card = progress.cards[t.id];
      return card && !freshIds.has(t.id) && isDue(card);
    })
    .sort((a, b) => (progress.cards[a.id].dueAt > progress.cards[b.id].dueAt ? 1 : -1))
    .slice(0, cap);
}

/** 오늘 예산으로 소화할 수 없어 넘긴 복습 수. 신규를 줄일지 판단하는 데 쓴다. */
export function dueBacklog(terms: Term[], progress: ProgressState): number {
  const due = studyCandidates(terms).filter((t) => {
    const card = progress.cards[t.id];
    return card && isDue(card);
  }).length;
  return Math.max(0, due - reviewCap(NEW_PER_DAY));
}

export function newPerDay(terms: Term[], progress: ProgressState): number {
  const backlog = dueBacklog(terms, progress);
  if (backlog >= BACKLOG_STOP) return 0;
  if (backlog >= BACKLOG_THROTTLE) return 1;
  return NEW_PER_DAY;
}

/**
 * 오늘 세션. 용어만 담는다.
 * 읽기는 `읽기` 탭이 맡고 세션 시간에 넣지 않는다.
 * 읽기까지 매일 세션에 넣으면 용어 예산이 거의 남지 않는다(scripts/sim-srs.mjs).
 */
export function todayQueue(
  terms: Term[],
  progress: ProgressState,
  _plan?: TodayPlanFile,
  now = new Date(),
): SessionStep[] {
  void _plan;
  const dateKey = kstDateKey(now);
  const n = newPerDay(terms, progress);
  const fresh = pickNewTerms(terms, progress, n, dateKey);
  const freshIds = new Set(fresh.map((t) => t.id));
  const review = pickReviewTerms(terms, progress, freshIds, reviewCap(fresh.length));
  return [
    ...fresh.map((term) => ({ kind: "new" as const, term })),
    ...fresh.map((term) => ({ kind: "first_recall" as const, term })),
    ...review.map((term) => ({ kind: "recall" as const, term })),
  ];
}

/**
 * 추가 세션.
 *
 * 홈의 권장 분량과 경쟁하지 않아야 하므로 순서를 반대로 잡는다.
 * 권장 세션은 신규가 먼저지만, 추가 세션은 밀린 복습 → 다시 보기 → 신규 순이다.
 * 개수를 정해 놓지 않고 시간 예산을 greedy하게 채운다.
 */
export function extraQueue(
  terms: Term[],
  progress: ProgressState,
  budgetMinutes = EXTRA_BUDGET_MINUTES,
  now = new Date(),
): SessionStep[] {
  const dateKey = kstDateKey(now);
  const candidates = studyCandidates(terms);
  const out: SessionStep[] = [];
  let spent = 0;
  const push = (step: SessionStep): boolean => {
    const cost = STEP_COST[step.kind];
    if (spent + cost > budgetMinutes) return false;
    out.push(step);
    spent += cost;
    return true;
  };

  const taken = new Set<string>();
  // 1. 오늘 복습일인데 권장 분량의 상한을 넘어 남은 카드.
  const dueRest = candidates
    .filter((t) => {
      const c = progress.cards[t.id];
      return c && isDue(c, now);
    })
    .sort((a, b) => (progress.cards[a.id].dueAt > progress.cards[b.id].dueAt ? 1 : -1))
    .slice(reviewCap(newPerDay(terms, progress)));
  for (const term of dueRest) {
    if (!push({ kind: "recall", term })) return out;
    taken.add(term.id);
  }

  // 2. 아직 복습일은 아니지만 이미 시작한 카드. 일정을 앞당기지 않는 연습이다.
  const ahead = candidates
    .filter((t) => {
      const c = progress.cards[t.id];
      return c && !taken.has(t.id) && !isDue(c, now) && !isGraduated(c);
    })
    .sort((a, b) => (progress.cards[a.id].dueAt < progress.cards[b.id].dueAt ? -1 : 1));
  for (const term of ahead) {
    if (!push({ kind: "practice", term })) return out;
    taken.add(term.id);
  }

  // 3. 남은 예산이 있으면 신규. 밀림이 있으면 넣지 않는다.
  if (dueBacklog(terms, progress) > 0) return out;
  const room = EXTRA_NEW_DAILY_CAP - Math.max(0, newStartedToday(terms, progress, now) - NEW_PER_DAY);
  if (room <= 0) return out;
  const fresh = pickNewTerms(terms, progress, room, `${dateKey}-x`);
  for (const term of fresh) {
    if (spent + STEP_COST.new + STEP_COST.first_recall > budgetMinutes) break;
    push({ kind: "new", term });
    push({ kind: "first_recall", term });
  }
  return out;
}

export function estimateMinutes(neu: number, review: number, firstRecall = 0): number {
  const raw = neu * 1.15 + firstRecall * 0.7 + review * 0.8;
  if (raw <= 0) return 0;
  return Math.min(12, Math.max(1, Math.round(raw)));
}

export interface TodayPlanCounts {
  neu: number;
  review: number;
  newTerms: Term[];
  reviewTerms: Term[];
  briefing: LearningBriefing | null;
  total: number;
  minutes: number;
  /** 학습 후보 중 아직 보지 않은 용어 수. */
  remainingUnseen: number;
  candidateTotal: number;
  graduated: number;
  /** 일반 규칙(다른 날 2일 + 다른 형태 2개)으로 익숙해진 수. */
  familiarFull: number;
  /** 형태가 하나뿐이라 면제 규칙으로 익숙해진 수. */
  familiarFallback: number;
  /** 형태가 하나뿐이어서 면제 규칙에 의존할 수밖에 없는 용어 수. */
  fallbackEligible: number;
}

export function planCounts(
  terms: Term[],
  progress: ProgressState,
  plan: TodayPlanFile,
): TodayPlanCounts {
  const q = todayQueue(terms, progress);
  const newTerms = q
    .filter((s): s is Extract<SessionStep, { kind: "new" }> => s.kind === "new")
    .map((s) => s.term);
  const reviewTerms = q
    .filter((s): s is Extract<SessionStep, { kind: "recall" }> => s.kind === "recall")
    .map((s) => s.term);
  const candidates = studyCandidates(terms);
  const pool = lessonPool(terms);
  let familiarFull = 0;
  let familiarFallback = 0;
  let fallbackEligible = 0;
  for (const t of candidates) {
    if (formsFor(t, pool).length < 2) fallbackEligible += 1;
    const c = progress.cards[t.id];
    if (!c) continue;
    const rule = familiarRule(c);
    if (rule === "full") familiarFull += 1;
    else if (rule === "fallback") familiarFallback += 1;
  }
  return {
    neu: newTerms.length,
    review: reviewTerms.length,
    newTerms,
    reviewTerms,
    briefing: briefingForPlan(plan, progress.seenContextIds),
    total: q.length,
    minutes: estimateMinutes(newTerms.length, reviewTerms.length, newTerms.length),
    remainingUnseen: candidates.filter((t) => !progress.cards[t.id]).length,
    candidateTotal: candidates.length,
    graduated: familiarFull + familiarFallback,
    familiarFull,
    familiarFallback,
    fallbackEligible,
  };
}

export { GRADUATE_REPETITIONS };

/** 사전 목록 등에서 쓰는 보조 큐. */
export function pickStudyQueue(pool: Term[], progress: ProgressState, cap: number): SessionStep[] {
  const unseen = pool.filter((t) => !progress.cards[t.id]);
  const due = pool
    .filter((t) => progress.cards[t.id] && isDue(progress.cards[t.id]))
    .sort((a, b) => (progress.cards[a.id].dueAt > progress.cards[b.id].dueAt ? 1 : -1));
  const rest = pool.filter((t) => progress.cards[t.id] && !isDue(progress.cards[t.id]));
  const picked = [...unseen, ...due, ...rest].slice(0, cap);
  const fresh = picked.filter((t) => !progress.cards[t.id]);
  const review = picked.filter((t) => progress.cards[t.id]);
  return [
    ...fresh.map((term) => ({ kind: "new" as const, term })),
    ...fresh.map((term) => ({ kind: "first_recall" as const, term })),
    ...review.map((term) => ({ kind: "recall" as const, term })),
  ];
}
