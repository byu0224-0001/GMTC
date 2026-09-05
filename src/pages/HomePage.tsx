import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { APP_SHORT_NAME, SOURCE_DISCLAIMER } from "../content/brand";
import { CORE100 } from "../content/literacy";
import { mapForBriefing } from "../content/learningMaps";
import { labelFor } from "../lib/lookup";
import { nudgeFor } from "../content/notifications";
import { daysSinceStudy } from "../lib/learner";
import { defaultDoneToday, extraSessionsToday, stats, storageWritable } from "../lib/progress";
import { kstDateKey } from "../lib/srs";
import { extraQueue, planCounts } from "../lib/today";
import type { TodayPlanFile } from "../lib/todayPlan";
import type { ProgressState, Term } from "../types";

export function HomePage({
  terms,
  progress,
  todayPlan,
}: {
  terms: Term[];
  progress: ProgressState;
  todayPlan: TodayPlanFile;
}) {
  const s = stats(progress, CORE100.map((c) => c.id));
  const plan = planCounts(terms, progress, todayPlan);
  /**
   * 완료 판단은 `남은 큐가 비었는가`가 아니라 권장 분량을 마쳤는지로 한다.
   * 추가로 공부하면 큐가 다시 차기 때문에, 큐 길이로 판단하면 완료가 취소된다.
   */
  const done = defaultDoneToday(progress) || plan.total === 0;
  const extras = extraSessionsToday(progress);
  /**
   * 브랜드 문구는 여기서만 쓴다.
   * 온보딩과 문제 화면에서는 쓰지 않는다. 처음 온 사람에게 자조적 문구를 먼저 보이면
   * 그건 농담이 아니라 평가가 된다. 이미 며칠 해 본 사람에게만 말을 건다.
   */
  const nudge = done
    ? null
    : nudgeFor({
        daysSinceStudy: daysSinceStudy(progress),
        doneToday: false,
        streakDays: progress.streakDays,
        seed: kstDateKey(),
      });
  const briefing = plan.briefing;
  const map = briefing ? mapForBriefing(briefing.id) : undefined;
  const newLabels = plan.newTerms.map((t) => labelFor(t.id, terms));
  const moreLeft = done ? extraQueue(terms, progress).length : 0;

  return (
    <>
      <TopBar
        title={APP_SHORT_NAME}
        trailing={
          <Link to="/report" className="streak">
            {s.streakDays}일 연속
          </Link>
        }
      />
      <div className="page stack">
        <div className="card pad-lg featured">
          {done ? (
            <>
              <div className="display" style={{ margin: 0, fontSize: 22, lineHeight: 1.35 }}>
                오늘 할 건 다 했어요
              </div>
              <p className="muted" style={{ margin: "10px 0 0" }}>
                {extras
                  ? `권장 분량에 ${extras}번 더 얹었습니다. 내일 복습이 돌아옵니다.`
                  : "내일 복습이 돌아옵니다. 더 하고 싶으면 이어서 해도 됩니다."}
              </p>
            </>
          ) : (
            <>
              {nudge && nudge.kind !== "today_pending" ? (
                <>
                  <div className="display" style={{ margin: 0, fontSize: 20, lineHeight: 1.35 }}>
                    {nudge.title}
                  </div>
                  <p className="muted" style={{ margin: "8px 0 16px" }}>{nudge.body}</p>
                </>
              ) : null}
              <div className="caption">오늘 이만큼만 하면 충분합니다</div>
              <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 20 }}>{plan.minutes}분</p>
              {newLabels.length ? (
                <>
                  <div className="caption" style={{ marginTop: 16 }}>익힐 개념</div>
                  <p style={{ margin: "4px 0 0", fontWeight: 600, lineHeight: 1.45 }}>
                    {newLabels.join(" · ")}
                  </p>
                </>
              ) : null}
              <div className="caption" style={{ marginTop: 14 }}>복습</div>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {plan.review ? `${plan.review}개` : "오늘은 없습니다"}
              </p>
            </>
          )}
        </div>

        {done ? (
          moreLeft ? (
            <Link
              to="/learn/extra"
              className="btn btn-primary"
              style={{ display: "grid", placeItems: "center", textDecoration: "none" }}
            >
              5분 더 익히기
            </Link>
          ) : (
            <Link
              to="/context"
              className="btn btn-primary"
              style={{ display: "grid", placeItems: "center", textDecoration: "none" }}
            >
              읽기 보러 가기
            </Link>
          )
        ) : (
          <Link
            to="/learn/session"
            className="btn btn-primary"
            style={{ display: "grid", placeItems: "center", textDecoration: "none" }}
          >
            시작하기
          </Link>
        )}

        {briefing ? (
          <Link to={`/briefing/${briefing.id}`} className="card" style={{ color: "inherit", display: "block" }}>
            <div className="caption">읽기 · {briefing.minutes}분</div>
            <strong style={{ display: "block", marginTop: 6, lineHeight: 1.45 }}>{briefing.headline}</strong>
            <span className="muted">{map ? map.kicker : briefing.subtitle}</span>
          </Link>
        ) : null}

        <Link
          to="/learn"
          className="btn btn-ghost"
          style={{ display: "grid", placeItems: "center", textDecoration: "none" }}
        >
          개념 연결해서 보기
        </Link>

        <p className="caption" style={{ margin: 0 }}>
          학습 가능한 용어 {plan.candidateTotal}개 · 아직 안 본 용어 {plan.remainingUnseen}개
        </p>
        {storageWritable() ? null : (
          <p className="notice">
            이 브라우저에서는 학습 기록을 저장할 수 없습니다. 학습은 할 수 있지만 진도는 남지
            않습니다. 시크릿 모드라면 일반 창에서 열어 주세요.
          </p>
        )}
        <p className="notice">{SOURCE_DISCLAIMER}</p>
      </div>
    </>
  );
}
