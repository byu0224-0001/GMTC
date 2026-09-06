import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { CORE100, TAXONOMY_LABEL } from "../content/literacy";
import { resetProgress, stats } from "../lib/progress";
import { exportStudyDump } from "../lib/events";
import { displayTitle } from "../lib/hangul";
import { analyticsOptedOut, resetLearner, setAnalyticsOptOut } from "../lib/learner";
import { unsubscribePush } from "../lib/push";
import { GRADUATE_REPETITIONS, isDue } from "../lib/srs";
import { planCounts } from "../lib/today";
import { fallbackPlan } from "../lib/todayPlan";
import type { ProgressState, Term } from "../types";
import { useState } from "react";

export function ReportPage({ terms, progress }: { terms: Term[]; progress: ProgressState }) {
  const [p, setP] = useState(progress);
  const [optOut, setOptOut] = useState(() => analyticsOptedOut());
  const coreIds = CORE100.map((c) => c.id);
  const s = stats(p, coreIds);
  const plan = planCounts(terms, p, fallbackPlan());
  const weak = terms
    .filter((t) => t.priority === "core" && p.cards[t.id]?.lastQuality === 1)
    .slice(0, 8);
  const due = terms.filter((t) => t.priority === "core" && p.cards[t.id] && isDue(p.cards[t.id])).length;
  const byTax = new Map<string, { seen: number; total: number }>();
  for (const t of terms.filter((x) => x.priority === "core")) {
    const k = t.taxonomy ?? "기타";
    const cur = byTax.get(k) ?? { seen: 0, total: 0 };
    cur.total += 1;
    if (p.cards[t.id]) cur.seen += 1;
    byTax.set(k, cur);
  }
  const weakField = [...byTax.entries()]
    .map(([k, v]) => ({ k, pct: v.total ? v.seen / v.total : 0 }))
    .sort((a, b) => a.pct - b.pct)[0];

  return (
    <>
      <TopBar title="학습 기록" back />
      <div className="page stack">
        <div className="report-hero">
          <div className="label">핵심 용어</div>
          <div className="display">{s.seen} / {s.coreTotal}</div>
          <div className="muted">학습한 용어 {s.seen}개 · 익숙해진 용어 {s.known}개</div>
        </div>
        <div className="stats-3">
          <div className="stat-box">
            <strong>{s.streakDays}</strong>
            <span>연속 학습</span>
          </div>
          <div className="stat-box">
            <strong>{s.known}</strong>
            <span>익숙해진 용어</span>
          </div>
          <div className="stat-box">
            <strong>{s.contextSeen >= 5 ? `${s.contextAcc}%` : s.contextSeen}</strong>
            <span>읽기</span>
          </div>
        </div>
        <div className="card">
          <div className="caption">익숙해진 기준</div>
          <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
            서로 다른 날에 {GRADUATE_REPETITIONS}번 맞히고, 묻는 방식도 두 가지 이상 통과한
            용어를 익숙해진 것으로 세요.
          </p>
          <div className="term-row" style={{ cursor: "default" }}>
            <strong>일반 기준</strong>
            <span>{plan.familiarFull}개</span>
          </div>
          <div className="term-row" style={{ cursor: "default" }}>
            <strong>면제 기준</strong>
            <span>{plan.familiarFallback}개</span>
          </div>
          <p className="caption" style={{ marginTop: 10, marginBottom: 0 }}>
            면제 기준은 묻는 방식을 하나만 만들 수 있는 용어에만 적용해요. 전체 후보{" "}
            {plan.candidateTotal}개 중 {plan.fallbackEligible}개가 해당해요.
          </p>
        </div>
        {weakField ? (
          <div className="card">
            <div className="caption">아직 많이 보지 않은 분야</div>
            <div style={{ marginTop: 6 }}>{TAXONOMY_LABEL[weakField.k as keyof typeof TAXONOMY_LABEL] ?? weakField.k} · {Math.round(weakField.pct * 100)}%</div>
            <div className="muted" style={{ marginTop: 4 }}>오늘 복습 {due}개</div>
          </div>
        ) : null}
        {weak.length > 0 ? (
          <div>
            <div className="caption">다시 볼 용어</div>
            {weak.map((t) => (
              <Link key={t.id} to={`/terms/${encodeURIComponent(t.id)}`} className="term-row">
                <strong>{displayTitle(t)}</strong>
                <span>{t.easyExplanation}</span>
              </Link>
            ))}
          </div>
        ) : null}
        <Link className="btn btn-primary" to="/learn/session" style={{ display: "grid", placeItems: "center" }}>
          이어서 학습하기
        </Link>
        <button
          className="btn btn-ghost"
          onClick={() => {
            const blob = new Blob([exportStudyDump(p)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "voca-study-log.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          학습 기록 내보내기
        </button>
        <button
          className="btn btn-ghost"
          onClick={async () => {
            if (!confirm("이 기기의 학습 기록을 모두 지울까요? 서버에 보관된 기록도 함께 지워요."))
              return;
            await unsubscribePush(p);
            await resetLearner();
            setAnalyticsOptOut(false);
            setP(resetProgress());
          }}
        >
          기록 지우기
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            const next = !optOut;
            setAnalyticsOptOut(next);
            setOptOut(next);
          }}
        >
          {optOut ? "파일럿 기록 보내기 켜기" : "파일럿 기록 보내지 않기"}
        </button>
        <p className="notice">
          학습 진도는 이 기기에만 저장돼요. 파일럿 기간에는 어떤 문제에서 얼마나 걸렸는지 같은
          익명 기록만 서버로 보내요. 용어별 진도는 보내지 않아요.
        </p>
      </div>
    </>
  );
}
