import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { RelatedConcepts } from "./Chrome";
import { alsoCalled } from "../content/alsoCalled";
import { TAXONOMY_LABEL, type Taxonomy } from "../content/literacy";
import { displayTitle } from "../lib/hangul";
import type { Term } from "../types";

function compactKey(s: string): string {
  return s.normalize("NFKC").replace(/[\s·ㆍ\-_/()]/g, "");
}

export function sourceLooksAligned(term: Pick<Term, "definition" | "headword" | "abbr" | "enName">): boolean {
  const official = compactKey(term.definition?.trim() ?? "");
  if (!official) return false;
  return [term.headword, term.abbr, term.enName].some(
    (k) => Boolean(k && compactKey(k).length >= 2 && official.includes(compactKey(k))),
  );
}

function firstSentence(s: string): string {
  return s.split(/(?<=[다요]\.)\s+/).filter(Boolean)[0]?.trim() ?? s.trim();
}

/**
 * 오늘 학습의 신규 카드.
 * 한 줄 뜻과 짧은 보충만 연다. 사전 깊이는 `조금 더 알아보기`로 보낸다.
 */
export function TermLearnCard({
  term,
  terms,
  topic,
  relatedPreview = true,
  moreHref = true,
  children,
}: {
  term: Term;
  terms: Term[];
  topic?: string | null;
  relatedPreview?: boolean;
  moreHref?: boolean;
  children?: ReactNode;
}) {
  const taxLabel = topic ? TAXONOMY_LABEL[topic as Taxonomy] ?? topic : null;
  const also = alsoCalled(term.id);
  const official = term.definition?.trim();
  const aligned = sourceLooksAligned(term);
  const support = term.whyItMatters ? firstSentence(term.whyItMatters) : "";
  const showSupport = Boolean(support && support !== term.oneLiner.trim());

  return (
    <div className="card pad-lg">
      <div className="caption">{taxLabel ?? term.category}</div>
      <div className="term-title" style={{ marginTop: 12 }}>{displayTitle(term)}</div>
      {term.enName ? <div className="muted">{term.enName}</div> : null}
      {also.length ? (
        <div className="caption" style={{ marginTop: 8, letterSpacing: 0 }}>
          기사에서는 {also.join(" · ")}라고도 해요
        </div>
      ) : null}
      {term.oneLiner ? (
        <p style={{ marginTop: 16, fontWeight: 500, lineHeight: 1.65 }}>{term.oneLiner}</p>
      ) : null}
      {showSupport ? <p className="muted" style={{ marginTop: 12, lineHeight: 1.65 }}>{support}</p> : null}
      {relatedPreview ? <RelatedConcepts term={term} terms={terms} preview /> : <RelatedConcepts term={term} terms={terms} />}
      {moreHref ? (
        <Link
          to={`/terms/${encodeURIComponent(term.id)}`}
          className="text-link"
          style={{ display: "inline-flex", minHeight: "var(--touch-min)", alignItems: "center", marginTop: 8 }}
        >
          조금 더 알아보기
        </Link>
      ) : null}
      {aligned && official ? (
        <details className="official-fold" style={{ marginTop: 12 }}>
          <summary>한국은행 원문 보기</summary>
          <p className="muted" style={{ margin: 0 }}>{official}</p>
        </details>
      ) : null}
      {children}
    </div>
  );
}

/** 정답 뒤에 제목만 남지 않게, 한 줄 뜻은 항상 붙인다. */
export function AnswerFeedback({
  term,
  note,
}: {
  term: Term;
  note: string;
}) {
  const title = displayTitle(term);
  const also = alsoCalled(term.id)[0];
  const identity = term.oneLiner.trim();
  const extra = note.trim();
  const showExtra = extra && extra !== identity;
  const confusion = term.commonConfusions[0];
  const confusionAlready = Boolean(
    confusion && (extra.includes(confusion) || identity.includes(confusion)),
  );

  return (
    <>
      <p className="why">
        <strong>
          {title}
          {also ? `(${also})` : ""}
        </strong>
        {identity ? ` ${identity}` : extra ? ` ${extra}` : ""}
      </p>
      {showExtra && identity ? <p className="why">{extra}</p> : null}
      {confusion && !confusionAlready && !showExtra ? (
        <p className="why"><strong>헷갈리기 쉬운 점</strong> {confusion}</p>
      ) : null}
    </>
  );
}
