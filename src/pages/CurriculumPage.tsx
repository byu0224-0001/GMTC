import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { LearningVisual } from "../components/LearningVisual";
import { LEARNING_MAPS, LEARNING_MAP_GROUPS } from "../content/learningMaps";
import { canonBokId } from "../content/reportLexicon";
import { labelFor } from "../lib/lookup";
import { formFor } from "../lib/quiz";
import { defaultDoneToday } from "../lib/progress";
import { extraQueue, lessonPool, planCounts } from "../lib/today";
import type { TodayPlanFile } from "../lib/todayPlan";
import type { ProgressState, RetrievalForm, SrsCard, Term } from "../types";

const FORM_SHORT: Record<RetrievalForm, string> = {
  recognition: "뜻",
  recall: "떠올리기",
  contrast: "구분",
  judgment: "판단",
  context: "문장",
};

function uniqueTerms(terms: Term[]): Term[] {
  const seen = new Set<string>();
  return terms.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

function formSummary(items: { term: Term; reps: number }[], pool: Term[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = FORM_SHORT[formFor(item.term, pool, { repetitions: item.reps } as SrsCard)];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, n]) => `${name} ${n}`).join(" · ");
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
  const done = defaultDoneToday(progress) || plan.total === 0;
  const extra = done ? extraQueue(terms, progress) : [];
  const preview = uniqueTerms(
    done
      ? extra.filter((s) => s.kind === "recall" || s.kind === "practice").map((s) => s.term)
      : [...plan.newTerms, ...plan.reviewTerms],
  );
  const mix = formSummary(
    extra
      .filter((s) => s.kind === "recall" || s.kind === "practice")
      .map((s) => ({ term: s.term, reps: progress.cards[s.term.id]?.repetitions ?? 0 })),
    pool,
  );

  return (
    <>
      <TopBar title="학습" />
      <div className="page stack">
        <div className="card pad-lg">
          <div className="caption">{done ? "조금 더 익혀볼까요?" : "이어서 학습하기"}</div>
          {done ? (
            extra.length ? (
              <>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  오늘 권장 학습은 마쳤어요. 더 보고 싶을 때만 시작하면 돼요.
                </p>
                <div className="learn-visual" style={{ marginTop: 14 }}>
                  <LearningVisual type="repeat" label="다시 보기" />
                </div>
                {mix ? (
                  <>
                    <div className="caption" style={{ marginTop: 12 }}>이번 5분</div>
                    <p style={{ margin: "6px 0 0", fontWeight: 600 }}>{mix}</p>
                  </>
                ) : null}
              </>
            ) : (
              <p className="muted" style={{ margin: "8px 0 0" }}>
                지금은 더 볼 것이 없어요. 복습할 용어는 날짜가 되면 다시 나와요.
              </p>
            )
          ) : (
            <p style={{ margin: "8px 0 0", fontWeight: 600, lineHeight: 1.45 }}>
              오늘 {Math.round(plan.minutes)}분 · 새 용어 {plan.neu}개 · 복습 {plan.review}개
            </p>
          )}
          {preview.length ? (
            <div className="chip-row" style={{ marginTop: 14 }}>
              {preview.map((t) => (
                <span key={t.id} className="chip">
                  {labelFor(t.id, terms)}
                </span>
              ))}
            </div>
          ) : null}
          {done ? (
            extra.length ? (
              <Link
                to="/learn/extra"
                className="btn btn-primary"
                style={{ display: "grid", placeItems: "center", marginTop: 14, textDecoration: "none" }}
              >
                5분 더 익히기
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
        </div>

        <section>
          <div className="eyebrow">개념 흐름</div>
          <p className="caption" style={{ margin: "0 0 4px" }}>한 묶음에 3~5분이에요.</p>
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
      </div>
    </>
  );
}
