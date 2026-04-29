import { SplitSection } from "./SplitSection";

const RoomsMockup = () => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Próximas Partidas</span>
      <span className="text-xs text-muted-foreground">Sábado, 3 maio</span>
    </div>
    <div className="p-4 flex flex-col gap-3">
      {[
        { icon: "🎭", name: "Blood on the Clocktower", meta: "Sáb 14h · Casa do Pedro · Trouble Brewing", slots: "8/10", pct: 80, full: false },
        { icon: "⚙️", name: "Brass: Birmingham", meta: "Sáb 19h · Casa do Lucas · Season 6", slots: "2/4", pct: 50, full: false },
        { icon: "🏛️", name: "Ruins of Arnak", meta: "Dom 15h · Casa do Marcos · Season 6", slots: "4/4", pct: 100, full: true },
      ].map((r, i) => (
        <div key={i} className={`bg-surface border border-border rounded-xl p-4 flex gap-3 items-center ${r.full ? "opacity-60" : ""}`}>
          <div className="w-10 h-10 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-lg flex-shrink-0">
            {r.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{r.name}</div>
            <div className="text-[0.7rem] text-muted-foreground truncate">{r.meta}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="w-14 h-1 bg-surface-raised rounded-full overflow-hidden mb-1">
              <div className="h-full bg-gold rounded-full" style={{ width: `${r.pct}%` }} />
            </div>
            <div className="text-[0.7rem] text-muted-foreground">{r.slots} vagas</div>
            {r.full ? (
              <div className="text-[0.65rem] font-bold text-muted-foreground mt-1">Lotado</div>
            ) : (
              <div className="inline-block px-2 py-0.5 bg-gold text-background text-[0.65rem] font-bold rounded mt-1">Entrar</div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const LandingMatchRoomsSection = () => (
  <SplitSection
    id="partidas"
    tag="Salas de Partida"
    title={<>Agende.<br />Confirme presença.<br /><span className="text-gold">Apareça.</span></>}
    body="Crie ou entre em salas de partida com poucos cliques. Veja quem vai, quantas vagas restam, onde será e qual jogo — tudo organizado e sem confusão."
    features={[
      "Criação rápida de salas com data, local e jogo",
      "Confirmação de presença e controle de vagas",
      "Registro do resultado direto pela plataforma",
      "Visibilidade das partidas para toda a comunidade",
    ]}
    cta={{ label: "Agendar uma partida", to: "/register" }}
    mockup={<RoomsMockup />}
    reverse
    className="border-t border-border"
  />
);
