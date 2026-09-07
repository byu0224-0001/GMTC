import type { ProgressState, Term } from "../types";
import { displayTitle } from "./hangul";
import { isFamiliar, kstDateKey, addDays } from "./srs";
import { studyCandidates } from "./today";

const WEEKDAY = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** 월요일을 주의 시작으로 둔다. 화면의 월~일 점과 같은 기준이다. */
export function startOfKstWeek(now = new Date()): string {
  const today = kstDateKey(now);
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sinceMonday = dow === 0 ? 6 : dow - 1;
  return addDays(today, -sinceMonday);
}

export function weekDateKeys(now = new Date()): string[] {
  const start = startOfKstWeek(now);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * 학습한 날.
 *
 * `lastStudyDate`는 마지막 하루만 남는다. 주간 점을 그리려면 여러 날이 필요하다.
 * 저장된 `studyDates`를 우선하고, 예전 기록은 맞힌 날·읽기·추가 세션에서 복원한다.
 */
export function studyDateSet(state: ProgressState): Set<string> {
  const dates = new Set<string>(state.studyDates ?? []);
  if (state.lastStudyDate) dates.add(state.lastStudyDate);
  if (state.defaultDoneDate) dates.add(state.defaultDoneDate);
  for (const key of Object.keys(state.extraSessions ?? {})) dates.add(key);
  for (const card of Object.values(state.cards)) {
    for (const day of card.successDates) dates.add(day);
    if (card.familiarAt) dates.add(card.familiarAt);
  }
  for (const attempt of state.briefingAttempts ?? []) {
    if (attempt.completedAt) dates.add(kstDateKey(new Date(attempt.completedAt)));
  }
  for (const stat of Object.values(state.contextStats)) {
    if (stat.lastAt) dates.add(kstDateKey(new Date(stat.lastAt)));
  }
  return dates;
}

function inWeek(day: string, week: string[]): boolean {
  return week.includes(day);
}

export function todayStudyCounts(state: ProgressState, terms: Term[], now = new Date()) {
  const today = kstDateKey(now);
  let neu = 0;
  let review = 0;
  for (const term of studyCandidates(terms)) {
    const card = state.cards[term.id];
    if (!card) continue;
    const touched =
      card.successDates.includes(today) || kstDateKey(new Date(card.updatedAt)) === today;
    if (!touched) continue;
    if (card.successDates[0] === today) neu += 1;
    else review += 1;
  }
  return { neu, review };
}

export function weeklyStats(state: ProgressState, terms: Term[], now = new Date()) {
  const week = weekDateKeys(now);
  const studied = studyDateSet(state);
  const days = week.map((date, i) => ({
    date,
    label: WEEKDAY[i],
    done: studied.has(date),
  }));
  const studyDays = days.filter((d) => d.done).length;
  let familiarThisWeek = 0;
  const recentFamiliar: { id: string; label: string; at: string }[] = [];
  for (const term of studyCandidates(terms)) {
    const card = state.cards[term.id];
    if (!card || !isFamiliar(card)) continue;
    const at = card.familiarAt ?? card.successDates[card.successDates.length - 1] ?? "";
    if (at && inWeek(at, week)) familiarThisWeek += 1;
    recentFamiliar.push({ id: term.id, label: displayTitle(term), at: at || card.updatedAt });
  }
  recentFamiliar.sort((a, b) => (a.at < b.at ? 1 : -1));
  const readings = new Set<string>();
  for (const attempt of state.briefingAttempts ?? []) {
    if (!attempt.completedAt) continue;
    if (inWeek(kstDateKey(new Date(attempt.completedAt)), week)) readings.add(attempt.briefingId);
  }
  for (const [id, stat] of Object.entries(state.contextStats)) {
    if (id.startsWith("bf-") || !stat.lastAt) continue;
    if (inWeek(kstDateKey(new Date(stat.lastAt)), week)) readings.add(id);
  }
  return {
    days,
    studyDays,
    familiarThisWeek,
    recentFamiliar: recentFamiliar.slice(0, 5),
    readingsThisWeek: readings.size,
  };
}
