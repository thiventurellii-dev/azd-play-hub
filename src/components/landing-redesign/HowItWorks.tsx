const STEPS = [
  { n: "01", t: "Crie sua conta", d: "Em 30 segundos, sem cartão. Conta o que você joga e onde mora." },
  { n: "02", t: "Entre numa comunidade", d: "Pelo menos uma por cidade ou por jogo. Você vê quem está perto e o que jogam." },
  { n: "03", t: "Agende partidas e suba no ranking", d: "Confirme presença, registre o resultado, acompanhe seu MMR a cada season." },
];

export const HowItWorks = () => (
  <section id="como-funciona" className="lr-section">
    <div className="lr-container">
      <div className="lr-section-head">
        <div className="lr-eyebrow">Como funciona</div>
        <h2>Da inscrição à mesa em três passos.</h2>
        <p>Sem onboarding cheio. Você cria a conta, entra numa comunidade e já tem partida marcada no fim de semana.</p>
      </div>
      <div
        className="grid grid-cols-1 md:grid-cols-3 overflow-hidden"
        style={{ border: "1px solid var(--lr-line-soft)", borderRadius: 18 }}
      >
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            className="relative p-8"
            style={{
              background: "var(--lr-bg-2)",
              borderLeft: i === 0 ? "none" : "1px solid var(--lr-line-soft)",
            }}
          >
            <div className="lr-mono mb-8" style={{ color: "var(--lr-gold)", fontSize: 12, letterSpacing: "0.1em" }}>
              {s.n} / 03
            </div>
            <h3 className="lr-display" style={{ fontSize: 22, marginBottom: 10 }}>{s.t}</h3>
            <p style={{ color: "var(--lr-fg-2)", fontSize: 15, lineHeight: 1.55 }}>{s.d}</p>
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                className="hidden md:block absolute"
                style={{
                  width: 16, height: 16,
                  top: 24, right: -8,
                  background: "var(--lr-bg-2)",
                  borderTop: "1px solid var(--lr-line-soft)",
                  borderRight: "1px solid var(--lr-line-soft)",
                  transform: "rotate(45deg)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);
