import type { ReactNode } from "react";

/**
 * 제품 전체에서 쓰는 작은 표식. 문장은 넣지 않는다.
 * 텍스트는 호출하는 쪽이 HTML로 붙인다.
 */
export type VisualKind = "repeat" | "contrast" | "connect" | "context";

const BOX = { width: 40, height: 40, viewBox: "0 0 40 40", fill: "none" as const };

function RepeatIcon() {
  return (
    <svg {...BOX} aria-hidden>
      <rect x="8" y="11" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="16" y="9" width="16" height="20" rx="2" stroke="var(--color-primary)" strokeWidth="1.6" />
    </svg>
  );
}

function ContrastIcon() {
  return (
    <svg {...BOX} aria-hidden>
      <rect x="5" y="12" width="13" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="22" y="12" width="13" height="16" rx="2" stroke="var(--color-primary)" strokeWidth="1.6" />
      <path d="M19 20h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ConnectIcon() {
  return (
    <svg {...BOX} aria-hidden>
      <circle cx="8" cy="20" r="3" fill="currentColor" />
      <circle cx="20" cy="20" r="3" fill="currentColor" />
      <circle cx="32" cy="20" r="3" fill="var(--color-primary)" />
      <path d="M11 20h6M23 20h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ContextIcon() {
  return (
    <svg {...BOX} aria-hidden>
      <path d="M8 10h24M8 16h24M8 22h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 22h10" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<VisualKind, () => ReactNode> = {
  repeat: RepeatIcon,
  contrast: ContrastIcon,
  connect: ConnectIcon,
  context: ContextIcon,
};

export function LearningVisual({ type, label }: { type: VisualKind; label?: string }) {
  const Icon = ICONS[type];
  return (
    <span className="learn-visual">
      <Icon />
      {label ? <span className="caption">{label}</span> : null}
    </span>
  );
}

export function LearningVisualRow({
  items,
}: {
  items: { type: VisualKind; label: string }[];
}) {
  return (
    <div className="learn-visual-row" role="list">
      {items.map((item) => (
        <span key={`${item.type}-${item.label}`} className="learn-visual" role="listitem">
          {ICONS[item.type]()}
          <span className="caption">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
