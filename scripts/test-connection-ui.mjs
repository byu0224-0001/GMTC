/**
 * Connection Engine·알림 시트 배선이 빠지지 않았는지 확인한다.
 * 브라우저 클릭을 대체하지는 못하지만, preview=false로 되돌아가거나
 * CTA가 다시 `시작하기`가 되는 회귀는 여기서 잡는다.
 */
import { readFileSync } from "node:fs";

const checks = [];
const check = (name, pass, detail = "") => checks.push({ 항목: name, 결과: pass ? "통과" : "실패", 비고: detail });

const learn = readFileSync("src/pages/LearnPage.tsx", "utf8");
const learnCard = readFileSync("src/components/TermLearnCard.tsx", "utf8");
check("학습 세션 같이 보면은 preview", learnCard.includes("<RelatedConcepts term={term} terms={terms} preview"));
check("정답 후 같이 보면도 preview", /RelatedConcepts term=\{step\.term\} terms=\{terms\} note=\{false\} preview/.test(learn));
check("세션 위치 임시 저장", learn.includes("saveUiResume"));

const peekSrc = readFileSync("src/lib/termPreview.ts", "utf8");
check("단일 preview resolver", peekSrc.includes("export function resolveTermPreview"));
check("리포트 표시명 키", peekSrc.includes("`${headword} (${abbr})`"));
check("요약 없으면 null", peekSrc.includes("if (!summary) return null"));

const compact = (s) => s.normalize("NFKC").toLowerCase().replace(/[\s·ㆍ()]/g, "");
const yoyKeys = ["전년 동기 대비", "rpt-yoy", "YoY", "yoy", "전년동기대비", "전년 동기 대비 (YoY)"];
check(
  "YoY 칩 라벨이 리포트에 매칭",
  yoyKeys.some((k) => compact(k) === compact("전년 동기 대비 (YoY)")),
);
const ytdKeys = ["연초 이후 누적", "rpt-ytd", "YTD", "ytd", "연초이후누적", "연초 이후 누적 (YTD)"];
check(
  "YTD 칩 라벨이 리포트에 매칭",
  ytdKeys.some((k) => compact(k) === compact("연초 이후 누적 (YTD)")),
);

const peekUi = readFileSync("src/components/TermPeek.tsx", "utf8");
check("빈 시트 금지", peekUi.includes("if (!target || !preview) return null"));
check("자세히 보기는 secondary", peekUi.includes("자세히 보기 〉") && peekUi.includes("text-link"));
check("자세히 보기 전에 peek history를 비운다", peekUi.includes("history.back()") && peekUi.includes("navigate(route)"));
check("큰 닫기 버튼 없음", !/>닫기</.test(peekUi));
check("preview가 SRS를 안 바꿈", !peekUi.includes("applyGrade"));
check("Android 뒤로가기는 시트를 닫음", peekUi.includes("popstate") && peekUi.includes("history.pushState"));
check("시트 열면 배경 스크롤 잠금", peekUi.includes("sheet-open"));

const briefingPage = readFileSync("src/pages/BriefingPage.tsx", "utf8");
check("기사형은 블록 순서대로 연다", briefingPage.includes("blockVisible") && briefingPage.includes("ReadingAsk"));
check("안 푼 문항은 건너뛸 수 있다", briefingPage.includes("그냥 계속 읽기") && briefingPage.includes("skipBlock"));
check("정답이 아니라 응답이 다음 본문을 연다", briefingPage.includes("isPrimaryQuestion") && briefingPage.includes("skipped"));
check("읽기 시작·첫 판단을 남긴다", briefingPage.includes("reading_start") && briefingPage.includes("first_interaction"));
check("읽기 이탈을 남긴다", briefingPage.includes("reading_exit"));
check("긴 읽기 상세에 예시 고지", briefingPage.includes("학습용 기사") && briefingPage.includes("READING_DISCLAIMER"));

const news = readFileSync("src/pages/NewsQuizPage.tsx", "utf8");
check("짧은 읽기 PeekQuery", news.includes("PeekQuery") && !news.includes("PeekTarget"));
check("짧은 읽기도 같은 질문 문법", news.includes("ReadingAsk") && news.includes("askKindFromDepth"));
check("짧은 읽기도 그냥 계속 읽기", news.includes("그냥 계속 읽기"));
const newsClose = news.match(/className="icon-btn"[\s\S]*?aria-label="닫기"/)?.[0] ?? "";
check("짧은 읽기 닫기는 위치를 남긴다", newsClose.length > 0 && !newsClose.includes("clearUiResume"));
check("짧은 읽기 완료만 resume를 지운다", news.includes("clearUiResume") && news.includes("reading_complete"));

const detail = readFileSync("src/pages/TermDetailPage.tsx", "utf8");
check("사전 상세 같이 보면은 이동", /<RelatedConcepts term=\{term\} terms=\{terms\} \/>/.test(detail) && !/<RelatedConcepts term=\{term\} terms=\{terms\} preview/.test(detail));
check("관련 읽기 CTA는 읽어보기", detail.includes("읽어보기") && !detail.includes("시작하기"));
check("대형 사전으로 CTA 없음", !detail.includes(">사전으로<"));
check("문항 전환 시 deep dive 리셋", /DeepDive key=\{`\$\{i\}-\$\{step\.term\.id\}`\}/.test(learn));
check("신규 카드는 학습 템플릿", learn.includes("TermLearnCard") && !learn.includes("한국은행 설명"));
check("정답 후 제목만 금지", learn.includes("AnswerFeedback"));
check("첫 카드는 한 줄 + 같이 보면", learnCard.includes("조금 더 알아보기") && learnCard.includes("RelatedConcepts") && !learnCard.includes("왜 알아두면 좋을까요?") && !learnCard.includes("헷갈리기 쉬워요"));
check("검수 화면은 학습·사전·필드를 나눈다", detail.includes("① 오늘 학습 카드") && detail.includes("② 사전 상세") && detail.includes("③ 검수 필드"));
check("이미 시작한 draft는 복습 유지", readFileSync("src/lib/today.ts", "utf8").includes("function reviewPool"));
const quiz = readFileSync("src/lib/quiz.ts", "utf8");
check("기사처럼 읽기 절단 금지", !quiz.includes("function shorten") && !quiz.includes("slice(0, 170)"));
check("기사처럼 읽기는 별도 발췌", quiz.includes("LEARN_STEMS"));
check("오늘 큐 learningReady 가드", readFileSync("src/lib/today.ts", "utf8").includes("isLearningReady") && readFileSync("src/lib/today.ts", "utf8").includes("isDraftReady"));
check("검수 전 원고는 qa 플래그", readFileSync("src/lib/qaMode.ts", "utf8").includes("qa=drafts"));

const feed = readFileSync("src/pages/NewsFeedPage.tsx", "utf8");
check("읽기 목록 상단 예시 고지", feed.includes("학습을 위해 재구성한 예시"));

const scroll = readFileSync("src/components/ScrollReset.tsx", "utf8");
check("라우트 전환 스크롤 리셋", scroll.includes("scrollTo") && scroll.includes("POP"));

const dive = readFileSync("src/components/DeepDive.tsx", "utf8");
check("deep dive는 callout", dive.includes("callout-toggle") && dive.includes("aria-expanded"));

const reportSrc = readFileSync("src/content/reportLexicon.ts", "utf8");
const reportBlocks = [...reportSrc.matchAll(/id: "(rpt-[^"]+)"\s*,\s*headword: "([^"]+)",\s*abbr: ([^\n]+),\s*aliases: \[([^\]]*)\],\s*easyExplanation: "((?:[^"\\]|\\.)*)"/g)];
check("리포트 용어에 설명이 있다", reportBlocks.length >= 20 && reportBlocks.every((m) => m[5].trim()));
const yoy = reportBlocks.find((m) => m[1] === "rpt-yoy");
const ytd = reportBlocks.find((m) => m[1] === "rpt-ytd");
const nameKeys = (head, extra) => {
  const keys = [head, ...extra.filter(Boolean)];
  const abbr = extra.find((x) => x && /^[A-Za-z%p]+$/i.test(String(x).trim()));
  if (head && abbr) keys.push(`${head} (${abbr})`);
  return keys;
};
const keysMatch = (query, keys) => {
  const n = compact(query);
  return keys.some((k) => compact(k) === n);
};
function resolveReportId(query) {
  for (const m of reportBlocks) {
    const abbr = (m[3].match(/"([^"]+)"/) || [])[1];
    const aliases = [...m[4].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    if (keysMatch(query, nameKeys(m[2], [m[1], abbr, ...aliases]))) return m[1];
  }
  return null;
}
const yoyAliases = ["전년 동기 대비", "YoY", "전년 동기 대비 (YoY)"];
const ytdAliases = ["연초 이후 누적", "YTD", "연초 이후 누적 (YTD)"];
check(
  "YoY 별칭이 모두 rpt-yoy",
  yoyAliases.every((q) => resolveReportId(q) === "rpt-yoy"),
);
check(
  "YTD 별칭이 모두 rpt-ytd",
  ytdAliases.every((q) => resolveReportId(q) === "rpt-ytd"),
);
const briefing = readFileSync("src/content/briefings.ts", "utf8");
check("CPI 빈칸 정답은 늦어질", /id: "bf-cpi-rates"[\s\S]*?answerId: "late"[\s\S]*?id: "bf-earnings-down"/.test(briefing));
check("고용 빈칸 정답은 빨라질", /id: "bf-jobs"[\s\S]*?answerId: "early"/.test(briefing));
check("기사형이 15편 이상", (briefing.match(/\n    id: "bf-/g) || []).length >= 15);

const todayPlan = readFileSync("src/lib/todayPlan.ts", "utf8");
const readingSelect = readFileSync("src/lib/readingSelect.ts", "utf8");
check("오늘 읽기 selector가 한곳", todayPlan.includes("selectDailyReading") && readingSelect.includes("export function selectDailyReading"));
check("편집 선택이 아니면 오늘 글을 강제하지 않는다", todayPlan.includes("editorial") && readingSelect.includes("plan.editorial"));
check("홈이 읽기 탭과 같은 selector", readFileSync("src/pages/HomePage.tsx", "utf8").includes("selectDailyReading") && readFileSync("src/pages/NewsFeedPage.tsx", "utf8").includes("selectDailyReading"));
check("읽기를 마치면 다른 글을 권한다", readFileSync("src/pages/HomePage.tsx", "utf8").includes("다른 글 한 편 더 보기"));
check("홈 주간 기록이 상세로 간다", readFileSync("src/pages/HomePage.tsx", "utf8").includes('to="/report"') && readFileSync("src/pages/HomePage.tsx", "utf8").includes("개 새로 만남"));
check("기록 화면에 월간 달력", readFileSync("src/pages/ReportPage.tsx", "utf8").includes("month-cal") && readFileSync("src/pages/ReportPage.tsx", "utf8").includes("헷갈리는 개념"));
check("기사 상단에 학습용 기사", readFileSync("src/pages/BriefingPage.tsx", "utf8").includes("학습용 기사"));
check("읽기 도표는 데이터 블록", readFileSync("src/content/briefingFigures.ts", "utf8").includes("BRIEFING_FIGURES") && readFileSync("src/components/ReadingFigures.tsx", "utf8").includes("MetricCard"));
check("도표가 정답을 미리 안 연다", readFileSync("src/pages/BriefingPage.tsx", "utf8").includes("revealAfterAnswer"));
check("홈·기록이 같은 지표 함수", readFileSync("src/pages/HomePage.tsx", "utf8").includes("progressEvidence") && readFileSync("src/pages/ReportPage.tsx", "utf8").includes("progressEvidence"));
check("추가 세션은 별도 인스턴스", readFileSync("src/App.tsx", "utf8").includes('key="session"') && readFileSync("src/App.tsx", "utf8").includes('key="extra"'));
check("맥락 주석은 본문 안에서 연다", briefingPage.includes("ReadingAsideNote") && readFileSync("src/components/ReadingAside.tsx", "utf8").includes("reading_annotation_open"));
check("맥락 주석은 시트와 다르다", !readFileSync("src/components/ReadingAside.tsx", "utf8").includes("TermPeek"));

const sheet = readFileSync("src/components/PushPrompt.tsx", "utf8");
check("알림 시트에 시험 발송", sheet.includes("requestTestPush") && sheet.includes("PUSH_SETTINGS"));
check("지원 안 될 때도 이유를 보여 준다", sheet.includes('ui === "unsupported"'));

const cron = readFileSync("api/cron-nudge.ts", "utf8");
check("크론이 KST 날짜를 씀", cron.includes("KST_OFFSET_MS") && cron.includes("lastDefaultDoneDate === today"));

console.table(checks);
const failed = checks.filter((c) => c.결과 === "실패");
if (failed.length) {
  console.error(`\n실패 ${failed.length}건`);
  process.exit(1);
}
console.log(`\n${checks.length}건 통과.`);
