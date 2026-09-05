import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";
import { adminAuthorized } from "./_guard.js";
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
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:pilot@example.com";
  if (!storeReady() || !publicKey || !privateKey) {
    res.status(200).json({ ok: true, sent: 0, note: "push not configured" });
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const today = kstDateKey();
  const ids = await allLearnerIds();
  let sent = 0;
  let skipped = 0;
  const byKind: Record<string, number> = {};
  const gone: string[] = [];

  for (const id of ids) {
    const rec = await getLearner(id);
    if (!rec?.pushSubscription) {
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
    const copy = nudgeFor({
      daysSinceStudy: daysBetween(rec.lastStudyDate, today),
      doneToday: false,
      streakDays: rec.streakDays,
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

    try {
      await webpush.sendNotification(
        rec.pushSubscription as webpush.PushSubscription,
        JSON.stringify({ title: copy.title, body: copy.body, kind: copy.kind, url: "/" }),
      );
      sent += 1;
      byKind[copy.kind] = (byKind[copy.kind] ?? 0) + 1;
      await putLearner({
        ...rec,
        lastNotificationSentDate: today,
        lastNotificationKind: copy.kind,
        lastNotificationForStudyDate: rec.lastStudyDate,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // 404/410은 구독이 폐기된 것이다. 지우고 다음부터 시도하지 않는다.
      if (status === 404 || status === 410) {
        gone.push(id);
        await putLearner({ ...rec, pushSubscription: null, updatedAt: new Date().toISOString() });
      }
    }
  }

  res.status(200).json({ ok: true, today, learners: ids.length, sent, skipped, byKind, gone });
}
