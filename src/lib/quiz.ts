import { CLOZE, CONTRAST, drillKindFor } from "../content/drills";
import type { DrillItem, SrsCard, Term } from "../types";
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

export function pickDistractors(answer: Term, pool: Term[], n: number, seed: number): Term[] {
  const same = pool.filter(
    (t) => t.id !== answer.id && (t.taxonomy ?? t.category) === (answer.taxonomy ?? answer.category),
  );
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

export function makeMcq(term: Term, pool: Term[], seed: number) {
  return makeRecall(term, pool, seed);
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
  const pool = [term.commonConfusions[0], term.whyItMatters, term.easyExplanation, term.keyPoints[0]].filter(
    (s): s is string => Boolean(s),
  );
  for (const s of pool) {
    if (!tooSimilar(s, prompt)) return s;
  }
  return term.commonConfusions[0] || term.whyItMatters || term.easyExplanation || "";
}

export function makeFirstRecall(term: Term, pool: Term[], seed: number): DrillItem {
  const item = makeRecall(term, pool, seed);
  const base = (term.oneLiner || term.easyExplanation || term.shortDef).replace(/입니다\.?$/, "").replace(/\.$/, "");
  const prompt = `${base}. 이 설명에 해당하는 용어는 무엇일까요?`;
  return {
    ...item,
    prompt,
    note: explanationNote(term, prompt),
  };
}

function makeRecall(term: Term, pool: Term[], seed: number): DrillItem {
  const foils = pickDistractors(term, pool, 3, seed);
  const { choices, answerId } = packChoices(term, foils, seed);
  const prompt = term.oneLiner || term.easyExplanation || term.shortDef;
  return {
    kind: "recall",
    termId: term.id,
    prompt,
    caption: "",
    choices,
    answerId,
    note: explanationNote(term, prompt),
  };
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
    caption: "",
    choices,
    answerId,
    note: explanationNote(term, spec.question),
  };
}

function makeCloze(term: Term, pool: Term[], seed: number): DrillItem {
  const spec = CLOZE[term.id];
  const foils = resolveFoils(spec?.foilIds ?? [], pool, term, seed);
  const { choices, answerId } = packChoices(term, foils, seed);
  if (spec) {
    const prompt = `${spec.before}□□${spec.after}`;
    return {
      kind: "cloze",
      termId: term.id,
      prompt,
      caption: "",
      choices,
      answerId,
      note: explanationNote(term, prompt),
    };
  }
  const needle = [term.headword, term.abbr ?? ""].find((k) => k && term.easyExplanation.includes(k));
  if (needle) {
    const i = term.easyExplanation.indexOf(needle);
    const before = term.easyExplanation.slice(0, i);
    const after = term.easyExplanation.slice(i + needle.length);
    const prompt = `${before}□□${after}`;
    return {
      kind: "cloze",
      termId: term.id,
      prompt,
      caption: "",
      choices,
      answerId,
      note: explanationNote(term, prompt),
    };
  }
  return makeRecall(term, pool, seed);
}

export function makeDrill(term: Term, pool: Term[], card: SrsCard | undefined, seed: number): DrillItem {
  const kind = drillKindFor(card);
  if (kind === "contrast") return makeContrast(term, pool, seed);
  if (kind === "cloze") return makeCloze(term, pool, seed);
  return makeRecall(term, pool, seed);
}

export function hashDay(termId: string, dayKey: string): number {
  return hash(`${termId}:${dayKey}`);
}
