import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Chain } from "../components/Chrome";
import { CONTEXT_CASES, type ContextCase } from "../content/literacy";
import { canonBokId } from "../content/reportLexicon";
import { beginTodaySession, endTodaySession, logEvent } from "../lib/events";
import { flushEvents } from "../lib/learner";
import { labelFor } from "../lib/lookup";
import { loadProgress, recordContext, saveProgress } from "../lib/progress";
import { seededShuffle } from "../lib/quiz";
import type { Term } from "../types";

/** 사실 확인 → 개념 → 해설 순서로 읽는다. */
type Stage = "fact" | "concept" | "done";

/** 두 번째 문제가 어떤 읽기를 요구하는지 화면에 적는다. */
const LENS_LABEL: Record<ContextCase["lens"], string> = {
  name: "이 개념의 이름",
  cause: "왜 이렇게 됐을까",
  next: "다음으로 확인할 것",
};

export function ContextQuizPage({ terms }: { terms: Term[] }) {
  const { caseId } = useParams();
  const nav = useNavigate();
  const cse = CONTEXT_CASES.find((c) => c.id === caseId);
  const [stage, setStage] = useState<Stage>(cse?.fact ? "fact" : "concept");
  const [factPick, setFactPick] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const conceptChoices = useMemo(
    () => (cse ? seededShuffle(cse.choiceIds, cse.id.length * 31 + 7) : []),
    [cse],
  );
  const factChoices = useMemo(
    () => (cse?.fact ? seededShuffle(cse.fact.choices, cse.id.length * 17 + 3) : []),
    [cse],
  );

  /**
   * 읽기도 하나의 세션으로 묶는다.
   * 이걸 하지 않으면 읽기에서 남은 답안이 sessionId 없이 떠돌고, 파일럿에서
   * `학습에서 쓴 시간`과 `읽기에서 쓴 시간`을 나눠 볼 수 없다.
   */
  useEffect(() => {
    if (!caseId) return;
    beginTodaySession({ source: "reading" });
    return () => {
      endTodaySession();
      void flushEvents();
    };
  }, [caseId]);

  if (!cse) {
    return (
      <div className="page">
        <p>읽을 글을 찾지 못했습니다.</p>
        <button className="btn btn-primary" onClick={() => nav("/context")}>읽기 목록으로</button>
      </div>
    );
  }

  const chips = (cse.termIds ?? []).map((id) => canonBokId(id));

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => nav("/context")} aria-label="닫기">✕</button>
        <h1>짧게 읽기</h1>
        <span />
      </header>
      <div className="page session stack">
        <div>
          <span className="pill-badge">학습용 예시</span>
          <span className="caption" style={{ marginLeft: 8 }}>{cse.era}</span>
        </div>

        <div className="card pad-lg">
          <h2 className="term-title" style={{ fontSize: 20, margin: "0 0 12px" }}>{cse.title}</h2>
          <p style={{ lineHeight: 1.8, margin: 0 }}>{cse.situation}</p>
          {/*
            본문에 수치가 들어간 뒤로는 `학습용 예시`만으로는 부족하다. 읽는 사람이
            이걸 현행 규제나 실제 발표로 받아들이면 안 되므로 숫자까지 지어낸 것임을
            본문 바로 아래에 적는다.
          */}
          <p className="caption" style={{ margin: "14px 0 0" }}>
            실제 기사가 아니라 학습을 위해 지어낸 상황이고, 숫자도 설명을 위해 만든 값입니다.
          </p>
        </div>

        {cse.fact && stage === "fact" ? (
          <>
            <div className="card">
              <div className="caption">읽은 내용 확인</div>
              <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>{cse.fact.question}</p>
            </div>
            <div className="stack-8">
              {factChoices.map((c) => {
                let cls = "choice";
                if (factPick) {
                  if (c.id === cse.fact!.answerId) cls += " correct";
                  else if (c.id === factPick) cls += " wrong";
                  else cls += " dim";
                }
                return (
                  <button
                    key={c.id}
                    className={cls}
                    disabled={Boolean(factPick)}
                    onClick={() => {
                      setFactPick(c.id);
                      logEvent("reading_answer", {
                        caseId: cse.id,
                        lens: "fact",
                        correct: c.id === cse.fact!.answerId,
                      });
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {factPick ? (
              <>
                <div className="hint" aria-live="polite">{cse.fact.why}</div>
                <button className="btn btn-primary" onClick={() => setStage("concept")}>
                  한 단계 더
                </button>
              </>
            ) : null}
          </>
        ) : null}

        {stage === "concept" ? (
          <>
            <div className="card">
              <div className="caption">{LENS_LABEL[cse.lens]}</div>
              <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>{cse.question}</p>
            </div>
            <div className="stack-8">
              {conceptChoices.map((id) => {
                let cls = "choice";
                if (picked) {
                  if (id === cse.answerTermId) cls += " correct";
                  else if (id === picked) cls += " wrong";
                  else cls += " dim";
                }
                return (
                  <button
                    key={id}
                    className={cls}
                    disabled={Boolean(picked)}
                    onClick={() => {
                      setPicked(id);
                      const ok = id === cse.answerTermId;
                      saveProgress(recordContext(loadProgress(), cse.id, ok));
                      logEvent("reading_answer", {
                        caseId: cse.id,
                        lens: cse.lens,
                        termId: cse.answerTermId,
                        correct: ok,
                      });
                    }}
                  >
                    {labelFor(id, terms)}
                  </button>
                );
              })}
            </div>
            {picked ? (
              <>
                <div className="hint" aria-live="polite">{cse.why}</div>
                <button className="btn btn-primary" onClick={() => setStage("done")}>다음</button>
              </>
            ) : null}
          </>
        ) : null}

        {stage === "done" ? (
          <>
            <div className="card">
              <div className="caption">이렇게 연결됩니다</div>
              <Chain items={cse.chain} terms={terms} />
              {cse.nextToCheck?.length ? (
                <>
                  <div className="caption" style={{ marginTop: 14 }}>다음으로 확인할 것</div>
                  <ul className="point-list">
                    {cse.nextToCheck.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </>
              ) : null}
            </div>
            {chips.length > 0 ? (
              <div className="card">
                <div className="caption">이 글에 나온 용어</div>
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {chips.map((id) => (
                    <Link
                      key={id}
                      className="chip"
                      to={id.startsWith("rpt-") ? `/lexicon/${id}` : `/terms/${encodeURIComponent(id)}`}
                    >
                      {labelFor(id, terms)}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <button className="btn btn-primary" onClick={() => nav("/context")}>읽기 목록으로</button>
          </>
        ) : null}
      </div>
    </>
  );
}
