const IconSquare = ({ children }: { children: React.ReactNode }) => (
  <div
    className="grid place-items-center"
    style={{
      width: 36, height: 36, borderRadius: 10,
      background: "var(--lr-bg-3)", border: "1px solid var(--lr-line)",
      fontSize: 17,
    }}
    aria-hidden
  >
    {children}
  </div>
);

const MmrChart = () => {
  const points = [22, 28, 24, 35, 31, 40, 38, 46, 42, 52, 58, 54, 64, 62, 72];
  const max = Math.max(...points);
  const w = 320, h = 100;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - (p / max) * h * 0.9 - 4] as const);
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  return (
    <div className="relative mt-6 rounded-lg overflow-hidden" style={{ border: "1px solid var(--lr-line-soft)", background: "var(--lr-bg)" }}>
      <div className="absolute top-2 right-3 lr-mono" style={{ fontSize: 10, color: "var(--lr-fg-3)" }}>
        MMR · últimas 15 partidas
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ aspectRatio: "16/8", display: "block" }}>
        <defs>
          <linearGradient id="lr-mmr-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.14 80)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.78 0.14 80)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lr-mmr-grad)" />
        <path d={linePath} fill="none" stroke="oklch(0.78 0.14 80)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
};

const CommunityPreview = () => {
  const avatars = [
    { i: "MA", h: 30 }, { i: "PL", h: 220 }, { i: "AS", h: 150 },
    { i: "JR", h: 80 }, { i: "CV", h: 280 }, { i: "TO", h: 200 },
  ];
  return (
    <div className="rounded-[14px] p-[18px] mt-6" style={{ background: "var(--lr-bg)", border: "1px solid var(--lr-line)" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[14px] font-semibold">Mesa Pinheiros · Heavy Games</div>
          <div className="lr-mono mt-0.5" style={{ fontSize: 11, color: "var(--lr-fg-3)" }}>12 membros</div>
        </div>
        <span
          className="lr-mono px-2 py-0.5 rounded-full text-[10px] uppercase"
          style={{ background: "var(--lr-gold-soft)", color: "var(--lr-gold)" }}
        >Aberta</span>
      </div>
      <div className="flex items-center mb-3">
        {avatars.map((a, i) => (
          <div
            key={i}
            className="grid place-items-center text-[10px] font-bold text-white rounded-full"
            style={{
              width: 28, height: 28,
              background: `oklch(0.55 0.12 ${a.h})`,
              border: "2px solid var(--lr-bg)",
              marginLeft: i === 0 ? 0 : -8,
            }}
          >{a.i}</div>
        ))}
        <div
          className="grid place-items-center text-[10px] font-bold rounded-full"
          style={{ width: 28, height: 28, background: "var(--lr-bg-3)", color: "var(--lr-fg-2)", border: "2px solid var(--lr-bg)", marginLeft: -8 }}
        >+6</div>
      </div>
      <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: "var(--lr-bg-2)" }}>
        <span style={{ fontSize: 13, color: "var(--lr-fg-2)" }}>Próxima partida</span>
        <span className="lr-mono" style={{ fontSize: 12, color: "var(--lr-gold)" }}>sáb 09 mai · 19h30</span>
      </div>
    </div>
  );
};

const SmallCard = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div
    className="rounded-[18px] p-6 flex flex-col gap-4 lr-bento-cell-sm"
    style={{ background: "var(--lr-bg-2)", border: "1px solid var(--lr-line-soft)" }}
  >
    <IconSquare>{icon}</IconSquare>
    <div>
      <h3 className="lr-display" style={{ fontSize: 18, marginBottom: 6 }}>{title}</h3>
      <p style={{ color: "var(--lr-fg-2)", fontSize: 14, lineHeight: 1.5 }}>{desc}</p>
    </div>
  </div>
);

export const FeaturesBento = () => (
  <section id="features" className="lr-section">
    <div className="lr-container">
      <div className="lr-section-head">
        <div className="lr-eyebrow">Tudo num lugar</div>
        <h2>Pensado pra quem joga toda semana.</h2>
        <p>Salas, ranking, comunidade e histórico — uma plataforma só, em vez de cinco grupos de WhatsApp e uma planilha que ninguém mais atualiza.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3" >
        {/* Big card — Seasons */}
        <div
          id="seasons"
          className="md:col-span-3 rounded-[18px] p-8 flex flex-col"
          style={{ background: "var(--lr-bg-2)", border: "1px solid var(--lr-line-soft)", minHeight: 460 }}
        >
          <div className="flex items-center gap-3">
            <IconSquare>🏆</IconSquare>
            <span className="lr-mono" style={{ fontSize: 11, color: "var(--lr-gold)", letterSpacing: "0.18em", textTransform: "uppercase" }}>Seasons</span>
          </div>
          <h3 className="lr-display mt-5" style={{ fontSize: 28 }}>Ranking mensal com MMR de verdade.</h3>
          <p style={{ color: "var(--lr-fg-2)", fontSize: 15, lineHeight: 1.55, marginTop: 12 }}>
            Cada partida ajusta seu MMR. Cada season tem início, fim e um campeão. Compete, evolui, ou só acompanha — você escolhe.
          </p>
          <div className="mt-auto"><MmrChart /></div>
        </div>

        {/* Big card — Comunidades */}
        <div
          id="comunidades"
          className="md:col-span-3 rounded-[18px] p-8 flex flex-col"
          style={{ background: "var(--lr-bg-2)", border: "1px solid var(--lr-line-soft)", minHeight: 460 }}
        >
          <div className="flex items-center gap-3">
            <IconSquare>👥</IconSquare>
            <span className="lr-mono" style={{ fontSize: 11, color: "var(--lr-gold)", letterSpacing: "0.18em", textTransform: "uppercase" }}>Comunidades</span>
          </div>
          <h3 className="lr-display mt-5" style={{ fontSize: 28 }}>Pessoas que jogam o que você joga, perto de você.</h3>
          <p style={{ color: "var(--lr-fg-2)", fontSize: 15, lineHeight: 1.55, marginTop: 12 }}>
            Comunidades por cidade, por jogo, por estilo. Membros, eventos e calendário compartilhado.
          </p>
          <div className="mt-auto"><CommunityPreview /></div>
        </div>

        <div className="md:col-span-2"><SmallCard icon="📅" title="Salas com confirmação" desc="Vagas limitadas, lista de espera, lembrete antes da partida." /></div>
        <div className="md:col-span-2"><SmallCard icon="📊" title="Histórico persistente" desc="Cada partida fica registrada — quem jogou, pontuação, vencedor." /></div>
        <div className="md:col-span-2"><SmallCard icon="🎲" title="Catálogo de jogos" desc="Veja o que está sendo mais jogado e descubra títulos novos." /></div>
      </div>
    </div>
  </section>
);
