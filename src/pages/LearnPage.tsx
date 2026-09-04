import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chain, ProgressBar } from "../components/Chrome";
import { TAXONOMY_LABEL, type Taxonomy } from "../content/literacy";
import { beginTodaySession, endTodaySession, logEvent } from "../lib/events";
import { displayTitle } from "../lib/hangul";
import { applyGrade, loadProgress, saveProgress } from "../lib/progress";
import { makeDrill, makeFirstRecall } from "../lib/quiz";
import { dueLabel, daysUntil } from "../lib/srs";
import { fallbackPlan, lockTodayLesson, type TodayPlanFile } from "../lib/todayPlan";
import { lessonPool, todayQueue, type SessionStep } from "../lib/today";
import { BriefingReader } from "./BriefingPage";
import type { GradeLabel, Term } from "../types";

const DRILL_LABEL = {
  recall: "개념 확인",
  cloze: "문장 속 용어",
  contrast: "개념 구분",
} as const;

export function LearnPage({ terms, todayPlan }: { terms: Term[]; todayPlan?: TodayPlanFile }) {
  const nav = useNavigate();
  const [plan] = useState(() =>
    lockTodayLesson(todayPlan ?? fallbackPlan(), loadProgress().seenContextIds),
  );

  const queue = useMemo<SessionStep[]>(() => todayQueue(terms, loadProgress(), plan), [terms, plan]);

  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [lastDue, setLastDue] = useState<string | null>(null);
  const askedAt = useRef(Date.now());
  const viewedNew = useRef(new Set<string>());
  const gradedKeys = useRef(new Set<string>());

  useEffect(() => {
    beginTodaySession({ briefingId: plan.briefingId, contentVersion: plan.contentVersion });
  }, [plan.briefingId, plan.contentVersion]);

  useEffect(() => {
    if (done) endTodaySession();
  }, [done]);

  const step = queue[i];
  useEffect(() => {
    askedAt.current = Date.now();
  }, [i, step?.kind]);
  const pool = useMemo(() => lessonPool(terms), [terms]);
  const drill = useMemo(() => {
    if (!step || (step.kind !== "recall" && step.kind !== "first_recall")) return null;
    const card = loadProgress().cards[step.term.id];
    if (step.kind === "first_recall") return makeFirstRecall(step.term, pool.length ? pool : terms, i + 17);
    return makeDrill(step.term, pool.length ? pool : terms, card, i + 17);
  }, [step, pool, terms, i]);

  const summary = {
    neu: queue.filter((s) => s.kind === "new").length,
    review: queue.filter((s) => s.kind === "recall").length,
    practice: queue.filter((s) => s.kind === "briefing").length,
  };

  if (done || !step) {
    return (
      <div className="page session">
        <div className="empty">
          <div className="display">오늘의 학습을 마쳤습니다</div>
          <p className="muted" style={{ marginTop: 12 }}>
            새로 학습한 용어 {summary.neu}개
          </p>
          <p className="muted">브리핑 {summary.practice}편</p>
          <button className="btn btn-primary" onClick={() => nav("/")}>확인</button>
          <button className="btn btn-ghost" onClick={() => nav("/learn")} style={{ marginTop: 8 }}>학습 목록으로</button>
        </div>
      </div>
    );
  }

  const label =
    step.kind === "new" ? "새 용어" : step.kind === "first_recall" ? "방금 학습한 용어" : step.kind === "recall" ? "복습" : "브리핑";

  function goNext() {
    setPicked(null);
    setLastDue(null);
    if (i + 1 >= queue.length) setDone(true);
    else setI(i + 1);
  }

  function goPrevNew() {
    for (let j = i - 1; j >= 0; j--) {
      if (queue[j].kind === "new") {
        setPicked(null);
        setLastDue(null);
        setI(j);
        return;
      }
    }
  }

  const prevNewIndex = (() => {
    for (let j = i - 1; j >= 0; j--) {
      if (queue[j].kind === "new") return j;
    }
    return -1;
  })();

  function gradeTerm(term: Term, g: GradeLabel) {
    const next = applyGrade(loadProgress(), term.id, g);
    saveProgress(next);
    setLastDue(next.cards[term.id].dueAt);
  }

  const taxLabel =
    step.kind !== "briefing" && step.term.taxonomy
      ? TAXONOMY_LABEL[step.term.taxonomy as Taxonomy] ?? step.term.taxonomy
      : null;

  if (step.kind === "briefing") {
    return (
      <>
        <header className="topbar">
          <button className="icon-btn" onClick={() => nav("/")} aria-label="닫기">✕</button>
          <h1>{label} {i + 1}/{queue.length}</h1>
          <span />
        </header>
        <div style={{ padding: "0 20px 8px" }}>
          <ProgressBar value={i} total={queue.length} />
        </div>
        <BriefingReader
          briefing={step.briefing}
          terms={terms}
          finishLabel={i + 1 >= queue.length ? "학습 마치기" : "다음"}
          onFinish={goNext}
        />
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => nav("/")} aria-label="닫기">✕</button>
        <h1>{label} {i + 1}/{queue.length}</h1>
        <span />
      </header>
      <div style={{ padding: "0 20px 8px" }}>
        <ProgressBar value={i} total={queue.length} />
      </div>
      <div className="page session stack">
        {step.kind === "new" ? (
          <>
            <div className="card pad-lg">
              <div className="caption">{taxLabel ?? step.term.category}</div>
              <div className="term-title" style={{ marginTop: 12 }}>{displayTitle(step.term)}</div>
              {step.term.enName ? <div className="muted">{step.term.enName}</div> : null}
              {step.term.oneLiner ? (
                <p style={{ marginTop: 16, fontWeight: 500, lineHeight: 1.65 }}>{step.term.oneLiner}</p>
              ) : null}
              <p style={{ marginTop: 12 }}>{step.term.easyExplanation}</p>
              <p className="why"><strong>투자할 때</strong> {step.term.whyItMatters}</p>
              <div className="caption">함께 보면</div>
              <Chain items={step.term.chain} terms={terms} />
            </div>
            <div className="grade-bar two">
              <button
                className="btn btn-ghost"
                disabled={prevNewIndex < 0}
                onClick={goPrevNew}
              >
                이전
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!viewedNew.current.has(step.term.id)) {
                    viewedNew.current.add(step.term.id);
                    logEvent("new_term_viewed", { termId: step.term.id, questionType: "new" });
                  }
                  goNext();
                }}
              >
                다음
              </button>
            </div>
          </>
        ) : null}

        {(step.kind === "recall" || step.kind === "first_recall") && drill ? (
          <>
            <div className="card pad-lg">
              <div className="caption">
                {step.kind === "first_recall" ? "방금 학습한 용어" : `${taxLabel ? `${taxLabel} · ` : ""}${DRILL_LABEL[drill.kind]}`}
              </div>
              <p style={{ margin: "12px 0 0", lineHeight: 1.65 }}>{drill.prompt}</p>
            </div>
            <div className="stack-8">
              {drill.choices.map((c) => {
                let cls = "choice";
                if (picked) {
                  if (c.id === drill.answerId) cls += " correct";
                  else if (c.id === picked) cls += " wrong";
                  else cls += " dim";
                }
                return (
                  <button
                    key={c.id}
                    className={cls}
                    disabled={!!picked}
                    onClick={() => {
                      setPicked(c.id);
                      const ok = c.id === drill.answerId;
                      const key = `${step.kind}:${step.term.id}`;
                      if (!gradedKeys.current.has(key)) {
                        gradedKeys.current.add(key);
                        gradeTerm(step.term, ok ? "good" : "again");
                        logEvent(step.kind === "first_recall" ? "first_recall_answer" : "review_answer", {
                          termId: step.term.id,
                          correct: ok,
                          questionType: step.kind,
                          responseTimeMs: Date.now() - askedAt.current,
                        });
                      }
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {picked ? (
              <>
                <p className="why">
                  <strong>{displayTitle(step.term)}</strong>
                  {drill.note}
                  {lastDue ? ` · ${dueLabel(daysUntil(lastDue))}` : null}
                </p>
                <div className="caption">함께 보면</div>
                <Chain items={step.term.chain} terms={terms} />
                <button className="btn btn-primary" onClick={goNext}>다음</button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
