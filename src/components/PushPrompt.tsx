import { useEffect, useState } from "react";
import { PUSH_PROMPT, PUSH_SETTINGS } from "../content/notifications";
import { logEvent } from "../lib/events";
import {
  loadProgress,
  markPushAsked,
  markPushLater,
  saveProgress,
  setPushDisabled,
} from "../lib/progress";
import {
  hasPushSubscription,
  needsInstallFirst,
  pushSupported,
  pushUiState,
  pushUnavailableReason,
  requestTestPush,
  showPushEntry,
  subscribePush,
  unsubscribePush,
  type PushUiState,
} from "../lib/push";
import type { ProgressState } from "../types";
import type { SessionSource } from "../lib/today";

const BELL_SEEN_KEY = "voca:push-bell-opened";

function bellSeen(): boolean {
  try {
    return localStorage.getItem(BELL_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markBellSeen(): void {
  try {
    localStorage.setItem(BELL_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function showBellHint(progress: ProgressState): boolean {
  return showPushEntry(progress) && !bellSeen();
}

/**
 * 한 번이라도 학습한 뒤에 자동으로 묻는다.
 * 권장 세션을 끝까지 마쳐야만 물으면, 중간에 나온 사람은 입구를 영영 못 본다.
 * `나중에`는 OS 거절이 아니므로 벨에서 다시 켤 수 있다.
 */
export function shouldOfferPush(state: ProgressState): boolean {
  if (!state.lastStudyDate && state.doneSessions < 1) return false;
  if (state.pushAskedAt || state.pushLaterAt) return false;
  return pushUiState(state) === "permission_default";
}

export function shouldAskPush(state: ProgressState, source: SessionSource): boolean {
  if (source !== "home_default") return false;
  return shouldOfferPush(state);
}

async function recordSubscribe(): Promise<boolean> {
  const ok = await subscribePush(loadProgress());
  if (ok) saveProgress(setPushDisabled(markPushAsked(loadProgress()), false));
  else saveProgress(markPushAsked(loadProgress()));
  return ok;
}

export function PushPrompt({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const install = needsInstallFirst();

  useEffect(() => {
    logEvent("push_soft_prompt_shown", { install });
  }, [install]);

  function later() {
    saveProgress(markPushLater(loadProgress()));
    logEvent("push_soft_prompt_later", { install });
    onClose();
  }

  return (
    <div className="card pad-lg">
      <div className="caption">알림</div>
      <p style={{ margin: "8px 0 0", fontWeight: 600, lineHeight: 1.45 }}>{PUSH_PROMPT.title}</p>
      <p className="muted" style={{ margin: "6px 0 0" }}>{PUSH_PROMPT.body}</p>
      <div className="grade-bar two" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost" disabled={busy} onClick={later}>
          {PUSH_PROMPT.decline}
        </button>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            logEvent("push_soft_prompt_accept", { install });
            const ok = await recordSubscribe();
            logEvent(ok ? "push_permission_granted" : "push_permission_denied", { install });
            logEvent("push_prompt_result", { accepted: true, granted: ok, install });
            setBusy(false);
            onClose();
          }}
        >
          {PUSH_PROMPT.accept}
        </button>
      </div>
    </div>
  );
}

export function PushBell({ onOpen, tick = 0 }: { onOpen: () => void; tick?: number }) {
  const progress = loadProgress();
  const [subscribed, setSubscribed] = useState<boolean | undefined>(undefined);
  const ui = pushUiState(progress, subscribed);
  const on = ui === "permission_granted";
  const hint = showBellHint(progress);

  useEffect(() => {
    let cancel = false;
    void hasPushSubscription().then((has) => {
      if (!cancel) setSubscribed(has);
    });
    return () => {
      cancel = true;
    };
  }, [tick]);

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={on ? "알림 켜짐, 알림 설정" : hint ? "알림 설정, 아직 확인하지 않음" : "알림 설정"}
      onClick={() => {
        markBellSeen();
        logEvent("push_settings_open", { state: ui });
        onOpen();
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 17h12l-1.2-2.1a6.2 6.2 0 0 1-.8-3.1V10a4 4 0 1 0-8 0v1.8c0 1.1-.28 2.18-.8 3.1L6 17z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          fill={on ? "currentColor" : "none"}
        />
        <path d="M10 17a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      {hint ? <i className="hint-dot" aria-hidden /> : null}
    </button>
  );
}

export function PushSheet({ onClose }: { onClose: () => void }) {
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [testState, setTestState] = useState<"idle" | "sent" | "fail">("idle");
  const [subscribed, setSubscribed] = useState<boolean | undefined>(undefined);
  const state = loadProgress();
  const ui = pushUiState(state, subscribed);

  useEffect(() => {
    let cancel = false;
    void hasPushSubscription().then((has) => {
      if (!cancel) setSubscribed(has);
    });
    return () => {
      cancel = true;
    };
  }, [tick]);

  function refresh() {
    setTick((n) => n + 1);
  }

  async function turnOn() {
    setBusy(true);
    const ok = await recordSubscribe();
    logEvent(ok ? "push_permission_granted" : "push_permission_denied", {
      source: "settings",
    });
    setBusy(false);
    refresh();
  }

  async function turnOff() {
    setBusy(true);
    await unsubscribePush(loadProgress());
    saveProgress(setPushDisabled(loadProgress(), true));
    setBusy(false);
    refresh();
  }

  async function sendTest() {
    setBusy(true);
    setTestState("idle");
    const ok = await requestTestPush();
    setTestState(ok ? "sent" : "fail");
    setBusy(false);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-labelledby="push-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="push-sheet-title" className="term-title" style={{ fontSize: 20, margin: 0 }}>
          알림
        </h2>
        <SheetBody
          ui={ui}
          busy={busy}
          testState={testState}
          onOn={() => void turnOn()}
          onOff={() => void turnOff()}
          onTest={() => void sendTest()}
        />
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

function SheetBody({
  ui,
  busy,
  testState,
  onOn,
  onOff,
  onTest,
}: {
  ui: PushUiState;
  busy: boolean;
  testState: "idle" | "sent" | "fail";
  onOn: () => void;
  onOff: () => void;
  onTest: () => void;
}) {
  if (ui === "unsupported") {
    const reason = pushUnavailableReason();
    return (
      <>
        <p style={{ margin: "10px 0 0", fontWeight: 600 }}>지금은 알림을 켤 수 없어요.</p>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {reason === "no_key"
            ? "이 앱 버전에서는 아직 알림이 준비되지 않았어요. 학습은 그대로 할 수 있어요."
            : "이 브라우저에서는 알림을 지원하지 않아요."}
        </p>
      </>
    );
  }
  if (ui === "not_installed") {
    return (
      <>
        <p className="muted" style={{ margin: "10px 0 0" }}>
          이 브라우저에서는 홈 화면에 추가한 뒤에 알림을 받을 수 있어요.
        </p>
        <p className="caption" style={{ margin: "8px 0 0" }}>
          공유 버튼에서 ‘홈 화면에 추가’를 고른 다음, 그 아이콘으로 다시 열어 주세요.
        </p>
      </>
    );
  }
  if (ui === "permission_denied") {
    return (
      <>
        <p style={{ margin: "10px 0 0", fontWeight: 600 }}>알림이 차단되어 있어요.</p>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          휴대폰 설정에서 금맹탈출의 알림을 허용해 주세요.
        </p>
      </>
    );
  }
  if (ui === "permission_granted") {
    return (
      <>
        <p style={{ margin: "10px 0 0", fontWeight: 600 }}>{PUSH_SETTINGS.onTitle}</p>
        <p className="muted" style={{ margin: "8px 0 0" }}>{PUSH_SETTINGS.onBody}</p>
        <p className="caption" style={{ margin: "8px 0 0" }}>{PUSH_SETTINGS.onWhen}</p>
        <button className="btn btn-ghost" style={{ marginTop: 14 }} disabled={busy} onClick={onTest}>
          {PUSH_SETTINGS.test}
        </button>
        <p className="caption" style={{ margin: "8px 0 0" }}>
          {testState === "sent"
            ? PUSH_SETTINGS.testSent
            : testState === "fail"
              ? PUSH_SETTINGS.testFail
              : PUSH_SETTINGS.testHint}
        </p>
        <button className="btn btn-ghost" style={{ marginTop: 8 }} disabled={busy} onClick={onOff}>
          알림 끄기
        </button>
      </>
    );
  }
  return (
    <>
      <p style={{ margin: "10px 0 0", fontWeight: 600 }}>알림 꺼짐</p>
      <p className="muted" style={{ margin: "8px 0 0" }}>
        원하는 경우 다시 받을 수 있어요. 오늘 학습을 마치지 않은 날에만 하루 한 번 알려드려요.
      </p>
      <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy} onClick={onOn}>
        알림 받기
      </button>
    </>
  );
}

export { showPushEntry, pushSupported };
