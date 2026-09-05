import { Link, useNavigate, useParams } from "react-router-dom";
import { Chain, TopBar } from "../components/Chrome";
import { briefingById } from "../content/briefings";
import { learningMapById } from "../content/learningMaps";
import { REPORT_BOK_CANON, canonBokId } from "../content/reportLexicon";
import { labelFor } from "../lib/lookup";
import type { ProgressState, Term } from "../types";

function conceptHref(id: string): string {
  if (REPORT_BOK_CANON[id] || !id.startsWith("rpt-")) {
    return `/terms/${encodeURIComponent(canonBokId(id))}`;
  }
  return `/lexicon/${id}`;
}

export function LearnMapPage({
  terms,
  progress,
}: {
  terms: Term[];
  progress: ProgressState;
}) {
  const { mapId } = useParams();
  const nav = useNavigate();
  const map = mapId ? learningMapById(mapId) : undefined;
  const briefing = map ? briefingById(map.readingId) : undefined;
  const seen = map?.steps.filter((s) => progress.cards[s.termId] || progress.cards[canonBokId(s.termId)]).length ?? 0;

  if (!map) {
    return (
      <div className="page">
        <p>학습 지도를 찾지 못했습니다.</p>
        <button className="btn btn-primary" onClick={() => nav("/learn")}>학습으로</button>
      </div>
    );
  }

  return (
    <>
      <TopBar title={map.kicker} back />
      <div className="page stack">
        <div>
          <div className="eyebrow">{map.group}</div>
          <h2 className="term-title" style={{ margin: "8px 0 6px" }}>{map.title}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {map.minutes}분 · 용어를 하나씩 외우는 대신, 같이 나오는 이유를 봅니다.
          </p>
          {seen > 0 ? (
            <div className="caption" style={{ marginTop: 8 }}>본 적 있는 용어 {seen}개</div>
          ) : null}
        </div>

        {map.steps.map((step, i) => (
          <div key={step.termId}>
            {i > 0 ? <div className="map-arrow">↓</div> : null}
            <Link to={conceptHref(step.termId)} className="card pad-lg map-step" style={{ color: "inherit" }}>
              <span className="map-num">{i + 1}</span>
              <span>
                <strong className="term-title" style={{ display: "block", fontSize: 18, lineHeight: 1.35, margin: 0 }}>
                  {labelFor(step.termId, terms)}
                </strong>
                <p className="muted" style={{ margin: "8px 0 0" }}>{step.point}</p>
              </span>
            </Link>
          </div>
        ))}

        <div className="card insight">
          <div className="caption">한 번에 연결하면</div>
          <Chain items={map.connect} terms={terms} />
        </div>

        {briefing ? (
          <Link
            to={`/briefing/${briefing.id}`}
            className="card pad-lg"
            style={{ color: "inherit" }}
          >
            <div className="caption">문장에서 다시 보기</div>
            <strong style={{ display: "block", margin: "8px 0 6px", fontSize: 17, lineHeight: 1.4 }}>
              {briefing.headline}
            </strong>
            <span className="muted">{briefing.minutes}분 · {briefing.kicker}</span>
          </Link>
        ) : null}
      </div>
    </>
  );
}
