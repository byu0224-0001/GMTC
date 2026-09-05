import { loadEvents, type StudyEvent } from "./events";
import { kstDateKey } from "./srs";
import type { ProgressState } from "../types";

/**
 * 익명 학습자 식별과 서버 전송.
 *
 * 여기서 분명히 해 둘 한계가 있다. 이 id는 localStorage에 있으므로 브라우저 데이터를
 * 지우거나 기기를 바꾸면 같은 사람인지 알 수 없다. 그래서 이 값은 `데이터 영속성`을
 * 위한 것이 아니다. 다중 기기 복구는 계정을 만들어야 풀리는 문제이고 지금은 미룬다.
 *
 * 이 id가 실제로 하는 일은 두 가지다.
 *  1. 파일럿 이벤트를 사람 단위로 묶어 운영자가 볼 수 있게 한다
 *  2. 알림을 보낼 대상을 서버가 식별한다
 *
 * 모든 요청은 best-effort다. 실패해도 학습은 그대로 진행된다.
 */

const ID_KEY = "voca:learner:v1";
const CURSOR_KEY = "voca:learner:sent:v1";
const OPTOUT_KEY = "voca:learner:optout:v1";
/** 서버에 닿지 못한 완료 상태. 이벤트와 달리 유실되면 잘못된 알림으로 이어진다. */
const OUTBOX_KEY = "voca:learner:outbox:v1";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장이 막힌 환경. 이번 세션 동안만 익명으로 동작한다.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시한다.
  }
}

export function learnerId(): string {
  const existing = read(ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `l-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  write(ID_KEY, id);
  return id;
}

/** 파일럿 데이터 전송을 끈 사용자. 기록 지우기와 함께 쓸 수 있게 둔다. */
export function analyticsOptedOut(): boolean {
  return read(OPTOUT_KEY) === "1";
}

export function setAnalyticsOptOut(off: boolean): void {
  write(OPTOUT_KEY, off ? "1" : "0");
}

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
  } catch {
    return "Asia/Seoul";
  }
}

/**
 * 아직 보내지 않은 이벤트만 올린다.
 *
 * 이벤트 배열은 최근 500개만 유지되는 링버퍼이므로, 보낸 개수를 커서로 들고 있으면
 * 잘려 나간 만큼 어긋난다. 그래서 마지막으로 보낸 이벤트의 시각을 기준으로 자른다.
 */
export async function flushEvents(): Promise<void> {
  if (analyticsOptedOut()) return;
  const events = loadEvents();
  if (events.length === 0) return;
  const cursor = read(CURSOR_KEY);
  const pending = cursor ? events.filter((e) => e.t > cursor) : events;
  if (pending.length === 0) return;
  const batch = pending.slice(0, 200);
  try {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId: learnerId(), events: batch.map(trim) }),
      keepalive: true,
    });
    if (res.ok) write(CURSOR_KEY, batch[batch.length - 1].t);
  } catch {
    // 다음 기회에 다시 보낸다. 커서를 올리지 않으므로 유실되지 않는다.
  }
}

/** 보낼 필요 없는 필드를 떨어낸다. 학습 상태 전체는 서버로 보내지 않는다. */
function trim(e: StudyEvent) {
  return {
    eventId: e.eventId,
    eventSchemaVersion: e.eventSchemaVersion,
    t: e.t,
    name: e.name,
    sessionId: e.sessionId,
    sessionSource: e.sessionSource,
    appVersion: e.appVersion,
    contentVersion: e.contentVersion,
    activeElapsedMs: e.activeElapsedMs,
    payload: e.payload ?? null,
  };
}

/**
 * 알림 판단에 필요한 최소 상태만 올린다.
 * 용어별 진도는 보내지 않는다.
 *
 * 이벤트와 달리 이건 유실되면 안 된다. 완료 사실이 서버에 닿지 않으면 그날 저녁에
 * `아직 안 했다`고 판단해 알림이 간다. 오늘 다 한 사람에게 가는 독촉은 이벤트 몇 개
 * 유실되는 것과 비교할 수 없이 나쁘다. 그래서 실패하면 큐에 남기고 다시 보낸다.
 */
export async function syncDailyStatus(
  progress: ProgressState,
  extra?: { pushSubscription: unknown | null },
): Promise<void> {
  if (analyticsOptedOut() && !extra) return;
  const body = {
    learnerId: learnerId(),
    timezone: timezone(),
    lastDefaultDoneDate: progress.defaultDoneDate,
    lastStudyDate: progress.lastStudyDate,
    streakDays: progress.streakDays,
    ...(extra ? { pushSubscription: extra.pushSubscription } : {}),
  };
  const ok = await postStatus(body);
  if (!ok) write(OUTBOX_KEY, JSON.stringify(body));
}

async function postStatus(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch("/api/daily-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 못 보낸 완료 상태를 다시 보낸다.
 *
 * 앱을 다시 열 때와 온라인으로 돌아올 때 부른다. 큐에는 마지막 상태 하나만 둔다.
 * 완료 여부는 누적이 아니라 현재 상태이므로, 여러 개를 쌓아 순서대로 보낼 이유가 없다.
 */
export async function flushStatusOutbox(): Promise<void> {
  const raw = read(OUTBOX_KEY);
  if (!raw) return;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    remove(OUTBOX_KEY);
    return;
  }
  if (await postStatus(body)) remove(OUTBOX_KEY);
}

export function statusPending(): boolean {
  return read(OUTBOX_KEY) !== null;
}

/**
 * 사용자가 기록을 지웠을 때.
 *
 * 기기 데이터만 지우고 서버 상태를 남기면 `지웠다`는 말이 반만 사실이 된다.
 * 지운 뒤에도 같은 id로 알림이 오거나 새 기록이 옛 사람에 붙는다. 그래서
 * 서버 기록을 지우고 id도 새로 발급한다. 지운 시점 이전과 이후는 다른 사람으로 센다.
 */
export async function resetLearner(): Promise<void> {
  try {
    await fetch(`/api/daily-status?learnerId=${encodeURIComponent(learnerId())}`, {
      method: "DELETE",
    });
  } catch {
    // 서버에 닿지 못해도 기기 쪽은 지운다.
  }
  remove(ID_KEY);
  remove(CURSOR_KEY);
  remove(OUTBOX_KEY);
  learnerId();
}

/** 마지막 학습에서 며칠 지났는지. 한 번도 학습하지 않았으면 null이다. */
export function daysSinceStudy(progress: ProgressState, now = new Date()): number | null {
  if (!progress.lastStudyDate) return null;
  const a = Date.parse(`${progress.lastStudyDate}T00:00:00Z`);
  const b = Date.parse(`${kstDateKey(now)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
