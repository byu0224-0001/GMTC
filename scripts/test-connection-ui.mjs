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

const detail = readFileSync("src/pages/TermDetailPage.tsx", "utf8");
check("사전 상세 같이 보면은 이동", detail.includes("<RelatedConcepts term={term} terms={terms} />") && !detail.includes("preview"));
check("관련 읽기 CTA는 읽어보기", detail.includes("읽어보기") && !detail.includes("시작하기"));

const dive = readFileSync("src/components/DeepDive.tsx", "utf8");
check("deep dive는 callout", dive.includes("callout-toggle") && dive.includes("aria-expanded"));

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
