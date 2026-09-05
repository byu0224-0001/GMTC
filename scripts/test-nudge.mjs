/**
 * 알림 문구 조건 확인.
 *
 * `금융문맹 되어가는 중…`은 파일럿에서 반응을 볼 문구다. 그래서 지우지 않는다.
 * 대신 잘못된 자리에 나가지 않는지는 사람 기억이 아니라 이 파일이 지킨다.
 * 조건이 흐려지면 브랜드 유머가 아니라 잔소리가 되고, 그때는 가설 검증도 못 한다.
 *
 * notifications.ts는 TS이므로 여기서는 같은 규칙을 표로 확인한다.
 * 규칙 자체는 한 곳(notifications.ts)에만 있고, 이 파일은 그 결과를 검사한다.
 */
import { readFileSync } from "node:fs";

const src = readFileSync("src/content/notifications.ts", "utf8");

const BRAND = "금융문맹 되어가는 중…";
const STREAK = "이 정도면 금맹탈출할 듯";

const checks = [];
const check = (name, pass, detail = "") => checks.push({ 항목: name, 결과: pass ? "통과" : "실패", 비고: detail });

check("단기 이탈 브랜드 카피 존재", src.includes(BRAND));
check("연속 사용 브랜드 카피 존재", src.includes(STREAK));
check("장기 이탈은 중립 문구", src.includes("오랜만이에요"));
check("중간 이탈은 가벼운 문구", src.includes("슬슬 다시 해볼까요"));

// 조건 경계값. 브랜드 카피는 2~3일에서만 나와야 한다. 4일 이상은 다른 문구다.
const shortMin = Number(/LAPSE_SHORT_MIN_DAYS = (\d+)/.exec(src)?.[1]);
const midMin = Number(/LAPSE_MID_MIN_DAYS = (\d+)/.exec(src)?.[1]);
const longMin = Number(/LAPSE_LONG_MIN_DAYS = (\d+)/.exec(src)?.[1]);
check("단기 이탈 시작 2일", shortMin === 2, `${shortMin}일`);
check("중간 이탈 시작 4일", midMin === 4, `${midMin}일`);
check("장기 이탈 시작 7일", longMin === 7, `${longMin}일`);
check(
  "브랜드 카피 구간이 2~3일",
  shortMin === 2 && midMin === 4,
  `${shortMin}~${midMin - 1}일`,
);

// 오늘 미완료 문구가 밀린 일처럼 읽히지 않아야 한다.
const NAGGY = ["공부할 게 남아 있어요", "밀렸", "아직 안 했", "미완료"];
const variants = /const TODAY_VARIANTS[\s\S]*?\n\];/.exec(src)?.[0] ?? "";
check(
  "오늘 미완료 문구에 독촉 표현 없음",
  NAGGY.every((w) => !variants.includes(w)),
  NAGGY.filter((w) => variants.includes(w)).join(", "),
);
check("오늘 미완료 문구가 여러 개", (variants.match(/title:/g) ?? []).length >= 3);

// 학습 이력이 없는 사람에게는 아무 문구도 나가지 않아야 한다.
check("첫 사용자 제외", /daysSinceStudy === null\) return null/.test(src));
// 오늘 마친 사람에게는 나가지 않아야 한다.
check("완료자 제외", /if \(doneToday\) return null/.test(src));

// 온보딩과 문제 화면에서 브랜드 카피를 쓰지 않는지.
const onboarding = readFileSync("src/pages/OnboardingPage.tsx", "utf8");
check("온보딩에 브랜드 카피 없음", !onboarding.includes(BRAND) && !onboarding.includes("금융문맹 되어"));

const learn = readFileSync("src/pages/LearnPage.tsx", "utf8");
check("학습 화면에 브랜드 카피 없음", !learn.includes("금융문맹 되어"));

// 같은 공백 구간에서 반복 발송을 막는 조건이 서버에 있는지.
const cron = readFileSync("api/cron-nudge.ts", "utf8");
check("같은 공백 구간 반복 발송 차단", /lastNotificationForStudyDate === rec\.lastStudyDate/.test(cron));
check("오늘 완료자 발송 제외", /lastDefaultDoneDate === today/.test(cron));
check("하루 1회 제한", /lastNotificationSentDate === today/.test(cron));

console.table(checks);
const failed = checks.filter((c) => c.결과 === "실패");
if (failed.length) {
  console.error(`\n실패 ${failed.length}건`);
  process.exit(1);
}
console.log(`\n${checks.length}건 통과. 브랜드 카피는 2~3일 이탈에서만 하루 1회 나간다.`);
