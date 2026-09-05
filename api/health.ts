import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eventCount, storeReady } from "./_store.js";

/**
 * 운영자용 상태 확인.
 *
 * 원칙이 하나 있다. **사용자에게는 조용히 degrade하고, 운영자에게는 시끄럽게 실패한다.**
 *
 * 앱은 서버 설정이 하나도 없어도 정상 동작해야 하므로 /api/events는 200을 돌려준다.
 * 그런데 그러면 환경변수를 깜빡한 배포에서 모든 요청이 성공하고 데이터는 0건인 상태를
 * 아무도 모른 채 파일럿이 지나갈 수 있다. 그걸 막는 게 이 엔드포인트다.
 *
 * 하나라도 빠져 있으면 503을 돌려준다. 파일럿 시작 전에 이 응답이 200인지 확인한다.
 * 비밀값 자체는 절대 돌려주지 않고, 설정됐는지만 알려 준다.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  const set = (v: string | undefined, min = 16) => Boolean(v && v.length >= min);
  const checks = {
    store: storeReady(),
    exportToken: set(process.env.EXPORT_TOKEN),
    cronSecret: set(process.env.CRON_SECRET),
    vapidPublic: set(process.env.VAPID_PUBLIC_KEY, 40),
    vapidPrivate: set(process.env.VAPID_PRIVATE_KEY, 20),
    vapidSubject: set(process.env.VAPID_SUBJECT, 7),
  };

  let events: number | null = null;
  let storeError: string | null = null;
  if (checks.store) {
    try {
      events = await eventCount();
    } catch (e) {
      storeError = String(e);
      checks.store = false;
    }
  }

  /**
   * 알림은 선택이므로 나누어 판정한다.
   * 수집이 안 되면 파일럿 자체가 성립하지 않으므로 그건 실패로 본다.
   */
  const collecting = checks.store && checks.exportToken;
  const notifying =
    checks.cronSecret && checks.vapidPublic && checks.vapidPrivate && checks.vapidSubject;
  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  res.status(collecting ? 200 : 503).json({
    ok: collecting,
    collecting,
    notifying,
    events,
    storeError,
    missing,
    hint: collecting
      ? notifying
        ? null
        : "알림 없이 파일럿을 진행할 수 있습니다. 알림을 쓰려면 VAPID와 CRON_SECRET을 설정하세요."
      : "수집이 꺼져 있습니다. 이 상태로 파일럿을 시작하면 데이터가 남지 않습니다. docs/pilot-setup.md 참고.",
  });
}
