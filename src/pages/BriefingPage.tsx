import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Chain } from "../components/Chrome";
import { briefingById } from "../content/briefings";
import { REPORT_BOK_CANON, canonBokId } from "../content/reportLexicon";
import { logEvent } from "../lib/events";
import { labelFor } from "../lib/lookup";
import { loadProgress, recordBriefingAttempt, saveProgress } from "../lib/progress";
import type { BriefingAttempt, BriefingBlock, LearningBriefing, Term } from "../types";

function conceptHref(id: string): string {
  if (REPORT_BOK_CANON[id] || !id.startsWith("rpt-")) {
    return `/terms/${encodeURIComponent(canonBokId(id))}`;
  }
  return `/lexicon/${id}`;
}

function isCompactQuestion(block: BriefingBlock): boolean {
  if (block.type === "cloze") return true;
  return block.type === "choice" && block.depth === "term";
}

export function BriefingReader({
  briefing,
  terms,
  onFinish,
  onPause,
  finishLabel = "연습 목록으로",
}: {
  briefing: LearningBriefing;
  terms: Term[];
  onFinish: () => void;
  onPause?: () => void;
  finishLabel?: string;
}) {
  const startedAt = useRef(new Date().toISOString()).current;
  const lastActionAt = useRef(Date.now());
  const [picked, setPicked] = useState<Record<number, string>>({});
  const interactive = useMemo(
    () => briefing.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.type === "cloze" || x.b.type === "choice"),
    [briefing],
  );
  const answered = interactive.filter((x) => picked[x.i]).length;
  const allDone = interactive.length === 0 || answered === interactive.length;

  useEffect(() => {
    logEvent("briefing_start", { briefingId: briefing.id });
  }, [briefing.id]);

  function gradeBlock(i: number, id: string) {
    if (picked[i]) return;
    const block = briefing.blocks[i];
    const answerId = block.type === "cloze" || block.type === "choice" ? block.answerId : "";
    const ok = id === answerId;
    setPicked((p) => ({ ...p, [i]: id }));
    const depth = block.type === "choice" ? block.depth : block.type === "cloze" ? "term" : undefined;
    const responseTimeMs = Date.now() - lastActionAt.current;
    lastActionAt.current = Date.now();
    logEvent("briefing_question_answer", {
      briefingId: briefing.id,
      index: i,
      correct: ok,
      questionType: depth ?? "cloze",
      termId: answerId,
      responseTimeMs,
      depth: depth ?? null,
    });
  }

  function persistAttempt(completed: boolean) {
    const results = interactive.map((x) => {
      const answerId = x.b.type === "cloze" || x.b.type === "choice" ? x.b.answerId : "";
      return {
        index: x.i,
        depth: x.b.type === "choice" ? x.b.depth : x.b.type === "cloze" ? "term" : undefined,
        correct: picked[x.i] === answerId,
      };
    });
    const answeredN = results.filter((_, idx) => Boolean(picked[interactive[idx].i])).length;
    const attempt: BriefingAttempt = {
      briefingId: briefing.id,
      startedAt,
      completedAt: completed ? new Date().toISOString() : undefined,
      questionsAnswered: answeredN,
      correctAnswers: results.filter((r) => r.correct).length,
      results,
    };
    saveProgress(recordBriefingAttempt(loadProgress(), attempt));
    if (completed) logEvent("briefing_complete", { briefingId: briefing.id });
  }

  function finish() {
    persistAttempt(allDone);
    if (allDone) onFinish();
    else (onPause ?? onFinish)();
  }

  return (
    <div className="page stack briefing">
      <div>
        <span className="pill-badge">학습용 브리핑</span>
        <span className="caption" style={{ marginLeft: 8 }}>
          {briefing.kicker}
          {briefing.asOf ? ` · ${briefing.asOf}` : ""}
          {` · ${briefing.minutes}분`}
        </span>
      </div>
      <h2 className="term-title" style={{ margin: "4px 0 8px", fontSize: 24, lineHeight: 1.35 }}>
        {briefing.headline}
      </h2>
      {briefing.subtitle ? <p className="muted" style={{ margin: 0 }}>{briefing.subtitle}</p> : null}

      {briefing.blocks.map((block, i) => (
        <BriefingBlockView
          key={i}
          block={block}
          terms={terms}
          recapChain={
            block.type === "concepts"
              ? briefing.blocks.find((b): b is Extract<BriefingBlock, { type: "causal" }> => b.type === "causal")?.chain
              : undefined
          }
          picked={picked[i] ?? null}
          onPick={(id) => gradeBlock(i, id)}
        />
      ))}

      <button className="btn btn-primary" onClick={finish}>
        {allDone ? finishLabel : "나중에 이어서 하기"}
      </button>
    </div>
  );
}

function BriefingBlockView({
  block,
  terms,
  recapChain,
  picked,
  onPick,
}: {
  block: BriefingBlock;
  terms: Term[];
  recapChain?: string[];
  picked: string | null;
  onPick: (id: string) => void;
}) {
  if (block.type === "p") {
    return <p className="briefing-p">{block.text}</p>;
  }
  if (block.type === "causal") {
    return (
      <div className="card insight">
        <div className="caption">{block.title}</div>
        <Chain items={block.chain} terms={terms} />
        {block.extra ? <p className="muted" style={{ margin: "10px 0 0" }}>{block.extra}</p> : null}
      </div>
    );
  }
  if (block.type === "concepts") {
    return (
      <div>
        {recapChain && recapChain.length > 0 ? (
          <>
            <div className="caption">오늘의 흐름</div>
            <Chain items={recapChain} terms={terms} />
          </>
        ) : null}
        <div className="caption" style={{ marginTop: recapChain?.length ? 16 : 0 }}>오늘 학습한 개념</div>
        <div className="chip-row" style={{ marginTop: 10 }}>
          {block.ids.map((id) => (
            <Link key={id} to={conceptHref(id)} className="chip">
              {labelFor(id, terms)}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const answerId = block.answerId;
  const choices =
    block.type === "cloze"
      ? block.choiceIds.map((id) => ({ id, label: labelFor(id, terms) }))
      : block.choices;
  const compact = isCompactQuestion(block);
  const answerLabel =
    block.type === "choice" ? (block.choices.find((c) => c.id === answerId)?.label ?? labelFor(answerId, terms)) : labelFor(answerId, terms);

  const body = (
    <>
      {block.type === "cloze" ? (
        <p className="briefing-p" style={{ margin: 0 }}>
          {block.before}
          <span className={picked ? "blank filled" : "blank"}>{picked ? labelFor(answerId, terms) : "□□"}</span>
          {block.after}
        </p>
      ) : (
        <p className={compact ? "briefing-p" : "briefing-q"} style={compact ? { margin: 0, fontWeight: 600 } : undefined}>
          {block.question}
        </p>
      )}
      <div className={compact ? "choice-row" : "stack-8"} style={{ marginTop: 12 }}>
        {choices.map((c) => {
          let cls = compact ? "choice compact" : "choice";
          if (picked) {
            if (c.id === answerId) cls += " correct";
            else if (c.id === picked) cls += " wrong";
            else cls += " dim";
          }
          return (
            <button key={c.id} className={cls} disabled={!!picked} onClick={() => onPick(c.id)}>
              {c.label}
            </button>
          );
        })}
      </div>
      {picked ? (
        <p className="why" style={{ marginTop: 14 }}>
          <strong>{answerLabel}</strong>
          {block.note}
        </p>
      ) : null}
    </>
  );

  if (compact) return <div className="briefing-ask">{body}</div>;
  return <div className="card pad-lg">{body}</div>;
}

export function BriefingPage({ terms }: { terms: Term[] }) {
  const { briefingId } = useParams();
  const nav = useNavigate();
  const briefing = briefingId ? briefingById(briefingId) : undefined;

  if (!briefing) {
    return (
      <div className="page">
        <p>브리핑을 찾지 못했습니다.</p>
        <button className="btn btn-primary" onClick={() => nav("/context")}>연습 목록으로</button>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => nav("/context")} aria-label="닫기">
          ✕
        </button>
        <h1>브리핑</h1>
        <span />
      </header>
      <BriefingReader
        briefing={briefing}
        terms={terms}
        onFinish={() => nav("/context")}
        onPause={() => nav("/context")}
        finishLabel="연습 목록으로"
      />
    </>
  );
}
