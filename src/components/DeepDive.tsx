import { useState } from "react";
import { deepDiveOf } from "../content/deepDive";
import { logEvent } from "../lib/events";

/**
 * 해석이 갈릴 수 있는 용어에만 두는 선택 해설.
 * 기본은 접혀 있고, 입구만 스캔되게 둔다. 모든 문항에 자동으로 넣지 않는다.
 */
export function DeepDive({ termId }: { termId: string }) {
  const spec = deepDiveOf(termId);
  const [open, setOpen] = useState(false);
  if (!spec) return null;

  return (
    <div className="callout">
      <button
        type="button"
        className="callout-toggle"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) logEvent("deep_dive_opened", { termId, label: spec.label });
        }}
      >
        <span className="callout-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 11.2V16" stroke="var(--color-primary)" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="12" cy="8.2" r="1" fill="var(--color-primary)" />
          </svg>
        </span>
        <span className="callout-copy">
          <strong>{spec.label}</strong>
          <span className="caption">{spec.teaser}</span>
        </span>
        <span className="callout-chevron" aria-hidden>
          {open ? "▾" : "〉"}
        </span>
      </button>
      {open ? <p className="why deep-dive-body">{spec.body}</p> : null}
    </div>
  );
}
