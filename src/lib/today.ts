import { TAXONOMY_ORDER, coreTerms } from "../content/literacy";
import { isPilotTerm } from "../content/pilotCore";
import { REPORT_BOK_CANON, REPORT_ESSENTIALS, canonBokId, reportToTerm } from "../content/reportLexicon";
import { briefingForPlan, type TodayPlanFile } from "./todayPlan";
import { briefingCompletedOn } from "./progress";
import type { LearningBriefing } from "../types";
import type { ProgressState, Term } from "../types";
import { isDue, kstDateKey } from "./srs";
import { choOf } from "./hangul";

export const NEW_PER_DAY = 3;
export const REVIEW_CAP = 5;
export const TAXONOMY_SESSION_CAP = 8;
export const REPORT_SESSION_CAP = 6;

export type SessionStep =
  | { kind: "new"; term: Term }
  | { kind: "first_recall"; term: Term }
  | { kind: "recall"; term: Term }
  | { kind: "briefing"; briefing: LearningBriefing };

export function lessonPool(terms: Term[]): Term[] {
  const core = coreTerms(terms).length ? coreTerms(terms) : terms;
  const report = REPORT_ESSENTIALS.filter((r) => !REPORT_BOK_CANON[r.id]).map((r) => ({
    ...reportToTerm(r),
    cho: choOf(r.headword),
  }));
  const extras = Object.values(REPORT_BOK_CANON)
    .map((id) => terms.find((t) => t.id === id))
    .filter((t): t is Term => Boolean(t));
  const map = new Map<string, Term>();
  for (const t of [...core, ...extras, ...report]) map.set(t.id, t);
  return [...map.values()];
}

export function resolveLessonTerm(id: string, pool: Term[]): Term | undefined {
  return pool.find((t) => t.id === canonBokId(id));
}

/** 비슷한 분야만 며칠 연속으로 나오지 않게, 분야를 돌아가며 뽑는다. */
export function pickBroadFirst(unseen: Term[], n: number): Term[] {
  const buckets = new Map<string, Term[]>();
  for (const t of unseen) {
    const k = t.taxonomy ?? "기타";
    const arr = buckets.get(k) ?? [];
    arr.push(t);
    buckets.set(k, arr);
  }
  const keys = [
    ...TAXONOMY_ORDER.filter((k) => buckets.has(k)),
    ...[...buckets.keys()].filter((k) => !(TAXONOMY_ORDER as string[]).includes(k)),
  ];
  const out: Term[] = [];
  while (out.length < n) {
    let progressed = false;
    for (const k of keys) {
      const b = buckets.get(k);
      if (b?.length) {
        out.push(b.shift()!);
        progressed = true;
        if (out.length >= n) break;
      }
    }
    if (!progressed) break;
  }
  return out;
}

/** unseen은 보기만으로 SRS에 넣지 않는다. 첫 회상부터 학습 신호. */
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

function relatedIds(b: LearningBriefing): string[] {
  return [...b.primaryTermIds, ...(b.supportTermIds ?? []), ...(b.relatedTermIds ?? [])];
}

function relatedTerms(briefing: LearningBriefing, pool: Term[]): Term[] {
  return relatedIds(briefing)
    .map((id) => resolveLessonTerm(id, pool))
    .filter((t): t is Term => Boolean(t));
}

function pickNewTerms(briefing: LearningBriefing, pool: Term[], progress: ProgressState): Term[] {
  const ordered = relatedTerms(briefing, pool);
  const unseenRelated = ordered.filter((t) => isPilotTerm(t.id) && !progress.cards[t.id]);
  return unseenRelated.slice(0, NEW_PER_DAY);
}

function pickReviewTerms(
  briefing: LearningBriefing,
  pool: Term[],
  core: Term[],
  progress: ProgressState,
  freshIds: Set<string>,
): Term[] {
  // 이미 배운 브리핑 용어는 최대 2개만 앞에 둔다. 전부 넣으면 복습 세션이 길어져 출퇴근 5–10분을 넘긴다.
  const relatedLearned = relatedTerms(briefing, pool)
    .filter((t) => isPilotTerm(t.id) && progress.cards[t.id] && !freshIds.has(t.id))
    .slice(0, 2);
  const due = [...pool, ...core]
    .filter((t) => isPilotTerm(t.id) && progress.cards[t.id] && isDue(progress.cards[t.id]) && !freshIds.has(t.id))
    .sort((a, b) => (progress.cards[a.id].dueAt > progress.cards[b.id].dueAt ? 1 : -1));
  const out: Term[] = [];
  const used = new Set<string>();
  for (const t of [...relatedLearned, ...due]) {
    if (out.length >= REVIEW_CAP) break;
    if (used.has(t.id)) continue;
    used.add(t.id);
    out.push(t);
  }
  return out;
}

export function todayQueue(terms: Term[], progress: ProgressState, plan: TodayPlanFile): SessionStep[] {
  const pool = lessonPool(terms);
  const briefing = briefingForPlan(plan, progress.seenContextIds);
  const fresh = pickNewTerms(briefing, pool, progress);
  const freshIds = new Set(fresh.map((t) => t.id));
  const core = coreTerms(terms);
  const review = pickReviewTerms(briefing, pool, core, progress, freshIds);

  const steps: SessionStep[] = [
    ...fresh.map((term) => ({ kind: "new" as const, term })),
    ...fresh.map((term) => ({ kind: "first_recall" as const, term })),
    ...review.map((term) => ({ kind: "recall" as const, term })),
  ];
  if (!briefingCompletedOn(progress, kstDateKey(), briefing.id)) {
    steps.push({ kind: "briefing", briefing });
  }
  return steps;
}

export function estimateMinutes(
  neu: number,
  review: number,
  briefingMinutes: number,
  firstRecall = 0,
): number {
  const raw = neu * 1.15 + firstRecall * 0.7 + review * 0.8 + briefingMinutes;
  if (raw <= 0) return 0;
  return Math.min(12, Math.max(1, Math.round(raw)));
}

export function planCounts(terms: Term[], progress: ProgressState, plan: TodayPlanFile) {
  const q = todayQueue(terms, progress, plan);
  const neu = q.filter((s) => s.kind === "new").length;
  const firstRecall = q.filter((s) => s.kind === "first_recall").length;
  const review = q.filter((s) => s.kind === "recall").length;
  const briefing = q.find((s) => s.kind === "briefing");
  const briefingMinutes = briefing && briefing.kind === "briefing" ? briefing.briefing.minutes : 0;
  return {
    neu,
    review,
    context: q.filter((s) => s.kind === "briefing").length,
    briefing: briefing && briefing.kind === "briefing" ? briefing.briefing : null,
    total: q.length,
    minutes: estimateMinutes(neu, review, briefingMinutes, firstRecall),
  };
}
