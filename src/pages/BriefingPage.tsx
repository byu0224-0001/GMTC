import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConceptFlowView } from "../components/Chrome";
import { briefingById } from "../content/briefings";
import { mapForBriefing } from "../content/learningMaps";
import { REPORT_BOK_CANON, canonBokId } from "../content/reportLexicon";
import { logEvent } from "../lib/events";
import { labelFor } from "../lib/lookup";
import { withJosa } from "../lib/quiz";
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
  const [picked, setPicked] = useState<Record<number, string>>({});
  const interactive = useMemo(
    () => briefing.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.type === "cloze" || x.b.type === "choice"),
    [briefing],
  );
  const answered = interactive.filter((x) => picked[x.i]).length;
  const allDone = interactive.length === 0 || answered === interactive.length;
  const relatedMap = mapForBriefing(briefing.id);

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
      {/*
        `학습용 브리핑` 배지를 뺐다. 상단 제목이 이미 브리핑이라 종류를 두 번 적는
        셈이었고, 정작 필요한 고지는 없었다. 종류보다 사용자 목적을 앞에 두고,
        지어낸 글이라는 사실은 본문에 들어가기 전에 한 줄로 밝힌다.
      */}
      <div>
        <span className="caption">
          {briefing.kicker}
          {briefing.asOf ? ` · ${briefing.asOf}` : ""}
          {` · ${briefing.minutes}분`}
        </span>
      </div>
      <h2 className="term-title" style={{ margin: "4px 0 8px", fontSize: 24, lineHeight: 1.35 }}>
        {briefing.headline}
      </h2>
      {briefing.subtitle ? <p className="muted" style={{ margin: 0 }}>{briefing.subtitle}</p> : null}
      {briefing.sourceMode === "synthetic" ? (
        <p className="notice" style={{ margin: 0 }}>
          실제 기사가 아니라 학습을 위해 재구성한 예시예요.
        </p>
      ) : null}

      {briefing.blocks.map((block, i) => (
        <BriefingBlockView
          key={i}
          block={block}
          terms={terms}
          picked={picked[i] ?? null}
          onPick={(id) => gradeBlock(i, id)}
        />
      ))}

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
    </div>
  );
}

function BriefingBlockView({
  block,
  terms,
  picked,
  onPick,
}: {
  block: BriefingBlock;
  terms: Term[];
  picked: string | null;
  onPick: (id: string) => void;
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
        <ConceptFlowView steps={block.chain} terms={terms} />
        {block.extra ? <p className="muted" style={{ margin: "10px 0 0" }}>{block.extra}</p> : null}
      </div>
    );
  }
  if (block.type === "concepts") {
    /*
      예전에는 여기서 위 인과 사슬을 한 번 더 그렸다. `한 번에 연결하면`과
      `이렇게 연결됩니다`가 같은 4개를 두 번 보여 주는 화면이 됐다. 둘이 멀리
      떨어져 있을 때의 리마인더로 넣었지만, 실제로는 한 화면 안에 들어온다.
      사슬은 본문이 그 순서를 설명한 자리에 한 번만 둔다.
    */
    return (
      <div>
        <div className="caption">이 글에서 나온 개념</div>
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
                ? `정답은 ${withJosa(answerLabel, "이에요")}`
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
        <p>브리핑을 찾지 못했어요.</p>
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
        <h1>브리핑</h1>
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
