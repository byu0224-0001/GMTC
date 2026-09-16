import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RelatedConcepts, TopBar } from "../components/Chrome";
import { TermLearnCard, sourceLooksAligned } from "../components/TermLearnCard";
import { displayTitle } from "../lib/hangul";
import { SOURCE_DISCLAIMER } from "../content/brand";
import { readingsForTerm } from "../content/termReadings";
import { BOK_REPORT_BRIDGE, reportTermById } from "../content/reportLexicon";
import { logEvent } from "../lib/events";
import { isDraftReady, isLearningReady } from "../content/literacy";
import { includeDraftTerms } from "../lib/qaMode";
import type { Term } from "../types";

export function TermDetailPage({ terms }: { terms: Term[] }) {
  const { termId } = useParams();
  const nav = useNavigate();
  const term = terms.find((t) => t.id === termId);
  const related = term ? terms.filter((t) => term.relatedIds.includes(t.id)).slice(0, 5) : [];
  const readings = term ? readingsForTerm(term.id) : [];
  const core = term?.priority === "core";
  const showLearn = Boolean(
    term && (isLearningReady(term) || (includeDraftTerms() && isDraftReady(term))),
  );
  const bridge = term ? BOK_REPORT_BRIDGE[term.id] : undefined;

  useEffect(() => {
    if (!term) return;
    logEvent("term_detail_open", { termId: term.id, sourceType: "bok" });
  }, [term?.id]);

  if (!term) {
    return (
      <div className="page">
        <p>용어를 찾지 못했어요.</p>
        <button className="btn btn-primary" onClick={() => nav("/terms")}>용어 목록으로</button>
      </div>
    );
  }

  return (
    <>
      <TopBar title="용어" back />
      <div className="page stack">
        {term.copyReview === "pending" && showLearn ? (
          <>
            <p className="caption" style={{ margin: 0 }}>① 오늘 학습 카드 · 승인되면</p>
            <TermLearnCard term={term} terms={terms} moreHref={false} />
            <p className="caption" style={{ margin: 0 }}>② 사전 상세 · 승인되면</p>
          </>
        ) : null}
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
              {term.easyExplanation ? (
              <div className="why" style={{ marginTop: 12 }}>
                <strong>쉬운 설명</strong>
                {term.easyExplanation}
              </div>
              ) : null}
              {term.typicalSituation ? (
                <p className="why"><strong>이렇게 읽어요</strong> {term.typicalSituation}</p>
              ) : null}
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
              <RelatedConcepts term={term} terms={terms} />
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
        {showLearn && sourceLooksAligned(term) ? (
          <details className="official-fold">
            <summary>한국은행 원문 보기</summary>
            <p className="muted" style={{ margin: 0 }}>{term.definition}</p>
          </details>
        ) : null}
        {term.copyReview === "pending" && showLearn ? (
          <div className="card pad-lg">
            <div className="caption">③ 검수 필드 · 아직 pending</div>
            <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.65 }}>
              {[
                ["한 줄 뜻", term.oneLiner],
                ["쉬운 설명", term.easyExplanation],
                ["이렇게 읽어요", term.typicalSituation],
                ["알아두면 좋은 이유", term.whyItMatters],
                ["핵심 포인트", term.keyPoints[0]],
                ["헷갈리기 쉬운 점", term.commonConfusions[0]],
              ].map(([label, value]) => `${label} ${value ? "있음" : "없음(생략 가능)"}`).join(" · ")}
            </p>
          </div>
        ) : null}
        {readings.length > 0 ? (
          <div>
            <div className="caption">관련 읽기</div>
            {readings.map((item) => (
              <Link key={item.id} to={`/context/${encodeURIComponent(item.id)}`} className="term-row">
                <strong>{item.title}</strong>
                <span>읽어보기</span>
              </Link>
            ))}
          </div>
        ) : null}
        {related.length > 0 ? (
          <div>
            <div className="caption">관련 용어</div>
            {related.map((t) => (
              <Link key={t.id} to={`/terms/${encodeURIComponent(t.id)}`} className="term-row">
                <strong>{displayTitle(t)}</strong>
                <span>{isLearningReady(t) || includeDraftTerms() ? t.easyExplanation || t.shortDef : t.shortDef}</span>
              </Link>
            ))}
          </div>
        ) : null}
        <Link className="text-link" to="/terms" style={{ display: "inline-flex", minHeight: "var(--touch-min)", alignItems: "center" }}>
          사전에서 더 찾아보기
        </Link>
        <p className="notice">{SOURCE_DISCLAIMER}</p>
      </div>
    </>
  );
}
