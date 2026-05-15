const STATS = [
  { v: "47", l: "partidas registradas esse mês" },
  { v: "8", l: "comunidades ativas" },
  { v: "120+", l: "jogadores na plataforma" },
  { v: "3", l: "seasons concluídas até agora" },
];

export const StatsRedesign = () => (
  <section className="lr-section-tight" style={{ borderBottom: "1px solid var(--lr-line-soft)" }}>
    <div className="lr-container">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={s.l}
            className="px-5 py-4 md:py-2"
            style={{ borderLeft: i === 0 ? "none" : "1px solid var(--lr-line-soft)" }}
          >
            <div className="lr-display" style={{ fontSize: "clamp(32px, 4.5vw, 52px)", color: "var(--lr-fg)" }}>{s.v}</div>
            <div style={{ fontSize: 13, color: "var(--lr-fg-3)", marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
