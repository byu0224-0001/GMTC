import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Chain, TopBar } from "../components/Chrome";
import { REASONING_PATTERNS } from "../content/reasoning";

export function ThinkPage() {
  const { patternId } = useParams();
  const nav = useNavigate();
  const p = REASONING_PATTERNS.find((x) => x.id === patternId);
  const [picked, setPicked] = useState<string | null>(null);

  if (!p) {
    return (
      <div className="page">
        <p>내용을 찾지 못했습니다.</p>
        <button className="btn btn-primary" onClick={() => nav("/context")}>읽기 목록으로</button>
      </div>
    );
  }

  return (
    <>
      <TopBar title="리포트 읽는 순서" back />
      <div className="page stack">
        <div className="card pad-lg">
          <div className="eyebrow">리포트에서 자주 보는 순서</div>
          <h2 className="term-title" style={{ margin: "8px 0 8px" }}>{p.title}</h2>
          <p className="muted" style={{ marginTop: 0 }}>{p.summary}</p>
          <div className="caption" style={{ marginTop: 12 }}>순서</div>
          <Chain items={p.steps} />
          <p className="why"><strong>단정하면 안 되는 점</strong> {p.trap}</p>
        </div>
        <div className="card pad-lg">
          <p style={{ margin: "8px 0 0" }}>{p.question}</p>
        </div>
        <div className="stack-8">
          {p.choices.map((c) => {
            let cls = "choice";
            if (picked) {
              if (c.id === p.answerId) cls += " correct";
              else if (c.id === picked) cls += " wrong";
              else cls += " dim";
            }
            return (
              <button key={c.id} className={cls} disabled={!!picked} onClick={() => setPicked(c.id)}>
                {c.label}
              </button>
            );
          })}
        </div>
        {picked ? <p className="why"><strong>{p.title}</strong> {p.why}</p> : null}
        <Link className="btn btn-ghost" to="/context" style={{ display: "grid", placeItems: "center" }}>
          읽기 목록으로
        </Link>
      </div>
    </>
  );
}
