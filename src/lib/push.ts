import { syncDailyStatus } from "./learner";
import type { ProgressState } from "../types";

/**
 * 알림 구독.
 *
 * 이 기능의 한계를 분명히 해 둔다. iOS에서는 홈 화면에 추가한 뒤에만 동작한다.
 * 그래서 알림을 받는 사람과 받지 못하는 사람이 섞이고, 재방문율을 하나로 묶어
 * `알림이 효과 있었다`고 해석하면 안 된다. 파일럿 분석에서 두 집단을 나눠 본다.
 *
 * 지원되지 않는 환경에서도 앱은 그대로 쓸 수 있어야 한다. 여기서 실패하는 모든 경로는
 * 조용히 false를 돌려주고 끝난다.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

/**
 * iOS는 홈 화면에 추가하지 않으면 알림을 받을 수 없다.
 * 설치 전에 권한을 물으면 거절만 쌓이므로, 먼저 설치를 안내해야 하는지 판단한다.
 */
export function needsInstallFirst(): boolean {
  if (typeof navigator === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!ios) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return !standalone;
}

export function permission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** 사용자가 직접 버튼을 누른 경우에만 호출한다. */
export async function subscribePush(progress: ProgressState): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const granted = await Notification.requestPermission();
    if (granted !== "granted") return false;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
      }));
    await syncDailyStatus(progress, { pushSubscription: sub.toJSON() });
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribePush(progress: ProgressState): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    // 무시한다.
  }
  await syncDailyStatus(progress, { pushSubscription: null });
}
