import { canonBokId, reportTermById } from "../content/reportLexicon";
import { displayTitle, normalizeQuery } from "./hangul";
import type { Term } from "../types";

export { resolveChainHref } from "./termPreview";

export function labelFor(id: string, terms: Term[]): string {
  const want = canonBokId(id);
  const t = terms.find((x) => x.id === want);
  if (t) return displayTitle(t);
  const r = reportTermById(id);
  if (r) return r.abbr ? `${r.headword} (${r.abbr})` : r.headword;
  return id;
}

function compact(s: string): string {
  return normalizeQuery(s).replace(/\s+/g, "");
}

/**
 * 지금 보는 용어와 같은 말, 또는 그 말의 짧은 이름은 관련 칩에서 뺀다.
 * `제로금리정책` 옆에 `제로금리`가 있으면 다른 용어인지 의문이 생긴다.
 */
export function relatedLabels(term: Term, items: string[]): string[] {
  const self = compact(term.headword);
  return items.filter((x) => {
    const n = compact(x);
    if (!n || n === self) return false;
    if (n.length >= 4 && self.startsWith(n)) return false;
    if (self.length >= 4 && n.startsWith(self)) return false;
    return true;
  });
}
