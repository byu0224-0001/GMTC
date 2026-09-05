import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chain } from "../components/Chrome";
import { CONTEXT_CASES } from "../content/literacy";
import { labelFor } from "../lib/lookup";
import { loadProgress, recordContext, saveProgress } from "../lib/progress";
import type { Term } from "../types";

export function ContextQuizPage({ terms }: { terms: Term[] }) {
  const { caseId } = useParams();
  const nav = useNavigate();
  const cse = CONTEXT_CASES.find((c) => c.id === caseId);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!cse) {
    return (
      <div className="page">
        <p>문제를 찾지 못했습니다.</p>
        <button className="btn btn-primary" onClick={() => nav("/context")}>목록으로</button>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => nav("/context")} aria-label="닫기">✕</button>
        <h1>짧은 연습</h1>
        <span />
      </header>
      <div className="page session stack">
        <div>
          <span className="pill-badge">학습용 예시</span>
          <span className="caption" style={{ marginLeft: 8 }}>{cse.era}</span>
        </div>
        <div className="card pad-lg">
          <h2 className="term-title" style={{ fontSize: 20, margin: "0 0 12px" }}>{cse.title}</h2>
          <p style={{ lineHeight: 1.7 }}>{cse.situation}</p>
          <p className="muted" style={{ marginTop: 12 }}>{cse.question}</p>
        </div>
        {!submitted ? (
          <>
            <div className="stack-8">
              {cse.choiceIds.map((id) => (
                  <button key={id} className={picked === id ? "choice picked" : "choice"} onClick={() => setPicked(id)}>
                    {labelFor(id, terms)}
                  </button>
              ))}
            </div>
            <button
              className="btn btn-primary"
              disabled={!picked}
              onClick={() => {
                if (!picked) return;
                setSubmitted(true);
                saveProgress(recordContext(loadProgress(), cse.id, picked === cse.answerTermId));
              }}
            >
              확인
            </button>
          </>
        ) : (
          <>
            <div className="hint" aria-live="polite">{cse.why}</div>
            <div className="card">
              {cse.nextToCheck?.length ? (
                <>
                  <div className="caption">다음으로 확인할 것</div>
                  <ul className="point-list">
                    {cse.nextToCheck.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </>
              ) : null}
              <div className="caption" style={{ marginTop: cse.nextToCheck?.length ? 12 : 0 }}>연결되는 개념</div>
              <Chain items={cse.chain} terms={terms} />
            </div>
            <button className="btn btn-primary" onClick={() => nav("/context")}>목록으로</button>
          </>
        )}
      </div>
    </>
  );
}
