import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { TopBar } from "../components/Chrome";
import { REPORT_ESSENTIALS, REPORT_GROUPS } from "../content/reportLexicon";
import { reportSeenCount } from "../lib/progress";
import type { ProgressState } from "../types";

export function ReportHubPage({ progress }: { progress: ProgressState }) {
  const [params] = useSearchParams();
  const initial = params.get("group") ?? REPORT_GROUPS[0].id;
  const [group, setGroup] = useState(initial);
  const seen = reportSeenCount(progress, REPORT_ESSENTIALS.map((r) => r.id));
  const ids = useMemo(() => REPORT_GROUPS.find((g) => g.id === group)?.ids ?? [], [group]);

  return (
    <>
      <TopBar title="리포트 표현" back />
      <div className="page stack">
        <p className="muted" style={{ margin: 0 }}>
          증권사 리포트에서 자주 쓰이는 표현입니다.
        </p>
        <div className="card">
          <div className="tax-meta">
            <strong>{seen} / {REPORT_ESSENTIALS.length}</strong>
            <span className="tax-count">학습한 표현</span>
          </div>
        </div>
        <Link className="btn btn-primary" to="/learn/session" style={{ display: "grid", placeItems: "center" }}>
          시작하기
        </Link>
        <div className="chip-row">
          {REPORT_GROUPS.map((g) => (
            <button key={g.id} className={group === g.id ? "chip picked" : "chip"} onClick={() => setGroup(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
        {ids.map((id) => {
          const r = REPORT_ESSENTIALS.find((t) => t.id === id);
          if (!r) return null;
          return (
            <Link key={r.id} to={`/lexicon/${r.id}`} className="term-row">
              <strong>{r.headword}{r.abbr ? ` (${r.abbr})` : ""}</strong>
              <span>{r.easyExplanation}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
