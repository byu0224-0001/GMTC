import { Link, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { TopBar } from "../components/Chrome";
import { CORE100, TAXONOMY_LABEL, TAXONOMY_ORDER, type Taxonomy } from "../content/literacy";
import { stats } from "../lib/progress";
import { displayTitle } from "../lib/hangul";
import type { ProgressState, Term } from "../types";

export function CoreListPage({ terms, progress }: { terms: Term[]; progress: ProgressState }) {
  const [params] = useSearchParams();
  const taxParam = params.get("taxonomy") as Taxonomy | null;
  const tax: Taxonomy | "all" = taxParam && TAXONOMY_ORDER.includes(taxParam) ? taxParam : "all";
  const s = stats(progress, CORE100.map((c) => c.id));
  const core = useMemo(() => terms.filter((t) => t.priority === "core"), [terms]);
  const list = tax === "all" ? core : core.filter((t) => t.taxonomy === tax);

  return (
    <>
      <TopBar title="핵심 용어" back />
      <div className="page stack">
        <p className="muted" style={{ margin: 0 }}>
          원하는 용어를 골라 학습하세요.
        </p>
        <div className="card">
          <div className="tax-meta">
            <strong>{s.seen} / {s.coreTotal}</strong>
            <span className="tax-count">익숙해진 용어 {s.known}개</span>
          </div>
        </div>
        <Link className="btn btn-primary" to="/learn/session" style={{ display: "grid", placeItems: "center" }}>
          오늘 학습하기
        </Link>
        <div className="chip-row">
          <Link className={tax === "all" ? "chip picked" : "chip"} to="/learn/core">
            전체
          </Link>
          {TAXONOMY_ORDER.map((k) => (
            <Link
              key={k}
              className={tax === k ? "chip picked" : "chip"}
              to={`/learn/core?taxonomy=${encodeURIComponent(k)}`}
            >
              {TAXONOMY_LABEL[k]}
            </Link>
          ))}
        </div>
        <div className="caption">{list.length}개</div>
        <div>
          {list.map((t) => {
            const seen = Boolean(progress.cards[t.id]);
            return (
              <Link key={t.id} to={`/terms/${encodeURIComponent(t.id)}`} className="term-row">
                <strong>{displayTitle(t)}</strong>
                <span>{seen ? "학습함 · " : ""}{t.oneLiner || t.easyExplanation || t.shortDef}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
