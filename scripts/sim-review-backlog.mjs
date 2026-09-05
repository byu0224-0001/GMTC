/**
 * NEW_PER_DAY=3, MAX_INTERVAL=2, REVIEW_CAP=5, 맞히기만 가정한 10일 복습 backlog 시뮬.
 * 신규 카드는 당일 first_recall에서 정답 → 내일 due. 당일 REVIEW_CAP에는 넣지 않는다.
 */
const NEW_PER_DAY = 3;
const REVIEW_CAP = 5;
const MAX_INTERVAL = 2;
const DAYS = 10;

function gradeGood(card, today) {
  const repetitions = card.repetitions + 1;
  const interval = repetitions === 1 ? 1 : MAX_INTERVAL;
  return { ...card, repetitions, interval, due: today + interval };
}

const cards = [];
let nextId = 1;
const rows = [];

for (let day = 0; day < DAYS; day++) {
  const due = cards.filter((c) => c.due <= day);
  const reviewed = due.slice(0, REVIEW_CAP);
  const backlog = due.length - reviewed.length;
  for (const c of reviewed) {
    const next = gradeGood(c, day);
    cards[cards.findIndex((x) => x.id === c.id)] = next;
  }

  for (let i = 0; i < NEW_PER_DAY; i++) {
    const fresh = { id: nextId++, introduced: day, repetitions: 0, interval: 0, due: day };
    cards.push(gradeGood(fresh, day));
  }

  rows.push({
    day: day + 1,
    introduced: cards.length,
    dueBeforeNew: due.length,
    reviewed: reviewed.length,
    backlog,
  });
}

console.log("NEW_PER_DAY=3, MAX_INTERVAL_DAYS=2, REVIEW_CAP=5, 10일, 모두 정답 가정");
console.log("신규는 당일 복습 cap에 넣지 않고, 맞히면 다음날 due.");
console.table(rows);
const last = rows[rows.length - 1];
console.log(
  `Day 10: due ${last.dueBeforeNew}개, 복습 ${last.reviewed}개, 미처리 backlog ${last.backlog}개, 누적 도입 ${last.introduced}장`,
);
if (rows.some((r) => r.backlog > 0)) {
  const first = rows.find((r) => r.backlog > 0);
  console.log(`결론: ${first.day}일째부터 복습 backlog가 생깁니다. REVIEW_CAP=5가 due 증가를 따라가지 못합니다.`);
} else {
  console.log("결론: 이 가정에서는 10일 안에 backlog가 쌓이지 않습니다.");
}
