import { useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { resetProgress } from "../lib/progress";
import { exportStudyDump } from "../lib/events";
import { formatDayHeading, progressEvidence } from "../lib/evidence";
import { analyticsOptedOut, resetLearner, setAnalyticsOptOut } from "../lib/learner";
import { unsubscribePush } from "../lib/push";
import type { ProgressState, Term } from "../types";

function dash(n: number): string {
  return n > 0 ? String(n) : "—";
}

export function ReportPage({ terms, progress }: { terms: Term[]; progress: ProgressState }) {
  const [p, setP] = useState(progress);
  const [optOut, setOptOut] = useState(() => analyticsOptedOut());
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [familiarHint, setFamiliarHint] = useState(false);
  const e = progressEvidence(p, terms);
  const day = openDay ? e.dayRecord(openDay) : null;

  return (
    <>
      <TopBar title="학습 기록" back />
      <div className="page page-progress stack">
        <section className="progress-hero">
          <p className="caption" style={{ margin: 0 }}>이번 주</p>
          <h2>{e.studyDays ? `${e.studyDays}일 학습` : "아직 없음"}</h2>
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
        </section>

        <section>
          <div className="caption">이번 주 금융 언어</div>
          <div className="lang-path" aria-label="처음 만남에서 익숙해짐까지">
            <div>
              <span>처음 만남</span>
              <strong>{dash(e.newThisWeek)}</strong>
            </div>
            <i aria-hidden>→</i>
            <div>
              <span>다시 만남</span>
              <strong>{dash(e.reviewThisWeek)}</strong>
            </div>
            <i aria-hidden>→</i>
            <div>
              <span>
                익숙해짐
                <button
                  type="button"
                  className="lang-info"
                  aria-expanded={familiarHint}
                  aria-label="익숙해짐 설명"
                  onClick={() => setFamiliarHint((v) => !v)}
                >
                  ⓘ
                </button>
              </span>
              <strong>{dash(e.familiarThisWeek)}</strong>
            </div>
          </div>
          {familiarHint ? (
            <p className="caption" style={{ margin: "8px 0 0" }}>
              여러 날에 걸쳐 다른 방식으로 다시 맞힌 말이에요.
            </p>
          ) : null}
          {e.recentFamiliar.length ? (
            <div className="chip-row" style={{ marginTop: 12 }}>
              {e.recentFamiliar.map((t) => (
                <Link key={t.id} to={`/terms/${encodeURIComponent(t.id)}`} className="chip known">
                  {t.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        {e.confused.length ? (
          <section>
            <div className="caption">헷갈리는 개념</div>
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
                  {c.lapses >= 2 ? (
                    <span className="caption"> {c.lapses}번 헷갈렸어요</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {e.encounters.length ? (
          <section>
            <div className="caption">읽기에서 다시 만난 말</div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {e.encounters.map((x) => (
                <Link key={x.id} to={`/terms/${encodeURIComponent(x.id)}`} className="chip">
                  {x.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <button
            type="button"
            className="month-toggle"
            aria-expanded={monthOpen}
            onClick={() => setMonthOpen((v) => !v)}
          >
            {e.monthLabel} · {e.monthStudyDays}일 학습
            <span>{monthOpen ? "접기" : "월간 기록 보기 〉"}</span>
          </button>
          {monthOpen ? (
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
          ) : null}
        </section>

        {day ? (
          <section className="day-sheet">
            <div className="caption">{formatDayHeading(day.date)}</div>
            {day.newTerms.length || day.reviewTerms.length || day.readings.length ? (
              <>
                {day.newTerms.length ? (
                  <>
                    <div className="caption" style={{ marginTop: 10 }}>새로 만난 말 {day.newTerms.length}</div>
                    <div className="chip-row" style={{ marginTop: 8 }}>
                      {day.newTerms.map((t) => (
                        <Link key={t.id} to={`/terms/${encodeURIComponent(t.id)}`} className="chip">
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : null}
                {day.reviewTerms.length ? (
                  <>
                    <div className="caption" style={{ marginTop: 10 }}>다시 본 말 {day.reviewTerms.length}</div>
                    <div className="chip-row" style={{ marginTop: 8 }}>
                      {day.reviewTerms.map((t) => (
                        <Link key={t.id} to={`/terms/${encodeURIComponent(t.id)}`} className="chip">
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : null}
                {day.readings.length ? (
                  <>
                    <div className="caption" style={{ marginTop: 10 }}>읽기 {day.readings.length}편</div>
                    <p className="progress-encounters">
                      {day.readings.map((r) => r.title).join(" · ")}
                    </p>
                  </>
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
