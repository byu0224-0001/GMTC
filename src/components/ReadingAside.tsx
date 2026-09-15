import { useState } from "react";
import { FlowDiagram } from "./ReadingFigures";
import { logEvent } from "../lib/events";
import type { ReadingAside, ReadingAsideKind } from "../types";

export const ASIDE_LABEL: Record<ReadingAsideKind, string> = {
  why: "왜 그럴까요?",
  example: "예를 들면?",
  condition: "조건이 달라지면?",
  number: "숫자를 어떻게 읽나요?",
  next: "다음엔 뭘 볼까요?",
};

export function ReadingAsideNote({
  aside,
  articleId,
}: {
  aside: ReadingAside;
  articleId: string;
}) {
  const [open, setOpen] = useState(false);
  const label = ASIDE_LABEL[aside.kind];

  return (
    <div className="read-aside">
      <button
        type="button"
        className="read-aside-trigger"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            logEvent("reading_annotation_open", {
              briefingId: articleId,
              kind: aside.kind,
            });
          }
        }}
      >
        {label} 〉
      </button>
      {open ? (
        <div className="read-aside-body">
          <p>{aside.body}</p>
          {aside.flows?.map((flow) => (
            <div key={flow.title} className="read-aside-flow">
              <div className="caption">{flow.title}</div>
              <FlowDiagram steps={flow.steps} />
            </div>
          ))}
          {aside.takeaway ? <p className="read-aside-take">{aside.takeaway}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
