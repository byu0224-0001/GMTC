import { useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { LearningVisual } from "../components/LearningVisual";
import { READING_DISCLAIMER, READING_KIND_LONG, READING_KIND_SHORT } from "../content/brand";
import { allBriefings, briefingById } from "../content/briefings";
import { CONTEXT_CASES } from "../content/literacy";
import { briefingForPlan, type TodayPlanFile } from "../lib/todayPlan";
import type { ProgressState, Term } from "../types";

type ReadShelf = "short" | "long";

/**
 * 한 목록에 두 길이를 쌓으면 구역 제목이 항목 자막처럼 묻힌다.
 * 위에서 선반을 고르고, 그 선반만 보여 준다.
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
  const [shelf, setShelf] = useState<ReadShelf>("long");
  const longTotal = 1 + longer.length;

  return (
    <>
      <TopBar title="읽기" />
      <div className="page stack">
        <p className="muted" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <LearningVisual type="context" />
          <strong style={{ fontWeight: 600, color: "var(--color-ink-strong)" }}>
            배운 용어를 문장에서 다시 만나보세요.
          </strong>
        </p>

        <div className="read-switch" role="tablist" aria-label="읽기 종류">
          <button
            type="button"
            role="tab"
            aria-selected={shelf === "short"}
            className={shelf === "short" ? "on" : undefined}
            onClick={() => setShelf("short")}
          >
            {READING_KIND_SHORT} {CONTEXT_CASES.length}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={shelf === "long"}
            className={shelf === "long" ? "on" : undefined}
            onClick={() => setShelf("long")}
          >
            {READING_KIND_LONG} {longTotal}
          </button>
        </div>

        {shelf === "long" ? (
          <>
            <Link to={`/briefing/${featured.id}`} className="card pad-lg featured" style={{ color: "inherit" }}>
              <div className="eyebrow">오늘</div>
              <div className="caption" style={{ marginTop: 6 }}>
                {featured.kicker} · {featured.minutes}분
              </div>
              <strong style={{ display: "block", margin: "8px 0 6px", fontSize: 20, lineHeight: 1.4 }}>
                {featured.headline}
              </strong>
              {featured.subtitle ? <span className="muted">{featured.subtitle}</span> : null}
            </Link>
            {longer.map((b) => (
              <Link key={b.id} to={`/briefing/${b.id}`} className="read-clip">
                <strong>{b.headline}</strong>
                <span>
                  {b.kicker} · {b.minutes}분
                  {progress.seenContextIds.includes(b.id) ? " · 다시 보기" : ""}
                </span>
              </Link>
            ))}
          </>
        ) : (
          CONTEXT_CASES.map((c) => (
            <Link key={c.id} to={`/context/${c.id}`} className="read-clip">
              <strong>{c.title}</strong>
              <span>
                {c.era}
                {seen(c.id) ? " · 다시 보기" : ""}
              </span>
            </Link>
          ))
        )}

        <p className="notice">{READING_DISCLAIMER}</p>
      </div>
    </>
  );
}
