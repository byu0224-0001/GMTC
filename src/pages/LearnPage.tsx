import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Chain, ConceptFlowView, ProgressBar } from "../components/Chrome";
import { PushPrompt, shouldAskPush } from "../components/PushPrompt";
import { TAXONOMY_LABEL, type Taxonomy } from "../content/literacy";
import { alsoCalled } from "../content/alsoCalled";
import { CONCEPT_FLOWS } from "../content/conceptFlows";
import { mapForBriefing } from "../content/learningMaps";
import { beginTodaySession, endTodaySession, logEvent } from "../lib/events";
import { displayTitle } from "../lib/hangul";
import { flushEvents, syncDailyStatus } from "../lib/learner";
import { topicOf } from "../lib/pool";
import {
  applyGrade,
  loadProgress,
  markDefaultDone,
  markExtraSession,
  saveProgress,
} from "../lib/progress";
import { differenceNote, makeDrill, makeFirstRecall, withJosa } from "../lib/quiz";
import { dueLabel, daysUntil, practice } from "../lib/srs";
import { briefingForPlan, fallbackPlan, lockTodayLesson, type TodayPlanFile } from "../lib/todayPlan";
import {
  extraQueue,
  lessonPool,
  todayQueue,
  type SessionSource,
  type SessionStep,
} from "../lib/today";
import type { GradeLabel, Term } from "../types";

export function LearnPage({
  terms,
  todayPlan,
  source = "home_default",
}: {
  terms: Term[];
  todayPlan?: TodayPlanFile;
  source?: SessionSource;
}) {
  const nav = useNavigate();
  const [plan] = useState(() =>
    lockTodayLesson(todayPlan ?? fallbackPlan(), loadProgress().seenContextIds),
  );

  const queue = useMemo<SessionStep[]>(
    () =>
      source === "extra"
        ? extraQueue(terms, loadProgress())
        : todayQueue(terms, loadProgress(), plan),
    [terms, source, plan],
  );

  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [lastDue, setLastDue] = useState<string | null>(null);
  const [askPush, setAskPush] = useState(false);
  const askedAt = useRef(Date.now());
  const viewedNew = useRef(new Set<string>());
  const gradedKeys = useRef(new Set<string>());
  const closed = useRef(false);

  useEffect(() => {
    beginTodaySession({
      briefingId: plan.briefingId,
      contentVersion: plan.contentVersion,
      source,
    });
  }, [plan.briefingId, plan.contentVersion, source]);

  /** 세션을 끝까지 본 것만 완료로 센다. 중간에 닫으면 홈은 여전히 미완료다. */
  useEffect(() => {
    if (!done || closed.current) return;
    closed.current = true;
    const state = loadProgress();
    const next = source === "extra" ? markExtraSession(state) : markDefaultDone(state);
    saveProgress(next);
    endTodaySession();
    setAskPush(shouldAskPush(next.doneSessions, Boolean(next.pushAskedAt)));
    // 서버 전송은 학습을 막지 않는다. 실패하면 다음 세션에서 다시 보낸다.
    void flushEvents();
    void syncDailyStatus(next);
  }, [done, source]);

  const step = queue[i];
  useEffect(() => {
    askedAt.current = Date.now();
  }, [i, step?.kind]);
  const pool = useMemo(() => lessonPool(terms), [terms]);
  const drill = useMemo(() => {
    if (!step || step.kind === "new") return null;
    const source2 = pool.length ? pool : terms;
    if (step.kind === "first_recall") return makeFirstRecall(step.term, source2, i + 17);
    return makeDrill(step.term, source2, loadProgress().cards[step.term.id], i + 17);
  }, [step, pool, terms, i]);

  const summary = {
    neu: queue.filter((s) => s.kind === "new").length,
    review: queue.filter((s) => s.kind === "recall" || s.kind === "practice").length,
  };

  if (done || !step) {
    const reading = briefingForPlan(plan, loadProgress().seenContextIds);
    const map = mapForBriefing(reading.id);
    const emptyExtra = source === "extra" && queue.length === 0;
    return (
      <div className="page session">
        <div className="empty">
          <div className="display">
            {emptyExtra ? "지금은 더 볼 것이 없어요" : "오늘 할 건 다 했어요"}
          </div>
          {emptyExtra ? (
            <p className="muted" style={{ marginTop: 12 }}>
              복습할 용어는 날짜가 되면 다시 나와요. 지금은 읽기에서 문맥을 보는 편이 나아요.
            </p>
          ) : (
            /*
              0을 적지 않는다. 추가 세션은 복습만 하므로 신규는 늘 0인데,
              `새로 익힌 용어 0개`는 3일을 지킨 사람에게 성과가 없다고 말한다.
            */
            <p className="muted" style={{ marginTop: 12 }}>
              {[
                summary.neu ? `새로 익힌 용어 ${summary.neu}개` : null,
                summary.review ? `다시 본 용어 ${summary.review}개` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {askPush ? (
            <div style={{ marginTop: 20, textAlign: "left" }}>
              <PushPrompt onClose={() => setAskPush(false)} />
            </div>
          ) : null}
          {/*
            방금 세션을 끝낸 사람에게 가장 밝은 버튼으로 `5분 더`를 권하지 않는다.
            더 풀라는 뜻이 되고, 완료 문구와 어긋난다. 오늘 읽을 글을 먼저 권한다.
            읽기는 분량을 더 쌓는 게 아니라 배운 말을 문맥에서 보는 쪽이다.
          */}
          <Link
            className="btn btn-primary"
            to={`/briefing/${reading.id}`}
            style={{ display: "grid", placeItems: "center", marginTop: 20, textDecoration: "none" }}
          >
            읽기 보러 가기
          </Link>
          <Link
            className="btn btn-ghost"
            to="/learn/extra"
            style={{ display: "grid", placeItems: "center", marginTop: 8, textDecoration: "none" }}
          >
            5분 더 익히기
          </Link>
          {map ? (
            <Link
              className="btn btn-ghost"
              to={`/learn/map/${map.id}`}
              style={{ display: "grid", placeItems: "center", marginTop: 8, textDecoration: "none" }}
            >
              개념 흐름 보기
            </Link>
          ) : null}
          <button className="btn btn-soft" onClick={() => nav("/")} style={{ marginTop: 8 }}>
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const sessionTitle = source === "extra" ? "5분 더" : "오늘 학습";
  /** 관계를 확인해 둔 흐름만 화살표로 보여 준다. 나머지는 칩으로만 둔다. */
  const flow = CONCEPT_FLOWS[step.term.id];
  const wrongPickNote =
    picked && drill && picked !== drill.answerId
      ? (() => {
          const pickedId = drill.choices.find((c) => c.id === picked)?.termId;
          const pickedTerm = pickedId ? terms.find((t) => t.id === pickedId) : undefined;
          return pickedTerm ? differenceNote(pickedTerm, step.term) : null;
        })()
      : null;
  const label =
    step.kind === "new"
      ? "새 용어"
      : step.kind === "first_recall"
        ? "방금 본 용어"
        : step.kind === "practice"
          ? "다시 보기"
          : "복습";
  const topic = topicOf(terms, step.term.id) ?? step.term.taxonomy;
  const taxLabel = topic ? TAXONOMY_LABEL[topic as Taxonomy] ?? topic : null;
  /** 자체 원고가 있는 용어와, 한국은행 원문만 있는 용어를 다르게 보여 준다. */
  const hasOwnCopy = Boolean(step.term.oneLiner || step.term.easyExplanation);

  function goNext() {
    setPicked(null);
    setLastDue(null);
    if (i + 1 >= queue.length) setDone(true);
    else setI(i + 1);
  }

  const prevNewIndex = (() => {
    for (let j = i - 1; j >= 0; j--) {
      if (queue[j].kind === "new") return j;
    }
    return -1;
  })();

  function goPrevNew() {
    if (prevNewIndex < 0) return;
    setPicked(null);
    setLastDue(null);
    setI(prevNewIndex);
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => nav("/")} aria-label="닫기">✕</button>
        {/*
          제목의 기준을 세션 중간에 바꾸지 않는다. 예전에는 3번 문제에서
          `방금 본 용어 3/8`, 5번에서 `복습 5/8`로 바뀌었다. 사용자는 세션 하나를
          진행하는 중인데 진행률의 기준이 달라진 것처럼 읽힌다.
          한 세션 = 한 기준으로 두고, 이 문항이 무엇인지는 카드 안에서 밝힌다.
        */}
        <h1>{sessionTitle} · {i + 1}/{queue.length}</h1>
        <span />
      </header>
      <div style={{ padding: "0 20px 8px" }}>
        {/*
          제목과 막대의 기준을 맞춘다. 예전에는 `6/6`인데 막대가 83%였다.
          i는 0부터라 완료 개수였는데 제목은 지금 몇 번째인지를 셌기 때문이다.
        */}
        <ProgressBar value={i + 1} total={queue.length} />
      </div>
      <div className="page session stack">
        {step.kind === "new" ? (
          <>
            <div className="card pad-lg">
              <div className="caption">{taxLabel ?? step.term.category}</div>
              <div className="term-title" style={{ marginTop: 12 }}>{displayTitle(step.term)}</div>
              {step.term.enName ? <div className="muted">{step.term.enName}</div> : null}
              {/*
                기사에서 부르는 이름이 표제어와 다른 용어가 있다. 처음 만나는
                이 화면에서만 한 번 이어 준다. 문제와 해설은 표제어로 통일한다.
              */}
              {alsoCalled(step.term.id).length ? (
                <div className="caption" style={{ marginTop: 8, letterSpacing: 0 }}>
                  기사에서는 {alsoCalled(step.term.id).join(" · ")}라고도 해요
                </div>
              ) : null}
              {hasOwnCopy ? (
                <>
                  {step.term.oneLiner ? (
                    <p style={{ marginTop: 16, fontWeight: 500, lineHeight: 1.65 }}>{step.term.oneLiner}</p>
                  ) : null}
                  {step.term.easyExplanation ? (
                    <p style={{ marginTop: 12 }}>{step.term.easyExplanation}</p>
                  ) : null}
                  {step.term.whyItMatters ? (
                    <p className="why"><strong>알아두면 좋은 이유</strong> {step.term.whyItMatters}</p>
                  ) : null}
                  {flow ? (
                    <>
                      <div className="caption">이렇게 이어서 볼 수 있어요</div>
                      <ConceptFlowView steps={flow.steps} note={flow.note} terms={terms} />
                    </>
                  ) : step.term.chain.length > 0 ? (
                    <>
                      <div className="caption">같이 보면 좋은 개념</div>
                      <Chain items={step.term.chain} terms={terms} />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="caption" style={{ marginTop: 16 }}>한국은행 설명</div>
                  <p style={{ marginTop: 8, lineHeight: 1.7 }}>{step.term.definition}</p>
                </>
              )}
            </div>
            <div className="grade-bar two">
              <button className="btn btn-ghost" disabled={prevNewIndex < 0} onClick={goPrevNew}>
                이전
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!viewedNew.current.has(step.term.id)) {
                    viewedNew.current.add(step.term.id);
                    logEvent("new_term_viewed", { termId: step.term.id, questionForm: "new" });
                  }
                  goNext();
                }}
              >
                다음
              </button>
            </div>
          </>
        ) : null}

        {step.kind !== "new" && drill ? (
          <>
            <div className="card pad-lg">
              <div className="caption">{drill.caption || taxLabel || label}</div>
              <p style={{ margin: "12px 0 0", lineHeight: 1.65, whiteSpace: "pre-line" }}>{drill.prompt}</p>
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
                      if (gradedKeys.current.has(key)) return;
                      gradedKeys.current.add(key);
                      const before = loadProgress();
                      const exposureIndex =
                        (before.cards[step.term.id]?.repetitions ?? 0) +
                        (before.cards[step.term.id] ? 1 : 0);
                      if (step.kind === "practice") {
                        const card = before.cards[step.term.id];
                        if (card) {
                          saveProgress({
                            ...before,
                            cards: {
                              ...before.cards,
                              [step.term.id]: practice(card, ok, new Date(), drill.kind),
                            },
                          });
                        }
                      } else {
                        const g: GradeLabel = ok ? "good" : "again";
                        const next = applyGrade(before, step.term.id, g, new Date(), drill.kind);
                        saveProgress(next);
                        setLastDue(next.cards[step.term.id].dueAt);
                      }
                      logEvent(
                        step.kind === "first_recall" ? "first_recall_answer" : "review_answer",
                        {
                          termId: step.term.id,
                          correct: ok,
                          questionForm: drill.kind,
                          stepKind: step.kind,
                          exposureIndex,
                          responseTimeMs: Date.now() - askedAt.current,
                        },
                      );
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {picked ? (
              <>
                {/*
                  맞았는지 틀렸는지를 초록·빨강 테두리로만 알리지 않는다. 색을 구분하기
                  어려운 사람도 있고, 색만으로는 `그래서 정답이 뭐였지`가 남는다.
                  글로 한 번 적어 준다.
                */}
                <p
                  className={picked === drill.answerId ? "verdict ok" : "verdict no"}
                  role="status"
                >
                  {picked === drill.answerId
                    ? "맞았어요"
                    : `정답은 ${withJosa(displayTitle(step.term), "이에요")}`}
                </p>
                {/*
                  틀렸을 때는 정답 설명보다 내가 고른 것과의 차이가 먼저다.
                  두 개념을 맞바꿔 알고 있는 상태를 그대로 두면 다음에 또 바꿔 고른다.
                */}
                {wrongPickNote ? <p className="why">{wrongPickNote}</p> : null}
                <p className="why">
                  <strong>
                    {displayTitle(step.term)}
                    {alsoCalled(step.term.id)[0] ? `(${alsoCalled(step.term.id)[0]})` : ""}
                  </strong>{" "}
                  {drill.note}
                </p>
                {/*
                  추가 세션의 `다시 보기`에는 다음 복습 날짜를 적지 않는다. 일정이
                  바뀌지 않았으므로 적을 날짜가 없다. 예전에는 그걸 문장으로 설명했지만,
                  사용자는 복습 일정이 앞당겨지는지를 애초에 궁금해하지 않는다.
                  내부 동작을 설명하려고 화면에 줄을 하나 더 두지 않는다.
                */}
                {lastDue ? <div className="caption">{dueLabel(daysUntil(lastDue))}</div> : null}
                {/*
                  정답 뒤에는 해설 하나와 관계 하나만 남긴다. 새 용어 화면에서는
                  화살표를 어떻게 읽는지 note가 필요하지만, 여기서는 바로 위 해설이
                  이미 해석을 했다. note를 또 붙이면 같은 말을 세 번 읽게 된다.
                */}
                {flow ? (
                  <>
                    <div className="caption">같이 보면</div>
                    <ConceptFlowView steps={flow.steps} terms={terms} />
                  </>
                ) : step.term.chain.length > 0 ? (
                  <>
                    <div className="caption">같이 보면</div>
                    <Chain items={step.term.chain} terms={terms} />
                  </>
                ) : null}
                <button className="btn btn-primary" onClick={goNext}>다음</button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
