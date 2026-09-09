import { useEffect, useState, type ReactNode } from "react";
import { APP_SHORT_NAME } from "../content/brand";
import { logEvent } from "../lib/events";
import {
  appUrl,
  copyAppUrl,
  installGuide,
  installSurface,
  onNativeInstallReady,
  promptNativeInstall,
  type InstallSurface,
} from "../lib/install";
import { LearningVisualRow } from "../components/LearningVisual";
import { loadProgress, markOnboarded, saveProgress } from "../lib/progress";

type Panel = "main" | "ios" | "android" | "inapp";

/**
 * 첫 화면. 제품이 익숙함·구분·새 문장 인식을 만든다는 말을 먼저 한다.
 * 설치는 권하되 시작의 전제로 두지 않는다. 아직 한 번도 안 써 본 사람에게
 * 홈 화면 추가를 먼저 시키면 파일럿 진입이 설치 마찰에 먹힌다.
 */
export function OnboardingPage({ onDone }: { onDone: () => void }) {
  const [panel, setPanel] = useState<Panel>("main");
  const [surface] = useState<InstallSurface>(() => installSurface());
  const [nativeReady, setNativeReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);

  useEffect(() => onNativeInstallReady(setNativeReady), []);

  function start(choice: string) {
    logEvent("install_choice", { surface, choice, nativeReady });
    saveProgress(markOnboarded(loadProgress()));
    onDone();
  }

  async function installAndroid() {
    setInstallBusy(true);
    const outcome = await promptNativeInstall();
    setInstallBusy(false);
    logEvent("install_choice", { surface, choice: `native_${outcome}`, nativeReady });
    if (outcome === "accepted") {
      start("native_accepted");
      return;
    }
    if (outcome === "unavailable") setPanel("android");
  }

  const standalone = surface === "standalone";
  const guide = installGuide(surface);

  return (
    <div className="page session">
      <div className="stack onboard-main">
        {panel === "main" ? (
          <>
            <div className="eyebrow">{APP_SHORT_NAME}</div>
            <h1 className="display" style={{ margin: 0, fontSize: 26, lineHeight: 1.35 }}>
              들어본 금융용어,
              <br />
              막상 뜻은 헷갈린다면
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              하루 5~10분, 반복해서 익히고
              <br />
              비슷한 개념과 구분해 보세요.
            </p>

            <LearningVisualRow
              items={[
                { type: "repeat", label: "다시 보기" },
                { type: "contrast", label: "구분하기" },
                { type: "context", label: "문장에서 확인하기" },
              ]}
            />

            <button className="btn btn-primary" onClick={() => start(standalone ? "standalone_start" : "web_start")}>
              시작하기
            </button>

            {standalone ? null : (
              <OptionalInstall
                surface={surface}
                nativeReady={nativeReady}
                installBusy={installBusy}
                onNative={() => void installAndroid()}
                onIos={() => { logEvent("install_choice", { surface, choice: "ios_guide" }); setPanel("ios"); }}
                onAndroidGuide={() => { logEvent("install_choice", { surface, choice: "android_guide" }); setPanel("android"); }}
                onInapp={() => { logEvent("install_choice", { surface, choice: "inapp_guide" }); setPanel("inapp"); }}
              />
            )}
          </>
        ) : null}

        {panel !== "main" ? (
          <Guide
            title={guide.title}
            steps={guide.steps}
            note={guide.note}
            onBack={() => setPanel("main")}
            extra={
              panel === "inapp" ? (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      const ok = await copyAppUrl();
                      setCopied(ok);
                      logEvent("install_choice", { surface, choice: ok ? "copy_url" : "copy_url_fail" });
                    }}
                  >
                    {copied ? "주소를 복사했어요" : "주소 복사하기"}
                  </button>
                  <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>{appUrl()}</p>
                  <button className="btn btn-soft" onClick={() => start("inapp_start")}>
                    이 화면에서 시작하기
                  </button>
                </>
              ) : (
                <button className="btn btn-soft" onClick={() => start("guide_then_web")}>
                  웹에서 시작하기
                </button>
              )
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function OptionalInstall({
  surface,
  nativeReady,
  installBusy,
  onNative,
  onIos,
  onAndroidGuide,
  onInapp,
}: {
  surface: InstallSurface;
  nativeReady: boolean;
  installBusy: boolean;
  onNative: () => void;
  onIos: () => void;
  onAndroidGuide: () => void;
  onInapp: () => void;
}) {
  const inapp = surface === "inapp";
  return (
    <div className="install-hint">
      <p className="caption" style={{ margin: 0 }}>
        {inapp
          ? "Safari나 Chrome에서 열면 홈 화면에 넣을 수 있어요."
          : "홈화면에 추가하여 나의 학습 기록과 알림을 이어가요."}
      </p>
      <button
        className="text-link"
        type="button"
        disabled={installBusy}
        onClick={inapp ? onInapp : surface === "ios" ? onIos : nativeReady ? onNative : onAndroidGuide}
      >
        {installBusy ? "설치 창을 여는 중" : "앱으로 설치해서 사용하기"}
      </button>
    </div>
  );
}

function Guide({
  title,
  steps,
  note,
  onBack,
  extra,
}: {
  title: string;
  steps: string[];
  note?: string;
  onBack: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="stack">
      <h1 className="display" style={{ margin: 0, fontSize: 24, lineHeight: 1.35 }}>{title}</h1>
      <ol className="install-steps">
        {steps.map((text, i) => (
          <li key={text} className="install-step">
            <span className="install-num">{i + 1}</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      {note ? <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{note}</p> : null}
      {extra}
      <button className="btn btn-ghost" onClick={onBack}>뒤로</button>
    </div>
  );
}
