import { SectionHead } from "./SectionHead";
import { useLandingData } from "@/hooks/useLandingData";

const MmrChart = ({ data }: { data: number[] }) => {
  const w = 400;
  const h = 120;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = Math.max(max - min, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 12) - 6;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-hidden>
      <defs>
        <linearGradient id="goldArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(43 100% 50%)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(43 100% 50%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#goldArea)" />
      <path d={line} fill="none" stroke="hsl(43 100% 60%)" strokeWidth="2" />
    </svg>
  );
};

export const FeaturesBento = () => {
  const { stats } = useLandingData();

  return (
    <section id="features" className="border-t border-border/60 py-20 md:py-24">
      <div className="container">
        <SectionHead
          eyebrow="Tudo num lugar"
          title={<>Pensado pra quem joga toda semana.</>}
          description="Salas, ranking, comunidades e histórico — uma plataforma só, em vez de cinco grupos de WhatsApp e uma planilha que ninguém atualiza."
        />

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Big 1 — Seasons */}
          <div className="md:col-span-3 rounded-2xl border border-border/60 bg-surface p-7 md:p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-base">
                🏆
              </div>
              <span className="mono text-[11px] uppercase tracking-[0.18em] text-gold">Seasons</span>
            </div>
            <h3 className="display-tight font-bold text-2xl md:text-[28px] mb-3">
              Ranking mensal com MMR de verdade.
            </h3>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6">
              Cada partida ajusta seu MMR. Cada season tem início, fim e um campeão. Compete,
              evolui ou só acompanha — você escolhe.
            </p>
            <div className="mt-auto rounded-xl bg-background/60 border border-border/60 p-4 relative">
              <span className="absolute top-3 right-3 mono text-[10px] uppercase tracking-wider text-muted-foreground">
                MMR · evolução típica
              </span>
              <MmrChart data={[820, 845, 832, 870, 885, 910, 902, 940, 955, 980, 992, 1010, 1030, 1055, 1080]} />
            </div>
          </div>

          {/* Big 2 — Comunidades */}
          <div className="md:col-span-3 rounded-2xl border border-border/60 bg-surface p-7 md:p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-base">
                👥
              </div>
              <span className="mono text-[11px] uppercase tracking-[0.18em] text-gold">Comunidades</span>
            </div>
            <h3 className="display-tight font-bold text-2xl md:text-[28px] mb-3">
              Pessoas que jogam o que você joga.
            </h3>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6">
              Comunidades por jogo, por estilo e por interesse. Membros, eventos e calendário
              compartilhado — tudo no mesmo lugar.
            </p>
            <div className="mt-auto rounded-xl bg-background/60 border border-border/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold">Comunidade Amizade · AzD</p>
                  <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {stats.players} membros
                  </p>
                </div>
                <span className="text-[10px] mono uppercase tracking-wider px-2 py-1 rounded bg-gold/15 text-gold">
                  aberta
                </span>
              </div>
              <div className="flex">
                {["MA", "PL", "AS", "JR", "CV", "TO"].map((c, i) => (
                  <div
                    key={c}
                    className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold"
                    style={{
                      marginLeft: i === 0 ? 0 : -8,
                      background: `hsl(${(i * 47) % 360} 30% 35%)`,
                    }}
                  >
                    {c}
                  </div>
                ))}
                <div
                  className="w-7 h-7 rounded-full border-2 border-background bg-surface-raised flex items-center justify-center text-[10px] font-bold mono"
                  style={{ marginLeft: -8 }}
                >
                  +{Math.max(0, stats.players - 6)}
                </div>
              </div>
            </div>
          </div>

          {/* Small cards */}
          {[
            {
              icon: "📅",
              title: "Salas com confirmação",
              body: "Vagas limitadas, lista de espera e lembrete antes da partida.",
            },
            {
              icon: "📊",
              title: "Histórico persistente",
              body: "Cada partida fica registrada — quem jogou, pontuação e vencedor.",
            },
            {
              icon: "🎲",
              title: "Catálogo de jogos",
              body: "Veja o que está sendo mais jogado e descubra títulos novos.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="md:col-span-2 rounded-2xl border border-border/60 bg-surface p-6"
            >
              <div className="w-9 h-9 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-base mb-4">
                {c.icon}
              </div>
              <h3 className="display-tight font-bold text-lg mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
