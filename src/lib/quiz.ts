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
export function pickDistractors(answer: Term, pool: Term[], n: number, seed: number): Term[] {
  const topicOf = (t: Term) => learningPool(pool).byId.get(t.id)?.topic ?? t.taxonomy ?? t.category;
  const want = topicOf(answer);
  const same = pool.filter((t) => t.id !== answer.id && topicOf(t) === want);
  const rest = pool.filter((t) => t.id !== answer.id);
  const picked: Term[] = [];
  for (const src of [same, rest]) {
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

/** 문제 문장과 겹치지 않는 해설. 정의 반복을 피한다. */
function explanationNote(term: Term, prompt: string): string {
  const candidates = [
    term.commonConfusions[0],
    term.whyItMatters,
    term.easyExplanation,
    term.keyPoints[0],
  ].filter((s): s is string => Boolean(s));
  for (const s of candidates) {
    if (!tooSimilar(s, prompt)) return s;
  }
  return term.commonConfusions[0] || term.whyItMatters || term.easyExplanation || "";
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

const CAPTION: Record<RetrievalForm, string> = {
  recognition: "뜻 고르기",
  recall: "용어 떠올리기",
  contrast: "비슷한 개념 구분",
  judgment: "맞는 설명인지 판단",
  context: "짧은 상황에 적용",
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
