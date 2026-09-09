import { allBriefings, briefingById } from "../content/briefings";
import { mapForBriefing } from "../content/learningMaps";
import type { LearningBriefing, ProgressState } from "../types";
import { kstDateKey } from "./srs";

const PICK_KEY = "voca:daily-reading";

export type DailyReading = {
  today: LearningBriefing;
  next: LearningBriefing | null;
  todayCompleted: boolean;
};

function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function loadPick(dateKey: string): string | null {
  try {
    const raw = localStorage.getItem(PICK_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date?: string; briefingId?: string };
    if (data.date === dateKey && data.briefingId && briefingById(data.briefingId)) return data.briefingId;
  } catch {
    /* ignore */
  }
  return null;
}

function savePick(dateKey: string, briefingId: string): void {
  try {
    localStorage.setItem(PICK_KEY, JSON.stringify({ date: dateKey, briefingId }));
  } catch {
    /* ignore */
  }
}

function studiedToday(progress: ProgressState, dateKey: string): Set<string> {
  const out = new Set<string>();
  for (const [id, card] of Object.entries(progress.cards ?? {})) {
    if (card.successDates?.includes(dateKey)) out.add(id);
  }
  return out;
}

function briefingTermIds(b: LearningBriefing): string[] {
  const map = mapForBriefing(b.id);
  return [
    ...(b.primaryTermIds ?? []),
    ...(b.supportTermIds ?? []),
    ...(map?.steps.map((s) => s.termId) ?? []),
  ];
}

/** 최근 N일 안에 마친 기사형. 다 읽은 뒤 다시 고를 때 바로 어제 글을 또 안 띄운다. */
function recentCompleted(progress: ProgressState, dateKey: string, days: number): Set<string> {
  const from = dayIndex(dateKey) - (days - 1);
  const out = new Set<string>();
  for (const a of progress.briefingAttempts ?? []) {
    if (!a.completedAt) continue;
    const d = kstDateKey(new Date(a.completedAt));
    if (dayIndex(d) >= from) out.add(a.briefingId);
  }
  return out;
}

/**
 * 점수: 안 읽은 글 > 최근 7일에 안 마친 글 > 나머지.
 * 같은 칸이면 오늘 맞힌 용어와 겹치는 글을 앞에 둔다.
 * 그래도 여러 개면 날짜 자리부터의 거리가 짧은 쪽.
 * Math.random은 쓰지 않는다.
 */
function rank(
  dateKey: string,
  seen: Set<string>,
  related: Set<string>,
  recent: Set<string>,
  exclude: Set<string>,
): LearningBriefing[] {
  const all = allBriefings();
  if (all.length === 0) return [];
  const start = ((dayIndex(dateKey) % all.length) + all.length) % all.length;
  return all
    .filter((b) => !exclude.has(b.id))
    .map((b) => {
      const idx = all.findIndex((x) => x.id === b.id);
      const unseen = !seen.has(b.id);
      const fresh = !recent.has(b.id);
      const rel = briefingTermIds(b).some((id) => related.has(id));
      const tier = unseen ? 2 : fresh ? 1 : 0;
      const dist = (idx - start + all.length) % all.length;
      return { b, tier, rel: rel ? 1 : 0, dist };
    })
    .sort((a, c) => c.tier - a.tier || c.rel - a.rel || a.dist - c.dist)
    .map((x) => x.b);
}

/**
 * 홈과 읽기 탭의 `오늘` 글.
 * 하루 동안 같은 글을 유지하고, 그 글을 마치면 다음 안 읽은 글로 옮긴다.
 */
export function selectDailyReading(
  plan: { date: string; briefingId: string; editorial?: boolean },
  progress: ProgressState,
  now = new Date(),
): DailyReading {
  const today = kstDateKey(now);
  const all = allBriefings();
  const fallback = all[0];
  if (!fallback) {
    throw new Error("학습용 기사가 없습니다.");
  }
  const seen = new Set(progress.seenContextIds ?? []);
  const related = studiedToday(progress, today);
  const recent = recentCompleted(progress, today, 7);

  const editorial =
    plan.editorial && plan.date === today && plan.briefingId
      ? briefingById(plan.briefingId)
      : undefined;

  let id = loadPick(today);
  if (!id && editorial && !seen.has(editorial.id)) id = editorial.id;
  if (!id) {
    const first = rank(today, seen, related, recent, new Set())[0];
    id = first?.id ?? fallback.id;
  }
  savePick(today, id);

  const todayBriefing = briefingById(id) ?? fallback;
  const todayCompleted = seen.has(todayBriefing.id);
  const next =
    rank(today, seen, related, recent, new Set([todayBriefing.id])).find((b) => b.id !== todayBriefing.id) ??
    null;

  return { today: todayBriefing, next, todayCompleted };
}
