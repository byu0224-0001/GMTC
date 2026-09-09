import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConceptFlowView } from "../components/Chrome";
import { ReadingAsk, askKindFromDepth } from "../components/ReadingAsk";
import { TermPeek, type PeekQuery } from "../components/TermPeek";
import { READING_DISCLAIMER, READING_EXAMPLE_LABEL, READING_KIND_SHORT } from "../content/brand";
import { CONTEXT_CASES } from "../content/literacy";
import { beginTodaySession, endTodaySession, logEvent } from "../lib/events";
import { chipClass } from "../lib/chipTone";
import { flushEvents } from "../lib/learner";
import { labelFor } from "../lib/lookup";
import { loadProgress, recordContext, saveProgress } from "../lib/progress";
import { clearUiResume, loadUiResume, saveUiResume } from "../lib/sessionUi";
import { resolveTermPreview } from "../lib/termPreview";
import { seededShuffle } from "../lib/quiz";
import type { Term } from "../types";

type ShortResume = {
  factPick: string | null;
  picked: string | null;
  factSkipped?: boolean;
  conceptSkipped?: boolean;
  factOpen?: boolean;
  /** 이전 저장 형식. 있으면 열어둔 위치만 복원한다. */
  stage?: "fact" | "concept" | "done";
};

function loadShortResume(raw: ShortResume | null): ShortResume {
  if (!raw) {
    return { factPick: null, picked: null, factSkipped: false, conceptSkipped: false, factOpen: false };
  }
  return {
    factPick: raw.factPick ?? null,
    picked: raw.picked ?? null,
    factSkipped: Boolean(raw.factSkipped),
    conceptSkipped: Boolean(raw.conceptSkipped) || (raw.stage === "done" && !raw.picked),
    factOpen: Boolean(raw.factOpen) || Boolean(raw.factPick) || raw.stage === "fact",
  };
}

function bodyParagraphs(text: string): string[] {
  const parts = text.split(/(?<=요\.)\s+/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}

export function ContextQuizPage({ terms }: { terms: Term[] }) {
  const { caseId } = useParams();
  const nav = useNavigate();
  const cse = CONTEXT_CASES.find((c) => c.id === caseId);
  const resumeKey = caseId ? `reading:${caseId}` : "";
  const boot = loadShortResume(
    resumeKey ? loadUiResume<ShortResume>(resumeKey) : null,
  );
  const [factPick, setFactPick] = useState<string | null>(boot.factPick);
  const [picked, setPicked] = useState<string | null>(boot.picked);
  const [factSkipped, setFactSkipped] = useState(boot.factSkipped ?? false);
  const [conceptSkipped, setConceptSkipped] = useState(boot.conceptSkipped ?? false);
  const [factOpen, setFactOpen] = useState(boot.factOpen ?? false);
  const [peek, setPeek] = useState<PeekQuery | null>(null);
  const interacted = useRef(Boolean(boot.factPick || boot.picked || boot.factSkipped || boot.conceptSkipped));

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
    logEvent("reading_start", { caseId, kind: "short" });
    return () => {
      endTodaySession();
      void flushEvents();
    };
  }, [caseId]);

  useEffect(() => {
    if (!resumeKey) return;
    saveUiResume(resumeKey, { factPick, picked, factSkipped, conceptSkipped, factOpen });
  }, [resumeKey, factPick, picked, factSkipped, conceptSkipped, factOpen]);

  if (!cse) {
    return (
      <div className="page">
        <p>읽을 글을 찾지 못했어요.</p>
        <button className="btn btn-primary" onClick={() => nav("/context")}>읽기 목록으로</button>
      </div>
    );
  }

  const article = cse;
  const chips = article.termIds ?? [];
  const conceptResolved = Boolean(picked) || conceptSkipped;

  function markInteract() {
    if (interacted.current) return;
    interacted.current = true;
    logEvent("first_interaction", { caseId: article.id, kind: "short" });
  }

  function openPeek(label: string, context: PeekQuery["context"], id?: string) {
    const q: PeekQuery = {
      label,
      id,
      fromId: article.answerTermId,
      context,
      articleId: article.id,
    };
    if (resolveTermPreview(q, terms)) setPeek(q);
  }

  return (
    <>
      <header className="topbar">
        <button
          className="icon-btn"
          onClick={() => {
            if (!conceptResolved) logEvent("reading_exit", { caseId: cse.id, completed: false });
            nav("/context");
          }}
          aria-label="닫기"
        >
          ✕
        </button>
        <h1>읽기</h1>
        <span />
      </header>
      <div className="page session stack briefing editorial">
        <div>
          <div className="eyebrow">{READING_KIND_SHORT}</div>
          <span className="caption">
            {READING_EXAMPLE_LABEL} · {cse.era}
          </span>
        </div>

        <div>
          <h2 className="read-headline">{cse.title}</h2>
          {bodyParagraphs(cse.situation).map((p) => (
            <p key={p.slice(0, 24)} className="briefing-p" style={{ margin: "0 0 12px" }}>{p}</p>
          ))}
          <p className="caption" style={{ margin: "0 0 8px" }}>
            {READING_DISCLAIMER}
          </p>
        </div>

        {cse.fact && !factOpen && !factPick && !factSkipped ? (
          <button type="button" className="text-link read-skip" onClick={() => setFactOpen(true)}>
            한 번 더 확인해보기
          </button>
        ) : null}

        {cse.fact && factSkipped && !factPick ? (
          <div className="read-skipped">
            <span className="caption">이 질문은 건너뛰고 글을 이어 읽어요</span>
            <button type="button" className="text-link" onClick={() => setFactSkipped(false)}>
              답해보기
            </button>
          </div>
        ) : cse.fact && (factOpen || factPick) ? (
          <ReadingAsk kind="check" step={1} total={1}>
            <p className="briefing-q">{cse.fact.question}</p>
            <div className="stack-8" style={{ marginTop: 12 }}>
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
                      markInteract();
                      setFactSkipped(false);
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
                <p
                  className={factPick === cse.fact.answerId ? "verdict ok" : "verdict no"}
                  role="status"
                  style={{ marginTop: 14 }}
                >
                  {factPick === cse.fact.answerId ? "맞았어요" : "초록으로 표시한 쪽이 정답이에요"}
                </p>
                <p className="why" style={{ marginTop: 8 }}>{cse.fact.why}</p>
              </>
            ) : (
              <button
                type="button"
                className="text-link read-skip"
                onClick={() => {
                  markInteract();
                  setFactSkipped(true);
                  logEvent("reading_answer", { caseId: cse.id, lens: "fact", skipped: true, correct: null });
                }}
              >
                그냥 계속 읽기
              </button>
            )}
          </ReadingAsk>
        ) : null}

        <ReadingAsk kind={askKindFromDepth(cse.lens)} step={1} total={1}>
          <p className="briefing-q">{cse.question}</p>
          <div className="stack-8" style={{ marginTop: 12 }}>
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
                    markInteract();
                    setConceptSkipped(false);
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
              <p
                className={picked === cse.answerTermId ? "verdict ok" : "verdict no"}
                role="status"
                style={{ marginTop: 14 }}
              >
                {picked === cse.answerTermId ? "맞았어요" : "초록으로 표시한 쪽이 정답이에요"}
              </p>
              <p className="why" style={{ marginTop: 8 }}>{cse.why}</p>
            </>
          ) : conceptSkipped ? (
            <p className="caption" style={{ marginTop: 10 }}>이 질문은 건너뛰고 글을 이어 읽어요</p>
          ) : (
            <button
              type="button"
              className="text-link read-skip"
              onClick={() => {
                markInteract();
                setConceptSkipped(true);
                logEvent("reading_answer", {
                  caseId: cse.id,
                  lens: cse.lens,
                  skipped: true,
                  correct: null,
                });
              }}
            >
              그냥 계속 읽기
            </button>
          )}
        </ReadingAsk>

        {conceptResolved ? (
          <>
            <div className="card">
              <div className="caption">이렇게 이어져요</div>
              {/* 읽기 사례의 chain은 사례마다 손으로 적은 순서다. 화살표를 쓴다. */}
              <ConceptFlowView
                steps={cse.chain}
                terms={terms}
                onPeek={(label) => openPeek(label, "flow")}
              />
              {cse.nextToCheck?.length ? (
                <>
                  <div className="caption" style={{ marginTop: 14 }}>다음에 볼 것</div>
                  <ul className="point-list">
                    {cse.nextToCheck.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </>
              ) : null}
            </div>
            {chips.length > 0 ? (
              <div>
                <div className="caption">이 글에 나온 용어</div>
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {chips.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={chipClass(id)}
                      onClick={() => openPeek(labelFor(id, terms), "in_article", id)}
                    >
                      {labelFor(id, terms)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              className="btn btn-primary"
              onClick={() => {
                if (resumeKey) clearUiResume(resumeKey);
                logEvent("reading_complete", { caseId: cse.id, kind: "short" });
                nav("/context");
              }}
            >
              읽기 목록으로
            </button>
          </>
        ) : null}
        <TermPeek target={peek} terms={terms} onClose={() => setPeek(null)} />
      </div>
    </>
  );
}
