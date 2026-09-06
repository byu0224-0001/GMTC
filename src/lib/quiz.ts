import { CLOZE, CONTRAST, MISCONCEPTIONS } from "../content/drills";
import { CONTEXT_CASES } from "../content/literacy";
import { learningPool, maskLenient } from "./pool";
import type { DrillItem, RetrievalForm, SrsCard, Term } from "../types";
import { displayTitle } from "./hangul";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 같은 분야에서 먼저 고른다. 분야가 다르면 정답을 몰라도 지워낼 수 있어 문제가 쉬워진다. */
/**
 * 개념의 종류. 표제어 끝에 붙는 말로 가른다.
 *
 * 같은 분야라는 것만으로는 오답이 그럴듯해지지 않는다. `경기·성장` 분야에는
 * 잠재GDP성장률과 청년실업률, 연구개발이 함께 들어 있다. 이 셋을 한 문항에 놓으면
 * 사용자는 개념을 몰라도 `성장률을 묻는데 연구개발은 아니겠지`로 지워 낸다.
 * 그건 학습이 아니라 소거법이다.
 *
 * 우리 사용자는 완전히 모르는 게 아니라 `이거였나 저거였나` 상태다. 그래서 오답은
 * 같은 종류여야 한다. 성장률에는 다른 성장률을, 제도에는 다른 제도를 놓는다.
 */
const KIND_PATTERNS: RegExp[] = [
  /(성장률|증가율)$/,
  /(실업률|고용률|참가율|취업률)$/,
  /(물가|물가지수|인플레이션|인플레이션율)$/,
  /(제도|제)$/,
  /(정책|운영|기능|정책수단)$/,
  /(금리|이자율|수익률)$/,
  /(지수)$/,
  /(비율|배율|배수|율)$/,
  /(채|채권)$/,
  /(시장)$/,
  /(수지|잔액|총량|통화)$/,
  /(옵션|선물|스왑|파생상품)$/,
  /(인구|가구)$/,
  /(소득|임금|보수)$/,
  /(자산|부채|자본)$/,
  /(세|조세|부담금)$/,
  /(환율|환율제도)$/,
  /(펀드|신탁)$/,
  /(은행|기관|기구)$/,
];

function kindOf(t: Term): string | null {
  for (const re of KIND_PATTERNS) {
    if (re.test(t.headword)) return re.source;
  }
  return null;
}

/**
 * 표제어가 공유하는 말토막.
 *
 * `이거였나 저거였나` 하는 짝은 대개 이름 일부를 나눠 쓴다. 광의통화와 협의통화,
 * 고정환율제도와 변동환율제도, 경제성장률과 잠재GDP성장률처럼. 이름이 겹치면
 * 사용자는 이름만으로 지워 낼 수 없고 뜻을 따져야 한다. 그게 우리가 원하는 상태다.
 *
 * 두 글자로 본다. 한 글자는 `금`이나 `자`처럼 아무 데나 걸려 소용이 없다.
 */
function sharesMorpheme(a: string, b: string): boolean {
  for (let i = 0; i + 2 <= a.length; i += 1) {
    const piece = a.slice(i, i + 2);
    if (!/^[가-힣]{2}$/.test(piece)) continue;
    if (b.includes(piece)) return true;
  }
  return false;
}

export function pickDistractors(answer: Term, pool: Term[], n: number, seed: number): Term[] {
  const topicOf = (t: Term) => learningPool(pool).byId.get(t.id)?.topic ?? t.taxonomy ?? t.category;
  const want = topicOf(answer);
  const wantKind = kindOf(answer);
  const same = pool.filter((t) => t.id !== answer.id && topicOf(t) === want);
  const rest = pool.filter((t) => t.id !== answer.id);
  /**
   * 헷갈릴 만한 것을 먼저 쓰고, 모자라면 같은 분야, 그다음 전체로 넓힌다.
   * 넓히는 순서를 두지 않으면 후보가 적은 분야에서 문항이 아예 안 만들어진다.
   */
  const confusable = same.filter(
    (t) =>
      (wantKind && kindOf(t) === wantKind) || sharesMorpheme(answer.headword, t.headword),
  );
  const picked: Term[] = [];
  for (const src of [confusable, same, rest]) {
    for (const t of seededShuffle(src, seed)) {
      if (picked.length >= n) break;
      if (picked.some((p) => p.id === t.id)) continue;
      if (t.headword === answer.headword) continue;
      picked.push(t);
    }
  }
  return picked.slice(0, n);
}

function byId(pool: Term[]): Map<string, Term> {
  return new Map(pool.map((t) => [t.id, t]));
}

function choiceRow(term: Term, i: number) {
  return { id: `c${i}`, termId: term.id, label: displayTitle(term) };
}

function packChoices(answer: Term, foils: Term[], seed: number) {
  const raw = [answer, ...foils.slice(0, 3)].map((t, i) => choiceRow(t, i));
  const choices = seededShuffle(raw, seed + 7);
  const answerId = choices.find((c) => c.termId === answer.id)!.id;
  return { choices, answerId };
}

function resolveFoils(ids: string[], pool: Term[], answer: Term, seed: number): Term[] {
  const map = byId(pool);
  const fromSpec = ids
    .map((id) => map.get(id))
    .filter((t): t is Term => t !== undefined && t.id !== answer.id);
  if (fromSpec.length >= 3) return fromSpec.slice(0, 3);
  return [...fromSpec, ...pickDistractors(answer, pool, 3 - fromSpec.length, seed)].slice(0, 3);
}

function compactText(s: string): string {
  return s.replace(/\s+/g, "").replace(/[.?!,。·]/g, "").replace(/입니다/g, "");
}

function tooSimilar(a: string, b: string): boolean {
  const x = compactText(a);
  const y = compactText(b);
  if (!x || !y) return true;
  if (x === y) return true;
  const n = Math.min(22, x.length, y.length);
  return n >= 12 && x.slice(0, n) === y.slice(0, n);
}

/**
 * 두 문장이 결국 같은 말인지.
 *
 * 앞부분만 비교하면 `커졌다고 가계가 모두 넉넉해졌다는 뜻은 아니에요`와
 * `GDP가 늘었다고 가계가 모두 부유해진 것은 아니에요`가 서로 다른 문장으로
 * 통과한다. 둘을 나란히 붙이면 사용자는 같은 말을 두 번 읽는다.
 * 그래서 낱말이 얼마나 겹치는지로 본다.
 */
function saysSame(a: string, b: string): boolean {
  const words = (s: string) => new Set(s.match(/[가-힣A-Za-z]{2,}/g) ?? []);
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return false;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared += 1;
  return shared / new Set([...x, ...y]).size >= 0.3;
}

/**
 * 정답을 고른 뒤 보여 줄 해설.
 *
 * 우리 사용자는 이 개념을 처음 듣는 사람이 아니다. `들어본 말인데 막상 설명하거나
 * 기사에서 해석하려면 막히는 사람`이다. 그래서 정답을 맞힌 뒤에 필요한 것은
 * 정의를 한 번 더 듣는 것도, 헷갈리지 말라는 경고도 아니라
 * **그래서 이걸 어떻게 읽으면 되는지**다.
 *
 * 예전에는 `commonConfusions`를 1순위로 썼다. 그래서 디스인플레이션을 맞힌 뒤에
 * `디플레이션과 바꿔 쓰지 않습니다`만 나왔다. 틀린 말은 아니지만 얻는 게 없다.
 * 순서를 바꿔 해석 문장을 먼저 쓰고, 혼동 경고는 뒤에 덧붙인다.
 *
 * 문항이 이미 정의를 말했으므로 그 문장과 겹치는 후보는 버린다.
 */
function explanationNote(term: Term, prompt: string): string {
  // 그래서 어떻게 읽는지. 이게 이 사용자에게 가장 값어치 있는 문장이다.
  const reading = [term.whyItMatters, term.keyPoints[0], term.easyExplanation].find(
    (s) => s && !tooSimilar(s, prompt),
  );
  /*
   * 해설은 두 문장까지다.
   *
   *   첫째, 이게 정확히 무엇인지 — 문항이 이미 말했으므로 생략한다
   *   둘째, 그래서 어떻게 읽는지
   *   셋째, 혼동 가능성이 높을 때만 차이
   *
   * 그래서 해석이 이미 두 문장이면 혼동 경고를 붙이지 않는다. 5분짜리 세션에서
   * 한 문항의 해설이 세 문장을 넘으면 그냥 안 읽는다. 붙일 때도 해석의 어느
   * 문장과도 같은 말이 아닐 때만 붙인다.
   */
  const confusion = term.commonConfusions[0];
  const readingSentences = reading ? reading.split(/(?<=[다요]\.)\s+/).filter(Boolean) : [];
  const worthAdding =
    reading &&
    confusion &&
    readingSentences.length < 2 &&
    !tooSimilar(confusion, prompt) &&
    !readingSentences.some((s) => saysSame(confusion, s));
  if (worthAdding) return `${reading} ${confusion}`;
  if (reading) return reading;
  if (confusion && !tooSimilar(confusion, prompt)) return confusion;
  return term.whyItMatters || term.easyExplanation || confusion || "";
}

/** 앞말의 끝소리에 따라 조사를 고른다. `듀레이션은` / `국채는`. */
export function withJosa(word: string, pair: "은는" | "이가" | "이에요"): string {
  const last = word.at(-1) ?? "";
  const code = last.codePointAt(0) ?? 0;
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  // 한글이 아니면(PER, ETF 같은 약어) 받침을 알 수 없으니 안전한 쪽을 쓴다.
  const hasFinal = hangul ? (code - 0xac00) % 28 !== 0 : true;
  if (pair === "은는") return `${word}${hasFinal ? "은" : "는"}`;
  if (pair === "이가") return `${word}${hasFinal ? "이" : "가"}`;
  return `${word}${hasFinal ? "이에요" : "예요"}`;
}

/**
 * 오답을 골랐을 때 보여 줄, 고른 것과 정답의 차이.
 *
 * `틀렸어요`만 보여 주면 사용자는 왜 아닌지를 모른 채 넘어간다. 정답 설명만
 * 보여 줘도 자기가 왜 그걸 골랐는지는 그대로 남는다. 우리 사용자는 완전히
 * 모르는 게 아니라 두 개념을 맞바꿔 알고 있는 상태이므로, 필요한 것은
 * **내가 고른 것이 실제로 무엇인지**다.
 *
 *     기대인플레이션 문항에서 `인플레이션`을 골랐다면
 *     → 인플레이션은 물건 값이 실제로 오르는 현상이에요.
 *       앞으로 얼마나 오를 것으로 예상하는지는 기대인플레이션이에요.
 */
export function differenceNote(pickedTerm: Term, answerTerm: Term): string | null {
  if (pickedTerm.id === answerTerm.id) return null;
  const what = pickedTerm.oneLiner || pickedTerm.shortDef;
  if (!what) return null;
  return `${withJosa(displayTitle(pickedTerm), "은는")} ${what} 여기서 물어본 것은 ${withJosa(displayTitle(answerTerm), "이에요")}.`;
}

/**
 * 문항에 쓸 설명 문장.
 * 자체 원고가 있으면 그것을, 없으면 한국은행 원문 정의문을 쓴다.
 * 어느 쪽이든 표제어는 가린다. 원문 설명은 표제어를 그대로 품고 있어
 * 가리지 않으면 정답이 문제에 적혀 있는 셈이 된다.
 */
export function promptTextFor(term: Term, pool: Term[]): string | null {
  return promptVariantsFor(term, pool)[0] ?? null;
}

/**
 * 같은 용어를 여러 번 물을 때 쓸, 서로 다른 설명 문장.
 * 형태를 바꿀 수 없는 용어라도 문장 표현은 바뀌게 해서 문항을 그대로 되풀이하지 않는다.
 */
export function promptVariantsFor(term: Term, pool: Term[]): string[] {
  const out: string[] = [];
  const push = (s: string | null | undefined) => {
    if (!s) return;
    const masked = maskLenient(term, s);
    if (masked.length < 12) return;
    if (out.some((x) => tooSimilar(x, masked))) return;
    out.push(masked);
  };
  push(term.oneLiner);
  push(term.easyExplanation);
  const official = learningPool(pool).byId.get(term.id)?.officialPrompt;
  if (official && !out.some((x) => tooSimilar(x, official))) out.push(official);
  return out;
}

function contextCaseFor(termId: string) {
  return CONTEXT_CASES.find((c) => c.answerTermId === termId);
}

/** 용어마다 어떤 형태를 지원하는지. 손으로 적지 않고 있는 자료에서 끌어낸다. */
export function formsFor(term: Term, pool: Term[]): RetrievalForm[] {
  const forms: RetrievalForm[] = [];
  const text = promptTextFor(term, pool);
  if (text) {
    forms.push("recognition");
    forms.push("recall");
  }
  if (CONTRAST[term.id]) forms.push("contrast");
  if (MISCONCEPTIONS[term.id]) forms.push("judgment");
  if (contextCaseFor(term.id)) forms.push("context");
  return forms;
}

/**
 * 시간축 분산.
 * 같은 날 한 용어를 여러 형태로 반복하면 다양성이 아니라 피로가 된다.
 * 복습 횟수가 늘 때마다 형태를 한 칸씩 옮긴다.
 */
const FORM_LADDER: RetrievalForm[][] = [
  ["recognition"],
  ["recall"],
  ["contrast", "recall"],
  ["judgment", "context", "contrast", "recall"],
];

export function formFor(term: Term, pool: Term[], card: SrsCard | undefined): RetrievalForm {
  const available = new Set(formsFor(term, pool));
  const step = Math.min(card?.repetitions ?? 0, FORM_LADDER.length - 1);
  for (let i = step; i >= 0; i -= 1) {
    const hit = FORM_LADDER[i].find((f) => available.has(f));
    if (hit) return hit;
  }
  return "recall";
}

/**
 * 문제 유형 이름.
 *
 * 사용자가 화면에서 실제로 하는 일로 적는다. `용어 떠올리기`는 우리가 안에서 쓰는
 * 이름(recall)을 그대로 옮긴 것이었는데, 화면에서 사용자는 떠올리는 게 아니라
 * 설명을 읽고 넷 중 하나를 고른다. 내부 이름과 화면 이름이 같아야 할 이유는 없다.
 */
const CAPTION: Record<RetrievalForm, string> = {
  recognition: "뜻 맞히기",
  recall: "설명 보고 맞히기",
  contrast: "헷갈리는 개념 구분하기",
  judgment: "맞을까?",
  context: "문장에서 찾기",
};

function shorten(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** 용어 → 뜻. 설명 네 개를 나란히 두므로 짧은 것만 쓴다. */
function makeRecognition(term: Term, pool: Term[], seed: number): DrillItem | null {
  const own = promptTextFor(term, pool);
  if (!own || own.length > 84) return null;
  const foils = pickDistractors(term, pool, 6, seed)
    .map((t) => ({ term: t, text: promptTextFor(t, pool) }))
    .filter((x): x is { term: Term; text: string } => Boolean(x.text) && x.text!.length <= 84)
    .slice(0, 3);
  if (foils.length < 3) return null;
  const raw = [
    { id: "c0", termId: term.id, label: own },
    ...foils.map((f, i) => ({ id: `c${i + 1}`, termId: f.term.id, label: f.text })),
  ];
  const choices = seededShuffle(raw, seed + 11);
  return {
    kind: "recognition",
    termId: term.id,
    prompt: `${displayTitle(term)}의 설명으로 알맞은 것은?`,
    caption: CAPTION.recognition,
    choices,
    answerId: choices.find((c) => c.termId === term.id)!.id,
    note: explanationNote(term, own),
  };
}

/** 뜻 → 용어. 복습 횟수에 따라 설명 문장을 바꾼다. */
function makeRecall(term: Term, pool: Term[], seed: number, variant = 0): DrillItem {
  const specFoils = CONTRAST[term.id]?.foilIds ?? [];
  const foils =
    specFoils.length > 0
      ? resolveFoils(specFoils, pool, term, seed)
      : pickDistractors(term, pool, 3, seed);
  const { choices, answerId } = packChoices(term, foils, seed);
  const variants = promptVariantsFor(term, pool);
  const prompt = variants.length ? variants[variant % variants.length] : term.shortDef;
  return {
    kind: "recall",
    termId: term.id,
    prompt,
    caption: CAPTION.recall,
    choices,
    answerId,
    note: explanationNote(term, prompt),
  };
}

export function makeFirstRecall(term: Term, pool: Term[], seed: number): DrillItem {
  return makeRecognition(term, pool, seed) ?? makeRecall(term, pool, seed);
}

function makeContrast(term: Term, pool: Term[], seed: number): DrillItem {
  const spec = CONTRAST[term.id];
  if (!spec) return makeRecall(term, pool, seed);
  const foils = resolveFoils(spec.foilIds, pool, term, seed);
  const { choices, answerId } = packChoices(term, foils, seed);
  return {
    kind: "contrast",
    termId: term.id,
    prompt: spec.question,
    caption: CAPTION.contrast,
    choices,
    answerId,
    note: explanationNote(term, spec.question),
  };
}

/** 흔한 오해를 O/X로 짚는다. 해설이 본체이므로 두 갈래로 충분하다. */
function makeJudgment(term: Term, pool: Term[], seed: number): DrillItem {
  const spec = MISCONCEPTIONS[term.id];
  if (!spec) return makeRecall(term, pool, seed);
  const rows = [
    { id: "yes", termId: term.id, label: "맞다" },
    { id: "no", termId: term.id, label: "틀리다" },
  ];
  return {
    kind: "judgment",
    termId: term.id,
    prompt: spec.claim,
    caption: CAPTION.judgment,
    choices: rows,
    answerId: spec.correct ? "yes" : "no",
    note: spec.why,
  };
}

/** 짧은 상황에서 개념을 알아본다. 읽기 탭의 사례를 그대로 쓴다. */
function makeContext(term: Term, pool: Term[], seed: number): DrillItem {
  const cse = contextCaseFor(term.id);
  if (!cse) return makeRecall(term, pool, seed);
  const map = byId(pool);
  const foils = cse.choiceIds
    .filter((id) => id !== term.id)
    .map((id) => map.get(id))
    .filter((t): t is Term => Boolean(t));
  const resolved =
    foils.length >= 3 ? foils.slice(0, 3) : [...foils, ...pickDistractors(term, pool, 3 - foils.length, seed)];
  const { choices, answerId } = packChoices(term, resolved, seed);
  return {
    kind: "context",
    termId: term.id,
    prompt: `${shorten(cse.situation, 170)}\n\n${cse.question}`,
    caption: CAPTION.context,
    choices,
    answerId,
    note: cse.why,
  };
}

function makeCloze(term: Term, pool: Term[], seed: number): DrillItem {
  const spec = CLOZE[term.id];
  if (!spec) return makeRecall(term, pool, seed);
  const foils = resolveFoils(spec.foilIds, pool, term, seed);
  const { choices, answerId } = packChoices(term, foils, seed);
  const prompt = `${spec.before}□□${spec.after}`;
  return {
    kind: "recall",
    termId: term.id,
    prompt,
    caption: CAPTION.recall,
    choices,
    answerId,
    note: explanationNote(term, prompt),
  };
}

export function makeMcq(term: Term, pool: Term[], seed: number) {
  return makeRecall(term, pool, seed);
}

export function makeDrill(term: Term, pool: Term[], card: SrsCard | undefined, seed: number): DrillItem {
  switch (formFor(term, pool, card)) {
    case "recognition":
      return makeRecognition(term, pool, seed) ?? makeRecall(term, pool, seed);
    case "contrast":
      return makeContrast(term, pool, seed);
    case "judgment":
      return makeJudgment(term, pool, seed);
    case "context":
      return makeContext(term, pool, seed);
    default: {
      // 형태를 바꿀 수 없는 용어는 문장 빈칸이나 다른 설명 문장으로 바꾼다.
      const reps = card?.repetitions ?? 0;
      if (reps >= 2 && CLOZE[term.id]) return makeCloze(term, pool, seed);
      return makeRecall(term, pool, seed, Math.max(0, reps - 1));
    }
  }
}

export function hashDay(termId: string, dayKey: string): number {
  return hash(`${termId}:${dayKey}`);
}
