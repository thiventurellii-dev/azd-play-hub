import { SplitSection } from "./SplitSection";

const RankingMockup = () => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Season 6 — Ranking</span>
      <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gold text-background">Ativa</span>
    </div>
    <div className="py-2">
      {[
        { pos: 1, name: "Marcos R.", initials: "MR", mmr: "2.841,50", change: "+32,00", up: true, posClass: "text-gold", bg: "hsl(43 80% 25%)" },
        { pos: 2, name: "Felipe C.", initials: "FC", mmr: "2.764,00", change: "+18,50", up: true, posClass: "text-foreground/65", bg: "hsl(220 30% 22%)" },
        { pos: 3, name: "Lucas A.", initials: "LA", mmr: "2.698,75", change: "−8,25", up: false, posClass: "text-amber-600", bg: "hsl(280 25% 22%)" },
        { pos: 4, name: "Gustavo S.", initials: "GS", mmr: "2.512,00", change: "+12,00", up: true, posClass: "text-muted-foreground", bg: "hsl(160 25% 18%)" },
        { pos: 5, name: "Ana T.", initials: "AT", mmr: "2.445,25", change: "−5,75", up: false, posClass: "text-muted-foreground", bg: "hsl(0 25% 20%)" },
      ].map((r) => (
        <div key={r.pos} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-raised transition-colors">
          <span className={`text-sm font-extrabold w-5 text-center ${r.posClass}`}>{r.pos}</span>
          <div
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-[0.7rem] font-bold flex-shrink-0"
            style={{ background: r.bg }}
          >
            {r.initials}
          </div>
          <span className="flex-1 text-sm font-semibold">{r.name}</span>
          <div className="text-right">
            <div className="text-sm font-bold tabular-nums">{r.mmr}</div>
            <div className={`text-[0.7rem] font-semibold ${r.up ? "text-green-400" : "text-red-400"}`}>
              {r.up ? "↑" : "↓"} {r.change}
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="border-t border-border px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        Encerra em 18 dias
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1 bg-surface-raised rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full" style={{ width: "64%" }} />
        </div>
        <span className="text-[0.7rem] text-muted-foreground">38 partidas</span>
      </div>
    </div>
  </div>
);

export const LandingSeasonsSection = () => (
  <SplitSection
    id="seasons"
    tag="Seasons Competitivas"
    title={<>Dispute.<br />Suba no <span className="text-gold">ranking.</span><br />Se torne lendário!</>}
    body="Cada season tem início, fim e premiação. Suas partidas valem pontos MMR que determinam sua posição no ranking — quanto mais você joga, mais você evolui."
    features={[
      "Sistema de MMR com variação por posição e pontuação",
      "Histórico completo de todas as seasons anteriores",
      "Rankings públicos com top jogadores em destaque",
      "Premiações e reconhecimento aos campeões",
    ]}
    cta={{ label: "Ver ranking atual", to: "/register" }}
    mockup={<RankingMockup />}
    reverse
    className="border-t border-border"
  />
);
