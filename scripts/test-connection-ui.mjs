/**
 * Connection Engine·알림 시트 배선이 빠지지 않았는지 확인한다.
 * 브라우저 클릭을 대체하지는 못하지만, preview=false로 되돌아가거나
 * CTA가 다시 `시작하기`가 되는 회귀는 여기서 잡는다.
 */
import { readFileSync } from "node:fs";

const checks = [];
const check = (name, pass, detail = "") => checks.push({ 항목: name, 결과: pass ? "통과" : "실패", 비고: detail });

const learn = readFileSync("src/pages/LearnPage.tsx", "utf8");
check("학습 세션 같이 보면은 preview", /RelatedConcepts term=\{step\.term\} terms=\{terms\} preview/.test(learn));
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
check("긴 읽기 상세에 예시 고지", briefingPage.includes("READING_EXAMPLE_LABEL"));

const news = readFileSync("src/pages/NewsQuizPage.tsx", "utf8");
check("짧은 읽기 PeekQuery", news.includes("PeekQuery") && !news.includes("PeekTarget"));
check("짧은 읽기도 같은 질문 문법", news.includes("ReadingAsk") && news.includes("askKindFromDepth"));
check("짧은 읽기도 그냥 계속 읽기", news.includes("그냥 계속 읽기"));
const newsClose = news.match(/className="icon-btn"[\s\S]*?aria-label="닫기"/)?.[0] ?? "";
check("짧은 읽기 닫기는 위치를 남긴다", newsClose.length > 0 && !newsClose.includes("clearUiResume"));
check("짧은 읽기 완료만 resume를 지운다", news.includes("clearUiResume") && news.includes("reading_complete"));

const detail = readFileSync("src/pages/TermDetailPage.tsx", "utf8");
check("사전 상세 같이 보면은 이동", detail.includes("<RelatedConcepts term={term} terms={terms} />") && !detail.includes("preview"));
check("관련 읽기 CTA는 읽어보기", detail.includes("읽어보기") && !detail.includes("시작하기"));
check("대형 사전으로 CTA 없음", !detail.includes(">사전으로<"));
check("문항 전환 시 deep dive 리셋", /DeepDive key=\{`\$\{i\}-\$\{step\.term\.id\}`\}/.test(learn));

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

const sheet = readFileSync("src/components/PushPrompt.tsx", "utf8");
check("알림 시트에 시험 발송", sheet.includes("requestTestPush") && sheet.includes("PUSH_SETTINGS"));

const cron = readFileSync("api/cron-nudge.ts", "utf8");
check("크론이 KST 날짜를 씀", cron.includes("KST_OFFSET_MS") && cron.includes("lastDefaultDoneDate === today"));

console.table(checks);
const failed = checks.filter((c) => c.결과 === "실패");
if (failed.length) {
  console.error(`\n실패 ${failed.length}건`);
  process.exit(1);
}
console.log(`\n${checks.length}건 통과.`);
