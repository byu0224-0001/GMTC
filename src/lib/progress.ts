import type { ProgressState, GradeLabel, BriefingAttempt, RetrievalForm, SrsCard } from "../types";
import { REPORT_BOK_CANON, canonBokId } from "../content/reportLexicon";
import { clearEvents } from "./events";
import { addDays, clampCardSchedule, grade, isFamiliar, kstDateKey, newCard } from "./srs";

export const STORAGE_KEY = "voca:progress:v2";
const LEGACY_KEY = "voca:progress:v1";
export const SCHEMA_VERSION = 5;

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
    defaultDoneDate: null,
    extraSessions: {},
    onboardedAt: null,
    pushAskedAt: null,
    doneSessions: 0,
  };
}

/**
 * v4 이전 카드에는 맞힌 날짜와 형태가 없다.
 * 비워 두면 이미 졸업한 카드가 전부 복습 큐로 돌아와 첫 실행에 밀림이 쏟아진다.
 * 그래서 졸업 조건을 이미 넘긴 카드만 최소값으로 채워 상태를 유지시킨다.
 */
function backfillSuccessLog(card: SrsCard): SrsCard {
  if (Array.isArray(card.successDates) && Array.isArray(card.successForms)) return card;
  const last = card.updatedAt ? kstDateKey(new Date(card.updatedAt)) : kstDateKey();
  const earned = card.repetitions >= 4;
  return {
    ...card,
    successDates: Array.isArray(card.successDates)
      ? card.successDates
      : earned
        ? [addDays(last, -1), last]
        : card.repetitions >= 1
          ? [last]
          : [],
    successForms: Array.isArray(card.successForms)
      ? card.successForms
      : earned
        ? ["recognition", "recall"]
        : card.repetitions >= 1
          ? ["recognition"]
          : [],
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
      Object.entries(migrateCanonCards(cards)).map(([id, card]) => [
        id,
        clampCardSchedule(backfillSuccessLog(card)),
      ]),
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
      defaultDoneDate: parsed.defaultDoneDate ?? null,
      extraSessions: parsed.extraSessions ?? {},
      onboardedAt: parsed.onboardedAt ?? null,
      pushAskedAt: parsed.pushAskedAt ?? null,
      doneSessions: parsed.doneSessions ?? 0,
    };
    if (parsed.version !== SCHEMA_VERSION) saveProgress(next);
    return next;
  } catch {
    return empty();
  }
}

/**
 * 저장이 실패해도 세션을 멈추지 않는다.
 * 사파리 프라이빗 모드나 저장 용량 초과에서 setItem은 예외를 던진다. 여기서 터지면
 * 문제를 푸는 중에 화면 전체가 죽는다. 기록을 한 번 못 남기는 것보다 나쁘다.
 */
export function saveProgress(state: ProgressState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function storageWritable(): boolean {
  try {
    const probe = "voca:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
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
  form?: RetrievalForm,
): ProgressState {
  const prev = state.cards[termId] ?? newCard(termId, now);
  const next = grade(prev, label, now, form);
  return {
    ...state,
    ...bumpStreak(state, now),
    cards: { ...state.cards, [termId]: next },
  };
}

/**
 * 오늘 권장 분량을 마쳤다고 표시한다.
 *
 * 이 표시가 없으면 완료 여부를 `남은 큐가 비었는가`로 판단해야 하는데, 추가 세션이
 * 들어오는 순간 그 판단이 무너진다. 추가로 공부하면 큐가 다시 차므로 홈이 완료를
 * 취소해 버린다. 권장 분량과 자율 학습은 다른 상태여야 한다.
 */
export function markDefaultDone(state: ProgressState, now = new Date()): ProgressState {
  const key = kstDateKey(now);
  const already = state.defaultDoneDate === key;
  return {
    ...state,
    ...bumpStreak(state, now),
    defaultDoneDate: key,
    doneSessions: already ? state.doneSessions : state.doneSessions + 1,
  };
}

export function markPushAsked(state: ProgressState, now = new Date()): ProgressState {
  return { ...state, pushAskedAt: now.toISOString() };
}

export function defaultDoneToday(state: ProgressState, now = new Date()): boolean {
  return state.defaultDoneDate === kstDateKey(now);
}

export function markExtraSession(state: ProgressState, now = new Date()): ProgressState {
  const key = kstDateKey(now);
  const counts = { ...state.extraSessions, [key]: (state.extraSessions[key] ?? 0) + 1 };
  return { ...state, ...bumpStreak(state, now), extraSessions: counts };
}

export function extraSessionsToday(state: ProgressState, now = new Date()): number {
  return state.extraSessions[kstDateKey(now)] ?? 0;
}

export function markOnboarded(state: ProgressState, now = new Date()): ProgressState {
  return { ...state, onboardedAt: now.toISOString() };
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

/** 기록 지우기. 학습 상태와 이벤트 기록을 함께 없앤다. */
export function resetProgress(): ProgressState {
  const next = empty();
  saveProgress(next);
  clearEvents();
  return next;
}

export function stats(state: ProgressState, coreIds: string[], now = new Date()) {
  const coreSet = new Set(coreIds);
  const coreCards = Object.values(state.cards).filter((c) => coreSet.has(c.termId));
  /** 복습 큐에서 빠지는 기준과 같은 값을 쓴다. 화면마다 다른 숫자가 나오면 안 된다. */
  const known = coreCards.filter(isFamiliar).length;
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
