import type { ReactNode } from "react";

export type AskKind = "check" | "think" | "next";

const TITLE: Record<AskKind, string> = {
  check: "읽고 바로 확인해볼까요?",
  think: "한 번 더 생각해보기",
  next: "그다음엔 뭘 봐야 할까요?",
};

export function askKindFromDepth(depth?: string): AskKind {
  if (depth === "next") return "next";
  if (depth === "cause") return "think";
  return "check";
}

/**
 * 본문과 다른 화면 문법. 읽기에서 판단으로 넘어갔음을 읽지 않고도 알게 한다.
 */
export function ReadingAsk({
  kind,
  step,
  total,
  children,
}: {
  kind: AskKind;
  step: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <section className={`read-ask read-ask-${kind}`} aria-label={TITLE[kind]}>
      <div className="read-ask-kicker">
        <span className="read-ask-mark" aria-hidden />
        <strong>{TITLE[kind]}</strong>
        {total > 1 ? (
          <span className="read-ask-count">
            {step} / {total}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
