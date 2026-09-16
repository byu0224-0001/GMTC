import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { TabBar } from "./components/Chrome";
import { ScrollReset } from "./components/ScrollReset";
import { loadTerms } from "./lib/data";
import { fallbackPlan, loadExtraBriefings, loadTodayPlan, resolveDisplayPlan, type TodayPlanFile } from "./lib/todayPlan";
import { loadProgress, storageWritable } from "./lib/progress";
import { syncQaMode } from "./lib/qaMode";
import type { Term } from "./types";
import { HomePage } from "./pages/HomePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { CurriculumPage } from "./pages/CurriculumPage";
import { LearnMapPage } from "./pages/LearnMapPage";
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

  useEffect(() => {
    syncQaMode(loc.search);
    setTick((n) => n + 1);
  }, [loc.search]);

  const session =
    loc.pathname.startsWith("/learn/session") ||
    loc.pathname.startsWith("/learn/extra") ||
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
        <div className="page empty">불러오는 중이에요</div>
      </div>
    );
  }

  const progress = loadProgress();
  void tick;
  const displayPlan = resolveDisplayPlan(todayPlan);

  /**
   * 저장이 막힌 환경(사파리 프라이빗 모드 등)에서는 온보딩 완료도 남지 않는다.
   * 그대로 두면 시작하기를 눌러도 같은 화면이 반복된다. 그럴 때는 건너뛴다.
   */
  if (!progress.onboardedAt && storageWritable()) {
    return (
      <div className="app">
        <OnboardingPage onDone={() => setTick((n) => n + 1)} />
      </div>
    );
  }

  return (
    <div className="app">
      <ScrollReset />
      <Routes>
        <Route path="/" element={<HomePage terms={terms} progress={progress} todayPlan={displayPlan} />} />
        <Route path="/learn" element={<CurriculumPage terms={terms} progress={progress} todayPlan={displayPlan} />} />
        <Route path="/learn/map/:mapId" element={<LearnMapPage terms={terms} progress={progress} />} />
        <Route path="/learn/core" element={<CoreListPage terms={terms} progress={progress} />} />
        <Route path="/learn/report" element={<ReportHubPage progress={progress} />} />
        {/*
          같은 LearnPage를 두 경로에 쓰면 React가 인스턴스를 재사용한다.
          오늘 세션을 마친 뒤 `/learn/extra`로 가도 `done`이 그대로라
          `5분 더`가 눌리지 않은 것처럼 보인다. 키로 강제로 다시 연다.
        */}
        <Route path="/learn/session" element={<LearnPage key="session" terms={terms} todayPlan={displayPlan} />} />
        <Route
          path="/learn/extra"
          element={<LearnPage key="extra" terms={terms} todayPlan={displayPlan} source="extra" />}
        />
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
      {session ? null : <TabBar />}
    </div>
  );
}
