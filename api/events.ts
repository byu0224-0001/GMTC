import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientKey, rateLimited, validLearnerId } from "./_guard.js";
import { pushEvents, storeReady } from "./_store.js";

/**
 * 파일럿 이벤트 수집.
 *
 * 이벤트가 참가자 휴대폰의 localStorage에만 있으면 운영자는 아무것도 볼 수 없다.
 * 그래서 서버로 한 번 더 보낸다. 관리자 화면은 만들지 않는다. 조회는 /api/export로 한다.
 *
 * 실패해도 클라이언트는 학습을 계속한다. 여기서 200이 아닌 응답이 와도
 * 앱은 큐에 남겨 두고 다음에 다시 보낼 뿐이다.
 *
 * 이 엔드포인트는 공개되어야 하므로(참가자 브라우저가 직접 호출한다) 들어오는 값을
 * 그대로 믿지 않는다. 개수·크기·형태를 모두 자른다.
 */

const MAX_ROWS = 200;
const MAX_BODY = 128 * 1024;
/** 한 IP에서 1분에 허용할 호출 수. 세션 하나가 보내는 횟수보다 넉넉하다. */
const RATE_LIMIT = 30;
const NAME_SHAPE = /^[a-z_]{3,40}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method" });
    return;
  }
  if (rateLimited(`events:${clientKey(req)}`, RATE_LIMIT)) {
    res.status(429).json({ ok: false, error: "rate" });
    return;
  }
  if (!storeReady()) {
    // 저장소가 아직 연결되지 않은 배포. 클라이언트가 무한 재시도하지 않게 성공으로 답한다.
    // 운영자는 /api/health로 이 상태를 확인해야 한다.
    res.status(200).json({ ok: true, stored: 0, note: "store not configured" });
    return;
  }
  try {
    const body = req.body as { learnerId?: unknown; events?: unknown } | undefined;
    if (!validLearnerId(body?.learnerId)) {
      res.status(400).json({ ok: false, error: "learnerId" });
      return;
    }
    const raw = Array.isArray(body?.events) ? (body!.events as unknown[]).slice(0, MAX_ROWS) : [];
    const events = raw.filter(validEvent);
    if (events.length === 0) {
      res.status(400).json({ ok: false, error: "no valid events" });
      return;
    }
    const receivedAt = new Date().toISOString();
    const rows = events.map((e) => ({ learnerId: body!.learnerId, receivedAt, event: e }));
    if (JSON.stringify(rows).length > MAX_BODY) {
      res.status(413).json({ ok: false, error: "too large" });
      return;
    }
    await pushEvents(rows);
    res.status(200).json({ ok: true, stored: rows.length, rejected: raw.length - events.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}

/**
 * 최소 형태 검사.
 *
 * 스키마를 엄격하게 고정하지는 않는다. 파일럿 도중 payload에 필드가 늘어날 수 있고
 * 그때마다 서버를 배포해야 한다면 오히려 데이터를 잃는다. 대신 키 개수와 문자열 길이를
 * 잘라서 저장소가 임의의 큰 값으로 오염되는 것만 막는다.
 */
function validEvent(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  if (typeof e.name !== "string" || !NAME_SHAPE.test(e.name)) return false;
  if (typeof e.t !== "string" || e.t.length > 40) return false;
  if (typeof e.eventId !== "string" || e.eventId.length > 64) return false;
  const payload = e.payload;
  if (payload !== null && payload !== undefined) {
    if (typeof payload !== "object" || Array.isArray(payload)) return false;
    const keys = Object.keys(payload as object);
    if (keys.length > 20) return false;
    for (const k of keys) {
      if (k.length > 40) return false;
      const val = (payload as Record<string, unknown>)[k];
      if (typeof val === "string" && val.length > 200) return false;
      if (val !== null && !["string", "number", "boolean"].includes(typeof val)) return false;
    }
  }
  return true;
}
