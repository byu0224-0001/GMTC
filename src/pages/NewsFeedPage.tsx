import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { allBriefings, briefingById } from "../content/briefings";
import { CONTEXT_CASES } from "../content/literacy";
import { mapForBriefing } from "../content/learningMaps";
import { briefingForPlan, type TodayPlanFile } from "../lib/todayPlan";
import type { ProgressState, Term } from "../types";

/**
 * 사용자에게 내부 콘텐츠 구분을 보여 주지 않는다.
 * 길이로만 나눈다. 짧게 읽기 32편, 이어서 읽기 10편.
 */
export function ContextFeedPage({
  progress,
  todayPlan,
}: {
  progress: ProgressState;
  terms?: Term[];
  todayPlan: TodayPlanFile;
}) {
  const today = briefingForPlan(todayPlan, progress.seenContextIds);
  const featured = briefingById(today.id) ?? today;
  const featuredMap = mapForBriefing(featured.id);
  const longer = allBriefings().filter((b) => b.id !== featured.id);
  const seen = (id: string) => (progress.contextStats[id]?.seen ?? 0) > 0;

  return (
    <>
      <TopBar title="읽기" />
      <div className="page stack">
        <p className="muted" style={{ margin: 0 }}>
          익힌 말이 실제 문장에서 어떻게 쓰이는지 확인합니다.
        </p>

        <Link to={`/briefing/${featured.id}`} className="card pad-lg featured" style={{ color: "inherit" }}>
          <div className="eyebrow">오늘 · {featured.kicker}</div>
          <strong style={{ display: "block", margin: "8px 0 6px", fontSize: 18, lineHeight: 1.4 }}>
            {featured.headline}
          </strong>
          <span className="muted">{featured.subtitle}</span>
          <div className="caption" style={{ marginTop: 10 }}>
            {featured.minutes}분{featuredMap ? ` · ${featuredMap.kicker}` : ""}
          </div>
        </Link>

        <section>
          <div className="eyebrow">짧게 읽기</div>
          <p className="caption" style={{ margin: "0 0 8px" }}>
            한 편에 1~2분. {CONTEXT_CASES.length}편
          </p>
          {CONTEXT_CASES.map((c) => (
            <Link key={c.id} to={`/context/${c.id}`} className="term-row">
              <strong>{c.title}</strong>
              <span>
                {c.era}
                {seen(c.id) ? " · 다시 보기" : ""}
              </span>
            </Link>
          ))}
        </section>

        <section>
          <div className="eyebrow">이어서 읽기</div>
          <p className="caption" style={{ margin: "0 0 8px" }}>
            개념이 서로 어떻게 이어지는지까지 봅니다.
          </p>
          {longer.map((b) => {
            const map = mapForBriefing(b.id);
            return (
              <Link key={b.id} to={`/briefing/${b.id}`} className="term-row">
                <strong>{b.headline}</strong>
                <span>
                  {b.minutes}분 · {map?.kicker ?? b.kicker}
                  {progress.seenContextIds.includes(b.id) ? " · 다시 보기" : ""}
                </span>
              </Link>
            );
          })}
        </section>

        <p className="notice">실제 기사가 아니라 학습을 위해 지어낸 예시입니다.</p>
      </div>
    </>
  );
}
