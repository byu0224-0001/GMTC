import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { REPORT_BOK_CANON, REPORT_ESSENTIALS, reportIdForBok, reportTermById, reportToTerm } from "../content/reportLexicon";
import { CHO_RAIL, choOf, displayTitle, railMatches, searchTerms } from "../lib/hangul";
import type { ChoBucket, Term } from "../types";

type Filter = "all" | "bok" | "report";

function byHangul(a: Term, b: Term) {
  return displayTitle(a).localeCompare(displayTitle(b), "ko");
}

export function GlossaryPage({ terms }: { terms: Term[] }) {
  const [q, setQ] = useState("");
  const [cho, setCho] = useState<ChoBucket | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const reportTerms = useMemo(
    () =>
      REPORT_ESSENTIALS.map((r) => {
        const t = reportToTerm(r);
        return { ...t, cho: choOf(r.headword) };
      }),
    [],
  );

  const pool = useMemo(() => {
    const raw =
      filter === "bok"
        ? terms
        : filter === "report"
          ? reportTerms
          : [...terms, ...reportTerms.filter((t) => !REPORT_BOK_CANON[t.id])];
    return [...raw].sort(byHangul);
  }, [filter, terms, reportTerms]);

  const list = useMemo(() => {
    if (q.trim()) return searchTerms(pool, q);
    if (cho) return pool.filter((t) => railMatches(cho, t.cho));
    return pool;
  }, [pool, q, cho]);

  const mode = q.trim() ? "검색" : cho ? cho : null;

  return (
    <>
      <TopBar title="사전" />
      <div className="page stack">
        <p className="muted" style={{ margin: 0 }}>모르는 용어를 바로 찾습니다.</p>
        <input
          className="search"
          placeholder="듀레이션, CPI, CAPEX"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setCho(null);
          }}
        />
        <div className="chip-row">
          <button className={filter === "all" ? "chip picked" : "chip"} onClick={() => setFilter("all")}>전체</button>
          <button className={filter === "bok" ? "chip picked" : "chip"} onClick={() => setFilter("bok")}>경제·금융 용어</button>
          <button className={filter === "report" ? "chip picked" : "chip"} onClick={() => setFilter("report")}>리포트 표현</button>
        </div>
        <div className="cho-grid">
          {CHO_RAIL.map((c) => (
            <button
              key={c}
              className={cho === c ? "cho-key active" : "cho-key"}
              onClick={() => {
                setCho(c);
                setQ("");
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="caption">
          {q.trim() || cho || filter !== "all" ? `${list.length}개${mode ? ` · ${mode}` : ""}` : "경제·금융 용어 · 리포트 표현"}
        </div>
        <div>
          {list.map((t) => {
            const report = t.id.startsWith("rpt-");
            const mergedReportId = reportIdForBok(t.id);
            const href = report ? `/lexicon/${t.id}` : `/terms/${encodeURIComponent(t.id)}`;
            const tag = report
              ? "리포트"
              : mergedReportId
                ? t.priority === "core"
                  ? "핵심 · 리포트"
                  : "한은 · 리포트"
                : t.priority === "core"
                  ? "핵심"
                  : null;
            const merged = mergedReportId ? reportTermById(mergedReportId) : null;
            const blurb = merged?.easyExplanation || t.easyExplanation || t.shortDef;
            return (
              <Link key={t.id} to={href} className="term-row">
                <strong>{displayTitle(t)}</strong>
                <span>
                  {tag ? `${tag} · ` : ""}
                  {blurb}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
