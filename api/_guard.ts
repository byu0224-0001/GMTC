import type { VercelRequest } from "@vercel/node";

/**
 * 관리·운영 엔드포인트 접근 통제.
 *
 * 여기서 한 가지를 분명히 한다. **비밀값이 설정되지 않았으면 통과가 아니라 거부다.**
 * `secret이 있으면 검사한다`로 쓰면 환경변수를 깜빡한 배포에서 /api/export가
 * 그대로 열린다. 파일럿 데이터라도 사용시간·정답·구독 정보가 들어 있다.
 * 잊어버리는 쪽이 안전한 방향이어야 한다.
 */
export function adminAuthorized(req: VercelRequest, envName: "EXPORT_TOKEN" | "CRON_SECRET"): boolean {
  const expected = process.env[envName];
  if (!expected || expected.length < 16) return false;
  const bearer = req.headers.authorization;
  if (typeof bearer === "string" && timingSafeEqual(bearer, `Bearer ${expected}`)) return true;
  const q = req.query.token;
  if (typeof q === "string" && timingSafeEqual(q, expected)) return true;
  // Vercel 크론은 이 헤더를 붙인다. 외부에서는 붙일 수 없다.
  if (envName === "CRON_SECRET" && req.headers["x-vercel-cron"]) return true;
  return false;
}

/** 길이 차이로 값이 새어 나가지 않게 한다. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * 아주 단순한 호출량 제한.
 *
 * 서버리스라 인스턴스마다 메모리가 따로 있으므로 이건 완전한 방어가 아니다.
 * 다만 한 인스턴스에 쏟아지는 반복 호출은 막아 준다. 파일럿 규모에서는 이 정도로
 * 충분하고, 완전한 방어가 필요해지면 그때 저장소 기반으로 옮긴다.
 */
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;

export function rateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || rec.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  rec.count += 1;
  return rec.count > limit;
}

export function clientKey(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  const ip = Array.isArray(fwd) ? fwd[0] : (fwd ?? "unknown");
  return String(ip).split(",")[0].trim();
}

/** 익명 id 형식 검사. 임의 문자열을 키로 쓰면 저장소에 쓰레기가 쌓인다. */
const ID_SHAPE = /^[A-Za-z0-9_-]{8,64}$/;

export function validLearnerId(v: unknown): v is string {
  return typeof v === "string" && ID_SHAPE.test(v);
}
