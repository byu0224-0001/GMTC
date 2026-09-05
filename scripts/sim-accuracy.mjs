/**
 * 틀리는 사용자를 30일 돌린다.
 *
 * 지금까지의 시뮬레이션은 모두 정답 가정이었다. 구조를 검증하는 데는 맞지만
 * 우리 페르소나를 검증하기에는 낙관적이다. `들어본 말인데 헷갈리는 사람`은 당연히
 * 틀리고, 틀린 카드는 다음 날 다시 돌아오면서 세션 시간과 밀림을 늘린다.
 *
 * 확인하려는 것 네 가지.
 *   1. 밀림이 어디까지 커지는가
 *   2. 세션 시간이 얼마나 길어지는가 (평균과 95% 수준)
 *   3. 익숙해지는 데 며칠 걸리는가
 *   4. 계속 틀리는 카드가 큐를 막아 새 용어가 끊기는가
 *
 * 몬테카를로까지 갈 필요는 없다. 시드를 고정해 결과가 재현되게만 한다.
 */
import { PERSONAS, run } from "./sim-personas.mjs";

/** 시드 고정 난수. 같은 시드면 같은 결과가 나와야 비교가 의미 있다. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * 문제 형태별 정답률.
 *
 * 뜻을 고르는 것보다 떠올리는 것이 어렵고, 비슷한 개념을 구분하는 것이 더 어렵다.
 * 문맥에 적용하는 것이 가장 어렵다. 우리 페르소나는 특히 뒤쪽에서 막힌다.
 */
const BY_FORM = {
  recognition: 0.85,
  recall: 0.75,
  contrast: 0.65,
  judgment: 0.7,
  context: 0.6,
};

/**
 * 같은 카드를 여러 번 만나면 정답률이 오른다.
 * 이게 없으면 정답률이 영원히 고정되어 아무도 졸업하지 못하는, 학습이 없는 모형이 된다.
 */
function withLearning(base, reps) {
  return Math.min(0.97, base + reps * 0.06);
}

const SCENARIOS = [
  { name: "전부 정답 (기준선)", correct: () => true },
  { name: "90% 정답", flat: 0.9 },
  { name: "75% 정답", flat: 0.75 },
  { name: "60% 정답", flat: 0.6 },
  { name: "형태별 (85/75/65/70/60)", byForm: true },
];

function modelFor(sc, seed) {
  if (sc.correct) return sc.correct;
  const rand = rng(seed);
  return (form, card) => {
    const base = sc.byForm ? (BY_FORM[form] ?? 0.7) : sc.flat;
    return rand() < withLearning(base, card.reps);
  };
}

/** 두 가지 사용 강도만 본다. 표가 25줄이 되면 아무것도 안 보인다. */
const WATCH = ["A 기본만, 매일", "B 매일 기본 + 5분 더"];

const rows = [];
for (const sc of SCENARIOS) {
  for (const name of WATCH) {
    const persona = PERSONAS.find((p) => p.name === name);
    const r = run(persona, { correct: modelFor(sc, 12345) });
    rows.push({
      시나리오: sc.name,
      사용유형: name.slice(0, 1),
      "시작한 용어": r["시작한 용어"],
      익숙해짐: r["익숙해짐"],
      "익숙해지기까지(일)": r["익숙해지기까지(일)"],
      "평균 분": r["학습일 평균 분"],
      "95% 분": r["95% 분"],
      "최대 분": r["최대 분"],
      "최대 밀림": r["최대 밀림"],
      "30일차 밀림": r["30일차 밀림"],
      "막힌 카드": r["막힌 카드"],
    });
  }
}

console.log("30일. 형태별 정답률과 균일 정답률을 비교한다. 같은 시드로 재현된다.");
console.table(rows);

/**
 * 통과 기준.
 *
 * 60% 정답은 상당히 나쁜 경우다. 그래도 세션이 15분을 넘지 않고 밀림이 12개를
 * 넘지 않아야 한다. 넘으면 틀리는 사용자가 며칠 만에 따라잡을 수 없는 양을 받게 된다.
 * 막힌 카드는 계속 틀리는 카드가 큐를 점유해 새 용어가 끊기는 상황을 뜻한다.
 */
const problems = [];
for (const r of rows) {
  if (Number(r["95% 분"]) > 15) problems.push(`${r.시나리오}/${r.사용유형}: 95% 세션 ${r["95% 분"]}분`);
  if (r["최대 밀림"] > 12) problems.push(`${r.시나리오}/${r.사용유형}: 최대 밀림 ${r["최대 밀림"]}개`);
  if (r["30일차 밀림"] > 8) problems.push(`${r.시나리오}/${r.사용유형}: 30일차 밀림 ${r["30일차 밀림"]}개`);
}

console.log();
if (problems.length) {
  console.log("주의:");
  for (const p of problems) console.log(`  ${p}`);
} else {
  console.log("60% 정답까지 95% 세션 15분 이하, 최대 밀림 12개 이하를 유지한다.");
}

const worst = rows.filter((r) => r.시나리오 === "60% 정답");
const base = rows.filter((r) => r.시나리오 === "전부 정답 (기준선)");
console.log(
  `\n정답률이 100%에서 60%로 떨어질 때:\n` +
    `  익숙해지기까지 ${base[0]["익숙해지기까지(일)"]}일 -> ${worst[0]["익숙해지기까지(일)"]}일\n` +
    `  익숙해진 용어 ${base[0].익숙해짐}개 -> ${worst[0].익숙해짐}개\n` +
    `  학습일 평균 ${base[0]["평균 분"]}분 -> ${worst[0]["평균 분"]}분`,
);
