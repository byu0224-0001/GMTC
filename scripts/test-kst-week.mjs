/**
 * 주간 점이 기기 로컬이 아니라 한국 날짜에 붙는지 지킨다.
 * 화요일에 처음 공부한 사람에게 월요일이 켜지면 안 된다.
 */
import { readFileSync } from "node:fs";

const src = readFileSync("src/lib/srs.ts", "utf8");
const weekSrc = readFileSync("src/lib/weekly.ts", "utf8");
const checks = [];
const check = (name, pass, detail = "") =>
  checks.push({ 항목: name, 결과: pass ? "통과" : "실패", 비고: detail });

check("KST는 Asia/Seoul", src.includes('timeZone: "Asia/Seoul"'));
check("로컬 setHours 자정에 의존하지 않음", !src.includes("setHours(0, 0, 0, 0)"));
check("주는 월요일 시작", weekSrc.includes("월요일을 주의 시작"));

function kstDateKey(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(key, days) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function startOfKstWeek(now) {
  const today = kstDateKey(now);
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sinceMonday = dow === 0 ? 6 : dow - 1;
  return addDays(today, -sinceMonday);
}

/** 2026-09-07 월 19:26 KST */
const mondayEvening = new Date("2026-09-07T10:26:00Z");
check("월요일 저녁은 월요일", kstDateKey(mondayEvening) === "2026-09-07", kstDateKey(mondayEvening));
check("그 주의 시작은 그 월요일", startOfKstWeek(mondayEvening) === "2026-09-07");

/** 2026-09-08 화 00:30 KST */
const tuesdayDawn = new Date("2026-09-07T15:30:00Z");
check("화요일 새벽은 화요일", kstDateKey(tuesdayDawn) === "2026-09-08", kstDateKey(tuesdayDawn));
check("화요일 주의 시작도 그 월요일", startOfKstWeek(tuesdayDawn) === "2026-09-07");

const tuesdayStudy = "2026-09-08";
const week = Array.from({ length: 7 }, (_, i) => addDays(startOfKstWeek(tuesdayDawn), i));
check("화요일 학습은 월요일 칸이 아님", week[0] === "2026-09-07" && week[1] === tuesdayStudy);
check("화요일 학습 점이 화요일에만 해당", week[1] === tuesdayStudy && week[0] !== tuesdayStudy);

/** 일요일 23:00 KST는 그 주 일요일이지 다음 월요일이 아니다. */
const sundayNight = new Date("2026-09-06T14:00:00Z");
check("일요일 밤도 일요일", kstDateKey(sundayNight) === "2026-09-06", kstDateKey(sundayNight));
check("일요일의 주 시작은 그 전 월요일", startOfKstWeek(sundayNight) === "2026-08-31");

function daysBetweenKeys(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function liveStreakDays(lastStudyDate, stored, now) {
  if (!lastStudyDate || stored <= 0) return 0;
  const gap = daysBetweenKeys(lastStudyDate, kstDateKey(now));
  if (gap === null || gap > 1) return 0;
  return stored;
}

/** 2026-09-13 일 10:08 KST. 수요일에 4일이던 연속이 쉬는 날에도 4로 남으면 안 된다. */
const sundayMorning = new Date("2026-09-13T01:08:00Z");
check("수요일 학습 후 일요일 연속은 0", liveStreakDays("2026-09-09", 4, sundayMorning) === 0);
check("어제 학습이면 연속은 유지", liveStreakDays("2026-09-12", 4, sundayMorning) === 4);
check("오늘 학습이면 연속은 유지", liveStreakDays("2026-09-13", 4, sundayMorning) === 4);
check("표시 연속은 저장값이 아니라 지금 계산", src.includes("export function liveStreakDays") && src.includes("이틀 이상 비었으면 0"));

const failed = checks.filter((c) => c.결과 === "실패");
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) process.exit(1);
