/**
 * 현재 채택안(G)으로 10일을 돌렸을 때 복습 밀림이 생기는지 본다.
 * 옛 가정(신규 3, REVIEW_CAP 5, 간격 상한 2일)은 더 이상 제품이 아니다.
 *
 * 채택안: 신규 2, 간격 1→2→6→15, 4회 졸업, 복습 상한 6, 밀리면 신규 1.
 * 출처: src/lib/today.ts, src/lib/srs.ts, scripts/sim-srs.mjs 플랜 G.
 */
const DAYS = 10;
const STEPS = [1, 2, 6, 15];
const GRAD = 4;
const CAP = 6;

function neuFor(backlog) {
  if (backlog >= 4) return 1;
  return 2;
}

const cards = [];
const rows = [];

for (let day = 0; day < DAYS; day += 1) {
  const due = cards.filter((c) => !c.done && c.due <= day);
  const reviewed = due.slice(0, CAP);
  const backlog = due.length - reviewed.length;
  for (const c of reviewed) {
    c.reps += 1;
    if (c.reps >= GRAD) c.done = true;
    else c.due = day + STEPS[Math.min(c.reps, STEPS.length - 1)];
  }
  const fresh = neuFor(backlog);
  for (let i = 0; i < fresh; i += 1) cards.push({ reps: 1, due: day + STEPS[1], done: false });
  rows.push({
    day: day + 1,
    introduced: cards.length,
    dueBeforeNew: due.length,
    reviewed: reviewed.length,
    backlog,
    fresh,
  });
}

console.log("채택안 G: 신규2(밀리면 1), 간격 1→2→6→15, 4회 졸업, cap 6, 10일, 모두 정답");
console.table(rows);
const last = rows[rows.length - 1];
console.log(
  `Day 10: due ${last.dueBeforeNew}개, 복습 ${last.reviewed}개, 미처리 backlog ${last.backlog}개, 누적 도입 ${last.introduced}장`,
);
if (rows.some((r) => r.backlog > 0)) {
  const first = rows.find((r) => r.backlog > 0);
  console.log(`결론: ${first.day}일째부터 복습 backlog가 생깁니다.`);
  process.exitCode = 1;
} else {
  console.log("결론: 이 가정에서는 10일 안에 backlog가 쌓이지 않습니다.");
}
