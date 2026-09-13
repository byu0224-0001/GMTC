import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminAuthorized, validLearnerId } from "./_guard.js";
import { configureVapid, deliverPush, recordNudgeSent, validSubscription } from "./_push.js";
import { allLearnerIds, getLearner, putLearner, storeReady } from "./_store.js";
import { nudgeFor } from "../src/content/notifications.js";

/**
 * 하루 한 번 도는 알림 스케줄러.
 *
 * 조건은 세 개뿐이다. 더 붙이지 않는다.
 *  1. 알림을 허용했다
 *  2. 오늘 권장 분량을 아직 안 했다
 *  3. 오늘 아직 알림을 안 보냈다
 *
 * 여기에 개인별 최적 시각 예측이나 행동 패턴 분석을 넣지 않는다. 파일럿에서 알고 싶은
 * 것은 `하루 한 번의 적절한 알림이 재방문을 돕는가` 하나다.
 *
 * 문구는 src/content/notifications.ts에서 가져온다. 같은 문구를 두 곳에 적으면
 * 한쪽만 고쳐지고 갈라진다.
 *
 * `?test=1&learnerId=` 는 운영자가 파이프만 확인할 때 쓴다. 완료·하루 1회 조건을
 * 건너뛰고, 저녁 발송 기록은 남기지 않는다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstDateKey(now = new Date()): string {
  const d = new Date(now.getTime() + KST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

/** 한 번도 학습하지 않은 사람은 null. 그런 사람에게는 아무 알림도 보내지 않는다. */
function daysBetween(from: string | null, to: string): number | null {
  if (!from) return null;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 비밀값이 없으면 거부한다. 누구나 호출해 알림을 쏘게 두면 안 된다.
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (!adminAuthorized(req, "CRON_SECRET")) {
    res.status(404).json({ ok: false });
    return;
  }
  if (!storeReady() || !configureVapid()) {
    res.status(200).json({ ok: true, sent: 0, note: "push not configured" });
    return;
  }

  const today = kstDateKey();
  const testId = req.query.test === "1" && typeof req.query.learnerId === "string" ? req.query.learnerId : null;
  if (testId) {
    if (!validLearnerId(testId)) {
      res.status(400).json({ ok: false, error: "learnerId" });
      return;
    }
    const rec = await getLearner(testId);
    const sub = validSubscription(rec?.pushSubscription);
    if (!rec || !sub) {
      res.status(200).json({ ok: false, today, test: true, sent: 0, note: "no subscription" });
      return;
    }
    const result = await deliverPush(sub, {
      kind: "test",
      title: "시험 알림이에요.",
      body: "이 알림이 보이면 이 기기로 푸시가 도착한 거예요.",
    });
    if (result === "ok") {
      await recordNudgeSent(testId, "test", true);
      res.status(200).json({ ok: true, today, test: true, sent: 1 });
      return;
    }
    if (result === "gone") {
      await putLearner({ ...rec, pushSubscription: null, updatedAt: new Date().toISOString() });
    }
    res.status(200).json({ ok: false, today, test: true, sent: 0, note: result });
    return;
  }

  const ids = await allLearnerIds();
  let sent = 0;
  let skipped = 0;
  const byKind: Record<string, number> = {};
  const gone: string[] = [];

  for (const id of ids) {
    const rec = await getLearner(id);
    const sub = validSubscription(rec?.pushSubscription);
    if (!rec || !sub) {
      skipped += 1;
      continue;
    }
    if (rec.lastDefaultDoneDate === today) {
      skipped += 1;
      continue;
    }
    if (rec.lastNotificationSentDate === today) {
      skipped += 1;
      continue;
    }
    const since = daysBetween(rec.lastStudyDate, today);
    const copy = nudgeFor({
      daysSinceStudy: since,
      doneToday: false,
      streakDays: since !== null && since <= 1 ? rec.streakDays : 0,
      seed: `${today}-${rec.learnerId}`,
    });
    if (!copy) {
      skipped += 1;
      continue;
    }
    /**
     * 같은 공백 구간에서 같은 문구를 반복하지 않는다.
     * 3일 쉰 사람에게 `금융문맹 되어가는 중…`을 매일 보내면 그건 유머가 아니라 잔소리다.
     */
    if (
      copy.kind === rec.lastNotificationKind &&
      rec.lastNotificationForStudyDate === rec.lastStudyDate
    ) {
      skipped += 1;
      continue;
    }

    const result = await deliverPush(sub, { ...copy, url: "/" });
    if (result === "ok") {
      sent += 1;
      byKind[copy.kind] = (byKind[copy.kind] ?? 0) + 1;
      await putLearner({
        ...rec,
        lastNotificationSentDate: today,
        lastNotificationKind: copy.kind,
        lastNotificationForStudyDate: rec.lastStudyDate,
        updatedAt: new Date().toISOString(),
      });
      try {
        await recordNudgeSent(id, copy.kind, false);
      } catch {
        /* 발송은 됐으므로 이벤트 실패로 다음 사람을 막지 않는다. */
      }
      continue;
    }
    if (result === "gone") {
      gone.push(id);
      await putLearner({ ...rec, pushSubscription: null, updatedAt: new Date().toISOString() });
    }
  }

  res.status(200).json({ ok: true, today, learners: ids.length, sent, skipped, byKind, gone });
}
