import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientKey, originAllowed, rateLimited, validLearnerId } from "./_guard.js";
import { configureVapid, deliverPush, recordNudgeSent, validSubscription } from "./_push.js";
import { storeReady } from "./_store.js";

/**
 * 지금 이 기기의 구독으로 시험 알림을 보낸다.
 *
 * 크론 조건(오늘 완료·하루 1회)과 분리한다. 파이프가 살아 있는지만 본다.
 * 다른 학습자에게 보낼 수 없다. 본문 구독 정보로만 보낸다.
 * 하루 발송 기록은 건드리지 않는다. 시험이 저녁 리마인더를 먹어 버리면 안 된다.
 */
const TEST_COPY = {
  kind: "test",
  title: "시험 알림이에요.",
  body: "이 알림이 보이면 이 기기로 푸시가 도착한 거예요.",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method" });
    return;
  }
  if (!originAllowed(req)) {
    res.status(403).json({ ok: false, error: "origin" });
    return;
  }
  if (rateLimited(`push-test:${clientKey(req)}`, 3)) {
    res.status(429).json({ ok: false, error: "rate" });
    return;
  }
  if (!storeReady() || !configureVapid()) {
    res.status(200).json({ ok: false, error: "push not configured" });
    return;
  }

  const body = req.body as { learnerId?: unknown; subscription?: unknown } | undefined;
  if (!validLearnerId(body?.learnerId)) {
    res.status(400).json({ ok: false, error: "learnerId" });
    return;
  }
  const sub = validSubscription(body?.subscription);
  if (!sub) {
    res.status(400).json({ ok: false, error: "subscription" });
    return;
  }

  const result = await deliverPush(sub, TEST_COPY);
  if (result === "ok") {
    try {
      await recordNudgeSent(body.learnerId, TEST_COPY.kind, true);
    } catch {
      /* 발송은 됐으므로 이벤트 실패로 시험 결과를 뒤집지 않는다. */
    }
    res.status(200).json({ ok: true, test: true });
    return;
  }
  res.status(result === "gone" ? 410 : 500).json({ ok: false, error: result });
}
