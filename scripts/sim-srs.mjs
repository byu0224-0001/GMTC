/**
 * SRS 후보 비교.
 *
 * 두 가지 산수를 먼저 못 박아 둔다.
 *
 * 1) 간격에 상한이 있고 졸업이 없으면 복습 요구량은 카드 수에 비례해 계속 늘어난다.
 *    카드 N장, 최대 간격 k일이면 하루 요구량 N/k이고 N은 매일 커진다.
 *    상한이 2일이든 10일이든 backlog는 시점만 늦춰진다. 졸업이 반드시 필요하다.
 *
 * 2) 졸업이 있으면 정상 상태 복습량은 (하루 신규) x (졸업까지 복습 횟수)로 고정된다.
 *    간격을 어떻게 배치해도 이 값은 바뀌지 않는다. 그래서 REVIEW_CAP이 이 값보다
 *    작으면 backlog가 쌓이고, 크게 잡으면 세션 시간이 5~10분을 넘는다.
 *    결국 하루 신규 개수가 시간 예산을 정한다.
 *
 * 모두 정답(가장 낙관적) 가정이므로 실제 오답이 섞이면 backlog는 이보다 나빠진다.
 */
const DAYS = 60;

/** src/lib/today.ts의 estimateMinutes 계수 */
const MIN_NEW = 1.15;
const MIN_FIRST = 0.7;
const MIN_REVIEW = 0.8;

function minutes(neu, review, readMin) {
  const raw = neu * MIN_NEW + neu * MIN_FIRST + review * MIN_REVIEW + readMin;
  return Math.min(14, Math.max(1, Math.round(raw)));
}

const PLANS = [
  { name: "A 현재 1→2 상한, 신규3, 읽기 매일", steps: [1, 2], grad: Infinity, cap: 5, neu: () => 3, read: () => 3 },
  { name: "B 1→3→7, 신규3, 읽기 매일", steps: [1, 3, 7], grad: Infinity, cap: 5, neu: () => 3, read: () => 3 },
  { name: "C 1→2→5→10, 신규 적응, 읽기 매일", steps: [1, 2, 5, 10], grad: Infinity, cap: 6, neu: (b) => (b >= 8 ? 1 : b >= 4 ? 2 : 3), read: () => 3 },
  { name: "D 1→3→7→17, 3회 졸업, 신규3, 읽기 매일", steps: [1, 3, 7, 17], grad: 4, cap: 9, neu: () => 3, read: () => 3 },
  { name: "E 1→3→7→17, 3회 졸업, 신규2, 읽기 세션 밖", steps: [1, 3, 7, 17], grad: 4, cap: 6, neu: () => 2, read: () => 0 },
  { name: "F E + 신규 적응", steps: [1, 3, 7, 17], grad: 4, cap: 6, neu: (b) => (b >= 4 ? 1 : 2), read: () => 0 },
  // G가 실제 채택안이다. F에서 간격만 좁혔다. 형태 사다리(lib/quiz.ts)가 복습 횟수에
  // 걸려 있어, 간격이 길면 첫 2주 동안 같은 형태만 나온다.
  { name: "G 1→2→6→15, 3회 졸업, 신규2, 읽기 세션 밖 (채택)", steps: [1, 2, 6, 15], grad: 4, cap: 6, neu: (b) => (b >= 4 ? 1 : 2), read: () => 0 },
];

function run(plan) {
  const cards = [];
  let backlog = 0;
  let reviewTotal = 0;
  let maxBacklog = 0;
  let minutesTotal = 0;
  let maxMinutes = 0;
  let graduated = 0;
  const rows = [];

  for (let day = 0; day < DAYS; day += 1) {
    const due = cards.filter((c) => !c.done && c.due <= day);
    const reviewed = due.slice(0, plan.cap);
    backlog = due.length - reviewed.length;
    maxBacklog = Math.max(maxBacklog, backlog);

    for (const c of reviewed) {
      c.reps += 1;
      if (c.reps >= plan.grad) {
        c.done = true;
        graduated += 1;
      } else {
        c.due = day + plan.steps[Math.min(c.reps, plan.steps.length - 1)];
      }
    }

    const fresh = plan.neu(backlog);
    for (let i = 0; i < fresh; i += 1) cards.push({ reps: 1, due: day + plan.steps[1], done: false });

    reviewTotal += reviewed.length;
    const m = minutes(fresh, reviewed.length, plan.read(day));
    minutesTotal += m;
    maxMinutes = Math.max(maxMinutes, m);
    rows.push({ day: day + 1, reviewed: reviewed.length, backlog, fresh, minutes: m });
  }

  const steady = plan.grad === Infinity ? null : (plan.neu(0) * (plan.grad - 1));
  return {
    name: plan.name,
    introduced: cards.length,
    graduated,
    steady,
    cap: plan.cap,
    avgReview: (reviewTotal / DAYS).toFixed(1),
    maxBacklog,
    endBacklog: backlog,
    avgMinutes: (minutesTotal / DAYS).toFixed(1),
    maxMinutes,
    rows,
  };
}

const results = PLANS.map(run);
console.log(`${DAYS}일, 모두 정답 가정. 세션 시간은 estimateMinutes 계수를 그대로 씀.`);
console.table(
  results.map((r) => ({
    안: r.name,
    도입: r.introduced,
    졸업: r.graduated,
    "정상 복습요구/일": r.steady ?? "무한 증가",
    "복습 cap": r.cap,
    "일평균 복습": r.avgReview,
    "최대 backlog": r.maxBacklog,
    "일평균 분": r.avgMinutes,
    "최대 분": r.maxMinutes,
  })),
);

for (const r of results) {
  const first = r.rows.find((x) => x.backlog > 0);
  console.log(
    `${r.name}\n   ${first ? `${first.day}일째 backlog 시작` : "backlog 없음"}` +
      ` | 10일차 복습 ${r.rows[9].reviewed}·${r.rows[9].minutes}분` +
      ` | 30일차 복습 ${r.rows[29].reviewed}·${r.rows[29].minutes}분` +
      ` | ${DAYS}일차 복습 ${r.rows[DAYS - 1].reviewed}·${r.rows[DAYS - 1].minutes}분`,
  );
}

const ok = results.filter((r) => r.maxBacklog <= 3 && Number(r.avgMinutes) <= 9);
console.log(
  ok.length
    ? `\n채택 가능 (최대 backlog<=3, 일평균 9분 이하): ${ok.map((r) => r.name).join(" / ")}`
    : "\n채택 가능한 안이 없습니다.",
);
