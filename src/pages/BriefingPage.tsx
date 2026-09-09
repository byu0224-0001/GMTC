import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConceptFlowView } from "../components/Chrome";
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

const QUESTION_LABEL: Record<string, string> = {
  term: "내용 확인",
  number: "내용 확인",
  cause: "한 번 더 생각해보기",
  next: "다음으로 확인할 것",
  cloze: "내용 확인",
};

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
  const [picked, setPicked] = useState<Record<number, string>>(
    () => loadUiResume<Record<number, string>>(resumeKey) ?? {},
  );
  const [peek, setPeek] = useState<PeekQuery | null>(null);
  const interactive = useMemo(
    () => briefing.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.type === "cloze" || x.b.type === "choice"),
    [briefing],
  );
  const answered = interactive.filter((x) => picked[x.i]).length;
  const allDone = interactive.length === 0 || answered === interactive.length;
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
  }, [briefing.id]);

  useEffect(() => {
    saveUiResume(resumeKey, picked);
  }, [resumeKey, picked]);

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
    if (completed) {
      clearUiResume(resumeKey);
      logEvent("briefing_complete", { briefingId: briefing.id });
    }
  }

  function finish() {
    persistAttempt(allDone);
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
      <h2 className="term-title" style={{ margin: "8px 0 8px", fontSize: 24, lineHeight: 1.35 }}>
        {briefing.headline}
      </h2>
      {briefing.subtitle ? <p className="muted" style={{ margin: 0 }}>{briefing.subtitle}</p> : null}
      <hr className="editorial-rule" />

      {briefing.blocks.map((block, i) =>
        block.type === "p" || block.type === "cloze" ? (
          <BriefingBlockView
            key={i}
            block={block}
            terms={terms}
            picked={picked[i] ?? null}
            onPick={(id) => gradeBlock(i, id)}
            onPeek={(label) => openPeek(label, "in_article")}
          />
        ) : null,
      )}

      {briefing.blocks.map((block, i) =>
        block.type === "causal" ? (
          <BriefingBlockView
            key={i}
            block={{ ...block, title: "핵심 문장" }}
            terms={terms}
            onPeek={(label) => openPeek(label, "flow")}
          />
        ) : null,
      )}

      {briefing.sourceMode === "synthetic" ? (
        <p className="caption" style={{ margin: 0 }}>{READING_DISCLAIMER}</p>
      ) : null}

      <hr className="editorial-rule" />

      {briefing.blocks.map((block, i) => {
        if (block.type !== "choice") return null;
        const label = QUESTION_LABEL[block.depth] ?? "내용 확인";
        return (
          <div key={i}>
            <div className="caption">{label}</div>
            <BriefingBlockView
              block={block}
              terms={terms}
              picked={picked[i] ?? null}
              onPick={(id) => gradeBlock(i, id)}
              onPeek={(label, id) => openPeek(label, "in_article", id)}
            />
          </div>
        );
      })}

      {briefing.blocks.map((block, i) =>
        block.type === "concepts" ? (
          <BriefingBlockView
            key={i}
            block={block}
            terms={terms}
            picked={picked[i] ?? null}
            onPick={(id) => gradeBlock(i, id)}
            onPeek={(label, id) => openPeek(label, "in_article", id)}
          />
        ) : null,
      )}

      {allDone && relatedMap ? (
        <Link
          to={`/learn/map/${relatedMap.id}`}
          className="btn btn-ghost"
          style={{ display: "grid", placeItems: "center" }}
        >
          개념 흐름 보기
        </Link>
      ) : null}

      {/*
        아직 문제를 남긴 상태에서 가장 밝은 버튼이 `나중에 이어서 하기`였다.
        초록 꽉 찬 버튼이 그만두기를 권한 셈이다. 끝냈을 때만 primary로 둔다.
      */}
      <button className={allDone ? "btn btn-primary" : "btn btn-ghost"} onClick={finish}>
        {allDone ? finishLabel : "나중에 이어서 하기"}
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
  onPick = () => undefined,
  onPeek,
}: {
  block: BriefingBlock;
  terms: Term[];
  picked?: string | null;
  onPick?: (id: string) => void;
  onPeek: (label: string, id?: string) => void;
}) {
  if (block.type === "p") {
    return <p className="briefing-p">{block.text}</p>;
  }
  if (block.type === "causal") {
    /*
      이 사슬은 바로 위 문단들이 순서대로 풀어 준 인과다. 손으로 검수해서
      적어 둔 것이므로 화살표를 쓸 자격이 있다. 느슨한 관련 용어에 화살표를
      씌우지 않으려고 `Chain`을 칩으로 바꿨더니 여기까지 같이 강등됐었다.
    */
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

  const body = (
    <>
      {block.type === "cloze" ? (
        <p className="briefing-p" style={{ margin: 0 }}>
          {block.before}
          <span className={picked ? "blank filled" : "blank"}>{picked ? answerLabel : "□□"}</span>
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
        <>
          {/*
            학습 화면에는 `맞았어요`를 글로 적는데 브리핑에는 없었다. 같은 앱에서
            정답을 알리는 방식이 두 개면 색을 구분하기 어려운 사람은 브리핑에서만
            답을 못 읽는다.
          */}
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
          {/*
            정답 라벨을 여기서 굵게 한 번 더 적지 않는다. 바로 위 선택지에 같은
            문장이 초록 테두리로 남아 있어서 같은 말이 두 번 보였다.
          */}
          <p className="why" style={{ marginTop: 8 }}>{block.note}</p>
        </>
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
        <p>글을 찾지 못했어요.</p>
        <button className="btn btn-primary" onClick={() => nav("/context")}>읽기 목록으로</button>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => nav("/context")} aria-label="닫기">
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
