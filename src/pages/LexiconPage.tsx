import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Chain, TopBar } from "../components/Chrome";
import { REPORT_BOK_CANON, REPORT_ESSENTIALS, reportTermById } from "../content/reportLexicon";

export function LexiconPage() {
  const { termId } = useParams();
  const nav = useNavigate();
  const term = termId ? reportTermById(termId) : undefined;
  const canon = termId ? REPORT_BOK_CANON[termId] : undefined;
  if (canon) return <Navigate to={`/terms/${encodeURIComponent(canon)}`} replace />;

  if (!term) {
    return (
      <div className="page">
        <p>표현을 찾지 못했습니다.</p>
        <button className="btn btn-primary" onClick={() => nav("/learn/report")}>리포트 표현으로</button>
      </div>
    );
  }

  const related = REPORT_ESSENTIALS.filter((t) => term.chain.includes(t.abbr ?? "") || term.chain.includes(t.headword)).slice(0, 5);

  return (
    <>
      <TopBar title="리포트 표현" back />
      <div className="page stack">
        <div className="card pad-lg">
          <div className="eyebrow">리포트 표현</div>
          <h2 className="term-title" style={{ margin: "8px 0 4px" }}>
            {term.headword}
            {term.abbr ? ` (${term.abbr})` : ""}
          </h2>
          <p style={{ marginTop: 16, color: "var(--color-ink-strong)", fontWeight: 500, lineHeight: 1.6 }}>
            {term.easyExplanation}
          </p>
          <p className="why"><strong>투자할 때</strong> {term.whyItMatters}</p>
          <p className="why"><strong>리포트에서는</strong> {term.reportUsage}</p>
          <div className="caption">함께 보면</div>
          <Chain items={term.chain} />
        </div>
        {related.length > 0 ? (
          <div>
            <div className="caption">관련 표현</div>
            {related.filter((t) => t.id !== term.id).map((t) => (
              <Link key={t.id} to={`/lexicon/${t.id}`} className="term-row">
                <strong>{t.headword}{t.abbr ? ` (${t.abbr})` : ""}</strong>
                <span>{t.easyExplanation}</span>
              </Link>
            ))}
          </div>
        ) : null}
        <Link className="btn btn-primary" to="/learn/session" style={{ display: "grid", placeItems: "center" }}>
          오늘 학습하기
        </Link>
        <p className="notice">증권사 리포트 원문을 그대로 옮기지 않았습니다.</p>
      </div>
    </>
  );
}
