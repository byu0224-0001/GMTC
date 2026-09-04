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
  | "session_complete";

export interface StudyEvent {
  t: string;
  name: EventName;
  sessionId: string | null;
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

export function beginTodaySession(meta: { briefingId?: string; contentVersion?: number }): void {
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility);
  }
  current = {
    sessionId: newSessionId(),
    startedAt: Date.now(),
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
    t: new Date().toISOString(),
    name,
    sessionId: current?.sessionId ?? null,
    appVersion: APP_VERSION,
    progressSchemaVersion: SCHEMA_VERSION,
    contentVersion: current?.contentVersion ?? (typeof payload?.contentVersion === "number" ? payload.contentVersion : null),
    briefingId: current?.briefingId ?? (typeof payload?.briefingId === "string" ? payload.briefingId : null),
    elapsedMs: name === "session_complete" ? wall : null,
    activeElapsedMs: name === "session_complete" ? currentActiveMs() : null,
    payload,
  };
  const next = [...loadEvents(), event].slice(-MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
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
