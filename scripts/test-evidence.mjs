import { readFileSync } from "node:fs";

const checks = [];
const check = (name, pass, detail = "") => checks.push({ 항목: name, 결과: pass ? "통과" : "실패", 비고: detail });

const evidence = readFileSync("src/lib/evidence.ts", "utf8");
const srs = readFileSync("src/lib/srs.ts", "utf8");
const progress = readFileSync("src/lib/progress.ts", "utf8");
const home = readFileSync("src/pages/HomePage.tsx", "utf8");
const report = readFileSync("src/pages/ReportPage.tsx", "utf8");
const weekly = readFileSync("src/lib/weekly.ts", "utf8");
const briefingPage = readFileSync("src/pages/BriefingPage.tsx", "utf8");
const figures = readFileSync("src/content/briefingFigures.ts", "utf8");
const figUi = readFileSync("src/components/ReadingFigures.tsx", "utf8");
const news = readFileSync("src/pages/NewsQuizPage.tsx", "utf8");
const shorts = readFileSync("src/content/readingCases.ts", "utf8");
const briefings = readFileSync("src/content/briefings.ts", "utf8");

check("기록 계산은 evidence 한곳", evidence.includes("export function progressEvidence"));
check("홈이 progressEvidence만 쓴다", home.includes("progressEvidence") && !home.includes("weeklyStats"));
check("상세가 progressEvidence만 쓴다", report.includes("progressEvidence") && !report.includes("weeklyStats("));
check("고유 용어로 센다", evidence.includes("newIds = new Set") && evidence.includes("reviewIds = new Set"));
check("익숙해진 말은 recorded만", evidence.includes("familiarAtRecorded") && evidence.includes("recordedFamiliarDate"));
check("읽기 재등장은 이미 배운 말만", evidence.includes("alreadyLearnedBefore"));
check("헷갈림은 반복 혼동", evidence.includes("lapses >= 2") && evidence.includes("contrast"));
check("grade가 familiarAt을 학습 순간에만 찍는다", srs.includes("next.familiarAtRecorded = true"));
check("backfill이 familiarAt을 소급하지 않는다", !/familiarAt:\s*earned/.test(progress) && progress.includes("familiarAt: card.familiarAt"));
check("주간 통계도 소급하지 않는다", weekly.includes("familiarAtRecorded"));
check("첫 viewport에 큰 0을 안 넣는다", report.includes("viewportLine") && !report.includes("progress-stats"));
check("날짜 상세는 입구만", report.includes("새로 본 말") && report.includes("복습") && !report.includes("일기"));
check("익숙 0은 섹션을 숨긴다", report.includes("e.recentFamiliar.length") && home.includes("아직 익히는 중이에요"));
check("시각화 정답 후 reveal", briefingPage.includes("revealAfterAnswer") && figures.includes("revealAfterAnswer: true"));
check("예시 수치 고지", figUi.includes("이해를 돕기 위해 구성한 예시 수치입니다"));
check("짧은 읽기 체인은 정답 뒤", news.includes("insight-visual") && news.indexOf("insight-visual") > news.indexOf("cse.why"));
check("파일럿 짧은 읽기 12편", (shorts.match(/PILOT_SHORT_IDS[\s\S]*?\] as const/) || [""])[0].split("cx-").length - 1 === 12);

const briefingChunks = briefings.split(/\n  \{\n    id: "/).slice(1).filter((c) => c.startsWith("bf-"));
const termOver = briefingChunks.filter((c) => (c.match(/depth: "term"/g) || []).length > 1).map((c) => c.split('"', 1)[0]);
check("기사 정의 문항 편당 1개 이하", termOver.length === 0, termOver.join(", "));
const noContext = briefingChunks.filter((c) => {
  const term = (c.match(/depth: "term"/g) || []).length;
  const ctx = (c.match(/type: "cloze"/g) || []).length + (c.match(/depth: "(?:number|cause|next)"/g) || []).length;
  return ctx < 1 && term >= 0;
}).map((c) => c.split('"', 1)[0]);
check("기사에 맥락 문항이 있다", noContext.length === 0, noContext.join(", "));
check("기간·누적 익숙 라벨이 갈린다", report.includes("이번 주 새로 익숙해진 말") && report.includes("지금 익숙한 말"));

function recordedFamiliarDate(card) {
  if (!card.familiarAtRecorded || !card.familiarAt) return null;
  return card.familiarAt;
}
function isNewThisPeriod(card, period) {
  const first = card.successDates[0];
  return Boolean(first && period.includes(first));
}
function isReviewThisPeriod(card, period) {
  const first = card.successDates[0];
  if (!first || period.includes(first)) return false;
  return card.successDates.some((d) => period.includes(d));
}
function alreadyLearnedBefore(card, onDate) {
  const first = card?.successDates[0];
  return Boolean(first && first < onDate);
}
function uniqueReviewCount(cards, period) {
  const ids = new Set();
  for (const card of cards) {
    if (isReviewThisPeriod(card, period)) ids.add(card.termId);
  }
  return ids.size;
}
function completedReadings(attempts) {
  return attempts.filter((a) => a.completedAt).map((a) => a.briefingId);
}

const week = ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"];
const legacyFamiliar = {
  termId: "듀레이션",
  successDates: ["2026-08-01", "2026-08-20"],
  familiarAt: "2026-09-14",
};
check(
  "기존 익숙한 말은 이번 주 새로 익숙해진 말에 안 들어간다",
  recordedFamiliarDate(legacyFamiliar) === null,
);
check(
  "학습 순간에 찍힌 익숙해진 날만 이번 주에 넣는다",
  recordedFamiliarDate({ ...legacyFamiliar, familiarAtRecorded: true }) === "2026-09-14",
);

const reviewedThrice = {
  termId: "신용스프레드",
  successDates: ["2026-08-10", "2026-09-14", "2026-09-14", "2026-09-14"],
};
check(
  "같은 말을 하루 세 번 봐도 다시 본 말은 1이다",
  uniqueReviewCount([reviewedThrice, reviewedThrice, reviewedThrice], week) === 1 &&
    isReviewThisPeriod(reviewedThrice, week) &&
    !isNewThisPeriod(reviewedThrice, week),
);

const incomplete = { briefingId: "bf-cpi-rates", startedAt: "2026-09-14T08:00:00.000Z" };
const complete = { ...incomplete, completedAt: "2026-09-14T08:12:00.000Z" };
const learned = { successDates: ["2026-09-01"] };
check(
  "읽기를 시작만 하고 중단하면 완료·재등장에 안 넣는다",
  completedReadings([incomplete]).length === 0 &&
    completedReadings([incomplete, complete]).length === 1 &&
    alreadyLearnedBefore(learned, "2026-09-14") &&
    !alreadyLearnedBefore(learned, "2026-09-01") &&
    !alreadyLearnedBefore(undefined, "2026-09-14"),
);
check("evidence.ts가 같은 완료 가드를 쓴다", evidence.includes("if (!attempt.completedAt) continue"));
check("evidence.ts가 familiarAtRecorded 없이 소급하지 않는다", evidence.includes("if (!card.familiarAtRecorded || !card.familiarAt) return null"));

console.table(checks);
const failed = checks.filter((c) => c.결과 === "실패");
if (failed.length) {
  console.error(`\n실패 ${failed.length}건`);
  process.exit(1);
}
console.log(`\n${checks.length}건 통과.`);
