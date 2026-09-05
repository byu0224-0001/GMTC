import { useState } from "react";
import { PUSH_PROMPT } from "../content/notifications";
import { logEvent } from "../lib/events";
import { loadProgress, markPushAsked, saveProgress } from "../lib/progress";
import { needsInstallFirst, permission, pushSupported, subscribePush } from "../lib/push";

/**
 * 알림 허용을 묻기 전에 먼저 보여 주는 화면.
 *
 * 브라우저 권한창을 바로 띄우지 않는다. 거절은 되돌리기 어렵고, 아직 이 앱이 뭘 하는지
 * 모르는 사람은 대부분 거절한다. 그래서 온보딩이 아니라 첫 세션을 마친 뒤에 묻고,
 * 사용자가 직접 이 버튼을 눌렀을 때만 권한을 요청한다.
 */
export function PushPrompt({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const install = needsInstallFirst();

  function dismiss(accepted: boolean, granted?: boolean) {
    saveProgress(markPushAsked(loadProgress()));
    logEvent("push_prompt_result", { accepted, granted: granted ?? false, install });
    onClose();
  }

  return (
    <div className="card pad-lg">
      <div className="caption">알림</div>
      <p style={{ margin: "8px 0 0", fontWeight: 600, lineHeight: 1.45 }}>{PUSH_PROMPT.title}</p>
      <p className="muted" style={{ margin: "6px 0 0", lineHeight: 1.6 }}>{PUSH_PROMPT.body}</p>
      {install ? (
        <p className="notice" style={{ marginTop: 12 }}>
          아이폰에서는 공유 버튼을 눌러 홈 화면에 추가한 뒤에 알림을 받을 수 있습니다.
        </p>
      ) : null}
      <div className="grade-bar two" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost" disabled={busy} onClick={() => dismiss(false)}>
          {PUSH_PROMPT.decline}
        </button>
        <button
          className="btn btn-primary"
          disabled={busy || install}
          onClick={async () => {
            setBusy(true);
            const ok = await subscribePush(loadProgress());
            setBusy(false);
            dismiss(true, ok);
          }}
        >
          {PUSH_PROMPT.accept}
        </button>
      </div>
    </div>
  );
}

/**
 * 물어볼 때인지 판단한다.
 * 첫 세션을 마친 직후는 아직 이르다. 두 번째 완료부터 묻는다.
 */
export function shouldAskPush(doneSessions: number, asked: boolean): boolean {
  if (asked || !pushSupported()) return false;
  if (permission() !== "default") return false;
  return doneSessions >= 2;
}
