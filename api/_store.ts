/**
 * 파일럿용 최소 저장소.
 *
 * 학습 상태(term별 repetitions, dueAt)는 서버로 보내지 않는다. 그건 localStorage가
 * source of truth다. 여기 저장하는 것은 운영자가 원격으로 봐야 하는 것뿐이다.
 *  - 이벤트 로그 (참가자 휴대폰에만 있으면 운영자가 볼 수 없다)
 *  - 알림 판단에 필요한 최소 상태
 *
 * Upstash Redis REST(Vercel KV)만 쓴다. SDK를 넣지 않고 fetch로 호출해 의존성을 줄인다.
 * 환경변수가 없으면 저장을 건너뛴다. 파일럿 준비가 안 된 상태에서 배포해도
 * 앱이 죽지 않아야 한다.
 */

const URL_ENV = process.env.KV_REST_API_URL;
const TOKEN_ENV = process.env.KV_REST_API_TOKEN;

export function storeReady(): boolean {
  return Boolean(URL_ENV && TOKEN_ENV);
}

async function cmd(args: (string | number)[]): Promise<unknown> {
  if (!storeReady()) return null;
  const res = await fetch(`${URL_ENV}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN_ENV}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args.map(String)),
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json.result ?? null;
}

/** 이벤트는 뒤에 붙이기만 한다. 파일럿 규모에서 하나의 리스트로 충분하다. */
export async function pushEvents(rows: unknown[]): Promise<void> {
  if (!rows.length) return;
  await cmd(["RPUSH", "voca:events", ...rows.map((r) => JSON.stringify(r))]);
}

export async function eventCount(): Promise<number> {
  const n = await cmd(["LLEN", "voca:events"]);
  return typeof n === "number" ? n : Number(n ?? 0);
}

export async function readEvents(from: number, to: number): Promise<string[]> {
  const rows = await cmd(["LRANGE", "voca:events", from, to]);
  return Array.isArray(rows) ? (rows as string[]) : [];
}

export interface LearnerRecord {
  learnerId: string;
  timezone: string;
  /** 마지막으로 권장 분량을 마친 날(KST 기준 YYYY-MM-DD). */
  lastDefaultDoneDate: string | null;
  /** 마지막으로 학습 행동이 있었던 날. 공백 일수를 재는 데 쓴다. */
  lastStudyDate: string | null;
  streakDays: number;
  /** 마지막으로 알림을 보낸 날과 종류. 같은 공백에서 반복 발송을 막는다. */
  lastNotificationSentDate: string | null;
  lastNotificationKind: string | null;
  /** 그 알림을 보낼 때의 lastStudyDate. 공백 구간을 식별한다. */
  lastNotificationForStudyDate: string | null;
  pushSubscription: unknown | null;
  updatedAt: string;
}

const KEY = (id: string) => `voca:learner:${id}`;

export async function getLearner(id: string): Promise<LearnerRecord | null> {
  const raw = await cmd(["GET", KEY(id)]);
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as LearnerRecord;
  } catch {
    return null;
  }
}

export async function putLearner(rec: LearnerRecord): Promise<void> {
  await cmd(["SET", KEY(rec.learnerId), JSON.stringify(rec)]);
  await cmd(["SADD", "voca:learners", rec.learnerId]);
}

export async function allLearnerIds(): Promise<string[]> {
  const ids = await cmd(["SMEMBERS", "voca:learners"]);
  return Array.isArray(ids) ? (ids as string[]) : [];
}

export async function deleteLearner(id: string): Promise<void> {
  await cmd(["DEL", KEY(id)]);
  await cmd(["SREM", "voca:learners", id]);
}
