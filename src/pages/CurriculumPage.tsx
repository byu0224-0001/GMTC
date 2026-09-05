import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { CORE100, TAXONOMY_LABEL, TAXONOMY_ORDER, type Taxonomy } from "../content/literacy";
import { REPORT_ESSENTIALS } from "../content/reportLexicon";
import { reportSeenCount, stats } from "../lib/progress";
import type { ProgressState, Term } from "../types";

export function CurriculumPage({ terms, progress }: { terms: Term[]; progress: ProgressState }) {
  const s = stats(progress, CORE100.map((c) => c.id));
  const reportSeen = reportSeenCount(progress, REPORT_ESSENTIALS.map((r) => r.id));
  void terms;

  return (
    <>
      <TopBar title="학습" />
      <div className="page stack">
        <Link className="btn btn-primary" to="/learn/session" style={{ display: "grid", placeItems: "center" }}>
          오늘 학습하기
        </Link>

        <Link to="/learn/core" className="card pad-lg" style={{ color: "inherit" }}>
          <h2 className="term-title" style={{ margin: "0 0 6px" }}>핵심 용어</h2>
          <p className="muted" style={{ margin: 0 }}>
            경제·금융 정보를 이해할 때 자주 쓰이는 핵심 용어입니다.
          </p>
          <div className="tax-meta" style={{ marginTop: 12 }}>
            <strong>{s.seen} / {s.coreTotal}</strong>
            <span className="tax-count">익숙해진 용어 {s.known}개</span>
          </div>
        </Link>

        <Link to="/learn/report" className="card pad-lg" style={{ color: "inherit" }}>
          <h2 className="term-title" style={{ margin: "0 0 6px" }}>리포트 표현</h2>
          <p className="muted" style={{ margin: 0 }}>
            YoY, CAPEX처럼 증권사 리포트에서 자주 쓰이는 표현입니다.
          </p>
          <div className="tax-meta" style={{ marginTop: 12 }}>
            <strong>{reportSeen} / {REPORT_ESSENTIALS.length}</strong>
            <span className="tax-count">학습한 표현</span>
          </div>
        </Link>

        <hr className="section-rule" />
        <div>
          <div className="eyebrow">분야별 보기</div>
          <div className="chip-row" style={{ marginTop: 10 }}>
            {TAXONOMY_ORDER.map((k) => (
              <Link key={k} className="chip" to={`/learn/core?taxonomy=${encodeURIComponent(k)}`}>
                {TAXONOMY_LABEL[k as Taxonomy]}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
