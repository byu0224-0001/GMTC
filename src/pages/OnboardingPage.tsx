import { useEffect, useState, type ReactNode } from "react";
import { APP_SHORT_NAME } from "../content/brand";
import { logEvent } from "../lib/events";
import {
  copyAppUrl,
  installSurface,
  onNativeInstallReady,
  promptNativeInstall,
  type InstallSurface,
} from "../lib/install";
import { loadProgress, markOnboarded, saveProgress } from "../lib/progress";

type Panel = "main" | "ios" | "android" | "inapp" | "web-warn";

/**
 * 첫 화면. 제품이 바꿔 주는 말을 먼저 보여 주고, 설치는 그 아래 카드로 권한다.
 * 모달로 덮지 않는다. 이미 홈 화면 앱이면 설치 안내를 숨긴다.
 *
 * 학습 기록이 이 브라우저의 localStorage에 남는다. iOS는 Safari에서 공부한 뒤
 * 홈 화면에 추가하면 그 기록이 웹 앱으로 복사되지 않을 수 있다. 그래서 파일럿에서는
 * 공부를 시작하기 전에 설치를 강하게 권한다.
 */
export function OnboardingPage({ onDone }: { onDone: () => void }) {
  const [panel, setPanel] = useState<Panel>("main");
  const [surface] = useState<InstallSurface>(() => installSurface());
  const [nativeReady, setNativeReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);

  useEffect(() => onNativeInstallReady(setNativeReady), []);

  function startWeb() {
    saveProgress(markOnboarded(loadProgress()));
    onDone();
  }

  function choose(choice: string, next?: Panel) {
    logEvent("install_choice", { surface, choice, nativeReady });
    if (next) setPanel(next);
  }

  async function installAndroid() {
    setInstallBusy(true);
    const outcome = await promptNativeInstall();
    setInstallBusy(false);
    logEvent("install_choice", { surface, choice: `native_${outcome}`, nativeReady });
    if (outcome === "accepted") {
      startWeb();
      return;
    }
    if (outcome === "unavailable") setPanel("android");
  }

  const standalone = surface === "standalone";

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
              아는 것 같던 금융용어를,
              <br />
              실제로 읽고 설명할 수 있는 말로 바꿔보세요.
            </p>

            <div className="card pad-lg">
              <div className="caption">하루 5~10분</div>
              <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>오늘 볼 만큼만 가볍게 시작해요.</p>
              <div className="caption" style={{ marginTop: 18 }}>다시 만나고, 구분하기</div>
              <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
                뜻을 떠올리고, 비슷한 개념과 비교하고, 잘못 알고 있던 부분을 바로잡아요.
              </p>
              <div className="caption" style={{ marginTop: 18 }}>기사처럼 읽어보기</div>
              <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
                실제 금융 콘텐츠처럼 읽고, 어디까지 해석할 수 있는지 확인해요.
              </p>
            </div>

            {standalone ? (
              <button className="btn btn-primary" onClick={() => { choose("standalone_start"); startWeb(); }}>
                시작하기
              </button>
            ) : (
              <InstallCard
                surface={surface}
                nativeReady={nativeReady}
                installBusy={installBusy}
                onNative={() => void installAndroid()}
                onIos={() => { choose("ios_guide", "ios"); }}
                onAndroidGuide={() => { choose("android_guide", "android"); }}
                onInapp={() => { choose("inapp_guide", "inapp"); }}
                onWeb={() => { choose("web_warn", "web-warn"); }}
              />
            )}
            <p className="notice">학습 기록은 지금 사용하는 기기에 저장돼요.</p>
          </>
        ) : null}

        {panel === "ios" ? (
          <Guide
            title="아이폰에 설치하기"
            steps={[
              "Safari에서 공유 버튼을 눌러 주세요.",
              "홈 화면에 추가를 선택하세요.",
              "웹 앱으로 열기가 보이면 켠 뒤 추가하세요.",
            ]}
            note="설치가 끝나면 홈 화면의 ‘금맹탈출’을 열어 주세요. Safari가 아니라 그 아이콘에서 공부를 시작해야 기록이 이어져요."
            onBack={() => setPanel("main")}
            extra={
              <button className="btn btn-soft" onClick={() => { choose("ios_to_web_warn", "web-warn"); }}>
                아직 Safari에서 쓸게요
              </button>
            }
          />
        ) : null}

        {panel === "android" ? (
          <Guide
            title="앱으로 설치하기"
            steps={[
              "Chrome 오른쪽 위의 메뉴(⋮)를 눌러 주세요.",
              "앱 설치 또는 홈 화면에 추가를 선택하세요.",
              "설치가 끝나면 홈 화면의 ‘금맹탈출’을 열어 주세요.",
            ]}
            onBack={() => setPanel("main")}
            extra={
              <button className="btn btn-soft" onClick={() => { choose("android_to_web_warn", "web-warn"); }}>
                웹에서 먼저 써보기
              </button>
            }
          />
        ) : null}

        {panel === "inapp" ? (
          <Guide
            title="브라우저에서 열어 주세요"
            steps={[
              "아래 주소를 복사하거나, 화면 오른쪽 위 메뉴를 열어 주세요.",
              "Safari로 열기 또는 Chrome으로 열기를 고르세요.",
              "열린 브라우저에서 홈 화면에 추가하면 앱처럼 쓸 수 있어요.",
            ]}
            note="카카오톡 안에서는 설치 기능이 제한될 수 있어요."
            onBack={() => setPanel("main")}
            extra={
              <>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const ok = await copyAppUrl();
                    setCopied(ok);
                    choose(ok ? "copy_url" : "copy_url_fail");
                  }}
                >
                  {copied ? "주소를 복사했어요" : "주소 복사하기"}
                </button>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
                  {typeof window !== "undefined" ? `${window.location.origin}/` : ""}
                </p>
                <button className="btn btn-soft" onClick={() => { choose("inapp_to_web_warn", "web-warn"); }}>
                  여기서 먼저 써보기
                </button>
              </>
            }
          />
        ) : null}

        {panel === "web-warn" ? (
          <div className="stack">
            <h1 className="display" style={{ margin: 0, fontSize: 24, lineHeight: 1.35 }}>
              웹에서도 사용할 수 있어요.
            </h1>
            <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
              다만 나중에 앱으로 설치하면 지금 브라우저의 학습 기록이 자동으로 옮겨지지 않을 수 있어요.
            </p>
            <button className="btn btn-primary" onClick={() => { choose("web_start"); startWeb(); }}>
              그래도 웹에서 시작하기
            </button>
            <button className="btn btn-ghost" onClick={() => setPanel("main")}>
              뒤로
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InstallCard({
  surface,
  nativeReady,
  installBusy,
  onNative,
  onIos,
  onAndroidGuide,
  onInapp,
  onWeb,
}: {
  surface: InstallSurface;
  nativeReady: boolean;
  installBusy: boolean;
  onNative: () => void;
  onIos: () => void;
  onAndroidGuide: () => void;
  onInapp: () => void;
  onWeb: () => void;
}) {
  const inapp = surface === "inapp";
  return (
    <div className="card pad-lg">
      <div className="caption">{inapp ? "앱으로 쓰려면" : "앱으로 써보는 걸 추천해요"}</div>
      <p style={{ margin: "8px 0 0", fontWeight: 600, lineHeight: 1.45 }}>
        {inapp
          ? "카카오톡 안에서는 설치 기능이 제한될 수 있어요."
          : "홈 화면에서 바로 열고, 공부한 기록을 이어가고 알림도 받을 수 있어요."}
      </p>
      {inapp ? (
        <p className="muted" style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
          Safari나 Chrome에서 열면 홈 화면에 설치할 수 있어요.
        </p>
      ) : null}
      <div className="stack" style={{ marginTop: 16 }}>
        {inapp ? (
          <button className="btn btn-primary" onClick={onInapp}>여는 방법 보기</button>
        ) : surface === "ios" ? (
          <button className="btn btn-primary" onClick={onIos}>설치 방법 보기</button>
        ) : nativeReady ? (
          <button className="btn btn-primary" disabled={installBusy} onClick={onNative}>
            {installBusy ? "설치 창을 여는 중" : "앱으로 설치하기"}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onAndroidGuide}>앱으로 설치하기</button>
        )}
        <button className="btn btn-ghost" onClick={onWeb}>웹에서 먼저 써보기</button>
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
