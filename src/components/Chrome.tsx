import { Link, NavLink, useNavigate } from "react-router-dom";
import { resolveChainHref } from "../lib/lookup";
import type { Term } from "../types";

const TABS: { to: string; label: string; end?: boolean; icon: string }[] = [
  { to: "/", label: "오늘", end: true, icon: "today" },
  { to: "/learn", label: "학습", end: true, icon: "learn" },
  { to: "/context", label: "연습", icon: "practice" },
  { to: "/terms", label: "사전", icon: "dict" },
];

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const c = active ? "currentColor" : "currentColor";
  const common = { width: 18, height: 18, fill: "none", stroke: c, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "today") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
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
  if (name === "practice") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
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
              {t.to === "/learn" && learnBadge ? <span className="badge">{learnBadge}</span> : null}
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

export function Chain({ items, terms }: { items: string[]; terms?: Term[] }) {
  if (!items.length) return null;
  return (
    <p className="chain">
      {items.map((x, i) => {
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
  );
}
