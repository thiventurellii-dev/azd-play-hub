const ROWS = [
  ["Grupos de WhatsApp bagunçados, mensagens perdidas", "Salas com confirmação, vagas e lembrete automático"],
  ["\"Quem ganhou semana passada?\" Ninguém lembra", "Histórico persistente com pontuação e posições"],
  ["Difícil encontrar gente nova pra jogar", "Comunidades por cidade e por jogo, abertas"],
  ["Sem nenhum tipo de progressão ou ranking", "MMR atualizado a cada partida, seasons mensais"],
  ["Sempre os mesmos 3 jogos, ninguém arrisca novidades", "Catálogo com o que está sendo jogado de fato"],
] as const;

const Bullet = ({ kind }: { kind: "x" | "check" }) => (
  <span
    aria-hidden
    className="grid place-items-center rounded-full shrink-0"
    style={{
      width: 22, height: 22,
      background: kind === "x" ? "var(--lr-bg-3)" : "var(--lr-gold-soft)",
      color: kind === "x" ? "var(--lr-fg-3)" : "var(--lr-gold)",
      fontSize: 12, fontWeight: 700,
    }}
  >
    {kind === "x" ? "✕" : "✓"}
  </span>
);

export const Compare = () => (
  <section className="lr-section" style={{ background: "var(--lr-bg-2)" }}>
    <div className="lr-container">
      <div className="lr-section-head">
        <div className="lr-eyebrow">Por quê AZD</div>
        <h2>O que muda na prática.</h2>
        <p>Não é "mais um app". É a diferença entre marcar partida no grupo da família e ter um sistema feito pra quem leva o hobby a sério.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-[18px] p-7" style={{ background: "var(--lr-bg)", border: "1px solid var(--lr-line-soft)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="lr-mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--lr-fg-3)" }}>SEM AZD</span>
            <span style={{ color: "var(--lr-fg-3)", fontSize: 22, fontWeight: 700 }}>—</span>
          </div>
          <ul>
            {ROWS.map(([sem]) => (
              <li key={sem} className="flex items-center gap-3 py-3.5" style={{ borderTop: "1px solid var(--lr-line-soft)", fontSize: 14, color: "var(--lr-fg-3)" }}>
                <Bullet kind="x" />{sem}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-[18px] p-7"
          style={{
            background: "var(--lr-bg)",
            border: "1px solid color-mix(in oklab, var(--lr-gold) 30%, var(--lr-line))",
            boxShadow: "0 0 0 1px color-mix(in oklab, var(--lr-gold) 20%, transparent), 0 30px 60px -40px color-mix(in oklab, var(--lr-gold) 50%, transparent)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="lr-mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--lr-gold)" }}>COM AZD</span>
            <span style={{ color: "var(--lr-gold)", fontSize: 22, fontWeight: 700 }}>+</span>
          </div>
          <ul>
            {ROWS.map(([, com]) => (
              <li key={com} className="flex items-center gap-3 py-3.5" style={{ borderTop: "1px solid var(--lr-line-soft)", fontSize: 14, color: "var(--lr-fg)" }}>
                <Bullet kind="check" />{com}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);
