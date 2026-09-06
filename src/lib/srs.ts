import type { GradeLabel, RetrievalForm, SrsCard } from "../types";

const KST = 9 * 60 * 60 * 1000;

export function startOfKst(d: Date): Date {
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + KST);
  kst.setHours(0, 0, 0, 0);
  return kst;
}

export function kstDateKey(d = new Date()): string {
  const s = startOfKst(d);
  const y = s.getFullYear();
  const m = String(s.getMonth() + 1).padStart(2, "0");
  const day = String(s.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * 복습 사다리와 졸업.
 *
 * 간격에 상한만 두고 졸업이 없으면 복습 요구량이 카드 수에 비례해 계속 늘어난다.
 * 상한이 2일이든 10일이든 backlog는 시점만 늦춰진다(scripts/sim-srs.mjs 참고).
 * 그래서 간격을 넓히고, 정해진 횟수를 넘기면 큐에서 뺀다.
 *
 * 졸업 뒤 정상 상태 복습량은 (하루 신규) x (졸업까지 복습 횟수)로 고정된다.
 * 신규 2개 x 3회 = 하루 6개. 권장 세션의 시간 예산을 8.6분으로 잡은 근거다(lib/today.ts).
 *
 * 간격을 [1,2,6,15]로 잡은 것은 문제 형태와 맞물린다. 복습 횟수가 오를 때마다
 * 형태가 바뀌므로(lib/quiz.ts), 간격이 너무 길면 첫 2주 동안 같은 형태만 반복된다.
 */
export const REVIEW_STEPS = [1, 2, 6, 15] as const;

/** 복습 큐에서 빠지기까지 필요한 최소 정답 횟수. */
export const GRADUATE_REPETITIONS = 4;
/** 한 형태만 반복해서 맞힌 카드에 대비한 안전장치. 이 횟수를 넘으면 형태 조건을 면제한다. */
const SINGLE_FORM_FALLBACK_REPETITIONS = 5;

export const MAX_INTERVAL_DAYS = REVIEW_STEPS[REVIEW_STEPS.length - 1];

/**
 * 익숙해진 것으로 볼 기준.
 *
 * 정답 횟수만 세면 같은 문항을 같은 날 네 번 맞힌 것과, 2주에 걸쳐 네 가지 방식으로
 * 맞힌 것이 같은 값이 된다. 화면에 `익숙해진 용어 N개`를 쓰려면 그 N이 무언가를
 * 뜻해야 하므로 날짜와 형태를 함께 요구한다.
 *
 * 형태가 하나뿐인 용어(오답 보기가 모자라 뜻 고르기를 만들 수 없는 경우)는 형태 조건을
 * 영원히 못 채워 복습 큐에 갇힌다. 그래서 정답 횟수가 더 쌓이면 면제한다.
 */
/**
 * 어떤 규칙으로 익숙해졌는지.
 *
 * `full`과 `fallback`은 같은 이름의 상태이지만 요구한 것이 다르다. 이걸 감춰 두면
 * `익숙해진 용어 42개`가 실제로 무엇을 뜻하는지 아무도 알 수 없게 된다.
 * 그래서 어느 규칙으로 통과했는지 함께 돌려주고, 파일럿 보고에 두 수를 나눠 적는다.
 */
export type FamiliarRule = "full" | "fallback" | null;

export function familiarRule(card: SrsCard): FamiliarRule {
  if (card.repetitions < GRADUATE_REPETITIONS) return null;
  if (card.successDates.length < 2) return null;
  if (card.successForms.length >= 2) return "full";
  return card.repetitions >= SINGLE_FORM_FALLBACK_REPETITIONS ? "fallback" : null;
}

export function isFamiliar(card: SrsCard): boolean {
  return familiarRule(card) !== null;
}

/** 복습 큐에서 빠지는 조건. 화면에 보여 주는 `익숙해짐`과 같은 기준을 쓴다. */
export function isGraduated(card: SrsCard): boolean {
  return isFamiliar(card);
}

function intervalFor(repetitions: number): number {
  const i = Math.min(Math.max(repetitions, 1), REVIEW_STEPS.length) - 1;
  return REVIEW_STEPS[i];
}

/**
 * 틀린 카드를 다시 묻기까지의 간격.
 *
 * 처음 두 번은 다음 날 다시 묻는다. 틀린 직후에 다시 보는 것이 가장 효과가 크다.
 * 그런데 계속 틀리는 카드까지 매일 되돌리면 그 카드가 하루 분량을 잠식한다.
 * 오답 시뮬레이션(scripts/sim-accuracy.mjs)에서 정답률 60%일 때 네 번 이상 틀린
 * 카드가 4~5개 생기고, 그것들이 매일 돌아와 새 용어가 거의 끊겼다. 사용자에게는
 * `아는 것도 안 나오고 모르는 것만 계속 나온다`로 느껴진다.
 *
 * 그래서 세 번째 실패부터는 이틀, 다섯 번째부터는 사흘을 둔다. 큐에서 빼지는 않는다.
 * 어려운 카드를 숨기는 것이 아니라 다른 것을 볼 자리를 남기는 것이다.
 */
function relearnInterval(lapses: number): number {
  if (lapses <= 2) return 1;
  return lapses <= 4 ? 2 : 3;
}

export function newCard(termId: string, now = new Date()): SrsCard {
  return {
    termId,
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: kstDateKey(now),
    lastQuality: null,
    updatedAt: now.toISOString(),
    successDates: [],
    successForms: [],
  };
}

export function isDue(card: SrsCard, now = new Date()): boolean {
  if (isGraduated(card)) return false;
  return card.dueAt <= kstDateKey(now);
}

export function grade(
  card: SrsCard,
  label: GradeLabel,
  now = new Date(),
  form?: RetrievalForm,
): SrsCard {
  const q = label === "again" ? 1 : label === "hard" ? 3 : 4;
  let { ease, interval, repetitions, lapses } = card;
  const successDates = [...card.successDates];
  const successForms = [...card.successForms];
  if (q >= 3) {
    const today = kstDateKey(now);
    if (!successDates.includes(today)) successDates.push(today);
    if (form && !successForms.includes(form)) successForms.push(form);
  }
  if (q < 3) {
    // 틀리면 사다리를 한 칸만 내린다. 0으로 되돌리면 같은 용어가 계속 되돌아온다.
    repetitions = Math.max(0, repetitions - 1);
    lapses += 1;
    interval = relearnInterval(lapses);
  } else {
    repetitions += 1;
    interval = intervalFor(repetitions);
  }
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  ease = Math.max(1.3, ease);
  const dueAt = addDays(kstDateKey(now), interval);
  return {
    ...card,
    ease,
    interval,
    repetitions,
    lapses,
    dueAt,
    lastQuality: q,
    updatedAt: now.toISOString(),
    successDates: successDates.slice(-8),
    successForms,
  };
}

/**
 * 추가 세션에서 아직 복습일이 아닌 카드를 풀었을 때.
 *
 * 일정을 앞당기지 않는다. 미리 풀 때마다 사다리를 올려 주면 하루 많이 공부한 사람의
 * 간격이 1→2→6→15가 아니라 하루 만에 다 소모되어, 정작 며칠 뒤에 복습이 사라진다.
 * 그래서 횟수와 다음 날짜는 그대로 두고 맞힌 날짜와 형태만 남긴다.
 */
export function practice(
  card: SrsCard,
  correct: boolean,
  now = new Date(),
  form?: RetrievalForm,
): SrsCard {
  if (!correct) return { ...card, updatedAt: now.toISOString() };
  const today = kstDateKey(now);
  const successDates = card.successDates.includes(today)
    ? card.successDates
    : [...card.successDates, today].slice(-8);
  const successForms =
    form && !card.successForms.includes(form) ? [...card.successForms, form] : card.successForms;
  return { ...card, successDates, successForms, updatedAt: now.toISOString() };
}

/**
 * 다음에 언제 다시 나오는지.
 *
 * `다음 복습은 2일 뒤입니다`는 우리 일정표를 읽어 준 문장이다. 사용자가 알고 싶은
 * 것은 일정의 이름이 아니라 이 용어를 언제 또 만나는지다. 만나는 쪽으로 적는다.
 */
export function dueLabel(days: number): string {
  if (days <= 0) return "오늘 다시 나와요";
  if (days === 1) return "내일 다시 나와요";
  return `${days}일 뒤에 다시 나와요`;
}

/** 예전 SM-2로 수개월까지 밀린 카드를 현재 사다리 안으로 당긴다. */
export function clampCardSchedule(card: SrsCard, now = new Date()): SrsCard {
  if (isGraduated(card)) return card;
  const interval = Math.min(Math.max(card.interval, card.repetitions >= 1 ? 1 : 0), MAX_INTERVAL_DAYS);
  const remaining = daysUntil(card.dueAt, now);
  if (remaining <= interval && card.interval === interval) return card;
  const dueAt = remaining <= 0 ? card.dueAt : addDays(kstDateKey(now), interval || 1);
  return { ...card, interval, dueAt };
}

export function daysUntil(dueAt: string, now = new Date()): number {
  const a = startOfKst(now).getTime();
  const [y, m, d] = dueAt.split("-").map(Number);
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86_400_000);
}
