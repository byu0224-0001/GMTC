import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { pendingDraftTerms } from "../content/literacy";
import { REPORT_BOK_CANON, REPORT_ESSENTIALS, reportIdForBok, reportTermById, reportToTerm } from "../content/reportLexicon";
import { includeDraftTerms } from "../lib/qaMode";
import { CHO_RAIL, choOf, displayTitle, railMatches, searchTerms } from "../lib/hangul";
import type { ChoBucket, Term } from "../types";

type Filter = "all" | "bok" | "report" | "draft";

function byHangul(a: Term, b: Term) {
  return displayTitle(a).localeCompare(displayTitle(b), "ko");
}

export function GlossaryPage({ terms }: { terms: Term[] }) {
  const [params] = useSearchParams();
  const qaDrafts = includeDraftTerms() || params.get("filter") === "draft";
  const [q, setQ] = useState("");
  const [cho, setCho] = useState<ChoBucket | null>(null);
  const [filter, setFilter] = useState<Filter>(params.get("filter") === "draft" ? "draft" : "all");
  const [choOpen, setChoOpen] = useState(false);

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
          : filter === "draft"
            ? pendingDraftTerms(terms)
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
      <div className="page page-utility stack">
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
          <button className={filter === "bok" ? "chip picked" : "chip"} onClick={() => setFilter("bok")}>경제·금융</button>
          <button className={filter === "report" ? "chip picked" : "chip"} onClick={() => setFilter("report")}>리포트</button>
          {qaDrafts ? (
            <button className={filter === "draft" ? "chip picked" : "chip"} onClick={() => setFilter("draft")}>검수 전</button>
          ) : null}
        </div>
        <button
          type="button"
          className="cho-toggle"
          aria-expanded={choOpen}
          onClick={() => setChoOpen((open) => !open)}
        >
          초성으로 찾기{cho ? ` · ${cho}` : ""} {choOpen ? "▴" : "▾"}
        </button>
        {choOpen ? (
          <div className="cho-grid">
            {CHO_RAIL.map((c) => (
              <button
                key={c}
                className={cho === c ? "cho-key active" : "cho-key"}
                onClick={() => {
                  setCho((prev) => (prev === c ? null : c));
                  setQ("");
                }}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
        <div className="caption">
          {list.length}개{mode ? ` · ${mode}` : ""}
        </div>
        <div>
          {list.map((t) => {
            const report = t.id.startsWith("rpt-");
            const mergedReportId = reportIdForBok(t.id);
            const href = report ? `/lexicon/${t.id}` : `/terms/${encodeURIComponent(t.id)}`;
            const showDraftCopy = t.copyReview === "pending" && t.easyExplanation && qaDrafts;
            const tag = report
              ? "리포트"
              : showDraftCopy
                ? "검수 전"
              : mergedReportId
                ? t.priority === "core"
                  ? "핵심 · 리포트"
                  : "한은 · 리포트"
                : t.priority === "core"
                  ? "핵심"
                  : null;
            const merged = mergedReportId ? reportTermById(mergedReportId) : null;
            const showCopy = t.copyReview === "approved" || (qaDrafts && t.copyReview === "pending");
            const blurb = showCopy
              ? merged?.easyExplanation || t.easyExplanation || t.shortDef
              : t.shortDef;
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
