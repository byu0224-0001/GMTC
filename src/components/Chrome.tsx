import { Link, NavLink, useNavigate } from "react-router-dom";
import { resolveChainHref } from "../lib/lookup";
import type { Term } from "../types";

const TABS: { to: string; label: string; end?: boolean; icon: string }[] = [
  { to: "/", label: "홈", end: true, icon: "home" },
  { to: "/learn", label: "학습", end: true, icon: "learn" },
  { to: "/context", label: "읽기", icon: "read" },
  { to: "/terms", label: "사전", icon: "dict" },
];

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const c = active ? "currentColor" : "currentColor";
  const common = { width: 18, height: 18, fill: "none", stroke: c, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M7 10.8V20h10v-9.2" />
      </svg>
    );
  }
  if (name === "learn") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden>
        <path d="M4 19V6.5A1.5 1.5 0 0 1 5.5 5H12v14H5.5A1.5 1.5 0 0 1 4 17.5V19" />
        <path d="M12 5h6.5A1.5 1.5 0 0 1 20 6.5V19h-8" />
      </svg>
    );
  }
  if (name === "read") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden>
        <path d="M5 6h9a2 2 0 0 1 2 2v12H7a2 2 0 0 0-2 2V6z" />
        <path d="M16 6v14a2 2 0 0 1-2 2" />
        <path d="M8 10h6M8 14h5" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16.5 20 20.5" />
    </svg>
  );
}

export function TopBar({
  title,
  back,
  trailing,
}: {
  title: string;
  back?: boolean;
  trailing?: React.ReactNode;
}) {
  const nav = useNavigate();
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="뒤로">
          ←
        </button>
      ) : (
        <h1>{title}</h1>
      )}
      {back ? <h1>{title}</h1> : <span />}
      <div>{trailing}</div>
    </header>
  );
}

export function TabBar({ learnBadge }: { learnBadge?: number }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => (isActive ? "tab active" : "tab")}
        >
          {({ isActive }) => (
            <>
              <TabIcon name={t.icon} active={isActive} />
              {t.label}
              {t.to === "/" && learnBadge ? <span className="badge">{learnBadge}</span> : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="progress-track" aria-valuenow={value} aria-valuemax={total} role="progressbar">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * 검수된 흐름. 화살표를 쓴다.
 *
 * 화살표는 사용자가 `A가 B를 일으킨다`로 읽는다. 그래서 관계를 확인한 흐름에만
 * 쓰고, 그 관계가 무엇인지 한 문장으로 함께 밝힌다. 화살표만 두면 정의 관계도
 * 인과로 읽히기 때문이다.
 */
export function ConceptFlowView({
  steps,
  note,
  terms,
}: {
  steps: string[];
  note: string;
  terms?: Term[];
}) {
  if (!steps.length) return null;
  return (
    <>
      <p className="chain">
        {steps.map((x, i) => {
          const href = terms ? resolveChainHref(x, terms) : null;
          return (
            <span key={`${x}-${i}`}>
              {i > 0 ? <span className="chain-arrow"> → </span> : null}
              {href ? (
                <Link to={href} className="chain-link">
                  {x}
                </Link>
              ) : (
                x
              )}
            </span>
          );
        })}
      </p>
      <p className="muted" style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6 }}>
        {note}
      </p>
    </>
  );
}

/**
 * 느슨한 관계. 칩으로만 보여 준다.
 *
 * 관련 용어라는 것 말고는 확인한 게 없는 관계다. 여기에 화살표를 씌우면
 * 우리가 검증하지 않은 인과를 가르치는 셈이 된다.
 */
export function Chain({ items, terms }: { items: string[]; terms?: Term[] }) {
  if (!items.length) return null;
  return (
    <div className="chip-row">
      {items.map((x, i) => {
        const href = terms ? resolveChainHref(x, terms) : null;
        return href ? (
          <Link key={`${x}-${i}`} to={href} className="chip chip-link">
            {x}
          </Link>
        ) : (
          <span key={`${x}-${i}`} className="chip">
            {x}
          </span>
        );
      })}
    </div>
  );
}
