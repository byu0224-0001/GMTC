const NOTE = "※ 이해를 돕기 위해 구성한 예시 수치입니다.";

export function MetricCard({
  items,
  note = NOTE,
}: {
  items: { label: string; value: string }[];
  note?: string;
}) {
  return (
    <figure className="read-figure">
      <div className={`read-metrics n-${Math.min(items.length, 3)}`}>
        {items.map((it) => (
          <div key={it.label} className="read-metric">
            <span>{it.label}</span>
            <strong>{it.value}</strong>
          </div>
        ))}
      </div>
      {note ? <figcaption>{note}</figcaption> : null}
    </figure>
  );
}

export function CompareBars({
  rows,
  note = NOTE,
}: {
  rows: { label: string; value: number; display?: string }[];
  note?: string;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  return (
    <figure className="read-figure">
      <div className="read-bars">
        {rows.map((r) => (
          <div key={r.label} className="read-bar-row">
            <span>{r.label}</span>
            <i>
              <b
                style={{
                  width: `${Math.max(8, (Math.abs(r.value) / max) * 100)}%`,
                  opacity: r.value < 0 ? 0.55 : 1,
                }}
              />
            </i>
            <em>{r.display ?? String(r.value)}</em>
          </div>
        ))}
      </div>
      {note ? <figcaption>{note}</figcaption> : null}
    </figure>
  );
}

export function FlowDiagram({ steps, note }: { steps: string[]; note?: string }) {
  return (
    <figure className="read-figure">
      <ol className="read-flow">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {note ? <figcaption>{note}</figcaption> : null}
    </figure>
  );
}
