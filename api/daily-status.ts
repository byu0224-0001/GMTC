import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientKey, originAllowed, rateLimited, validLearnerId } from "./_guard.js";
import { getLearner, putLearner, deleteLearner, storeReady, type LearnerRecord } from "./_store.js";
import { validSubscription } from "./_push.js";

/**
 * 알림 판단에 필요한 최소 상태만 받는다.
 *
 * 용어별 repetitions와 dueAt은 받지 않는다. 그걸 서버와 맞추려 하면
 * 로컬과 서버 중 어느 쪽이 진실인지 정하는 문제가 생기고, 실패한 요청 하나가
 * 학습 진도를 되돌릴 수 있다. 학습 상태는 기기에 두고, 서버는 알림만 판단한다.
 *
 * DELETE는 파일럿 참가자의 기록 삭제 요청을 처리한다.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!storeReady()) {
    res.status(200).json({ ok: true, note: "store not configured" });
    return;
  }
  if (!originAllowed(req)) {
    res.status(403).json({ ok: false, error: "origin" });
    return;
  }
  if (rateLimited(`status:${clientKey(req)}`, 30)) {
    res.status(429).json({ ok: false, error: "rate" });
    return;
  }
  const body = req.body as Record<string, unknown> | undefined;
  const raw = body?.learnerId ?? req.query.learnerId;
  if (!validLearnerId(raw)) {
    res.status(400).json({ ok: false, error: "learnerId" });
    return;
  }
  const learnerId = raw;

  try {
    if (req.method === "DELETE") {
      await deleteLearner(learnerId);
      res.status(200).json({ ok: true, deleted: true });
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "method" });
      return;
    }

    const prev = await getLearner(learnerId);
    const str = (k: string, fallback: string | null): string | null => {
      const v = body?.[k];
      if (v === null) return null;
      return typeof v === "string" ? v.slice(0, 32) : fallback;
    };
    const next: LearnerRecord = {
      learnerId,
      timezone: str("timezone", prev?.timezone ?? "Asia/Seoul") ?? "Asia/Seoul",
      lastDefaultDoneDate: pickDate(body?.lastDefaultDoneDate, prev?.lastDefaultDoneDate ?? null),
      lastStudyDate: pickDate(body?.lastStudyDate, prev?.lastStudyDate ?? null),
      streakDays:
        typeof body?.streakDays === "number" && body.streakDays >= 0
          ? Math.min(9999, Math.round(body.streakDays))
          : (prev?.streakDays ?? 0),
      lastNotificationSentDate: prev?.lastNotificationSentDate ?? null,
      lastNotificationKind: prev?.lastNotificationKind ?? null,
      lastNotificationForStudyDate: prev?.lastNotificationForStudyDate ?? null,
      pushSubscription:
        "pushSubscription" in (body ?? {})
          ? validSubscription(body!.pushSubscription)
          : (prev?.pushSubscription ?? null),
      updatedAt: new Date().toISOString(),
    };
    await putLearner(next);
    res.status(200).json({ ok: true, push: Boolean(next.pushSubscription) });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server" });
  }
}

function pickDate(v: unknown, fallback: string | null): string | null {
  if (v === null) return null;
  if (typeof v === "string" && DATE.test(v)) return v;
  return fallback;
}
