import type { ChoBucket, Term } from "../types";

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

export const CHO_RAIL: ChoBucket[] = [
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅅ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
  "ABC",
];

export function railMatches(rail: ChoBucket, cho: ChoBucket): boolean {
  if (rail === "ㄱ") return cho === "ㄱ" || cho === "ㄲ";
  if (rail === "ㄷ") return cho === "ㄷ" || cho === "ㄸ";
  if (rail === "ㅂ") return cho === "ㅂ" || cho === "ㅃ";
  if (rail === "ㅅ") return cho === "ㅅ" || cho === "ㅆ";
  if (rail === "ㅈ") return cho === "ㅈ" || cho === "ㅉ";
  return cho === rail;
}

export function choOf(headword: string): ChoBucket {
  const ch = headword.trim()[0] ?? "A";
  if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "%") return "ABC";
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const idx = Math.floor((code - 0xac00) / 588);
    return (CHO[idx] ?? "ABC") as ChoBucket;
  }
  return "ABC";
}

export function normalizeQuery(q: string): string {
  return q
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s·ㆍ()]/g, "");
}

export function isChoQuery(q: string): q is ChoBucket {
  const t = q.trim();
  if (t === "ABC" || t === "abc") return true;
  return t.length === 1 && CHO.includes(t);
}

export function searchTerms(terms: Term[], q: string): Term[] {
  const raw = q.trim();
  if (!raw) return [];
  if (isChoQuery(raw)) {
    const rail = raw.toUpperCase() === "ABC" ? "ABC" : (raw as ChoBucket);
    return terms.filter((t) => railMatches(rail, t.cho));
  }
  const n = normalizeQuery(raw);
  return terms
    .map((t) => {
      const hay = [
        t.headword,
        ...t.pairHeadwords,
        ...t.aliases,
        t.abbr ?? "",
        t.enName ?? "",
        t.shortDef,
      ]
        .map(normalizeQuery)
        .join("|");
      let score = 0;
      if (normalizeQuery(t.headword).startsWith(n)) score = 3;
      else if (normalizeQuery(t.abbr ?? "") === n) score = 3;
      else if (hay.includes(n)) score = 1;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map((x) => x.t);
}

export function displayTitle(term: Term): string {
  const base = term.headword;
  const abbr = term.abbr?.trim();
  if (!abbr) return base;
  if (base.includes(`(${abbr})`) || base.includes(abbr)) return base;
  return `${base} (${abbr})`;
}
