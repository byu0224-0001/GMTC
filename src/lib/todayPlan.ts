import { briefingById, registerExtraBriefings } from "../content/briefings";
import type { LearningBriefing } from "../types";
import type { ProgressState } from "../types";
import { selectDailyReading } from "./readingSelect";
import { kstDateKey } from "./srs";

export type TodayPlanFile = {
  date: string;
  briefingId: string;
  contentVersion?: number;
  /** today.json을 오늘 날짜로 올린 편집 선택. fallback·세션 잠금은 false. */
  editorial?: boolean;
};

const CACHE_KEY = "voca:today-plan";
const DAY_LESSON_KEY = "voca:day-lesson";

export { selectDailyReading } from "./readingSelect";

export function fallbackPlan(): TodayPlanFile {
  return { date: kstDateKey(), briefingId: "", contentVersion: 1, editorial: false };
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
          editorial: data.date === kstDateKey(),
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
      if (data?.briefingId && briefingById(data.briefingId)) {
        return {
          ...data,
          editorial: data.date === kstDateKey(),
        };
      }
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

/** 그날 첫 Today 세션이 시작된 브리핑을 하루 동안 고정한다. 용어 큐가 읽기와 어긋나지 않게. */
export function lockTodayLesson(plan: TodayPlanFile, progress: ProgressState): TodayPlanFile {
  const existing = readLockedTodayPlan();
  if (existing) return existing;
  const briefing = selectDailyReading(plan, progress).today;
  const locked: TodayPlanFile = {
    date: kstDateKey(),
    briefingId: briefing.id,
    contentVersion: plan.contentVersion ?? 1,
    editorial: false,
  };
  localStorage.setItem(DAY_LESSON_KEY, JSON.stringify(locked));
  return locked;
}

export function resolveDisplayPlan(fetched: TodayPlanFile): TodayPlanFile {
  return readLockedTodayPlan() ?? fetched;
}

export function briefingForPlan(plan: TodayPlanFile, progress: ProgressState): LearningBriefing {
  return selectDailyReading(plan, progress).today;
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
