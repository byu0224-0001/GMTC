import { allBriefings, briefingById, registerExtraBriefings } from "../content/briefings";
import type { LearningBriefing } from "../types";
import { kstDateKey } from "./srs";

export type TodayPlanFile = { date: string; briefingId: string; contentVersion?: number };

const CACHE_KEY = "voca:today-plan";
const DAY_LESSON_KEY = "voca:day-lesson";

function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * 홈의 오늘 글.
 * 새로고침마다 바꾸지 않고, 날짜가 같으면 같은 자리를 본다.
 * 이미 읽은 글이면 그다음 안 읽은 글로 옮긴다. 편집자가 today.json 날짜를
 * 오늘로 맞춰 두면 그 선택을 따른다.
 */
export function pickDailyBriefing(dateKey: string, seenIds: string[] = []): LearningBriefing {
  const all = allBriefings();
  const start = ((dayIndex(dateKey) % all.length) + all.length) % all.length;
  for (let i = 0; i < all.length; i += 1) {
    const b = all[(start + i) % all.length];
    if (!seenIds.includes(b.id)) return b;
  }
  return all[start];
}

export function fallbackPlan(): TodayPlanFile {
  const date = kstDateKey();
  return { date, briefingId: pickDailyBriefing(date).id, contentVersion: 1 };
}

export async function loadTodayPlan(): Promise<TodayPlanFile> {
  try {
    const res = await fetch("/content/today.json", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as TodayPlanFile;
      if (data?.briefingId && briefingById(data.briefingId)) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        return {
          date: data.date,
          briefingId: data.briefingId,
          contentVersion: typeof data.contentVersion === "number" ? data.contentVersion : 1,
        };
      }
    }
  } catch {
    /* offline */
  }
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as TodayPlanFile;
      if (data?.briefingId && briefingById(data.briefingId)) return data;
    }
  } catch {
    /* ignore */
  }
  return fallbackPlan();
}

export function readLockedTodayPlan(): TodayPlanFile | null {
  try {
    const raw = localStorage.getItem(DAY_LESSON_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as TodayPlanFile;
    if (data.date === kstDateKey() && data.briefingId && briefingById(data.briefingId)) return data;
  } catch {
    /* ignore */
  }
  return null;
}

/** 그날 첫 Today 세션이 시작된 브리핑을 하루 동안 고정한다. */
export function lockTodayLesson(plan: TodayPlanFile, seenIds: string[]): TodayPlanFile {
  const existing = readLockedTodayPlan();
  if (existing) return existing;
  const briefing = briefingForPlan(plan, seenIds);
  const locked: TodayPlanFile = {
    date: kstDateKey(),
    briefingId: briefing.id,
    contentVersion: plan.contentVersion ?? 1,
  };
  localStorage.setItem(DAY_LESSON_KEY, JSON.stringify(locked));
  return locked;
}

export function resolveDisplayPlan(fetched: TodayPlanFile): TodayPlanFile {
  return readLockedTodayPlan() ?? fetched;
}

export function briefingForPlan(plan: TodayPlanFile, seenIds: string[]): LearningBriefing {
  const today = kstDateKey();
  if (plan.date === today) {
    const hit = briefingById(plan.briefingId);
    if (hit) return hit;
  }
  return pickDailyBriefing(today, seenIds);
}

export async function loadExtraBriefings(): Promise<void> {
  try {
    const res = await fetch("/content/published-briefings.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as LearningBriefing[] | { briefings?: LearningBriefing[] };
    const list = Array.isArray(data) ? data : data.briefings ?? [];
    registerExtraBriefings(list);
  } catch {
    /* offline */
  }
}
