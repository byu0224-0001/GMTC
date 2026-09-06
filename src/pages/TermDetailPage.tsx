import { Link, useNavigate, useParams } from "react-router-dom";
import { Chain, TopBar } from "../components/Chrome";
import { displayTitle } from "../lib/hangul";
import { SOURCE_DISCLAIMER } from "../content/brand";
import { BOK_REPORT_BRIDGE, reportTermById } from "../content/reportLexicon";
import type { Term } from "../types";

export function TermDetailPage({ terms }: { terms: Term[] }) {
  const { termId } = useParams();
  const nav = useNavigate();
  const term = terms.find((t) => t.id === termId);
  const related = term ? terms.filter((t) => term.relatedIds.includes(t.id)).slice(0, 5) : [];
  const core = term?.priority === "core";
  const showLearn = Boolean(term && (core || term.easyExplanation));
  const bridge = term ? BOK_REPORT_BRIDGE[term.id] : undefined;

  if (!term) {
    return (
      <div className="page">
        <p>용어를 찾지 못했어요.</p>
        <button className="btn btn-primary" onClick={() => nav("/terms")}>사전으로</button>
      </div>
    );
  }

  return (
    <>
      <TopBar title="용어" back />
      <div className="page stack">
        <div className="card pad-lg">
          <div className="eyebrow">{core ? "핵심 용어" : showLearn ? "한국은행 · 리포트" : "한국은행"}</div>
          <h2 className="term-title" style={{ margin: "8px 0 4px" }}>{displayTitle(term)}</h2>
          {term.enName ? <div className="muted">{term.enName}</div> : null}
          {showLearn ? (
            <>
              {term.oneLiner ? (
                <p style={{ marginTop: 16, color: "var(--color-ink-strong)", fontWeight: 500, lineHeight: 1.6 }}>
                  {term.oneLiner}
                </p>
              ) : null}
              <div className="why" style={{ marginTop: 12 }}>
                <strong>쉬운 설명</strong>
                {term.easyExplanation}
              </div>
          <p className="why"><strong>알아두면 좋은 이유</strong> {term.whyItMatters}</p>
              {term.keyPoints.length > 0 ? (
                <>
                  <div className="caption">핵심 포인트</div>
                  <ul className="point-list">
                    {term.keyPoints.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </>
              ) : null}
              {term.commonConfusions.length > 0 ? (
                <>
                  <div className="caption" style={{ marginTop: 12 }}>헷갈리기 쉬운 점</div>
                  <ul className="point-list">
                    {term.commonConfusions.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </>
              ) : null}
              {term.chain.length > 0 ? (
                <>
                  <div className="caption" style={{ marginTop: 12 }}>연결되는 개념</div>
                  <Chain items={term.chain} terms={terms} />
                </>
              ) : null}
            </>
          ) : (
            <>
              <div className="caption" style={{ marginTop: 16 }}>한국은행 설명</div>
              <p style={{ marginTop: 8, color: "var(--color-body)" }}>{term.definition}</p>
            </>
          )}
        </div>
        {bridge ? (
          <div className="card">
            <div className="caption">리포트에서</div>
            <p className="muted" style={{ margin: "8px 0 0" }}>{bridge.usage}</p>
            {bridge.lexiconIds.map((id) => {
              const r = reportTermById(id);
              if (!r) return null;
              return (
                <Link key={id} to={`/lexicon/${id}`} className="term-row">
                  <strong>{r.headword}{r.abbr ? ` (${r.abbr})` : ""}</strong>
                  <span>{r.easyExplanation}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
        {showLearn ? (
          <details className="official-fold">
            <summary>한국은행 원문 보기</summary>
            <p className="muted" style={{ margin: 0 }}>{term.definition}</p>
          </details>
        ) : null}
        {related.length > 0 ? (
          <div>
            <div className="caption">관련 용어</div>
            {related.map((t) => (
              <Link key={t.id} to={`/terms/${encodeURIComponent(t.id)}`} className="term-row">
                <strong>{displayTitle(t)}</strong>
                <span>{t.easyExplanation || t.shortDef}</span>
              </Link>
            ))}
          </div>
        ) : null}
        {core ? (
          <Link className="btn btn-primary" to="/learn/session" style={{ display: "grid", placeItems: "center" }}>
            시작하기
          </Link>
        ) : (
          <Link className="btn btn-ghost" to="/terms" style={{ display: "grid", placeItems: "center" }}>
            사전으로
          </Link>
        )}
        <p className="notice">{SOURCE_DISCLAIMER}</p>
      </div>
    </>
  );
}
