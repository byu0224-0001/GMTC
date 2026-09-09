import { kstDateKey } from "./srs";

const PREFIX = "voca:ui-resume:";

/**
 * 학습·읽기 중 용어 미리보기에서 사전으로 나갔다가 뒤로 올 때
 * 문항 위치를 되돌리기 위한 임시 저장. 진도(SRS)와는 별개다.
 */
export function saveUiResume(key: string, data: unknown): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ date: kstDateKey(), data }));
  } catch {
    /* 저장이 막혀도 미리보기는 동작해야 한다. */
  }
}

export function loadUiResume<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date?: string; data?: T };
    if (parsed.date !== kstDateKey()) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function clearUiResume(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
