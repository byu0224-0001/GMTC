import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { TabBar } from "./components/Chrome";
import { CORE100 } from "./content/literacy";
import { loadTerms } from "./lib/data";
import { fallbackPlan, loadExtraBriefings, loadTodayPlan, resolveDisplayPlan, type TodayPlanFile } from "./lib/todayPlan";
import { loadProgress, stats } from "./lib/progress";
import type { Term } from "./types";
import { HomePage } from "./pages/HomePage";
import { CurriculumPage } from "./pages/CurriculumPage";
import { CoreListPage } from "./pages/CoreListPage";
import { ReportHubPage } from "./pages/ReportHubPage";
import { LearnPage } from "./pages/LearnPage";
import { ContextFeedPage } from "./pages/NewsFeedPage";
import { ContextQuizPage } from "./pages/NewsQuizPage";
import { GlossaryPage } from "./pages/GlossaryPage";
import { TermDetailPage } from "./pages/TermDetailPage";
import { ReportPage } from "./pages/ReportPage";
import { LexiconPage } from "./pages/LexiconPage";
import { ThinkPage } from "./pages/ThinkPage";
import { ClaimQuizPage } from "./pages/ClaimQuizPage";
import { BriefingPage } from "./pages/BriefingPage";

export default function App() {
  const loc = useLocation();
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [todayPlan, setTodayPlan] = useState<TodayPlanFile>(fallbackPlan);

  useEffect(() => {
    loadTerms().then(setTerms).catch((e: unknown) => setErr(String(e)));
  }, []);

  useEffect(() => {
    loadExtraBriefings().then(() => loadTodayPlan().then(setTodayPlan));
  }, [loc.pathname]);

  useEffect(() => {
    setTick((n) => n + 1);
  }, [loc.pathname]);

  const session =
    loc.pathname.startsWith("/learn/session") ||
    loc.pathname.startsWith("/briefing/") ||
    /^\/context\/.+/.test(loc.pathname) ||
    loc.pathname.startsWith("/claim/");

  if (err) {
    return (
      <div className="app">
        <div className="page empty">{err}</div>
      </div>
    );
  }
  if (!terms) {
    return (
      <div className="app">
        <div className="page empty">불러오는 중입니다</div>
      </div>
    );
  }

  const progress = loadProgress();
  void tick;
  const s = stats(progress, CORE100.map((c) => c.id));
  const displayPlan = resolveDisplayPlan(todayPlan);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage terms={terms} progress={progress} todayPlan={displayPlan} />} />
        <Route path="/learn" element={<CurriculumPage terms={terms} progress={progress} />} />
        <Route path="/learn/core" element={<CoreListPage terms={terms} progress={progress} />} />
        <Route path="/learn/report" element={<ReportHubPage progress={progress} />} />
        <Route path="/learn/session" element={<LearnPage terms={terms} todayPlan={displayPlan} />} />
        <Route path="/context" element={<ContextFeedPage terms={terms} progress={progress} todayPlan={displayPlan} />} />
        <Route path="/briefing/:briefingId" element={<BriefingPage terms={terms} />} />
        <Route path="/context/:caseId" element={<ContextQuizPage terms={terms} />} />
        <Route path="/news" element={<Navigate to="/context" replace />} />
        <Route path="/news/:termId" element={<Navigate to="/context" replace />} />
        <Route path="/terms" element={<GlossaryPage terms={terms} />} />
        <Route path="/terms/:termId" element={<TermDetailPage terms={terms} />} />
        <Route path="/lexicon/:termId" element={<LexiconPage />} />
        <Route path="/think/:patternId" element={<ThinkPage />} />
        <Route path="/claim/:caseId" element={<ClaimQuizPage />} />
        <Route path="/report" element={<ReportPage terms={terms} progress={progress} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {session ? null : <TabBar learnBadge={Math.min(99, s.due)} />}
    </div>
  );
}
