import { APP_SHORT_NAME } from "../content/brand";
import { loadProgress, markOnboarded, saveProgress } from "../lib/progress";

/**
 * 첫 화면. 한 장으로 끝낸다.
 * 알림 권한과 홈 화면 추가는 여기서 묻지 않는다. 아직 이 앱이 뭘 하는지 모르는
 * 사람에게 권한을 요청하면 대부분 거절하고, 그 거절은 되돌리기 어렵다.
 */
export function OnboardingPage({ onDone }: { onDone: () => void }) {
  return (
    <div className="page session">
      <div className="stack" style={{ marginTop: 40 }}>
        <div className="eyebrow">{APP_SHORT_NAME}</div>
        <h1 className="display" style={{ margin: 0, fontSize: 26, lineHeight: 1.35 }}>
          들어본 말은 많은데,
          <br />
          막상 설명하려면 헷갈린다면.
        </h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          하루 5~10분씩 다시 만나고, 구분하고, 실제 문장에서 익혀보세요.
        </p>

        <div className="card pad-lg">
          <div className="caption">하루 5~10분</div>
          <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
            앱이 오늘 할 만큼만 정해 줘요. 더 하고 싶으면 이어서 해도 돼요.
          </p>
          <div className="caption" style={{ marginTop: 18 }}>같은 말을 다른 방식으로</div>
          <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
            뜻을 고르고, 용어를 떠올리고, 비슷한 개념과 구분해요.
          </p>
          <div className="caption" style={{ marginTop: 18 }}>실제 문장에서 다시 만나기</div>
          <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
            읽기 탭에서 기사·리포트에 나올 법한 문단으로 배운 말을 확인해요.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            saveProgress(markOnboarded(loadProgress()));
            onDone();
          }}
        >
          시작하기
        </button>
        <p className="notice">
          학습 기록은 이 기기에만 저장돼요. 학습 기록 화면에서 언제든 지울 수 있어요.
        </p>
      </div>
    </div>
  );
}
