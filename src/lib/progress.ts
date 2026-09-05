import type { ProgressState, GradeLabel, BriefingAttempt, SrsCard } from "../types";
import { REPORT_BOK_CANON, canonBokId } from "../content/reportLexicon";
import { clampCardSchedule, grade, kstDateKey, newCard } from "./srs";

export const STORAGE_KEY = "voca:progress:v2";
const LEGACY_KEY = "voca:progress:v1";
export const SCHEMA_VERSION = 4;

function empty(): ProgressState {
  return {
    version: SCHEMA_VERSION,
    displayName: "학습자",
    cards: {},
    contextStats: {},
    seenContextIds: [],
    streakDays: 0,
    lastStudyDate: null,
    briefingAttempts: [],
    lastBriefingDate: null,
  };
}

function migrateCanonCards(cards: Record<string, SrsCard>): Record<string, SrsCard> {
  const next = { ...cards };
  for (const [rptId, bokId] of Object.entries(REPORT_BOK_CANON)) {
    if (next[rptId] && !next[bokId]) {
      next[bokId] = { ...next[rptId], termId: bokId };
    }
  }
  return next;
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ProgressState & { version?: number; seenNewsIds?: string[] };
    const cards = parsed.cards && typeof parsed.cards === "object" ? parsed.cards : {};
    const migrated = Object.fromEntries(
      Object.entries(migrateCanonCards(cards)).map(([id, card]) => [id, clampCardSchedule(card)]),
    );
    const next: ProgressState = {
      version: SCHEMA_VERSION,
      displayName: parsed.displayName || "학습자",
      cards: migrated,
      contextStats: parsed.contextStats ?? {},
      seenContextIds: parsed.seenContextIds ?? parsed.seenNewsIds ?? [],
      streakDays: parsed.streakDays ?? 0,
      lastStudyDate: parsed.lastStudyDate ?? null,
      briefingAttempts: parsed.briefingAttempts ?? [],
      lastBriefingDate: parsed.lastBriefingDate ?? null,
    };
    if (parsed.version !== SCHEMA_VERSION) saveProgress(next);
    return next;
  } catch {
    return empty();
  }
}

export function saveProgress(state: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bumpStreak(state: ProgressState, now: Date): Pick<ProgressState, "streakDays" | "lastStudyDate"> {
  const today = kstDateKey(now);
  if (state.lastStudyDate === today) {
    return { streakDays: state.streakDays, lastStudyDate: today };
  }
  const [yy, mm, dd] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yesterday = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  return {
    streakDays: state.lastStudyDate === yesterday ? state.streakDays + 1 : 1,
    lastStudyDate: today,
  };
}

export function applyGrade(
  state: ProgressState,
  termId: string,
  label: GradeLabel,
  now = new Date(),
): ProgressState {
  const prev = state.cards[termId] ?? newCard(termId, now);
  const next = grade(prev, label, now);
  return {
    ...state,
    ...bumpStreak(state, now),
    cards: { ...state.cards, [termId]: next },
  };
}

/** 짧은 장면 퀴즈 전용. 브리핑 완료와 섞지 않는다. */
export function recordContext(
  state: ProgressState,
  caseId: string,
  correct: boolean,
  now = new Date(),
): ProgressState {
  const prev = state.contextStats[caseId] ?? { seen: 0, correct: 0, lastAt: "" };
  const seenContextIds = state.seenContextIds.includes(caseId)
    ? state.seenContextIds
    : [...state.seenContextIds, caseId];
  return {
    ...state,
    ...bumpStreak(state, now),
    seenContextIds,
    contextStats: {
      ...state.contextStats,
      [caseId]: {
        seen: prev.seen + 1,
        correct: prev.correct + (correct ? 1 : 0),
        lastAt: now.toISOString(),
      },
    },
  };
}

export function recordBriefingAttempt(
  state: ProgressState,
  attempt: BriefingAttempt,
  now = new Date(),
): ProgressState {
  const attempts = [...(state.briefingAttempts ?? []), attempt].slice(-80);
  const seenContextIds =
    attempt.completedAt && !state.seenContextIds.includes(attempt.briefingId)
      ? [...state.seenContextIds, attempt.briefingId]
      : state.seenContextIds;
  return {
    ...state,
    ...bumpStreak(state, now),
    seenContextIds,
    lastBriefingDate: attempt.completedAt ? kstDateKey(now) : state.lastBriefingDate,
    briefingAttempts: attempts,
  };
}

export function briefingCompletedOn(state: ProgressState, dateKey: string, briefingId?: string): boolean {
  if (!briefingId) return state.lastBriefingDate === dateKey;
  return (state.briefingAttempts ?? []).some((a) => {
    if (a.briefingId !== briefingId || !a.completedAt) return false;
    return kstDateKey(new Date(a.completedAt)) === dateKey;
  });
}

export function resetProgress(): ProgressState {
  const next = empty();
  saveProgress(next);
  return next;
}

export function stats(state: ProgressState, coreIds: string[], now = new Date()) {
  const coreSet = new Set(coreIds);
  const coreCards = Object.values(state.cards).filter((c) => coreSet.has(c.termId));
  /** 파일럿 집계. 장기적으로는 서로 다른 날짜·문제 형식에서의 성공을 요구해야 한다. */
  const known = coreCards.filter((c) => c.repetitions >= 2).length;
  const due = coreCards.filter((c) => c.dueAt <= kstDateKey(now)).length;
  const ctx = Object.entries(state.contextStats)
    .filter(([id]) => !id.startsWith("bf-"))
    .map(([, v]) => v);
  const ctxSeen = ctx.reduce((a, b) => a + b.seen, 0);
  const ctxOk = ctx.reduce((a, b) => a + b.correct, 0);
  return {
    known,
    seen: coreCards.length,
    due,
    coreTotal: coreIds.length,
    masteryPct: coreIds.length ? Math.round((known / coreIds.length) * 100) : 0,
    streakDays: state.streakDays,
    contextAcc: ctxSeen ? Math.round((ctxOk / ctxSeen) * 100) : 0,
    contextSeen: ctxSeen,
  };
}

export function reportSeenCount(state: ProgressState, reportIds: string[]): number {
  return reportIds.filter((id) => Boolean(state.cards[id] || state.cards[canonBokId(id)])).length;
}
