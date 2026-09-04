import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { allBriefings, briefingById } from "../content/briefings";
import { CONTEXT_CASES } from "../content/literacy";
import { briefingForPlan, type TodayPlanFile } from "../lib/todayPlan";
import type { ProgressState, Term } from "../types";

const SHORT_PRACTICE_IDS = [
  "cx-2022-cpi",
  "cx-hike-duration",
  "cx-yoy-ytd",
  "cx-ai-capex",
  "cx-eps-valuation",
  "cx-unemployment",
  "cx-full-capa",
  "cx-shareholder-return",
];

export function ContextFeedPage({
  progress,
  todayPlan,
}: {
  progress: ProgressState;
  terms?: Term[];
  todayPlan: TodayPlanFile;
}) {
  const today = briefingForPlan(todayPlan, progress.seenContextIds);
  const others = allBriefings().filter((b) => b.id !== today.id);
  const drills = SHORT_PRACTICE_IDS.map((id) => CONTEXT_CASES.find((c) => c.id === id)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );
  const featured = briefingById(today.id) ?? today;

  return (
    <>
      <TopBar title="실전" />
      <div className="page stack">
        <Link to={`/briefing/${featured.id}`} className="card pad-lg featured" style={{ color: "inherit" }}>
          <div className="eyebrow">오늘의 브리핑 · {featured.kicker}</div>
          <strong style={{ display: "block", margin: "8px 0 6px", fontSize: 18, lineHeight: 1.4 }}>
            {featured.headline}
          </strong>
          <span className="muted">{featured.subtitle}</span>
          <div className="caption" style={{ marginTop: 10 }}>{featured.minutes}분</div>
        </Link>

        <section>
          <div className="eyebrow">다른 브리핑</div>
          {others.map((b) => (
            <Link key={b.id} to={`/briefing/${b.id}`} className="term-row">
              <strong>{b.headline}</strong>
              <span>{progress.seenContextIds.includes(b.id) ? "다시 보기 · " : ""}{b.subtitle}</span>
            </Link>
          ))}
        </section>

        <section>
          <div className="eyebrow">짧은 연습</div>
          {drills.map((c) => (
            <Link key={c.id} to={`/context/${c.id}`} className="term-row">
              <strong>{c.title}</strong>
              <span>{c.question}</span>
            </Link>
          ))}
        </section>

        <p className="notice">실제 기사나 리포트 문장을 그대로 가져오지 않았습니다.</p>
      </div>
    </>
  );
}
