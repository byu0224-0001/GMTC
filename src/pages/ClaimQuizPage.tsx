import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CLAIM_CASES } from "../content/claimCases";

export function ClaimQuizPage() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const cse = CLAIM_CASES.find((c) => c.id === caseId);
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
        <h1>확인된 사실과 전망</h1>
        <span />
      </header>
      <div className="page session stack">
        <div>
          <span className="pill-badge">학습용 예시</span>
          <span className="caption" style={{ marginLeft: 8 }}>{cse.asOf}</span>
        </div>
        <div className="card pad-lg">
          <h2 className="term-title" style={{ fontSize: 20, margin: "0 0 12px" }}>{cse.title}</h2>
          <p style={{ lineHeight: 1.7 }}>{cse.situation}</p>
          <p className="muted" style={{ marginTop: 12 }}>{cse.question}</p>
        </div>
        <div className="stack-8">
          {cse.choices.map((c) => {
            let cls = "choice";
            if (submitted) {
              if (c.id === cse.answerType) cls += " correct";
              else if (c.id === picked) cls += " wrong";
              else cls += " dim";
            } else if (picked === c.id) cls += " picked";
            return (
              <button
                key={c.id}
                className={cls}
                disabled={submitted}
                onClick={() => setPicked(c.id)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {!submitted ? (
          <button
            className="btn btn-primary"
            disabled={!picked}
            onClick={() => setSubmitted(true)}
          >
            확인
          </button>
        ) : (
          <>
            <p className="why">{cse.why}</p>
            {cse.nextToCheck?.length ? (
              <div className="card">
                <div className="caption">다음으로 확인할 것</div>
                <ul className="point-list">
                  {cse.nextToCheck.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            ) : null}
            <button className="btn btn-primary" onClick={() => nav("/context")}>목록으로</button>
          </>
        )}
      </div>
    </>
  );
}
