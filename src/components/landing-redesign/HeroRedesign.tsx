import { Link } from "react-router-dom";

const Card = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <div
    className="rounded-[14px] p-[18px] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] animate-[lr-fade_0.7s_ease-out_both]"
    style={{
      background: "var(--lr-bg-2)",
      border: "1px solid var(--lr-line)",
      animationDelay: `${delay}s`,
    }}
  >
    {children}
  </div>
);

export const HeroRedesign = () => {
  return (
    <section className="relative pt-[140px] pb-[88px] overflow-hidden">
      <style>{`
        @keyframes lr-fade { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
      `}</style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(800px 400px at 80% -10%, color-mix(in oklab, var(--lr-gold) 22%, transparent), transparent 60%),
                       radial-gradient(600px 300px at 0% 30%,  color-mix(in oklab, var(--lr-blue) 14%, transparent), transparent 60%)`,
        }}
      />
      <div className="lr-container lr-hero-grid relative grid gap-14 items-center">
        <div className="lr-hero-copy">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="lr-pulse-dot" aria-hidden />
            <span className="lr-eyebrow">Plataforma de board games</span>
          </div>
          <h1 className="lr-display" style={{ fontSize: "clamp(40px, 6.4vw, 76px)", marginBottom: 20 }}>
            Mais do que jogar,<br />
            <span style={{ color: "var(--lr-gold)" }}>construímos amizades</span>
            <span style={{ color: "var(--lr-fg-3)" }}>.</span>
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: "var(--lr-fg-2)", maxWidth: 520 }}>
            Agende partidas, entre em comunidades por cidade e jogo, e acompanhe seu MMR em seasons mensais. Tudo num só lugar, sem grupos de WhatsApp bagunçados.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/register" className="lr-btn lr-btn-gold lr-btn-lg">Criar conta grátis</Link>
            <a href="#comunidades" className="lr-btn lr-btn-outline lr-btn-lg">Ver comunidades ativas →</a>
          </div>
          <div className="lr-mono mt-6 flex items-center gap-2" style={{ fontSize: 13, color: "var(--lr-fg-3)" }}>
            <span style={{ color: "var(--lr-gold)" }} aria-hidden>✓</span>
            Em 1 minuto você está numa sala
          </div>
        </div>

        <div className="lr-hero-visual" style={{ perspective: 1400 }}>
          <div
            className="flex flex-col gap-3.5"
            style={{ transform: "rotateY(-6deg) rotateX(4deg)", transformStyle: "preserve-3d" }}
          >
            <Card delay={0.05}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <span aria-hidden>🏆</span> Season de Maio
                </div>
                <span className="lr-mono" style={{ fontSize: 11, color: "var(--lr-fg-3)" }}>encerra em 12d</span>
              </div>
              {[
                { p: 1, n: "Marina Costa", m: "1.847,32", hi: false },
                { p: 2, n: "Pedro Lima", m: "1.812,04", hi: false },
                { p: 3, n: "Você", m: "1.798,55", hi: true },
                { p: 4, n: "Ana Souza", m: "1.764,21", hi: false },
              ].map((r) => (
                <div
                  key={r.p}
                  className="flex items-center justify-between text-[13px] py-2 px-2.5 rounded-md"
                  style={{
                    background: r.hi ? "var(--lr-gold-soft)" : "transparent",
                    border: r.hi ? "1px solid color-mix(in oklab, var(--lr-gold) 35%, transparent)" : "1px solid transparent",
                    color: r.hi ? "var(--lr-fg)" : "var(--lr-fg-2)",
                  }}
                >
                  <span><span className="lr-mono" style={{ color: "var(--lr-fg-3)", marginRight: 8 }}>{r.p}.</span>{r.n}</span>
                  <span className="lr-mono">{r.m}</span>
                </div>
              ))}
            </Card>

            <Card delay={0.18}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[14px] font-semibold">Wingspan · Sábado à noite</div>
                <span
                  className="lr-mono px-2 py-0.5 rounded-full text-[10px] uppercase"
                  style={{ background: "color-mix(in oklab, var(--lr-green) 18%, transparent)", color: "var(--lr-green)" }}
                >
                  Confirmada
                </span>
              </div>
              <div className="lr-mono mb-2.5" style={{ fontSize: 11, color: "var(--lr-fg-3)" }}>sáb 09 mai · 19h30</div>
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--lr-bg-3)" }}>
                  <div className="h-full rounded-full" style={{ width: "80%", background: "var(--lr-gold)" }} />
                </div>
                <span className="lr-mono" style={{ fontSize: 11, color: "var(--lr-fg-3)" }}>4/5 vagas</span>
              </div>
            </Card>

            <Card delay={0.31}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <span aria-hidden>🎲</span> Terraforming Mars
                </div>
                <span className="lr-mono" style={{ fontSize: 11, color: "var(--lr-fg-3)" }}>ontem · 4 jogadores</span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        .lr-hero-grid { grid-template-columns: 1.05fr 1fr; }
        @media (max-width: 960px) {
          .lr-hero-grid { grid-template-columns: 1fr !important; }
          .lr-hero-visual { display: none; }
        }
      `}</style>
    </section>
  );
};
