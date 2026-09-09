import { ARTICLE_PEEK_NOTES } from "../content/peekNotes";
import { whyTogether } from "../content/related";
import {
  REPORT_BOK_CANON,
  REPORT_ESSENTIALS,
  canonBokId,
  reportTermById,
  reportToTerm,
} from "../content/reportLexicon";
import { displayTitle, normalizeQuery } from "./hangul";
import type { Term } from "../types";

export type PeekContext = "related" | "in_article" | "flow";
export type PeekSource = "bok" | "report";

export interface PeekQuery {
  id?: string;
  label: string;
  fromId?: string;
  context?: PeekContext;
  /** 브리핑·짧은 읽기 id. 있으면 `이 글에서는` 한 줄을 붙인다. */
  articleId?: string;
  contextReason?: string;
}

export interface TermPreview {
  id: string;
  title: string;
  summary: string;
  sourceType: PeekSource;
  detailRoute: string;
  relationCaption: string | null;
  relationReason: string | null;
}

function compact(s: string): string {
  return normalizeQuery(s).replace(/\s+/g, "");
}

function nameKeys(headword: string, extra: (string | undefined | null)[]): string[] {
  const keys = [headword, ...extra.filter((x): x is string => Boolean(x && x.trim()))];
  const abbr = extra.find((x) => x && /^[A-Za-z%p]+$/i.test(x.trim()));
  if (headword && abbr) keys.push(`${headword} (${abbr})`);
  return keys;
}

function keysMatch(query: string, keys: string[]): boolean {
  const n = compact(query);
  if (!n) return false;
  return keys.some((k) => compact(k) === n);
}

function summaryOf(term: Term): string | null {
  const s = term.oneLiner || term.easyExplanation || term.shortDef;
  return s?.trim() ? s.trim() : null;
}

function bokTerm(id: string, terms: Term[]): Term | undefined {
  const want = canonBokId(id);
  return terms.find((t) => t.id === want || t.id === id);
}

function reportAsTerm(id: string): Term | undefined {
  const r = reportTermById(id.startsWith("rpt-") ? id : id);
  if (r) return reportToTerm(r);
  const byLabel = REPORT_ESSENTIALS.find((t) =>
    keysMatch(id, nameKeys(t.headword, [t.id, t.abbr, ...t.aliases])),
  );
  return byLabel ? reportToTerm(byLabel) : undefined;
}

function findByLabel(label: string, terms: Term[]): { term: Term; sourceType: PeekSource } | null {
  const bok = terms.find((t) =>
    keysMatch(label, nameKeys(t.headword, [t.id, t.abbr, t.enName, ...t.pairHeadwords, ...t.aliases])),
  );
  if (bok) return { term: bok, sourceType: "bok" };
  const rpt = REPORT_ESSENTIALS.find((t) =>
    keysMatch(label, nameKeys(t.headword, [t.id, t.abbr, ...t.aliases])),
  );
  if (rpt) {
    const canon = REPORT_BOK_CANON[rpt.id];
    if (canon) {
      const mapped = bokTerm(canon, terms);
      if (mapped) return { term: mapped, sourceType: "bok" };
    }
    return { term: reportToTerm(rpt), sourceType: "report" };
  }
  return null;
}

function detailRoute(term: Term, sourceType: PeekSource): string {
  if (sourceType === "report" || term.id.startsWith("rpt-")) {
    const bok = REPORT_BOK_CANON[term.id];
    if (bok) return `/terms/${encodeURIComponent(bok)}`;
    return `/lexicon/${term.id}`;
  }
  return `/terms/${encodeURIComponent(term.id)}`;
}

const CAPTION: Record<PeekContext, string> = {
  related: "왜 같이 보나요?",
  in_article: "이 글에서는",
  flow: "어떻게 이어지나요?",
};

function relationReason(query: PeekQuery, term: Term): string | null {
  if (query.contextReason?.trim()) return query.contextReason.trim();
  if (query.articleId) {
    const notes = ARTICLE_PEEK_NOTES[query.articleId];
    const byId = notes?.[query.id ?? ""] || notes?.[term.id];
    if (byId) return byId;
  }
  if (!query.fromId) return null;
  const names = [query.label, term.headword, term.abbr ?? "", displayTitle(term), term.id];
  for (const n of names) {
    if (!n) continue;
    const why = whyTogether(query.fromId, n);
    if (why) return why;
  }
  return null;
}

/**
 * 학습·읽기 미리보기용 한 장.
 * 화면은 Core/한은/리포트 출처를 몰라도 된다. 제목+요약이 없으면 null.
 */
export function resolveTermPreview(query: PeekQuery, terms: Term[]): TermPreview | null {
  let found: { term: Term; sourceType: PeekSource } | null = null;
  if (query.id) {
    const bok = bokTerm(query.id, terms);
    if (bok) found = { term: bok, sourceType: "bok" };
    else {
      const rpt = reportAsTerm(query.id);
      if (rpt) found = { term: rpt, sourceType: rpt.id.startsWith("rpt-") ? "report" : "bok" };
    }
  }
  if (!found) found = findByLabel(query.label, terms);
  if (!found) return null;
  const summary = summaryOf(found.term);
  if (!summary) return null;
  const ctx = query.context;
  const reason = relationReason(query, found.term);
  return {
    id: found.term.id,
    title: displayTitle(found.term),
    summary,
    sourceType: found.sourceType,
    detailRoute: detailRoute(found.term, found.sourceType),
    relationCaption: ctx && reason ? CAPTION[ctx] : null,
    relationReason: ctx && reason ? reason : null,
  };
}

/** 체인/칩 라벨을 상세 경로로. 미리보기와 같은 매칭을 쓴다. */
export function resolveChainHref(label: string, terms: Term[]): string | null {
  return resolveTermPreview({ label }, terms)?.detailRoute ?? null;
}
