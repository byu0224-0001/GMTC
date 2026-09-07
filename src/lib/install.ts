/**
 * PWA 설치 환경 판단.
 *
 * 학습 기록이 localStorage에 있다. iOS는 Safari와 홈 화면 웹 앱의 저장소가
 * 갈라지므로, 파일럿에서는 공부보다 설치를 먼저 권한다. 카카오 인앱에서
 * 브라우저를 강제로 띄우는 우회는 OS·앱 버전마다 깨지므로 쓰지 않는다.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallSurface = "standalone" | "inapp" | "ios" | "android" | "other";

let deferred: BeforeInstallPromptEvent | null = null;
const readyListeners = new Set<(ready: boolean) => void>();
let armed = false;

function ua(): string {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(ua())) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAndroid(): boolean {
  return /Android/i.test(ua());
}

export function isInAppBrowser(): boolean {
  const s = ua();
  return /KAKAOTALK|KakaoTalk|NAVER|Instagram|FBAN|FBAV|FBIOS|Line\/|WhatsApp|DaumApps|everytimeapp/i.test(
    s,
  );
}

export function installSurface(): InstallSurface {
  if (isStandalone()) return "standalone";
  if (isInAppBrowser()) return "inapp";
  if (isIOS()) return "ios";
  if (isAndroid()) return "android";
  return "other";
}

export function canNativeInstall(): boolean {
  return deferred != null;
}

export function onNativeInstallReady(fn: (ready: boolean) => void): () => void {
  readyListeners.add(fn);
  fn(deferred != null);
  return () => {
    readyListeners.delete(fn);
  };
}

function setDeferred(next: BeforeInstallPromptEvent | null): void {
  deferred = next;
  readyListeners.forEach((fn) => fn(next != null));
}

/** 첫 화면이 뜨기 전에 한 번만 건다. 이벤트를 놓치면 원클릭 설치가 안 된다. */
export function armInstallPrompt(): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    setDeferred(event as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => {
    setDeferred(null);
  });
}

export async function promptNativeInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const event = deferred;
  setDeferred(null);
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

export async function copyAppUrl(): Promise<boolean> {
  const href = typeof window === "undefined" ? "" : window.location.origin + "/";
  try {
    await navigator.clipboard.writeText(href);
    return true;
  } catch {
    return false;
  }
}
