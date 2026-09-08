import { useEffect, useState } from "react";
import { logEvent } from "../lib/events";
import {
  appUrl,
  copyAppUrl,
  installGuide,
  installSurface,
  isStandalone,
  onNativeInstallReady,
  promptNativeInstall,
  type InstallSurface,
} from "../lib/install";

const DISMISS_KEY = "voca:install-nudge-dismissed";

export function installNudgeDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function dismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * 첫 학습을 막지 않는다. 한 번 써 본 뒤에만 이어서 쓰려면 홈 화면 추가를 권한다.
 */
export function shouldShowInstallNudge(doneSessions: number): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone() || installNudgeDismissed()) return false;
  return doneSessions >= 1;
}

export function InstallNudge({
  onDismiss,
  afterSession = false,
}: {
  onDismiss?: () => void;
  afterSession?: boolean;
}) {
  const [surface] = useState<InstallSurface>(() => installSurface());
  const [nativeReady, setNativeReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const guide = installGuide(surface);

  useEffect(() => onNativeInstallReady(setNativeReady), []);

  function close() {
    dismiss();
    logEvent("install_choice", { surface, choice: "nudge_dismiss" });
    onDismiss?.();
  }

  async function native() {
    setBusy(true);
    const outcome = await promptNativeInstall();
    setBusy(false);
    logEvent("install_choice", { surface, choice: `nudge_native_${outcome}` });
    if (outcome === "accepted") close();
    else setOpen(true);
  }

  return (
    <div className="card pad-lg">
      <div className="caption">{afterSession ? "이어서 보려면" : "다음에 바로 이어서 하려면"}</div>
      <p style={{ margin: "8px 0 0", fontWeight: 600, lineHeight: 1.45 }}>
        {afterSession ? "다음에도 바로 이어서 볼까요?" : "홈 화면에 추가해 보세요."}
      </p>
      <p className="muted" style={{ margin: "6px 0 0" }}>
        {surface === "inapp"
          ? "카카오톡 안에서는 설치가 제한될 수 있어요. Safari나 Chrome에서 열면 홈 화면에 넣을 수 있어요."
          : afterSession
            ? "홈 화면에 추가하면 학습 기록을 이어서 보고 알림도 받을 수 있어요."
            : "같은 자리에서 열고, 공부한 기록을 이어가고, 알림도 받을 수 있어요."}
      </p>
      {open ? (
        <>
          <ol className="install-steps" style={{ marginTop: 12 }}>
            {guide.steps.map((text, i) => (
              <li key={text} className="install-step">
                <span className="install-num">{i + 1}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.6 }}>{guide.note}</p>
          {surface === "inapp" ? (
            <>
              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  const ok = await copyAppUrl();
                  setCopied(ok);
                  logEvent("install_choice", { surface, choice: ok ? "nudge_copy" : "nudge_copy_fail" });
                }}
              >
                {copied ? "주소를 복사했어요" : "주소 복사하기"}
              </button>
              <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>{appUrl()}</p>
            </>
          ) : null}
        </>
      ) : null}
      <div className="stack" style={{ marginTop: 14 }}>
        {surface === "inapp" || surface === "ios" || !nativeReady ? (
          <button
            className="btn btn-primary"
            onClick={() => {
              setOpen(true);
              logEvent("install_choice", { surface, choice: "nudge_guide" });
            }}
          >
            {surface === "inapp" ? "여는 방법 보기" : afterSession ? "홈 화면에 추가하는 방법" : "설치 방법 보기"}
          </button>
        ) : (
          <button className="btn btn-primary" disabled={busy} onClick={() => void native()}>
            {busy ? "설치 창을 여는 중" : "앱으로 설치하기"}
          </button>
        )}
        <button className="btn btn-ghost" onClick={close}>{afterSession ? "웹에서 계속하기" : "나중에"}</button>
      </div>
    </div>
  );
}
