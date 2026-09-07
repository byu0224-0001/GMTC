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
      <div className="stack" style={{ marginTop: 40 }}>
        {panel === "main" ? (
          <>
            <div className="eyebrow">{APP_SHORT_NAME}</div>
            <h1 className="display" style={{ margin: 0, fontSize: 26, lineHeight: 1.35 }}>
              들어본 말은 많은데,
              <br />
              막상 설명하려면 헷갈린다면.
            </h1>
            <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.55, color: "var(--color-ink-strong)" }}>
              짧게 다시 만나고, 비슷한 말과 구분하고,
              <br />
              새로운 문장에서도 알아보게 돼요.
            </p>

            <div className="card pad-lg">
              <div className="caption">하루 5~10분</div>
              <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>오늘 볼 만큼만 가볍게 시작해요.</p>
              <div className="caption" style={{ marginTop: 18 }}>다시 만나고, 구분하기</div>
              <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
                뜻을 떠올리고, 비슷한 개념과 비교하고, 잘못 알고 있던 부분을 바로잡아요.
              </p>
              <div className="caption" style={{ marginTop: 18 }}>새로운 문장에서 알아보기</div>
              <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
                배운 말을 처음 보는 문장에서도 알아볼 수 있는지 확인해요.
              </p>
            </div>

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
            <p className="notice">
              학습 기록은 지금 사용하는 기기에 저장돼요. 나중에 홈 화면에 추가하면 이 기록이 옮겨지지 않을 수 있어요.
            </p>
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
    <div className="card pad-lg">
      <div className="caption">다음에 바로 이어서 하려면</div>
      <p style={{ margin: "8px 0 0", fontWeight: 600, lineHeight: 1.45 }}>
        {inapp ? "카카오톡 안에서는 설치가 제한될 수 있어요." : "홈 화면에 추가해 두면 기록을 이어가기 쉬워요."}
      </p>
      {inapp ? (
        <p className="muted" style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
          Safari나 Chrome에서 열면 홈 화면에 설치할 수 있어요.
        </p>
      ) : null}
      <div className="stack" style={{ marginTop: 16 }}>
        {inapp ? (
          <button className="btn btn-ghost" onClick={onInapp}>여는 방법 보기</button>
        ) : surface === "ios" ? (
          <button className="btn btn-ghost" onClick={onIos}>설치 방법 보기</button>
        ) : nativeReady ? (
          <button className="btn btn-ghost" disabled={installBusy} onClick={onNative}>
            {installBusy ? "설치 창을 여는 중" : "앱으로 설치하기"}
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={onAndroidGuide}>앱으로 설치하기</button>
        )}
      </div>
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
