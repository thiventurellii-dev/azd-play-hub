const ITEMS = [
  {
    q: "Antes a gente marcava partida no grupo do WhatsApp e metade não aparecia. Aqui é confirmação ou lista de espera, fim.",
    n: "Marina Costa", r: "Mesa Pinheiros · 8 partidas", i: "MA", c: "oklch(0.55 0.1 30)",
  },
  {
    q: "Comecei como casual, virou rotina. Saber que tem season ativa me faz querer jogar pelo menos uma vez por semana.",
    n: "Pedro Lima", r: "Heavy Games · top 5 season", i: "PL", c: "oklch(0.5 0.1 220)",
  },
  {
    q: "Encontrei pessoal pra jogar Spirit Island. Você tem ideia de como isso é raro? Mudou meu hobby.",
    n: "Ana Souza", r: "Comunidade Co-op · 5 partidas", i: "AS", c: "oklch(0.55 0.1 150)",
  },
];

export const TestimonialsRedesign = () => (
  <section className="lr-section">
    <div className="lr-container">
      <div className="lr-section-head">
        <div className="lr-eyebrow">Quem já joga</div>
        <h2>De quem já está numa mesa toda semana.</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ITEMS.map((it) => (
          <figure key={it.n} className="rounded-[18px] p-7" style={{ background: "var(--lr-bg-2)", border: "1px solid var(--lr-line-soft)" }}>
            <blockquote className="relative" style={{ paddingLeft: 18 }}>
              <span aria-hidden className="absolute left-0 top-[-6px]" style={{ fontSize: 32, color: "var(--lr-gold)", lineHeight: 1, fontFamily: "Inter Tight" }}>"</span>
              <p style={{ fontSize: 17, lineHeight: 1.5, color: "var(--lr-fg)" }}>{it.q}</p>
            </blockquote>
            <figcaption className="flex items-center gap-3 mt-6">
              <div
                className="grid place-items-center rounded-full text-white shrink-0"
                style={{ width: 40, height: 40, background: it.c, fontWeight: 700, fontSize: 13 }}
                aria-hidden
              >{it.i}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{it.n}</div>
                <div className="lr-mono" style={{ fontSize: 11, color: "var(--lr-fg-3)" }}>{it.r}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);
