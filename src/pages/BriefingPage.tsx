import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConceptFlowView } from "../components/Chrome";
import { ReadingAsk, askKindFromDepth } from "../components/ReadingAsk";
import { TermPeek, type PeekQuery } from "../components/TermPeek";
import { resolveTermPreview } from "../lib/termPreview";
import { briefingById } from "../content/briefings";
import { READING_DISCLAIMER, READING_EXAMPLE_LABEL, READING_KIND_LONG } from "../content/brand";
import { mapForBriefing } from "../content/learningMaps";
import { logEvent } from "../lib/events";
import { chipClass } from "../lib/chipTone";
import { labelFor } from "../lib/lookup";
import { loadProgress, recordBriefingAttempt, saveProgress } from "../lib/progress";
import { clearUiResume, loadUiResume, saveUiResume } from "../lib/sessionUi";
import type { BriefingAttempt, BriefingBlock, LearningBriefing, Term } from "../types";

function isCompactQuestion(block: BriefingBlock): boolean {
  if (block.type === "cloze") return true;
  return block.type === "choice" && block.depth === "term";
}

function isQuestion(block: BriefingBlock): boolean {
  return block.type === "cloze" || block.type === "choice";
}

/** 문맥 복원·해석·다음 변수. 용어 고르기는 글에 다른 문항이 있으면 선택. */
function isPrimaryQuestion(block: BriefingBlock, blocks: BriefingBlock[]): boolean {
  if (block.type === "cloze") return true;
  if (block.type !== "choice") return false;
  if (block.depth !== "term") return true;
  return !blocks.some(
    (b) => b.type === "cloze" || (b.type === "choice" && b.depth !== "term"),
  );
}

function resolved(
  index: number,
  picked: Record<number, string>,
  skipped: number[],
): boolean {
  return Boolean(picked[index]) || skipped.includes(index);
}

/**
 * 필수 문항은 답하거나 건너뛰면 다음 본문이 열린다.
 * 정답일 필요는 없다. 선택 문항은 글을 막지 않는다.
 */
function blockVisible(
  blocks: BriefingBlock[],
  index: number,
  picked: Record<number, string>,
  skipped: number[],
): boolean {
  const block = blocks[index];
  const firstGate = blocks.findIndex(
    (b, i) => isQuestion(b) && isPrimaryQuestion(b, blocks) && !resolved(i, picked, skipped),
  );
  if (block.type === "concepts") return firstGate < 0;
  if (firstGate < 0) return true;
  return index <= firstGate;
}

type BriefingResume = {
  picked: Record<number, string>;
  skipped: number[];
};

function loadBriefingResume(key: string): BriefingResume {
  const raw = loadUiResume<unknown>(key);
  if (!raw || typeof raw !== "object") return { picked: {}, skipped: [] };
  const obj = raw as { picked?: Record<number, string>; skipped?: number[] };
  if (obj.picked && typeof obj.picked === "object") {
    return { picked: obj.picked, skipped: Array.isArray(obj.skipped) ? obj.skipped : [] };
  }
  return { picked: raw as Record<number, string>, skipped: [] };
}

export function BriefingReader({
  briefing,
  terms,
  onFinish,
  onPause,
  finishLabel = "읽기 마치기",
}: {
  briefing: LearningBriefing;
  terms: Term[];
  onFinish: () => void;
  onPause?: () => void;
  finishLabel?: string;
}) {
  const startedAt = useRef(new Date().toISOString()).current;
  const lastActionAt = useRef(Date.now());
  const resumeKey = `briefing:${briefing.id}`;
  const boot = loadBriefingResume(resumeKey);
  const [picked, setPicked] = useState<Record<number, string>>(boot.picked);
  const [skipped, setSkipped] = useState<number[]>(boot.skipped);
  const [optionalOpen, setOptionalOpen] = useState<Record<number, boolean>>({});
  const [peek, setPeek] = useState<PeekQuery | null>(null);
  const interactive = useMemo(
    () => briefing.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.type === "cloze" || x.b.type === "choice"),
    [briefing],
  );
  const primaries = interactive.filter((x) => isPrimaryQuestion(x.b, briefing.blocks));
  const answered = interactive.filter((x) => picked[x.i]).length;
  const allDone =
    primaries.length === 0 || primaries.every((x) => resolved(x.i, picked, skipped));
  const relatedMap = mapForBriefing(briefing.id);

  function openPeek(label: string, context: PeekQuery["context"] = "in_article", id?: string) {
    const q: PeekQuery = {
      label,
      id,
      fromId: briefing.primaryTermIds[0],
      context,
      articleId: briefing.id,
    };
    if (resolveTermPreview(q, terms)) setPeek(q);
  }

  useEffect(() => {
    logEvent("briefing_start", { briefingId: briefing.id });
    logEvent("reading_start", { briefingId: briefing.id, kind: "article" });
  }, [briefing.id]);

  useEffect(() => {
    saveUiResume(resumeKey, { picked, skipped });
  }, [resumeKey, picked, skipped]);

  useEffect(() => {
    if (answered === 0 && skipped.length === 0) return;
    const asks = document.querySelectorAll(".read-ask");
    asks[asks.length - 1]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [answered, skipped.length]);

  const interacted = useRef(
    Object.keys(boot.picked).length > 0 || boot.skipped.length > 0,
  );

  function markInteract() {
    if (interacted.current) return;
    interacted.current = true;
    logEvent("first_interaction", { briefingId: briefing.id, kind: "article" });
  }

  function skipBlock(i: number) {
    if (resolved(i, picked, skipped)) return;
    markInteract();
    setSkipped((s) => (s.includes(i) ? s : [...s, i]));
    lastActionAt.current = Date.now();
    logEvent("briefing_question_answer", {
      briefingId: briefing.id,
      index: i,
      skipped: true,
      correct: null,
    });
  }

  function gradeBlock(i: number, id: string) {
    if (picked[i]) return;
    const block = briefing.blocks[i];
    const answerId = block.type === "cloze" || block.type === "choice" ? block.answerId : "";
    const ok = id === answerId;
    markInteract();
    setSkipped((s) => s.filter((x) => x !== i));
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
    const results = interactive
      .filter((x) => picked[x.i])
      .map((x) => {
        const answerId = x.b.type === "cloze" || x.b.type === "choice" ? x.b.answerId : "";
        return {
          index: x.i,
          depth: x.b.type === "choice" ? x.b.depth : x.b.type === "cloze" ? "term" : undefined,
          correct: picked[x.i] === answerId,
        };
      });
    const attempt: BriefingAttempt = {
      briefingId: briefing.id,
      startedAt,
      completedAt: completed ? new Date().toISOString() : undefined,
      questionsAnswered: results.length,
      correctAnswers: results.filter((r) => r.correct).length,
      results,
    };
    saveProgress(recordBriefingAttempt(loadProgress(), attempt));
    if (completed) {
      clearUiResume(resumeKey);
      logEvent("briefing_complete", { briefingId: briefing.id });
      logEvent("reading_complete", { briefingId: briefing.id, kind: "article" });
    }
  }

  function finish() {
    persistAttempt(allDone);
    if (!allDone) {
      logEvent("reading_exit", {
        briefingId: briefing.id,
        questionsAnswered: answered,
        completed: false,
      });
    }
    if (allDone) onFinish();
    else (onPause ?? onFinish)();
  }

  return (
    <div className="page stack briefing editorial">
      <div>
        <div className="eyebrow">{READING_KIND_LONG}</div>
        <span className="caption">
          {READING_EXAMPLE_LABEL} · {briefing.kicker}
          {briefing.asOf ? ` · ${briefing.asOf}` : ""}
          {` · ${briefing.minutes}분`}
        </span>
      </div>
      <h2 className="read-headline">{briefing.headline}</h2>
      {briefing.subtitle ? <p className="muted" style={{ margin: 0 }}>{briefing.subtitle}</p> : null}
      {briefing.sourceMode === "synthetic" ? (
        <p className="caption" style={{ margin: 0 }}>{READING_DISCLAIMER}</p>
      ) : null}

      {briefing.blocks.map((block, i) => {
        if (!blockVisible(briefing.blocks, i, picked, skipped)) return null;
        const primary = isQuestion(block) && isPrimaryQuestion(block, briefing.blocks);
        const pIndex = primaries.findIndex((x) => x.i === i);
        return (
          <BriefingBlockView
            key={i}
            block={block}
            terms={terms}
            picked={picked[i] ?? null}
            skipped={skipped.includes(i)}
            optional={isQuestion(block) && !primary}
            optionalOpen={Boolean(optionalOpen[i])}
            onOpenOptional={() => setOptionalOpen((o) => ({ ...o, [i]: true }))}
            onPick={(id) => gradeBlock(i, id)}
            onSkip={() => skipBlock(i)}
            onPeek={(label, id) =>
              openPeek(label, block.type === "causal" ? "flow" : "in_article", id)
            }
            askStep={pIndex >= 0 ? pIndex + 1 : 1}
            askTotal={pIndex >= 0 ? primaries.length : 1}
            followIds={
              block.type === "choice" && block.depth === "next" && picked[i]
                ? briefing.supportTermIds
                : undefined
            }
          />
        );
      })}

      {allDone && relatedMap ? (
        <Link
          to={`/learn/map/${relatedMap.id}`}
          className="btn btn-ghost"
          style={{ display: "grid", placeItems: "center" }}
        >
          개념 흐름 보기
        </Link>
      ) : null}

      <button className={allDone ? "btn btn-primary" : "btn btn-ghost"} onClick={finish}>
        {allDone ? finishLabel : "나중에 이어 읽기"}
      </button>
      <TermPeek target={peek} terms={terms} onClose={() => setPeek(null)} />
    </div>
  );
}

function ConceptChips({
  ids,
  terms,
  onPeek,
}: {
  ids: string[];
  terms: Term[];
  onPeek: (label: string, id?: string) => void;
}) {
  return (
    <div>
      <div className="caption">이 글에 나온 용어</div>
      <div className="chip-row" style={{ marginTop: 8 }}>
        {ids.map((id) => {
          const label = labelFor(id, terms);
          return (
            <button
              key={id}
              type="button"
              className={chipClass(id)}
              onClick={() => onPeek(label, id)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BriefingBlockView({
  block,
  terms,
  picked = null,
  skipped = false,
  optional = false,
  optionalOpen = false,
  onOpenOptional,
  onPick = () => undefined,
  onSkip,
  onPeek,
  askStep = 0,
  askTotal = 0,
  followIds,
}: {
  block: BriefingBlock;
  terms: Term[];
  picked?: string | null;
  skipped?: boolean;
  optional?: boolean;
  optionalOpen?: boolean;
  onOpenOptional?: () => void;
  onPick?: (id: string) => void;
  onSkip?: () => void;
  onPeek: (label: string, id?: string) => void;
  askStep?: number;
  askTotal?: number;
  followIds?: string[];
}) {
  const [revive, setRevive] = useState(false);
  if (block.type === "p") {
    return <p className="briefing-p">{block.text}</p>;
  }
  if (block.type === "causal") {
    return (
      <div className="card insight">
        <div className="caption">{block.title}</div>
        <ConceptFlowView steps={block.chain} terms={terms} onPeek={onPeek} />
        {block.extra ? <p className="muted" style={{ margin: "10px 0 0" }}>{block.extra}</p> : null}
      </div>
    );
  }
  if (block.type === "concepts") {
    return <ConceptChips ids={block.ids} terms={terms} onPeek={onPeek} />;
  }

  if (optional && !optionalOpen && !picked && !skipped) {
    return (
      <button type="button" className="text-link read-skip" onClick={onOpenOptional}>
        한 번 더 생각해보기
      </button>
    );
  }

  if (skipped && !picked && !revive) {
    return (
      <div className="read-skipped">
        <span className="caption">이 질문은 건너뛰고 글을 이어 읽어요</span>
        <button type="button" className="text-link" onClick={() => setRevive(true)}>
          답해보기
        </button>
      </div>
    );
  }

  const answerId = block.answerId;
  const choices =
    block.type === "cloze"
      ? block.choices ??
        (block.choiceIds ?? []).map((id) => ({ id, label: labelFor(id, terms) }))
      : block.choices;
  const compact = isCompactQuestion(block);
  const answerLabel =
    block.type === "choice"
      ? (block.choices.find((c) => c.id === answerId)?.label ?? labelFor(answerId, terms))
      : (choices.find((c) => c.id === answerId)?.label ?? labelFor(answerId, terms));
  const kind = askKindFromDepth(block.type === "choice" ? block.depth : "cloze");

  const body = (
    <>
      {block.type === "cloze" ? (
        <p className="briefing-p" style={{ margin: 0, color: "var(--color-ink)" }}>
          {block.before}
          <span className={picked ? "blank filled" : "blank"}>{picked ? answerLabel : "□□"}</span>
          {block.after}
        </p>
      ) : (
        <p className="briefing-q">{block.question}</p>
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
        <>
          <p
            className={picked === answerId ? "verdict ok" : "verdict no"}
            role="status"
            style={{ marginTop: 14 }}
          >
            {picked === answerId
              ? "맞았어요"
              : block.type === "cloze"
                ? `정답은 ‘${answerLabel}’이에요`
                : "초록으로 표시한 쪽이 정답이에요"}
          </p>
          <p className="why" style={{ marginTop: 8 }}>{block.note}</p>
          {followIds?.length ? (
            <div className="read-next-vars">
              <div className="caption">다음에 볼 것</div>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {followIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={chipClass(id)}
                    onClick={() => onPeek(labelFor(id, terms), id)}
                  >
                    {labelFor(id, terms)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <button type="button" className="text-link read-skip" onClick={onSkip}>
          그냥 계속 읽기
        </button>
      )}
    </>
  );

  return (
    <ReadingAsk kind={kind} step={askStep} total={askTotal}>
      {body}
    </ReadingAsk>
  );
}

export function BriefingPage({ terms }: { terms: Term[] }) {
  const { briefingId } = useParams();
  const nav = useNavigate();
  const briefing = briefingId ? briefingById(briefingId) : undefined;

  if (!briefing) {
    return (
      <div className="page">
        <p>글을 찾지 못했어요.</p>
        <button className="btn btn-primary" onClick={() => nav("/context")}>읽기 목록으로</button>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <button
          className="icon-btn"
          onClick={() => {
            logEvent("reading_exit", { briefingId: briefing.id, completed: false });
            nav("/context");
          }}
          aria-label="닫기"
        >
          ✕
        </button>
        <h1>읽기</h1>
        <span />
      </header>
      <BriefingReader
        briefing={briefing}
        terms={terms}
        onFinish={() => nav("/context")}
        onPause={() => nav("/context")}
        finishLabel="읽기 마치기"
      />
    </>
  );
}
