import { useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { resetProgress } from "../lib/progress";
import { exportStudyDump } from "../lib/events";
import { formatDayHeading, progressEvidence } from "../lib/evidence";
import { analyticsOptedOut, resetLearner, setAnalyticsOptOut } from "../lib/learner";
import { unsubscribePush } from "../lib/push";
import type { ProgressState, Term } from "../types";

export function ReportPage({ terms, progress }: { terms: Term[]; progress: ProgressState }) {
  const [p, setP] = useState(progress);
  const [optOut, setOptOut] = useState(() => analyticsOptedOut());
  const [openDay, setOpenDay] = useState<string | null>(null);
  const e = progressEvidence(p, terms);
  const day = openDay ? e.dayRecord(openDay) : null;

  return (
    <>
      <TopBar title="학습 기록" back />
      <div className="page page-progress stack">
        <p className="caption" style={{ margin: 0 }}>이번 주 탈출 기록</p>
        <div className="progress-hero">
          <h2>{e.heroTitle}</h2>
          <p>{e.viewportLine}</p>
          <p className="caption" style={{ margin: "8px 0 0" }}>{e.heroSub}</p>
        </div>

        <div className="week-dots" role="list" aria-label="이번 주 학습한 날">
          {e.weekDays.map((d) => (
            <button
              key={d.date}
              type="button"
              className={d.done ? "week-dot on" : "week-dot"}
              onClick={() => setOpenDay(d.date)}
              aria-label={d.done ? `${d.label}요일, 학습함` : `${d.label}요일`}
            >
              <span>{d.label}</span>
              <i aria-hidden />
            </button>
          ))}
        </div>

        {e.learningTotal || e.familiarTotal ? (
          <p className="caption" style={{ margin: 0 }}>
            익히는 중 {e.learningTotal}개
            {e.familiarTotal ? ` · 지금 익숙한 말 ${e.familiarTotal}개` : ""}
          </p>
        ) : null}

        {e.reviewThisWeek ? (
          <section>
            <div className="caption">다시 본 말 {e.reviewThisWeek}</div>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              이전에 배운 뒤 이번 주 다시 만난 고유 용어예요.
            </p>
          </section>
        ) : null}

        {e.recentFamiliar.length ? (
          <section>
            <div className="caption">이번 주 새로 익숙해진 말</div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {e.recentFamiliar.map((t) => (
                <Link key={t.id} to={`/terms/${encodeURIComponent(t.id)}`} className="chip known">
                  {t.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {e.confused.length ? (
          <section>
            <div className="caption">아직 헷갈리는 말</div>
            <ul className="progress-pairs">
              {e.confused.map((c) => (
                <li key={c.id}>
                  <Link to={`/terms/${encodeURIComponent(c.id)}`}>{c.label}</Link>
                  {c.vsLabel ? (
                    <>
                      <span> ↔ </span>
                      {c.vsId ? (
                        <Link to={`/terms/${encodeURIComponent(c.vsId)}`}>{c.vsLabel}</Link>
                      ) : (
                        c.vsLabel
                      )}
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {e.encounters.length ? (
          <section>
            <div className="caption">읽기에서 다시 만난 말</div>
            <p className="progress-encounters">
              {e.encounters.map((x) => (
                <Link key={x.id} to={`/terms/${encodeURIComponent(x.id)}`}>
                  {x.label} {x.count}회
                </Link>
              ))}
            </p>
          </section>
        ) : null}

        <section>
          <div className="caption">{e.monthLabel}</div>
          <div className="month-cal" role="grid" aria-label="이번 달 학습한 날">
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
              <span key={d} className="month-dow">{d}</span>
            ))}
            {e.monthCells.map((cell, i) =>
              cell ? (
                <button
                  key={cell.date}
                  type="button"
                  className={cell.done ? "month-day on" : "month-day"}
                  onClick={() => setOpenDay(cell.date)}
                >
                  {Number(cell.date.slice(8))}
                </button>
              ) : (
                <span key={`e-${i}`} />
              ),
            )}
          </div>
          <p className="caption">표시된 날을 누르면 그날 만난 말과 읽기를 볼 수 있어요.</p>
        </section>

        {day ? (
          <section className="day-sheet">
            <div className="caption">
              {formatDayHeading(day.date)} — 새로 본 말 {day.newTerms.length} · 복습 {day.reviewTerms.length} · 읽기 {day.readings.length}
            </div>
            {day.newTerms.length || day.reviewTerms.length || day.readings.length ? (
              <>
                {day.newTerms.length ? (
                  <p>
                    <span className="caption">새로 만난 말</span>
                    {day.newTerms.map((t) => t.label).join(" · ")}
                  </p>
                ) : null}
                {day.reviewTerms.length ? (
                  <p>
                    <span className="caption">다시 본 말</span>
                    {day.reviewTerms.map((t) => t.label).join(" · ")}
                  </p>
                ) : null}
                {day.readings.length ? (
                  <p>
                    <span className="caption">읽기</span>
                    {day.readings.map((r) => r.title).join(" · ")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="muted">이 날의 학습 기록이 없어요.</p>
            )}
          </section>
        ) : null}

        <Link className="btn btn-primary" to="/learn/session" style={{ display: "grid", placeItems: "center" }}>
          이어서 학습하기
        </Link>

        <details className="progress-manage">
          <summary>기록 관리</summary>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const blob = new Blob([exportStudyDump(p)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "voca-study-log.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            학습 기록 내보내기
          </button>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              if (!confirm("이 기기의 학습 기록을 모두 지울까요? 서버에 보관된 기록도 함께 지워요."))
                return;
              await unsubscribePush(p);
              await resetLearner();
              setAnalyticsOptOut(false);
              setP(resetProgress());
            }}
          >
            기록 지우기
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const next = !optOut;
              setAnalyticsOptOut(next);
              setOptOut(next);
            }}
          >
            {optOut ? "파일럿 기록 보내기 켜기" : "파일럿 기록 보내지 않기"}
          </button>
          <p className="notice">
            학습 진도는 이 기기에만 저장돼요. 브라우저 데이터를 지우거나 기기를 바꾸면
            기록도 함께 사라질 수 있어요.
          </p>
        </details>
      </div>
    </>
  );
}
