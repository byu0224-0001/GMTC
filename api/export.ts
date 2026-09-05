import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminAuthorized, clientKey, rateLimited } from "./_guard.js";
import { eventCount, readEvents, storeReady } from "./_store.js";

/**
 * 파일럿 데이터 회수.
 *
 * 관리자 화면은 만들지 않는다. 운영자가 CSV로 내려받아 스프레드시트나 쿼리로 보면 된다.
 * 파일럿 참가자 데이터이므로 토큰 없이는 열리지 않는다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  /**
   * 비밀값이 없으면 거부한다. `있으면 검사한다`로 쓰면 환경변수를 잊은 배포에서
   * 파일럿 데이터가 그대로 열린다. 검색엔진에 잡히는 것도 막는다.
   */
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");
  if (!adminAuthorized(req, "EXPORT_TOKEN")) {
    res.status(404).json({ ok: false });
    return;
  }
  if (rateLimited(`export:${clientKey(req)}`, 10)) {
    res.status(429).json({ ok: false, error: "rate" });
    return;
  }
  if (!storeReady()) {
    res.status(200).json({ ok: true, count: 0, note: "store not configured" });
    return;
  }
  const total = await eventCount();
  const rows = await readEvents(0, Math.min(total, 20000) - 1);
  const parsed = rows
    .map((r) => {
      try {
        return JSON.parse(r) as { learnerId: string; receivedAt: string; event: Record<string, unknown> };
      } catch {
        return null;
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (req.query.format === "json") {
    res.status(200).json({ ok: true, count: parsed.length, rows: parsed });
    return;
  }

  const cols = [
    "learnerId",
    "eventId",
    "eventSchemaVersion",
    "t",
    "name",
    "sessionId",
    "sessionSource",
    "termId",
    "caseId",
    "questionForm",
    "lens",
    "exposureIndex",
    "correct",
    "responseTimeMs",
    "activeElapsedMs",
    "appVersion",
    "contentVersion",
  ];
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const row of parsed) {
    const e = row.event as Record<string, unknown>;
    const p = (e.payload ?? {}) as Record<string, unknown>;
    lines.push(
      cols
        .map((c) => esc(c === "learnerId" ? row.learnerId : (e[c] ?? p[c] ?? "")))
        .join(","),
    );
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="voca-pilot-events.csv"');
  res.status(200).send(lines.join("\n"));
}
