import { Link } from "react-router-dom";
import { whyTogether } from "../content/related";
import { logEvent } from "../lib/events";
import { displayTitle } from "../lib/hangul";
import { resolveChainHref } from "../lib/lookup";
import type { Term } from "../types";
import { useEffect } from "react";

export interface PeekTarget {
  /** 지금 보고 있는 용어. 왜 같이 보는지 문장을 고를 때 쓴다. */
  fromId?: string;
  label: string;
}

function termFromHref(href: string, terms: Term[]): Term | undefined {
  const m = href.match(/\/terms\/([^/?#]+)/);
  if (!m) return undefined;
  const id = decodeURIComponent(m[1]);
  return terms.find((t) => t.id === id);
}

/**
 * 학습·읽기 세션 위에 띄우는 관련 용어 미리보기.
 * 열기·닫기는 진도에 손대지 않는다. 자세히 보기를 누른 뒤에만 사전으로 간다.
 */
export function TermPeek({
  target,
  terms,
  onClose,
}: {
  target: PeekTarget | null;
  terms: Term[];
  onClose: () => void;
}) {
  const href = target ? resolveChainHref(target.label, terms) : null;
  const term = href ? termFromHref(href, terms) : undefined;
  const why = target?.fromId && target.label ? whyTogether(target.fromId, target.label) : null;
  const blurb = term?.oneLiner || term?.easyExplanation || term?.shortDef || null;

  useEffect(() => {
    if (!target) return;
    logEvent("related_preview_open", {
      fromId: target.fromId ?? null,
      label: target.label,
    });
  }, [target?.fromId, target?.label]);

  if (!target) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-labelledby="term-peek-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="term-peek-title" className="term-title" style={{ fontSize: 20, margin: 0 }}>
          {term ? displayTitle(term) : target.label}
        </h2>
        {blurb ? <p className="muted" style={{ margin: "10px 0 0" }}>{blurb}</p> : null}
        {why ? (
          <>
            <div className="caption" style={{ marginTop: 16 }}>왜 같이 보나요?</div>
            <p className="muted" style={{ margin: "6px 0 0" }}>{why}</p>
          </>
        ) : null}
        {href ? (
          <Link
            className="btn btn-primary"
            to={href}
            style={{ display: "grid", placeItems: "center", marginTop: 16, textDecoration: "none" }}
          >
            자세히 보기
          </Link>
        ) : null}
        <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
