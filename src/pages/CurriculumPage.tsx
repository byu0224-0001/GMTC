import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { LEARNING_MAPS, LEARNING_MAP_GROUPS } from "../content/learningMaps";
import { TAXONOMY_LABEL, type Taxonomy } from "../content/literacy";
import { canonBokId } from "../content/reportLexicon";
import { labelFor } from "../lib/lookup";
import { formsFor } from "../lib/quiz";
import { topicOf } from "../lib/pool";
import { defaultDoneToday } from "../lib/progress";
import { extraQueue, lessonPool, planCounts, studyCandidates } from "../lib/today";
import type { TodayPlanFile } from "../lib/todayPlan";
import { GRADUATE_REPETITIONS } from "../lib/srs";
import type { ProgressState, RetrievalForm, Term } from "../types";

const FORM_LABEL: Record<RetrievalForm, string> = {
  recognition: "뜻 고르기",
  recall: "용어 떠올리기",
  contrast: "비슷한 개념 구분",
  judgment: "맞는 설명인지 판단",
  context: "짧은 상황에 적용",
};

/** 다음 복습에서 어떤 형태로 나올지. lib/quiz.ts의 사다리와 같은 순서다. */
function nextFormLabel(term: Term, pool: Term[], repetitions: number): string {
  const available = formsFor(term, pool);
  const ladder: RetrievalForm[][] = [
    ["recognition"],
    ["recall"],
    ["contrast", "recall"],
    ["judgment", "context", "contrast", "recall"],
  ];
  const step = Math.min(repetitions, ladder.length - 1);
  for (let i = step; i >= 0; i -= 1) {
    const hit = ladder[i].find((f) => available.includes(f));
    if (hit) return FORM_LABEL[hit];
  }
  return FORM_LABEL.recall;
}

export function CurriculumPage({
  terms,
  progress,
  todayPlan,
}: {
  terms: Term[];
  progress: ProgressState;
  todayPlan: TodayPlanFile;
}) {
  const plan = planCounts(terms, progress, todayPlan);
  const pool = lessonPool(terms);
  const candidates = studyCandidates(terms);
  const started = candidates.length - plan.remainingUnseen;
  const done = defaultDoneToday(progress) || plan.total === 0;
  const extra = done ? extraQueue(terms, progress) : [];
  /** 권장 분량 전이면 오늘 큐를, 마친 뒤면 추가 세션에 담길 것을 미리 보여 준다. */
  const upNext = (done
    ? extra.filter((s) => s.kind === "recall" || s.kind === "practice").map((s) => s.term)
    : plan.reviewTerms
  ).slice(0, 5);

  return (
    <>
      <TopBar title="학습" />
      <div className="page stack">
        <div className="card pad-lg">
          <div className="caption">{done ? "조금 더 익혀볼까요?" : "이어서 학습하기"}</div>
          {done ? (
            <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
              {extra.length
                ? "오늘 권장 분량은 마쳤습니다. 여기서부터는 원하는 만큼만 하면 됩니다."
                : "지금은 더 볼 것이 없습니다. 복습은 날짜가 되면 돌아옵니다."}
            </p>
          ) : (
            <p style={{ margin: "8px 0 0", fontWeight: 600, lineHeight: 1.45 }}>
              오늘 {plan.minutes}분 · 새 용어 {plan.neu}개 · 복습 {plan.review}개
            </p>
          )}
          {upNext.length ? (
            <div style={{ marginTop: 14 }}>
              {upNext.map((t) => {
                const reps = progress.cards[t.id]?.repetitions ?? 0;
                const topic = topicOf(terms, t.id) ?? t.taxonomy;
                return (
                  <div key={t.id} className="term-row" style={{ cursor: "default" }}>
                    <strong>{labelFor(t.id, terms)}</strong>
                    <span>
                      {nextFormLabel(t, pool, reps)}
                      {topic ? ` · ${TAXONOMY_LABEL[topic as Taxonomy] ?? topic}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
          {done ? (
            extra.length ? (
              <Link
                to="/learn/extra"
                className="btn btn-primary"
                style={{ display: "grid", placeItems: "center", marginTop: 14, textDecoration: "none" }}
              >
                5분 더 학습하기
              </Link>
            ) : null
          ) : (
            <Link
              to="/learn/session"
              className="btn btn-primary"
              style={{ display: "grid", placeItems: "center", marginTop: 14, textDecoration: "none" }}
            >
              시작하기
            </Link>
          )}
          <p className="caption" style={{ marginTop: 14, marginBottom: 0 }}>
            학습 가능한 용어 {candidates.length}개 중 {started}개 시작 · {plan.graduated}개 익숙해짐
          </p>
        </div>

        <p className="muted" style={{ margin: 0 }}>
          같은 용어를 며칠에 걸쳐 다른 방식으로 다시 만납니다. 서로 다른 날에 {GRADUATE_REPETITIONS}번
          맞히고 방식도 두 가지 이상 통과하면 복습에서 빠집니다.
        </p>

        <section>
          <div className="eyebrow">개념을 연결해서 보기</div>
          <p className="caption" style={{ margin: "0 0 4px" }}>한 묶음에 3~5분입니다.</p>
          {LEARNING_MAP_GROUPS.map((group) => (
            <div key={group}>
              <div className="caption" style={{ marginTop: 14 }}>{group}</div>
              {LEARNING_MAPS.filter((m) => m.group === group).map((m) => {
                const seen = m.steps.filter(
                  (s) => progress.cards[s.termId] || progress.cards[canonBokId(s.termId)],
                ).length;
                return (
                  <Link key={m.id} to={`/learn/map/${m.id}`} className="term-row">
                    <strong>{m.title}</strong>
                    <span>
                      {m.minutes}분{seen ? ` · 본 적 있는 용어 ${seen}개` : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </section>

        <p className="notice">개별 용어를 찾을 때는 사전을 이용하세요.</p>
      </div>
    </>
  );
}
