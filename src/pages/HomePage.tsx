import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { APP_SHORT_NAME, SOURCE_DISCLAIMER } from "../content/brand";
import { CORE100 } from "../content/literacy";
import { labelFor } from "../lib/lookup";
import { stats } from "../lib/progress";
import { planCounts } from "../lib/today";
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
  const remaining = plan.total;
  const briefing = plan.briefing;
  const primary = briefing?.primaryTermIds ?? [];

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
          {remaining && briefing ? (
            <>
              <div className="caption">오늘의 학습</div>
              <div className="display" style={{ margin: "8px 0 10px", fontSize: 22, lineHeight: 1.35 }}>
                {briefing.headline}
              </div>
              {briefing.subtitle ? (
                <p className="muted" style={{ margin: "0 0 12px" }}>{briefing.subtitle}</p>
              ) : null}
              <p className="muted" style={{ margin: "0 0 12px" }}>
                {primary.map((id) => labelFor(id, terms)).join(" · ")}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                약 {plan.minutes}분
              </p>
            </>
          ) : (
            <div className="display" style={{ margin: 0 }}>
              오늘의 학습을 마쳤습니다
            </div>
          )}
        </div>

        <Link
          to={remaining ? "/learn/session" : "/terms"}
          className="btn btn-primary"
          style={{ display: "grid", placeItems: "center", textDecoration: "none" }}
        >
          {remaining ? "오늘 학습하기" : "사전 보기"}
        </Link>

        <p className="notice">{SOURCE_DISCLAIMER}</p>
      </div>
    </>
  );
}
