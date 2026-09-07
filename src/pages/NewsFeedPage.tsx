import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { READING_DISCLAIMER, READING_EXAMPLE_LABEL, READING_KIND_LONG, READING_KIND_SHORT } from "../content/brand";
import { allBriefings, briefingById } from "../content/briefings";
import { CONTEXT_CASES } from "../content/literacy";
import { briefingForPlan, type TodayPlanFile } from "../lib/todayPlan";
import type { ProgressState, Term } from "../types";

/**
 * 길이로만 나눈다. 짧게 읽어보기 32편, 기사처럼 읽어보기 10편.
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
  const longer = allBriefings().filter((b) => b.id !== featured.id);
  const seen = (id: string) => (progress.contextStats[id]?.seen ?? 0) > 0;

  return (
    <>
      <TopBar title="읽기" />
      <div className="page stack">
        <p className="muted" style={{ margin: 0 }}>
          익힌 말이 실제 문장에서 어떻게 쓰이는지 확인해요.
        </p>

        <Link to={`/briefing/${featured.id}`} className="card pad-lg featured" style={{ color: "inherit" }}>
          <div className="eyebrow">{READING_KIND_LONG}</div>
          <div className="caption" style={{ marginTop: 6 }}>
            {READING_EXAMPLE_LABEL} · {featured.kicker} · {featured.minutes}분
          </div>
          <strong style={{ display: "block", margin: "8px 0 6px", fontSize: 18, lineHeight: 1.4 }}>
            {featured.headline}
          </strong>
          <span className="muted">{featured.subtitle}</span>
        </Link>

        <section>
          <div className="eyebrow">{READING_KIND_SHORT}</div>
          <p className="caption" style={{ margin: "0 0 8px" }}>
            한 편에 1~2분. 상황만 짧게 보고 판단해요.
          </p>
          {CONTEXT_CASES.map((c) => (
            <Link key={c.id} to={`/context/${c.id}`} className="read-clip">
              <div className="caption">
                {READING_EXAMPLE_LABEL} · {c.era}
                {seen(c.id) ? " · 다시 보기" : ""}
              </div>
              <strong>{c.title}</strong>
            </Link>
          ))}
        </section>

        <section>
          <div className="eyebrow">{READING_KIND_LONG}</div>
          <p className="caption" style={{ margin: "0 0 8px" }}>
            한 편에 3~4분. 사건과 해석이 어떻게 이어지는지 봐요.
          </p>
          {longer.map((b) => (
            <Link key={b.id} to={`/briefing/${b.id}`} className="read-clip">
              <div className="caption">
                {READING_EXAMPLE_LABEL} · {b.kicker} · {b.minutes}분
                {progress.seenContextIds.includes(b.id) ? " · 다시 보기" : ""}
              </div>
              <strong>{b.headline}</strong>
              {b.subtitle ? <span>{b.subtitle}</span> : null}
            </Link>
          ))}
        </section>

        <p className="notice">{READING_DISCLAIMER}</p>
      </div>
    </>
  );
}
