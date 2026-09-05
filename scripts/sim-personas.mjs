/**
 * 사용 강도가 다른 사람들을 30일 돌린다.
 *
 * 확인하려는 것은 하나다. 추가 세션을 열어 주면 하루 많이 공부한 사람이 며칠 뒤
 * 복습 지옥을 맞는가. src/lib/today.ts, src/lib/srs.ts와 같은 규칙을 옮겨 담았다.
 *
 * scripts/sim-accuracy.mjs가 이 파일의 run을 가져다 정답률만 바꿔 다시 돌린다.
 * 루프를 복사하면 한쪽만 고쳐지고 두 결과가 조용히 갈라진다.
 */
import { pathToFileURL } from "node:url";

const REVIEW_STEPS = [1, 2, 6, 15];
const GRADUATE_REPETITIONS = 4;
const SINGLE_FORM_FALLBACK = 5;
const NEW_PER_DAY = 2;
const BACKLOG_THROTTLE = 2;
const BACKLOG_STOP = 4;
const DEFAULT_BUDGET = 8.6;
const MIN_REVIEW_CAP = 4;
const EXTRA_BUDGET = 5;
const EXTRA_NEW_DAILY_CAP = 2;
const COST = { new: 1.15, first_recall: 0.7, recall: 0.8, practice: 0.8 };

/** 학습 후보 221개 중 뜻 고르기까지 만들어지는 것은 171개(scripts/report_pool.py). */
const CANDIDATES = 221;
const MULTI_FORM = 171;

function intervalFor(reps) {
  return REVIEW_STEPS[Math.min(Math.max(reps, 1), REVIEW_STEPS.length) - 1];
}

function newPerDay(backlog) {
  if (backlog >= BACKLOG_STOP) return 0;
  if (backlog >= BACKLOG_THROTTLE) return 1;
  return NEW_PER_DAY;
}

/** 개수가 아니라 시간 예산으로 정한다. 신규를 줄인 날은 복습을 더 태운다. */
function reviewCap(newCount) {
  const left = DEFAULT_BUDGET - newCount * (COST.new + COST.first_recall);
  return Math.max(MIN_REVIEW_CAP, Math.floor(left / COST.recall));
}

function familiarRule(c) {
  if (c.reps < GRADUATE_REPETITIONS) return null;
  if (c.days.size < 2) return null;
  if (c.forms.size >= 2) return "full";
  return c.reps >= SINGLE_FORM_FALLBACK ? "fallback" : null;
}

function isFamiliar(c) {
  return familiarRule(c) !== null;
}

/** 익숙해진 날을 기록한다. 판정이 처음 참이 된 날만 남긴다. */
function stamp(c, day) {
  if (c.familiarDay === undefined && isFamiliar(c)) c.familiarDay = day;
}

/** 복습 횟수에 따라 형태가 바뀐다. 형태가 하나뿐인 카드는 계속 recall이다. */
function formFor(c) {
  if (!c.multiForm) return "recall";
  if (c.reps === 0) return "recognition";
  if (c.reps === 1) return "recall";
  return c.reps === 2 ? "contrast" : "judgment";
}

/**
 * 문제를 맞혔을 때. src/lib/srs.ts의 grade(q>=3)와 같다.
 */
function pass(c, day, form) {
  c.days.add(day);
  c.forms.add(form);
  c.reps += 1;
  c.due = day + intervalFor(c.reps);
  stamp(c, day);
}

/**
 * 틀렸을 때. src/lib/srs.ts의 grade(q<3)와 같다.
 *
 * 횟수를 하나 깎고 다음 날 다시 묻는다. 맞힌 날짜와 형태는 남기지 않는다.
 * 이 경로가 실제로 돌면 세션 시간이 늘고 밀림이 생긴다. 모두 정답 가정에서는
 * 한 번도 실행되지 않으므로, 낙관적인 결과만 보고 안심하면 안 된다.
 */
function fail(c, day) {
  c.reps = Math.max(0, c.reps - 1);
  c.lapses = (c.lapses ?? 0) + 1;
  c.due = day + relearnInterval(c.lapses);
}

/** src/lib/srs.ts의 relearnInterval과 같다. 계속 틀리는 카드가 매일 큐를 잠식하지 않게 한다. */
function relearnInterval(lapses) {
  if (lapses <= 2) return 1;
  return lapses <= 4 ? 2 : 3;
}

/** 기본값은 전부 정답. sim-accuracy.mjs가 형태별 확률을 넣어 덮는다. */
const ALWAYS_RIGHT = () => true;

export function run(persona, opts = {}) {
  const correct = opts.correct ?? ALWAYS_RIGHT;
  const cards = [];
  let nextTerm = 0;
  let maxBacklog = 0;
  let maxMinutes = 0;
  let minutesTotal = 0;
  let extraTotal = 0;
  const daily = [];

  for (let day = 1; day <= 30; day += 1) {
    const active = persona.studies(day);
    const dueList = cards.filter((c) => !isFamiliar(c) && c.due <= day);
    const capPreview = reviewCap(NEW_PER_DAY);
    const backlog = Math.max(0, dueList.length - capPreview);
    maxBacklog = Math.max(maxBacklog, backlog);
    if (!active) {
      daily.push({ day, minutes: 0, review: 0, backlog });
      continue;
    }

    let minutes = 0;
    // 권장 세션: 신규 먼저, 복습은 상한까지.
    const newCount = Math.min(newPerDay(backlog), CANDIDATES - nextTerm);
    const cap = reviewCap(newCount);
    const graded = new Set();
    for (let k = 0; k < newCount; k += 1) {
      const c = {
        id: nextTerm,
        reps: 0,
        due: day,
        days: new Set(),
        forms: new Set(),
        startDay: day,
        lapses: 0,
        multiForm: nextTerm < MULTI_FORM,
      };
      nextTerm += 1;
      cards.push(c);
      minutes += COST.new;
      // 바로 이어지는 확인 문항이 첫 채점이 된다.
      const f = formFor(c);
      if (correct(f, c)) pass(c, day, f);
      else fail(c, day);
      minutes += COST.first_recall;
      graded.add(c.id);
    }
    const reviewed = dueList.filter((c) => !graded.has(c.id)).slice(0, cap);
    for (const c of reviewed) {
      const f = formFor(c);
      if (correct(f, c)) pass(c, day, f);
      else fail(c, day);
      minutes += COST.recall;
      graded.add(c.id);
    }

    // 추가 세션: 밀린 복습 -> 일정 안 건드리는 다시 보기 -> 신규(밀림 없을 때만).
    const rounds = persona.extra(day);
    // 신규는 하루 총량으로 막는다. 회차마다 허용하면 몰아치는 날에 며칠 뒤 복습이 폭증한다.
    let extraNewToday = 0;
    for (let r = 0; r < rounds; r += 1) {
      let spent = 0;
      const rest = cards
        .filter((c) => !isFamiliar(c) && c.due <= day && !graded.has(c.id))
        .sort((a, b) => a.due - b.due);
      for (const c of rest) {
        if (spent + COST.recall > EXTRA_BUDGET) break;
        const f = formFor(c);
        if (correct(f, c)) pass(c, day, f);
        else fail(c, day);
        spent += COST.recall;
        graded.add(c.id);
      }
      const ahead = cards
        .filter((c) => !isFamiliar(c) && c.due > day && !graded.has(c.id))
        .sort((a, b) => a.due - b.due);
      for (const c of ahead) {
        if (spent + COST.practice > EXTRA_BUDGET) break;
        // 연습만 한다. 맞히면 날짜/형태만 남기고, 틀려도 일정을 앞당기지 않는다.
        const f = formFor(c);
        if (correct(f, c)) {
          c.days.add(day);
          c.forms.add(f);
          stamp(c, day);
        }
        spent += COST.practice;
        graded.add(c.id);
      }
      const backlogNow = Math.max(
        0,
        cards.filter((c) => !isFamiliar(c) && c.due <= day).length - cap,
      );
      if (backlogNow === 0) {
        for (let k = 0; extraNewToday < EXTRA_NEW_DAILY_CAP && nextTerm < CANDIDATES; k += 1) {
          if (spent + COST.new + COST.first_recall > EXTRA_BUDGET) break;
          const c = {
            id: nextTerm,
            reps: 0,
            due: day,
            days: new Set(),
            forms: new Set(),
            startDay: day,
            lapses: 0,
            multiForm: nextTerm < MULTI_FORM,
          };
          nextTerm += 1;
          cards.push(c);
          const f = formFor(c);
          if (correct(f, c)) pass(c, day, f);
          else fail(c, day);
          spent += COST.new + COST.first_recall;
          extraNewToday += 1;
          graded.add(c.id);
        }
      }
      if (spent === 0) break;
      minutes += spent;
      extraTotal += 1;
    }

    minutesTotal += minutes;
    maxMinutes = Math.max(maxMinutes, minutes);
    daily.push({ day, minutes, review: reviewed.length, backlog });
  }

  const studiedDays = daily.filter((d) => d.minutes > 0).length;
  // 시작한 날부터 익숙해진 날까지 걸린 일수. extra 세션이 이 값을 지나치게 줄이는지 본다.
  const spans = cards.filter(isFamiliar).map((c) => c.familiarDay - c.startDay);
  const velocity = spans.length
    ? (spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(1)
    : "-";
  const mins = daily.filter((d) => d.minutes > 0).map((d) => d.minutes).sort((a, b) => a - b);
  const p95 = mins.length ? mins[Math.min(mins.length - 1, Math.floor(mins.length * 0.95))] : 0;
  /** 네 번 이상 틀렸는데 아직 익숙해지지 않은 카드. 큐를 막고 있는지 본다. */
  const stuck = cards.filter((c) => (c.lapses ?? 0) >= 4 && !isFamiliar(c));
  return {
    이름: persona.name,
    "학습한 날": studiedDays,
    "추가 세션": extraTotal,
    "시작한 용어": nextTerm,
    "익숙해짐": cards.filter(isFamiliar).length,
    "일반기준": cards.filter((c) => familiarRule(c) === "full").length,
    "면제기준": cards.filter((c) => familiarRule(c) === "fallback").length,
    "학습일 평균 분": (minutesTotal / Math.max(1, studiedDays)).toFixed(1),
    "95% 분": p95.toFixed(1),
    "최대 분": maxMinutes.toFixed(1),
    "최대 밀림": maxBacklog,
    "30일차 밀림": daily[29].backlog,
    "익숙해지기까지(일)": velocity,
    "막힌 카드": stuck.length,
    추이: daily,
  };
}

export const PERSONAS = [
  { name: "A 기본만, 매일", studies: () => true, extra: () => 0 },
  { name: "B 매일 기본 + 5분 더", studies: () => true, extra: () => 1 },
  {
    name: "C 평일 기본, 주말 30분",
    studies: () => true,
    extra: (d) => (d % 7 === 6 || d % 7 === 0 ? 5 : 0),
  },
  { name: "D 3일 하고 3일 쉼", studies: (d) => d % 6 < 3, extra: () => 0 },
  { name: "E 매일 기본 + 5분 x3", studies: () => true, extra: () => 3 },
];

if (import.meta.url !== pathToFileURL(process.argv[1]).href) {
  // 다른 스크립트가 가져다 쓰는 경우. 표를 찍지 않는다.
} else {
  main();
}

function main() {
const full = PERSONAS.map((p) => run(p));
console.log("30일, 모두 정답 가정. 학습 후보 221개.");
console.table(full.map(({ 추이, ...r }) => r));

for (const r of full) {
  const trace = r.추이
    .map((d) => (d.minutes ? `${d.day}:${d.minutes.toFixed(0)}분/밀림${d.backlog}` : `${d.day}:쉼`))
    .join("  ");
  console.log(`\n${r.이름}\n  ${trace}`);
}

/**
 * 통과 기준은 밀림만 본다.
 * 추가 세션의 분량은 사용자가 스스로 고른 것이므로 25분이 나와도 결함이 아니다.
 * 결함은 자율 학습이 며칠 뒤 강제 복습으로 되돌아오는 경우다.
 */
const bad = full.filter((r) => r["최대 밀림"] > 6);
console.log(
  bad.length
    ? `\n주의: ${bad.map((r) => r.이름).join(" / ")}`
    : "\n모든 유형에서 최대 밀림 6개 이하. 자율 학습이 강제 복습으로 되돌아오지 않는다.",
);

/**
 * 추가 세션이 익숙함을 앞당기지 않는지 확인한다.
 *
 * 추가 세션의 `다시 보기`는 복습 일정을 앞당기지 않으므로, 하루에 몇 번을 해도
 * 네 번째 정답은 1+1+2+6 = 9일째보다 빨라질 수 없다. 그 설계가 실제로 지켜지는지 본다.
 */
const daily = full.filter((r) => r["학습한 날"] === 30).map((r) => Number(r["익숙해지기까지(일)"]));
const spread = Math.max(...daily) - Math.min(...daily);
console.log(
  spread <= 1
    ? `매일 쓰는 유형끼리 익숙해지는 데 걸린 일수 차이 ${spread.toFixed(1)}일. 추가 세션이 익숙함을 앞당기지 않는다.`
    : `주의: 추가 세션 사용량에 따라 익숙해지는 속도가 ${spread.toFixed(1)}일 차이난다.`,
);
console.log("모두 정답 가정이다. 틀리는 사용자는 scripts/sim-accuracy.mjs에서 본다.");
}
