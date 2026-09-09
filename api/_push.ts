import webpush from "web-push";
import { pushEvents } from "./_store.js";

/**
 * 웹 푸시 발송의 공통 부분.
 * 크론과 시험 발송이 같은 VAPID·구독 검사·이벤트 기록을 쓰게 한다.
 */

export function validSubscription(v: unknown): webpush.PushSubscription | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  if (typeof s.endpoint !== "string") return null;
  if (s.endpoint.length > 600 || !s.endpoint.startsWith("https://")) return null;
  const keys = s.keys as Record<string, unknown> | undefined;
  if (!keys || typeof keys !== "object") return null;
  if (typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return null;
  if (keys.p256dh.length > 200 || keys.auth.length > 100) return null;
  return {
    endpoint: s.endpoint,
    expirationTime: typeof s.expirationTime === "number" ? s.expirationTime : null,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

export function configureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:pilot@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function deliverPush(
  sub: webpush.PushSubscription,
  payload: { title: string; body: string; kind: string; url?: string },
): Promise<"ok" | "gone" | "error"> {
  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        kind: payload.kind,
        url: payload.url ?? "/",
      }),
    );
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    return "error";
  }
}

export async function recordNudgeSent(
  learnerId: string,
  kind: string,
  test: boolean,
): Promise<void> {
  await pushEvents([
    {
      learnerId,
      receivedAt: new Date().toISOString(),
      event: {
        eventId: crypto.randomUUID(),
        eventSchemaVersion: 1,
        t: new Date().toISOString(),
        name: "nudge_sent",
        sessionId: null,
        sessionSource: null,
        appVersion: "0.1.0",
        payload: { kind, test },
      },
    },
  ]);
}
