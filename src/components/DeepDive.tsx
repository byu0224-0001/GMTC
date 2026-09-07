import { useState } from "react";
import { deepDiveOf } from "../content/deepDive";
import { logEvent } from "../lib/events";

/**
 * 해설 아래 인라인 펼침. 콘텐츠가 있는 용어에만 렌더한다.
 * 열었다고 학습 성공으로 기록하지 않는다.
 */
export function DeepDive({ termId }: { termId: string }) {
  const spec = deepDiveOf(termId);
  const [open, setOpen] = useState(false);
  if (!spec) return null;

  return (
    <div className="deep-dive">
      <button
        type="button"
        className="deep-dive-toggle"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) logEvent("deep_dive_opened", { termId, label: spec.label });
        }}
      >
        {spec.label} {open ? "▾" : "›"}
      </button>
      {open ? <p className="why deep-dive-body">{spec.body}</p> : null}
    </div>
  );
}
