import { SCHEMA_VERSION } from "./progress";

const KEY = "voca:events:v1";
const MAX = 500;

export const APP_VERSION = "0.1.0";

export type EventName =
  | "session_start"
  | "new_term_viewed"
  | "first_recall_answer"
  | "review_answer"
  | "briefing_start"
  | "briefing_question_answer"
  | "briefing_complete"
  | "reading_answer"
  | "push_prompt_result"
  | "session_complete";

/**
 * 세션의 출처.
 * 이걸 남기지 않으면 `하루 평균 몇 분`만 알게 되고, 그 시간이 앱이 권한 분량인지
 * 사용자가 스스로 더 한 것인지 구분할 수 없다. 파일럿에서 알고 싶은 건 후자다.
 */
export type SessionSourceTag = "home_default" | "extra" | "reading";

/**
 * 이벤트 구조의 버전.
 *
 * 파일럿 도중 필드를 바꾸면 이전 데이터와 새 데이터가 한 표에 섞인다. 그때
 * `이 열이 비어 있는 건 값이 없어서인가 아직 없던 필드인가`를 구분할 수 없다.
 */
export const EVENT_SCHEMA_VERSION = 1;

export interface StudyEvent {
  /**
   * 이벤트 고유 id.
   * 전송이 실패하면 커서를 올리지 않고 다시 보내므로 같은 이벤트가 두 번 닿을 수 있다.
   * 집계할 때 이 값으로 걸러낸다.
   */
  eventId: string;
  eventSchemaVersion: number;
  t: string;
  name: EventName;
  sessionId: string | null;
  sessionSource: SessionSourceTag | null;
  appVersion: string;
  progressSchemaVersion: number;
  contentVersion: number | null;
  briefingId: string | null;
  elapsedMs: number | null;
  activeElapsedMs: number | null;
  payload?: Record<string, string | number | boolean | null>;
}

let current: {
  sessionId: string;
  startedAt: number;
  source: SessionSourceTag;
  briefingId: string | null;
  contentVersion: number | null;
  activeMs: number;
  lastVisibleAt: number;
  visible: boolean;
} | null = null;

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s-${Date.now()}`;
}

function isForeground(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

function flushActive(): void {
  if (!current?.visible) return;
  current.activeMs += Date.now() - current.lastVisibleAt;
  current.lastVisibleAt = Date.now();
}

function onVisibility(): void {
  if (!current) return;
  const fg = isForeground();
  if (!fg && current.visible) {
    flushActive();
    current.visible = false;
  } else if (fg && !current.visible) {
    current.visible = true;
    current.lastVisibleAt = Date.now();
  }
}

function currentActiveMs(): number | null {
  if (!current) return null;
  if (!current.visible) return current.activeMs;
  return current.activeMs + (Date.now() - current.lastVisibleAt);
}

export function beginTodaySession(meta: {
  briefingId?: string;
  contentVersion?: number;
  source?: SessionSourceTag;
}): void {
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility);
  }
  current = {
    sessionId: newSessionId(),
    startedAt: Date.now(),
    source: meta.source ?? "home_default",
    briefingId: meta.briefingId ?? null,
    contentVersion: meta.contentVersion ?? null,
    activeMs: 0,
    lastVisibleAt: Date.now(),
    visible: isForeground(),
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }
  logEvent("session_start");
}

export function endTodaySession(): void {
  if (current?.visible) flushActive();
  const wall = current ? Date.now() - current.startedAt : null;
  const active = currentActiveMs();
  logEvent("session_complete", { elapsedMs: wall, activeElapsedMs: active });
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility);
  }
  current = null;
}

export function loadEvents(): StudyEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudyEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logEvent(name: EventName, payload?: StudyEvent["payload"]): void {
  const wall = current ? Date.now() - current.startedAt : null;
  const event: StudyEvent = {
    eventId: newSessionId(),
    eventSchemaVersion: EVENT_SCHEMA_VERSION,
    t: new Date().toISOString(),
    name,
    sessionId: current?.sessionId ?? null,
    sessionSource: current?.source ?? null,
    appVersion: APP_VERSION,
    progressSchemaVersion: SCHEMA_VERSION,
    contentVersion: current?.contentVersion ?? (typeof payload?.contentVersion === "number" ? payload.contentVersion : null),
    briefingId: current?.briefingId ?? (typeof payload?.briefingId === "string" ? payload.briefingId : null),
    elapsedMs: name === "session_complete" ? wall : null,
    activeElapsedMs: name === "session_complete" ? currentActiveMs() : null,
    payload,
  };
  try {
    const next = [...loadEvents(), event].slice(-MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 기록은 부가 기능이다. 저장이 막힌 환경에서 학습을 멈출 이유가 없다.
  }
}

export function clearEvents(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시한다.
  }
}

export function exportStudyDump(progressJson: unknown): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      progressSchemaVersion: SCHEMA_VERSION,
      progress: progressJson,
      events: loadEvents(),
    },
    null,
    2,
  );
}
