import { Link } from "react-router-dom";
import { logEvent } from "../lib/events";
import { resolveTermPreview, type PeekQuery } from "../lib/termPreview";
import type { Term } from "../types";
import { useEffect, useRef } from "react";

export type { PeekQuery };

/**
 * 학습·읽기 세션 위에 띄우는 관련 용어 미리보기.
 * 열기·닫기는 진도에 손대지 않는다. 제목만 있는 시트는 열지 않는다.
 */
export function TermPeek({
  target,
  terms,
  onClose,
}: {
  target: PeekQuery | null;
  terms: Term[];
  onClose: () => void;
}) {
  const preview = target ? resolveTermPreview(target, terms) : null;
  const open = Boolean(target && preview);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pushed = useRef(false);
  const skipHistory = useRef(false);
  const scrollY = useRef(0);

  useEffect(() => {
    if (!target) return;
    if (!preview) {
      if (import.meta.env.DEV) {
        console.error(`Missing preview copy for ${target.id ?? target.label}`);
      }
      return;
    }
    logEvent("related_preview_open", {
      fromId: target.fromId ?? null,
      label: preview.title,
      termId: preview.id,
      sourceType: preview.sourceType,
    });
  }, [target?.fromId, target?.label, target?.id, preview?.id, preview?.title, preview?.sourceType]);

  useEffect(() => {
    if (!open) return;
    scrollY.current = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("sheet-open");
    body.style.top = `-${scrollY.current}px`;

    skipHistory.current = false;
    history.pushState({ termPeek: true }, "");
    pushed.current = true;
    const onPop = () => {
      pushed.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      html.classList.remove("sheet-open");
      body.style.top = "";
      window.scrollTo(0, scrollY.current);
      if (pushed.current && !skipHistory.current) {
        pushed.current = false;
        history.back();
      }
    };
  }, [open]);

  if (!target || !preview) return null;

  function requestClose() {
    if (pushed.current) history.back();
    else onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={requestClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="term-peek-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="term-peek-title" className="term-title" style={{ fontSize: 20, margin: 0 }}>
            {preview.title}
          </h2>
          <button type="button" className="icon-btn" onClick={requestClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <p className="muted" style={{ margin: "10px 0 0" }}>{preview.summary}</p>
        {preview.relationReason ? (
          <>
            <div className="caption" style={{ marginTop: 16 }}>{preview.relationCaption}</div>
            <p className="muted" style={{ margin: "6px 0 0" }}>{preview.relationReason}</p>
          </>
        ) : null}
        <Link
          className="text-link"
          to={preview.detailRoute}
          onClick={() => {
            skipHistory.current = true;
            pushed.current = false;
            onClose();
          }}
          style={{ display: "inline-flex", marginTop: 16, minHeight: "var(--touch-min)", alignItems: "center" }}
        >
          자세히 보기 〉
        </Link>
      </div>
    </div>
  );
}
