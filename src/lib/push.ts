import { isIOS, isStandalone } from "./install";
import { learnerId, syncDailyStatus } from "./learner";
import type { ProgressState } from "../types";

/**
 * 알림 구독.
 *
 * 이 기능의 한계를 분명히 해 둔다. 알림을 받는 사람과 받지 못하는 사람이 섞이고,
 * 재방문율을 하나로 묶어 `알림이 효과 있었다`고 해석하면 안 된다.
 * 파일럿에서는 permission, 설치, 구독, 알림 클릭, 그다음 학습 시작을 나눠 본다.
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

/** 알림을 켤 수 없는 이유. 지원되면 null. */
export function pushUnavailableReason(): "no_key" | "no_api" | null {
  if (typeof window === "undefined") return "no_api";
  const api =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!api) return "no_api";
  if (!VAPID_PUBLIC_KEY) return "no_key";
  return null;
}

/**
 * 지금 이 화면에서 구독이 가능한지.
 *
 * OS 이름을 UI에 쓰지 않되, 실제 제약은 반영한다. Android Chrome은 탭에서도
 * 구독할 수 있고, iOS는 홈 화면 웹 앱에서만 푸시가 간다. standalone이면 어느
 * 쪽이든 가능하다.
 */
export function canSubscribeHere(): boolean {
  if (!pushSupported()) return false;
  if (isStandalone()) return true;
  return !isIOS();
}

/**
 * 구독 API는 있는데 이 컨텍스트에서는 쓸 수 없을 때. 그때만 설치를 먼저 안내한다.
 */
export function needsInstallFirst(): boolean {
  return pushSupported() && !canSubscribeHere();
}

export function permission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

export async function hasPushSubscription(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return Boolean(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

export type PushUiState =
  | "unsupported"
  | "not_installed"
  | "permission_default"
  | "permission_granted"
  | "permission_denied"
  | "preprompt_later"
  | "opted_out";

/**
 * 알림 UI가 봐야 할 상태.
 *
 * `나중에`와 OS 거절을 같은 값으로 두면, 벨에서 다시 켤 수 있는 사람과
 * 시스템에서 막힌 사람을 파일럿에서 구분하지 못한다.
 * permission granted만으로 `켜짐`을 말하지 않는다. 구독이 없으면 꺼짐으로 본다.
 */
export function pushUiState(progress: ProgressState, subscribed?: boolean): PushUiState {
  if (!pushSupported()) return "unsupported";
  if (needsInstallFirst()) return "not_installed";
  const p = permission();
  if (p === "denied") return "permission_denied";
  if (p === "granted") {
    if (progress.pushDisabled) return "opted_out";
    if (subscribed === false) return "opted_out";
    return "permission_granted";
  }
  if (progress.pushLaterAt) return "preprompt_later";
  return "permission_default";
}

/**
 * 벨을 그릴지.
 *
 * 예전에는 지원되지 않으면 숨겼다. 그러면 키가 빠진 배포에서 설정 입구 자체가
 * 사라져, 알림이 없는 이유를 사용자가 전혀 볼 수 없다. 학습을 시작한 뒤에는
 * 항상 보여 주고, 켤 수 없으면 시트에서 이유를 말한다.
 */
export function showPushEntry(progress: ProgressState): boolean {
  return Boolean(progress.onboardedAt || progress.lastStudyDate || progress.doneSessions);
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** 사용자가 직접 버튼을 누른 경우에만 호출한다. 로컬 구독이 생긴 뒤에만 true. */
export async function subscribePush(progress: ProgressState): Promise<boolean> {
  if (!canSubscribeHere()) return false;
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

export async function currentPushSubscriptionJSON(): Promise<unknown | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? sub.toJSON() : null;
  } catch {
    return null;
  }
}

/** 크론 조건과 무관하게, 이 기기로 시험 알림 하나를 보낸다. */
export async function requestTestPush(): Promise<boolean> {
  const subscription = await currentPushSubscriptionJSON();
  if (!subscription) return false;
  try {
    const res = await fetch("/api/push-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId: learnerId(), subscription }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
