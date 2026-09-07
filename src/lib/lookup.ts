import { REPORT_BOK_CANON, REPORT_ESSENTIALS, canonBokId, reportTermById } from "../content/reportLexicon";
import { displayTitle, normalizeQuery } from "./hangul";
import type { Term } from "../types";

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

/** chain 라벨을 사전/리포트 표현 상세로 연결. 못 찾으면 null. */
export function resolveChainHref(label: string, terms: Term[]): string | null {
  const n = compact(label);
  if (!n) return null;
  const hit = terms.find((t) => {
    const keys = [t.headword, t.abbr ?? "", t.enName ?? "", ...t.pairHeadwords, ...t.aliases];
    return keys.some((k) => k && compact(k) === n);
  });
  if (hit) return `/terms/${encodeURIComponent(hit.id)}`;
  const rpt = REPORT_ESSENTIALS.find((t) => {
    const keys = [t.headword, t.abbr ?? "", ...t.aliases];
    return keys.some((k) => k && compact(k) === n);
  });
  if (rpt) {
    const bok = REPORT_BOK_CANON[rpt.id];
    if (bok) return `/terms/${encodeURIComponent(bok)}`;
    return `/lexicon/${rpt.id}`;
  }
  return null;
}
