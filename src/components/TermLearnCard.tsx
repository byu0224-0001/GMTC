import type { ReactNode } from "react";
import { RelatedConcepts } from "./Chrome";
import { alsoCalled } from "../content/alsoCalled";
import { TAXONOMY_LABEL, type Taxonomy } from "../content/literacy";
import { displayTitle } from "../lib/hangul";
import type { Term } from "../types";

export function sourceLooksAligned(term: Pick<Term, "definition" | "headword" | "abbr" | "enName">): boolean {
  const official = term.definition?.trim() ?? "";
  if (!official) return false;
  return [term.headword, term.abbr, term.enName].some(
    (k) => Boolean(k && k.length >= 2 && official.includes(k)),
  );
}

function Fold({ title, body }: { title: string; body: string }) {
  return (
    <details className="official-fold" style={{ marginTop: 12 }}>
      <summary>{title}</summary>
      <p className="muted" style={{ margin: 0 }}>{body}</p>
    </details>
  );
}

/**
 * 학습용 용어 카드.
 * 데이터는 깊어도 첫 화면은 한 줄만 연다. 원문은 접힌 근거다.
 */
export function TermLearnCard({
  term,
  terms,
  topic,
  relatedPreview = true,
  children,
}: {
  term: Term;
  terms: Term[];
  topic?: string | null;
  relatedPreview?: boolean;
  children?: ReactNode;
}) {
  const taxLabel = topic ? TAXONOMY_LABEL[topic as Taxonomy] ?? topic : null;
  const also = alsoCalled(term.id);
  const confusion = term.commonConfusions[0];
  const official = term.definition?.trim();
  const aligned = sourceLooksAligned(term);
  const pending = term.copyReview === "pending";

  return (
    <div className="card pad-lg">
      <div className="caption">{taxLabel ?? term.category}</div>
      {pending ? (
        <div className="caption" style={{ marginTop: 8, letterSpacing: 0 }}>
          검수 전 원고
        </div>
      ) : null}
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
      {term.whyItMatters ? <Fold title="왜 알아두면 좋을까요?" body={term.whyItMatters} /> : null}
      {confusion ? <Fold title="헷갈리기 쉬워요" body={confusion} /> : null}
      {relatedPreview ? <RelatedConcepts term={term} terms={terms} preview /> : <RelatedConcepts term={term} terms={terms} />}
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
        <p className="why"><strong>헷갈리기 쉬워요</strong> {confusion}</p>
      ) : null}
    </>
  );
}
