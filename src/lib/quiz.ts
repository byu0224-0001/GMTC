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

export function makeFirstRecall(term: Term, pool: Term[], seed: number): DrillItem {
  const item = makeRecall(term, pool, seed);
  const base = (term.oneLiner || term.easyExplanation || term.shortDef).replace(/입니다\.?$/, "").replace(/\.$/, "");
  return {
    ...item,
    prompt: `${base}. 이 설명에 해당하는 용어는 무엇일까요?`,
  };
}

function makeRecall(term: Term, pool: Term[], seed: number): DrillItem {
  const foils = pickDistractors(term, pool, 3, seed);
  const { choices, answerId } = packChoices(term, foils, seed);
  return {
    kind: "recall",
    termId: term.id,
    prompt: term.oneLiner || term.easyExplanation || term.shortDef,
    caption: "",
    choices,
    answerId,
    note: term.oneLiner || term.easyExplanation,
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
    note: term.commonConfusions[0] || term.oneLiner,
  };
}

function makeCloze(term: Term, pool: Term[], seed: number): DrillItem {
  const spec = CLOZE[term.id];
  const foils = resolveFoils(spec?.foilIds ?? [], pool, term, seed);
  const { choices, answerId } = packChoices(term, foils, seed);
  if (spec) {
    return {
      kind: "cloze",
      termId: term.id,
      prompt: `${spec.before}□□${spec.after}`,
      caption: "",
      choices,
      answerId,
      note: term.oneLiner,
    };
  }
  const needle = [term.headword, term.abbr ?? ""].find((k) => k && term.easyExplanation.includes(k));
  if (needle) {
    const i = term.easyExplanation.indexOf(needle);
    const before = term.easyExplanation.slice(0, i);
    const after = term.easyExplanation.slice(i + needle.length);
    return {
      kind: "cloze",
      termId: term.id,
      prompt: `${before}□□${after}`,
      caption: "",
      choices,
      answerId,
      note: term.oneLiner,
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
