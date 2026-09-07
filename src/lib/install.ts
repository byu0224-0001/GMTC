/**
 * PWA 설치 환경 판단.
 *
 * 학습 기록은 이 브라우저의 localStorage에 남는다. iOS는 Safari와 홈 화면
 * 웹 앱의 저장소가 갈라질 수 있다. 그래서 설치를 권하되, 첫 학습의 전제로
 * 두지는 않는다. 카카오 인앱에서 브라우저를 강제로 띄우는 우회는 쓰지 않는다.
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

export function appUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin + "/";
}

export async function copyAppUrl(): Promise<boolean> {
  const href = appUrl();
  try {
    await navigator.clipboard.writeText(href);
    return true;
  } catch {
    return false;
  }
}

export function installGuide(surface: InstallSurface): { title: string; steps: string[]; note: string } {
  if (surface === "inapp") {
    return {
      title: "브라우저에서 열어 주세요",
      steps: [
        "아래 주소를 복사하거나, 화면 오른쪽 위 메뉴를 열어 주세요.",
        "Safari로 열기 또는 Chrome으로 열기를 고르세요.",
        "열린 브라우저에서 홈 화면에 추가하면 앱처럼 쓸 수 있어요.",
      ],
      note: "카카오톡 안에서는 설치 기능이 제한될 수 있어요.",
    };
  }
  if (surface === "ios") {
    return {
      title: "아이폰에 설치하기",
      steps: [
        "Safari에서 공유 버튼을 눌러 주세요.",
        "홈 화면에 추가를 선택하세요.",
        "웹 앱으로 열기가 보이면 켠 뒤 추가하세요.",
      ],
      note: "설치가 끝나면 홈 화면의 ‘금맹탈출’을 열어 주세요. 나중에 설치하면 지금 브라우저의 기록이 옮겨지지 않을 수 있어요.",
    };
  }
  return {
    title: "앱으로 설치하기",
    steps: [
      "Chrome 오른쪽 위의 메뉴(⋮)를 눌러 주세요.",
      "앱 설치 또는 홈 화면에 추가를 선택하세요.",
      "설치가 끝나면 홈 화면의 ‘금맹탈출’을 열어 주세요.",
    ],
    note: "나중에 설치하면 지금 브라우저의 학습 기록이 자동으로 옮겨지지 않을 수 있어요.",
  };
}
